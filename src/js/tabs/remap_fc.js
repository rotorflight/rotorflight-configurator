/**
 * File: src/js/tabs/remap_fc.js
 * Tab controller for "Remap FC". Drives a headless CLI session to read
 * the flight controller's current hardware resource assignments and
 * the firmware's default ones, and mounts the RemapFc Svelte component
 * that presents them.
 */

import { mount, unmount } from "svelte";

import { CONFIGURATOR } from "@/js/configurator.svelte.js";
import { FC } from "@/js/fc.svelte.js";
import { GUI } from "@/js/gui.js";
import HeadlessCliEngine from "@/js/headless_cli_engine.js";
import { i18n } from "@/js/localization.js";
import { parseHardwareDump, parseMcuType } from "@/js/remap_fc/hardware_parser.js";
import { isGenericBoardDesign } from "@/js/remap_fc/remap_table.js";
import { fetchRotorflightTargetDefaults } from "@/js/remap_fc/rotorflight_target_source.js";
import { parseServoRates } from "@/js/remap_fc/servo_config_parser.js";
import {
  parseReservedDmaStreams,
  parseReservedTimers,
} from "@/js/remap_fc/timer_dma_lookup.js";
import { withTimeout } from "@/js/remap_fc/with_timeout.js";
import RemapFc from "@/tabs/remap_fc/RemapFc.svelte";

import { TABS } from "./tabs.js";

const IDLE_THRESHOLD_MS = 500;

// A generous ceiling for the config-diff restore step (see
// #doRunSequence) -- a heavily customised config's diff can
// legitimately take a while to replay, so this is only meant to catch
// something actually going wrong, not to bound a normal restore. See
// the progress callback below for what keeps the UI from looking
// stuck in the meantime.
const BULK_TRANSFER_TIMEOUT_MS = 180000;

// How long #doApplySequence waits, after sending "save", for the base
// CliEngine's own "Rebooting" text detection to actually fire (see
// #waitForReboot) before giving up and treating the save as failed. A
// real reboot starts printing that text within milliseconds, so this
// is generous purely to absorb slow serial/USB latency, not because a
// working save is ever expected to take anywhere near this long.
const REBOOT_TIMEOUT_MS = 8000;

// How long #activateCli waits for CONFIGURATOR.cliEngineValid to flip
// true after sending the CLI entry trigger, before giving up -- entry
// normally completes within a second, so this is purely to bound the
// pathological case (the board never responds at all) rather than a
// working entry ever needing anywhere near this long. Every other step
// in this file's sequences is already timeout-bounded (see
// BULK_TRANSFER_TIMEOUT_MS, REBOOT_TIMEOUT_MS); this was the one gap
// left unbounded, which could hang "Read FC"/"Load Changes" forever
// with the UI stuck on its loading spinner and no error ever shown.
const CLI_ENTRY_TIMEOUT_MS = 10000;

// `dump`/`diff` output ends with a bare `save` line, meant for
// pasting straight onto a fresh board -- exactly what this restore
// must never send, since it would reboot the flight controller mid-
// "Read FC" and drop the CLI session the whole sequence depends on.
// Only drops a line that trims to exactly "save" (case-insensitive),
// so a `set`/`resource`/... line merely containing the word is left
// untouched.
function stripTrailingSave(dumpText) {
  return dumpText
    .split(/\r?\n/)
    .filter((line) => line.trim().toLowerCase() !== "save");
}

class RemapFcTab {
  // --- CLI engine and mounted Svelte component instances for this tab. ---
  /** @type {HeadlessCliEngine} */
  #cliEngine = null;

  /** @type {ReturnType<typeof mount>} */
  #svelteComponent = null;

  // Hardware resource maps parsed from the CLI sequence: the flight
  // controller's current pin configuration, and the pin configuration
  // it falls back to after `defaults nosave`.
  /** @type {?import("@/js/remap_fc/hardware_parser.js").HardwareMap} */
  #currentHardware = null;
  /** @type {?import("@/js/remap_fc/hardware_parser.js").HardwareMap} */
  #defaultHardware = null;

  // The flight controller's MCU family (e.g. "STM32F7X2"), parsed from
  // the first line of the current hardware dump. Matches the top-level
  // keys of MCU-all.json.
  /** @type {?string} */
  #mcuType = null;

  // DMA streams already claimed by something outside this tool's
  // control (SPI buses, ADC, ...), parsed from `dma show` -- see
  // timer_dma_lookup.js's parseReservedDmaStreams. Handed to the
  // Svelte component so its timer/DMA reallocation pass never proposes
  // stealing one of these.
  /** @type {Set<string>} */
  #reservedDmaStreams = new Set();

  // Full timer+channel combinations already claimed by something
  // outside this tool's control (the gyro's clock/sync signal, ...),
  // parsed from `timer show` -- see timer_dma_lookup.js's
  // parseReservedTimers. Same treatment as #reservedDmaStreams.
  /** @type {Set<string>} */
  #reservedTimers = new Set();

  // Each configured servo's own update rate (Hz), parsed from `servo`
  // -- see servo_config_parser.js's parseServoRates. Handed to the
  // Svelte component's servo-frequency review card, which warns when
  // two servos sharing a timer are configured for different rates.
  // Read alongside dma show/timer show since, like those, it reflects
  // the FC's live config rather than anything `defaults nosave` below
  // would change.
  /** @type {Object.<string, number>} */
  #servoRates = {};

  // Set to true once cleanup() starts, so an in-flight runSequence()
  // knows to stop sending further commands rather than racing with
  // the tab switch.
  #tornDown = false;

  // Set to true the moment "save" is actually sent to the flight
  // controller (see #sendSaveAndConfirmReboot), and only cleared again
  // at the start of the next #doRunSequence/#doApplySequence -- cleanup()
  // checks this before ever sending a real "exit": once "save" is on
  // the wire the FC is rebooting (or about to), and CONFIGURATOR's own
  // cliEngineActive/cliEngineValid flags can briefly still read true
  // in the short window before the base CliEngine's "Rebooting" text
  // detection actually fires. Sending "exit" into that window -- or
  // worse, racing another tab's own CLI activation trying to talk over
  // the same port during the reboot -- is exactly the kind of stray
  // write that can leave the flight controller wedged, needing a power
  // cycle to recover. Once #saveSent is true, cleanup() never sends
  // anything at all; the base reconnect flow is the only thing allowed
  // to touch the port until a fresh sequence starts.
  #saveSent = false;

  // Whether the diff-all restore batch in the most recent
  // #doRunSequence produced any `###ERROR` CLI response (tracked via
  // #cliEngine.errorsCount around that send). Per presets.js's own
  // showFinalCliOptions, the firmware silently ignores a lone "save"
  // after a batch that hit an error and needs a second one -- a real
  // risk for a diff replay this large on a customised config. Read by
  // #sendSaveAndConfirmReboot.
  #restoreHadCliErrors = false;

  // The in-flight runSequence() promise, if any — cleanup() awaits it
  // so we don't switch tabs until the CLI session has actually been
  // exited.
  /** @type {?Promise<void>} */
  #runSequencePromise = null;

  // Bumped by every #waitForIdle() call, and used there to tell apart
  // "I'm still the watcher whose subscription is live" from "a newer
  // #waitForIdle() call has since taken over" -- see that method's own
  // comment for the race this guards against.
  #idleWatcherToken = 0;

  // Read-only accessors so other code (e.g. tests, future features) can
  // inspect the last parsed hardware state without reaching into
  // private fields.
  get currentHardware() {
    return this.#currentHardware;
  }

  get defaultHardware() {
    return this.#defaultHardware;
  }

  get mcuType() {
    return this.#mcuType;
  }

  // initialize mounts the RemapFc Svelte component directly into #content
  // — no jQuery-loaded HTML shell, matching every other Svelte-only tab
  // (e.g. gyro.js) — so its own <Page> header is the tab's only header,
  // rather than duplicating a second, legacy title bar on top of it.
  /**
   * @param {?Function} callback
   */
  initialize(callback) {
    this.#cliEngine = new HeadlessCliEngine(this);

    if (GUI.active_tab !== "remap_fc") {
      GUI.active_tab = "remap_fc";
    }

    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.#svelteComponent = mount(RemapFc, {
      target,
      props: {
        onRunClick: () => this.runSequence(),
        onLoadChanges: (commands) => this.runApplySequence(commands),
      },
    });

    GUI.content_ready(callback);
  }

  // activateCli enters CLI mode and resolves once the flight controller
  // should be ready to receive commands. Matches PresetsTab.activateCli()
  // and the plain CLI tab's activateCli() exactly (minus the CliEngine UI
  // wiring, setUi/initializeAutoComplete, that a headless engine doesn't
  // need) — waiting on CONFIGURATOR.cliEngineValid rather than a flat
  // delay, since that's the flag readSerial() only flips once it has
  // actually seen the flight controller's CLI banner text, not just
  // after some fixed time has passed.
  //
  // Unlike those two tabs, this one deliberately leaves a CLI session
  // open between runs (see #doRunSequence's comment), so this can be
  // called while already inside a valid CLI session -- e.g. "Load
  // Changes" right after a "Read FC". In that case enterCliMode() must
  // NOT be called again: it sends a bare, unterminated "#" byte, which
  // is only safe as the MSP->CLI entry trigger. Sent while already in
  // CLI mode, it just sits in the flight controller's input buffer and
  // glues onto the front of the next line sent, turning it into
  // "#resource ..." -- a comment line the CLI silently discards. So the
  // first real command of the batch would appear to never run.
  #activateCli() {
    if (CONFIGURATOR.cliEngineActive && CONFIGURATOR.cliEngineValid) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      CONFIGURATOR.cliEngineActive = true;
      CONFIGURATOR.cliTab = "remap_fc";
      this.#cliEngine.enterCliMode();

      const start = performance.now();
      const waitForValidCliEngine = setInterval(() => {
        if (CONFIGURATOR.cliEngineValid) {
          clearInterval(waitForValidCliEngine);
          GUI.timeout_add(
            "remap_fc_enter_cli_mode_done",
            () => resolve(),
            IDLE_THRESHOLD_MS,
          );
        } else if (performance.now() - start > CLI_ENTRY_TIMEOUT_MS) {
          clearInterval(waitForValidCliEngine);
          reject(new Error(i18n.getMessage("remapFcCliEntryTimeout")));
        }
      }, IDLE_THRESHOLD_MS);
    });
  }

  // Resolves once no CLI output has been received for IDLE_THRESHOLD_MS.
  // Commands aren't response-synchronized, so this is how we know a
  // command (e.g. a dump) has actually finished producing output.
  //
  // #cliEngine only ever tracks one response callback at a time (see
  // cli_engine.js's subscribeResponseCallback), so if a call here gets
  // abandoned by an outer withTimeout() race -- its own interval left
  // running because nothing cancels it when the race's loser is
  // ignored -- and a later #waitForIdle() call then subscribes its own
  // callback, the abandoned watcher must not call
  // unsubscribeResponseCallback() once its own stale idle check
  // eventually fires: that would sever the *newer* call's live
  // subscription instead of its own, making it resolve early, before
  // the command it's actually waiting on has finished producing
  // output. #idleWatcherToken tells the two apart -- only whichever
  // call is still the most recent one actually unsubscribes.
  #waitForIdle() {
    const token = ++this.#idleWatcherToken;
    return new Promise((resolve) => {
      let lastReceived = performance.now();
      this.#cliEngine.subscribeResponseCallback(() => {
        lastReceived = performance.now();
      });

      const intervalName = `remap_fc_idle_${performance.now()}`;
      GUI.interval_add(
        intervalName,
        () => {
          if (performance.now() - lastReceived > IDLE_THRESHOLD_MS) {
            GUI.interval_remove(intervalName);
            if (token === this.#idleWatcherToken) {
              this.#cliEngine.unsubscribeResponseCallback();
            }
            resolve();
          }
        },
        100,
        false,
      );
    });
  }

  /**
   * Sends a single CLI command and captures everything the flight
   * controller sends back before going idle again. The captured text
   * is only used for parsing — the CLI transcript itself isn't shown
   * in the UI.
   * @param {string} command
   * @returns {Promise<string>} the captured output
   */
  async #runCommandAndCapture(command) {
    const startLength = this.#cliEngine.outputHistory.length;

    this.#cliEngine.sendLine(command);
    await this.#waitForIdle();

    return this.#cliEngine.outputHistory.slice(startLength);
  }

  // runSequence kicks off #doRunSequence and remembers its promise, so
  // cleanup() can wait for the CLI session to actually be exited
  // before the tab switch proceeds.
  runSequence() {
    this.#runSequencePromise = this.#doRunSequence();
    return this.#runSequencePromise;
  }

  // #doRunSequence drives the whole "Read FC" flow: back up everything
  // about the FC's current configuration, reset to defaults and dump
  // the hardware layout again for both pin layouts, then restore the
  // live state from that backup (`defaults nosave` otherwise leaves
  // the FC running on defaults). The raw maps then go to the Svelte
  // component, which builds and owns the editable table itself.
  // Checks #tornDown between steps so a tab switch mid-run stops
  // further commands, and deliberately leaves the CLI session open
  // when done (or failed) -- cleanup() is the only place that exits
  // CLI mode, so repeated reads skip re-entering it each time.
  async #doRunSequence() {
    this.#tornDown = false;
    this.#saveSent = false;
    this.#svelteComponent?.setError(null);
    this.#svelteComponent?.setRunning(true);
    // Deliberately not clearing the Svelte component's own hardware
    // state here -- setHardware({}, {}, null) used to be called at this
    // point, but it also flips hasRead to true with mcuType null, which
    // the component reads as "board not supported" for the whole read
    // (see mcuSupported there). The table is already hidden behind the
    // loading spinner while running is true, so any stale data
    // underneath is invisible anyway, and the real setHardware call
    // below overwrites it wholesale once the read actually completes.
    this.#currentHardware = null;
    this.#defaultHardware = null;
    this.#mcuType = null;
    this.#reservedDmaStreams = new Set();
    this.#reservedTimers = new Set();
    this.#servoRates = {};
    this.#restoreHadCliErrors = false;

    try {
      await this.#activateCli();
      if (this.#tornDown) return;

      // `dump hardware` -- unchanged from before -- for #currentHardware
      // and #mcuType: this is the one thing that must list *every*
      // resource regardless of whether it happens to match this board's
      // own firmware defaults, which a diff, by definition, wouldn't
      // (see currentDiffAll below for the settings that do need that).
      const currentDump = await this.#runCommandAndCapture("dump hardware");
      console.log("remap_fc: dump hardware output", currentDump);
      if (this.#tornDown) return;

      // `diff all`, not `dump all`, captures only what differs from
      // this firmware's own factory defaults (PID gains, rates,
      // filters, resource reassignments, ...). Once `defaults nosave`
      // runs below, the FC is sitting on exactly those defaults, so
      // replaying this diff (see the restore step below) reconstructs
      // the original config exactly, without also resending the
      // ~1000+ already-default lines a full `dump all` would.
      const currentDiffAll = await withTimeout(
        this.#runCommandAndCapture("diff all"),
        BULK_TRANSFER_TIMEOUT_MS,
        "diff all",
      );
      console.log("remap_fc: diff all output", currentDiffAll);
      if (this.#tornDown) return;

      // `dma show` reports every DMA stream this board is actually
      // using right now, including ones outside this tool's control
      // entirely -- the gyro/flash SPI buses, the battery/current ADC.
      // Captured once, before `defaults nosave`, since these are fixed
      // by the board's own wiring rather than a user-configurable
      // resource -- there's nothing for `defaults nosave` to change
      // here regardless of when this runs.
      const dmaShowOutput = await this.#runCommandAndCapture("dma show");
      console.log("remap_fc: dma show output", dmaShowOutput);
      this.#reservedDmaStreams = parseReservedDmaStreams(dmaShowOutput);
      if (this.#tornDown) return;

      // `timer show` is the same idea for timer+channel claims -- the
      // gyro's clock/sync signal and any other fixed peripheral wiring
      // that isn't a user-configurable resource this tool manages.
      const timerShowOutput = await this.#runCommandAndCapture("timer show");
      console.log("remap_fc: timer show output", timerShowOutput);
      this.#reservedTimers = parseReservedTimers(timerShowOutput);
      if (this.#tornDown) return;

      // `servo` reports each configured servo's own update rate, among
      // other settings -- captured here alongside dma show/timer show,
      // before `defaults nosave` wipes it, since it's this tool's own
      // live config, not something the reset-then-restore sequence
      // below needs to round-trip itself.
      const servoOutput = await this.#runCommandAndCapture("servo");
      this.#servoRates = parseServoRates(servoOutput);
      if (this.#tornDown) return;

      await this.#runCommandAndCapture("defaults nosave");
      if (this.#tornDown) return;

      // Deliberately `dump hardware`, not `dump all`, here -- all we
      // need from the reset state is the factory-default pin layout
      // for the table; there's no need to also capture (and never any
      // intention of restoring) the FC's full factory-default config.
      const defaultDump = await this.#runCommandAndCapture("dump hardware");

      this.#currentHardware = parseHardwareDump(currentDump);
      this.#defaultHardware = parseHardwareDump(defaultDump);
      this.#mcuType = parseMcuType(currentDump);

      // A board with no Rotorflight-specific build of its own (see
      // isGenericBoardDesign, also used by RemapFc.svelte's
      // isGenericBoard for the same check) only ever reports resources
      // up to whatever Rotorflight's own runtime was compiled to
      // support -- kick off a lookup of the richer default set its own
      // shared Betaflight target actually defines (see
      // rotorflight_target_source.js), in parallel with the CLI
      // restore sequence below since it's an unrelated network fetch,
      // not something to make the user wait on twice. Purely for
      // display -- this.#defaultHardware itself, used below to compute
      // what actually gets sent back to the FC, stays exactly what was
      // really read regardless of how this resolves.
      const targetDefaultsPromise = isGenericBoardDesign(FC.CONFIG.boardDesign)
        ? fetchRotorflightTargetDefaults(
            FC.CONFIG.manufacturerId,
            FC.CONFIG.boardName,
          )
        : Promise.resolve(null);

      // `defaults nosave` resets the FC's *entire* live config in RAM,
      // not just resources/timer/DMA -- PID gains, rates, filters, the
      // ESC protocol, every `set`-able value resets too, and stays
      // wrong until something puts it back ("nosave" only means it's
      // never persisted, so EEPROM itself is untouched). Replaying
      // currentDiffAll -- the raw `diff all` captured above, before any
      // of this ran -- puts it straight back: the FC is now sitting on
      // exactly the defaults that diff was computed against, so
      // resending it reconstructs the original live config exactly
      // (its own header/section comments and blank lines are harmless
      // to resend; the CLI ignores them). stripTrailingSave() drops the
      // diff's own trailing `save` line first -- see its own comment
      // for why that must never reach the FC here.
      //
      // Sent as a fast batch (CliEngine.executeCommandsArray, the same
      // mechanism presets.js's own restore uses) rather than through
      // #runCommandAndCapture one at a time, since these commands have
      // no output worth waiting for individually -- only that they
      // were sent, which the batch send confirms far faster. Still
      // waits once for the whole batch to go idle afterwards, so
      // nothing races the flight controller catching up.
      const restoreStartedAt = performance.now();
      console.log(
        `remap_fc: restoring config diff to FC (${currentDiffAll.split(/\r?\n/).length} lines)`,
      );
      // Surfaces CliEngine's own per-line send progress as a percentage
      // on the "Reading FC" button, so a restore that takes a while
      // reads as "working" rather than "stuck" -- cleared in the
      // `finally` below.
      this.#cliEngine.setProgressCallback((percent) => {
        this.#svelteComponent?.setRestoreProgress(percent);
      });
      // Recorded before the batch so #restoreHadCliErrors reflects only
      // errors this restore itself produced.
      const errorsBeforeRestore = this.#cliEngine.errorsCount;
      const restoreConfigDiff = async () => {
        await this.#cliEngine.executeCommandsArray(
          stripTrailingSave(currentDiffAll),
        );
        await this.#waitForIdle();
      };
      await withTimeout(
        restoreConfigDiff(),
        BULK_TRANSFER_TIMEOUT_MS,
        "the config restore",
      );
      this.#restoreHadCliErrors =
        this.#cliEngine.errorsCount !== errorsBeforeRestore;
      console.log(
        `remap_fc: config restored (${Math.round(performance.now() - restoreStartedAt)}ms)${this.#restoreHadCliErrors ? " -- with CLI errors" : ""}`,
      );
      if (this.#tornDown) return;

      const targetDefaults = await targetDefaultsPromise;

      this.#svelteComponent?.setHardware(
        this.#currentHardware,
        targetDefaults ?? this.#defaultHardware,
        this.#mcuType,
        this.#reservedDmaStreams,
        this.#reservedTimers,
        this.#servoRates,
      );
    } catch (err) {
      console.error("remap_fc: CLI sequence failed", err);
      this.#svelteComponent?.setError(
        err?.message ?? i18n.getMessage("remapFcError"),
      );
    } finally {
      this.#cliEngine.setProgressCallback(null);
      this.#svelteComponent?.setRestoreProgress(null);
      this.#svelteComponent?.setRunning(false);
      this.#runSequencePromise = null;
    }
  }

  // runApplySequence mirrors runSequence(): kicks off #doApplySequence
  // and remembers its promise under the same #runSequencePromise field,
  // so cleanup() waits for a batch of pending changes to finish sending
  // exactly the same way it already waits for a read. Only one of the
  // two can be in flight at a time in practice, since the Svelte
  // component disables both the "Read FC" and "Load Changes" buttons
  // while running is true.
  /**
   * @param {string[]} commands
   */
  runApplySequence(commands) {
    this.#runSequencePromise = this.#doApplySequence(commands);
    return this.#runSequencePromise;
  }

  // #doApplySequence sends the given commands (already ordered by
  // buildChangeCommands() -- every removal before any addition -- with
  // a trailing "save" appended by the Svelte component) to apply the
  // table's staged edits, deferring to #sendSaveAndConfirmReboot for
  // that final "save". Checks #tornDown between commands the same way
  // #doRunSequence does.
  /**
   * @param {string[]} commands
   */
  async #doApplySequence(commands) {
    this.#tornDown = false;
    this.#saveSent = false;
    this.#svelteComponent?.setError(null);
    this.#svelteComponent?.setRunning(true);

    try {
      await this.#activateCli();
      if (this.#tornDown) return;

      for (const command of commands) {
        if (command === "save") {
          await this.#sendSaveAndConfirmReboot();
          break;
        }

        console.log("remap_fc: apply sequence sending", command);
        await this.#runCommandAndCapture(command);
        if (this.#tornDown) return;
      }

      // The resource commands are confirmed sent and the flight
      // controller confirmed rebooting -- adopt the working copy as
      // the new baseline so the "Load Changes" button/preview
      // collapse, since staying staged after a successful send would
      // just make the user think nothing happened.
      this.#svelteComponent?.markApplied();
    } catch (err) {
      console.error("remap_fc: apply sequence failed", err);
      if (this.#saveSent) {
        // #waitForReboot rejected -- nothing was actually persisted, so
        // don't leave the tab thinking a reboot is still in flight:
        // reset the bookkeeping so cleanup() can send a normal "exit"
        // and the user can just retry "Load Changes".
        this.#saveSent = false;
        GUI.reboot_in_progress = false;
      }
      this.#svelteComponent?.setError(
        err?.message ?? i18n.getMessage("remapFcError"),
      );
    } finally {
      this.#svelteComponent?.setRunning(false);
      this.#runSequencePromise = null;
    }
  }

  // Sends the final "save" of an apply sequence and confirms it was
  // actually processed before returning -- the one command in that
  // sequence that persists and reboots the FC, rather than just
  // changing in-memory config, so unlike every other command it's
  // worth verifying rather than assuming it landed.
  //
  // Sends a second "save" first if #restoreHadCliErrors is set (see
  // that field's own comment, and presets.js's showFinalCliOptions for
  // the identical workaround), then waits via #waitForReboot to
  // confirm a reboot actually started -- without that, a save that's
  // silently dropped (or never reaches a firmware already wedged by an
  // earlier command) would still read as success, since
  // serial.send()'s own completion callback only confirms the write
  // was handed off, never that anything was done with it.
  async #sendSaveAndConfirmReboot() {
    this.#saveSent = true;
    // Set explicitly rather than waiting for the base CliEngine's own
    // "Rebooting" detection to do it: that only fires if this tab is
    // still active when the text streams in, and switching tabs first
    // would let a newly-activated tab (e.g. CLI) write to the port
    // while the FC is still mid-reboot. serial_backend.js's
    // finishOpen() clears it again once the real reconnect completes.
    GUI.reboot_in_progress = true;
    console.log("remap_fc: sending save");

    if (this.#restoreHadCliErrors) {
      await new Promise((resolve) => {
        this.#cliEngine.subscribeResponseCallback(() => {
          this.#cliEngine.unsubscribeResponseCallback();
          console.log(
            "remap_fc: restore had CLI errors -- sending a second save",
          );
          this.#cliEngine.sendLine("save");
          resolve();
        });
        this.#cliEngine.sendLine("save");
      });
    } else {
      this.#cliEngine.sendLine("save");
    }

    await this.#waitForReboot();
  }

  // Resolves once CONFIGURATOR.cliEngineValid flips false -- what the
  // base CliEngine's own "Rebooting" detection does the moment the FC
  // actually starts rebooting -- confirming "save" was processed, not
  // just handed to serial.send(). Rejects after REBOOT_TIMEOUT_MS
  // otherwise, so #sendSaveAndConfirmReboot's caller never calls
  // markApplied() for a save that was never really applied.
  #waitForReboot() {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      const intervalName = `remap_fc_reboot_wait_${start}`;
      GUI.interval_add(
        intervalName,
        () => {
          if (!CONFIGURATOR.cliEngineValid) {
            GUI.interval_remove(intervalName);
            resolve();
          } else if (performance.now() - start > REBOOT_TIMEOUT_MS) {
            GUI.interval_remove(intervalName);
            reject(new Error(i18n.getMessage("remapFcSaveNoReboot")));
          }
        },
        100,
        false,
      );
    });
  }

  // read is called by the app's serial layer whenever this tab is the
  // active tab and data arrives — forward it straight to the engine.
  read(readInfo) {
    this.#cliEngine.readSerial(readInfo);
  }

  // cleanup unmounts the Svelte component and is the sole place that
  // actually exits CLI mode — #doRunSequence() deliberately leaves the
  // session open on completion, so it's still here to be exited (rather
  // than re-entered) if the user reads again before switching away.
  // Uses CliEngine.close() — the same standard exit PresetsTab and the
  // plain CLI tab both use — rather than a bespoke non-reboot command:
  // it sends a real "exit", and the flight controller's actual reboot is
  // picked up by CliEngine.readSerial()'s own "Rebooting" detection,
  // which resets the CLI flags and calls reinitialiseConnection() — the
  // same reconnect path every other "Save & Reboot" action in this app
  // already relies on, rather than us reimplementing it.
  //
  // Never sends "exit" once #saveSent is true, even if
  // CONFIGURATOR.cliEngineActive/cliEngineValid still briefly read true
  // -- those flags don't flip to false until the base CliEngine
  // actually sees "Rebooting" text arrive over serial, which can lag
  // slightly behind "save" itself going out. Sending "exit" into that
  // window means writing to a port whose other end is already
  // rebooting, and doing so right as the user switches to another tab
  // (worst case, the CLI tab, whose own activation writes to the same
  // port too) is exactly the kind of colliding write that's left the
  // flight controller wedged, needing a power cycle to recover.
  cleanup(callback) {
    if (this.#svelteComponent) {
      unmount(this.#svelteComponent);
      this.#svelteComponent = null;
    }

    this.#tornDown = true;

    // #finishCleanup only runs once any in-flight run has actually
    // settled (#doRunSequence notices #tornDown and stops at its next
    // check), so it always sees the CLI session's true end-of-run
    // state rather than racing it.
    const finishCleanup = () => {
      if (
        !this.#saveSent &&
        CONFIGURATOR.connectionValid &&
        CONFIGURATOR.cliEngineActive &&
        CONFIGURATOR.cliEngineValid
      ) {
        this.#cliEngine.close(() => callback?.());
      } else {
        callback?.();
      }
    };

    if (this.#runSequencePromise) {
      this.#runSequencePromise.then(finishCleanup);
    } else {
      finishCleanup();
    }
  }
}

// Register this tab with the app's global tab registry.
TABS["remap_fc"] = new RemapFcTab();

// Vite HMR: re-run initialize() when this module reloads while the tab
// is active, and clean up before the old module instance is discarded.
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && GUI.active_tab === "remap_fc") {
      TABS["remap_fc"].initialize();
    }
  });

  import.meta.hot.dispose(() => {
    TABS["remap_fc"].cleanup();
  });
}

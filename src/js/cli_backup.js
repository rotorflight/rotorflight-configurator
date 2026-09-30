// Shared helpers for running a CLI-based configuration backup (`dump all` /
// `diff all`) and, symmetrically, replaying a previously captured backup back
// into the CLI to restore it. Used by the CLI tab's "Backup" button (where a
// CliEngine + window is already wired up and the serial port is already
// connected) and by the Firmware Flasher's "Backup before flashing" option
// (where neither is true, so this also has to open/close the serial
// connection itself).
import CliEngine from "@/js/cli_engine.js";
import { CONFIGURATOR } from "@/js/configurator.svelte.js";
import { writeTextFile } from "@/js/filesystem.js";
import { generateFilename } from "@/js/main.js";
import { serial } from "@/js/serial.js";

export const BACKUP_TYPES = {
  DIFF: "diff",
  DUMP: "dump",
};

const BACKUP_COMMANDS = {
  [BACKUP_TYPES.DIFF]: "diff all",
  [BACKUP_TYPES.DUMP]: "dump all",
};

// Both `dump all` and `diff all` open with cli.c's printVersion() banner --
// "# Rotorflight / <target> (...) <version> ...". A board running Betaflight
// or anything else prints its own firmware name there instead, which is what
// this checks for: the settings a `dump`/`diff` captures aren't guaranteed to
// mean the same thing (or even parse) once replayed into Rotorflight's CLI
// after the flash, so a backup that doesn't match shouldn't be trusted for an
// automatic restore -- see its one caller in FirmwareFlasher.svelte.
const ROTORFLIGHT_VERSION_BANNER = /^#\s*Rotorflight\s*\//m;

export function isRotorflightBackup(text) {
  return !!text && ROTORFLIGHT_VERSION_BANNER.test(text);
}

const CLI_ENTER_TIMEOUT_MS = 8000;
const CLI_IDLE_MS = 750;
// A freshly-flashed FC has a lot to bring up on boot (mixer, gyro RPM notch
// filters, etc.), and how long that takes varies with the board and firmware. These used to allow ~28s of total
// retry budget (3 attempts, 2s apart), which was routinely not enough --
// the FC just wasn't back on the bus yet, so every attempt failed and the
// wizard fell back to "Skip", pushing the user to a manual CLI restore
// instead. Retrying more, and for longer between attempts, costs nothing
// when the FC comes back quickly and saves the manual fallback when it
// doesn't.
const CLI_RECONNECT_ATTEMPTS = 8;
const CLI_RECONNECT_DELAY_MS = 3000;

// See replayBackup() below for what this is working around.
const SAVE_RETRY_ATTEMPTS = 2;

// This firmware's CLI has no "just switch back to MSP" exit -- both `exit`
// and `save` always end in a real cliReboot() (see cliExit()/cliSave() in
// cli.c). Whatever comes next on this port (the Firmware Flasher's own MSP
// reconnect, for one) needs the flight controller to have actually finished
// rebooting -- sensors reinitialised, USB/UART back up -- or it'll find
// nothing answering and time out. This is a blind wait (there's no reliable
// "boot finished" signal to listen for), sized generously for that.
const CLI_REBOOT_WAIT_MS = 3000;

// CliEngine writes its output straight into jQuery GUI elements. When there's
// no visible CLI tab/dialog to give it (e.g. running from the Firmware
// Flasher), hand it detached ones so it can still run.
function headlessCliEngine() {
  const cliEngine = new CliEngine();
  cliEngine.setUi($("<div>"), $("<div>"), $("<textarea>"));
  return cliEngine;
}

function waitForCliValid(timeoutMs) {
  return new Promise((resolve) => {
    if (CONFIGURATOR.cliEngineValid) {
      resolve(true);
      return;
    }
    const timeout = setTimeout(() => {
      clearInterval(poll);
      resolve(false);
    }, timeoutMs);
    const poll = setInterval(() => {
      if (CONFIGURATOR.cliEngineValid) {
        clearInterval(poll);
        clearTimeout(timeout);
        resolve(true);
      }
    }, 200);
  });
}

// Resolves once no CLI response has arrived for `idleMs` -- used to detect
// that a `dump all`/`diff all` has finished printing.
function waitForIdle(cliEngine, idleMs) {
  return new Promise((resolve) => {
    let lastReceived = performance.now();
    cliEngine.subscribeResponseCallback(() => {
      lastReceived = performance.now();
    });
    const check = setInterval(() => {
      if (performance.now() - lastReceived > idleMs) {
        clearInterval(check);
        cliEngine.unsubscribeResponseCallback();
        resolve();
      }
    }, 200);
  });
}

function openSerial(port, baud) {
  return new Promise((resolve) => {
    serial.connect(port, { bitrate: baud }, (openInfo) => resolve(!!openInfo));
  });
}

function closeSerial() {
  return new Promise((resolve) => {
    if (serial.connected || serial.connectionId) {
      serial.disconnect(() => resolve());
    } else {
      resolve();
    }
  });
}

/**
 * Sends a `dump all`/`diff all` on an already-connected, already-in-CLI-mode
 * `cliEngine` and resolves with the captured output once it settles.
 */
export async function runBackupCommand(cliEngine, backupType) {
  cliEngine.sendLine(BACKUP_COMMANDS[backupType]);
  await waitForIdle(cliEngine, CLI_IDLE_MS);
  return cliEngine.outputHistory;
}

// True if `text`'s last command is a bare `save` -- i.e. it looks like a full
// `dump all`/`diff all` backup capture rather than some other snippet (a
// handful of `set`s, say) that was never meant to save/reboot anything.
// Gates replayBackup()'s save-retry below: resending `save` after a snippet
// that doesn't end with one would just be sending a command that was never
// part of what was loaded.
//
// Blank and `#` lines are skipped -- the CLI treats `#` lines as comments,
// and a capture straight off the FC (backupOverSerial()/runBackupCommand())
// always ends with the CLI's own "# " prompt after the `save`. Checking only
// the last non-blank line saw that prompt, never matched, and silently
// skipped the save-retry for every restore.
function endsWithSave(text) {
  const lines = text.split("\n").map((line) => line.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].length === 0 || lines[i].startsWith("#")) continue;
    return lines[i].toLowerCase() === "save";
  }
  return false;
}

/**
 * Executes `commandsText` on an already-connected, already-in-CLI-mode
 * `cliEngine`, same as `cliEngine.executeCommands()` -- except that when
 * the text looks like a full backup capture (see endsWithSave() above), it
 * also makes sure the trailing `save` actually takes.
 *
 * This firmware's cliSave() refuses to actually persist/reboot if any CLI
 * error was recorded earlier in the session -- and `defaults nosave`, which
 * every replayed backup starts with, reliably raises a spurious one of its
 * own (`###ERROR IN map: PARSING FAILED###`, an artifact of the FC's own
 * internal reset -- see cli_engine.js's #defaultsDelayMs comment). So the
 * `save` a backup ends with routinely gets rejected ("...PLEASE FIX ERRORS
 * THEN 'SAVE'###") instead of acted on, leaving the FC sitting in CLI mode
 * -- never rebooting. Resending a bare `save` is what clears it in
 * practice, so this keeps resending (up to SAVE_RETRY_ATTEMPTS extra times)
 * until the FC actually reboots -- readSerial() sees "Rebooting" and flips
 * cliEngineValid off.
 *
 * Resolves true if nothing needed confirming, or a reboot was observed;
 * false if the text looked like a backup but the FC never rebooted after
 * all the retries.
 */
export async function replayBackup(cliEngine, commandsText) {
  await cliEngine.executeCommands(commandsText);

  if (!endsWithSave(commandsText)) {
    return true;
  }

  let rebooted = false;
  for (let attempt = 0; attempt <= SAVE_RETRY_ATTEMPTS; attempt++) {
    await waitForIdle(cliEngine, CLI_IDLE_MS);
    rebooted = !CONFIGURATOR.cliEngineValid;
    if (rebooted || attempt === SAVE_RETRY_ATTEMPTS) break;

    console.log(
      `Restore: FC did not reboot after 'save' -- resending (attempt ${attempt + 1}/${SAVE_RETRY_ATTEMPTS})`,
    );
    cliEngine.sendLine("save");
  }

  return rebooted;
}

/**
 * Connects to `port`, enters CLI mode, runs a `dump all`/`diff all` backup
 * and disconnects again -- headless, no CLI tab/dialog needs to be mounted.
 * Resolves with the captured CLI text, or null if it couldn't connect/enter
 * CLI mode. `onStatus`, if given, is called with "connecting" then "running"
 * as the backup progresses -- for a caller (e.g. a wizard dialog) that wants
 * to show live status.
 */
export async function backupOverSerial(port, baud, backupType, onStatus) {
  CONFIGURATOR.cliEngineValid = false;
  onStatus?.("connecting");

  const opened = await openSerial(port, baud);
  if (!opened) return null;

  const cliEngine = headlessCliEngine();
  const onReceive = (info) => cliEngine.readSerial(info);
  serial.onReceive.addListener(onReceive);
  CONFIGURATOR.cliTab = "firmware_flasher";
  cliEngine.enterCliMode();

  const valid = await waitForCliValid(CLI_ENTER_TIMEOUT_MS);
  if (!valid) {
    serial.onReceive.removeListener(onReceive);
    await closeSerial();
    return null;
  }

  onStatus?.("running");
  const text = await runBackupCommand(cliEngine, backupType);

  // Leaving CLI mode (however we do it) reboots the flight controller -- see
  // CLI_REBOOT_WAIT_MS above -- so disconnect first and then wait, rather
  // than holding this connection open across a reset we can't observe.
  await new Promise((resolve) => cliEngine.close(resolve));
  serial.onReceive.removeListener(onReceive);
  await closeSerial();
  await new Promise((resolve) => setTimeout(resolve, CLI_REBOOT_WAIT_MS));

  return text;
}

/**
 * Reconnects to `port` (retrying a few times while a freshly-flashed board
 * boots) and replays a previously-captured `dump all`/`diff all` backup via
 * replayBackup() above -- see there for why its trailing `save` can need
 * resending. Resolves true only once a reboot was actually observed; false
 * if the replay couldn't be sent at all, or the FC never rebooted after it.
 * `onStatus`, if given, is called with "connecting" then "running".
 */
export async function restoreOverSerial(port, baud, backupText, onStatus) {
  let valid = false;
  let cliEngine;
  let onReceive;

  onStatus?.("connecting");

  for (let attempt = 0; attempt < CLI_RECONNECT_ATTEMPTS && !valid; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, CLI_RECONNECT_DELAY_MS),
      );
    }

    CONFIGURATOR.cliEngineValid = false;

    const opened = await openSerial(port, baud);
    if (!opened) {
      console.log(
        `Restore: reconnect attempt ${attempt + 1}/${CLI_RECONNECT_ATTEMPTS} -- port not open yet, retrying`,
      );
      continue;
    }

    cliEngine = headlessCliEngine();
    onReceive = (info) => cliEngine.readSerial(info);
    serial.onReceive.addListener(onReceive);
    CONFIGURATOR.cliTab = "firmware_flasher";
    cliEngine.enterCliMode();

    valid = await waitForCliValid(CLI_ENTER_TIMEOUT_MS);
    if (!valid) {
      console.log(
        `Restore: reconnect attempt ${attempt + 1}/${CLI_RECONNECT_ATTEMPTS} -- port opened but FC never entered CLI mode, retrying`,
      );
      serial.onReceive.removeListener(onReceive);
      await closeSerial();
    }
  }

  if (!valid) return false;

  onStatus?.("running");
  const rebooted = await replayBackup(cliEngine, backupText);

  if (!rebooted) {
    console.log(
      "Restore: FC never rebooted after replaying the backup -- treating restore as failed",
    );
    serial.onReceive.removeListener(onReceive);
    await closeSerial();
    return false;
  }

  // the FC is rebooting (or about to) -- like `exit`, that's not instant, so
  // give it the same window CLI_REBOOT_WAIT_MS elsewhere allows for it to
  // actually finish before we disconnect.
  await new Promise((resolve) => setTimeout(resolve, CLI_REBOOT_WAIT_MS));

  serial.onReceive.removeListener(onReceive);
  await closeSerial();

  return true;
}

// Best-effort save -- failure (including the user cancelling the file
// picker) is left for the caller to decide whether it matters.
export async function saveBackupToFile(text, prefix) {
  return writeTextFile(text, {
    suggestedName: generateFilename(prefix, "txt"),
    description: "TXT files",
  });
}

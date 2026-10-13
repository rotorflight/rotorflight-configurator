<script>
  import diff from "microdiff";
  import { onDestroy, onMount } from "svelte";
  import { slide } from "svelte/transition";

  import Page from "@/components/Page.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { bit_check, reinitialiseConnection } from "@/js/serial_backend";

  import Motor from "./Motor.svelte";
  import Override from "./Override.svelte";
  import RPM from "./RPM.svelte";
  import RotorSpeed from "./RotorSpeed.svelte";
  import Telemetry from "./Telemetry.svelte";
  import Throttle from "./Throttle.svelte";
  import motorState from "./state.svelte.js";

  let loading = $state(true);
  // $state, not a plain let: `changes` below reads this inside an early
  // return (`if (!initialState) return [];`) that touches nothing else
  // reactive. A plain variable's reassignment isn't a tracked dependency in
  // runes mode, so if `changes` were ever first evaluated before onMount
  // sets this, its $derived.by would memoize at [] permanently regardless of
  // later edits - see wingflight-configurator commit cdce9cddc for the full
  // writeup of this exact bug (this codebase doesn't have that history, but
  // the same Svelte 5 semantics apply here). Matters more now that `changes`
  // feeds hasUnsavedChanges into Telemetry's Detect Wiring guard.
  let initialState = $state();
  let pollerTimer;
  let armedPollerTimer;
  let pollerStopped = false;
  let telemetryRef;

  let isEnabled = $derived(
    motorState.throttleEnabled && FC.CONFIG.motorCount > 0,
  );

  let rpmAvailable = $derived(
    FC.FEATURE_CONFIG.features.FREQ_SENSOR ||
      FC.FEATURE_CONFIG.features.ESC_SENSOR ||
      (motorState.isDshot && FC.MOTOR_CONFIG.use_dshot_telemetry),
  );

  // The ESC wiring trial cycles live UART config while motors could be
  // spinning, so Telemetry.svelte needs this to refuse to even open its
  // Detect Wiring wizard while armed, on top of the firmware's own
  // ARMING_FLAG(ARMED) rejection.
  let armed = $derived(bit_check(FC.CONFIG.mode, FC.AUX_CONFIG.indexOf("ARM")));

  function snapshotState() {
    return $state.snapshot({
      MOTOR_CONFIG: FC.MOTOR_CONFIG,
      ESC_SENSOR_CONFIG: FC.ESC_SENSOR_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }

    return diff(initialState, snapshotState());
  });
  let showToolbar = $derived(!loading && changes.length > 0);

  onMount(async () => {
    await mspHelper.resetMotorOverrides();
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);
    await MSP.promise(MSPCodes.MSP_MOTOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_MOTOR_OVERRIDE);
    await MSP.promise(MSPCodes.MSP_ESC_SENSOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_MOTOR);
    await MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY);
    await MSP.promise(MSPCodes.MSP_BATTERY_STATE);

    initialState = snapshotState();
    loading = false;

    // Self-rescheduling (setTimeout that re-arms only after the previous
    // round finishes), not setInterval with an async body. setInterval fires
    // on a fixed wall-clock schedule regardless of whether the prior
    // callback's awaits have resolved - on a real (non-instant) serial link,
    // 3 sequential MSP round-trips easily exceed 50ms, so ticks start
    // overlapping and pile up: each overlap opens a fresh in-flight request
    // for a *different* code (MSP.send_message only dedupes same-code
    // requests already queued), so the backlog of concurrently outstanding
    // requests only grows over time - enough to starve the ESC wiring
    // wizard's own 200ms poll of ever getting a timely response.
    async function pollMotors() {
      if (pollerStopped) return;
      await MSP.promise(MSPCodes.MSP_MOTOR);
      await MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY);
      await MSP.promise(MSPCodes.MSP_BATTERY_STATE);
      if (!pollerStopped) {
        pollerTimer = setTimeout(pollMotors, 50);
      }
    }
    pollMotors();

    // Same self-rescheduling shape, much slower cadence - not folded into
    // the loop above. `armed` doesn't need anywhere near 50ms freshness for
    // a UI gate, so it gets its own light cadence instead of riding along on
    // the hot one.
    async function pollArmed() {
      if (pollerStopped) return;
      await MSP.promise(MSPCodes.MSP_STATUS);
      if (!pollerStopped) {
        armedPollerTimer = setTimeout(pollArmed, 1000);
      }
    }
    pollArmed();
  });

  onDestroy(() => {
    pollerStopped = true;
    clearTimeout(pollerTimer);
    clearTimeout(armedPollerTimer);
    telemetryRef?.cleanup();
  });

  $effect(() => {
    motorState.fixConfig();
  });

  export async function onSave() {
    motorState.overrideEnabled = false;
    await mspHelper.resetMotorOverrides();

    function save(code) {
      return MSP.promise(code, mspHelper.crunch(code));
    }

    await save(MSPCodes.MSP_SET_FEATURE_CONFIG);
    await save(MSPCodes.MSP_SET_MOTOR_CONFIG);
    await save(MSPCodes.MSP_SET_ESC_SENSOR_CONFIG);

    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  export async function onRevert() {
    motorState.overrideEnabled = false;
    await mspHelper.resetMotorOverrides();

    Object.assign(FC.MOTOR_CONFIG, initialState.MOTOR_CONFIG);
    Object.assign(FC.ESC_SENSOR_CONFIG, initialState.ESC_SENSOR_CONFIG);
    FC.FEATURE_CONFIG.features.bitfield = initialState.features;
    telemetryRef?.cleanup();
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabMotors"), "_system");
  }

  export function isDirty() {
    // immediately run cleanup and switch tabs if motor override is enabled
    return changes.length > 0 && !motorState.overrideEnabled;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabMotors")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert} disabled={motorState.overrideEnabled}>
    {$i18n.t("buttonRevert")}
  </button>
  <button class="btn" onclick={onSave} disabled={motorState.overrideEnabled}>
    {$i18n.t("buttonSaveReboot")}
  </button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <div>
      <Throttle />
      {#if isEnabled}
        <div transition:slide>
          <Telemetry
            bind:this={telemetryRef}
            onSaveRequested={onSave}
            hasUnsavedChanges={changes.length > 0}
            {armed}
          />
        </div>
        <div transition:slide>
          <RPM />
        </div>
      {/if}
    </div>
    <div>
      {#if isEnabled}
        <div transition:slide>
          {#if rpmAvailable}
            <div transition:slide>
              <RotorSpeed />
            </div>
          {/if}
        </div>
        <div transition:slide>
          <Override />
        </div>
        <div transition:slide>
          {#each { length: FC.CONFIG.motorCount } as _, i (i)}
            <Motor index={i} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</Page>

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  .help-btn {
    padding: 4px 8px;
    min-width: 60px;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }
</style>

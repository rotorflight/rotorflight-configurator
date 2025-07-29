<script>
  import diff from "microdiff";
  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";

  import { i18n } from "@/js/i18n.js";
  import { FC } from "@/js/fc.svelte.js";
  import { reinitialiseConnection } from "@/js/serial_backend";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import Page from "@/components/Page.svelte";

  import Throttle from "./Throttle.svelte";
  import RPM from "./RPM.svelte";
  import Telemetry from "./Telemetry.svelte";
  import Governor from "./Governor.svelte";
  import Motor from "./Motor.svelte";
  import RotorSpeed from "./RotorSpeed.svelte";
  import Override from "./Override.svelte";
  import motorState from "./state.svelte.js";

  let loading = $state(true);
  let initialState;
  let pollerInterval;

  let isEnabled = $derived(
    motorState.throttleEnabled && FC.CONFIG.motorCount > 0,
  );

  let rpmAvailable = $derived(
    FC.FEATURE_CONFIG.features.FREQ_SENSOR ||
      FC.FEATURE_CONFIG.features.ESC_SENSOR ||
      (motorState.isDshot && FC.ESC_SENSOR_CONFIG.use_dshot_telemetry),
  );

  function snapshotState() {
    return $state.snapshot({
      MOTOR_CONFIG: FC.MOTOR_CONFIG,
      GOVERNOR: FC.GOVERNOR,
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
    await MSP.promise(MSPCodes.MSP_GOVERNOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_ESC_SENSOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_MOTOR);
    await MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY);
    await MSP.promise(MSPCodes.MSP_BATTERY_STATE);

    initialState = snapshotState();
    loading = false;

    pollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_MOTOR);
      await MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY);
      await MSP.promise(MSPCodes.MSP_BATTERY_STATE);
    }, 50);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
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

    await mspHelper.sendRxFailConfig();
    await save(MSPCodes.MSP_SET_FEATURE_CONFIG);
    await save(MSPCodes.MSP_SET_MOTOR_CONFIG);
    await save(MSPCodes.MSP_SET_GOVERNOR_CONFIG);
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
    Object.assign(FC.GOVERNOR, initialState.GOVERNOR);
    Object.assign(FC.ESC_SENSOR_CONFIG, initialState.ESC_SENSOR_CONFIG);
    FC.FEATURE_CONFIG.features.bitfield = initialState.features;
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
  <button class="help-btn" onclick={onClickHelp}>Help</button>
{/snippet}

{#snippet toolbar()}
  <button onclick={onRevert} disabled={motorState.overrideEnabled}>
    {$i18n.t("buttonRevert")}
  </button>
  <button onclick={onSave} disabled={motorState.overrideEnabled}>
    {$i18n.t("buttonSaveReboot")}
  </button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <div>
      <Throttle />
      {#if isEnabled}
        <div transition:slide>
          <Telemetry />
        </div>
        <div transition:slide>
          <RPM />
        </div>
        <div transition:slide>
          <Governor />
        </div>
      {/if}
    </div>
    <div>
      {#if isEnabled}
        {#if rpmAvailable}
          <div transition:slide|global>
            <RotorSpeed />
          </div>
        {/if}
        <div transition:slide>
          <Override />
        </div>
        {#each { length: FC.CONFIG.motorCount } as _, i (i)}
          <div transition:slide|global>
            <Motor index={i} />
          </div>
        {/each}
      {/if}
    </div>
  </div>
</Page>

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    column-gap: var(--section-gap);
  }

  .fallback-group {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .help-btn {
    padding: 4px 8px;
    min-width: 60px;
  }

  .grow {
    flex-grow: 1;
  }

  button {
    @extend %button;
  }
</style>

<script>
  import diff from "microdiff";
  import semver from "semver";
  import { onDestroy, onMount, tick } from "svelte";

  import Field from "@/components/Field.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import Model from "@/components/Model.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import {
    API_VERSION_12_7,
    API_VERSION_12_9,
  } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { Features } from "@/js/features.svelte.js";
  import * as flightStats from "@/js/flight-stats.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { updateTabList } from "@/js/main.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { reinitialiseConnection } from "@/js/serial_backend.js";

  import BoardAlignment from "./BoardAlignment.svelte";
  import SerialPorts from "./SerialPorts.svelte";
  import { gyroFrequencyLabel, pidDenomOptions } from "./util.js";

  const DEG2RAD = 0.017453292519943295;

  let loading = $state(true);
  let initialState = $state();

  let modelRef;
  let boardAlignmentRef;
  let yawFix = $state(0);
  let fastInterval;

  let hasModelId = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7));
  let hasFlightStats = $derived(
    semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9),
  );

  let flightStatsEnabled = $derived(
    FC.FLIGHT_STATS.stats_min_armed_time_s >= 0,
  );

  let pidBaseFreq = $derived(FC.CONFIG.sampleRateHz);
  let pidOptions = $derived(
    pidDenomOptions(pidBaseFreq, (key, opts) => $i18n.t(key, opts)),
  );
  let gyroLabel = $derived(
    gyroFrequencyLabel(pidBaseFreq, (key, opts) => $i18n.t(key, opts)),
  );

  const otherFeatures = Features.GROUPS.OTHER;

  function snapshotState() {
    return $state.snapshot({
      CONFIG: {
        name: FC.CONFIG.name,
        accelerometerTrims: FC.CONFIG.accelerometerTrims,
      },
      PILOT_CONFIG: { model_id: FC.PILOT_CONFIG.model_id },
      FLIGHT_STATS: FC.FLIGHT_STATS,
      FEATURE_CONFIG: { bitfield: FC.FEATURE_CONFIG.features.bitfield },
      ADVANCED_CONFIG: {
        pid_process_denom: FC.ADVANCED_CONFIG.pid_process_denom,
      },
      SENSOR_CONFIG: FC.SENSOR_CONFIG,
      BOARD_ALIGNMENT_CONFIG: FC.BOARD_ALIGNMENT_CONFIG,
      SENSOR_ALIGNMENT: { align_mag: FC.SENSOR_ALIGNMENT.align_mag },
      SERIAL_CONFIG: FC.SERIAL_CONFIG,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) return [];
    return diff(initialState, snapshotState());
  });

  let dirty = $derived(changes.length > 0);
  let showToolbar = $derived(!loading && dirty);

  function renderModelTick() {
    const x = FC.SENSOR_DATA.kinematics[1] * -1.0 * DEG2RAD;
    const y = (FC.SENSOR_DATA.kinematics[2] * -1.0 - yawFix) * DEG2RAD;
    const z = FC.SENSOR_DATA.kinematics[0] * -1.0 * DEG2RAD;
    modelRef?.rotateTo(x, y, z);
  }

  function onResetYaw() {
    yawFix = FC.SENSOR_DATA.kinematics[2] * -1.0;
  }

  function onFlightStatsEnabledChange(checked) {
    FC.FLIGHT_STATS.stats_min_armed_time_s = checked
      ? FC.FLIGHT_STATS.stats_min_armed_time_s >= 0
        ? FC.FLIGHT_STATS.stats_min_armed_time_s
        : 15
      : -1;
  }

  function onResetFlightStats() {
    FC.FLIGHT_STATS.stats_total_flights = 0;
    FC.FLIGHT_STATS.stats_total_time_s = 0;
    FC.FLIGHT_STATS.stats_total_dist_m = 0;
  }

  function onFeatureChange() {
    updateTabList(FC.FEATURE_CONFIG.features);
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_NAME);
    await MSP.promise(MSPCodes.MSP_BOARD_INFO);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);
    await MSP.promise(MSPCodes.MSP_SENSOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_SENSOR_ALIGNMENT);
    await MSP.promise(MSPCodes.MSP_BOARD_ALIGNMENT_CONFIG);
    await MSP.promise(MSPCodes.MSP_ACC_TRIM);
    await MSP.promise(MSPCodes.MSP_SERIAL_CONFIG);

    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)) {
      await MSP.promise(MSPCodes.MSP_PILOT_CONFIG);
    }
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)) {
      await MSP.promise(MSPCodes.MSP_FLIGHT_STATS);
    }

    initialState = snapshotState();
    loading = false;
    await tick();

    fastInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_ATTITUDE);
      renderModelTick();
    }, 50);
  });

  onDestroy(() => {
    clearInterval(fastInterval);
    boardAlignmentRef?.cleanup();
  });

  export async function onSave() {
    function save(code) {
      return MSP.promise(code, mspHelper.crunch(code));
    }

    FC.CONFIG.name = FC.CONFIG.name.trim();

    await save(MSPCodes.MSP_SET_NAME);
    await save(MSPCodes.MSP_SET_FEATURE_CONFIG);
    await save(MSPCodes.MSP_SET_ADVANCED_CONFIG);
    await save(MSPCodes.MSP_SET_SENSOR_CONFIG);
    await save(MSPCodes.MSP_SET_SENSOR_ALIGNMENT);
    await save(MSPCodes.MSP_SET_BOARD_ALIGNMENT_CONFIG);
    await save(MSPCodes.MSP_SET_ACC_TRIM);
    await save(MSPCodes.MSP_SET_SERIAL_CONFIG);

    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)) {
      await save(MSPCodes.MSP_SET_PILOT_CONFIG);
    }
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)) {
      await save(MSPCodes.MSP_SET_FLIGHT_STATS);
    }

    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  export async function onRevert() {
    const snapshot = $state.snapshot(initialState);

    Object.assign(FC.CONFIG, {
      name: snapshot.CONFIG.name,
      accelerometerTrims: snapshot.CONFIG.accelerometerTrims,
    });
    Object.assign(FC.PILOT_CONFIG, snapshot.PILOT_CONFIG);
    Object.assign(FC.FLIGHT_STATS, snapshot.FLIGHT_STATS);
    FC.FEATURE_CONFIG.features.bitfield = snapshot.FEATURE_CONFIG.bitfield;
    Object.assign(FC.ADVANCED_CONFIG, snapshot.ADVANCED_CONFIG);
    Object.assign(FC.SENSOR_CONFIG, snapshot.SENSOR_CONFIG);
    Object.assign(FC.BOARD_ALIGNMENT_CONFIG, snapshot.BOARD_ALIGNMENT_CONFIG);
    Object.assign(FC.SENSOR_ALIGNMENT, snapshot.SENSOR_ALIGNMENT);
    FC.SERIAL_CONFIG.ports.forEach((port, i) =>
      Object.assign(port, snapshot.SERIAL_CONFIG.ports[i]),
    );

    updateTabList(FC.FEATURE_CONFIG.features);
    boardAlignmentRef?.cleanup();
  }

  export function isDirty() {
    return dirty;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabConfiguration"), "_system");
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabConfiguration")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSaveReboot")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="grid">
    <div class="column">
      <Section label="configurationPersonalization">
        <Field id="craft-name" label="craftName">
          <input
            id="craft-name"
            type="text"
            maxlength="32"
            bind:value={FC.CONFIG.name}
          />
        </Field>
        {#if hasModelId}
          <Field
            id="model-id"
            label="configuration.personalisation.model_id.label"
          >
            <NumberInput
              id="model-id"
              bind:value={FC.PILOT_CONFIG.model_id}
              min={0}
              max={99}
              step={1}
            />
          </Field>
        {/if}
      </Section>

      {#if hasFlightStats}
        <Section label="configuration.flight_stats.heading">
          <Field
            id="enable-flight-stats"
            label="configuration.flight_stats.enable.label"
          >
            <Switch
              id="enable-flight-stats"
              checked={flightStatsEnabled}
              onchange={(e) => onFlightStatsEnabledChange(e.target.checked)}
            />
          </Field>
          {#if flightStatsEnabled}
            <Field
              id="min-armed-time"
              label="configuration.flight_stats.min_armed_time.label"
              unit="s"
            >
              {#snippet tooltip()}
                <Tooltip
                  help="configuration.flight_stats.min_armed_time.help"
                />
              {/snippet}
              <NumberInput
                id="min-armed-time"
                bind:value={FC.FLIGHT_STATS.stats_min_armed_time_s}
                min={0}
                max={99}
                step={1}
              />
            </Field>
            <div class="flight-stats-display">
              <table>
                <tbody>
                  <tr>
                    <th
                      >{$i18n.t(
                        "configuration.flight_stats.flight_count.label",
                      )}</th
                    >
                    <td>{FC.FLIGHT_STATS.stats_total_flights}</td>
                  </tr>
                  <tr>
                    <th
                      >{$i18n.t(
                        "configuration.flight_stats.flight_time.label",
                      )}</th
                    >
                    <td>{flightStats.getDuration()}</td>
                  </tr>
                  <tr>
                    <th
                      >{$i18n.t(
                        "configuration.flight_stats.distance.label",
                      )}</th
                    >
                    <td
                      >{FC.FLIGHT_STATS.stats_total_dist_m.toLocaleString()} m</td
                    >
                  </tr>
                </tbody>
              </table>
              <div class="grow"></div>
              <button class="btn" onclick={onResetFlightStats}>
                {$i18n.t("configuration.flight_stats.reset.label")}
              </button>
            </div>
          {/if}
        </Section>
      {/if}

      <Section label="configurationSystem">
        <Field id="gyro-frequency" label="configurationGyroSyncDenom">
          <input id="gyro-frequency" type="text" readonly value={gyroLabel} />
        </Field>
        <Field id="pid-denom" label="configurationPidProcessDenom">
          {#snippet tooltip()}
            <Tooltip help="configurationPidProcessDenomHelp" />
          {/snippet}
          <Select
            id="pid-denom"
            bind:value={FC.ADVANCED_CONFIG.pid_process_denom}
            options={pidOptions}
          />
        </Field>
        <Field id="acc-hardware" label="configurationAccHardware">
          {#snippet tooltip()}
            <Tooltip help="configurationAccHardwareHelp" />
          {/snippet}
          <Switch
            id="acc-hardware"
            bind:checked={
              () => FC.SENSOR_CONFIG.acc_hardware !== 1,
              (v) => (FC.SENSOR_CONFIG.acc_hardware = v ? 0 : 1)
            }
          />
        </Field>
        <Field id="baro-hardware" label="configurationBaroHardware">
          {#snippet tooltip()}
            <Tooltip help="configurationBaroHardwareHelp" />
          {/snippet}
          <Switch
            id="baro-hardware"
            bind:checked={
              () => FC.SENSOR_CONFIG.baro_hardware !== 1,
              (v) => (FC.SENSOR_CONFIG.baro_hardware = v ? 0 : 1)
            }
          />
        </Field>
        <Field id="mag-hardware" label="configurationMagHardware">
          {#snippet tooltip()}
            <Tooltip help="configurationMagHardwareHelp" />
          {/snippet}
          <Switch
            id="mag-hardware"
            bind:checked={
              () => FC.SENSOR_CONFIG.mag_hardware !== 1,
              (v) => (FC.SENSOR_CONFIG.mag_hardware = v ? 0 : 1)
            }
          />
        </Field>
      </Section>

      <Section>
        {#snippet header()}
          <div class="section-header">
            <span class="title">{$i18n.t("configurationFeatures")}</span>
            <div class="grow"></div>
            <HelpIcon>
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html $i18n.t("configurationFeaturesHelp")}
            </HelpIcon>
          </div>
        {/snippet}
        <div class="features">
          {#each otherFeatures as name (name)}
            <div class="feature-row">
              <Switch
                id={`feature-${name}`}
                checked={FC.FEATURE_CONFIG.features.isEnabled(name)}
                onchange={(e) => {
                  FC.FEATURE_CONFIG.features.setFeature(name, e.target.checked);
                  onFeatureChange();
                }}
              />
              <label for={`feature-${name}`} class="feature-info">
                <span class="feature-name">{name}</span>
                <span class="feature-desc">{$i18n.t(`feature_${name}`)}</span>
              </label>
              {#if $i18n.exists(`featureTip_${name}`)}
                <HelpIcon>
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  {@html $i18n.t(`featureTip_${name}`)}
                </HelpIcon>
              {/if}
            </div>
          {/each}
        </div>
      </Section>
    </div>

    <div class="column">
      <Section>
        {#snippet header()}
          <div class="section-header">
            <span class="title">{$i18n.t("configurationSerialPorts")}</span>
            <div class="grow"></div>
            <HelpIcon>{$i18n.t("configurationSerialPortsHelp")}</HelpIcon>
          </div>
        {/snippet}
        <SerialPorts />
      </Section>

      <Section>
        {#snippet header()}
          <div class="section-header">
            <span class="title">{$i18n.t("configurationBoardAlignment")}</span>
            <div class="grow"></div>
            <HelpIcon>{$i18n.t("configurationBoardAlignmentHelp")}</HelpIcon>
          </div>
        {/snippet}
        <BoardAlignment
          bind:this={boardAlignmentRef}
          magHardwareEnabled={FC.SENSOR_CONFIG.mag_hardware !== 1}
        />
      </Section>

      {#if FC.SENSOR_CONFIG.acc_hardware !== 1}
        <Section>
          {#snippet header()}
            <div class="section-header">
              <span class="title">{$i18n.t("configurationAccelTrims")}</span>
              <div class="grow"></div>
              <HelpIcon>{$i18n.t("configurationAccelTrimsHelp")}</HelpIcon>
            </div>
          {/snippet}
          <Field id="acc-trim-roll" label="configurationAccelTrimRoll">
            {#snippet tooltip()}
              <Tooltip help="configurationAccelRollTrimHelp" />
            {/snippet}
            <NumberInput
              id="acc-trim-roll"
              bind:value={FC.CONFIG.accelerometerTrims[1]}
              min={-300}
              max={300}
              step={1}
            />
          </Field>
          <Field id="acc-trim-pitch" label="configurationAccelTrimPitch">
            {#snippet tooltip()}
              <Tooltip help="configurationAccelPitchTrimHelp" />
            {/snippet}
            <NumberInput
              id="acc-trim-pitch"
              bind:value={FC.CONFIG.accelerometerTrims[0]}
              min={-300}
              max={300}
              step={1}
            />
          </Field>
        </Section>
      {/if}

      <div class="model-box">
        <Model bind:this={modelRef} />
        <button class="reset" onclick={onResetYaw}>
          {$i18n.t("statusButtonResetZaxisValue", { 1: yawFix })}
        </button>
      </div>
    </div>
  </div>
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }

  .help-btn {
    min-width: 60px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  .section-header {
    @extend %section-header;
    padding-right: 8px;
  }

  .title {
    padding-left: 8px;
    font-weight: 600;
  }

  input[type="text"] {
    width: 100%;
  }

  /* The Select component has no <style> of its own, so Svelte's scoping
     can't reach its internal <select> from here without :global(). Scoped
     to .grid so this doesn't leak into <select> elements outside this tab. */
  .grid :global(select) {
    height: 1.5rem;
    min-width: 120px;
    padding: 0 4px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--color-border-soft);
    background-color: var(--color-input-bg);
    color: var(--color-text);
  }

  .flight-stats-display {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 32px;
    padding: 0 4px;

    table {
      font-size: 0.75rem;

      th {
        text-align: left;
        padding-right: 8px;
        color: var(--color-text-soft);
        font-weight: 600;
      }
    }
  }

  .features {
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .feature-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    border-radius: var(--radius-xs);

    @media (hover: hover) {
      &:hover {
        background-color: var(--color-hover);
      }
    }
  }

  .feature-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0;
  }

  .feature-name {
    font-size: 0.75rem;
    font-weight: 600;
  }

  .feature-desc {
    font-size: 0.7rem;
    color: var(--color-text-soft);
  }

  .model-box {
    position: relative;
    height: 350px;
    margin-top: var(--section-gap);
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .reset {
    @extend %button;
    position: absolute;
    top: 10px;
    right: 10px;
  }

  @media only screen and (max-width: 480px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>

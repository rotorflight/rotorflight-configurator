<script>
  import diff from "microdiff";
  import semver from "semver";
  import { onDestroy, onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { reinitialiseConnection } from "@/js/serial_backend.js";

  import BatteryProfileTable from "./BatteryProfileTable.svelte";

  const SMARTFUEL_SOURCE_KEYS = ["None", "Voltage", "Current", "Combined"];

  let loading = $state(true);
  let initialState = $state(null);
  let savedBatteryProfile = $state(0);
  let pollerInterval;

  let calibDialogEl;
  let calibConfirmDialogEl;
  let calibVbat = $state(0);
  let calibAmp = $state(0);
  let showVbatCalib = $state(false);
  let showAmpCalib = $state(false);
  let newVbatScale = $state(0);
  let newAmpScale = $state(0);

  let smartFuelSupported = $derived(
    semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9),
  );

  /* FBUS meters exist from API 12.9 */
  let meterSourceKeys = $derived([
    "None",
    "Adc",
    "Esc",
    ...(smartFuelSupported ? ["Fbus"] : []),
  ]);

  function snapshotState() {
    return $state.snapshot({
      BATTERY_CONFIG: FC.BATTERY_CONFIG,
      SMARTFUEL_CONFIG: FC.SMARTFUEL_CONFIG,
      VOLTAGE_METER_CONFIGS: FC.VOLTAGE_METER_CONFIGS,
      CURRENT_METER_CONFIGS: FC.CURRENT_METER_CONFIGS,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }
    return diff(initialState, snapshotState());
  });

  // Swapping the voltage/current meter *source* re-maps hardware pins and
  // needs a reboot to take effect - other battery config fields apply live.
  let needReboot = $derived(
    changes.some(
      (c) =>
        c.path[0] === "BATTERY_CONFIG" &&
        (c.path[1] === "voltageMeterSource" ||
          c.path[1] === "currentMeterSource"),
    ),
  );

  let profileChanged = $derived(
    smartFuelSupported &&
      FC.BATTERY_STATE.batteryProfile !== savedBatteryProfile,
  );

  let dirty = $derived(changes.length > 0 || profileChanged);
  let showToolbar = $derived(!loading && dirty);

  let calibratable = $derived(FC.BATTERY_STATE.cellCount > 0);

  let calibrationAvailable = $derived(
    FC.BATTERY_CONFIG.voltageMeterSource === 1 ||
      FC.BATTERY_CONFIG.currentMeterSource === 1,
  );

  let smartFuelTuningEnabled = $derived(
    smartFuelSupported && [1, 3].includes(FC.SMARTFUEL_CONFIG.mode),
  );

  let voltageMeterTypeOptions = $derived(
    meterSourceKeys.map((key, value) => ({
      value,
      label: $i18n.t(`powerBatteryVoltageMeterType${key}`),
    })),
  );
  let currentMeterTypeOptions = $derived(
    meterSourceKeys.map((key, value) => ({
      value,
      label: $i18n.t(`powerBatteryCurrentMeterType${key}`),
    })),
  );
  let smartFuelSourceOptions = $derived(
    SMARTFUEL_SOURCE_KEYS.map((key, value) => ({
      value,
      label: $i18n.t(`powerSmartFuelSourceType${key}`),
    })),
  );

  function voltageConfigFor(meterId) {
    return FC.VOLTAGE_METER_CONFIGS.find((c) => c.id === meterId);
  }
  function currentConfigFor(meterId) {
    return FC.CURRENT_METER_CONFIGS.find((c) => c.id === meterId);
  }

  function sendVoltageMeterConfig(meterId) {
    const index = FC.VOLTAGE_METER_CONFIGS.findIndex((c) => c.id === meterId);
    if (index !== -1) {
      mspHelper.sendVoltageMeterConfig(index);
    }
  }
  function sendCurrentMeterConfig(meterId) {
    const index = FC.CURRENT_METER_CONFIGS.findIndex((c) => c.id === meterId);
    if (index !== -1) {
      mspHelper.sendCurrentMeterConfig(index);
    }
  }

  function getChargeDropRate() {
    return FC.SMARTFUEL_CONFIG.chargeDropRate / 100;
  }
  function setChargeDropRate(v) {
    FC.SMARTFUEL_CONFIG.chargeDropRate = Math.round(v * 100);
  }

  // Stored as hundredths of a volt per cell at full power; shown in volts.
  function getSagGain() {
    return FC.SMARTFUEL_CONFIG.sagGain / 100;
  }
  function setSagGain(v) {
    FC.SMARTFUEL_CONFIG.sagGain = Math.round(v * 100);
  }

  function activateBatteryProfile(index) {
    if (index === FC.BATTERY_STATE.batteryProfile) {
      return;
    }
    mspHelper.setBatteryProfile(index);
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabPower"), "_system");
  }

  function onClickCalibrationManager() {
    calibVbat = 0;
    calibAmp = 0;
    calibDialogEl.showModal();
  }

  function onClickCalibrate() {
    let vbatChanged = false;
    let ampChanged = false;

    if (FC.BATTERY_CONFIG.voltageMeterSource === 1 && calibVbat !== 0) {
      const scale = Math.round(
        FC.VOLTAGE_METER_CONFIGS[0].vbatscale *
          (calibVbat / FC.VOLTAGE_METERS[0].voltage),
      );
      if (scale >= 1 && scale <= 65535) {
        newVbatScale = scale;
        vbatChanged = true;
      }
    }

    if (FC.BATTERY_CONFIG.currentMeterSource === 1 && calibAmp !== 0) {
      const offset = FC.CURRENT_METER_CONFIGS[0].offset / 1000;
      if (FC.CURRENT_METERS[0].amperage !== offset && calibAmp !== offset) {
        const scale = Math.round(
          FC.CURRENT_METER_CONFIGS[0].scale *
            ((FC.CURRENT_METERS[0].amperage - offset) / (calibAmp - offset)),
        );
        if (scale > -16000 && scale < 16000 && scale !== 0) {
          newAmpScale = scale;
          ampChanged = true;
        }
      }
    }

    calibDialogEl.close();

    if (vbatChanged || ampChanged) {
      showVbatCalib = vbatChanged;
      showAmpCalib = ampChanged;
      calibConfirmDialogEl.showModal();
    }
  }

  function onApplyCalibration() {
    if (showVbatCalib) {
      FC.VOLTAGE_METER_CONFIGS[0].vbatscale = newVbatScale;
      sendVoltageMeterConfig(FC.VOLTAGE_METER_CONFIGS[0].id);
    }
    if (showAmpCalib) {
      FC.CURRENT_METER_CONFIGS[0].scale = newAmpScale;
      sendCurrentMeterConfig(FC.CURRENT_METER_CONFIGS[0].id);
    }
    calibConfirmDialogEl.close();
  }

  function onDiscardCalibration() {
    calibConfirmDialogEl.close();
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_BATTERY_STATE);
    await MSP.promise(MSPCodes.MSP_VOLTAGE_METERS);
    await MSP.promise(MSPCodes.MSP_CURRENT_METERS);
    await MSP.promise(MSPCodes.MSP_BATTERY_CONFIG);
    if (smartFuelSupported) {
      await MSP.promise(MSPCodes.MSP2_SMARTFUEL_CONFIG);
    }
    await MSP.promise(MSPCodes.MSP_VOLTAGE_METER_CONFIG);
    await MSP.promise(MSPCodes.MSP_CURRENT_METER_CONFIG);

    savedBatteryProfile = FC.BATTERY_STATE.batteryProfile;
    initialState = snapshotState();
    loading = false;

    pollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_STATUS);
      await MSP.promise(MSPCodes.MSP_VOLTAGE_METERS);
      await MSP.promise(MSPCodes.MSP_CURRENT_METERS);
      await MSP.promise(MSPCodes.MSP_BATTERY_STATE);
    }, 200);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
  });

  function sendVoltageConfig() {
    return new Promise((resolve) => mspHelper.sendVoltageConfig(resolve));
  }
  function sendCurrentConfig() {
    return new Promise((resolve) => mspHelper.sendCurrentConfig(resolve));
  }

  export async function onSave() {
    await MSP.promise(
      MSPCodes.MSP_SET_BATTERY_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_BATTERY_CONFIG),
    );
    if (smartFuelSupported) {
      await MSP.promise(
        MSPCodes.MSP2_SET_SMARTFUEL_CONFIG,
        mspHelper.crunch(MSPCodes.MSP2_SET_SMARTFUEL_CONFIG),
      );
    }
    await sendVoltageConfig();
    await sendCurrentConfig();
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    if (needReboot) {
      MSP.send_message(MSPCodes.MSP_SET_REBOOT);
      GUI.log($i18n.t("deviceRebooting"));
      await new Promise((resolve) => reinitialiseConnection(resolve));
    }

    savedBatteryProfile = FC.BATTERY_STATE.batteryProfile;
    initialState = snapshotState();
  }

  export async function onRevert() {
    Object.assign(FC.BATTERY_CONFIG, initialState.BATTERY_CONFIG);
    Object.assign(FC.SMARTFUEL_CONFIG, initialState.SMARTFUEL_CONFIG);
    FC.VOLTAGE_METER_CONFIGS.forEach((c, i) =>
      Object.assign(c, initialState.VOLTAGE_METER_CONFIGS[i]),
    );
    FC.CURRENT_METER_CONFIGS.forEach((c, i) =>
      Object.assign(c, initialState.CURRENT_METER_CONFIGS[i]),
    );

    if (profileChanged) {
      await mspHelper.setBatteryProfile(savedBatteryProfile);
    }

    // Scale/divider edits are sent to the FC live as they're typed, so
    // reverting locally isn't enough - push the restored values back too.
    await sendVoltageConfig();
    await sendCurrentConfig();
  }

  export function isDirty() {
    return dirty;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabPower")}</h1>
  <div class="grow"></div>
  {#if calibrationAvailable}
    <button class="btn" onclick={onClickCalibrationManager}>
      {$i18n.t("powerCalibrationManagerButton")}
    </button>
  {/if}
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>
    {$i18n.t(needReboot ? "buttonSaveReboot" : "buttonSave")}
  </button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  {#if FC.BATTERY_CONFIG.hasProfileCells}
    <Section label="powerBatteryProfiles">
      <BatteryProfileTable onActivate={activateBatteryProfile} />
    </Section>
  {/if}

  <div class="columns">
    <div class="column">
      <Section label="powerStateHead">
        <table class="cf_table">
          <tbody>
            <tr>
              <td>{$i18n.t("powerBatteryConnected")}</td>
              <td>
                {#if FC.BATTERY_STATE.cellCount > 0}
                  {$i18n.t("powerBatteryConnectedValueYes", {
                    1: FC.BATTERY_STATE.cellCount,
                  })}
                {:else}
                  {$i18n.t("powerBatteryConnectedValueNo")}
                {/if}
              </td>
            </tr>
            <tr>
              <td>{$i18n.t("powerBatteryVoltage")}</td>
              <td
                >{$i18n.t("powerVoltageValue", {
                  1: FC.BATTERY_STATE.voltage,
                })}</td
              >
            </tr>
            <tr>
              <td>{$i18n.t("powerBatteryAmperage")}</td>
              <td
                >{$i18n.t("powerAmperageValue", {
                  1: FC.BATTERY_STATE.amperage,
                })}</td
              >
            </tr>
            <tr>
              <td>{$i18n.t("powerBatteryCurrentDrawn")}</td>
              <td
                >{$i18n.t("powerMahValue", {
                  1: FC.BATTERY_STATE.mAhDrawn,
                })}</td
              >
            </tr>
            <tr>
              <td>{$i18n.t("powerBatteryChargeLevel")}</td>
              <td
                >{$i18n.t("powerChargeLevel", {
                  1: FC.BATTERY_STATE.chargeLevel,
                })}</td
              >
            </tr>
          </tbody>
        </table>
      </Section>

      {#if !FC.BATTERY_CONFIG.hasProfileCells}
        <Section label="powerBatteryHead">
          <Field
            id="power-min-cell-voltage"
            label="powerBatteryMinimumCellVoltage"
          >
            <NumberInput
              id="power-min-cell-voltage"
              bind:value={FC.BATTERY_CONFIG.vbatmincellvoltage}
              min={1}
              max={5}
              step={0.01}
            />
          </Field>
          <Field
            id="power-full-cell-voltage"
            label="powerBatteryFullCellVoltage"
          >
            <NumberInput
              id="power-full-cell-voltage"
              bind:value={FC.BATTERY_CONFIG.vbatfullcellvoltage}
              min={1}
              max={5}
              step={0.01}
            />
          </Field>
          <Field
            id="power-warning-cell-voltage"
            label="powerBatteryWarningCellVoltage"
          >
            <NumberInput
              id="power-warning-cell-voltage"
              bind:value={FC.BATTERY_CONFIG.vbatwarningcellvoltage}
              min={1}
              max={5}
              step={0.01}
            />
          </Field>
          <Field
            id="power-max-cell-voltage"
            label="powerBatteryMaximumCellVoltage"
          >
            <NumberInput
              id="power-max-cell-voltage"
              bind:value={FC.BATTERY_CONFIG.vbatmaxcellvoltage}
              min={1}
              max={5}
              step={0.01}
            />
          </Field>
          <Field id="power-cell-count" label="powerBatteryCellCount">
            <NumberInput
              id="power-cell-count"
              bind:value={FC.BATTERY_CONFIG.cellCount}
              min={0}
              max={24}
              step={1}
            />
          </Field>

          {#if smartFuelSupported}
            <div class="profile-capacities">
              {#each Array.from({ length: 6 }) as _, i (i)}
                <div
                  class={[
                    "profile-capacity",
                    i === FC.BATTERY_STATE.batteryProfile && "active",
                  ]}
                >
                  <button
                    type="button"
                    class="profile-activate"
                    onclick={() => activateBatteryProfile(i)}
                  >
                    {$i18n.t("powerBatteryProfile", { 1: i + 1 })}
                  </button>
                  <div class="profile-capacity-input">
                    <NumberInput
                      id={`power-capacity-${i}`}
                      bind:value={FC.BATTERY_CONFIG.capacities[i]}
                      min={0}
                      max={40000}
                      step={10}
                    />
                    <span class="unit">mAh</span>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <Field id="power-capacity" label="powerBatteryCapacity">
              <NumberInput
                id="power-capacity"
                bind:value={FC.BATTERY_CONFIG.capacity}
                min={0}
                max={20000}
                step={50}
              />
            </Field>
          {/if}
        </Section>
      {/if}

      {#if smartFuelSupported}
        <Section label="powerSmartFuelHead" summary="powerSmartFuelSourceHelp">
          <Field id="power-smartfuel-source" label="powerSmartFuelSource">
            <Select
              id="power-smartfuel-source"
              bind:value={FC.SMARTFUEL_CONFIG.mode}
              options={smartFuelSourceOptions}
            />
          </Field>
          <Field
            id="power-smartfuel-alert"
            label="powerSmartFuelAlertPercent"
            unit="%"
          >
            {#snippet tooltip()}
              <Tooltip help="powerSmartFuelAlertPercentHelp" />
            {/snippet}
            <NumberInput
              id="power-smartfuel-alert"
              bind:value={FC.BATTERY_CONFIG.mahWarningPercentage}
              min={0}
              max={100}
              step={1}
            />
          </Field>
          {#if smartFuelTuningEnabled}
            <Field
              id="power-smartfuel-vdrop"
              label="powerSmartFuelVoltageDropRate"
              unit="mV/s"
            >
              {#snippet tooltip()}
                <Tooltip help="powerSmartFuelVoltageDropRateHelp" />
              {/snippet}
              <NumberInput
                id="power-smartfuel-vdrop"
                bind:value={FC.SMARTFUEL_CONFIG.voltageDropRate}
                min={0}
                max={250}
                step={1}
              />
            </Field>
            <Field
              id="power-smartfuel-cdrop"
              label="powerSmartFuelChargeDropRate"
              unit="%/s"
            >
              {#snippet tooltip()}
                <Tooltip help="powerSmartFuelChargeDropRateHelp" />
              {/snippet}
              <NumberInput
                id="power-smartfuel-cdrop"
                bind:value={getChargeDropRate, setChargeDropRate}
                min={0}
                max={2.5}
                step={0.01}
              />
            </Field>
            <Field
              id="power-smartfuel-sag"
              label="powerSmartFuelSagGain"
              unit="V"
            >
              {#snippet tooltip()}
                <Tooltip help="powerSmartFuelSagGainHelp" />
              {/snippet}
              <NumberInput
                id="power-smartfuel-sag"
                bind:value={getSagGain, setSagGain}
                min={0}
                max={1}
                step={0.01}
              />
            </Field>
          {/if}
        </Section>
      {/if}
    </div>

    <div class="column">
      <Section label="powerMetersHead">
        <Field id="power-vbat-source" label="powerBatteryVoltageMeterSource">
          <Select
            id="power-vbat-source"
            bind:value={FC.BATTERY_CONFIG.voltageMeterSource}
            options={voltageMeterTypeOptions}
          />
        </Field>
        <Field id="power-current-source" label="powerBatteryCurrentMeterSource">
          <Select
            id="power-current-source"
            bind:value={FC.BATTERY_CONFIG.currentMeterSource}
            options={currentMeterTypeOptions}
          />
        </Field>
      </Section>

      {#if FC.VOLTAGE_METERS.length > 0}
        <Section label="powerVoltageHead">
          {#each FC.VOLTAGE_METERS as meter (meter.id)}
            {@const config = voltageConfigFor(meter.id)}
            <div class="meter-card">
              <div class="meter-header">
                <span>{$i18n.t(`powerVoltageId${meter.id}`)}</span>
                <span
                  >{$i18n.t("powerVoltageValue", {
                    1: meter.voltage.toFixed(meter.voltage < 4 ? 3 : 2),
                  })}</span
                >
              </div>
              {#if config?.sensorType === 1}
                <Field
                  id={`power-vscale-${meter.id}`}
                  label="powerVoltageScale"
                >
                  <NumberInput
                    id={`power-vscale-${meter.id}`}
                    bind:value={config.vbatscale}
                    min={0}
                    max={65535}
                    step={1}
                    onchange={() => sendVoltageMeterConfig(meter.id)}
                  />
                </Field>
                <Field
                  id={`power-vdiv-${meter.id}`}
                  label="powerVoltageDivider"
                >
                  <NumberInput
                    id={`power-vdiv-${meter.id}`}
                    bind:value={config.vbatresdivval}
                    min={1}
                    max={65535}
                    step={1}
                    onchange={() => sendVoltageMeterConfig(meter.id)}
                  />
                </Field>
              {/if}
            </div>
          {/each}
        </Section>
      {/if}

      {#if FC.CURRENT_METERS.length > 0}
        <Section label="powerAmperageHead">
          {#each FC.CURRENT_METERS as meter (meter.id)}
            {@const config = currentConfigFor(meter.id)}
            <div class="meter-card">
              <div class="meter-header">
                <span>{$i18n.t(`powerAmperageId${meter.id}`)}</span>
                <span
                  >{$i18n.t("powerAmperageValue", {
                    1: meter.amperage.toFixed(2),
                  })}</span
                >
              </div>
              {#if config?.sensorType === 1}
                <Field
                  id={`power-ascale-${meter.id}`}
                  label="powerAmperageScale"
                >
                  <NumberInput
                    id={`power-ascale-${meter.id}`}
                    bind:value={config.scale}
                    min={-16000}
                    max={16000}
                    step={1}
                    onchange={() => sendCurrentMeterConfig(meter.id)}
                  />
                </Field>
                <Field
                  id={`power-aoffset-${meter.id}`}
                  label="powerAmperageOffset"
                >
                  <NumberInput
                    id={`power-aoffset-${meter.id}`}
                    bind:value={config.offset}
                    min={-32000}
                    max={32000}
                    step={1}
                    onchange={() => sendCurrentMeterConfig(meter.id)}
                  />
                </Field>
              {/if}
            </div>
          {/each}
        </Section>
      {/if}
    </div>
  </div>
</Page>

<dialog bind:this={calibDialogEl}>
  <h3>{$i18n.t("powerCalibrationManagerTitle")}</h3>
  <div class="content">
    <p>{$i18n.t("powerCalibrationManagerHelp")}</p>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("powerCalibrationManagerNote")}</p>

    {#if !calibratable}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <p class="warning">{@html $i18n.t("powerCalibrationManagerWarning")}</p>
    {:else if needReboot}
      <p class="warning">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html $i18n.t("powerCalibrationManagerSourceNote")}
      </p>
    {:else}
      {#if FC.BATTERY_CONFIG.voltageMeterSource === 1 && FC.BATTERY_STATE.voltage > 0.1}
        <Field id="power-calib-vbat" label="powerVoltageCalibration">
          <NumberInput
            id="power-calib-vbat"
            bind:value={calibVbat}
            min={0}
            max={255}
            step={0.01}
          />
        </Field>
      {/if}
      {#if FC.BATTERY_CONFIG.currentMeterSource === 1 && FC.BATTERY_STATE.amperage > 0.1}
        <Field id="power-calib-amp" label="powerAmperageCalibration">
          <NumberInput
            id="power-calib-amp"
            bind:value={calibAmp}
            min={0}
            max={255}
            step={0.01}
          />
        </Field>
      {/if}
    {/if}
  </div>
  <div class="buttons">
    {#if calibratable && !needReboot}
      <button class="btn" onclick={onClickCalibrate}>
        {$i18n.t("powerCalibrationSave")}
      </button>
    {/if}
    <button class="btn" onclick={() => calibDialogEl.close()}>
      {$i18n.t("close")}
    </button>
  </div>
</dialog>

<dialog bind:this={calibConfirmDialogEl}>
  <h3>{$i18n.t("powerCalibrationManagerConfirmationTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("powerCalibrationConfirmHelp")}</p>
    {#if showVbatCalib}
      <div class="calib-result">
        <span>{$i18n.t("powerVoltageCalibratedScale")}</span>
        <output>{newVbatScale}</output>
      </div>
    {/if}
    {#if showAmpCalib}
      <div class="calib-result">
        <span>{$i18n.t("powerAmperageCalibratedScale")}</span>
        <output>{newAmpScale}</output>
      </div>
    {/if}
  </div>
  <div class="buttons">
    <button class="btn" onclick={onApplyCalibration}>
      {$i18n.t("powerCalibrationApply")}
    </button>
    <button class="btn" onclick={onDiscardCalibration}>
      {$i18n.t("powerCalibrationDiscard")}
    </button>
  </div>
</dialog>

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

  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    column-gap: var(--section-gap);
    align-items: start;
  }

  table.cf_table {
    width: 100%;
    border-collapse: collapse;
  }

  table.cf_table td {
    padding: 4px 8px;
    font-size: 0.8rem;
  }

  .profile-capacities {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
    padding: 8px 4px 4px;
  }

  .profile-capacity {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border-radius: var(--radius-xs);

    background-color: var(--color-surface);
    border: 1px solid var(--color-border);

    &.active {
      border-color: var(--color-accent-500);
    }
  }

  .profile-activate {
    @extend %button;
    padding: 4px 8px;
    font-size: 0.75rem;
    text-align: left;
  }

  .profile-capacity.active .profile-activate {
    color: var(--color-accent-fg);
    background-color: var(--color-accent-500);
  }

  .profile-capacity-input {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .profile-capacity-input .unit {
    font-size: 0.7rem;
    color: var(--color-text-soft);
  }

  .meter-card {
    border-radius: var(--radius-xs);
    padding: 4px;

    background-color: var(--color-surface);
    border: 1px solid var(--color-border);

    &:not(:last-child) {
      margin-bottom: 8px;
    }
  }

  .meter-header {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px 8px;
    margin-bottom: 4px;
    font-weight: 600;
    font-size: 0.85rem;
    border-bottom: 1px solid var(--color-border);
  }

  .warning {
    color: var(--color-red-500, #e60000);
  }

  .calib-result {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-weight: 600;
  }

  dialog {
    width: 32em;
    border-radius: var(--radius-lg);
  }

  dialog .content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  dialog .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 1.5em;
  }

  dialog h3 {
    margin-bottom: 0.5em;
  }

  @media only screen and (max-width: 480px) {
    .columns {
      grid-template-columns: 1fr;
    }

    dialog {
      width: calc(100% - 2em);
      border-radius: unset;
    }
  }
</style>

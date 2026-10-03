<script>
  import semver from "semver";
  import { onDestroy, onMount } from "svelte";

  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import SwashServoDiagram from "@/components/SwashServoDiagram.svelte";
  import Switch from "@/components/Switch.svelte";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { reinitialiseConnection } from "@/js/serial_backend";
  import {
    firmwareLimitsTravel,
    servoSignalRange,
    servoTravelLimited,
  } from "@/js/servoLimits.js";

  import ServoConfigTable from "./ServoConfigTable.svelte";
  import ServoOverrideTable from "./ServoOverrideTable.svelte";

  const MAX_SERVOS = 8;
  const MAX_SERVOS_12_9 = 26;
  const BUS_SERVO_OFFSET = 8;
  const BUS_SERVO_CHANNELS = 18;
  const OVERRIDE_OFF = 2001;

  let loading = $state(true);
  let dirty = $state(false);
  let needReboot = $state(false);
  let initialConfig;
  let poller;

  let overrideEnabled = $state(false);

  let hasExtendedServoScale = $derived(
    semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9),
  );
  let supportsBusServos = $derived(
    semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9),
  );
  let hasFbusOrSbus = $derived(
    FC.SERIAL_CONFIG.ports.some(
      (port) =>
        port.functions.includes("FBUS_OUT") ||
        port.functions.includes("SBUS_OUT"),
    ),
  );
  let maxServos = $derived(supportsBusServos ? MAX_SERVOS_12_9 : MAX_SERVOS);
  let busActive = $derived(supportsBusServos && hasFbusOrSbus);

  // FC.CONFIG.servoCount includes bus servos once FBUS/SBUS is active, so it
  // can't be used directly to bound "PWM-only" logic (unusual-value
  // warnings, the legacy servoCount-based consistency checks) -- this is the
  // actual PWM servo count either way.
  let pwmServoCount = $derived(
    busActive
      ? Math.max(0, FC.SERVO_CONFIG.length - BUS_SERVO_CHANNELS)
      : Math.min(FC.CONFIG.servoCount, maxServos),
  );

  let pwmServos = $derived.by(() => {
    const list = [];
    for (let index = 0; index < pwmServoCount; index++) {
      list.push({
        index,
        isBusServo: false,
        label: `${index + 1}`,
        mspIndex: index,
      });
    }
    return list;
  });

  let busServos = $derived.by(() => {
    if (!busActive) {
      return [];
    }

    const displayCount = Math.min(BUS_SERVO_CHANNELS, 16);
    const list = [];
    for (let i = 0; i < displayCount; i++) {
      const index = pwmServoCount + i;
      list.push({
        index,
        isBusServo: true,
        label: `${i + 1}`,
        mspIndex: BUS_SERVO_OFFSET + i,
      });
    }
    return list;
  });

  let allServos = $derived([...pwmServos, ...busServos]);

  // Servos whose Min/Max the firmware has cut because center + travel would
  // leave the signal range. The value snaps back to the limit when read back,
  // so this says why.
  function travelLimitNotes(servos) {
    if (!firmwareLimitsTravel(FC.CONFIG.apiVersion)) return [];
    return servos.flatMap((servo) => {
      const config = FC.SERVO_CONFIG[servo.index];
      if (!config) return [];
      const limited = servoTravelLimited(config, servo.isBusServo);
      const signal = servoSignalRange(servo.isBusServo);
      const notes = [];
      if (limited.max) {
        notes.push(
          $i18n.t("servoTravelLimitedMaxWarning", {
            1: servo.label,
            2: config.max,
            3: config.mid,
            4: signal.max,
          }),
        );
      }
      if (limited.min) {
        notes.push(
          $i18n.t("servoTravelLimitedMinWarning", {
            1: servo.label,
            2: config.min,
            3: config.mid,
            4: signal.min,
          }),
        );
      }
      return notes;
    });
  }

  let pwmLimitNotes = $derived(travelLimitNotes(pwmServos));
  let busLimitNotes = $derived(travelLimitNotes(busServos));

  // Unusual-value warnings, computed across PWM servos only -- these
  // thresholds are calibrated for analog PWM pulse-width ranges (mirrors
  // process_warnings() in the legacy tab) and don't mean anything for bus/
  // digital servos, which use a completely different scale (rneg/rpos
  // default to 1000, well outside any of these PWM-oriented bounds). The
  // 2-/3-servo consistency check is a heli swashplate assumption (fixed-
  // pitch/collective-pitch) that doesn't generalize to a bus servo bank
  // either, so it stays PWM-only too.
  let warnings = $derived.by(() => {
    let unusualScale = false;
    let unusualRate = false;
    let unusualLimit = false;
    let unusualGeoCor = false;

    const SERVOS = FC.SERVO_CONFIG;
    const FLAG_GEOCOR = 2;

    for (let index = 0; index < pwmServoCount; index++) {
      const servo = SERVOS[index];
      if (!servo) continue;

      if (servo.mid > 860) {
        if (servo.rate > 433) unusualRate = true;
        if (
          servo.min < -750 ||
          servo.min > -300 ||
          servo.max > 750 ||
          servo.max < 300
        )
          unusualLimit = true;
        if (
          servo.rneg < 300 ||
          servo.rneg > 750 ||
          servo.rpos < 300 ||
          servo.rpos > 750
        )
          unusualScale = true;
      } else {
        if (servo.rate > 600) unusualRate = true;
        if (
          servo.min < -375 ||
          servo.min > -150 ||
          servo.max > 375 ||
          servo.max < 150
        )
          unusualLimit = true;
        const scaleMin = hasExtendedServoScale ? 50 : 150;
        if (
          servo.rneg < scaleMin ||
          servo.rneg > 375 ||
          servo.rpos < scaleMin ||
          servo.rpos > 375
        )
          unusualScale = true;
      }
    }

    if (pwmServoCount === 2 && SERVOS[0] && SERVOS[1]) {
      if ((SERVOS[0].flags & FLAG_GEOCOR) !== (SERVOS[1].flags & FLAG_GEOCOR))
        unusualGeoCor = true;
      if (SERVOS[0].rate !== SERVOS[1].rate) unusualRate = true;
    } else if (pwmServoCount >= 3 && SERVOS[0] && SERVOS[1] && SERVOS[2]) {
      if (
        (SERVOS[0].flags & FLAG_GEOCOR) !== (SERVOS[1].flags & FLAG_GEOCOR) ||
        (SERVOS[1].flags & FLAG_GEOCOR) !== (SERVOS[2].flags & FLAG_GEOCOR) ||
        (SERVOS[0].flags & FLAG_GEOCOR) !== (SERVOS[2].flags & FLAG_GEOCOR)
      )
        unusualGeoCor = true;
      if (
        SERVOS[0].rate !== SERVOS[1].rate ||
        SERVOS[1].rate !== SERVOS[2].rate ||
        SERVOS[0].rate !== SERVOS[2].rate
      )
        unusualRate = true;
    }

    return { unusualScale, unusualRate, unusualLimit, unusualGeoCor };
  });

  let showToolbar = $derived(!loading && dirty);

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_SERIAL_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);
    await MSP.promise(MSPCodes.MSP_SERVO_CONFIGURATIONS);
    if (supportsBusServos) {
      await MSP.promise(MSPCodes.MSP_BUS_SERVO_CONFIG);
    }
    await MSP.promise(MSPCodes.MSP_SERVO_OVERRIDE);
    await MSP.promise(MSPCodes.MSP_SERVO);

    initialConfig = $state.snapshot(FC.SERVO_CONFIG);
    overrideEnabled = allServos.some((servo) => {
      const raw = FC.SERVO_OVERRIDE[servo.mspIndex];
      return raw >= -2000 && raw <= 2000;
    });
    loading = false;

    poller = setInterval(() => {
      MSP.send_message(MSPCodes.MSP_SERVO);
    }, 100);
  });

  onDestroy(() => {
    clearInterval(poller);
  });

  function onFieldChange(index) {
    dirty = true;
    mspHelper.sendServoConfig(index);
  }

  function onRateChange(index) {
    needReboot = true;
    onFieldChange(index);
  }

  function onToggleOverrideEnabled(checked) {
    overrideEnabled = checked;
    for (const servo of allServos) {
      FC.SERVO_OVERRIDE[servo.mspIndex] = checked ? 0 : OVERRIDE_OFF;
      mspHelper.sendServoOverride(servo.mspIndex);
    }
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabServos"), "_system");
  }

  export async function onSave() {
    await new Promise((resolve) => mspHelper.sendServoConfigurations(resolve));
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    if (needReboot) {
      MSP.send_message(MSPCodes.MSP_SET_REBOOT);
      GUI.log($i18n.t("deviceRebooting"));
      reinitialiseConnection();
    }

    dirty = false;
    needReboot = false;
    initialConfig = $state.snapshot(FC.SERVO_CONFIG);
  }

  export async function onRevert() {
    FC.SERVO_CONFIG = initialConfig;
    await new Promise((resolve) => mspHelper.sendServoConfigurations(resolve));
    dirty = false;
    needReboot = false;
  }

  export function isDirty() {
    return dirty;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabServos")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>
    {needReboot ? $i18n.t("buttonSaveReboot") : $i18n.t("buttonSave")}
  </button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <Section label="servoConfigurationPwm">
    {#if warnings.unusualLimit || warnings.unusualScale || warnings.unusualRate || warnings.unusualGeoCor}
      <div class="note">
        {#if warnings.unusualLimit}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html $i18n.t("servoUnusualLimitsWarning")}</p>
        {/if}
        {#if warnings.unusualScale}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html $i18n.t("servoUnusualScalesWarning")}</p>
        {/if}
        {#if warnings.unusualRate}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html $i18n.t("servoUnusualRatesWarning")}</p>
        {/if}
        {#if warnings.unusualGeoCor}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html $i18n.t("servoUnusualGeometryCorrection")}</p>
        {/if}
      </div>
    {/if}

    {#if pwmLimitNotes.length > 0}
      <div class="note">
        {#each pwmLimitNotes as note (note)}
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html note}</p>
        {/each}
      </div>
    {/if}

    {#if needReboot}
      <div class="note">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <p>{@html $i18n.t("servoRateRebootNote")}</p>
      </div>
    {/if}

    <SwashServoDiagram
      swashType={FC.MIXER_CONFIG.swash_type}
      tailServo={FC.MIXER_CONFIG.tail_rotor_mode === 0}
    />

    <div class="table-scroll">
      <ServoConfigTable
        servos={pwmServos}
        {hasExtendedServoScale}
        {onFieldChange}
        {onRateChange}
      />
    </div>
  </Section>

  {#if busActive}
    <Section label="servoConfigurationBus">
      {#if busLimitNotes.length > 0}
        <div class="note">
          {#each busLimitNotes as note (note)}
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            <p>{@html note}</p>
          {/each}
        </div>
      {/if}

      <div class="table-scroll">
        <ServoConfigTable
          servos={busServos}
          {hasExtendedServoScale}
          {onFieldChange}
          {onRateChange}
        />
      </div>
    </Section>
  {/if}

  <Section label="servoOverride" summary="servoOverrideHelp">
    <div class="override-toggle">
      <Switch
        id="servo-override-enable"
        bind:checked={() => overrideEnabled, onToggleOverrideEnabled}
      />
      <label for="servo-override-enable">
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <span>{@html $i18n.t("servoEnableOverrideLabel")}</span>
      </label>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <span class="description">{@html $i18n.t("servoEnableOverrideText")}</span
      >
    </div>
  </Section>

  {#if overrideEnabled}
    <Section label="servoOverridePwm">
      <ServoOverrideTable servos={pwmServos} />
    </Section>

    {#if busActive}
      <Section label="servoOverrideBus">
        <ServoOverrideTable servos={busServos} />
      </Section>
    {/if}
  {/if}
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
    padding: 4px 8px;
    min-width: 60px;
  }

  .table-scroll {
    overflow-x: auto;
    overflow-y: visible;
  }

  .note {
    margin: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);

    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-accent);
  }

  .note p {
    margin: 0;
  }

  .note p + p {
    margin-top: 6px;
  }

  .override-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
  }

  .description {
    color: var(--color-text-soft);
    font-size: 0.85rem;
  }
</style>

<script>
  import semver from "semver";
  import { onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import SwashServoDiagram from "@/components/SwashServoDiagram.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { API_VERSION_12_8 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { reinitialiseConnection } from "@/js/serial_backend";

  import MixerOverride from "./MixerOverride.svelte";

  const TAIL_VARIABLE_PITCH = 0;
  const TAIL_BIDIRECTIONAL = 2;

  let loading = $state(true);

  // Every change is sent to the FC right away, so the servos follow the
  // form. Saving writes EEPROM (and reboots for swash type / tail mode).
  let needSave = $state(false);
  let needReboot = $state(false);
  let dirtyGroups = {};

  let origConfig;
  let origInputs;

  let customConfig = $state(false);
  let customRules = $state(false);
  let hasTiltCorrection = $state(false);
  let hasPassthrough = $state(false);

  let form = $state({});

  let motorised = $derived(form.tailMode > TAIL_VARIABLE_PITCH);

  const directionOptions = [
    { value: 1, key: "mixerDirectionNormal" },
    { value: -1, key: "mixerDirectionReverse" },
  ];

  let swashTypeOptions = $derived(
    Mixer.swashTypes.map((name, value) => ({
      value,
      label: $i18n.t(name).replaceAll("&deg;", "°"),
    })),
  );
  let rotorDirectionOptions = $derived([
    { value: 0, label: $i18n.t("mixerClockwise") },
    { value: 1, label: $i18n.t("mixerCounterClockwise") },
  ]);
  let tailModeOptions = $derived([
    { value: 0, label: $i18n.t("mixerTailVariablePitch") },
    { value: 1, label: $i18n.t("mixerTailMotorized") },
    { value: 2, label: $i18n.t("mixerTailBidirectional") },
  ]);
  let dirOptions = $derived(
    directionOptions.map((o) => ({ value: o.value, label: $i18n.t(o.key) })),
  );

  let showTailCalibrationNote = $derived(motorised && form.tailCal !== 100);

  function round(value, decimals) {
    const f = 10 ** decimals;
    return Math.round(value * f) / f;
  }

  function dir(rate) {
    return rate < 0 ? -1 : 1;
  }

  function yawLimitsFromFc() {
    const input = FC.MIXER_INPUTS[3];
    if (motorised) {
      form.tailMotorMinYaw = round(input.min * -0.1, 1);
      form.tailMotorMaxYaw = round(input.max * 0.1, 1);
      form.tailMotorCenterTrim = round(
        FC.MIXER_CONFIG.tail_center_trim * 0.1,
        1,
      );
    } else {
      form.tailRotorMinYaw = round((input.min * -24) / 1000, 1);
      form.tailRotorMaxYaw = round((input.max * 24) / 1000, 1);
      form.tailRotorCenterTrim = round(
        (FC.MIXER_CONFIG.tail_center_trim * 24) / 1000,
        1,
      );
    }
  }

  function dataToForm() {
    const inputs = FC.MIXER_INPUTS;
    const config = FC.MIXER_CONFIG;

    form = {
      swashType: config.swash_type,
      mainRotorDir: config.main_rotor_dir,
      ailDir: dir(inputs[1].rate),
      elevDir: dir(inputs[2].rate),
      collDir: dir(inputs[4].rate),
      cyclicCal: round(Math.abs(inputs[1].rate) * 0.1, 1),
      collectiveCal: round(Math.abs(inputs[4].rate) * 0.1, 1),
      collGeoCorrection: round(config.coll_geo_correction / 5, 1),
      cyclicLimit: round((inputs[2].max * 12) / 1000, 1),
      collectiveLimit: round((inputs[4].max * 12) / 1000, 1),
      totalPitchLimit: round((config.blade_pitch_limit * 12) / 1000, 1),
      swashPhase: round(config.swash_phase * 0.1, 1),
      tiltPos: config.coll_tilt_correction_pos,
      tiltNeg: config.coll_tilt_correction_neg,
      trimRoll: round(config.swash_trim[0] * 0.1, 1),
      trimPitch: round(config.swash_trim[1] * 0.1, 1),
      trimCollective: round(config.swash_trim[2] * 0.1, 1),
      tailMode: config.tail_rotor_mode,
      tailDir: dir(inputs[3].rate),
      tailCal: round(Math.abs(inputs[3].rate) * 0.1, 1),
      tailMotorIdle: round(config.tail_motor_idle / 10, 1),
      tailRotorCenterTrim: 0,
      tailMotorCenterTrim: 0,
      tailRotorMinYaw: 0,
      tailRotorMaxYaw: 0,
      tailMotorMinYaw: 0,
      tailMotorMaxYaw: 0,
    };
    yawLimitsFromFc();

    customConfig =
      (inputs[1].rate !== inputs[2].rate &&
        inputs[1].rate !== -inputs[2].rate) ||
      inputs[1].max !== inputs[2].max ||
      inputs[1].min !== inputs[2].min ||
      inputs[1].max !== -inputs[1].min ||
      inputs[2].max !== -inputs[2].min ||
      inputs[4].max !== -inputs[4].min;
    customRules = !Mixer.isNullMixer(FC.MIXER_RULES);
  }

  function markDirty(group) {
    dirtyGroups[group] = true;
    needSave = true;
  }

  function applyConfig() {
    const c = FC.MIXER_CONFIG;
    c.swash_type = form.swashType;
    c.swash_phase = Math.round(form.swashPhase * 10);
    c.main_rotor_dir = form.mainRotorDir;
    c.blade_pitch_limit = Math.round((form.totalPitchLimit * 1000) / 12);
    c.swash_trim[0] = Math.round(form.trimRoll * 10);
    c.swash_trim[1] = Math.round(form.trimPitch * 10);
    c.swash_trim[2] = Math.round(form.trimCollective * 10);
    c.tail_rotor_mode = form.tailMode;
    c.tail_motor_idle = Math.round(form.tailMotorIdle * 10);
    c.coll_geo_correction = Math.round(form.collGeoCorrection * 5);
    c.coll_tilt_correction_pos = Math.round(form.tiltPos);
    c.coll_tilt_correction_neg = Math.round(form.tiltNeg);
    c.tail_center_trim = motorised
      ? Math.round(form.tailMotorCenterTrim * 10)
      : Math.round((form.tailRotorCenterTrim * 1000) / 24);

    markDirty("config");
    MSP.send_message(
      MSPCodes.MSP_SET_MIXER_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_MIXER_CONFIG),
    );
  }

  function applyCyclic(index, direction) {
    const rate = Math.round(form.cyclicCal * 10);
    const max = Math.round((form.cyclicLimit * 1000) / 12);
    FC.MIXER_INPUTS[index].rate = rate * direction;
    FC.MIXER_INPUTS[index].min = -max;
    FC.MIXER_INPUTS[index].max = max;
    markDirty(`input${index}`);
    mspHelper.sendMixerInput(index);
  }

  function applyInput1() {
    applyCyclic(1, form.ailDir);
  }

  function applyInput2() {
    applyCyclic(2, form.elevDir);
  }

  function applyInputs12() {
    applyInput1();
    applyInput2();
  }

  function applyInput3() {
    let min, max;
    if (motorised) {
      min = Math.round(form.tailMotorMinYaw * -10);
      max = Math.round(form.tailMotorMaxYaw * 10);
    } else {
      min = Math.round((form.tailRotorMinYaw * -1000) / 24);
      max = Math.round((form.tailRotorMaxYaw * 1000) / 24);
    }
    FC.MIXER_INPUTS[3].rate = Math.round(form.tailCal * 10) * form.tailDir;
    FC.MIXER_INPUTS[3].min = min;
    FC.MIXER_INPUTS[3].max = max;
    markDirty("input3");
    mspHelper.sendMixerInput(3);
  }

  function applyInput4() {
    const rate = Math.round(form.collectiveCal * 10);
    const max = Math.round((form.collectiveLimit * 1000) / 12);
    FC.MIXER_INPUTS[4].rate = rate * form.collDir;
    FC.MIXER_INPUTS[4].min = -max;
    FC.MIXER_INPUTS[4].max = max;
    markDirty("input4");
    mspHelper.sendMixerInput(4);
  }

  function onRebootChange() {
    needReboot = true;
    applyConfig();
  }

  function onTailModeChange() {
    FC.MIXER_CONFIG.tail_rotor_mode = form.tailMode;
    yawLimitsFromFc();
    form.tailCal = motorised ? 100 : 25;
    needReboot = true;
    applyConfig();
    applyInput3();
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_INPUTS);
    await MSP.promise(MSPCodes.MSP_MIXER_RULES);
    await MSP.promise(MSPCodes.MSP_MIXER_OVERRIDE);

    hasTiltCorrection = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8);
    hasPassthrough = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8);

    origConfig = Mixer.cloneConfig(FC.MIXER_CONFIG);
    origInputs = Mixer.cloneInputs(FC.MIXER_INPUTS);

    dataToForm();
    loading = false;
  });

  async function sendDirty() {
    if (dirtyGroups.config) {
      await MSP.promise(
        MSPCodes.MSP_SET_MIXER_CONFIG,
        mspHelper.crunch(MSPCodes.MSP_SET_MIXER_CONFIG),
      );
    }
    for (const index of [1, 2, 3, 4]) {
      if (dirtyGroups[`input${index}`]) {
        await new Promise((resolve) =>
          mspHelper.sendMixerInput(index, resolve),
        );
      }
    }
    dirtyGroups = {};
  }

  export async function onSave() {
    await sendDirty();
    if (needSave) {
      await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
      GUI.log($i18n.t("eepromSaved"));
    }
    needSave = false;

    if (needReboot) {
      needReboot = false;
      MSP.send_message(MSPCodes.MSP_SET_REBOOT);
      GUI.log($i18n.t("deviceRebooting"));
      await new Promise((resolve) => reinitialiseConnection(resolve));
    } else {
      origConfig = Mixer.cloneConfig(FC.MIXER_CONFIG);
      origInputs = Mixer.cloneInputs(FC.MIXER_INPUTS);
    }
  }

  export async function onRevert() {
    FC.MIXER_CONFIG = Mixer.cloneConfig(origConfig);
    FC.MIXER_INPUTS = Mixer.cloneInputs(origInputs);
    await sendDirty();
    needSave = false;
    needReboot = false;
    dataToForm();
  }

  export function isDirty() {
    return needSave || needReboot;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabMixer"), "_system");
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabMixer")}</h1>
  <div class="grow"></div>
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

{#snippet numberField(id, label, help, key, opts, onchange, unit)}
  <Field {id} {label} {unit}>
    {#snippet tooltip()}
      {#if help}
        <Tooltip {help} />
      {/if}
    {/snippet}
    <NumberInput
      {id}
      {...opts}
      disabled={customConfig}
      bind:value={form[key]}
      {onchange}
    />
  </Field>
{/snippet}

{#snippet selectField(id, label, help, key, options, onchange)}
  <Field {id} {label}>
    {#snippet tooltip()}
      <Tooltip {help} />
    {/snippet}
    <Select
      {id}
      {options}
      disabled={customConfig}
      bind:value={form[key]}
      {onchange}
    />
  </Field>
{/snippet}

<Page {header} {loading} toolbar={(needSave || needReboot) && toolbar}>
  <div class="notes">
    {#if customConfig}
      <WarningNote message="mixerCustomNote" />
    {/if}
    {#if customRules}
      <InfoNote message="mixerRulesNote" />
    {/if}
    {#if form.tailMode === TAIL_BIDIRECTIONAL}
      <WarningNote message="mixerBidirNote" />
    {/if}
    {#if needReboot}
      <InfoNote message="mixerRebootNote" />
    {/if}
  </div>

  <div class="columns">
    <div class="column">
      <Section label="mixerMainRotorSettings">
        {@render selectField(
          "mixer-swash-type",
          "mixerSwashType",
          "mixerSwashTypeHelp",
          "swashType",
          swashTypeOptions,
          onRebootChange,
        )}
        <SwashServoDiagram
          swashType={form.swashType}
          tailServo={form.tailMode === TAIL_VARIABLE_PITCH}
        />
        {@render selectField(
          "mixer-rotor-dir",
          "mixerMainRotorDirection",
          "mixerMainRotorDirectionHelp",
          "mainRotorDir",
          rotorDirectionOptions,
          applyConfig,
        )}
        {@render selectField(
          "mixer-ail-dir",
          "mixerAileronDirection",
          "mixerAileronDirectionHelp",
          "ailDir",
          dirOptions,
          applyInput1,
        )}
        {@render selectField(
          "mixer-elev-dir",
          "mixerElevatorDirection",
          "mixerElevatorDirectionHelp",
          "elevDir",
          dirOptions,
          applyInput2,
        )}
        {@render selectField(
          "mixer-coll-dir",
          "mixerCollectiveDirection",
          "mixerCollectiveDirectionHelp",
          "collDir",
          dirOptions,
          applyInput4,
        )}
      </Section>

      <Section label="mixerSwashLinkTrim">
        {@render numberField(
          "mixer-trim-roll",
          "mixerSwashRollTrim",
          "mixerSwashTrimHelp",
          "trimRoll",
          { min: -100, max: 100, step: 0.1 },
          applyConfig,
        )}
        {@render numberField(
          "mixer-trim-pitch",
          "mixerSwashPitchTrim",
          null,
          "trimPitch",
          { min: -100, max: 100, step: 0.1 },
          applyConfig,
        )}
        {@render numberField(
          "mixer-trim-coll",
          "mixerSwashCollectiveTrim",
          null,
          "trimCollective",
          { min: -100, max: 100, step: 0.1 },
          applyConfig,
        )}
      </Section>

      <Section label="mixerTailRotorSettings">
        {@render selectField(
          "mixer-tail-mode",
          "mixerTailRotorMode",
          "mixerTailRotorModeHelp",
          "tailMode",
          tailModeOptions,
          onTailModeChange,
        )}
        {@render selectField(
          "mixer-tail-dir",
          "mixerTailRotorDirection",
          "mixerTailRotorDirectionHelp",
          "tailDir",
          dirOptions,
          applyInput3,
        )}
        {#if motorised}
          {@render numberField(
            "mixer-tail-motor-trim",
            "mixerTailMotorCenterTrim",
            "mixerTailMotorCenterTrimHelp",
            "tailMotorCenterTrim",
            { min: -50, max: 50, step: 0.1 },
            applyConfig,
          )}
        {:else}
          {@render numberField(
            "mixer-tail-rotor-trim",
            "mixerTailRotorCenterTrim",
            "mixerTailRotorCenterTrimHelp",
            "tailRotorCenterTrim",
            { min: -25, max: 25, step: 0.1 },
            applyConfig,
          )}
        {/if}
        {#if showTailCalibrationNote}
          <InfoNote message="mixerMotorisedTailCalibrationNote" />
        {/if}
        {@render numberField(
          "mixer-tail-cal",
          "mixerTailRotorCalibration",
          "mixerTailRotorCalibrationHelp",
          "tailCal",
          { min: 10, max: 500, step: 0.1 },
          applyInput3,
        )}
        {#if motorised}
          {@render numberField(
            "mixer-tail-motor-min",
            "mixerTailMotorMinYaw",
            "mixerTailMotorMinYawHelp",
            "tailMotorMinYaw",
            { min: 0, max: 200, step: 1 },
            applyInput3,
          )}
          {@render numberField(
            "mixer-tail-motor-max",
            "mixerTailMotorMaxYaw",
            "mixerTailMotorMaxYawHelp",
            "tailMotorMaxYaw",
            { min: 0, max: 200, step: 1 },
            applyInput3,
          )}
          {@render numberField(
            "mixer-tail-motor-idle",
            "mixerTailMotorIdle",
            "mixerTailMotorIdleHelp",
            "tailMotorIdle",
            { min: 0, max: 25, step: 0.1 },
            applyConfig,
          )}
        {:else}
          {@render numberField(
            "mixer-tail-rotor-min",
            "mixerTailRotorMinYaw",
            "mixerTailRotorMinYawHelp",
            "tailRotorMinYaw",
            { min: 0, max: 60, step: 0.1 },
            applyInput3,
          )}
          {@render numberField(
            "mixer-tail-rotor-max",
            "mixerTailRotorMaxYaw",
            "mixerTailRotorMaxYawHelp",
            "tailRotorMaxYaw",
            { min: 0, max: 60, step: 0.1 },
            applyInput3,
          )}
        {/if}
      </Section>
    </div>

    <div class="column">
      <Section label="mixerGeometrySettings">
        {@render numberField(
          "mixer-cyclic-cal",
          "mixerCyclicCalibration",
          "mixerCyclicCalibrationHelp",
          "cyclicCal",
          { min: 20, max: 200, step: 0.1 },
          applyInputs12,
        )}
        {@render numberField(
          "mixer-coll-cal",
          "mixerCollectiveCalibration",
          "mixerCollectiveCalibrationHelp",
          "collectiveCal",
          { min: 20, max: 200, step: 0.1 },
          applyInput4,
        )}
        {@render numberField(
          "mixer-coll-geo",
          "mixerCollectiveGeoCorrection",
          "mixerCollectiveGeoCorrectionHelp",
          "collGeoCorrection",
          { min: -25, max: 25, step: 0.2 },
          applyConfig,
        )}
        {@render numberField(
          "mixer-cyclic-limit",
          "mixerCyclicLimit",
          "mixerCyclicLimitHelp",
          "cyclicLimit",
          { min: 0, max: 20, step: 0.1 },
          applyInputs12,
        )}
        {@render numberField(
          "mixer-coll-limit",
          "mixerCollectiveLimit",
          "mixerCollectiveLimitHelp",
          "collectiveLimit",
          { min: 0, max: 20, step: 0.1 },
          applyInput4,
        )}
        {@render numberField(
          "mixer-total-limit",
          "mixerTotalPitchLimit",
          "mixerTotalPitchLimitHelp",
          "totalPitchLimit",
          { min: 0, max: 36, step: 0.1 },
          applyConfig,
        )}
        {@render numberField(
          "mixer-swash-phase",
          "mixerSwashPhase",
          "mixerSwashPhaseHelp",
          "swashPhase",
          { min: -180, max: 180, step: 0.1 },
          applyConfig,
        )}
        {#if hasTiltCorrection}
          {@render numberField(
            "mixer-tilt-pos",
            "mixerCollectiveTiltCorrectionPos",
            "mixerCollectiveTiltCorrectionHelp",
            "tiltPos",
            { min: -100, max: 100, step: 1 },
            applyConfig,
            "%",
          )}
          {@render numberField(
            "mixer-tilt-neg",
            "mixerCollectiveTiltCorrectionNeg",
            null,
            "tiltNeg",
            { min: -100, max: 100, step: 1 },
            applyConfig,
            "%",
          )}
        {/if}
      </Section>
    </div>
  </div>

  <MixerOverride {motorised} {hasPassthrough} />
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

  .notes {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: var(--section-gap);

    &:empty {
      display: none;
    }
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    align-items: start;
    column-gap: var(--section-gap);
  }

  @media only screen and (max-width: 480px) {
    .columns {
      grid-template-columns: 1fr;
    }
  }
</style>

<script>
  import diff from "microdiff";
  import semver from "semver";
  import { onDestroy, onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import {
    API_VERSION_12_7,
    API_VERSION_12_8,
    API_VERSION_12_9,
  } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import Governor from "./Governor.svelte";
  import {
    AXES,
    GAINS,
    PID_PROFILE_FIELDS,
    PROFILE_COUNT,
    fromDisplay,
    toDisplay,
  } from "./fields.js";
  import profileState from "./state.svelte.js";

  const PID_MODE_WARNINGS = {
    0: "profilesPIDModeZeroWarning",
    1: "profilesPIDModeOneWarning",
    2: "profilesPIDModeTwoWarning",
    4: "profilesPIDModeFourWarning",
  };

  let loading = $state(true);
  let api = $state({ v127: false, v128: false, v129: false });
  let pidMode = $state(3);
  let govEnabled = $state(false);
  let govChanged = $state(false);
  let reloadKey = $state(0);

  let form = $state({});
  let initialForm = $state(null);

  let mountedProfile;
  let statusPoller;
  let profileChangeDialogOpen = false;
  let copyDialogEl;
  let resetDialogEl;
  let profileChangeDialogEl;
  let copyDestination = $state(0);

  let dirty = $derived(
    govChanged ||
      (!!initialForm && diff(initialForm, $state.snapshot(form)).length > 0),
  );

  let pidWarning = $derived(
    pidMode > 4 ? "profilesPIDModeCustomWarning" : PID_MODE_WARNINGS[pidMode],
  );
  // Passthrough (0) and custom (>4) PID modes have no PID settings to edit.
  let showPidConfig = $derived(pidMode > 0 && pidMode <= 4);
  let showHsi = $derived(pidMode >= 3);

  let numProfiles = $derived(
    Math.min(FC.CONFIG.numProfiles || PROFILE_COUNT, PROFILE_COUNT),
  );
  let copyOptions = $derived(
    Array.from({ length: PROFILE_COUNT }, (_, i) => i)
      .filter((i) => i !== FC.CONFIG.profile)
      .map((i) => ({ value: i, label: $i18n.t(`profilesSubTab${i + 1}`) })),
  );
  let relaxTypeOptions = $derived([
    { value: 1, label: $i18n.t("profilesItermRelaxTypeOptionRP") },
    { value: 2, label: $i18n.t("profilesItermRelaxTypeOptionRPY") },
  ]);
  let flipModeOptions = $derived([
    { value: 0, label: $i18n.t("profilesRescueFlipModeDisable") },
    { value: 1, label: $i18n.t("profilesRescueFlipModeEnable") },
  ]);

  function formFromFc() {
    const p = FC.PID_PROFILE;
    const f = {};
    for (const key of Object.keys(PID_PROFILE_FIELDS)) {
      f[key] = toDisplay(key, Number(p[key] ?? 0));
    }
    f.pids = AXES.map((_, axis) =>
      GAINS.map((_, gain) => Number(FC.PIDS[axis][gain])),
    );
    f.offsetGainRoll = Number(FC.PIDS[0][5]);
    f.offsetGainPitch = Number(FC.PIDS[1][5]);

    f.errorRotation = p.error_rotation !== 0;
    f.errorDecayGround = p.error_decay_time_ground > 0;
    f.errorDecayTimeGround = p.error_decay_time_ground / 10;
    f.itermRelax = p.itermRelaxType > 0;
    f.itermRelaxType = p.itermRelaxType < 2 ? 1 : 2;
    f.pitchFFCollective = p.pitchFFCollectiveGain > 0;
    f.pitchFFCollectiveGain = p.pitchFFCollectiveGain;
    f.crossCoupling = p.cyclicCrossCouplingGain > 0;
    f.cyclicCrossCouplingGain = p.cyclicCrossCouplingGain;
    f.cyclicCrossCouplingCutoff = api.v127
      ? Number((p.cyclicCrossCouplingCutoff / 10).toFixed(1))
      : p.cyclicCrossCouplingCutoff;
    f.rescueEnable = p.rescueMode > 0;
    f.rescueAltHold = p.rescueMode > 1;
    f.govTTAGain = FC.GOVERNOR.gov_tta_gain;
    f.govTTALimit = FC.GOVERNOR.gov_tta_limit;

    form = f;
    // Altitude hold is hidden unless it is already in use.
    showAltHold = p.rescueMode > 1;
  }

  let showAltHold = $state(false);

  function formToFc() {
    const p = FC.PID_PROFILE;
    const f = form;
    for (const key of Object.keys(PID_PROFILE_FIELDS)) {
      p[key] = fromDisplay(key, f[key]);
    }
    AXES.forEach((_, axis) =>
      GAINS.forEach((_, gain) => {
        FC.PIDS[axis][gain] = Math.round(f.pids[axis][gain]);
      }),
    );
    FC.PIDS[0][5] = Math.round(f.offsetGainRoll);
    FC.PIDS[1][5] = Math.round(f.offsetGainPitch);

    p.error_rotation = f.errorRotation ? 1 : 0;
    p.error_decay_time_ground = f.errorDecayGround
      ? Math.round(f.errorDecayTimeGround * 10)
      : 0;
    p.itermRelaxType = f.itermRelax ? f.itermRelaxType : 0;
    p.pitchFFCollectiveGain = f.pitchFFCollective ? f.pitchFFCollectiveGain : 0;
    p.cyclicCrossCouplingGain = f.crossCoupling ? f.cyclicCrossCouplingGain : 0;
    p.cyclicCrossCouplingCutoff = api.v127
      ? Math.round(f.cyclicCrossCouplingCutoff * 10)
      : f.cyclicCrossCouplingCutoff;
    p.rescueMode = f.rescueEnable ? (f.rescueAltHold ? 2 : 1) : 0;

    if (govEnabled) {
      FC.GOVERNOR.gov_tta_gain = f.govTTAGain;
      FC.GOVERNOR.gov_tta_limit = f.govTTALimit;
    }
  }

  async function loadData() {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_PID_TUNING);
    await MSP.promise(MSPCodes.MSP_PID_PROFILE);
    await MSP.promise(MSPCodes.MSP_RESCUE_PROFILE);
    await MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE);
    await MSP.promise(MSPCodes.MSP_GOVERNOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_SENSOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_BATTERY_CONFIG);

    api = {
      v127: semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7),
      v128: semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8),
      v129: semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9),
    };
    pidMode = FC.PID_PROFILE.pid_mode;
    govEnabled =
      FC.FEATURE_CONFIG.features.isEnabled("GOVERNOR") &&
      FC.GOVERNOR.gov_mode > 0;

    formFromFc();
    initialForm = $state.snapshot(form);
    govChanged = false;
    reloadKey++;
  }

  onMount(async () => {
    await loadData();

    if (profileState.savedProfile === undefined) {
      profileState.savedProfile = FC.CONFIG.profile;
    }
    mountedProfile = FC.CONFIG.profile;
    loading = false;

    statusPoller = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_STATUS);
      if (FC.CONFIG.profile !== mountedProfile) {
        mountedProfile = FC.CONFIG.profile;
        if (dirty) {
          if (!profileChangeDialogOpen) {
            profileChangeDialogOpen = true;
            profileChangeDialogEl.showModal();
          }
        } else {
          GUI.log(
            $i18n.t("profilesActivateProfile", { 1: FC.CONFIG.profile + 1 }),
          );
          GUI.tab_switch_reload();
        }
      }
    }, 250);
  });

  onDestroy(() => clearInterval(statusPoller));

  function activateProfile(index) {
    FC.CONFIG.profile = index;
    MSP.promise(MSPCodes.MSP_SELECT_SETTING, [index]).then(() => {
      GUI.log($i18n.t("profilesActivateProfile", { 1: index + 1 }));
      GUI.tab_switch_reload();
    });
  }

  function onClickProfileTab(index) {
    if (index !== FC.CONFIG.profile) {
      GUI.tab_switch_allowed(() => activateProfile(index));
    }
  }

  function onConfirmProfileChange() {
    profileChangeDialogEl.close();
    profileChangeDialogOpen = false;
    GUI.log($i18n.t("profilesActivateProfile", { 1: FC.CONFIG.profile + 1 }));
    GUI.tab_switch_reload();
  }

  function onClickCopyProfile() {
    if (!dirty) {
      copyDestination = copyOptions[0]?.value ?? 0;
      copyDialogEl.showModal();
    }
  }

  async function onConfirmCopyProfile() {
    FC.COPY_PROFILE.type = 0;
    FC.COPY_PROFILE.dstProfile = copyDestination;
    FC.COPY_PROFILE.srcProfile = FC.CONFIG.profile;
    await MSP.promise(
      MSPCodes.MSP_COPY_PROFILE,
      mspHelper.crunch(MSPCodes.MSP_COPY_PROFILE),
    );
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    copyDialogEl.close();
  }

  async function onConfirmResetProfile() {
    await MSP.promise(MSPCodes.MSP_SET_RESET_CURR_PID);
    GUI.log($i18n.t("profilesResetProfile"));
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    resetDialogEl.close();
    GUI.tab_switch_reload();
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabProfiles"), "_system");
  }

  export async function onSave() {
    formToFc();
    for (const code of [
      MSPCodes.MSP_SET_PID_TUNING,
      MSPCodes.MSP_SET_PID_PROFILE,
      MSPCodes.MSP_SET_RESCUE_PROFILE,
      MSPCodes.MSP_SET_GOVERNOR_PROFILE,
      MSPCodes.MSP_SET_GOVERNOR_CONFIG,
    ]) {
      await MSP.promise(code, mspHelper.crunch(code));
    }
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    profileState.savedProfile = FC.CONFIG.profile;
    initialForm = $state.snapshot(form);
    govChanged = false;
  }

  export async function onRevert() {
    if (FC.CONFIG.profile !== profileState.savedProfile) {
      const target = profileState.savedProfile;
      await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [target]);
      GUI.log($i18n.t("profilesActivateProfile", { 1: target + 1 }));
      GUI.tab_switch_reload();
      return;
    }
    // Reload from the FC; this also discards governor edits.
    await loadData();
  }

  export function isDirty() {
    return dirty;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabProfiles")}</h1>
  <div class="grow"></div>
  <button class="btn" disabled={dirty} onclick={onClickCopyProfile}>
    {$i18n.t("profilesCopyProfile")}
  </button>
  <button class="btn" onclick={() => resetDialogEl.showModal()}>
    {$i18n.t("profilesResetProfile")}
  </button>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSave")}</button>
{/snippet}

{#snippet num(key, label, help, opts)}
  <Field id={`prof-${key}`} {label}>
    {#snippet tooltip()}
      {#if help}
        <Tooltip {help} />
      {/if}
    {/snippet}
    <NumberInput
      id={`prof-${key}`}
      {...opts ?? PID_PROFILE_FIELDS[key]}
      bind:value={form[key]}
    />
  </Field>
{/snippet}

{#snippet toggle(key, label, help)}
  <Field id={`prof-${key}`} {label}>
    {#snippet tooltip()}
      {#if help}
        <Tooltip {help} />
      {/if}
    {/snippet}
    <Switch id={`prof-${key}`} bind:checked={form[key]} />
  </Field>
{/snippet}

<Page {header} {loading} toolbar={dirty && toolbar}>
  <div class="profile-tabs">
    {#each Array.from({ length: numProfiles }, (_, i) => i) as index (index)}
      <button
        class={["profile-tab", index === FC.CONFIG.profile && "active"]}
        onclick={() => onClickProfileTab(index)}
      >
        {$i18n.t(`profilesSubTab${index + 1}`)}
      </button>
    {/each}
  </div>

  {#if pidWarning}
    <div class="warning">
      <WarningNote message={pidWarning} />
    </div>
  {/if}

  {#if !loading}
    {#key reloadKey}
      <div class="columns">
        <div class="column">
          {#if showPidConfig}
            <Section label="profilesPidGains">
              <div class="pid-table">
                <span></span>
                {#each GAINS as gain (gain.key)}
                  <span class="col">
                    {$i18n.t(gain.label)}
                    <HelpIcon>{$i18n.t(gain.help)}</HelpIcon>
                  </span>
                {/each}
                {#each AXES as axis, a (axis)}
                  <span class={["axis", axis.toLowerCase()]}>
                    {$i18n.t(`axis${axis}`)}
                  </span>
                  {#each GAINS as gain, g (gain.key)}
                    <NumberInput
                      min={0}
                      max={1000}
                      step={1}
                      bind:value={form.pids[a][g]}
                    />
                  {/each}
                {/each}
              </div>
            </Section>

            <Section label="profilesPidSettings">
              {#if !api.v129}
                {@render toggle(
                  "errorRotation",
                  "profilesErrorRotation",
                  "profilesErrorRotationHelp",
                )}
              {/if}
              {@render toggle(
                "errorDecayGround",
                "profilesErrorDecayGround",
                "profilesErrorDecayTimeGroundHelp",
              )}
              {#if form.errorDecayGround}
                {@render num(
                  "errorDecayTimeGround",
                  "profilesErrorDecayTime",
                  null,
                  { min: 0.1, max: 25, step: 0.1 },
                )}
              {/if}

              {@render toggle(
                "itermRelax",
                "profilesItermRelax",
                "profilesItermRelaxHelp",
              )}
              {#if form.itermRelax}
                <Field id="prof-itermRelaxType" label="profilesItermRelaxType">
                  {#snippet tooltip()}
                    <Tooltip help="profilesItermRelaxTypeHelp" />
                  {/snippet}
                  <Select
                    id="prof-itermRelaxType"
                    options={relaxTypeOptions}
                    bind:value={form.itermRelaxType}
                  />
                </Field>
                {@render num(
                  "itermRelaxCutoffRoll",
                  "profilesItermRelaxCutoffRoll",
                  "profilesItermRelaxCutoffHelp",
                )}
                {@render num(
                  "itermRelaxCutoffPitch",
                  "profilesItermRelaxCutoffPitch",
                  null,
                )}
                {#if form.itermRelaxType > 1}
                  {@render num(
                    "itermRelaxCutoffYaw",
                    "profilesItermRelaxCutoffYaw",
                    null,
                  )}
                {/if}
              {/if}

              <SubSection label="profilesErrorLimit">
                {@render num(
                  "errorLimitRoll",
                  "profilesErrorLimitRoll",
                  "profilesErrorLimitHelp",
                )}
                {@render num(
                  "errorLimitPitch",
                  "profilesErrorLimitPitch",
                  null,
                )}
                {@render num("errorLimitYaw", "profilesErrorLimitYaw", null)}
              </SubSection>

              {#if showHsi}
                <SubSection label="profilesOffset">
                  {@render num(
                    "offsetLimitRoll",
                    "profilesOffsetLimitRoll",
                    "profilesOffsetLimitHelp",
                  )}
                  {@render num(
                    "offsetLimitPitch",
                    "profilesOffsetLimitPitch",
                    null,
                  )}
                  {@render num(
                    "offsetGainRoll",
                    "profilesOffsetGainRoll",
                    "profilesOffsetGainHelp",
                    { min: 0, max: 250, step: 1 },
                  )}
                  {@render num(
                    "offsetGainPitch",
                    "profilesOffsetGainPitch",
                    null,
                    { min: 0, max: 250, step: 1 },
                  )}
                </SubSection>
              {/if}
            </Section>

            <Section label="profilesMainRotorSettings">
              {@render toggle(
                "pitchFFCollective",
                "profilesPitchFFCollective",
                "profilesPitchFFCollectiveHelp",
              )}
              {#if form.pitchFFCollective}
                {@render num(
                  "pitchFFCollectiveGain",
                  "profilesPitchFFCollectiveGain",
                  "profilesPitchFFCollectiveGainHelp",
                  { min: 0, max: 250, step: 1 },
                )}
              {/if}
              {@render toggle(
                "crossCoupling",
                "profilesCyclicCrossCoupling",
                "profilesCyclicCrossCouplingHelp",
              )}
              {#if form.crossCoupling}
                {@render num(
                  "cyclicCrossCouplingGain",
                  "profilesCyclicCrossCouplingGain",
                  "profilesCyclicCrossCouplingGainHelp",
                  { min: 0, max: 250, step: 1 },
                )}
                {@render num(
                  "cyclicCrossCouplingRatio",
                  "profilesCyclicCrossCouplingRatio",
                  "profilesCyclicCrossCouplingRatioHelp",
                )}
                {@render num(
                  "cyclicCrossCouplingCutoff",
                  "profilesCyclicCrossCouplingCutoff",
                  "profilesCyclicCrossCouplingCutoffHelp",
                  api.v127
                    ? { min: 0.1, max: 25, step: 0.1 }
                    : { min: 1, max: 250, step: 1 },
                )}
              {/if}
              {@render num(
                "error_decay_time_cyclic",
                "profilesErrorDecayTimeCyclic",
                "profilesErrorDecayTimeCyclicHelp",
              )}
              {@render num(
                "error_decay_limit_cyclic",
                "profilesErrorDecayLimitCyclic",
                "profilesErrorDecayLimitCyclicHelp",
              )}
            </Section>

            <Section label="profilesTailRotorSettings">
              {@render num(
                "yawStopGainCW",
                "profilesYawStopGainCW",
                "profilesYawStopGainCWHelp",
              )}
              {@render num(
                "yawStopGainCCW",
                "profilesYawStopGainCCW",
                "profilesYawStopGainCCWHelp",
              )}
              {@render num(
                "yawPrecompCutoff",
                "profilesYawPrecompCutoff",
                "profilesYawPrecompCutoffHelp",
              )}
              {@render num(
                "yawFFCyclicGain",
                "profilesYawFFCyclicGain",
                "profilesYawFFCyclicGainHelp",
              )}
              {@render num(
                "yawFFCollectiveGain",
                "profilesYawFFCollectiveGain",
                "profilesYawFFCollectiveGainHelp",
              )}
              {#if api.v128}
                {@render num(
                  "yaw_inertia_precomp_gain",
                  "profilesYawInertiaPrecompGain",
                  "profilesYawInertiaPrecompGainHelp",
                )}
                {@render num(
                  "yaw_inertia_precomp_cutoff",
                  "profilesYawInertiaPrecompCutoff",
                  "profilesYawInertiaPrecompCutoffHelp",
                )}
              {:else}
                {@render num(
                  "yawFFImpulseGain",
                  "profilesYawFFImpulseGain",
                  "profilesYawFFImpulseGainHelp",
                )}
                {@render num(
                  "yawFFImpulseDecay",
                  "profilesyawFFImpulseDecay",
                  "profilesyawFFImpulseDecayHelp",
                )}
              {/if}
              {#if govEnabled}
                {@render num("govTTAGain", "govTTAGain", "govTTAGainHelp", {
                  min: 0,
                  max: 250,
                  step: 1,
                })}
                {@render num("govTTALimit", "govTTALimit", "govTTALimitHelp", {
                  min: 0,
                  max: 250,
                  step: 1,
                })}
              {/if}
            </Section>
          {/if}
        </div>

        <div class="column">
          {#if showPidConfig}
            <Section label="profilesPidBandwidth">
              <SubSection label="profilesGyroCutoff">
                {@render num(
                  "gyroCutoffRoll",
                  "profilesGyroCutoffRoll",
                  "profilesGyroCutoffHelp",
                )}
                {@render num(
                  "gyroCutoffPitch",
                  "profilesGyroCutoffPitch",
                  null,
                )}
                {@render num("gyroCutoffYaw", "profilesGyroCutoffYaw", null)}
              </SubSection>
              <SubSection label="profilesDtermCutoff">
                {@render num(
                  "dtermCutoffRoll",
                  "profilesDtermCutoffRoll",
                  "profilesDtermCutoffHelp",
                )}
                {@render num(
                  "dtermCutoffPitch",
                  "profilesDtermCutoffPitch",
                  null,
                )}
                {@render num("dtermCutoffYaw", "profilesDtermCutoffYaw", null)}
              </SubSection>
              <SubSection label="profilesBtermCutoff">
                {@render num(
                  "btermCutoffRoll",
                  "profilesBtermCutoffRoll",
                  "profilesBtermCutoffHelp",
                )}
                {@render num(
                  "btermCutoffPitch",
                  "profilesBtermCutoffPitch",
                  null,
                )}
                {@render num("btermCutoffYaw", "profilesBtermCutoffYaw", null)}
              </SubSection>
            </Section>
          {/if}

          <Section label="profilesLevelingSettings">
            {@render num(
              "acroTrainerGain",
              "profilesAcroTrainerGain",
              "profilesAcroTrainerGainHelp",
            )}
            {@render num(
              "acroTrainerLimit",
              "profilesAcroTrainerLimit",
              "profilesAcroTrainerLimitHelp",
            )}
            {@render num(
              "levelAngleStrength",
              "profilesAngleModeGain",
              "profilesAngleModeGainHelp",
            )}
            {@render num(
              "levelAngleLimit",
              "profilesAngleModeLimit",
              "profilesAngleModeLimitHelp",
            )}
            {@render num(
              "horizonLevelStrength",
              "profilesHorizonModeGain",
              "profilesHorizonModeGainHelp",
            )}
          </Section>

          <Section label="profilesRescueSettings">
            {@render toggle("rescueEnable", "profilesRescueEnable", null)}
            {#if form.rescueEnable}
              <Field id="prof-rescueFlipMode" label="profilesRescueFlipMode">
                {#snippet tooltip()}
                  <Tooltip help="profilesRescueFlipModeHelp" />
                {/snippet}
                <Select
                  id="prof-rescueFlipMode"
                  options={flipModeOptions}
                  bind:value={form.rescueFlipMode}
                />
              </Field>
              {@render num(
                "rescuePullupCollective",
                "profilesRescuePullupCollective",
                "profilesRescuePullupCollectiveHelp",
              )}
              {@render num(
                "rescuePullupTime",
                "profilesRescuePullupTime",
                "profilesRescuePullupTimeHelp",
              )}
              {@render num(
                "rescueClimbCollective",
                "profilesRescueClimbCollective",
                "profilesRescueClimbCollectiveHelp",
              )}
              {@render num(
                "rescueClimbTime",
                "profilesRescueClimbTime",
                "profilesRescueClimbTimeHelp",
              )}
              {@render num(
                "rescueHoverCollective",
                "profilesRescueHoverCollective",
                "profilesRescueHoverCollectiveHelp",
              )}
              {@render num(
                "rescueFlipTime",
                "profilesRescueFlipTime",
                "profilesRescueFlipTimeHelp",
              )}
              {@render num(
                "rescueExitTime",
                "profilesRescueExitTime",
                "profilesRescueExitTimeHelp",
              )}
              {@render num(
                "rescueLevelGain",
                "profilesRescueLevelGain",
                "profilesRescueLevelGainHelp",
              )}
              {@render num(
                "rescueFlipGain",
                "profilesRescueFlipGain",
                "profilesRescueFlipGainHelp",
              )}
              {@render num(
                "rescueMaxRate",
                "profilesRescueMaxRate",
                "profilesRescueMaxRateHelp",
              )}
              {@render num(
                "rescueMaxAccel",
                "profilesRescueMaxAccel",
                "profilesRescueMaxAccelHelp",
              )}

              {#if showAltHold}
                {@render toggle("rescueAltHold", "profilesRescueAltHold", null)}
                {#if form.rescueAltHold}
                  {@render num(
                    "rescueHoverAltitude",
                    "profilesRescueHoverAltitude",
                    "profilesRescueHoverAltitudeHelp",
                  )}
                  {@render num(
                    "rescueAltitudePGain",
                    "profilesRescueAltitudePGain",
                    "profilesRescueAltitudePGainHelp",
                  )}
                  {@render num(
                    "rescueAltitudeIGain",
                    "profilesRescueAltitudeIGain",
                    "profilesRescueAltitudeIGainHelp",
                  )}
                  {@render num(
                    "rescueAltitudeDGain",
                    "profilesRescueAltitudeDGain",
                    "profilesRescueAltitudeDGainHelp",
                  )}
                  {@render num(
                    "rescueMaxCollective",
                    "profilesRescueMaxCollective",
                    "profilesRescueMaxCollectiveHelp",
                  )}
                {/if}
              {/if}
            {/if}
          </Section>

          {#if govEnabled}
            <Governor onchange={() => (govChanged = true)} />
          {/if}
        </div>
      </div>
    {/key}
  {/if}
</Page>

<dialog bind:this={copyDialogEl}>
  <h3>{$i18n.t("dialogCopyProfileTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("dialogCopyProfileNote")}</p>
    <div class="field-row">
      <span>{$i18n.t("dialogCopyProfileText")}</span>
      <Select bind:value={copyDestination} options={copyOptions} />
    </div>
  </div>
  <div class="buttons">
    <button class="btn" onclick={onConfirmCopyProfile}>
      {$i18n.t("dialogCopyProfileConfirm")}
    </button>
    <button class="btn" onclick={() => copyDialogEl.close()}>
      {$i18n.t("dialogCopyProfileClose")}
    </button>
  </div>
</dialog>

<dialog bind:this={resetDialogEl}>
  <h3>{$i18n.t("dialogResetProfileTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("dialogResetProfileNote")}</p>
  </div>
  <div class="buttons">
    <button class="btn" onclick={onConfirmResetProfile}>
      {$i18n.t("dialogResetProfileConfirm")}
    </button>
    <button class="btn" onclick={() => resetDialogEl.close()}>
      {$i18n.t("dialogResetProfileClose")}
    </button>
  </div>
</dialog>

<dialog
  bind:this={profileChangeDialogEl}
  onclose={() => (profileChangeDialogOpen = false)}
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <h3>{@html $i18n.t("dialogProfileChangeTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("dialogProfileChangeNote")}</p>
  </div>
  <div class="buttons">
    <button class="btn" onclick={onConfirmProfileChange}>
      {$i18n.t("dialogProfileChangeConfirm")}
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

  .profile-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin-top: var(--section-gap);
  }

  .profile-tab {
    @extend %button;
    padding: 0 14px;

    &.active {
      color: var(--color-accent-fg);
      background-color: var(--color-accent-500);
    }
  }

  .warning {
    margin-top: var(--section-gap);
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    align-items: start;
    column-gap: var(--section-gap);
  }

  .pid-table {
    display: grid;
    grid-template-columns: minmax(70px, 1fr) repeat(5, minmax(84px, 104px));
    align-items: center;
    gap: 6px 6px;
    padding: 4px 8px 8px;
  }

  .col {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-soft);
  }

  .axis {
    font-weight: 600;

    &.roll {
      color: var(--color-roll);
    }

    &.pitch {
      color: var(--color-pitch);
    }

    &.yaw {
      color: var(--color-yaw);
    }
  }

  dialog {
    width: 32em;
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

  .field-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }

  @media only screen and (max-width: 480px) {
    .columns {
      grid-template-columns: 1fr;
    }
  }
</style>

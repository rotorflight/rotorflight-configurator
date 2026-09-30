<script>
  import diff from "microdiff";
  import semver from "semver";
  import { onDestroy, onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";

  import { RateCurve } from "@/js/RateCurve.js";
  import {
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

  import Dynamics from "./Dynamics.svelte";
  import RateCurveChart from "./RateCurveChart.svelte";
  import RatePreview from "./RatePreview.svelte";
  import {
    CYCLIC_RING_DEFAULT,
    DYNAMICS_DEFAULTS,
    RATES_TYPE,
    RATES_TYPE_IMAGES,
    RATE_PROFILE_COUNT,
    RATE_PROFILE_MASK,
    convertToCollective,
    defaultRates,
    fromDisplay,
    getRatesTypes,
    toDisplay,
    typeConfig,
  } from "./rateTypes.js";
  import ratesState from "./state.svelte.js";

  const DYN_KEYS = Object.keys(DYNAMICS_DEFAULTS.DYNAMICS_4_6);
  const rateCurve = new RateCurve();

  let loading = $state(true);
  let hasBoost = $state(false);
  let hasCyclicRing = $state(false);

  // Form in display units; written to FC.RC_TUNING only on Save.
  let form = $state({ ratesType: 0, rates: {}, dyn: {}, ring: {} });
  let initialForm = $state(null);
  let pendingType = $state(0);

  let mountedRateProfile;
  let statusPoller;
  let rcPoller;
  let profileChangeDialogOpen = false;

  let typeDialogEl;
  let copyDialogEl;
  let resetDialogEl;
  let profileChangeDialogEl;
  let copyDestination = $state(0);

  let rcCommand = $state([0, 0, 0, 0]);

  let dirty = $derived(
    !!initialForm && diff(initialForm, $state.snapshot(form)).length > 0,
  );

  let cfg = $derived(typeConfig(form.ratesType));
  let polar = $derived(hasCyclicRing && form.ring.polar);
  let ringEnabled = $derived(hasCyclicRing && form.ring.enabled);

  let typeOptions = $derived(
    getRatesTypes(FC.CONFIG.apiVersion).map((label, value) => ({
      value,
      label,
    })),
  );

  let copyOptions = $derived(
    Array.from({ length: RATE_PROFILE_COUNT }, (_, i) => i)
      .filter((i) => i !== FC.CONFIG.rateProfile)
      .map((i) => ({ value: i, label: $i18n.t(`rateSetupSubTab${i + 1}`) })),
  );

  function maxVel(axis) {
    const r = form.rates;
    return rateCurve.getMaxAngularVel(
      form.ratesType,
      r[`${axis}_srate`],
      r[`${axis}_rc_rate`],
      r[`${axis}_rc_expo`],
      true,
      0,
      r[`${axis}_rate_limit`],
    );
  }

  function setpoint(axis, rcCommandValue) {
    const r = form.rates;
    return rateCurve.rcCommandRawToDegreesPerSecond(
      1500 + rcCommandValue,
      form.ratesType,
      r[`${axis}_srate`],
      r[`${axis}_rc_rate`],
      r[`${axis}_rc_expo`],
      true,
      0,
      r[`${axis}_rate_limit`],
    );
  }

  let max = $derived.by(() => {
    if (loading) {
      return { angularVel: 0 };
    }
    const roll = maxVel("roll");
    const pitch = maxVel("pitch");
    const yaw = maxVel("yaw");
    const collective = maxVel("collective");
    const ringFactor = form.ring.level / 100;

    let polarCyclic = setpoint("pitch", 500 * Math.sqrt(2));
    if (ringEnabled) {
      polarCyclic = Math.min(pitch * ringFactor, polarCyclic);
    }

    const peak = Math.max(yaw, polar ? polarCyclic : Math.max(roll, pitch));
    // multiple of 200 deg/s, so the scale does not jump for small changes
    const angularVel = rateCurve.setMaxAngularVel(peak);

    return {
      roll,
      pitch,
      yaw,
      collective,
      polarCyclic,
      angularVel,
      setpointRoll: ringEnabled ? roll * ringFactor : 2000,
      setpointPitch: ringEnabled ? pitch * ringFactor : 2000,
    };
  });

  let live = $derived.by(() => {
    void rcCommand;
    if (loading) {
      return {
        roll: 0,
        pitch: 0,
        yaw: 0,
        collective: 0,
        polarCyclic: 0,
        polarCommand: 0,
      };
    }
    const rc = FC.RC_COMMAND;
    const yaw = setpoint("yaw", rc[2]);
    const collective = setpoint("collective", rc[3]);

    if (polar) {
      const r = rc[0] / 500;
      const p = rc[1] / 500;
      const polarCommand = Math.sqrt(r ** 2 + p ** 2);
      const polarCyclic = Math.min(
        setpoint("pitch", polarCommand * 500),
        max.setpointPitch,
      );
      const mult = polarCommand > 1e-6 ? polarCyclic / polarCommand : 0;
      return {
        roll: r * mult,
        pitch: p * mult,
        yaw,
        collective,
        polarCyclic,
        polarCommand,
      };
    }

    let roll = setpoint("roll", rc[0]);
    let pitch = setpoint("pitch", rc[1]);
    // cyclic ring
    const c = Math.sqrt(
      (roll / max.setpointRoll) ** 2 + (pitch / max.setpointPitch) ** 2,
    );
    if (c > 1) {
      roll /= c;
      pitch /= c;
    }
    return { roll, pitch, yaw, collective, polarCyclic: 0, polarCommand: 0 };
  });

  let preview = $derived({ roll: live.roll, pitch: live.pitch, yaw: live.yaw });

  function dynFromFc() {
    const dyn = {};
    for (const key of DYN_KEYS) {
      dyn[key] = FC.RC_TUNING[key];
    }
    dyn.yaw_dynamic_deadband_filter =
      FC.RC_TUNING.yaw_dynamic_deadband_filter / 10;
    return dyn;
  }

  function formFromFc() {
    const type = FC.RC_TUNING.rates_type;
    form = {
      ratesType: type,
      rates: toDisplay(type, FC.RC_TUNING),
      dyn: dynFromFc(),
      ring: {
        enabled: FC.RC_TUNING.cyclic_ring > 0,
        level:
          FC.RC_TUNING.cyclic_ring > 0
            ? FC.RC_TUNING.cyclic_ring
            : CYCLIC_RING_DEFAULT,
        polar: !!FC.RC_TUNING.cyclic_polar,
      },
    };
    pendingType = type;
  }

  // Defaults for the current type, as the legacy tab did on a type change
  // or a profile reset.
  function applyDefaults() {
    Object.assign(form.rates, defaultRates(form.ratesType));
    const dyn = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)
      ? DYNAMICS_DEFAULTS.DYNAMICS_4_6
      : DYNAMICS_DEFAULTS.DYNAMICS_4_5;
    form.dyn = {
      ...dyn,
      yaw_dynamic_deadband_filter: dyn.yaw_dynamic_deadband_filter / 10,
    };
    form.ring = { enabled: true, level: CYCLIC_RING_DEFAULT, polar: false };
  }

  function onTypeSelect() {
    if (pendingType !== form.ratesType) {
      typeDialogEl.showModal();
    }
  }

  function onConfirmType() {
    form.ratesType = pendingType;
    applyDefaults();
    typeDialogEl.close();
  }

  function onCancelType() {
    pendingType = form.ratesType;
    typeDialogEl.close();
  }

  function onRingToggle() {
    if (form.ring.enabled && !form.ring.level) {
      form.ring.level = CYCLIC_RING_DEFAULT;
    }
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_RC_TUNING);
    await MSP.promise(MSPCodes.MSP_RC_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);

    hasBoost = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8);
    hasCyclicRing = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9);

    if (ratesState.savedRateProfile === undefined) {
      ratesState.savedRateProfile = FC.CONFIG.rateProfile;
    }
    mountedRateProfile = FC.CONFIG.rateProfile;

    formFromFc();
    initialForm = $state.snapshot(form);
    loading = false;

    statusPoller = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_STATUS);
      if (FC.CONFIG.rateProfile !== mountedRateProfile) {
        mountedRateProfile = FC.CONFIG.rateProfile;
        if (dirty) {
          if (!profileChangeDialogOpen) {
            profileChangeDialogOpen = true;
            profileChangeDialogEl.showModal();
          }
        } else {
          GUI.log(
            $i18n.t("rateSetupActivateProfile", {
              1: FC.CONFIG.rateProfile + 1,
            }),
          );
          GUI.tab_switch_reload();
        }
      }
    }, 250);

    rcPoller = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RC_COMMAND);
      rcCommand = [...FC.RC_COMMAND];
    }, 100);
  });

  onDestroy(() => {
    clearInterval(statusPoller);
    clearInterval(rcPoller);
  });

  function activateRateProfile(index) {
    FC.CONFIG.rateProfile = index;
    MSP.promise(MSPCodes.MSP_SELECT_SETTING, [index + RATE_PROFILE_MASK]).then(
      () => {
        GUI.log($i18n.t("rateSetupActivateProfile", { 1: index + 1 }));
        GUI.tab_switch_reload();
      },
    );
  }

  function onClickProfileTab(index) {
    if (index !== FC.CONFIG.rateProfile) {
      GUI.tab_switch_allowed(() => activateRateProfile(index));
    }
  }

  function onConfirmProfileChange() {
    profileChangeDialogEl.close();
    profileChangeDialogOpen = false;
    GUI.log(
      $i18n.t("rateSetupActivateProfile", { 1: FC.CONFIG.rateProfile + 1 }),
    );
    GUI.tab_switch_reload();
  }

  function onClickCopyProfile() {
    if (!dirty) {
      copyDestination = copyOptions[0]?.value ?? 0;
      copyDialogEl.showModal();
    }
  }

  async function onConfirmCopyProfile() {
    FC.COPY_PROFILE.type = 1;
    FC.COPY_PROFILE.dstProfile = copyDestination;
    FC.COPY_PROFILE.srcProfile = FC.CONFIG.rateProfile;
    await MSP.promise(
      MSPCodes.MSP_COPY_PROFILE,
      mspHelper.crunch(MSPCodes.MSP_COPY_PROFILE),
    );
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    copyDialogEl.close();
  }

  function onConfirmResetProfile() {
    applyDefaults();
    resetDialogEl.close();
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabRates"), "_system");
  }

  function formToFc() {
    const t = FC.RC_TUNING;
    t.rates_type = form.ratesType;
    fromDisplay(form.ratesType, form.rates, t);
    for (const key of DYN_KEYS) {
      t[key] = Math.round(form.dyn[key]);
    }
    t.yaw_dynamic_deadband_filter = Math.round(
      form.dyn.yaw_dynamic_deadband_filter * 10,
    );
    t.cyclic_ring = form.ring.enabled ? Math.round(form.ring.level) : 0;
    t.cyclic_polar = form.ring.polar ? 1 : 0;
  }

  export async function onSave() {
    formToFc();
    await MSP.promise(
      MSPCodes.MSP_SET_RC_TUNING,
      mspHelper.crunch(MSPCodes.MSP_SET_RC_TUNING),
    );
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    ratesState.savedRateProfile = FC.CONFIG.rateProfile;
    initialForm = $state.snapshot(form);
  }

  export async function onRevert() {
    if (FC.CONFIG.rateProfile !== ratesState.savedRateProfile) {
      const target = ratesState.savedRateProfile;
      await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [
        target + RATE_PROFILE_MASK,
      ]);
      GUI.log($i18n.t("rateSetupActivateProfile", { 1: target + 1 }));
      GUI.tab_switch_reload();
      return;
    }
    formFromFc();
  }

  export function isDirty() {
    return dirty;
  }

  const ROWS = [
    { axis: "roll", label: "axisROLL" },
    { axis: "pitch", label: "axisPITCH" },
    { axis: "yaw", label: "axisYAW" },
    { axis: "collective", label: "axisCOLLECTIVE" },
  ];
</script>

{#snippet header()}
  <h1>{$i18n.t("tabRates")}</h1>
  <div class="grow"></div>
  <button class="btn" disabled={dirty} onclick={onClickCopyProfile}>
    {$i18n.t("rateSetupCopyRateProfile")}
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

<Page {header} {loading} toolbar={dirty && toolbar}>
  <div class="profile-tabs">
    {#each Array.from({ length: RATE_PROFILE_COUNT }, (_, i) => i) as index (index)}
      <button
        class={["profile-tab", index === FC.CONFIG.rateProfile && "active"]}
        onclick={() => onClickProfileTab(index)}
      >
        {$i18n.t(`rateSetupSubTab${index + 1}`)}
      </button>
    {/each}
  </div>

  {#if !loading}
    <div class="content">
      <div>
        <Section label="rateSetupRates" summary="rateSetupTuningHelp">
          <div class="type-row">
            <Field id="rates-type" label="rateSetupRatesType">
              {#snippet tooltip()}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html $i18n.t("rateSetupRatesTypeTip")}
              {/snippet}
              <Select
                id="rates-type"
                options={typeOptions}
                bind:value={pendingType}
                onchange={onTypeSelect}
              />
            </Field>
            {#if form.ratesType !== RATES_TYPE.NONE}
              <img
                class="logo"
                src={`/images/rate_logos/${RATES_TYPE_IMAGES[form.ratesType]}`}
                alt={typeOptions[form.ratesType]?.label ?? ""}
              />
            {/if}
          </div>

          <div class="rates-table">
            <span></span>
            <span class="col">{$i18n.t(cfg.labels.rcRate)}</span>
            <span class="col">{$i18n.t(cfg.labels.rate)}</span>
            <span class="col">{$i18n.t(cfg.labels.expo)}</span>
            <span class="col">{$i18n.t("rateSetupMaxVel")}</span>

            {#each ROWS as row (row.axis)}
              {#if !(polar && row.axis === "roll")}
                {@const col = row.axis === "collective"}
                <span class={["axis", row.axis]}>
                  {$i18n.t(
                    polar && row.axis === "pitch"
                      ? "rates.config.cyclic.label"
                      : row.label,
                  )}
                </span>
                <NumberInput
                  {...col ? cfg.rcCol : cfg.rcRate}
                  bind:value={form.rates[`${row.axis}_rc_rate`]}
                />
                <NumberInput
                  {...col ? cfg.col : cfg.rate}
                  bind:value={form.rates[`${row.axis}_srate`]}
                />
                <NumberInput
                  {...cfg.expo}
                  bind:value={form.rates[`${row.axis}_rc_expo`]}
                />
                <span class="max">
                  {#if col}
                    {convertToCollective(form.ratesType, max.collective)}°
                  {:else if polar && row.axis === "pitch"}
                    {max.polarCyclic.toFixed(0)}
                  {:else}
                    {max[row.axis].toFixed(0)}
                  {/if}
                </span>
              {/if}
            {/each}
          </div>
        </Section>

        <RateCurveChart
          ratesType={form.ratesType}
          rates={form.rates}
          {polar}
          {max}
          {live}
        />
      </div>

      <div>
        {#if hasCyclicRing}
          <Section label="rates.cyclic_ring.heading">
            <Field
              id="rates-cyclic-ring"
              label="rates.cyclic_ring.enable_cyclic_ring.label"
            >
              {#snippet tooltip()}
                {$i18n.t("rates.cyclic_ring.enable_cyclic_ring.help")}
              {/snippet}
              <Switch
                id="rates-cyclic-ring"
                bind:checked={form.ring.enabled}
                onchange={onRingToggle}
              />
            </Field>
            {#if form.ring.enabled}
              <Field
                id="rates-cyclic-ring-level"
                label="rates.cyclic_ring.cyclic_ring_level.label"
              >
                {#snippet tooltip()}
                  {$i18n.t("rates.cyclic_ring.cyclic_ring_level.help")}
                {/snippet}
                <NumberInput
                  id="rates-cyclic-ring-level"
                  min={0}
                  max={250}
                  step={1}
                  bind:value={form.ring.level}
                />
              </Field>
            {/if}
            <Field
              id="rates-polar"
              label="rates.cyclic_ring.polar_coordinates.label"
            >
              {#snippet tooltip()}
                {$i18n.t("rates.cyclic_ring.polar_coordinates.help")}
              {/snippet}
              <Switch id="rates-polar" bind:checked={form.ring.polar} />
            </Field>
          </Section>
        {/if}

        <Dynamics bind:dyn={form.dyn} {hasBoost} />
        <RatePreview liveSetpoints={preview} />
      </div>
    </div>
  {/if}
</Page>

<dialog bind:this={typeDialogEl}>
  <h3>{$i18n.t("dialogRatesTypeTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("dialogRatesTypeNote")}</p>
  </div>
  <div class="buttons">
    <button class="btn" onclick={onConfirmType}>
      {$i18n.t("dialogRatesTypeConfirm")}
    </button>
    <button class="btn" onclick={onCancelType}>{$i18n.t("cancel")}</button>
  </div>
</dialog>

<dialog bind:this={copyDialogEl}>
  <h3>{$i18n.t("dialogCopyProfileTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("dialogCopyProfileNote")}</p>
    <div class="field-row">
      <span>{$i18n.t("dialogCopyRateProfileText")}</span>
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
    <p>{@html $i18n.t("dialogResetRateProfileNote")}</p>
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

  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    column-gap: var(--section-gap);
  }

  .type-row {
    display: flex;
    align-items: center;
    gap: 12px;

    :global(.container) {
      flex: 1;
    }
  }

  .logo {
    height: 28px;
    padding-right: 8px;
  }

  .rates-table {
    display: grid;
    grid-template-columns:
      minmax(80px, 1fr) repeat(3, minmax(92px, 118px))
      minmax(64px, 96px);
    align-items: center;
    gap: 6px 8px;
    padding: 8px;
    border-top: 1px solid var(--color-border-soft);
  }

  .col {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
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

    &.collective {
      color: var(--color-collective);
    }
  }

  .max {
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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
    .content {
      grid-template-columns: 1fr;
    }
  }
</style>

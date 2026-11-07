<script>
  import { getContext, onMount } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import govState, { GOV_THROTTLE_TYPE } from "@/tabs/governor/state.svelte.js";

  import RebootLater from "./RebootLater.svelte";
  import TabButton from "./TabButton.svelte";
  import { hasFastRpm } from "./governor.js";

  const wiz = getContext("setupWizard");

  // The mode and the throttle type, and the headspeed of each PID profile
  // (as in the Ethos wizard). Ramps and gains stay in the Governor and
  // Profiles tabs. The mode is set up at boot (governorInit), so it waits
  // for the gate's reboot like the other typed-in steps.

  let changed = $state(false);

  // The headspeed of each PID profile: the first three, read when the step
  // opens. On Save only the changed ones are written.
  const MAX_PROFILES = 3;
  let profileIndexes = $state([]);
  let headspeeds = $state({});
  let headspeedOrig = {};
  let headspeedChanged = false;
  let profilesLoaded = $state(false);

  onMount(async () => {
    const active = FC.CONFIG.profile;
    const count = Math.min(FC.CONFIG.numProfiles || 1, MAX_PROFILES);
    const indexes = Array.from({ length: count }, (_, i) => i);
    // Reading a profile replaces the profile fields in FC.GOVERNOR, so the
    // values as they are now are kept, and put back after the reads.
    const snapshot = { ...FC.GOVERNOR };
    for (const i of indexes) {
      await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [i]);
      await MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE);
      headspeeds[i] = FC.GOVERNOR.gov_headspeed;
    }
    await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [active]);
    Object.assign(FC.GOVERNOR, snapshot);
    headspeedOrig = { ...headspeeds };
    profileIndexes = indexes;
    profilesLoaded = true;
  });

  function changeHeadspeed() {
    headspeedChanged = true;
    wiz.markChanged();
  }

  // Each changed profile is selected, read, given its headspeed and written.
  // Then the active profile is selected again, and the governor values from
  // before the writes are put back, so the staged mode and throttle type stay.
  async function writeHeadspeeds() {
    const active = FC.CONFIG.profile;
    const snapshot = { ...FC.GOVERNOR };
    for (const i of profileIndexes) {
      if (headspeeds[i] === headspeedOrig[i]) continue;
      await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [i]);
      await MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE);
      FC.GOVERNOR.gov_headspeed = headspeeds[i];
      await MSP.promise(
        MSPCodes.MSP_SET_GOVERNOR_PROFILE,
        mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR_PROFILE),
      );
      headspeedOrig[i] = headspeeds[i];
    }
    await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [active]);
    snapshot.gov_headspeed = headspeeds[active] ?? snapshot.gov_headspeed;
    Object.assign(FC.GOVERNOR, snapshot);
    headspeedChanged = false;
  }

  wiz.setCommit(async () => {
    if (headspeedChanged) await writeHeadspeeds();
    if (!changed) return;
    for (const code of [
      MSPCodes.MSP_SET_GOVERNOR_CONFIG,
      MSPCodes.MSP_SET_FEATURE_CONFIG,
    ]) {
      await MSP.promise(code, mspHelper.crunch(code));
    }
  });

  function markChanged() {
    changed = true;
    wiz.markChanged();
    wiz.requestReboot();
  }

  // As in the Governor tab: the feature bit follows the mode.
  let mode = $derived(
    FC.FEATURE_CONFIG.features.GOVERNOR ? FC.GOVERNOR.gov_mode : 0,
  );

  // The throttle types the current mode reads. Limit only limits the
  // throttle (governorUpdate -> govUpdateLimitedThrottle), so neither type
  // applies there. Switch also needs a headspeed (flight/governor.c).
  // The throttle type exists from API 12.9 only; the section is hidden below
  // that, so nothing is restricted there.
  function typeAllowed(index) {
    if (!govState.is_12_9) return true;
    if (index === GOV_THROTTLE_TYPE.SWITCH) return govState.govHeadspeed;
    if (index === GOV_THROTTLE_TYPE.FUNCTION) {
      return govState.govMode !== "LIMIT";
    }
    return true;
  }

  function setMode(index) {
    if (mode === index) return;
    FC.GOVERNOR.gov_mode = index;
    FC.FEATURE_CONFIG.features.GOVERNOR = index > 0;
    // A type the new mode doesn't read goes back to Normal.
    if (!typeAllowed(FC.GOVERNOR.gov_throttle_type)) {
      FC.GOVERNOR.gov_throttle_type = GOV_THROTTLE_TYPE.NORMAL;
    }
    markChanged();
  }

  function setType(index) {
    if (FC.GOVERNOR.gov_throttle_type === index) return;
    FC.GOVERNOR.gov_throttle_type = index;
    markChanged();
  }

  let rpmOk = $derived(hasFastRpm());
</script>

<p>{$i18n.t("setupWizardGovIntro")}</p>

<section class="card">
  <h3><span class="num">1</span>{$i18n.t("govMode")}</h3>
  <div class="tiles" role="radiogroup">
    {#each govState.govModes as name, index (name)}
      {@const selected = mode === index}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        class={["tile", selected && "selected"]}
        onclick={() => setMode(index)}
      >
        <span class="tile-name">
          {name}
          {#if selected}
            <i class="fas fa-check-circle" aria-hidden="true"></i>
          {/if}
        </span>
        <span class="muted">{$i18n.t(`setupWizardGovMode_${name}`)}</span>
      </button>
    {/each}
  </div>
  {#if govState.govHeadspeed}
    {#if rpmOk}
      <div class="good-text">
        <i class="fas fa-check" aria-hidden="true"></i>
        {$i18n.t("setupWizardGovRpmOk")}
      </div>
    {:else}
      <div class="note">{$i18n.t("setupWizardGovRpmMissing")}</div>
    {/if}
  {/if}
</section>

{#if govState.is_12_9 && govState.enabled}
  <section class="card">
    <h3><span class="num">2</span>{$i18n.t("govThrottleType")}</h3>
    <div class="tiles" role="radiogroup">
      {#each Object.entries(GOV_THROTTLE_TYPE) as [name, index] (name)}
        {@const selected = FC.GOVERNOR.gov_throttle_type === index}
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          class={["tile", selected && "selected"]}
          disabled={!typeAllowed(index)}
          onclick={() => setType(index)}
        >
          <span class="tile-name">
            {name}
            {#if selected}
              <i class="fas fa-check-circle" aria-hidden="true"></i>
            {/if}
          </span>
          <span class="muted">{$i18n.t(`setupWizardGovType_${name}`)}</span>
        </button>
      {/each}
    </div>
  </section>
{/if}

{#if govState.govHeadspeed && profilesLoaded}
  <section class="card">
    <h3>
      <span class="num">3</span>{$i18n.t("setupWizardGovHeadspeedTitle")}
    </h3>
    <p>{$i18n.t("setupWizardGovHeadspeedText")}</p>
    {#each profileIndexes as i (i)}
      <div class="speed">
        <span>{$i18n.t("setupWizardGovProfile", { 1: i + 1 })}</span>
        <NumberInput
          min="100"
          max="50000"
          step="10"
          bind:value={headspeeds[i]}
          onchange={changeHeadspeed}
        />
        <span class="muted">rpm</span>
      </div>
    {/each}
  </section>
{/if}

{#if changed}
  <RebootLater />
{/if}

<div>
  <TabButton tab="governor">
    {$i18n.t("setupWizardOpenGovernor")}
  </TabButton>
</div>

<style lang="scss">
  .speed {
    display: grid;
    grid-template-columns: auto 8rem auto;
    justify-content: start;
    align-items: center;
    gap: 8px 12px;
  }
</style>

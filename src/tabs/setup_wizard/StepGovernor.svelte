<script>
  import { getContext } from "svelte";

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

  // Only the two choices that decide how the motor is driven. Ramps,
  // headspeed and gains stay in the Governor and Profiles tabs. The
  // governor is set up at boot (governorInit), so this waits for the
  // gate's reboot like the other typed-in steps.

  let changed = $state(false);

  wiz.setCommit(async () => {
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

  function setMode(index) {
    if (mode === index) return;
    FC.GOVERNOR.gov_mode = index;
    FC.FEATURE_CONFIG.features.GOVERNOR = index > 0;
    // SWITCH only works with a governor that holds the headspeed.
    if (
      !govState.govHeadspeed &&
      FC.GOVERNOR.gov_throttle_type === GOV_THROTTLE_TYPE.SWITCH
    ) {
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
          disabled={index === GOV_THROTTLE_TYPE.SWITCH &&
            !govState.govHeadspeed}
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

{#if changed}
  <RebootLater />
{/if}

<div>
  <TabButton tab="governor">
    {$i18n.t("setupWizardOpenGovernor")}
  </TabButton>
</div>

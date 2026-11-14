<script>
  import { getContext, onMount } from "svelte";

  import { RATES_TYPE } from "@/js/RateCurve.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { RATE_PROFILE_MASK } from "@/tabs/rates/rateTypes.js";

  import RateCurve from "./RateCurve.svelte";
  import TabButton from "./TabButton.svelte";
  import { ADJ, profileMode, rangeOf } from "./adjust.js";
  import {
    STYLES,
    applyStyle,
    curveShape,
    matchingStyle,
    wizardRatesType,
  } from "./rates.js";

  // A flying style per rate profile the profile switch picks (Profiles &
  // gain), or for the active rate profile when it picks none. Each profile
  // is read on entry and written on Save, selecting it with
  // MSP_SELECT_SETTING as the Rates tab does, then the active one again.
  const wiz = getContext("setupWizard");

  const ratesType = wizardRatesType(FC.CONFIG.apiVersion);
  const typeName =
    ratesType === RATES_TYPE.ROTORFLIGHT ? "Rotorflight" : "Actual";
  // One scale for every curve, so they compare.
  const SCALE = Math.max(...STYLES.map((s) => s.cyclic));

  // Rate profile indexes (0-based) on the switch, in switch order.
  const profiles = (() => {
    const ranges = FC.ADJUSTMENT_RANGES ?? [];
    const range = rangeOf(ranges, ADJ.RATE_PROFILE);
    if (profileMode(ranges) !== "both" || !range) {
      return [FC.CONFIG.rateProfile ?? 0];
    }
    const count = range.adjMax - range.adjMin + 1;
    return Array.from({ length: count }, (_, i) => range.adjMin - 1 + i);
  })();
  const onSwitch = profiles.length > 1;

  let loaded = $state(false);
  let tunings = $state({}); // index -> RC_TUNING as read
  let chosen = $state({}); // index -> style key, until saved

  function select(index) {
    return MSP.promise(MSPCodes.MSP_SELECT_SETTING, [
      index + RATE_PROFILE_MASK,
    ]);
  }

  async function forEachProfile(indexes, fn) {
    const active = FC.CONFIG.rateProfile ?? 0;
    for (const index of indexes) {
      await select(index);
      await MSP.promise(MSPCodes.MSP_RC_TUNING);
      await fn(index);
    }
    await select(active);
    await MSP.promise(MSPCodes.MSP_RC_TUNING);
  }

  onMount(async () => {
    await forEachProfile(profiles, (index) => {
      tunings[index] = $state.snapshot(FC.RC_TUNING);
    });
    loaded = true;
  });

  function styleOf(index) {
    return chosen[index] ?? matchingStyle(tunings[index], ratesType)?.key;
  }

  function choose(index, key) {
    chosen[index] = key;
    wiz.markChanged();
  }

  function suggest() {
    profiles.forEach((index, i) => choose(index, STYLES[i].key));
  }

  wiz.setCommit(async () => {
    const indexes = profiles.filter((i) => chosen[i]);
    if (indexes.length === 0) return;
    await forEachProfile(indexes, async (index) => {
      const style = STYLES.find((s) => s.key === chosen[index]);
      applyStyle(FC.RC_TUNING, style, ratesType);
      await MSP.promise(
        MSPCodes.MSP_SET_RC_TUNING,
        mspHelper.crunch(MSPCodes.MSP_SET_RC_TUNING),
      );
      tunings[index] = $state.snapshot(FC.RC_TUNING);
    });
    chosen = {};
  });
</script>

<p>{$i18n.t("setupWizardRatesIntro", { 1: typeName })}</p>

{#if onSwitch && profiles.length === STYLES.length}
  <div class="actions">
    <button class="btn" onclick={suggest}>
      {$i18n.t("setupWizardRatesSuggest")}
    </button>
  </div>
{/if}

{#if loaded}
  {#each profiles as index, position (index)}
    <section class="card">
      <h3>
        {#if onSwitch}
          <span class="num">{position + 1}</span>
          {$i18n.t("setupWizardRatesPosition", {
            1: position + 1,
            2: index + 1,
          })}
        {:else}
          {$i18n.t("setupWizardRatesProfile", { 1: index + 1 })}
        {/if}
      </h3>
      <div class="tiles" role="radiogroup">
        {#each STYLES as style (style.key)}
          {@const selected = styleOf(index) === style.key}
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            class={["tile", selected && "selected"]}
            onclick={() => choose(index, style.key)}
          >
            <span class="tile-name">
              {$i18n.t(`setupWizardRateStyle_${style.key}`)}
              {#if selected}
                <i class="fas fa-check-circle" aria-hidden="true"></i>
              {/if}
            </span>
            <span class="muted">
              {$i18n.t(`setupWizardRateStyleHelp_${style.key}`)}
            </span>
            <span class="curve">
              <RateCurve
                rate={style.cyclic}
                expo={style.expo.cyclic}
                shape={curveShape()}
                scale={SCALE}
                axisLabel={$i18n.t("setupWizardRatesStick")}
              />
              <span class="numbers">
                {$i18n.t("setupWizardRatesNumbers", {
                  1: style.cyclic,
                  2: style.yaw,
                  3: style.expo.cyclic,
                })}
              </span>
            </span>
          </button>
        {/each}
      </div>
      {#if !styleOf(index)}
        <p class="muted">{$i18n.t("setupWizardRatesCustom")}</p>
      {/if}
    </section>
  {/each}
{/if}

<p class="muted">{$i18n.t("setupWizardRatesMore")}</p>

<div>
  <TabButton tab="rates">{$i18n.t("setupWizardOpenRates")}</TabButton>
</div>

<style lang="scss">
  .btn {
    @extend %button;
  }

  /* Curves line up across tiles whatever the text above them. */
  .curve {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    margin-top: auto;
  }

  .numbers {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>

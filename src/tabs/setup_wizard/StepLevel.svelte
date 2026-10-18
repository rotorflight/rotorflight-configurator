<script>
  import { getContext, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import { COLLECTIVE, PITCH, ROLL } from "./heli.js";

  const wiz = getContext("setupWizard");

  // swash_trim[] is in 0.1 % of the axis, ±100 % on the Mixer tab.
  const TRIM_MAX = 1000;
  const TRIMS = [
    { index: 0, label: "mixerSwashRollTrim" },
    { index: 1, label: "mixerSwashPitchTrim" },
    { index: 2, label: "mixerSwashCollectiveTrim" },
  ];

  // Everything at 0°: the servo arms at their centres and the swash where
  // the links put it.
  onMount(() => {
    for (const input of [ROLL, PITCH, COLLECTIVE]) {
      wiz.holdMixer(input, 0);
    }
  });

  function nudge(index, delta) {
    const trim = FC.MIXER_CONFIG.swash_trim;
    trim[index] = Math.max(-TRIM_MAX, Math.min(TRIM_MAX, trim[index] + delta));
    wiz.sendMixerConfig();
  }

  function reset(index) {
    FC.MIXER_CONFIG.swash_trim[index] = 0;
    wiz.sendMixerConfig();
  }
</script>

<div class="intro">
  <p>{$i18n.t("setupWizardLevelIntro")}</p>
  <ol class="muted">
    <li>{$i18n.t("setupWizardLevelTipLinks")}</li>
    <li>{$i18n.t("setupWizardLevelTipPitch")}</li>
  </ol>
</div>

<section class="card">
  <h3>{$i18n.t("setupWizardLevelTrimTitle")}</h3>
  <p class="muted">{$i18n.t("setupWizardLevelTrimText")}</p>
  <div class="trims">
    {#each TRIMS as t (t.index)}
      {@const value = FC.MIXER_CONFIG.swash_trim[t.index]}
      <span class="trim-name">{$i18n.t(t.label)}</span>
      <span class="nudges">
        {#each [-10, -1] as delta (delta)}
          <button class="btn" onclick={() => nudge(t.index, delta)}>
            {delta / 10}
          </button>
        {/each}
        <span class="value">{(value / 10).toFixed(1)} %</span>
        {#each [1, 10] as delta (delta)}
          <button class="btn" onclick={() => nudge(t.index, delta)}>
            +{delta / 10}
          </button>
        {/each}
      </span>
      <button class="btn" disabled={value === 0} onclick={() => reset(t.index)}>
        {$i18n.t("setupWizardReset")}
      </button>
    {/each}
  </div>
</section>

<style lang="scss">
  .btn {
    @extend %button;
    min-width: 2.5rem;
  }

  ol {
    margin: 0;
    padding-left: 1.4em;
  }

  .trims {
    display: grid;
    grid-template-columns: auto auto auto;
    justify-content: start;
    align-items: center;
    gap: 10px 16px;
  }

  .trim-name {
    font-weight: 600;
  }
</style>

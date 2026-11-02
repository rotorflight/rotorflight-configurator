<script>
  import { getContext, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import PitchArt from "./PitchArt.svelte";
  import SwashArt from "./SwashArt.svelte";
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

<p>{$i18n.t("setupWizardLevelIntro")}</p>
<div class="tips">
  <div class="with-art">
    <div class="art"><SwashArt scene="level" /></div>
    <div class="text">
      <p class="muted">{$i18n.t("setupWizardLevelTipLinks")}</p>
    </div>
  </div>
  <div class="with-art">
    <div class="art"><PitchArt angle={0} label="0°" /></div>
    <div class="text">
      <p class="muted">{$i18n.t("setupWizardLevelTipPitch")}</p>
    </div>
  </div>
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

  .tips {
    display: grid;
    gap: 12px;
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

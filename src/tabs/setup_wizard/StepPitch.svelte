<script>
  import { getContext, onMount } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import PitchArt from "./PitchArt.svelte";
  import {
    COLLECTIVE,
    PITCH,
    ROLL,
    calibratedRate,
    limitDegrees,
    limitRaw,
    swashRaw,
  } from "./heli.js";

  const wiz = getContext("setupWizard");

  // As in the Mixer Setup docs: command 9° and measure what the blades do.
  const TEST_DEGREES = 9;

  // `inputs`: the mixer inputs this calibration sets (both cyclic axes share
  // one calibration). `hold`: the input held at TEST_DEGREES while
  // measuring.
  const CALIBRATIONS = [
    { key: "collective", inputs: [COLLECTIVE], hold: COLLECTIVE },
    { key: "cyclic", inputs: [ROLL, PITCH], hold: PITCH },
  ];

  let holding = $state(null);
  let measured = $state({ collective: TEST_DEGREES, cyclic: TEST_DEGREES });
  let applied = $state({});

  onMount(() => holdOnly(null));

  // One axis at TEST_DEGREES, the others at 0.
  function holdOnly(input) {
    for (const i of [ROLL, PITCH, COLLECTIVE]) {
      wiz.holdMixer(i, i === input ? swashRaw(TEST_DEGREES) : 0);
    }
    holding = input;
  }

  function toggleHold(cal) {
    holdOnly(holding === cal.hold ? null : cal.hold);
  }

  function percent(cal) {
    return Math.abs(FC.MIXER_INPUTS[cal.inputs[0]].rate) / 10;
  }

  function setRates(cal, magnitude) {
    for (const input of cal.inputs) {
      const sign = FC.MIXER_INPUTS[input].rate < 0 ? -1 : 1;
      FC.MIXER_INPUTS[input].rate = sign * magnitude;
      wiz.sendMixerInput(input);
    }
  }

  function applyMeasured(cal) {
    const rate = FC.MIXER_INPUTS[cal.inputs[0]].rate;
    setRates(
      cal,
      Math.abs(calibratedRate(rate, TEST_DEGREES, measured[cal.key])),
    );
    // The blades should now be at TEST_DEGREES: measure again to check.
    measured[cal.key] = TEST_DEGREES;
    applied[cal.key] = true;
  }

  function nudge(cal, delta) {
    const next = Math.round(percent(cal) * 10) + delta;
    setRates(cal, Math.max(200, Math.min(2000, next)));
  }

  //// Limits, in degrees of blade pitch.

  // The Mixer tab's labels carry an HTML entity for the degree sign.
  function label(key) {
    return $i18n.t(key).replaceAll("&deg;", "°");
  }

  let cyclicLimit = $state(limitDegrees(FC.MIXER_INPUTS[PITCH].max));
  let collectiveLimit = $state(limitDegrees(FC.MIXER_INPUTS[COLLECTIVE].max));
  let totalLimit = $state(limitDegrees(FC.MIXER_CONFIG.blade_pitch_limit));

  function applyCyclicLimit() {
    const raw = limitRaw(cyclicLimit);
    for (const input of [ROLL, PITCH]) {
      FC.MIXER_INPUTS[input].min = -raw;
      FC.MIXER_INPUTS[input].max = raw;
      wiz.sendMixerInput(input);
    }
  }

  function applyCollectiveLimit() {
    const raw = limitRaw(collectiveLimit);
    FC.MIXER_INPUTS[COLLECTIVE].min = -raw;
    FC.MIXER_INPUTS[COLLECTIVE].max = raw;
    wiz.sendMixerInput(COLLECTIVE);
  }

  function applyTotalLimit() {
    FC.MIXER_CONFIG.blade_pitch_limit = limitRaw(totalLimit);
    wiz.sendMixerConfig();
  }
</script>

<div class="intro">
  <p>{$i18n.t("setupWizardPitchIntro")}</p>
  <p class="muted">{$i18n.t("setupWizardPitchZeroFirst")}</p>
</div>

{#each CALIBRATIONS as cal, i (cal.key)}
  <section class={["card", applied[cal.key] && "complete"]}>
    <h3>
      <span class="num">{i + 1}</span>
      {$i18n.t(`setupWizardPitchTitle_${cal.key}`)}
      <span class="pill">{percent(cal).toFixed(1)} %</span>
    </h3>
    <div class="with-art">
      <div class="art">
        <PitchArt angle={TEST_DEGREES} label="{TEST_DEGREES}°" />
      </div>
      <div class="text">
        <p>
          {$i18n.t(`setupWizardPitchText_${cal.key}`, { 1: TEST_DEGREES })}
        </p>
      </div>
    </div>
    <div class="actions">
      <button
        class={["btn", holding === cal.hold && "primary"]}
        onclick={() => toggleHold(cal)}
      >
        {holding === cal.hold
          ? $i18n.t("setupWizardPitchHolding", { 1: TEST_DEGREES })
          : $i18n.t("setupWizardPitchHold", { 1: TEST_DEGREES })}
      </button>
    </div>
    <div class="actions">
      <label class="measure">
        <span>{$i18n.t("setupWizardPitchMeasured")}</span>
        <NumberInput
          min="1"
          max="30"
          step="0.1"
          bind:value={measured[cal.key]}
        />
        <span class="muted">°</span>
      </label>
      <button
        class="btn"
        disabled={holding !== cal.hold || measured[cal.key] === TEST_DEGREES}
        onclick={() => applyMeasured(cal)}
      >
        {$i18n.t("setupWizardPitchApply")}
      </button>
    </div>
    <div class="actions">
      <span class="muted">{$i18n.t("setupWizardPitchFine")}</span>
      <span class="nudges">
        {#each [-10, -1] as delta (delta)}
          <button class="btn" onclick={() => nudge(cal, delta)}>
            {delta / 10}
          </button>
        {/each}
        <span class="value">{percent(cal).toFixed(1)} %</span>
        {#each [1, 10] as delta (delta)}
          <button class="btn" onclick={() => nudge(cal, delta)}>
            +{delta / 10}
          </button>
        {/each}
      </span>
    </div>
  </section>
{/each}

<section class="card">
  <h3><span class="num">3</span>{$i18n.t("setupWizardPitchLimitsTitle")}</h3>
  <p>{$i18n.t("setupWizardPitchLimitsText")}</p>
  <div class="limits">
    <span>{label("mixerCyclicLimit")}</span>
    <NumberInput
      min="0"
      max="20"
      step="0.1"
      bind:value={cyclicLimit}
      onchange={applyCyclicLimit}
    />
    <span class="muted">°</span>
    <span>{label("mixerCollectiveLimit")}</span>
    <NumberInput
      min="0"
      max="20"
      step="0.1"
      bind:value={collectiveLimit}
      onchange={applyCollectiveLimit}
    />
    <span class="muted">°</span>
    <span>{label("mixerTotalPitchLimit")}</span>
    <NumberInput
      min="0"
      max="36"
      step="0.1"
      bind:value={totalLimit}
      onchange={applyTotalLimit}
    />
    <span class="muted">°</span>
  </div>
  <p class="muted">{$i18n.t("setupWizardPitchLimitsBinding")}</p>
</section>

<style lang="scss">
  .btn {
    @extend %button;
    min-width: 2.5rem;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .measure {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .limits {
    display: grid;
    grid-template-columns: auto 8rem auto;
    justify-content: start;
    align-items: center;
    gap: 8px 12px;
  }
</style>

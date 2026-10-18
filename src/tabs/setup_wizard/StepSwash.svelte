<script>
  import { getContext } from "svelte";

  import SwashServoDiagram from "@/components/SwashServoDiagram.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import { YAW } from "./heli.js";

  const wiz = getContext("setupWizard");

  // The common types first; None (no swash, mixer rules only) is left to
  // the Mixer tab.
  const SWASH_TYPES = [
    Mixer.SWASH_TYPE_120,
    Mixer.SWASH_TYPE_135,
    Mixer.SWASH_TYPE_140,
    Mixer.SWASH_TYPE_90L,
    Mixer.SWASH_TYPE_90V,
    Mixer.SWASH_TYPE_THRU,
  ];

  const ROTOR_DIRECTIONS = [
    { value: 0, label: "mixerClockwise" },
    { value: 1, label: "mixerCounterClockwise" },
  ];

  const TAIL_MODES = [
    {
      value: Mixer.TAIL_MODE_VARIABLE,
      label: "mixerTailVariablePitch",
      help: "setupWizardSwashTailHelp_variable",
    },
    {
      value: Mixer.TAIL_MODE_MOTORIZED,
      label: "mixerTailMotorized",
      help: "setupWizardSwashTailHelp_motorised",
    },
    {
      value: Mixer.TAIL_MODE_BIDIRECTIONAL,
      label: "mixerTailBidirectional",
      help: "setupWizardSwashTailHelp_bidirectional",
    },
  ];

  // Swash type and tail mode only take effect after a reboot.
  let rebootNeeded = $state(false);

  function swashLabel(type) {
    return $i18n.t(Mixer.swashTypes[type]).replaceAll("&deg;", "°");
  }

  function setSwashType(type) {
    if (FC.MIXER_CONFIG.swash_type === type) return;
    FC.MIXER_CONFIG.swash_type = type;
    rebootNeeded = true;
    wiz.sendMixerConfig();
  }

  function setRotorDirection(value) {
    if (FC.MIXER_CONFIG.main_rotor_dir === value) return;
    FC.MIXER_CONFIG.main_rotor_dir = value;
    wiz.sendMixerConfig();
  }

  // As on the Mixer tab: the yaw calibration starts again from the usual
  // value for the new kind of tail (100 % for a motor, 25 % for a servo).
  function setTailMode(value) {
    if (FC.MIXER_CONFIG.tail_rotor_mode === value) return;
    FC.MIXER_CONFIG.tail_rotor_mode = value;
    const input = FC.MIXER_INPUTS[YAW];
    const sign = input.rate < 0 ? -1 : 1;
    input.rate = sign * (value === Mixer.TAIL_MODE_VARIABLE ? 250 : 1000);
    rebootNeeded = true;
    wiz.sendMixerConfig();
    wiz.sendMixerInput(YAW);
  }
</script>

<p>{$i18n.t("setupWizardSwashIntro")}</p>

<section class="card">
  <h3><span class="num">1</span>{$i18n.t("setupWizardSwashTypeTitle")}</h3>
  <div class="type-row">
    <div class="tiles" role="radiogroup">
      {#each SWASH_TYPES as type (type)}
        {@const selected = FC.MIXER_CONFIG.swash_type === type}
        <button
          type="button"
          role="radio"
          aria-checked={selected}
          class={["tile", selected && "selected"]}
          onclick={() => setSwashType(type)}
        >
          <span class="tile-name">
            {swashLabel(type)}
            {#if selected}
              <i class="fas fa-check-circle" aria-hidden="true"></i>
            {/if}
          </span>
          <span class="muted"
            >{$i18n.t(`setupWizardSwashTypeHelp_${type}`)}</span
          >
        </button>
      {/each}
    </div>
    <SwashServoDiagram
      swashType={FC.MIXER_CONFIG.swash_type}
      tailServo={FC.MIXER_CONFIG.tail_rotor_mode === Mixer.TAIL_MODE_VARIABLE}
    />
  </div>
  <p class="muted">{$i18n.t("setupWizardSwashTypeNote")}</p>
</section>

<section class="card">
  <h3><span class="num">2</span>{$i18n.t("setupWizardSwashRotorTitle")}</h3>
  <p>{$i18n.t("setupWizardSwashRotorText")}</p>
  <div class="tiles" role="radiogroup">
    {#each ROTOR_DIRECTIONS as dir (dir.value)}
      {@const selected = FC.MIXER_CONFIG.main_rotor_dir === dir.value}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        class={["tile", selected && "selected"]}
        onclick={() => setRotorDirection(dir.value)}
      >
        <span class="tile-name">
          <i
            class={["fas", dir.value === 0 ? "fa-redo" : "fa-undo"]}
            aria-hidden="true"
          ></i>
          {$i18n.t(dir.label)}
        </span>
      </button>
    {/each}
  </div>
</section>

<section class="card">
  <h3><span class="num">3</span>{$i18n.t("setupWizardSwashTailTitle")}</h3>
  <div class="tiles" role="radiogroup">
    {#each TAIL_MODES as mode (mode.value)}
      {@const selected = FC.MIXER_CONFIG.tail_rotor_mode === mode.value}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        class={["tile", selected && "selected"]}
        onclick={() => setTailMode(mode.value)}
      >
        <span class="tile-name">
          {$i18n.t(mode.label)}
          {#if selected}
            <i class="fas fa-check-circle" aria-hidden="true"></i>
          {/if}
        </span>
        <span class="muted">{$i18n.t(mode.help)}</span>
      </button>
    {/each}
  </div>
</section>

{#if rebootNeeded}
  <div class="callout">
    <i class="fas fa-sync-alt" aria-hidden="true"></i>
    <span>{$i18n.t("setupWizardRebootNeeded")}</span>
    <button class="btn primary" onclick={wiz.saveAndReboot}>
      {$i18n.t("buttonSaveReboot")}
    </button>
  </div>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .type-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 16px;

    .tiles {
      flex: 1 1 360px;
    }
  }
</style>

<script>
  import { getContext, onMount } from "svelte";

  import SwashServoDiagram from "@/components/SwashServoDiagram.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import {
    TAIL_OUTPUT,
    TAIL_RESULT,
    TTA_GAIN_MOTOR,
    TTA_GAIN_OFF,
    readTailOutput,
    setTtaGainAllProfiles,
    switchTailOutput,
    tailOutputMatches,
  } from "@/js/tail_motor.js";

  import RebootLater from "./RebootLater.svelte";
  import RotorDirArt from "./RotorDirArt.svelte";
  import TailArt from "./TailArt.svelte";
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
    { value: 0, label: "mixerClockwise", art: "cw" },
    { value: 1, label: "mixerCounterClockwise", art: "ccw" },
  ];

  const TAIL_MODES = [
    {
      value: Mixer.TAIL_MODE_VARIABLE,
      label: "mixerTailVariablePitch",
      art: "servo",
      help: "setupWizardSwashTailHelp_variable",
    },
    {
      value: Mixer.TAIL_MODE_MOTORIZED,
      label: "mixerTailMotorized",
      art: "motor",
      help: "setupWizardSwashTailHelp_motorised",
    },
    {
      value: Mixer.TAIL_MODE_BIDIRECTIONAL,
      label: "mixerTailBidirectional",
      art: "bidirectional",
      help: "setupWizardSwashTailHelp_bidirectional",
    },
  ];

  // Swash type and tail mode only take effect after a reboot.
  let rebootNeeded = $state(false);

  function needReboot() {
    rebootNeeded = true;
    wiz.requestReboot();
  }

  //// The tail pin and TTA follow the tail mode, as on the Mixer tab: the
  //// step's save moves the pin (SERVO 4 or MOTOR 2) and, when the kind of
  //// tail changed, sets TTA on every profile.

  const startMotorised = wiz.motorised;
  // TAIL_OUTPUT, or null on firmware without MSP2_TAIL_MOTOR_OUTPUT.
  let tailOutput = $state(null);
  let tailError = $state(null);

  let tailPinNote = $derived.by(() => {
    if (tailOutput === null || tailOutputMatches(tailOutput, wiz.motorised)) {
      return null;
    }
    if (tailOutput === TAIL_OUTPUT.NONE) return "tailOutputNoPin";
    return wiz.motorised ? "tailOutputToMotor" : "tailOutputToServo";
  });

  function tailPinMovable() {
    return (
      tailOutput !== null &&
      tailOutput !== TAIL_OUTPUT.NONE &&
      !tailOutputMatches(tailOutput, wiz.motorised)
    );
  }

  onMount(async () => {
    tailOutput = (await readTailOutput())?.output ?? null;
    // A pin that doesn't suit the tail already set: Next saves to fix it.
    if (tailPinMovable()) {
      wiz.markChanged();
      needReboot();
    }
  });

  wiz.setCommit(async () => {
    if (tailPinMovable()) {
      const reply = await switchTailOutput(wiz.motorised);
      if (reply?.result === TAIL_RESULT.OK) {
        tailOutput = reply.output;
        tailError = null;
      } else if (reply) {
        tailError = $i18n.t("tailOutputFailed", {
          1: $i18n.t(`tailOutputResult_${reply.result}`),
        });
        GUI.log(tailError);
      }
    }
    if (wiz.motorised !== startMotorised) {
      await setTtaGainAllProfiles(
        wiz.motorised ? TTA_GAIN_MOTOR : TTA_GAIN_OFF,
      );
    }
    // Stay on the step so the refusal is seen; Next again moves on.
    return !tailError;
  });

  function swashLabel(type) {
    return $i18n.t(Mixer.swashTypes[type]).replaceAll("&deg;", "°");
  }

  function setSwashType(type) {
    if (FC.MIXER_CONFIG.swash_type === type) return;
    FC.MIXER_CONFIG.swash_type = type;
    needReboot();
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
    needReboot();
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
        <RotorDirArt dir={dir.art} />
        <span class="tile-name">
          {$i18n.t(dir.label)}
          {#if selected}
            <i class="fas fa-check-circle" aria-hidden="true"></i>
          {/if}
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
        <TailArt kind={mode.art} />
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
  {#if tailError}
    <div class="note">{tailError}</div>
  {:else if tailPinNote === "tailOutputNoPin"}
    <div class="note">{$i18n.t(tailPinNote)}</div>
  {:else if tailPinNote}
    <p class="muted">{$i18n.t(tailPinNote)}</p>
  {/if}
  {#if wiz.motorised !== startMotorised}
    <p class="muted">
      {$i18n.t(wiz.motorised ? "tailTtaOn" : "tailTtaOff")}
    </p>
  {/if}
</section>

{#if rebootNeeded}
  <RebootLater />
{/if}

<style lang="scss">
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

<script>
  import { getContext, onDestroy, onMount } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import LiveBar from "./LiveBar.svelte";
  import TailArt from "./TailArt.svelte";
  import { YAW, limitDegrees, limitRaw, tailRaw } from "./heli.js";

  const wiz = getContext("setupWizard");

  // Variable pitch tail, as in the Mixer Setup docs: centre at 0°,
  // calibrate at 22°, find the end stops at 60°.
  const CAL_DEGREES = 22;
  const LIMIT_DEGREES = 60;
  const POLL_MS = 100;

  // What the yaw input is doing: "zero", "passthrough", or a held angle.
  let hold = $state("zero");
  let pollTimer;
  let stopped = false;

  onMount(() => {
    if (wiz.motorised) return;
    setHold("zero");

    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_RC_COMMAND);
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    }
    poll();
  });

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
  });

  function setHold(next) {
    hold = next;
    if (next === "passthrough") {
      wiz.passthroughMixer(YAW);
    } else {
      wiz.holdMixer(YAW, next === "zero" ? 0 : tailRaw(next, false));
    }
  }

  function toggleHold(next) {
    setHold(hold === next ? "zero" : next);
  }

  //// Centre trim: tail_center_trim, 24° per 1000 on a servo tail.

  let trimDegrees = $derived(
    Math.round((FC.MIXER_CONFIG.tail_center_trim * 24) / 100) / 10,
  );

  function nudgeTrim(delta) {
    const next = Math.max(-25, Math.min(25, trimDegrees + delta));
    FC.MIXER_CONFIG.tail_center_trim = Math.round((next * 1000) / 24);
    wiz.sendMixerConfig();
  }

  //// Direction and calibration: the yaw input's rate.

  let reversed = $derived(FC.MIXER_INPUTS[YAW].rate < 0);
  let directionOk = $state(false);
  let calPercent = $derived(Math.abs(FC.MIXER_INPUTS[YAW].rate) / 10);

  function reverse() {
    FC.MIXER_INPUTS[YAW].rate = -FC.MIXER_INPUTS[YAW].rate;
    wiz.sendMixerInput(YAW);
    directionOk = false;
  }

  function nudgeCal(delta) {
    const input = FC.MIXER_INPUTS[YAW];
    const sign = input.rate < 0 ? -1 : 1;
    const next = Math.max(100, Math.min(5000, Math.abs(input.rate) + delta));
    input.rate = sign * next;
    wiz.sendMixerInput(YAW);
  }

  //// CW / CCW limits: the yaw input's min/max.

  let cwLimit = $state(limitDegrees(-FC.MIXER_INPUTS[YAW].min, true));
  let ccwLimit = $state(limitDegrees(FC.MIXER_INPUTS[YAW].max, true));

  function applyLimits() {
    FC.MIXER_INPUTS[YAW].min = -limitRaw(cwLimit, true);
    FC.MIXER_INPUTS[YAW].max = limitRaw(ccwLimit, true);
    wiz.sendMixerInput(YAW);
  }
</script>

{#if wiz.motorised}
  <div class="with-art">
    <div class="art">
      <TailArt
        kind={FC.MIXER_CONFIG.tail_rotor_mode === Mixer.TAIL_MODE_BIDIRECTIONAL
          ? "bidirectional"
          : "motor"}
      />
    </div>
    <div class="text"><p>{$i18n.t("setupWizardTailMotorIntro")}</p></div>
  </div>
  <section class="card">
    <h3>{$i18n.t("mixerTailMotorIdle")}</h3>
    <p class="muted">{$i18n.t("mixerTailMotorIdleHelp")}</p>
    <span class="pill">
      {(FC.MIXER_CONFIG.tail_motor_idle / 10).toFixed(1)} %
    </span>
  </section>
  <div>
    <button class="btn" onclick={() => wiz.openTab("mixer")}>
      {$i18n.t("setupWizardOpenMixer")}
    </button>
  </div>
{:else}
  <div class="with-art">
    <div class="art"><TailArt kind="servo" /></div>
    <div class="text"><p>{$i18n.t("setupWizardTailIntro")}</p></div>
  </div>

  <section class="card">
    <h3><span class="num">1</span>{$i18n.t("setupWizardTailCentreTitle")}</h3>
    <p>{$i18n.t("setupWizardTailCentreText")}</p>
    <div class="actions">
      <button
        class={["btn", hold === "zero" && "primary"]}
        onclick={() => setHold("zero")}
      >
        {$i18n.t("setupWizardTailHoldZero")}
      </button>
      <span class="muted">{$i18n.t("mixerTailRotorCenterTrim")}</span>
      <span class="nudges">
        {#each [-1, -0.1] as delta (delta)}
          <button class="btn" onclick={() => nudgeTrim(delta)}>{delta}</button>
        {/each}
        <span class="value">{trimDegrees.toFixed(1)}°</span>
        {#each [0.1, 1] as delta (delta)}
          <button class="btn" onclick={() => nudgeTrim(delta)}>+{delta}</button>
        {/each}
      </span>
    </div>
  </section>

  <section class={["card", directionOk && "complete"]}>
    <h3>
      <span class="num">2</span>{$i18n.t("setupWizardTailDirectionTitle")}
      {#if reversed}
        <span class="badge warn">{$i18n.t("mixerDirectionReverse")}</span>
      {/if}
    </h3>
    <div class="with-art">
      <div class="art"><TailArt kind="servo" move /></div>
      <div class="text"><p>{$i18n.t("setupWizardTailDirectionText")}</p></div>
    </div>
    <div class="actions">
      <button
        class={["btn", hold === "passthrough" && "primary"]}
        onclick={() => toggleHold("passthrough")}
      >
        {$i18n.t("setupWizardTailUseStick")}
      </button>
      {#if hold === "passthrough"}
        <span class="stick">
          <LiveBar f={(FC.RC_COMMAND[2] ?? 0) / 500} />
        </span>
      {/if}
    </div>
    <div class="actions">
      <button
        class={["btn", directionOk && "primary"]}
        disabled={hold !== "passthrough"}
        onclick={() => (directionOk = true)}
      >
        <i class="fas fa-check" aria-hidden="true"></i>
        {$i18n.t("setupWizardDirectionCorrect")}
      </button>
      <button class="btn" disabled={hold !== "passthrough"} onclick={reverse}>
        <i class="fas fa-exchange-alt" aria-hidden="true"></i>
        {$i18n.t("setupWizardDirectionWrong")}
      </button>
    </div>
  </section>

  <section class="card">
    <h3>
      <span class="num">3</span>{$i18n.t("setupWizardTailCalTitle")}
      <span class="pill">{calPercent.toFixed(1)} %</span>
    </h3>
    <p>{$i18n.t("setupWizardTailCalText", { 1: CAL_DEGREES })}</p>
    <div class="actions">
      {#each [CAL_DEGREES, -CAL_DEGREES] as deg (deg)}
        <button
          class={["btn", hold === deg && "primary"]}
          onclick={() => toggleHold(deg)}
        >
          {$i18n.t(
            deg > 0 ? "setupWizardTailHoldCcw" : "setupWizardTailHoldCw",
            {
              1: CAL_DEGREES,
            },
          )}
        </button>
      {/each}
      <span class="nudges">
        {#each [-10, -1] as delta (delta)}
          <button class="btn" onclick={() => nudgeCal(delta)}
            >{delta / 10}</button
          >
        {/each}
        <span class="value">{calPercent.toFixed(1)} %</span>
        {#each [1, 10] as delta (delta)}
          <button class="btn" onclick={() => nudgeCal(delta)}
            >+{delta / 10}</button
          >
        {/each}
      </span>
    </div>
  </section>

  <section class="card">
    <h3><span class="num">4</span>{$i18n.t("setupWizardTailLimitsTitle")}</h3>
    <p>{$i18n.t("setupWizardTailLimitsText", { 1: LIMIT_DEGREES })}</p>
    <div class="actions">
      {#each [LIMIT_DEGREES, -LIMIT_DEGREES] as deg (deg)}
        <button
          class={["btn", hold === deg && "primary"]}
          onclick={() => toggleHold(deg)}
        >
          {$i18n.t(
            deg > 0 ? "setupWizardTailHoldCcw" : "setupWizardTailHoldCw",
            {
              1: LIMIT_DEGREES,
            },
          )}
        </button>
      {/each}
    </div>
    <div class="limits">
      <span>{$i18n.t("mixerTailRotorMinYaw")}</span>
      <NumberInput
        min="0"
        max="60"
        step="0.1"
        bind:value={cwLimit}
        onchange={applyLimits}
      />
      <span class="muted">°</span>
      <span>{$i18n.t("mixerTailRotorMaxYaw")}</span>
      <NumberInput
        min="0"
        max="60"
        step="0.1"
        bind:value={ccwLimit}
        onchange={applyLimits}
      />
      <span class="muted">°</span>
    </div>
  </section>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
    min-width: 2.5rem;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .stick {
    width: min(320px, 100%);
  }

  .limits {
    display: grid;
    grid-template-columns: auto 8rem auto;
    justify-content: start;
    align-items: center;
    gap: 8px 12px;
  }
</style>

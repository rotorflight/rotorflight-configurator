<script>
  import { getContext, onDestroy } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import BladesOffWarning from "./BladesOffWarning.svelte";

  // The main motor spun with the motor override, as the tail motor test
  // does: only while the button is held. The FC raises the override at
  // 25 % a second, drops it at once, lets it lapse 1 s after the last one
  // (flight/motors.c) and ignores it while armed, so it is re-sent every
  // KEEPALIVE_MS and the motor stops if the link goes. Leaving the step
  // unmounts this, which stops it too.
  const wiz = getContext("setupWizard");

  let { disabled = false } = $props();

  const MAIN_MOTOR = 0;
  const KEEPALIVE_MS = 250;
  // Some ESCs only start at 30-40 %; above MAX_PERCENT the bench test
  // isn't worth the risk.
  const MIN_PERCENT = 5;
  const MAX_PERCENT = 50;

  let percent = $state(10);

  let safe = $state(false);
  let spinning = $state(false);
  let keepalive;

  // msp.c MSP_MOTOR: zero when the motor is disabled.
  let hasMotor = $derived((FC.MOTOR_DATA[MAIN_MOTOR] ?? 0) !== 0);
  let canSpin = $derived(safe && hasMotor && !disabled && !wiz.armed);
  // msp.c MSP_MOTOR: output + 1000. Shows the override's 25 %/s ramp.
  let output = $derived(
    Math.max(0, Math.min(100, ((FC.MOTOR_DATA[MAIN_MOTOR] ?? 0) - 1000) / 10)),
  );

  function nudge(delta) {
    percent = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, percent + delta));
  }

  let rotorDir = $derived(
    $i18n
      .t(
        FC.MIXER_CONFIG.main_rotor_dir
          ? "mixerCounterClockwise"
          : "mixerClockwise",
      )
      .toLowerCase(),
  );

  function send(value) {
    FC.MOTOR_OVERRIDE[MAIN_MOTOR] = value;
    mspHelper.sendMotorOverride(MAIN_MOTOR);
  }

  function start() {
    if (!canSpin || spinning) return;
    spinning = true;
    send(percent * 10);
    keepalive = setInterval(() => send(percent * 10), KEEPALIVE_MS);
  }

  function stop() {
    if (!spinning) return;
    spinning = false;
    clearInterval(keepalive);
    send(0);
  }

  onDestroy(stop);
  $effect(() => {
    if (wiz.armed || disabled) stop();
  });
</script>

<section class="card">
  <h3>{$i18n.t("setupWizardMainMotorTitle")}</h3>
  <BladesOffWarning
    text={$i18n.t("setupWizardMainMotorWarning", { 1: MAX_PERCENT })}
  />
  <p>
    {$i18n.t("setupWizardMainMotorText", { 1: rotorDir })}
  </p>
  <label class="safe">
    <input
      type="checkbox"
      bind:checked={safe}
      disabled={spinning || disabled}
    />
    {$i18n.t("setupWizardMainMotorSafe")}
  </label>
  <div class="actions">
    <span class="muted">{$i18n.t("setupWizardMainMotorSpeed")}</span>
    <span class="nudges">
      {#each [-5, -1] as delta (delta)}
        <button
          class="btn"
          disabled={spinning || percent <= MIN_PERCENT}
          onclick={() => nudge(delta)}>{delta}</button
        >
      {/each}
      <span class="value">{percent} %</span>
      {#each [1, 5] as delta (delta)}
        <button
          class="btn"
          disabled={spinning || percent >= MAX_PERCENT}
          onclick={() => nudge(delta)}>+{delta}</button
        >
      {/each}
    </span>
  </div>
  <div class="actions">
    <button
      class={["btn", spinning && "primary"]}
      disabled={!canSpin}
      onpointerdown={start}
      onpointerup={stop}
      onpointerleave={stop}
      onpointercancel={stop}
      onkeydown={(e) => (e.key === " " || e.key === "Enter") && start()}
      onkeyup={stop}
      onblur={stop}
    >
      {spinning
        ? $i18n.t("setupWizardTailMotorSpinning")
        : $i18n.t("setupWizardTailMotorHold")}
    </button>
    {#if disabled}
      <span class="muted">{$i18n.t("setupWizardMainMotorAfterCal")}</span>
    {:else if spinning}
      <span class="pill">
        {$i18n.t("setupWizardMainMotorOutput", { 1: output.toFixed(0) })}
      </span>
    {/if}
  </div>
</section>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .safe {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
</style>

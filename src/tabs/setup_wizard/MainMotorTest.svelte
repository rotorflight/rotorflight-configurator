<script>
  import { getContext, onDestroy } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  // The main motor spun with the motor override, as the tail motor test
  // does: only while the button is held. The FC raises the override at
  // 25 % a second, drops it at once, lets it lapse 1 s after the last one
  // (flight/motors.c) and ignores it while armed, so it is re-sent every
  // KEEPALIVE_MS and the motor stops if the link goes. Leaving the step
  // unmounts this, which stops it too.
  const wiz = getContext("setupWizard");

  let { disabled = false } = $props();

  const MAIN_MOTOR = 0;
  const TEST_PERCENT = 10;
  const KEEPALIVE_MS = 250;

  let safe = $state(false);
  let spinning = $state(false);
  let keepalive;

  // msp.c MSP_MOTOR: zero when the motor is disabled.
  let hasMotor = $derived((FC.MOTOR_DATA[MAIN_MOTOR] ?? 0) !== 0);
  let canSpin = $derived(safe && hasMotor && !disabled && !wiz.armed);

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
    send(TEST_PERCENT * 10);
    keepalive = setInterval(() => send(TEST_PERCENT * 10), KEEPALIVE_MS);
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
  <p>
    {$i18n.t("setupWizardMainMotorText", { 1: TEST_PERCENT, 2: rotorDir })}
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

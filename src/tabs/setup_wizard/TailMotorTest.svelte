<script>
  import { getContext, onDestroy } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import MotorCheck from "./MotorCheck.svelte";

  // A motorised tail spun with the motor override, as Wingflight's wizard
  // spins its motor: the direction check runs only while a button is held,
  // and the idle check runs until stopped, for at most IDLE_RUN_MS. The FC
  // drops a motor override 1 s after the last one it received
  // (flight/motors.c) and ignores it while armed, so the override is re-sent
  // every KEEPALIVE_MS and the motor stops if the link goes.
  const wiz = getContext("setupWizard");

  const TAIL_MOTOR = 1; // MOTOR 2
  const TEST_PERCENT = 10;
  const KEEPALIVE_MS = 250;
  const IDLE_RUN_MS = 15000;
  const IDLE_MAX = 30;

  let safe = $state(false);
  // null, "forward", "reverse" or "idle"
  let spinning = $state(null);
  let keepalive;
  let idleTimer;

  // tail_motor_idle is in 0.1 %, the override in 0.1 % too.
  let idle = $state(FC.MIXER_CONFIG.tail_motor_idle / 10);
  let savedIdle = $state(FC.MIXER_CONFIG.tail_motor_idle / 10);

  let bidirectional = $derived(
    FC.MIXER_CONFIG.tail_rotor_mode === Mixer.TAIL_MODE_BIDIRECTIONAL,
  );
  let hasMotor = $derived((FC.CONFIG.motorCount ?? 0) >= 2);
  let canSpin = $derived(safe && hasMotor && !wiz.armed);

  function overrideValue(kind) {
    if (kind === "forward") return TEST_PERCENT * 10;
    if (kind === "reverse") return -TEST_PERCENT * 10;
    return Math.round(idle * 10);
  }

  function send(value) {
    FC.MOTOR_OVERRIDE[TAIL_MOTOR] = value;
    mspHelper.sendMotorOverride(TAIL_MOTOR);
  }

  function start(kind) {
    if (!canSpin || spinning) return;
    spinning = kind;
    send(overrideValue(kind));
    keepalive = setInterval(() => send(overrideValue(spinning)), KEEPALIVE_MS);
    if (kind === "idle") idleTimer = setTimeout(stop, IDLE_RUN_MS);
  }

  function stop() {
    if (!spinning) return;
    spinning = null;
    clearInterval(keepalive);
    clearTimeout(idleTimer);
    send(0);
  }

  // Stop on leaving the step, the tab, or on arming.
  wiz.setLeave(stop);
  onDestroy(stop);
  $effect(() => {
    if (wiz.armed) stop();
  });

  function useIdle() {
    FC.MIXER_CONFIG.tail_motor_idle = Math.round(idle * 10);
    savedIdle = idle;
    wiz.sendMixerConfig();
  }
</script>

<MotorCheck />

<label class="safe">
  <input type="checkbox" bind:checked={safe} disabled={spinning !== null} />
  {$i18n.t("setupWizardTailMotorSafe")}
</label>

<section class="card">
  <h3>
    <span class="num">1</span>{$i18n.t("setupWizardTailMotorDirTitle")}
  </h3>
  <p>
    {$i18n.t(
      bidirectional
        ? "setupWizardTailMotorDirTextBidir"
        : "setupWizardTailMotorDirText",
      { 1: TEST_PERCENT },
    )}
  </p>
  <div class="actions">
    {#each bidirectional ? ["forward", "reverse"] : ["forward"] as kind (kind)}
      <button
        class={["btn", spinning === kind && "primary"]}
        disabled={!canSpin || (spinning !== null && spinning !== kind)}
        onpointerdown={() => start(kind)}
        onpointerup={stop}
        onpointerleave={stop}
        onpointercancel={stop}
        onkeydown={(e) => (e.key === " " || e.key === "Enter") && start(kind)}
        onkeyup={stop}
        onblur={stop}
      >
        {spinning === kind
          ? $i18n.t("setupWizardTailMotorSpinning")
          : $i18n.t(
              bidirectional
                ? `setupWizardTailMotorHold_${kind}`
                : "setupWizardTailMotorHold",
            )}
      </button>
    {/each}
  </div>
</section>

<section class={["card", savedIdle === idle && idle > 0 && "complete"]}>
  <h3>
    <span class="num">2</span>{$i18n.t("setupWizardTailMotorIdleTitle")}
  </h3>
  <p>{$i18n.t("setupWizardTailMotorIdleText")}</p>
  <div class="actions">
    <NumberInput min="0" max={IDLE_MAX} step="0.1" bind:value={idle} />
    <span class="muted">%</span>
    {#if spinning === "idle"}
      <button class="btn primary" onclick={stop}>
        {$i18n.t("setupWizardTailMotorStop")}
      </button>
    {:else}
      <button
        class="btn"
        disabled={!canSpin || spinning !== null}
        onclick={() => start("idle")}
      >
        {$i18n.t("setupWizardTailMotorRun")}
      </button>
    {/if}
    <button class="btn" disabled={idle === savedIdle} onclick={useIdle}>
      {$i18n.t("setupWizardTailMotorUse")}
    </button>
  </div>
  <span class="pill">
    {$i18n.t("setupWizardTailMotorIdleNow", { 1: savedIdle.toFixed(1) })}
  </span>
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

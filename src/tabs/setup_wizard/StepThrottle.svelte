<script>
  import { getContext, onDestroy, onMount } from "svelte";

  import Meter from "@/components/Meter.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import motorState from "@/tabs/motors/state.svelte.js";

  import EscArt from "./EscArt.svelte";
  import TabButton from "./TabButton.svelte";

  // A PWM ESC learns its throttle range at power-up: it sees full throttle
  // when the battery goes on, then low throttle. The full throttle comes
  // from the motor override, which the FC raises at 25 % a second, drops
  // at once and lets lapse after a second unless it is re-sent
  // (flight/motors.c). Overrides only act while disarmed.
  const wiz = getContext("setupWizard");

  const MAIN_MOTOR = 0;
  const FULL_THROTTLE = 1000;
  const OVERRIDE_OFF = 0;
  const REFRESH_MS = 250;
  const POLL_MS = 200;

  // idle → full (battery off, output rising) → low (battery on) → done
  let stage = $state("idle");
  let refreshTimer;
  let pollTimer;
  let stopped = false;

  let protocolName = $derived(
    motorState.throttleProtocols[FC.MOTOR_CONFIG.motor_pwm_protocol],
  );
  let isPwm = $derived(protocolName === "PWM");

  // msp.c MSP_MOTOR: output + 1000, zero when the motor is disabled.
  let motorData = $derived(FC.MOTOR_DATA[MAIN_MOTOR] ?? 0);
  let motorEnabled = $derived(motorData !== 0);
  let output = $derived(
    motorData > 0 ? Math.max(0, Math.min(100, (motorData - 1000) / 10)) : 0,
  );
  let atFull = $derived(output >= 99.5);

  function setOverride(value) {
    FC.MOTOR_OVERRIDE[MAIN_MOTOR] = value;
    mspHelper.sendMotorOverride(MAIN_MOTOR);
  }

  function release() {
    clearInterval(refreshTimer);
    refreshTimer = null;
    setOverride(OVERRIDE_OFF);
  }

  function fullThrottle() {
    setOverride(FULL_THROTTLE);
    clearInterval(refreshTimer);
    refreshTimer = setInterval(
      () => mspHelper.sendMotorOverride(MAIN_MOTOR),
      REFRESH_MS,
    );
    stage = "full";
  }

  function lowThrottle() {
    release();
    stage = "low";
  }

  function cancel() {
    release();
    stage = "idle";
  }

  // The FC ignores the override once armed; stop holding it anyway.
  $effect(() => {
    if (wiz.armed && stage === "full") cancel();
  });

  onMount(() => {
    // One left on by the Motors tab would spin the motor with the battery.
    release();
    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_MOTOR);
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    }
    poll();
  });

  wiz.setLeave(release);

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
    release();
  });
</script>

<div class="with-art">
  <div class="art"><EscArt /></div>
  <div class="text">
    <p>{$i18n.t("setupWizardThrottleIntro")}</p>
  </div>
</div>

{#if !isPwm}
  <p>{$i18n.t("setupWizardThrottleNotNeeded", { 1: protocolName })}</p>
  <section class="card">
    <h3>{$i18n.t("setupWizardThrottleBatteryTitle")}</h3>
    <p>{$i18n.t("setupWizardThrottleBatteryOn")}</p>
  </section>
{:else}
  <div class="note">{$i18n.t("setupWizardThrottleSafety")}</div>

  {#if !motorEnabled}
    <div class="note">{$i18n.t("setupWizardThrottleNoMotor")}</div>
  {/if}

  <section class={["card", stage !== "idle" && "complete"]}>
    <h3><span class="num">1</span>{$i18n.t("setupWizardThrottleFullTitle")}</h3>
    <p>{$i18n.t("setupWizardThrottleFullText")}</p>
    <div class="meter">
      <Meter
        title={$i18n.t("motorThrottle")}
        leftLabel={`${output.toFixed(0)}%`}
        rightLabel="100%"
        value={output}
      />
    </div>
    <div class="actions">
      {#if stage === "full"}
        <button class="btn" onclick={cancel}>
          {$i18n.t("setupWizardThrottleCancel")}
        </button>
      {:else}
        <button
          class="btn"
          disabled={!motorEnabled || wiz.armed}
          onclick={fullThrottle}
        >
          {$i18n.t("setupWizardThrottleFullButton")}
        </button>
      {/if}
    </div>
  </section>

  <section
    class={["card", (stage === "low" || stage === "done") && "complete"]}
  >
    <h3>
      <span class="num">2</span>{$i18n.t("setupWizardThrottleBatteryTitle")}
    </h3>
    <p>{$i18n.t("setupWizardThrottleBatteryText")}</p>
    <div class="actions">
      <button
        class="btn"
        disabled={stage !== "full" || !atFull}
        onclick={lowThrottle}
      >
        {$i18n.t("setupWizardThrottleLowButton")}
      </button>
      {#if stage === "full" && !atFull}
        <span class="muted">{$i18n.t("setupWizardThrottleWait")}</span>
      {/if}
    </div>
  </section>

  <section class={["card", stage === "done" && "complete"]}>
    <h3>
      <span class="num">3</span>{$i18n.t("setupWizardThrottleLowTitle")}
      {#if stage === "done"}
        <span class="badge good">
          <i class="fas fa-check" aria-hidden="true"></i>
          {$i18n.t("setupWizardDone")}
        </span>
      {/if}
    </h3>
    <p>{$i18n.t("setupWizardThrottleLowText")}</p>
    <div class="actions">
      <button
        class="btn"
        disabled={stage !== "low"}
        onclick={() => (stage = "done")}
      >
        {$i18n.t("setupWizardThrottleDoneButton")}
      </button>
    </div>
  </section>
{/if}

<div>
  <TabButton tab="motors">
    {$i18n.t("setupWizardOpenMotors")}
  </TabButton>
</div>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .meter {
    max-width: 420px;
  }
</style>

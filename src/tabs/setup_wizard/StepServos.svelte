<script>
  import { getContext, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import ServoArmArt from "./ServoArmArt.svelte";
  import { servoRaw } from "./heli.js";

  const wiz = getContext("setupWizard");

  const FLAG_REVERSE = 1;
  // The direction test moves one servo this far up from centre.
  const TEST_DEGREES = 20;
  // Beyond this the arm should be moved a spline instead: a large centre
  // offset costs travel on one side.
  const MID_WARN_US = 100;

  // Servo override at 0 puts each servo exactly at its centre, as on the
  // Servos tab: nothing from the mixer reaches it. Released by the wizard
  // when the step is left.
  let testing = $state(null);
  let confirmed = $state({});

  onMount(() => {
    for (const s of wiz.servos) {
      wiz.holdServo(s.servo, 0);
    }
  });

  function bandCentre(config) {
    return config.mid > 860 ? 1520 : 760;
  }

  function test(servo) {
    if (testing !== null) wiz.holdServo(testing, 0);
    if (testing === servo) {
      testing = null;
      return;
    }
    testing = servo;
    wiz.holdServo(servo, servoRaw(TEST_DEGREES));
  }

  function answer(servo, up) {
    if (up) {
      confirmed[servo] = true;
      wiz.holdServo(servo, 0);
      testing = null;
      return;
    }
    // Reversed: flip it, and keep the test running so the change shows.
    const config = FC.SERVO_CONFIG[servo];
    config.flags ^= FLAG_REVERSE;
    wiz.sendServo(servo);
  }

  function nudge(servo, delta) {
    FC.SERVO_CONFIG[servo].mid += delta;
    wiz.sendServo(servo);
  }

  function signed(n) {
    return `${n > 0 ? "+" : ""}${n}`;
  }
</script>

<div class="with-art">
  <div class="art"><ServoArmArt /></div>
  <div class="text">
    <p>{$i18n.t("setupWizardServosIntro")}</p>
    <ol class="muted">
      <li>{$i18n.t("setupWizardServosTipArms")}</li>
      <li>{$i18n.t("setupWizardServosTipDirection")}</li>
      <li>{$i18n.t("setupWizardServosTipCentre")}</li>
    </ol>
  </div>
</div>

{#if wiz.servos.length === 0}
  <div class="note">{$i18n.t("setupWizardNoServos")}</div>
{/if}

<div class="servos">
  {#each wiz.servos as s (s.servo)}
    {@const config = FC.SERVO_CONFIG[s.servo]}
    {@const centre = bandCentre(config)}
    {@const offset = config.mid - centre}
    {@const far = Math.abs(offset) > MID_WARN_US}
    {@const reversed = (config.flags & FLAG_REVERSE) !== 0}
    <section class={["card", confirmed[s.servo] && !far && "complete"]}>
      <h3>
        {wiz.servoLabel(s)}
        <span class="pill">{FC.SERVO_DATA[s.servo] ?? "–"} µs</span>
        {#if reversed}
          <span class="badge warn">{$i18n.t("servoReverse")}</span>
        {/if}
      </h3>

      {#if s.kind === "swash"}
        <div class="actions">
          <button
            class={["btn", testing === s.servo && "primary"]}
            onclick={() => test(s.servo)}
          >
            <i class="fas fa-arrow-up" aria-hidden="true"></i>
            {$i18n.t("setupWizardServosTest", { 1: TEST_DEGREES })}
          </button>
          {#if confirmed[s.servo]}
            <span class="good-text">
              <i class="fas fa-check" aria-hidden="true"></i>
              {$i18n.t("setupWizardServosDirectionOk")}
            </span>
          {/if}
        </div>
        {#if testing === s.servo}
          <div class="question">
            <span>{$i18n.t("setupWizardServosQuestion")}</span>
            <div class="actions">
              <button class="btn" onclick={() => answer(s.servo, true)}>
                {$i18n.t("setupWizardServosAnswerUp")}
              </button>
              <button class="btn" onclick={() => answer(s.servo, false)}>
                {$i18n.t("setupWizardServosAnswerDown")}
              </button>
            </div>
          </div>
        {/if}
      {/if}

      <div class="centre">
        <span class="muted">{$i18n.t("servoMid")}</span>
        <span class="nudges">
          {#each [-10, -1] as delta (delta)}
            <button class="btn" onclick={() => nudge(s.servo, delta)}>
              {delta}
            </button>
          {/each}
          <span class="value">{config.mid} µs</span>
          {#each [1, 10] as delta (delta)}
            <button class="btn" onclick={() => nudge(s.servo, delta)}>
              +{delta}
            </button>
          {/each}
        </span>
        <span class={["muted", far && "warn-text"]}>
          {$i18n.t("setupWizardServosOffset", { 1: signed(offset), 2: centre })}
        </span>
      </div>
      {#if far}
        <p class="warn-text">{$i18n.t("setupWizardServosFarWarning")}</p>
      {/if}
    </section>
  {/each}
</div>

<style lang="scss">
  .btn {
    @extend %button;
    min-width: 2.5rem;
  }

  .btn.primary {
    @extend %button-primary;
  }

  ol {
    margin: 0;
    padding-left: 1.4em;
  }

  .servos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }

  .question {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--color-accent-500);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    font-weight: 600;
  }

  .centre {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
  }

  .warn-text {
    color: var(--color-warning);
  }
</style>

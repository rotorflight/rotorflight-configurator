<script>
  import { getContext } from "svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import govState, { GOV_THROTTLE_TYPE } from "@/tabs/governor/state.svelte.js";
  import motorState from "@/tabs/motors/state.svelte.js";

  import HeliSide from "./HeliSide.svelte";
  import TabButton from "./TabButton.svelte";
  import { hasFastRpm } from "./governor.js";
  import { COLLECTIVE, PITCH, limitDegrees } from "./heli.js";

  const wiz = getContext("setupWizard");

  const TAIL_LABELS = {
    [Mixer.TAIL_MODE_VARIABLE]: "mixerTailVariablePitch",
    [Mixer.TAIL_MODE_MOTORIZED]: "mixerTailMotorized",
    [Mixer.TAIL_MODE_BIDIRECTIONAL]: "mixerTailBidirectional",
  };

  let finished = $state(false);

  let swashType = $derived(
    $i18n
      .t(Mixer.swashTypes[FC.MIXER_CONFIG.swash_type] ?? "")
      .replaceAll("&deg;", "°"),
  );
  let rotorDir = $derived(
    $i18n.t(
      FC.MIXER_CONFIG.main_rotor_dir
        ? "mixerCounterClockwise"
        : "mixerClockwise",
    ),
  );
  let tail = $derived(
    $i18n.t(TAIL_LABELS[FC.MIXER_CONFIG.tail_rotor_mode] ?? ""),
  );
  let escProtocol = $derived(
    motorState.throttleProtocols[FC.MOTOR_CONFIG.motor_pwm_protocol],
  );
  let escTelemetry = $derived(
    motorState.telemEnabled
      ? motorState.isCastleLink
        ? "Castle Link"
        : motorState.telemetryProtocols[FC.ESC_SENSOR_CONFIG.protocol]
      : $i18n.t("setupWizardFinishOff"),
  );
  let pitch = $derived(
    $i18n.t("setupWizardFinishPitchValue", {
      1: limitDegrees(FC.MIXER_INPUTS[COLLECTIVE].max),
      2: limitDegrees(FC.MIXER_INPUTS[PITCH].max),
    }),
  );
  let governor = $derived.by(() => {
    if (!govState.enabled) return govState.govModes[0];
    if (!govState.is_12_9) return govState.govMode;
    const type = Object.keys(GOV_THROTTLE_TYPE).find(
      (k) => GOV_THROTTLE_TYPE[k] === FC.GOVERNOR.gov_throttle_type,
    );
    return `${govState.govMode} · ${type}`;
  });
  let governorNoRpm = $derived(govState.govHeadspeed && !hasFastRpm());

  let armAssigned = $derived(
    FC.MODE_RANGES.some((r) => r.id === 0 && r.range.start < r.range.end),
  );

  let rows = $derived([
    { label: "setupWizardStep_swash", value: `${swashType} · ${rotorDir}` },
    { label: "setupWizardFinishTail", value: tail },
    { label: "setupWizardStep_pitch", value: pitch },
    { label: "motorsEscProtocol", value: escProtocol },
    { label: "setupWizardStep_escTelemetry", value: escTelemetry },
  ]);

  async function finish() {
    if (wiz.pending) {
      await wiz.save();
    }
    finished = true;
  }
</script>

<div class="with-art">
  <div class="art"><HeliSide scene="flying" /></div>
  <div class="text"><p>{$i18n.t("setupWizardFinishIntro")}</p></div>
</div>

<dl class="summary">
  {#each rows as row (row.label)}
    <dt>{$i18n.t(row.label)}</dt>
    <dd>{row.value}</dd>
  {/each}
  <dt>{$i18n.t("tabGovernor")}</dt>
  <dd>
    {governor}
    {#if governorNoRpm}
      <span class="badge bad">{$i18n.t("setupWizardGovNoRpmBadge")}</span>
    {/if}
  </dd>
  <dt>{$i18n.t("setupWizardMode_arm")}</dt>
  <dd>
    {#if armAssigned}
      <span class="good-text">
        <i class="fas fa-check" aria-hidden="true"></i>
        {$i18n.t("setupWizardFinishAssigned")}
      </span>
    {:else}
      <span class="badge bad">{$i18n.t("setupWizardFinishNotAssigned")}</span>
    {/if}
  </dd>
</dl>

{#if governorNoRpm}
  <div class="note">{$i18n.t("setupWizardGovRpmMissing")}</div>
{/if}

{#if !armAssigned}
  <div class="note">{$i18n.t("setupWizardFinishNoArm")}</div>
{/if}

<section class="card">
  <h3>{$i18n.t("setupWizardFinishNextTitle")}</h3>
  <ul>
    <li>{$i18n.t("setupWizardFinishNextGovernor")}</li>
    <li>{$i18n.t("setupWizardFinishNextProfiles")}</li>
  </ul>
  <div class="actions">
    <TabButton tab="governor">
      {$i18n.t("tabGovernor")}
    </TabButton>
    <TabButton tab="profiles">
      {$i18n.t("tabProfiles")}
    </TabButton>
  </div>
</section>

<div class="actions">
  <button class="btn primary" disabled={wiz.saving} onclick={finish}>
    {$i18n.t("setupWizardFinish")}
  </button>
  {#if finished}
    <span class="good-text">
      <i class="fas fa-check-circle" aria-hidden="true"></i>
      {$i18n.t("setupWizardFinishDone")}
    </span>
  {/if}
</div>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .summary {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 24px;
    margin: 0;

    dt {
      color: var(--color-text-soft);
    }

    dd {
      margin: 0;
      font-weight: 600;
    }
  }

  ul {
    margin: 0;
    padding-left: 1.4em;
  }
</style>

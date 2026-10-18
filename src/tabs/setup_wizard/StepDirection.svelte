<script>
  import { getContext, onDestroy, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import LiveBar from "./LiveBar.svelte";
  import { COLLECTIVE, PITCH, ROLL } from "./heli.js";

  const wiz = getContext("setupWizard");

  // Mixer passthrough puts the sticks straight on the swash, without the
  // stabilizer, so the gyro can't confuse the check. `command` is the
  // RC_COMMAND index (roll, pitch, yaw, collective).
  const CHECKS = [
    { key: "roll", input: ROLL, command: 0 },
    { key: "pitch", input: PITCH, command: 1 },
    { key: "collective", input: COLLECTIVE, command: 3 },
  ];

  const POLL_MS = 100;

  let results = $state({});
  let pollTimer;
  let stopped = false;

  onMount(() => {
    for (const check of CHECKS) {
      wiz.passthroughMixer(check.input);
    }

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

  function reversed(input) {
    return FC.MIXER_INPUTS[input].rate < 0;
  }

  function reverse(check) {
    const input = FC.MIXER_INPUTS[check.input];
    input.rate = -input.rate;
    wiz.sendMixerInput(check.input);
    results[check.key] = null;
  }
</script>

<p>
  {$i18n.t(
    wiz.hasPassthrough
      ? "setupWizardDirectionIntro"
      : "setupWizardDirectionIntroGyro",
  )}
</p>
<div class="note">{$i18n.t("setupWizardDirectionSafety")}</div>

{#each CHECKS as check (check.key)}
  {@const result = results[check.key]}
  <section class={["card", result === true && "complete"]}>
    <h3>
      {$i18n.t(`setupWizardDirectionTitle_${check.key}`)}
      {#if reversed(check.input)}
        <span class="badge warn">{$i18n.t("mixerDirectionReverse")}</span>
      {/if}
    </h3>
    <div class="stick">
      <span class="muted">{$i18n.t("setupWizardDirectionStick")}</span>
      <LiveBar f={(FC.RC_COMMAND[check.command] ?? 0) / 500} />
    </div>
    <p>{$i18n.t(`setupWizardDirectionText_${check.key}`)}</p>
    <div class="actions">
      <button
        class={["btn", result === true && "primary"]}
        onclick={() => (results[check.key] = true)}
      >
        <i class="fas fa-check" aria-hidden="true"></i>
        {$i18n.t("setupWizardDirectionCorrect")}
      </button>
      <button class="btn" onclick={() => reverse(check)}>
        <i class="fas fa-exchange-alt" aria-hidden="true"></i>
        {$i18n.t("setupWizardDirectionWrong")}
      </button>
    </div>
  </section>
{/each}

<p class="muted">{$i18n.t("setupWizardDirectionServoNote")}</p>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .stick {
    display: grid;
    grid-template-columns: auto minmax(120px, 320px);
    align-items: center;
    gap: 12px;
  }
</style>

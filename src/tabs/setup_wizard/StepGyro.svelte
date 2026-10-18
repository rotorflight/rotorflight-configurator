<script>
  import { getContext } from "svelte";

  import { i18n } from "@/js/i18n.js";

  // No overrides here: the stabilizer drives the swash (the PID runs while
  // disarmed too). On the ground the I-term decays, so the swash only
  // twitches against a brisk movement and then drifts back.
  const wiz = getContext("setupWizard");

  let results = $state({});

  let checks = $derived(["roll", "pitch", ...(wiz.motorised ? [] : ["yaw"])]);
  let anyWrong = $derived(checks.some((axis) => results[axis] === false));
</script>

<div class="intro">
  <p>{$i18n.t("setupWizardGyroIntro")}</p>
  <p class="muted">{$i18n.t("setupWizardGyroHow")}</p>
</div>

{#each checks as axis (axis)}
  {@const result = results[axis]}
  <section class={["card", result === true && "complete"]}>
    <h3>{$i18n.t(`setupWizardGyroTitle_${axis}`)}</h3>
    <p>{$i18n.t(`setupWizardGyroText_${axis}`)}</p>
    <div class="actions">
      <button
        class={["btn", result === true && "primary"]}
        onclick={() => (results[axis] = true)}
      >
        <i class="fas fa-check" aria-hidden="true"></i>
        {$i18n.t("setupWizardGyroAgainst")}
      </button>
      <button
        class={["btn", result === false && "primary"]}
        onclick={() => (results[axis] = false)}
      >
        <i class="fas fa-times" aria-hidden="true"></i>
        {$i18n.t("setupWizardGyroWith")}
      </button>
    </div>
  </section>
{/each}

{#if anyWrong}
  <div class="note">
    <p>{$i18n.t("setupWizardGyroWrong")}</p>
    <div class="actions">
      <button class="btn" onclick={() => wiz.goToStep("sensors")}>
        {$i18n.t("setupWizardGyroBackToSensors")}
      </button>
    </div>
  </div>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .note .actions {
    margin-top: 8px;
  }
</style>

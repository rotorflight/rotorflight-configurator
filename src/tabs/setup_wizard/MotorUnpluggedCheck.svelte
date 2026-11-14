<script>
  import { getContext } from "svelte";

  import { i18n } from "@/js/i18n.js";

  // Asked before a step that runs with the blades fitted. Next waits for it
  // (a guard), and the step can read `confirmed` to hold back its motor
  // controls. Asked again on every visit.
  let { confirmed = $bindable(false) } = $props();

  const wiz = getContext("setupWizard");

  wiz.setGuard(() => (confirmed ? null : "setupWizardGuardMotorUnplugged"));
</script>

<section class="card">
  <h3>{$i18n.t("setupWizardUnpluggedTitle")}</h3>
  <p>{$i18n.t("setupWizardUnpluggedText")}</p>
  <div class="actions">
    <button
      class={["btn", confirmed && "primary"]}
      aria-pressed={confirmed}
      onclick={() => (confirmed = !confirmed)}
    >
      <i class="fas fa-check" aria-hidden="true"></i>
      {$i18n.t("setupWizardUnpluggedConfirm")}
    </button>
  </div>
</section>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }
</style>

<script>
  import { i18n } from "@/js/i18n.js";

  import HeliSide from "./HeliSide.svelte";

  // A red "Main blades off" warning with the crossed-out blades, for the
  // cards that can start the main motor. Stronger than the usual .note.
  let { text } = $props();
</script>

<div class="blades-off" role="note">
  <div class="art"><HeliSide scene="bladesOff" /></div>
  <div>
    <strong>
      <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
      {$i18n.t("setupWizardThrottleSwitchWarningTitle")}
    </strong>
    <p>{text}</p>
  </div>
</div>

<style lang="scss">
  .blades-off {
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 70ch;
    padding: 10px 14px;
    border-left: 4px solid var(--color-status-bad);
    border-radius: var(--radius-xs);
    background-color: var(--color-surface-sunken);

    strong {
      font-size: 1.1em;
      color: var(--color-status-bad);
    }

    i {
      margin-right: 6px;
    }

    p {
      margin: 4px 0 0;
      font-weight: 600;
    }
  }

  .art {
    flex: 0 0 140px;
  }
</style>

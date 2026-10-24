<script>
  import { i18n } from "@/js/i18n.js";

  import HeliSide from "./HeliSide.svelte";

  // A red "blades off" warning with the blades crossed out, for the cards
  // that can start a motor: the main blades, or with tail the tail rotor.
  // Stronger than the usual .note.
  let { text, tail = false } = $props();
</script>

<div class="blades-off" role="note">
  <div class="art">
    <HeliSide scene={tail ? "tailBladesOff" : "bladesOff"} />
  </div>
  <div>
    <strong>
      <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
      {$i18n.t(
        tail
          ? "setupWizardTailBladesOffTitle"
          : "setupWizardThrottleSwitchWarningTitle",
      )}
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

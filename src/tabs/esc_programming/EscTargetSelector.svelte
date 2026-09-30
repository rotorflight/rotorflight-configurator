<script>
  import Section from "@/components/Section.svelte";

  import { i18n } from "@/js/i18n.js";

  import escState from "./state.svelte.js";

  // Only offer targets that exist: ESC 2 is shown when the FC reports a second 4-way ESC.
  let targets = $derived([
    { index: 0, label: "escProgrammingEsc1" },
    ...(escState.escTwoAvailable
      ? [{ index: 1, label: "escProgrammingEsc2" }]
      : []),
  ]);
</script>

<Section label="escProgrammingSelectEsc">
  <div class="grid">
    {#each targets as target (target.index)}
      <button
        class="card"
        onclick={() => escState.selectEsc(target.index)}
        disabled={escState.armed}
      >
        <span class="number">{target.index + 1}</span>
        <span class="name">{$i18n.t(target.label)}</span>
        <span class="mfg">{escState.manufacturer?.name}</span>
      </button>
    {/each}
  </div>
  <div class="actions">
    <button class="back-btn" onclick={() => escState.reset()}>
      <i class="fas fa-arrow-left"></i>
      {$i18n.t("escProgrammingBack")}
    </button>
  </div>
</Section>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 4px;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 10px 12px;

    font: inherit;
    color: var(--color-text);
    background-color: var(--color-surface-float);
    border: 1px solid var(--color-border-soft);
    border-radius: 6px;
    cursor: pointer;
    transition:
      border-color var(--animation-speed),
      box-shadow var(--animation-speed),
      transform var(--animation-speed);

    &:hover:not(:disabled) {
      border-color: var(--color-border-accent);
      box-shadow: 0 4px 12px -4px var(--color-shadow);
      transform: translateY(-2px);
    }

    &:focus-visible {
      outline: 2px solid var(--color-border-accent);
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--color-text-disabled);
    }
  }

  .number {
    font-size: 2.5em;
    font-weight: 700;
    line-height: 1;
    color: var(--color-border-accent);

    .card:disabled & {
      color: inherit;
    }
  }

  .name {
    font-weight: 600;
  }

  .mfg {
    font-size: 0.85em;
    color: var(--color-text-soft);
  }

  .actions {
    padding: 0 4px 4px;
  }

  .back-btn {
    @extend %button;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
  }
</style>

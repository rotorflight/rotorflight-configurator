<script>
  import InfoNote from "@/components/notes/InfoNote.svelte";

  import { i18n } from "@/js/i18n.js";

  /**
   * picked: PresetInstance[] (changed in place when one is removed),
   * onedit(instance): Promise resolved when the edit dialog closes,
   * onapply(): review the CLI of the picked presets.
   */
  let { picked, onedit, onapply, onchange } = $props();

  let dialog;
  let list = $state.raw([]);
  let applying = false;

  export function show() {
    list = [...picked];
    applying = false;
    dialog.showModal();
  }

  async function edit(instance) {
    await onedit(instance);
    list = [...picked];
  }

  function remove(index) {
    picked.splice(index, 1);
    list = [...picked];
    onchange?.();
    if (picked.length === 0) {
      dialog.close();
    }
  }

  function apply() {
    applying = true;
    dialog.close();
    onapply();
  }

  function onClose() {
    if (!applying) {
      onchange?.();
    }
  }
</script>

<dialog class="review-dialog" bind:this={dialog} onclose={onClose}>
  <h3>{$i18n.t("reviewPresetsDialogTitle")}</h3>
  <div class="scroll">
    <InfoNote message="presetsReviewBeforeApply" />
    {#each list as instance, index (instance)}
      <div class="item">
        <div class="header">
          <span class="title">{instance.presetData.title}</span>
          <button class="btn" onclick={() => edit(instance)}>
            {$i18n.t("presetEdit")}
          </button>
          <button class="btn danger" onclick={() => remove(index)}>
            {$i18n.t("presetsSourcesDialogDeleteSource")}
          </button>
        </div>
        <dl>
          <dt>{$i18n.t("presetAuthor")}</dt>
          <dd>{instance.presetData.author}</dd>
          <dt>{$i18n.t("presetCategory")}</dt>
          <dd>{instance.presetData.category}</dd>
          <dt>{$i18n.t("presetSelectedOptions")}</dt>
          <dd>{instance.optionsValues?.join(", ") || "–"}</dd>
        </dl>
      </div>
    {/each}
  </div>
  <div class="buttons">
    <button class="btn" onclick={() => dialog.close()}>
      {$i18n.t("close")}
    </button>
    <button class="btn primary" onclick={apply}>
      {$i18n.t("presetsButtonReviewCLI")}
    </button>
  </div>
</dialog>

<style lang="scss">
  .review-dialog {
    width: min(44rem, 92vw);
    max-height: 90vh;

    &[open] {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  .scroll {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    overflow-y: auto;
  }

  .item {
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border-soft);
  }

  .title {
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-weight: 600;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 3px 12px;
    margin: 0;
    padding: 8px 12px 10px;
    font-size: 0.78rem;
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    @extend %button;
  }

  .primary {
    @extend %button-primary;
  }

  .danger {
    color: var(--color-danger);
  }
</style>

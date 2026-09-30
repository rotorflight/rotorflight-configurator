<!--
  Terminal dialog the CLI engine writes into while presets are applied or
  a backup is read. The buttons are driven by the parent.
-->
<script>
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import { i18n } from "@/js/i18n.js";

  let {
    title = "",
    progress = null,
    showInput = false,
    showErrorsWarning = false,
    buttonsVisible = false,
    buttonsDisabled = false,
    onsave,
    onclose,
  } = $props();

  let dialog;
  let windowEl;
  let wrapperEl;
  let textareaEl;

  export function open() {
    dialog.showModal();
  }

  export function close() {
    dialog.close();
  }

  /** The window, output wrapper and command input, as jQuery elements. */
  export function ui() {
    const jq = globalThis.$;
    return [jq(windowEl), jq(wrapperEl), jq(textareaEl)];
  }
</script>

<dialog
  class="cli-dialog"
  bind:this={dialog}
  onclose={() => onclose?.()}
  oncancel={(e) => buttonsDisabled && e.preventDefault()}
>
  {#if showErrorsWarning}
    <WarningNote message="presetsCliErrorsWarning" />
  {/if}
  <h3>{title}</h3>
  <div class="backdrop">
    <div class="window" bind:this={windowEl}>
      <div class="wrapper" bind:this={wrapperEl}></div>
    </div>
  </div>
  <textarea
    bind:this={textareaEl}
    class:hidden={!showInput}
    name="commands"
    rows="1"
    placeholder={$i18n.t("cliInputPlaceholder")}></textarea>
  {#if progress !== null}
    <progress value={progress} max="100"></progress>
  {/if}
  {#if buttonsVisible}
    <div class="buttons">
      <button class="btn" disabled={buttonsDisabled} onclick={close}>
        {$i18n.t("presetsCliExitButton")}
      </button>
      <button class="btn primary" disabled={buttonsDisabled} onclick={onsave}>
        {$i18n.t("presetsCliSaveButton")}
      </button>
    </div>
  {/if}
</dialog>

<style lang="scss">
  .cli-dialog {
    width: min(56rem, 92vw);

    &[open] {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  /* A terminal, so it stays dark in both themes (as on the CLI tab). */
  .backdrop {
    height: 50vh;
    border: 1px solid var(--chrome-border);
    border-radius: var(--radius-md);
    background-color: hsl(208, 12%, 8%);
  }

  .window {
    box-sizing: border-box;
    height: 100%;
    padding: 10px 12px;
    overflow-x: hidden;
    overflow-y: scroll;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.55;
    color: hsl(208, 14%, 86%);
  }

  .wrapper {
    white-space: pre-wrap;
    user-select: text;

    :global(p) {
      margin: 0;
    }

    :global(.error_message) {
      color: hsl(2, 85%, 68%);
      font-weight: 700;
    }
  }

  textarea {
    box-sizing: border-box;
    width: 100%;
    height: 60px;
    padding: 8px 12px;
    border: 1px solid var(--chrome-border);
    border-radius: var(--radius-md);
    background-color: hsl(208, 12%, 8%);
    color: hsl(208, 14%, 90%);
    font-family: var(--font-mono);
    font-size: 12px;
    resize: none;

    &.hidden {
      display: none;
    }
  }

  progress {
    width: 100%;
    accent-color: var(--color-accent-500);
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
</style>

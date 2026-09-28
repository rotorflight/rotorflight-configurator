<script>
  import { onDestroy, onMount } from "svelte";

  import Page from "@/components/Page.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";

  import { CliAutoComplete } from "@/js/CliAutoComplete.js";
  import CliEngine from "@/js/cli_engine.js";
  import * as clipboard from "@/js/clipboard.js";
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import * as filesystem from "@/js/filesystem.js";
  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { generateFilename } from "@/js/main.js";

  // The CLI engine drives its own terminal: it writes output into the
  // window and reads commands from the textarea (as jQuery elements).
  const engine = new CliEngine();

  let windowEl;
  let wrapperEl;
  let textareaEl;
  let previewDialogEl;
  let exitDialogEl;

  let copied = $state(false);
  let previewText = $state("");
  let previewFile = $state("");

  onMount(() => {
    CONFIGURATOR.cliEngineActive = true;
    CONFIGURATOR.cliTab = "cli";
    const jq = globalThis.$;
    engine.setUi(jq(windowEl), jq(wrapperEl), jq(textareaEl));
    engine.initializeAutoComplete();
    engine.enterCliMode();
    GUI.saveDefaultTab("status");
  });

  onDestroy(() => {
    CliAutoComplete.cleanup();
    globalThis.$(CliAutoComplete).off();
  });

  /** Serial data while the CLI is active (called from serial_backend). */
  export function read(info) {
    engine.readSerial(info);
  }

  /** Leaving the tab: blocked while the CLI session is active. */
  export function exit(callback) {
    if (CONFIGURATOR.cliEngineActive) {
      exitDialogEl.showModal();
    } else {
      callback?.();
    }
  }

  export function close(callback) {
    if (
      CONFIGURATOR.connectionValid &&
      CONFIGURATOR.cliEngineValid &&
      CONFIGURATOR.cliEngineActive
    ) {
      engine.close(callback);
    } else {
      callback?.();
    }
  }

  async function onSave() {
    try {
      await filesystem.writeTextFile(engine.outputHistory, {
        suggestedName: generateFilename("cli", "txt"),
        description: "TXT files",
      });
    } catch (err) {
      console.log("Failed to save config", err);
    }
  }

  async function onLoad() {
    try {
      const file = await filesystem.readTextFile({
        description: "Config files",
        extensions: [".txt", ".config"],
      });
      if (!file) {
        return;
      }
      // dump/diff/exit in a loaded snippet are commented out, as before
      previewText = file.content
        .split("\n")
        .map((line) => {
          const lower = line.toLowerCase().trim();
          return lower.startsWith("dump") ||
            lower.startsWith("diff") ||
            lower.startsWith("exit")
            ? `# ${line}`
            : line;
        })
        .join("\n");
      previewFile = file.name;
      previewDialogEl.showModal();
    } catch (err) {
      console.log("Failed to load config", err);
    }
  }

  function onExecuteSnippet() {
    engine.executeCommands(previewText);
    previewDialogEl.close();
  }

  async function onCopy() {
    try {
      await clipboard.writeText(engine.outputHistory);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch (err) {
      console.warn(err);
    }
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabCLI")}</h1>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onSave}>{$i18n.t("cliSaveToFileBtn")}</button>
  <button class="btn" onclick={onLoad}>{$i18n.t("cliLoadFromFileBtn")}</button>
  <button class="btn" onclick={() => engine.clearOutputHistory()}>
    {$i18n.t("cliClearOutputHistoryBtn")}
  </button>
  <button class="btn copy" onclick={onCopy}>
    {$i18n.t(copied ? "cliCopySuccessful" : "cliCopyToClipboardBtn")}
  </button>
{/snippet}

<Page {header} {toolbar}>
  <div class="cli">
    <InfoNote message="cliInfo" />
    <div class="backdrop">
      <div class="window" bind:this={windowEl}>
        <div class="wrapper" bind:this={wrapperEl}></div>
      </div>
    </div>
    <textarea
      bind:this={textareaEl}
      name="commands"
      rows="1"
      placeholder={$i18n.t("cliInputPlaceholder")}></textarea>
  </div>
</Page>

<dialog class="preview-dialog" bind:this={previewDialogEl}>
  <h3>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html $i18n.t("cliConfirmSnippetDialogTitle", { fileName: previewFile })}
  </h3>
  <InfoNote message="cliConfirmSnippetNote" />
  <textarea class="preview" rows="20" bind:value={previewText}></textarea>
  <div class="buttons">
    <button class="btn" onclick={() => previewDialogEl.close()}>
      {$i18n.t("cancel")}
    </button>
    <button class="btn" onclick={onExecuteSnippet}>
      {$i18n.t("cliConfirmSnippetBtn")}
    </button>
  </div>
</dialog>

<dialog bind:this={exitDialogEl}>
  <h3>{$i18n.t("dialogCLIExitTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("dialogCLIExitNote")}</p>
  </div>
  <div class="buttons">
    <button class="btn" onclick={() => exitDialogEl.close()}>
      {$i18n.t("dialogCLIExitButton")}
    </button>
  </div>
</dialog>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .btn {
    @extend %button;
  }

  .cli {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: calc(100vh - 360px);
    min-height: 320px;
    padding-top: var(--section-gap);
  }

  /* A terminal, so it stays dark in both themes. */
  .backdrop {
    flex-grow: 1;
    min-height: 0;
    border: 1px solid var(--chrome-border);
    border-radius: var(--radius-md);
    background-color: hsl(208, 12%, 8%);
    background-image: url("/images/light-wide-1.svg");
    background-repeat: no-repeat;
    background-position: 50% 80%;
    background-size: 600px;
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

    :global(*) {
      user-select: text;
    }

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
    padding: 8px 12px;
    border: 1px solid var(--chrome-border);
    border-radius: var(--radius-md);
    background-color: hsl(208, 12%, 8%);
    color: hsl(208, 14%, 90%);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.55;
    resize: none;
  }

  textarea[name="commands"] {
    height: 100px;
  }

  .preview-dialog {
    width: min(60em, 90vw);
  }

  dialog h3 {
    margin-bottom: 0.5em;
  }

  dialog .preview {
    margin-top: 8px;
  }

  dialog .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 1em;
  }

  /* Autocomplete dropdown, appended to the page by the CLI engine */
  :global(.cli-textcomplete-dropdown) {
    max-height: 50%;
    margin: 0;
    padding: 4px;
    overflow: auto;
    list-style: none;
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface-float);
    box-shadow: var(--shadow-md);
  }

  :global(.cli-textcomplete-dropdown li) {
    padding: 3px 8px;
    border-radius: var(--radius-xs);
  }

  :global(.cli-textcomplete-dropdown .active) {
    background-color: var(--color-accent-500);
  }

  :global(.cli-textcomplete-dropdown .active a) {
    color: var(--color-accent-fg);
  }

  :global(.cli-textcomplete-dropdown a) {
    font-family: var(--font-mono);
    cursor: pointer;
  }
</style>

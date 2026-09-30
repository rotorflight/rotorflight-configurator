<script>
  import DOMPurify from "dompurify";
  import { marked } from "marked";

  import MultiSelect from "@/components/MultiSelect.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { i18n as legacyI18n } from "@/js/localization.js";

  import PresetCard from "./PresetCard.svelte";

  const GROUP_DELIMITER = ":";

  let { tracker } = $props();

  let dialog;
  let resolveShow;

  let source = $state(null);
  /** @type {?import("@/js/presets/source/preset_instance.js").default} */
  let instance = $state.raw(null);
  let showSource = $state(true);
  let loading = $state(true);
  let error = $state("");
  let showCli = $state(false);
  let optionsShown = false;
  let picked = false;

  let optionValues = $state([]);
  let cliText = $state("");

  const preset = $derived(instance?.presetData);

  const optionItems = $derived(
    (preset?.options ?? []).map((option) =>
      option.options
        ? {
            label: option.name,
            exclusive: option.isExclusive,
            options: option.options.map((o) => ({
              value: option.name + GROUP_DELIMITER + o.name,
              label: o.name,
            })),
          }
        : { value: option.name, label: option.name },
    ),
  );

  const description = $derived.by(() => {
    const text = preset?.description?.join("\n") ?? "";
    if (preset?.parser === "MARKED") {
      const html = DOMPurify.sanitize(marked.parse(text));
      return {
        html: html.replaceAll(
          "<a ",
          '<a target="_blank" rel="noopener noreferrer" ',
        ),
      };
    }
    return { text };
  });

  function defaultOptionValues() {
    const values = [];
    for (const option of preset.options) {
      if (option.options) {
        for (const o of option.options) {
          if (o.checked) values.push(option.name + GROUP_DELIMITER + o.name);
        }
      } else if (option.checked) {
        values.push(option.name);
      }
    }
    return values;
  }

  function render() {
    instance.optionsValues = optionValues;
    instance.renderedCliArr = source.retriever.parser.renderPreset(
      instance.cliStringsArr,
      optionValues,
    );
    cliText = instance.renderedCliArr.join("\n");
  }

  /**
   * Shows the preset; resolves with whether it was picked.
   * @returns {Promise<boolean>}
   */
  export function show(presetSource, presetInstance, withSource = true) {
    source = presetSource;
    instance = presetInstance;
    showSource = withSource;
    loading = true;
    error = "";
    showCli = false;
    optionsShown = false;
    picked = false;
    dialog.showModal();

    source.retriever
      .loadPreset(instance)
      .then(() => {
        optionValues = instance.optionsValues ?? defaultOptionValues();
        render();
        loading = false;
      })
      .catch((err) => {
        console.error(err);
        error = $i18n.t("presetsLoadError");
      });

    return new Promise((resolve) => (resolveShow = resolve));
  }

  function versionCompatible() {
    return preset.firmware_version.some((fw) =>
      FC.CONFIG.flightControllerVersion.startsWith(fw),
    );
  }

  function onApply() {
    if (preset.force_options_review && !optionsShown) {
      alert($i18n.t("presetsReviewOptionsWarning"));
      return;
    }
    if (instance.completeWarning && !confirm(instance.completeWarning)) {
      return;
    }
    if (
      !versionCompatible() &&
      !confirm(
        legacyI18n.getMessage("presetsWarningWrongVersionConfirmation", [
          preset.firmware_version,
          FC.CONFIG.flightControllerVersion,
        ]),
      )
    ) {
      return;
    }
    picked = true;
    dialog.close();
  }

  function onClose() {
    resolveShow?.(picked);
    resolveShow = null;
  }
</script>

<dialog class="preset-dialog" bind:this={dialog} onclose={onClose}>
  {#if instance}
    <div class="body">
      <PresetCard {preset} {source} {tracker} {showSource} />

      {#if error}
        <p class="error">{error}</p>
      {:else if loading}
        <div class="spinner"></div>
      {:else}
        {#if optionItems.length > 0}
          <div class="options">
            <span class="options-label">{$i18n.t("presetOptions")}</span>
            <MultiSelect
              items={optionItems}
              bind:selected={optionValues}
              placeholder={$i18n.t("presetOptionsPlaceholder")}
              maxLabels={128}
              clearable={false}
              onchange={render}
              onopen={() => (optionsShown = true)}
            />
          </div>
        {/if}

        <div class="text">
          {#if showCli}
            <pre class="cli">{cliText}</pre>
          {:else if description.html !== undefined}
            <div class="markdown">
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html description.html}
            </div>
          {:else}
            <pre class="plain">{description.text}</pre>
          {/if}
        </div>
      {/if}
    </div>

    <div class="buttons">
      <button
        class="btn"
        disabled={loading}
        onclick={() => (showCli = !showCli)}
      >
        {$i18n.t(showCli ? "presetsHideCli" : "presetsShowCli")}
      </button>
      <a
        class="btn"
        href={instance.viewLink}
        target="_blank"
        rel="noopener noreferrer">{$i18n.t("presetsViewOnline")}</a
      >
      {#if preset.discussion}
        <a
          class="btn"
          href={preset.discussion}
          target="_blank"
          rel="noopener noreferrer">{$i18n.t("presetsOpenDiscussion")}</a
        >
      {/if}
      <span class="grow"></span>
      <button class="btn" onclick={() => dialog.close()}>
        {$i18n.t("close")}
      </button>
      <button
        class="btn primary"
        disabled={loading || !!error}
        onclick={onApply}
      >
        {$i18n.t("presetsApply")}
      </button>
    </div>
  {/if}
</dialog>

<style lang="scss">
  .preset-dialog {
    width: min(56rem, 92vw);
    max-height: 90vh;
    padding: 0;
    overflow: hidden;

    &[open] {
      display: flex;
      flex-direction: column;
    }
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    padding: 16px 18px;
    overflow-y: auto;
  }

  .options {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .text {
    font-size: 0.82rem;
    line-height: 1.5;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
  }

  .cli {
    padding: 10px 12px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    border-radius: var(--radius-sm);
    background-color: var(--color-neutral-100);
  }

  :global(html[data-theme="dark"]) .cli {
    background-color: var(--color-neutral-800);
  }

  .markdown :global(img) {
    max-width: 100%;
  }

  .error {
    color: var(--color-danger);
    font-weight: 600;
  }

  .spinner {
    height: 64px;
    background: url("/images/loading-spin.svg") no-repeat center;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-top: 1px solid var(--color-border-soft);
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
    text-decoration: none;
  }

  .primary {
    @extend %button-primary;
  }
</style>

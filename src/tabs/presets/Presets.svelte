<script>
  import { onMount } from "svelte";

  import MultiSelect from "@/components/MultiSelect.svelte";
  import Page from "@/components/Page.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import CliEngine from "@/js/cli_engine.js";
  import { config } from "@/js/config.svelte.ts";
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import * as filesystem from "@/js/filesystem.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { generateFilename } from "@/js/main.js";
  import PresetInstance from "@/js/presets/source/preset_instance.js";

  import CliDialog from "./CliDialog.svelte";
  import PresetCard from "./PresetCard.svelte";
  import PresetDialog from "./PresetDialog.svelte";
  import ReviewDialog from "./ReviewDialog.svelte";
  import SourcesDialog from "./SourcesDialog.svelte";
  import {
    MAX_PRESETS_SHOWN,
    isPicked,
    searchPresets,
    uniqueValues,
  } from "./search.js";
  import {
    activeSources,
    isThirdPartyActive,
    loadSourcesMetadata,
  } from "./sources.js";
  import { ReactivePresetTracker } from "./tracker.svelte.js";

  const engine = new CliEngine();
  engine.setProgressCallback((value) => (cli.progress = value));

  const tracker = new ReactivePresetTracker();

  let presetDialog;
  let sourcesDialog;
  let reviewDialog;
  let cliDialog;
  let snippetDialog;

  // Source repositories (metadata) and the loaded active ones.
  let sourcesMetadata = $state.raw(loadSourcesMetadata());
  let sources = $state.raw([]);
  let loadState = $state("loading");
  let failedRepos = $state.raw([]);
  const thirdPartyActive = $derived(isThirdPartyActive(sourcesMetadata));

  let showBackupWarning = $state(config.showPresetsWarningBackup);

  // Presets picked for applying.
  let picked = $state.raw([]);

  // Search filters.
  let filter = $state({
    categories: [],
    keywords: [],
    authors: [],
    firmwareVersions: [],
    status: [],
  });
  let searchText = $state("");

  const filterFields = [
    { key: "categories", label: "presetsFilterCategory", maxLabels: 3 },
    { key: "keywords", label: "presetsFilterKeyword", maxLabels: 3 },
    { key: "authors", label: "presetsFilterAuthor", maxLabels: 1 },
    { key: "firmwareVersions", label: "presetsFilterFirmware", maxLabels: 2 },
    { key: "status", label: "presetsFilterStatus", maxLabels: 2 },
  ];

  const filterValues = $derived({
    categories: uniqueValues(sources, (s) => s.index.uniqueValues.category),
    keywords: uniqueValues(sources, (s) => s.index.uniqueValues.keywords),
    authors: uniqueValues(sources, (s) => s.index.uniqueValues.author),
    firmwareVersions: uniqueValues(
      sources,
      (s) => s.index.uniqueValues.firmware_version,
    ),
    status: uniqueValues(sources, (s) => s.index.settings.PresetStatusEnum),
  });

  const results = $derived(
    loadState === "ready"
      ? searchPresets(
          sources,
          { ...filter, searchString: searchText.trim() },
          picked,
          tracker,
        )
      : [],
  );

  // CLI dialog state, and what its save button does.
  let cli = $state({
    title: "",
    progress: null,
    showInput: false,
    showErrorsWarning: false,
    buttonsVisible: false,
    buttonsDisabled: false,
  });
  let cliOnSave = () => {};
  let cliActive = false;

  let previewText = $state("");
  let resetOnPreviewClose = false;

  onMount(loadPresets);

  async function loadPresets() {
    loadState = "loading";
    const candidates = activeSources(sourcesMetadata);
    const failed = [];
    for (const source of candidates) {
      try {
        await source.loadData();
      } catch (err) {
        console.error(err);
        failed.push(source);
      }
    }
    failedRepos = failed.map((s) => s.metadata.name);
    try {
      sources = candidates.filter((s) => !failed.includes(s));
      const version = FC.CONFIG.flightControllerVersion;
      filter.firmwareVersions = uniqueValues(
        sources,
        (s) => s.index.uniqueValues.firmware_version,
      ).filter((v) => version.startsWith(v));
      loadState = "ready";
    } catch (err) {
      console.error(err);
      loadState = "error";
    }
  }

  function resetPicked() {
    picked = [];
  }

  async function onCardClick({ preset, source }) {
    const instance = new PresetInstance(source.metadata, preset);
    if (await presetDialog.show(source, instance, true)) {
      picked = [...picked, instance];
    }
  }

  /** Edits a picked preset from the review dialog. */
  async function onEditPicked(instance) {
    const source = sources.find(
      (s) => s.rawUrl === instance.sourceMetadata.rawUrl,
    );
    if (source) {
      await presetDialog.show(source, instance, true);
    }
  }

  async function onSourcesClick() {
    await sourcesDialog.show();
    resetPicked();
    await loadPresets();
  }

  function onHideBackupWarning() {
    showBackupWarning = false;
    config.showPresetsWarningBackup = false;
  }

  function onReviewApply() {
    for (const instance of picked) {
      if (instance.sourceMetadata) {
        tracker.add(instance.viewLink);
      }
    }
    showPreview(pickedCli(), false);
  }

  function pickedCli() {
    return picked
      .flatMap((pi) => pi.renderedCliArr)
      .filter((command) => command.trim() !== "");
  }

  function showPreview(commands, resetOnClose) {
    previewText = commands.join("\n");
    resetOnPreviewClose = resetOnClose;
    snippetDialog.showModal();
  }

  function onPreviewClose() {
    if (resetOnPreviewClose) {
      resetPicked();
    }
  }

  async function onBackupLoad() {
    try {
      const file = await filesystem.readTextFile({
        description: "Backup Files",
        extensions: [".txt", ".config"],
      });
      if (!file) return;

      const instance = new PresetInstance();
      instance.renderedCliArr = file.content.split("\n");
      picked = [...picked, instance];
      showPreview(pickedCli(), true);
    } catch (err) {
      console.error("Failed to load config", err);
    }
  }

  // --- CLI -----------------------------------------------------------------

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function activateCli() {
    CONFIGURATOR.cliEngineActive = true;
    CONFIGURATOR.cliTab = "presets";
    cliActive = true;
    engine.setUi(...cliDialog.ui());
    engine.enterCliMode();
    // give the FC a moment to enter CLI mode
    await delay(1000);
  }

  function openCli(title) {
    cli = {
      title,
      progress: null,
      showInput: false,
      showErrorsWarning: false,
      buttonsVisible: false,
      buttonsDisabled: false,
    };
    cliDialog.open();
  }

  /** Leaving the CLI makes the FC reboot, so disconnect afterwards. */
  function onCliClose() {
    if (!cliActive) return;
    cliActive = false;
    engine.sendLine("exit");
    GUI.timeout_add(
      "disconnect",
      () => globalThis.$("div.connect_controls a.connect").trigger("click"),
      500,
    );
  }

  async function onExecuteSnippet() {
    const commands = previewText;
    resetOnPreviewClose = false;
    snippetDialog.close();

    openCli($i18n.t("presetsApplyingPresets"));
    await activateCli();
    cli.progress = 0;

    const initialErrors = engine.errorsCount;
    await engine.executeCommands(commands);
    const errors = engine.errorsCount !== initialErrors;

    cli.progress = null;
    cli.showInput = errors;
    cli.showErrorsWarning = errors;
    cli.buttonsVisible = true;
    cliOnSave = () => {
      engine.subscribeResponseCallback(() => {
        engine.unsubscribeResponseCallback();
        if (engine.inBatchMode && errors) {
          // After batch errors the firmware wants a second "save" as a
          // safety check; the user has already seen the errors here.
          engine.sendLine("save");
        }
      });
      engine.sendLine("save");
      cliDialog.close();
    };
  }

  function readBackup(command) {
    let lastReceived = performance.now();
    engine.subscribeResponseCallback(() => (lastReceived = performance.now()));
    engine.sendLine(command);

    // done once the output has been quiet for half a second
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (performance.now() - lastReceived > 500) {
          clearInterval(timer);
          engine.unsubscribeResponseCallback();
          resolve();
        }
      }, 500);
    });
  }

  async function onBackupSave(type) {
    openCli($i18n.t(type === "diff" ? "backupDiffAll" : "backupDumpAll"));
    cli.buttonsVisible = true;
    cli.buttonsDisabled = true;
    cliOnSave = async () => {
      try {
        await filesystem.writeTextFile(engine.outputHistory, {
          suggestedName: generateFilename(`backup_${type}`, "txt"),
          description: "TXT files",
        });
      } catch (err) {
        console.error("Failed to save backup", err);
        alert($i18n.t("backupFailedToSave"));
      }
      cliDialog.close();
    };

    await activateCli();
    await readBackup(type === "diff" ? "diff all" : "dump all");
    cli.buttonsDisabled = false;
  }

  /** Serial data while the CLI is active (called from serial_backend). */
  export function read(info) {
    engine.readSerial(info);
  }

  export function close(callback) {
    const wasActive =
      CONFIGURATOR.connectionValid &&
      CONFIGURATOR.cliEngineActive &&
      CONFIGURATOR.cliEngineValid;
    cliActive = false;
    const done = () => {
      CONFIGURATOR.cliEngineActive = false;
      CONFIGURATOR.cliEngineValid = false;
      CONFIGURATOR.cliTab = "";
      callback?.();
    };
    if (wasActive) {
      engine.close(done);
    } else {
      done();
    }
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabPresets")}</h1>
  <div class="grow"></div>
  <button class="btn" disabled={picked.length > 0} onclick={onSourcesClick}>
    {$i18n.t("presetSources")}
  </button>
  <span class="divider"></span>
  <button
    class="btn"
    onclick={() => window.open(getTabHelpURL("tabPresets"), "_system")}
  >
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" disabled={picked.length > 0} onclick={onBackupLoad}>
    {$i18n.t("backupLoad")}
  </button>
  <button
    class="btn"
    disabled={picked.length > 0}
    onclick={() => onBackupSave("diff")}
  >
    {$i18n.t("backupDiffAll")}
  </button>
  <button
    class="btn"
    disabled={picked.length > 0}
    onclick={() => onBackupSave("dump")}
  >
    {$i18n.t("backupDumpAll")}
  </button>
  <span class="grow"></span>
  <button class="btn" disabled={picked.length === 0} onclick={resetPicked}>
    {$i18n.t("presetsButtonReset")}
  </button>
  <button
    class="btn primary"
    disabled={picked.length === 0}
    onclick={() => reviewDialog.show()}
  >
    {$i18n.t("presetsButtonReview")}
    {#if picked.length > 0}<span class="count">{picked.length}</span>{/if}
  </button>
{/snippet}

<Page {header} {toolbar} loading={loadState === "loading"}>
  <div class="presets">
    {#if thirdPartyActive}
      <WarningNote message="presetsWarningNotOfficialSource" />
    {/if}
    {#if failedRepos.length > 0}
      <WarningNote>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html $i18n.t("presetsFailedToLoadRepositories", {
          repos: failedRepos.join(", "),
        })}
      </WarningNote>
    {/if}
    {#if showBackupWarning}
      <InfoNote>
        <div class="backup-warning">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <span>{@html $i18n.t("presetsWarningBackup")}</span>
          <button class="btn" onclick={onHideBackupWarning}>
            {$i18n.t("presetsDontShowAgain")}
          </button>
        </div>
      </InfoNote>
    {/if}

    {#if loadState === "error"}
      <div class="load-error">
        <h3>{$i18n.t("presetsLoadError")}</h3>
        <button class="btn" onclick={loadPresets}>
          {$i18n.t("presetsReload")}
        </button>
      </div>
    {:else}
      <div class="search">
        <div class="filters">
          {#each filterFields as field (field.key)}
            <label class="filter">
              <span>{$i18n.t(field.label)}</span>
              <MultiSelect
                items={filterValues[field.key].map((v) => ({
                  value: v,
                  label: v,
                }))}
                bind:selected={filter[field.key]}
                placeholder={$i18n.t("dropDownFilterDisabled")}
                maxLabels={field.maxLabels}
              />
            </label>
          {/each}
        </div>
        <div class="search-field">
          <em class="fas fa-search"></em>
          <input
            type="text"
            bind:value={searchText}
            placeholder={$i18n.t("presetsSearchPlaceholder")}
          />
        </div>
      </div>

      {#if results.length === 0}
        <p class="empty">{$i18n.t("presetsNoPresetsFound")}</p>
      {:else}
        <div class="grid">
          {#each results.slice(0, MAX_PRESETS_SHOWN) as entry (entry.preset.hash)}
            <PresetCard
              preset={entry.preset}
              source={entry.source}
              {tracker}
              picked={isPicked(entry.preset, entry.source, picked)}
              onclick={() => onCardClick(entry)}
            />
          {/each}
        </div>
        {#if results.length > MAX_PRESETS_SHOWN}
          <p class="empty">{$i18n.t("presetsTooManyPresetsFound")}</p>
        {/if}
      {/if}
    {/if}
  </div>

  <PresetDialog bind:this={presetDialog} {tracker} />
  <SourcesDialog bind:this={sourcesDialog} bind:sources={sourcesMetadata} />
  <ReviewDialog
    bind:this={reviewDialog}
    {picked}
    onedit={onEditPicked}
    onapply={onReviewApply}
    onchange={() => (picked = [...picked])}
  />
  <CliDialog
    bind:this={cliDialog}
    {...cli}
    onsave={() => cliOnSave()}
    onclose={onCliClose}
  />

  <dialog
    class="snippet-dialog"
    bind:this={snippetDialog}
    onclose={onPreviewClose}
  >
    <h3>{$i18n.t("presetsCliConfirmationDialogTitle")}</h3>
    <InfoNote message="cliConfirmSnippetNote" />
    <textarea rows="20" bind:value={previewText}></textarea>
    <div class="buttons">
      <button class="btn" onclick={() => snippetDialog.close()}>
        {$i18n.t("cancel")}
      </button>
      <button class="btn primary" onclick={onExecuteSnippet}>
        {$i18n.t("cliConfirmSnippetBtn")}
      </button>
    </div>
  </dialog>
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .divider {
    width: 1px;
    height: 1.2rem;
    background-color: var(--color-border-soft);
  }

  .btn {
    @extend %button;
  }

  .primary {
    @extend %button-primary;
  }

  .count {
    min-width: 1.1rem;
    padding: 0 5px;
    font-size: 0.7rem;
    line-height: 1.1rem;
    border-radius: 999px;
    color: var(--color-accent-500);
    background-color: var(--color-accent-fg);
  }

  .presets {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
    padding-top: var(--section-gap);
  }

  .backup-warning {
    display: flex;
    align-items: center;
    gap: 16px;

    span {
      flex-grow: 1;
    }
  }

  .search {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    box-shadow: var(--shadow-xs);
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 10px;
  }

  .filter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    span {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }
  }

  .search-field {
    position: relative;

    em {
      position: absolute;
      top: 50%;
      left: 10px;
      transform: translateY(-50%);
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    input {
      width: 100%;
      height: 2rem;
      padding-left: 30px;
      font-size: 0.85rem;
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(19rem, 1fr));
    gap: 10px;
  }

  .empty {
    margin: 8px 0;
    text-align: center;
    color: var(--color-text-muted);
  }

  .load-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px;
  }

  .snippet-dialog {
    width: min(56rem, 92vw);

    textarea {
      box-sizing: border-box;
      width: 100%;
      margin-top: 8px;
      padding: 8px 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--color-text);
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-sm);
      background-color: var(--color-input-bg);
      resize: vertical;
    }

    .buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 10px;
    }
  }
</style>

<script>
  import { tick } from "svelte";

  import WarningNote from "@/components/notes/WarningNote.svelte";

  import { i18n } from "@/js/i18n.js";
  import GithubUtil from "@/js/presets/source/github.js";

  import { newSourceMetadata, saveSourcesMetadata } from "./sources.js";

  /** sources: Metadata[] (the official one first), changed in place. */
  let { sources = $bindable() } = $props();

  let dialog;
  let listEl;
  let resolveShow;

  let selectedIndex = $state(-1);
  let edit = $state({ name: "", url: "", branch: "" });
  let edited = $state(false);

  const selected = $derived(sources[selectedIndex]);
  const isGithub = $derived(GithubUtil.isUrlGithubRepo(edit.url));

  /** Shows the dialog; resolves when it is closed. */
  export function show() {
    select(-1);
    dialog.showModal();
    return new Promise((resolve) => (resolveShow = resolve));
  }

  function select(index) {
    selectedIndex = index;
    const m = sources[index];
    edit = { name: m?.name ?? "", url: m?.url ?? "", branch: m?.branch ?? "" };
    edited = false;
  }

  function commit() {
    sources = [...sources];
    saveSourcesMetadata(sources);
  }

  function onInput() {
    if (GithubUtil.containsBranchName(edit.url)) {
      edit.branch = GithubUtil.getBranchName(edit.url) ?? edit.branch;
      edit.url = edit.url.split("/tree/")[0];
    }
    edited = true;
  }

  function save() {
    selected.name = edit.name;
    selected.url = edit.url;
    selected.branch = edit.branch;
    edited = false;
    commit();
  }

  function setActive(active) {
    save();
    selected.active = active;
    commit();
  }

  function remove() {
    sources.splice(selectedIndex, 1);
    select(-1);
    commit();
  }

  async function addNew() {
    sources.push(
      newSourceMetadata($i18n.t("presetsSourcesDialogDefaultSourceName")),
    );
    commit();
    select(sources.length - 1);
    await tick();
    listEl.scrollTo({ top: listEl.scrollHeight, behavior: "smooth" });
  }

  function onClose() {
    resolveShow?.();
    resolveShow = null;
  }
</script>

<dialog class="sources-dialog" bind:this={dialog} onclose={onClose}>
  <h3>{$i18n.t("presetsSourcesDialogTitle")}</h3>
  <WarningNote message="presets_sources_dialog_warning" />

  <ul class="list" bind:this={listEl}>
    {#each sources as source, index (index)}
      <li class:selected={index === selectedIndex}>
        {#if index !== selectedIndex}
          <button type="button" class="row" onclick={() => select(index)}>
            <span
              class="state fas"
              class:fa-check-circle={source.official || source.active}
              class:fa-circle={!(source.official || source.active)}
              class:active={source.official || source.active}
            ></span>
            <span class="name">{source.name}</span>
          </button>
        {:else}
          <div class="editor">
            <label for="source-name"
              >{$i18n.t("presetsSourcesDialogName")}</label
            >
            <input
              id="source-name"
              type="text"
              bind:value={edit.name}
              oninput={onInput}
              disabled={source.official}
            />
            <label for="source-url">{$i18n.t("presetsSourcesDialogURL")}</label>
            <input
              id="source-url"
              type="text"
              bind:value={edit.url}
              oninput={onInput}
              disabled={source.official}
            />
            {#if isGithub}
              <label for="source-branch"
                >{$i18n.t("presetsSourcesDialogGithubBranch")}</label
              >
              <input
                id="source-branch"
                type="text"
                bind:value={edit.branch}
                oninput={onInput}
                disabled={source.official}
              />
            {/if}
          </div>
          {#if !source.official}
            <div class="row-buttons">
              {#if source.active}
                <button
                  class="btn"
                  disabled={edited}
                  onclick={() => setActive(false)}
                >
                  {$i18n.t("presetsSourcesDialogMakeSourceDisable")}
                </button>
              {:else}
                <button
                  class="btn"
                  disabled={edited}
                  onclick={() => setActive(true)}
                >
                  {$i18n.t("presetsSourcesDialogMakeSourceActive")}
                </button>
              {/if}
              <button class="btn" disabled={!edited} onclick={save}>
                {$i18n.t("presetsSourcesDialogSaveSource")}
              </button>
              <button
                class="btn"
                disabled={!edited}
                onclick={() => select(index)}
              >
                {$i18n.t("presetsSourcesDialogResetSource")}
              </button>
              <span class="grow"></span>
              <button class="btn danger" onclick={remove}>
                {$i18n.t("presetsSourcesDialogDeleteSource")}
              </button>
            </div>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>

  <div class="buttons">
    <button class="btn" onclick={addNew}>
      {$i18n.t("presetsSourcesDialogAddNew")}
    </button>
    <button class="btn primary" onclick={() => dialog.close()}>
      {$i18n.t("presetsSourcesDialogConfirm")}
    </button>
  </div>
</dialog>

<style lang="scss">
  .sources-dialog {
    width: min(44rem, 92vw);
    max-height: 90vh;

    &[open] {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    margin: 0;
    padding: 2px;
    overflow-y: auto;
    list-style: none;
  }

  li {
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);

    &.selected {
      padding: 10px 12px;
      border-color: var(--color-border-accent);
    }
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    font: inherit;
    font-size: 0.85rem;
    text-align: left;
    color: var(--color-text);
    border: none;
    border-radius: inherit;
    background: none;
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        background-color: var(--color-input-bg-hover);
      }
    }
  }

  .state {
    color: var(--color-text-disabled);

    &.active {
      color: var(--color-success);
    }
  }

  .editor {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 6px 12px;
    font-size: 0.8rem;

    input {
      width: 100%;
    }
  }

  .row-buttons,
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .row-buttons {
    margin-top: 10px;
  }

  .buttons {
    justify-content: flex-end;
  }

  .grow {
    flex-grow: 1;
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

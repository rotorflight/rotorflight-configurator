<script>
  import { tick } from "svelte";

  import { i18n } from "@/js/i18n.js";

  // groups: [{ label, modes: [{ value, label, description }] }], only the
  // modes not already on the page.
  let { groups, onSelect } = $props();

  let dialogEl;
  let searchEl = $state();
  let query = $state("");

  let filtered = $derived.by(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return groups;
    return groups
      .map((group) => ({
        ...group,
        modes: group.modes.filter((mode) => {
          const haystack =
            `${mode.label} ${mode.description} ${group.label}`.toLowerCase();
          return terms.every((term) => haystack.includes(term));
        }),
      }))
      .filter((group) => group.modes.length > 0);
  });

  // A native <dialog> centers against the nearest transformed ancestor, and
  // #content carries a (no-op) transform, so live under <body> instead.
  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  export async function open() {
    query = "";
    dialogEl.showModal();
    await tick();
    searchEl?.focus();
  }

  function pick(mode) {
    dialogEl.close();
    onSelect?.(mode.value);
  }

  function onDialogClick(e) {
    // A click on the backdrop lands on the <dialog> element itself.
    if (e.target === dialogEl) dialogEl.close();
  }

  function onSearchKeydown(e) {
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      pick(filtered[0].modes[0]);
    }
  }
</script>

<dialog bind:this={dialogEl} use:portal onclick={onDialogClick}>
  <div class="head">
    <h3>{$i18n.t("auxiliaryAddModeTitle")}</h3>
    <input
      bind:this={searchEl}
      bind:value={query}
      type="text"
      class="search"
      autocomplete="off"
      spellcheck="false"
      placeholder={$i18n.t("auxiliaryAddModeSearch")}
      onkeydown={onSearchKeydown}
    />
    <button
      class="close"
      onclick={() => dialogEl.close()}
      aria-label={$i18n.t("close")}
    >
      <span class="fas fa-times"></span>
    </button>
  </div>

  <div class="body">
    {#each filtered as group (group.label)}
      <section>
        <h4>{group.label}</h4>
        <div class="tiles">
          {#each group.modes as mode (mode.value)}
            <button class="tile" onclick={() => pick(mode)}>
              <span class="name">{mode.label}</span>
              {#if mode.description}
                <span class="desc">{mode.description}</span>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    {:else}
      <p class="empty">{$i18n.t("auxiliaryAddModeNoMatches")}</p>
    {/each}
  </div>
</dialog>

<style lang="scss">
  dialog {
    width: 46em;
    max-width: calc(100vw - 2em);
    max-height: calc(100vh - 4em);
    padding: 0;
    border-radius: var(--radius-lg);
    overflow: hidden;

    &[open] {
      display: flex;
      flex-direction: column;
    }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 16px;
    border-bottom: 1px solid var(--color-border);
  }

  h3 {
    margin: 0;
    flex: none;
  }

  .search {
    flex: 1;
    min-width: 0;
    height: 1.75rem;
    padding: 0 8px;
    font-size: 0.8rem;
  }

  .close {
    flex: none;
    background: none;
    border: none;
    padding: 4px 6px;
    font-size: 0.9rem;
    cursor: pointer;
    color: var(--color-text-soft);

    @media (hover: hover) {
      &:hover {
        color: var(--color-text);
      }
    }
  }

  .body {
    overflow-y: auto;
    padding: 4px 16px 16px;
  }

  h4 {
    margin: 12px 0 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-soft);
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }

  .tile {
    @extend %button;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    height: auto;
    padding: 8px 10px;
    text-align: left;
    white-space: normal;
  }

  .name {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.7rem;
    font-weight: 400;
    opacity: 0.75;
  }

  .empty {
    margin: 16px 0 0;
    font-size: 0.8rem;
    font-style: italic;
    color: var(--color-text-soft);
  }
</style>

<script>
  import { tick } from "svelte";

  import { i18n } from "@/js/i18n.js";

  // A modal overlay for choosing one item out of a grouped list: tiles under
  // group headings, with a search box that filters by label, description
  // and group. Call open() to show it; onSelect gets the picked value.
  //
  // groups: [{ label, items: [{ value, label, description?, badge? }] }]
  let { title, groups, searchPlaceholder, noMatchesText, onSelect } = $props();

  let dialogEl;
  let searchEl = $state();
  let query = $state("");
  // The value already chosen, if any (e.g. when changing a selection), so
  // its tile can be marked.
  let current = $state(null);

  let filtered = $derived.by(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack =
            `${item.label} ${item.description ?? ""} ${group.label}`.toLowerCase();
          return terms.every((term) => haystack.includes(term));
        }),
      }))
      .filter((group) => group.items.length > 0);
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

  export async function open(selected = null) {
    current = selected;
    query = "";
    dialogEl.showModal();
    await tick();
    searchEl?.focus();
  }

  function pick(item) {
    dialogEl.close();
    onSelect?.(item.value);
  }

  function onDialogClick(e) {
    // A click on the backdrop lands on the <dialog> element itself.
    if (e.target === dialogEl) dialogEl.close();
  }

  function onSearchKeydown(e) {
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      pick(filtered[0].items[0]);
    }
  }
</script>

<dialog bind:this={dialogEl} use:portal onclick={onDialogClick}>
  <div class="head">
    <h3>{title}</h3>
    <input
      bind:this={searchEl}
      bind:value={query}
      type="text"
      class="search"
      autocomplete="off"
      spellcheck="false"
      placeholder={searchPlaceholder}
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
          {#each group.items as item (item.value)}
            <button
              class="tile"
              class:current={item.value === current}
              onclick={() => pick(item)}
            >
              <span class="name">
                {item.label}
                {#if item.badge}
                  <span class="badge">{item.badge}</span>
                {/if}
              </span>
              {#if item.description}
                <span class="desc">{item.description}</span>
              {/if}
            </button>
          {/each}
        </div>
      </section>
    {:else}
      <p class="empty">{noMatchesText}</p>
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

  .tile.current {
    border-color: var(--color-border-accent);
    box-shadow: 0 0 0 2px var(--color-focus-ring);
  }

  .name {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badge {
    margin-left: 4px;
    font-size: 0.65rem;
    font-weight: 400;
    opacity: 0.7;
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

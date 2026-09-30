<script>
  // A <select> replacement for long option lists: clicking (or just typing
  // on) the closed control opens a panel with a filter box above the list.
  // Every whitespace-separated word typed must appear in the option's label
  // or its group's label, so "pitch expo" or "rates" both narrow usefully.
  //
  // `items` is a flat [{ value, label, group? }] list; consecutive items
  // sharing a `group` render under one group heading, like an <optgroup>.
  //
  // The panel is moved to <body> and position: fixed against the viewport,
  // rather than absolute inside the control: an ancestor's overflow: hidden
  // (e.g. a rounded card) would clip it, and an ancestor with a transform,
  // filter or contain would turn "fixed" into "relative to that ancestor"
  // and offset it from the control.
  import { tick } from "svelte";

  let {
    id,
    value,
    items = [],
    disabled = false,
    placeholder = "",
    noMatchesText = "",
    onchange,
  } = $props();

  const PANEL_MAX_HEIGHT = 340;
  const PANEL_MIN_WIDTH = 260;
  const VIEWPORT_MARGIN = 8;

  let open = $state(false);
  let query = $state("");
  let highlighted = $state(0);
  let panelStyle = $state("");

  let triggerEl = $state();
  let panelEl = $state();
  let inputEl = $state();
  let listEl = $state();

  let listId = $derived(`${id}-listbox`);

  let selected = $derived(items.find((item) => item.value === value));

  let filtered = $derived.by(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return items;
    }
    return items.filter((item) => {
      const haystack = `${item.label} ${item.group ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  });

  function place() {
    if (!triggerEl) {
      return;
    }
    // The web build's UI zoom setting is CSS zoom on <body> (gui.js). The
    // panel lives inside <body>, so its left/top/size get scaled by that
    // zoom, while getBoundingClientRect() and innerWidth/Height are already
    // in on-screen pixels - convert everything into body's zoomed units.
    const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
    const r = triggerEl.getBoundingClientRect();
    const rect = {
      left: r.left / zoom,
      top: r.top / zoom,
      bottom: r.bottom / zoom,
      width: r.width / zoom,
    };
    const viewWidth = window.innerWidth / zoom;
    const viewHeight = window.innerHeight / zoom;

    const spaceBelow = viewHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const width = Math.max(rect.width, PANEL_MIN_WIDTH);
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, viewWidth - width - VIEWPORT_MARGIN),
    );
    const dropUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      PANEL_MAX_HEIGHT,
      dropUp ? spaceAbove : spaceBelow,
    );
    const vertical = dropUp
      ? `bottom: ${viewHeight - rect.top + 2}px`
      : `top: ${rect.bottom + 2}px`;
    panelStyle = `left: ${left}px; ${vertical}; width: ${width}px; max-height: ${maxHeight}px;`;
  }

  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  function scrollHighlightedIntoView() {
    listEl
      ?.querySelector(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  async function openPanel(seed = "") {
    if (disabled || open) {
      return;
    }
    query = seed;
    const selectedIndex = seed
      ? -1
      : filtered.findIndex((item) => item.value === value);
    highlighted = Math.max(0, selectedIndex);
    place();
    open = true;
    await tick();
    inputEl?.focus();
    scrollHighlightedIntoView();
  }

  function close(refocus = true) {
    if (!open) {
      return;
    }
    open = false;
    query = "";
    if (refocus) {
      triggerEl?.focus();
    }
  }

  function choose(item) {
    close();
    if (item && item.value !== value) {
      onchange?.(item.value);
    }
  }

  async function moveHighlight(delta) {
    if (filtered.length === 0) {
      return;
    }
    highlighted = (highlighted + delta + filtered.length) % filtered.length;
    await tick();
    scrollHighlightedIntoView();
  }

  function onTriggerKeydown(e) {
    if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      openPanel();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Start typing on the closed control and it opens pre-filtered.
      e.preventDefault();
      openPanel(e.key);
    }
  }

  function onInputKeydown(e) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveHighlight(-1);
        break;
      case "Enter":
        e.preventDefault();
        choose(filtered[highlighted]);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  function onInput() {
    highlighted = 0;
    listEl?.scrollTo({ top: 0 });
  }

  function onWindowPointerdown(e) {
    if (
      open &&
      !panelEl?.contains(e.target) &&
      !triggerEl?.contains(e.target)
    ) {
      close(false);
    }
  }

  // Keep the fixed panel attached to the control while anything scrolls
  // (capture phase, so scrolling containers - not just the window - count).
  $effect(() => {
    if (!open) {
      return;
    }
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  });
</script>

<svelte:window onpointerdown={onWindowPointerdown} />

<button
  bind:this={triggerEl}
  {id}
  type="button"
  class="trigger"
  class:open
  {disabled}
  aria-haspopup="listbox"
  aria-expanded={open}
  onclick={() => (open ? close() : openPanel())}
  onkeydown={onTriggerKeydown}
>
  <span class="trigger-label">{selected?.label ?? ""}</span>
</button>

{#if open}
  <div bind:this={panelEl} use:portal class="panel" style={panelStyle}>
    <input
      bind:this={inputEl}
      bind:value={query}
      type="text"
      class="search"
      role="combobox"
      autocomplete="off"
      spellcheck="false"
      aria-expanded="true"
      aria-controls={listId}
      aria-activedescendant={filtered.length
        ? `${listId}-${highlighted}`
        : undefined}
      {placeholder}
      oninput={onInput}
      onkeydown={onInputKeydown}
    />
    <ul bind:this={listEl} id={listId} class="list" role="listbox">
      {#each filtered as item, i (item.value)}
        {#if item.group && item.group !== filtered[i - 1]?.group}
          <li class="group" role="presentation">{item.group}</li>
        {/if}
        <!-- Keyboard selection lives on the search input (arrows + Enter,
             tracked via aria-activedescendant), the standard combobox
             pattern, so options only need the pointer handlers. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id="{listId}-{i}"
          data-index={i}
          class="option"
          class:grouped={!!item.group}
          class:highlighted={i === highlighted}
          class:selected={item.value === value}
          role="option"
          aria-selected={item.value === value}
          onpointermove={() => (highlighted = i)}
          onclick={() => choose(item)}
        >
          {item.label}
        </li>
      {:else}
        <li class="empty" role="presentation">{noMatchesText}</li>
      {/each}
    </ul>
  </div>
{/if}

<style lang="scss">
  /* Drawn to match the global <select> styling (same height, border, focus
     ring and chevron) so it sits in a form like any other dropdown. */
  .trigger {
    display: flex;
    align-items: center;
    width: 100%;
    height: 1.5rem;
    min-width: 120px;
    margin: 0;
    padding: 0 26px 0 8px;
    font: inherit;
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-sm);

    color: var(--color-text);
    background-color: var(--color-input-bg);
    border: 1px solid var(--color-border-soft);
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='%238a8f98' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 12px 12px;
    transition:
      border-color var(--animation-speed),
      box-shadow var(--animation-speed);

    &:hover:not(:disabled) {
      border-color: var(--color-border);
    }

    &:focus-visible,
    &.open {
      outline: none;
      border-color: var(--color-border-accent);
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    &:disabled {
      cursor: not-allowed;
    }

    @media only screen and (max-width: 480px) {
      height: 2rem;
    }
  }

  .trigger-label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .panel {
    position: fixed;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--radius-sm);

    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
  }

  .search {
    flex-shrink: 0;
    margin: 6px;
    height: 1.75rem;
    padding: 0 8px;
    font-size: 0.8rem;
  }

  .list {
    flex: 1;
    margin: 0;
    padding: 0 0 4px;
    overflow-y: auto;
    list-style: none;
  }

  .group {
    padding: 6px 10px 2px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text-soft);
  }

  .option {
    padding: 4px 10px;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text);

    &.grouped {
      padding-left: 20px;
    }

    &.selected {
      font-weight: 700;
    }

    &.highlighted {
      background-color: var(--color-accent-soft);
    }
  }

  .empty {
    padding: 8px 10px;
    font-size: 0.8rem;
    font-style: italic;
    color: var(--color-text-soft);
  }
</style>

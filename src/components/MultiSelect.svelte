<!--
  Dropdown with a checkbox list. `items` holds options ({ value, label })
  and groups ({ label, exclusive, options: [...] }); in an exclusive group
  at most one option can be checked.
-->
<script>
  import { i18n } from "@/js/i18n.js";

  let {
    items = [],
    selected = $bindable([]),
    placeholder = "",
    maxLabels = 3,
    clearable = true,
    disabled = false,
    onchange,
    onopen,
  } = $props();

  let open = $state(false);
  let root;

  const labels = $derived.by(() => {
    const byValue = {};
    for (const item of items) {
      for (const option of item.options ?? [item]) {
        byValue[option.value] = option.label;
      }
    }
    return selected.map((v) => byValue[v] ?? v);
  });

  const summary = $derived(
    labels.length === 0
      ? placeholder
      : labels.length <= maxLabels
        ? labels.join(", ")
        : `${labels.slice(0, maxLabels).join(", ")} +${labels.length - maxLabels}`,
  );

  function update(next) {
    selected = next;
    onchange?.(next);
  }

  function toggle(option, group) {
    if (selected.includes(option.value)) {
      update(selected.filter((v) => v !== option.value));
      return;
    }
    let next = selected;
    if (group?.exclusive) {
      const siblings = group.options.map((o) => o.value);
      next = next.filter((v) => !siblings.includes(v));
    }
    update([...next, option.value]);
  }

  function setOpen(value) {
    open = value;
    if (open) {
      onopen?.();
    }
  }

  function onWindowClick(e) {
    if (open && !root.contains(e.target)) {
      open = false;
    }
  }

  function onKeydown(e) {
    if (open && e.key === "Escape") {
      e.stopPropagation();
      open = false;
    }
  }
</script>

<svelte:window onclick={onWindowClick} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="multi-select" bind:this={root} onkeydown={onKeydown}>
  <button
    type="button"
    class="trigger"
    class:nonempty={selected.length > 0}
    class:open
    {disabled}
    title={labels.join(", ")}
    onclick={() => setOpen(!open)}
  >
    <span class="summary" class:placeholder={selected.length === 0}
      >{summary}</span
    >
  </button>

  {#if open}
    <div class="panel">
      {#if clearable && selected.length > 0}
        <button type="button" class="clear" onclick={() => update([])}>
          <em class="fas fa-times"></em>
          {$i18n.t("dropDownFilterDisabled")}
        </button>
      {/if}
      <ul>
        {#each items as item (item.value ?? item.label)}
          {#if item.options}
            <li class="group">{item.label}</li>
            {#each item.options as option (option.value)}
              <li>
                <label class="indented">
                  <input
                    type={item.exclusive ? "radio" : "checkbox"}
                    checked={selected.includes(option.value)}
                    onclick={(e) => {
                      e.preventDefault();
                      toggle(option, item);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              </li>
            {/each}
          {:else}
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(item.value)}
                  onchange={() => toggle(item)}
                />
                <span>{item.label}</span>
              </label>
            </li>
          {/if}
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style lang="scss">
  .multi-select {
    position: relative;
    min-width: 0;
  }

  .trigger {
    display: flex;
    align-items: center;
    width: 100%;
    height: 1.5rem;
    padding: 0 26px 0 8px;
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    color: var(--color-text);
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-sm);
    background-color: var(--color-input-bg);
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

    &.nonempty {
      border-color: var(--color-border-accent);
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--color-text-disabled);
      background-color: var(--color-input-bg-disabled);
    }
  }

  .summary {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .placeholder {
    color: var(--color-text-muted);
  }

  .panel {
    position: absolute;
    z-index: 50;
    top: calc(100% + 4px);
    left: 0;
    min-width: 100%;
    max-width: min(28rem, 80vw);
    max-height: 18rem;
    overflow-y: auto;
    padding: 4px;
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface-float);
    box-shadow: var(--shadow-md);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  label,
  .clear {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 8px;
    font-size: 0.8rem;
    border-radius: var(--radius-xs);
    cursor: pointer;

    &:hover {
      background-color: var(--color-hover-bg, var(--color-neutral-100));
    }
  }

  label.indented {
    padding-left: 16px;
  }

  label input {
    width: auto;
    height: auto;
    margin: 0;
    accent-color: var(--color-accent-500);
  }

  label span {
    white-space: nowrap;
  }

  .group {
    padding: 6px 8px 2px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .clear {
    border: none;
    background: none;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border-soft);
    border-radius: 0;
    margin-bottom: 4px;
  }
</style>

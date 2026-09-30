<script>
  import { i18n } from "@/js/i18n.js";

  /**
   * preset: PresetData, source: Source, tracker: ReactivePresetTracker.
   * Without `onclick` the card is a plain header (as in the preset dialog).
   */
  let {
    preset,
    source,
    tracker,
    picked = false,
    showSource = true,
    onclick,
  } = $props();

  const viewLink = $derived(source.metadata.viewUrl + preset.fullPath);
  const starred = $derived(!!tracker.find(viewLink));

  const rows = $derived(
    [
      ["presetCategory", preset.category],
      ["presetAuthor", preset.author],
      ["presetVersions", preset.firmware_version?.join(", ")],
      preset.board_name?.length > 0
        ? ["presetBoards", preset.board_name.join(", ")]
        : null,
      ["presetKeywords", preset.keywords?.join("; ")],
      showSource
        ? ["presetSource", `${source.metadata.name} – ${preset.status}`]
        : null,
    ].filter(Boolean),
  );

  function onStarClick(e) {
    e.stopPropagation();
    tracker.toggle(viewLink);
  }
</script>

<svelte:element
  this={onclick ? "button" : "div"}
  type={onclick ? "button" : undefined}
  class="card"
  class:clickable={!!onclick}
  class:picked
  {onclick}
>
  <div class="header">
    <span class="title" title={preset.title}>{preset.title}</span>
    {#if picked}
      <span class="picked-badge fas fa-check"></span>
    {/if}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      class="star {starred ? 'fas' : 'far'} fa-star"
      class:starred
      onclick={onStarClick}
    ></span>
  </div>
  <dl>
    {#each rows as [label, value] (label)}
      <dt>{$i18n.t(label)}</dt>
      <dd title={value}>{value}</dd>
    {/each}
  </dl>
</svelte:element>

<style lang="scss">
  .card {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
    padding: 0;
    text-align: left;
    font: inherit;
    color: var(--color-text);
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    box-shadow: var(--shadow-xs);
    transition:
      border-color var(--animation-speed),
      box-shadow var(--animation-speed);
  }

  .clickable {
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        border-color: var(--color-border-accent);
        box-shadow: var(--shadow-md);
      }
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }
  }

  .picked {
    border-color: var(--color-success);
    box-shadow: 0 0 0 1px var(--color-success);
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
    font-size: 0.9rem;
    font-weight: 600;
  }

  .picked-badge {
    color: var(--color-success);
  }

  .star {
    padding: 2px;
    font-size: 0.9rem;
    cursor: pointer;
    color: var(--color-text-muted);

    &.starred {
      color: var(--color-signal);
    }

    @media (hover: hover) {
      &:hover {
        color: var(--color-signal);
      }
    }
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
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>

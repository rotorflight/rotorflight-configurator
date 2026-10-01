<script>
  // A flat card for use inside a CollapsibleGroup: a tinted header row (the
  // `header` snippet) with a neutral left edge, above the body. While
  // `live`, the header gets a soft accent tint, an accent edge, accent text
  // and a live dot.
  let { live = false, header, children } = $props();
</script>

<div class="card">
  <div class="card-header" class:live>
    {#if live}
      <span class="live-dot"></span>
    {/if}
    {@render header?.()}
  </div>
  {@render children?.()}
</div>

<style lang="scss">
  .card {
    background-color: var(--color-surface);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 8px 0 12px;
    font-size: 0.85rem;
    font-weight: 600;
    /* A tinted band with a neutral edge even when idle, so each card's
       start is clear; live swaps both for the accent. */
    color: var(--color-text);
    background-color: var(--color-surface-sunken);
    border-bottom: 1px solid var(--color-border-soft);
    box-shadow: inset 4px 0 0 var(--color-neutral-400);
    transition:
      background-color var(--animation-speed),
      box-shadow var(--animation-speed);

    &.live {
      color: var(--color-accent-500);
      background-color: var(--color-accent-soft);
      box-shadow: inset 4px 0 0 var(--color-accent-500);
    }
  }

  .live-dot {
    flex: none;
    width: 8px;
    height: 8px;
    margin-right: 2px;
    border-radius: 50%;
    background-color: var(--color-accent-500);
  }
</style>

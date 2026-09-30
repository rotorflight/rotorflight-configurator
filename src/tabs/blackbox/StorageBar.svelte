<script>
  let { used, total, usedLabel, freeLabel, formatFn } = $props();

  let free = $derived(Math.max(total - used, 0));
  let usedPct = $derived(total > 0 ? (used / total) * 100 : 0);
</script>

{#if total > 0}
  <div class="bar">
    {#if used > 0}
      <div class="segment used" style="width: {usedPct}%">
        <span class="label">{usedLabel} {formatFn(used)}</span>
      </div>
    {/if}
    {#if free > 0}
      <div class="segment free" style="width: {100 - usedPct}%">
        <span class="label">{freeLabel} {formatFn(free)}</span>
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .bar {
    display: flex;
    margin-top: 12px;
    margin-bottom: 26px;
    height: 26px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    background-color: var(--color-surface-float, var(--color-surface));
  }

  .segment {
    position: relative;
    min-width: 0;
  }

  .used {
    background-color: var(--color-accent-500);
  }

  .label {
    position: absolute;
    top: 100%;
    margin-top: 4px;
    left: 0;
    right: 0;
    text-align: center;
    white-space: nowrap;
    font-size: 0.7rem;
    color: var(--color-text-soft);
  }

  .used .label {
    color: var(--color-text);
  }
</style>

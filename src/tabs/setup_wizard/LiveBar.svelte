<script>
  // A bar centred at 0, filled towards `f` (-1 to 1). `tone` colours the
  // fill: "good", "bad" or the accent colour.
  let { f = 0, tone = null } = $props();

  let clamped = $derived(Math.max(-1, Math.min(1, f || 0)));
</script>

<span class="track" aria-hidden="true">
  <span class="centre"></span>
  <span
    class={["fill", tone]}
    style:left={clamped >= 0 ? "50%" : `${50 + clamped * 50}%`}
    style:width="{Math.abs(clamped) * 50}%"
  ></span>
</span>

<style lang="scss">
  .track {
    position: relative;
    display: block;
    height: 12px;
    border-radius: var(--radius-pill);
    background-color: var(--color-border-soft);
    overflow: hidden;
  }

  .centre {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: var(--color-text-soft);
  }

  .fill {
    position: absolute;
    top: 0;
    bottom: 0;
    background-color: var(--color-accent-500);
    transition:
      left 0.1s linear,
      width 0.1s linear;

    &.good {
      background-color: var(--color-status-good);
    }

    &.bad {
      background-color: var(--color-status-bad);
    }
  }
</style>

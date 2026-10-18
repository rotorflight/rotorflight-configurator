<script>
  // A stick gimbal seen from above with the stick held at full deflection:
  // x 1 is right, y 1 is back (towards the pilot). Decorative; the
  // direction is written next to it.
  let { x = 0, y = 0 } = $props();

  const REACH = 7;
</script>

<svg
  viewBox="0 0 24 24"
  class="stick-icon"
  aria-hidden="true"
  focusable="false"
>
  <rect class="box" x="2" y="2" width="20" height="20" rx="4" />
  <line class="cross" x1="12" y1="5" x2="12" y2="19" />
  <line class="cross" x1="5" y1="12" x2="19" y2="12" />
  <line class="stick" x1="12" y1="12" x2={12 + x * REACH} y2={12 + y * REACH} />
  <circle class="knob" cx={12 + x * REACH} cy={12 + y * REACH} r="3" />
</svg>

<style lang="scss">
  .stick-icon {
    display: block;
    width: 22px;
    height: 22px;
    flex: none;
    color: var(--color-text-muted);
  }

  .box {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
  }

  .cross {
    stroke: currentColor;
    stroke-width: 0.8;
    opacity: 0.4;
  }

  .stick {
    stroke: var(--color-accent-500);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .knob {
    fill: var(--color-accent-500);
  }
</style>

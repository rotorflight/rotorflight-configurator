<script>
  // The main rotor from above, nose up, with an arrow for the way it turns.
  // `dir`: "cw" or "ccw". Decorative; the tile's label says which.
  let { dir = "cw" } = $props();

  let ccw = $derived(dir === "ccw");
</script>

<svg
  viewBox="0 0 64 64"
  class="rotor-dir-art"
  aria-hidden="true"
  focusable="false"
>
  <!-- Fuselage and boom from above, nose up. -->
  <path
    class="body"
    d="M32 12 C38 12 41 20 41 28 C41 35 37 38 34 39 L33 58 L31 58 L30 39 C27 38 23 35 23 28 C23 20 26 12 32 12 Z"
  />
  <circle class="disc" cx="32" cy="28" r="24" />
  <g transform="rotate({ccw ? 30 : -30} 32 28)">
    <line class="blade" x1="10" y1="28" x2="54" y2="28" />
  </g>
  <circle class="hub" cx="32" cy="28" r="2.6" />
  <g transform={ccw ? "translate(64 0) scale(-1 1)" : undefined}>
    <path class="arrow" d="M14 12 A24 24 0 0 1 46 8" />
    <path class="head" d="M42 3 L50 8 L42 13 Z" />
  </g>
</svg>

<style lang="scss">
  .rotor-dir-art {
    display: block;
    width: 56px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .body {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.2;
    stroke-linejoin: round;
  }

  .disc {
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.6;
  }

  .blade {
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
  }

  .hub {
    fill: currentColor;
  }

  .arrow {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .head {
    fill: var(--color-accent-500);
  }
</style>

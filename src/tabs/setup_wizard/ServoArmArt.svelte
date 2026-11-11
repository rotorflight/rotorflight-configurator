<!-- A cyclic servo from the side with its arm square to the pushrod, which
     runs up to the swashplate; a dashed arm and an arrow show "up, towards
     the swash". Decorative; the step's text explains. -->
<svg
  viewBox="0 0 120 92"
  class="servo-arm-art"
  aria-hidden="true"
  focusable="false"
>
  <!-- Swashplate edge at the top. -->
  <rect class="swash" x="58" y="6" width="54" height="6" rx="2.5" />
  <!-- Pushrod from the arm end up to the swash. -->
  <line class="rod" x1="90" y1="12" x2="90" y2="50" />
  <circle class="ball" cx="90" cy="12" r="2.6" />

  <!-- Servo body with mounting tabs. -->
  <rect class="body" x="10" y="54" width="14" height="7" rx="1.5" />
  <rect class="body" x="74" y="54" width="14" height="7" rx="1.5" />
  <rect class="body" x="22" y="46" width="54" height="40" rx="4" />
  <rect class="label" x="38" y="60" width="30" height="14" rx="2" />

  <!-- Arm moving up (ghost). -->
  <g transform="rotate(-24 40 50)">
    <rect class="ghost" x="34" y="45" width="58" height="10" rx="5" />
  </g>
  <path class="arrow" d="M100 40 A54 54 0 0 0 98 22" />
  <path class="head" d="M94 25 L98 18 L103 25 Z" />

  <!-- Arm square to the rod. -->
  <rect class="horn" x="34" y="45" width="60" height="10" rx="5" />
  <circle class="ball" cx="90" cy="50" r="2.6" />
  <circle class="spline" cx="40" cy="50" r="4" />
  <path class="square" d="M82 50 L82 42 L90 42" />
</svg>

<style lang="scss">
  .servo-arm-art {
    display: block;
    width: 130px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .body {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  .label {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1;
  }

  .swash {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
  }

  .rod {
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .ball,
  .spline {
    fill: var(--color-accent-500);
  }

  .horn {
    fill: var(--color-surface);
    stroke: var(--color-accent-500);
    stroke-width: 1.6;
  }

  .ghost {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.2;
    stroke-dasharray: 3 3;
    opacity: 0.7;
  }

  .square {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.2;
  }

  .arrow {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  .head {
    fill: var(--color-accent-500);
  }
</style>

<!-- A hobby servo from the side: case with mounting tabs, output spline
     with a horn, and the lead. Decorative; the step's text explains. -->
<svg
  viewBox="0 0 124 84"
  class="servo-art"
  aria-hidden="true"
  focusable="false"
>
  <path class="lead" d="M84 58 C98 58 100 74 120 74" />
  <path class="lead accent" d="M84 61 C96 61 98 78 118 78" />
  <rect class="body" x="6" y="40" width="14" height="8" rx="1.5" />
  <rect class="body" x="84" y="40" width="14" height="8" rx="1.5" />
  <circle class="hole" cx="12" cy="44" r="1.8" />
  <circle class="hole" cx="92" cy="44" r="1.8" />
  <rect class="body" x="20" y="28" width="64" height="40" rx="4" />
  <rect class="label" x="40" y="42" width="36" height="14" rx="2" />
  <rect class="body" x="24" y="21" width="26" height="9" rx="2" />
  <g transform="rotate(-18 37 18)">
    <rect class="horn" x="31" y="13" width="56" height="10" rx="5" />
    <circle class="hole" cx="60" cy="18" r="1.6" />
    <circle class="hole" cx="70" cy="18" r="1.6" />
    <circle class="hole" cx="80" cy="18" r="1.6" />
  </g>
  <circle class="spline" cx="37" cy="18" r="4" />
</svg>

<style lang="scss">
  .servo-art {
    display: block;
    width: 140px;
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

  .horn {
    fill: var(--color-surface);
    stroke: var(--color-accent-500);
    stroke-width: 1.6;
  }

  .spline {
    fill: var(--color-accent-500);
  }

  .hole {
    fill: var(--color-surface-sunken);
    stroke: currentColor;
    stroke-width: 1;
  }

  .lead {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;

    &.accent {
      stroke: var(--color-accent-500);
    }
  }
</style>

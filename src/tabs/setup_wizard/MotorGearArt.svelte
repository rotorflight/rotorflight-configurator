<!-- The motor's pinion meshing with the main gear, seen from above: the
     gear ratio the step asks for. Decorative; the step's text explains. -->
<svg
  viewBox="0 0 130 80"
  class="motor-gear-art"
  aria-hidden="true"
  focusable="false"
>
  <!-- Main gear and shaft. -->
  <circle class="gear" cx="82" cy="42" r="30" />
  <circle class="teeth" cx="82" cy="42" r="27" />
  <circle class="hub" cx="82" cy="42" r="4" />
  <!-- Pinion, meshing on the left. -->
  <circle class="pinion" cx="40" cy="42" r="11" />
  <circle class="teeth accent" cx="40" cy="42" r="9" />
  <circle class="hub" cx="40" cy="42" r="2.4" />
  <!-- Motor bell behind the pinion, with its leads. -->
  <rect class="motor" x="6" y="30" width="20" height="24" rx="4" />
  <line class="shaft" x1="26" y1="42" x2="31" y2="42" />
  <path class="lead" d="M10 54 C10 66 2 70 2 76" />
  <path class="lead" d="M16 54 C16 66 10 70 10 76" />
  <path class="lead" d="M22 54 C22 66 18 70 18 76" />
</svg>

<style lang="scss">
  .motor-gear-art {
    display: block;
    width: 130px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .gear {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
  }

  .pinion {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1.4;
  }

  /* The teeth: a dashed ring just inside the rim. */
  .teeth {
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-dasharray: 2 2;
    opacity: 0.55;

    &.accent {
      stroke: var(--color-accent-500);
      opacity: 0.8;
    }
  }

  .hub {
    fill: currentColor;
  }

  .motor {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
  }

  .shaft {
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .lead {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
</style>

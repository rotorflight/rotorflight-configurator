<!-- A receiver with its antennas, wired to a port on the flight controller.
     Decorative; the step's text explains. -->
<svg
  viewBox="0 0 140 70"
  class="receiver-art"
  aria-hidden="true"
  focusable="false"
>
  <line class="antenna" x1="14" y1="26" x2="5" y2="4" />
  <line class="antenna" x1="42" y1="26" x2="51" y2="4" />
  <circle class="tip" cx="5" cy="4" r="1.8" />
  <circle class="tip" cx="51" cy="4" r="1.8" />
  <rect class="rx" x="8" y="26" width="40" height="28" rx="4" />
  <circle class="led" cx="16" cy="34" r="2.2" />

  <path class="wire" d="M48 36 C66 36 70 35 86 35" />
  <path class="wire accent" d="M48 40 C66 40 70 39 86 39" />
  <path class="wire" d="M48 44 C66 44 70 43 86 43" />

  <rect class="board" x="88" y="14" width="46" height="46" rx="4" />
  <rect class="port" x="84" y="31" width="8" height="16" rx="1.5" />
  <rect class="chip" x="104" y="28" width="18" height="18" rx="2" />
  {#each [20, 54] as y (y)}
    {#each [96, 104, 112, 120, 128] as x (x)}
      <circle class="pin" cx={x} cy={y} r="1.3" />
    {/each}
  {/each}
</svg>

<style lang="scss">
  .receiver-art {
    display: block;
    width: 160px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .antenna {
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
  }

  .tip,
  .pin {
    fill: currentColor;
  }

  .rx {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1.6;
  }

  .led {
    fill: var(--color-status-good);
  }

  .wire {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;

    &.accent {
      stroke: var(--color-accent-500);
    }
  }

  .board,
  .port {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
  }

  .port {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
  }

  .chip {
    fill: currentColor;
    opacity: 0.35;
  }
</style>

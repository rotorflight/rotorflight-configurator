<script>
  // A blade seen end-on with a pitch gauge on it, at `angle` degrees from
  // the dashed level line. `label` is written by the angle arc (e.g. "9°").
  // Decorative; the step's text gives the numbers.
  let { angle = 9, label = null } = $props();

  const CX = 70;
  const CY = 40;

  // The arc from the level line to the blade's chord, on the right.
  let arc = $derived.by(() => {
    const r = 46;
    const rad = (angle * Math.PI) / 180;
    return `M${CX + r} ${CY} A${r} ${r} 0 0 0 ${CX + r * Math.cos(rad)} ${CY - r * Math.sin(rad)}`;
  });
</script>

<svg
  viewBox="0 0 150 66"
  class="pitch-art"
  aria-hidden="true"
  focusable="false"
>
  <line class="ref" x1="14" y1={CY} x2="136" y2={CY} />
  <g transform="rotate({-angle} {CX} {CY})">
    <!-- Blade section, leading edge left. -->
    <path
      class="blade"
      d="M20 40 C24 35 40 34.5 70 35.5 C96 36.5 112 38.5 120 40 C110 41.5 96 42.5 70 43 C40 43.5 24 43 20 40 Z"
    />
    <!-- The gauge clamped on top, with its bubble. -->
    <rect class="gauge" x="50" y="22" width="40" height="11" rx="2" />
    <circle class="bubble" cx="70" cy="27.5" r="3" />
  </g>
  {#if angle !== 0}
    <path class="arc" d={arc} />
  {/if}
  {#if label}
    <text class="angle" x="122" y="30">{label}</text>
  {/if}
</svg>

<style lang="scss">
  .pitch-art {
    display: block;
    width: 150px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .blade {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }

  .gauge {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1.2;
  }

  .bubble {
    fill: var(--color-accent-500);
  }

  .ref {
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.6;
  }

  .arc {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.4;
  }

  .angle {
    fill: var(--color-accent-500);
    font-size: 11px;
    font-weight: 700;
  }
</style>

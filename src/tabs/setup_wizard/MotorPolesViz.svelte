<script>
  // The motor bell from the front with its magnets round the rim, north
  // filled and south as an outline in turn, and the pole count in the middle,
  // as the Ethos wizard draws it (app/setup_wizard_art.lua drawPoles).
  // Decorative only: the count is the field beside it.
  let { poles = 0 } = $props();

  const C = 60;
  const R = 54;
  const RING = R * 0.81;

  // At most 40 magnets are drawn; a magnet is at most a sixth of the bell's
  // radius and no wider than the gap to its neighbours.
  let n = $derived(Math.min(Math.max(Math.round(poles) || 0, 2), 40));
  let dot = $derived(
    Math.max(2.5, Math.min(R * 0.16, RING * Math.sin(Math.PI / n) * 0.6)),
  );
  let magnets = $derived(
    Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        x: C + RING * Math.cos(a),
        y: C + RING * Math.sin(a),
        north: i % 2 === 0,
      };
    }),
  );
</script>

<svg
  viewBox="0 0 120 120"
  class="poles-viz"
  aria-hidden="true"
  focusable="false"
>
  <circle class="bell" cx={C} cy={C} r={R} />
  <circle class="stator" cx={C} cy={C} r={R * 0.62} />
  {#each magnets as m, i (i)}
    <circle class={m.north ? "north" : "south"} cx={m.x} cy={m.y} r={dot} />
  {/each}
  <text class="count" x={C} y={C}>{poles}</text>
</svg>

<style lang="scss">
  .poles-viz {
    display: block;
    width: 100%;
    height: auto;
    color: var(--color-text-muted);
  }

  .bell {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.6;
  }

  .stator {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .north {
    fill: var(--color-accent-500);
  }

  .south {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .count {
    fill: var(--color-text);
    font-size: 16px;
    text-anchor: middle;
    dominant-baseline: central;
  }
</style>

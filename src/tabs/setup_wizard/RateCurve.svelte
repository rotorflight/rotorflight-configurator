<script>
  // Stick deflection (0 to full, left to right) against rotation rate, as
  // the firmware works it out for the ROTORFLIGHT rates type (fc/rc_rates.c):
  // rate * (x * (1 - expo) + x^shape * expo). Every curve on the page uses
  // the same `scale` (deg/s at the top) so they can be compared. One series:
  // the value at full stick is labelled, so there's no legend.
  let { rate, expo, shape = 2, scale = 500, axisLabel = "" } = $props();

  const W = 120;
  const H = 56;
  const STEPS = 24;

  let points = $derived.by(() => {
    const e = expo / 100;
    const list = [];
    for (let i = 0; i <= STEPS; i++) {
      const x = i / STEPS;
      const y = rate * (x * (1 - e) + Math.pow(x, shape) * e);
      list.push([x * W, H - (Math.min(y, scale) / scale) * H]);
    }
    return list;
  });

  let line = $derived(
    points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" "),
  );
  let area = $derived(`${line} L${W} ${H} L0 ${H} Z`);
  let endY = $derived(points[points.length - 1][1]);
</script>

<svg
  viewBox="-2 -12 {W + 4} {H + 26}"
  class="rate-curve"
  role="img"
  aria-label="{rate} °/s, {expo}% expo"
>
  <line class="grid" x1="0" y1="0" x2={W} y2="0" />
  <line class="grid" x1="0" y1={H / 2} x2={W} y2={H / 2} />
  <line class="axis" x1="0" y1={H} x2={W} y2={H} />
  <path class="area" d={area} />
  <path class="line" d={line} />
  <circle class="end" cx={W} cy={endY} r="3" />
  <text class="value" x={W} y={endY - 6}>{rate}°/s</text>
  <text class="tick" x={W / 2} y={H + 11}>{axisLabel}</text>
</svg>

<style lang="scss">
  .rate-curve {
    display: block;
    width: 100%;
    max-width: 180px;
    height: auto;
    overflow: visible;
  }

  .grid {
    stroke: var(--color-border-soft);
    stroke-width: 1;
  }

  .axis {
    stroke: var(--color-border);
    stroke-width: 1;
  }

  .area {
    fill: var(--color-accent-soft);
  }

  .line {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .end {
    fill: var(--color-accent-500);
    stroke: var(--color-surface);
    stroke-width: 2;
  }

  .value {
    fill: var(--color-text);
    font-size: 10px;
    font-weight: 700;
    text-anchor: end;
    font-variant-numeric: tabular-nums;
  }

  .tick {
    fill: var(--color-text-muted);
    font-size: 8px;
    text-anchor: middle;
  }
</style>

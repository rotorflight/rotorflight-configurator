<script>
  // A gear pair or a two-stage gear train, drawn to the tooth counts, as the
  // Ethos wizard draws them (app/setup_wizard_art.lua). Decorative only: the
  // counts are the fields beside it.
  //  - pair: two gears from the front, each sized to its count, meshing;
  //  - train: side view of a two-stage train with an intermediate shaft.
  //    teeth = [pinion, intermediate on the pinion side, intermediate on the
  //    main side, main gear]; each gear is a bar as long as its pitch
  //    diameter, the lower stage under the upper one.
  // counts = false leaves the numbers off (a ratio alone has no teeth).
  let { teeth = [], train = false, counts = true } = $props();

  const W = 200;
  const PAD = 4;

  // Teeth drawn: at least 6, at most 60, as in Ethos.
  const drawn = (n) => Math.min(Math.max(Math.round(n) || 0, 6), 60);
  const count = (n) => Math.max(1, Math.round(n) || 1);

  // Pair: the larger gear gets R_MAX, the other its share, never under R_MIN.
  const R_MAX = 44;
  const R_MIN = 7;
  const PAIR_H = 2 * R_MAX + PAD + 22;

  let pair = $derived.by(() => {
    const a = count(teeth[0]);
    const b = count(teeth[1]);
    const k = Math.min(R_MAX / Math.max(a, b), (W - 2 * PAD) / (2 * (a + b)));
    const ra = Math.max(R_MIN, k * a);
    const rb = Math.max(R_MIN, k * b);
    const left = (W - 2 * (ra + rb)) / 2;
    const cy = PAD + R_MAX;
    return {
      cy,
      labelY: cy + R_MAX + 16,
      gears: [
        { cx: left + ra, r: ra, n: a },
        { cx: left + 2 * ra + rb, r: rb, n: b },
      ],
    };
  });

  // The tooth tips round a gear, from its rim out to its radius.
  function ticks(g, cy) {
    const n = drawn(g.n);
    const rim = g.r * 0.82;
    return Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n;
      const c = Math.cos(a);
      const s = Math.sin(a);
      return {
        x1: g.cx + rim * c,
        y1: cy + rim * s,
        x2: g.cx + g.r * c,
        y2: cy + g.r * s,
      };
    });
  }

  // Train: positions in tooth units first, then scaled to fit the width.
  const BAR_H = 12;
  const TOP2 = 8; // upper stage: main side
  const TOP1 = TOP2 + BAR_H + 26; // lower stage: pinion side
  const TRAIN_H = TOP1 + BAR_H + 22;

  let gearTrain = $derived.by(() => {
    const [t1, ts, tl, t4] = [0, 1, 2, 3].map((i) => count(teeth[i]));
    const xm = t1 / 2;
    const xi = t1 + ts / 2;
    const xr = xi + tl / 2 + t4 / 2;
    const minX = Math.min(0, xi - tl / 2);
    const maxX = Math.max(t1 + ts, xr + t4 / 2);
    const k = (W - 2 * PAD) / (maxX - minX);
    const x = (u) => PAD + (u - minX) * k;
    const gear = (cu, n, top) => ({ cx: x(cu), r: (k * n) / 2, n, top });
    return {
      shafts: [
        { x: x(xm), y1: TOP1 - 6, y2: TOP1 + BAR_H + 6 },
        { x: x(xi), y1: TOP2 - 6, y2: TOP1 + BAR_H + 6 },
        { x: x(xr), y1: TOP2 - 6, y2: TOP2 + BAR_H + 6 },
      ],
      gears: [
        gear(xi, tl, TOP2),
        gear(xr, t4, TOP2),
        gear(xm, t1, TOP1),
        gear(xi, ts, TOP1),
      ],
    };
  });

  // The tooth flanks across a bar: equal angles round a half-turn, so wide in
  // the middle and close at the ends.
  function grooves(g) {
    const n = Math.max(3, Math.min(g.n, 14));
    const x0 = g.cx - g.r;
    return Array.from({ length: n - 1 }, (_, i) => {
      const theta = -Math.PI / 2 + ((i + 1) * Math.PI) / n;
      return x0 + g.r * (1 + Math.sin(theta));
    });
  }
</script>

{#if train}
  <svg
    viewBox="0 0 {W} {TRAIN_H}"
    class="gear-viz"
    aria-hidden="true"
    focusable="false"
  >
    {#each gearTrain.shafts as s, i (i)}
      <line class="shaft" x1={s.x} y1={s.y1} x2={s.x} y2={s.y2} />
    {/each}
    {#each gearTrain.gears as g, i (i)}
      <!-- A pixel short at each end, so meshing gears show a seam. -->
      <rect
        class="bar"
        x={g.cx - g.r + 0.6}
        y={g.top}
        width={Math.max(1.5, 2 * g.r - 1.2)}
        height={BAR_H}
      />
      {#each grooves(g) as gx, j (j)}
        <line
          class="groove"
          x1={gx}
          y1={g.top + 2.5}
          x2={gx}
          y2={g.top + BAR_H - 2.5}
        />
      {/each}
      {#if counts}
        <text class="count" x={g.cx} y={g.top + BAR_H + 14}>{g.n}</text>
      {/if}
    {/each}
  </svg>
{:else}
  <svg
    viewBox="0 0 {W} {PAIR_H}"
    class="gear-viz"
    aria-hidden="true"
    focusable="false"
  >
    {#each pair.gears as g, i (i)}
      <circle class="disc" cx={g.cx} cy={pair.cy} r={g.r * 0.82} />
      {#each ticks(g, pair.cy) as t, j (j)}
        <line class="tooth" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
      {/each}
      <circle class="hub" cx={g.cx} cy={pair.cy} r={Math.max(1.5, g.r * 0.2)} />
      {#if counts}
        <text class="count" x={g.cx} y={pair.labelY}>{g.n}</text>
      {/if}
    {/each}
  </svg>
{/if}

<style lang="scss">
  .gear-viz {
    display: block;
    width: 100%;
    height: auto;
    color: var(--color-text-muted);
  }

  .disc {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
  }

  .tooth {
    stroke: currentColor;
    stroke-width: 1.2;
    stroke-linecap: round;
  }

  .hub {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .shaft {
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    opacity: 0.55;
  }

  .bar {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .groove {
    stroke: currentColor;
    stroke-width: 0.8;
    opacity: 0.5;
  }

  /* The count sits on a halo of the card's colour, so a shaft behind it
     doesn't run through the digits. */
  .count {
    fill: var(--color-text);
    font-size: 11px;
    text-anchor: middle;
    paint-order: stroke;
    stroke: var(--color-surface-sunken);
    stroke-width: 4px;
    stroke-linejoin: round;
  }
</style>

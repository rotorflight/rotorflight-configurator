<script>
  // Dynamic gear visualization: simple gears (pinion & main) or a two-stage train.
  // Like the Ethos suite, the gear sizes scale with tooth count.
  //
  // Props:
  //   teeth: array of tooth counts ([pinion, main] for simple; [pinion, pinion-side, main-side, main] for train)
  //   stage: 1 or 2 (one stage or two-stage train)
  //   ratio: display text (e.g. "2.50:1")

  let { teeth = [], stage = 1 } = $props();

  // Clamp tooth count: min 6, max 60 for display
  const clamp = (n) => Math.max(6, Math.min(60, n || 6));

  // For simple gears: pinion (small) on left, main (big) on right
  // Scale pinion relative to main: min 0.3x, max 0.7x of main gear size
  const simpleFx = () => {
    const pinion = clamp(teeth[0] || 10);
    const main = clamp(teeth[1] || 30);
    const r_max = 35; // max radius for main gear
    const r_min_pinion = r_max * 0.2;
    const r_pinion = Math.max(r_min_pinion, (r_max * pinion) / main);
    const r_main = r_max;

    const spacing = r_pinion + r_main + 8; // gap between centers
    const cx_pinion = 20 + r_pinion;
    const cx_main = cx_pinion + spacing;

    return { cx_pinion, r_pinion, cx_main, r_main, pinion, main };
  };

  // For two-stage train: side view with shafts and teeth as bars
  // Like Ethos: pinion on motor shaft (bottom), intermediate gears on shaft,
  // main gear on rotor shaft (top)
  const trainFx = () => {
    const t = [
      clamp(teeth[0] || 10), // pinion
      clamp(teeth[1] || 20), // intermediate pinion-side
      clamp(teeth[2] || 20), // intermediate main-side
      clamp(teeth[3] || 50), // main
    ];
    // Pitch diameter proportional to tooth count; unit = 2px per tooth (smaller)
    const unitPx = 2;
    const r = t.map((n) => (n * unitPx) / 2);

    // Layout: shafts at x positions, compact
    // motor shaft (x_m), intermediate shaft (x_i), rotor shaft (x_r)
    const x_m = 6 + r[0];
    const x_i = x_m + r[0] + r[1] + 4;
    const x_r = x_i + r[2] + r[3] + 4;

    const y_top = 15; // top gear (main side)
    const y_bot = 60; // bottom gear (pinion side)
    const barH = 10;

    return { x_m, x_i, x_r, y_top, y_bot, barH, r, t };
  };
</script>

{#if stage === 1}
  <!-- Simple gears: pinion on left, main on right -->
  {@const gear = simpleFx()}
  <svg
    viewBox="0 0 180 90"
    class="gear-viz"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Main gear: rim + teeth outline + hub -->
    <circle cx={gear.cx_main} cy="45" r={gear.r_main} class="gear-rim" />
    <circle cx={gear.cx_main} cy="45" r={gear.r_main - 2} class="gear-rim" />

    <!-- Teeth: radial lines -->
    {#each Array(Math.max(6, Math.min(20, Math.floor(gear.main / 3)))) as _, i (i)}
      {@const deg = (i * 360) / Math.max(6, Math.floor(gear.main / 3))}
      {@const rad = (deg * Math.PI) / 180}
      {@const x1 = Math.cos(rad) * (gear.r_main - 3) + gear.cx_main}
      {@const y1 = Math.sin(rad) * (gear.r_main - 3) + 45}
      {@const x2 = Math.cos(rad) * gear.r_main + gear.cx_main}
      {@const y2 = Math.sin(rad) * gear.r_main + 45}
      <line {x1} {y1} {x2} {y2} class="tooth" />
    {/each}

    <circle cx={gear.cx_main} cy="45" r="3" class="hub" />

    <!-- Pinion: smaller gear -->
    <circle cx={gear.cx_pinion} cy="45" r={gear.r_pinion} class="pinion-rim" />
    <circle
      cx={gear.cx_pinion}
      cy="45"
      r={gear.r_pinion - 1.5}
      class="pinion-rim"
    />

    {#each Array(Math.max(6, Math.floor(gear.pinion / 2))) as _, i (i)}
      {@const deg = (i * 360) / Math.max(6, Math.floor(gear.pinion / 2))}
      {@const rad = (deg * Math.PI) / 180}
      {@const x1 = Math.cos(rad) * (gear.r_pinion - 2) + gear.cx_pinion}
      {@const y1 = Math.sin(rad) * (gear.r_pinion - 2) + 45}
      {@const x2 = Math.cos(rad) * gear.r_pinion + gear.cx_pinion}
      {@const y2 = Math.sin(rad) * gear.r_pinion + 45}
      <line {x1} {y1} {x2} {y2} class="tooth-pinion" />
    {/each}

    <circle cx={gear.cx_pinion} cy="45" r="1.5" class="hub" />

    <!-- Labels -->
    <text x={gear.cx_main} y="70" class="tooth-label">{gear.main}</text>
    <text x={gear.cx_pinion} y="70" class="tooth-label">{gear.pinion}</text>
  </svg>
{:else}
  <!-- Two-stage train: side view -->
  {@const train = trainFx()}
  <svg
    viewBox="0 0 140 100"
    class="gear-viz"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Shafts: vertical lines -->
    <line x1={train.x_m} y1="5" x2={train.x_m} y2="80" class="shaft" />
    <line x1={train.x_i} y1="5" x2={train.x_i} y2="80" class="shaft" />
    <line x1={train.x_r} y1="5" x2={train.x_r} y2="80" class="shaft" />

    <!-- Gears as bars with teeth -->
    {#each [{ x: train.x_m, y: train.y_bot, r: train.r[0], label: train.t[0], idx: 0 }, { x: train.x_i, y: train.y_bot, r: train.r[1], label: train.t[1], idx: 1 }, { x: train.x_i, y: train.y_top, r: train.r[2], label: train.t[2], idx: 2 }, { x: train.x_r, y: train.y_top, r: train.r[3], label: train.t[3], idx: 3 }] as gear (gear.idx)}
      {@const x0 = Math.max(5, Math.floor(gear.x - gear.r))}
      {@const len = Math.max(2, Math.floor(2 * gear.r - 2))}

      <!-- Gear bar -->
      <rect
        x={x0}
        y={gear.y}
        width={len}
        height={train.barH}
        class="gear-bar"
      />
      <rect
        x={x0}
        y={gear.y}
        width={len}
        height={train.barH}
        class="gear-outline"
      />

      <!-- Teeth: grooves on top edge -->
      {#each Array(Math.max(3, Math.min(10, gear.label))) as _, i (i)}
        {@const gx = x0 + (len / (gear.label || 1)) * (i + 0.5) - 0.5}
        <line
          x1={gx}
          y1={gear.y + 2}
          x2={gx}
          y2={gear.y + train.barH - 3}
          class="tooth-groove"
        />
      {/each}

      <!-- Tooth label (below gears to avoid shaft overlap) -->
      <text x={gear.x} y={gear.y + train.barH + 18} class="tooth-label">
        {gear.label}
      </text>
    {/each}
  </svg>
{/if}

<style lang="scss">
  .gear-viz {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    color: var(--color-text-muted);
  }

  /* Simple gears */
  .gear-rim {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1;
  }

  .pinion-rim {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1;
  }

  .tooth {
    stroke: currentColor;
    stroke-width: 1;
    opacity: 0.6;
  }

  .tooth-pinion {
    stroke: var(--color-accent-500);
    stroke-width: 1;
    opacity: 0.8;
  }

  .hub {
    fill: currentColor;
  }

  .tooth-label {
    font-size: 10px;
    fill: var(--color-text-muted);
    text-anchor: middle;
  }

  /* Two-stage train */
  .shaft {
    stroke: currentColor;
    stroke-width: 2;
    opacity: 0.7;
  }

  .gear-bar {
    fill: var(--color-surface);
  }

  .gear-outline {
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
  }

  .tooth-groove {
    stroke: var(--color-bg);
    stroke-width: 0.8;
  }
</style>

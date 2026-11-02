<script>
  // The main shaft, swashplate and servo links, showing one movement.
  // Decorative; the text next to it says the same.
  //  - "level": swash level, with a spirit level on it;
  //  - "roll": seen from behind, swash tilting to the right;
  //  - "pitch": seen from the side (nose right), swash tilting forward;
  //  - "collective": swash rising straight up the shaft.
  let { scene = "level" } = $props();

  const CX = 60;
  const HALF = 24;
  const BASE_Y = 42;
  const SERVO_Y = 64;

  // Positive tilt: the right-hand side goes down.
  let tilt = $derived(scene === "roll" || scene === "pitch" ? 12 : 0);
  let lift = $derived(scene === "collective" ? 9 : 0);
  let cy = $derived(BASE_Y - lift);

  let ends = $derived.by(() => {
    const rad = (tilt * Math.PI) / 180;
    const dx = HALF * Math.cos(rad);
    const dy = HALF * Math.sin(rad);
    return {
      left: { x: CX - dx, y: cy - dy },
      right: { x: CX + dx, y: cy + dy },
    };
  });
</script>

<svg
  viewBox="0 0 120 84"
  class="swash-art"
  aria-hidden="true"
  focusable="false"
>
  <!-- The frame below: a canopy nose to the right in side view, the tail
       boom end-on from behind. -->
  {#if scene === "pitch"}
    <path class="body" d="M26 70 L94 70 C104 70 110 74 112 80 L26 80 Z" />
  {:else}
    <rect class="body" x="26" y="70" width="68" height="10" rx="3" />
    {#if scene === "roll"}
      <circle class="hole" cx="60" cy="75" r="2.6" />
    {/if}
  {/if}

  <!-- Shaft and head. -->
  <line class="shaft" x1={CX} y1="8" x2={CX} y2="70" />
  <rect class="body" x="48" y="6" width="24" height="6" rx="3" />

  <!-- Servo arms and links up to the swash. -->
  {#each [ends.left, ends.right] as end, i (i)}
    {@const pivot = i === 0 ? CX - HALF - 8 : CX + HALF + 8}
    <line class="link" x1={end.x} y1={end.y + 3} x2={end.x} y2={SERVO_Y} />
    <line class="arm" x1={pivot} y1={SERVO_Y + 2} x2={end.x} y2={SERVO_Y} />
    <circle class="spline" cx={pivot} cy={SERVO_Y + 2} r="2" />
  {/each}

  <!-- Swashplate. -->
  <g transform="rotate({tilt} {CX} {cy})">
    <rect
      class="swash"
      x={CX - HALF}
      y={cy - 2}
      width={HALF * 2}
      height="5"
      rx="2"
    />
    <rect class="inner" x={CX - 12} y={cy - 6} width="24" height="4" rx="1.5" />
  </g>

  {#if scene === "level"}
    <g transform="translate(0 -4)">
      <rect class="vial" x="76" y="20" width="36" height="10" rx="5" />
      <line class="mark" x1="89" y1="20" x2="89" y2="30" />
      <line class="mark" x1="99" y1="20" x2="99" y2="30" />
      <circle class="bubble" cx="94" cy="25" r="3" />
    </g>
  {:else if scene === "collective"}
    <path class="arrow" d="M100 50 L100 26" />
    <path class="head" d="M95 31 L100 24 L105 31 Z" />
    <line class="ref" x1="30" y1={BASE_Y} x2="90" y2={BASE_Y} />
  {:else}
    <!-- Which way it tilts: down on the right. -->
    <path class="arrow" d="M100 26 A30 30 0 0 1 104 48" />
    <path class="head" d="M99 46 L105 52 L108 44 Z" />
    <line class="ref" x1="30" y1={BASE_Y} x2="90" y2={BASE_Y} />
  {/if}
</svg>

<style lang="scss">
  .swash-art {
    display: block;
    width: 120px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .body {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }

  .hole {
    fill: var(--color-surface-sunken);
    stroke: currentColor;
    stroke-width: 1;
  }

  .shaft {
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
  }

  .link,
  .arm {
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  .spline {
    fill: currentColor;
  }

  .swash {
    fill: var(--color-accent-500);
  }

  .inner {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1;
  }

  .ref {
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.6;
  }

  .arrow {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  .head {
    fill: var(--color-accent-500);
  }

  .vial {
    fill: var(--color-accent-soft);
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .mark {
    stroke: currentColor;
    stroke-width: 1;
    opacity: 0.6;
  }

  .bubble {
    fill: var(--color-accent-500);
  }
</style>

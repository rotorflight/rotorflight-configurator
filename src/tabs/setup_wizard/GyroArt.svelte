<script>
  // The bench gyro check for one axis: the helicopter being moved (grey
  // arrow) and the correction the gyro should make against it (accent).
  // Decorative; the step's text says the same.
  //  - "roll": from behind, rolled right; the swash tilts left;
  //  - "pitch": from the side (nose right), nose down; the swash tilts back;
  //  - "yaw": from above, nose turned right; the tail pushes back.
  let { axis = "roll" } = $props();

  // How far the helicopter is moved, and the swash's tilt in the picture
  // (negative: left side down).
  const MOVE = 16;
  const SWASH = -10;
</script>

<svg viewBox="0 0 120 90" class="gyro-art" aria-hidden="true" focusable="false">
  {#if axis === "yaw"}
    <line class="ref" x1="60" y1="8" x2="60" y2="82" />
    <g transform="rotate(22 60 46)">
      <path
        class="body"
        d="M60 14 C67 14 70 24 70 32 C70 40 66 44 62 45 L61 82 L59 82 L58 45 C54 44 50 40 50 32 C50 24 53 14 60 14 Z"
      />
      <!-- Tail rotor thrust, pushing the tail back the other way. -->
      <path class="arrow" d="M62 78 L80 78" />
      <path class="head" d="M77 73 L84 78 L77 83 Z" />
    </g>
    <path class="move" d="M42 12 A40 40 0 0 1 82 14" />
    <path class="move-head" d="M80 8 L88 16 L78 19 Z" />
  {:else}
    <line class="ref" x1="60" y1="4" x2="60" y2="86" />
    <g transform="rotate({MOVE} 60 80)">
      {#if axis === "pitch"}
        <path class="body" d="M26 72 L94 72 C104 72 110 76 112 82 L26 82 Z" />
      {:else}
        <rect class="body" x="26" y="72" width="68" height="10" rx="3" />
      {/if}
      <line class="shaft" x1="60" y1="12" x2="60" y2="72" />
      <rect class="body" x="48" y="10" width="24" height="6" rx="3" />
      <!-- Swash: tilted against the movement. -->
      <g transform="rotate({SWASH - MOVE} 60 44)">
        <rect class="swash" x="36" y="42" width="48" height="5" rx="2" />
      </g>
    </g>
    <!-- The movement. -->
    <path class="move" d="M30 18 A40 40 0 0 1 70 6" />
    <path class="move-head" d="M68 1 L76 6 L68 11 Z" />
    <!-- The correction: down on the left. -->
    <path class="arrow" d="M14 30 A30 30 0 0 0 12 52" />
    <path class="head" d="M7 49 L12 56 L17 49 Z" />
  {/if}
</svg>

<style lang="scss">
  .gyro-art {
    display: block;
    width: 110px;
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

  .shaft {
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
  }

  .swash {
    fill: var(--color-accent-500);
  }

  .ref {
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.5;
  }

  .move {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  .move-head {
    fill: currentColor;
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
</style>

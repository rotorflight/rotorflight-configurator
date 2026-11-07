<script>
  // Dynamic visualization of motor poles (magnets) around the rotor bell.
  // Like the Ethos suite, shows the poles arranged in a circle.

  let { poles = 12 } = $props();

  // Clamp poles to valid range and derive pole array
  let p = $derived(Math.max(2, Math.min(254, poles)));
  let polesArray = $derived(Array.from({ length: p }, (_, i) => i));
</script>

<svg
  viewBox="0 0 140 140"
  class="motor-poles-viz"
  aria-hidden="true"
  focusable="false"
>
  <!-- Stator ring (outer) -->
  <circle cx="70" cy="70" r="65" class="stator" />

  <!-- Rotor bell (inner) -->
  <circle cx="70" cy="70" r="45" class="rotor" />

  <!-- Magnets/poles arranged in circle -->
  {#each polesArray as _, i (i)}
    {@const angle = (i * 360) / p - 90}
    {@const rad = (angle * Math.PI) / 180}
    {@const x = 70 + 55 * Math.cos(rad)}
    {@const y = 70 + 55 * Math.sin(rad)}
    {@const isMagnet = i % 2 === 0}

    <circle cx={x} cy={y} r="8" class={isMagnet ? "pole-n" : "pole-s"} />
    {#if isMagnet}
      <text {x} {y} class="pole-label">N</text>
    {:else}
      <text {x} {y} class="pole-label">S</text>
    {/if}
  {/each}

  <!-- Center rotor shaft -->
  <circle cx="70" cy="70" r="6" class="shaft-center" />
</svg>

<style lang="scss">
  .motor-poles-viz {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .stator {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    opacity: 0.5;
  }

  .rotor {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.5;
  }

  .pole-n {
    fill: var(--color-accent-500);
    stroke: var(--color-accent-500);
    stroke-width: 1;
  }

  .pole-s {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }

  .pole-label {
    font-size: 8px;
    font-weight: 700;
    fill: currentColor;
    text-anchor: middle;
    dominant-baseline: central;
  }

  .shaft-center {
    fill: currentColor;
  }
</style>

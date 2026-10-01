<script>
  import * as noUiSlider from "nouislider";
  import { onDestroy, onMount } from "svelte";

  let {
    start = $bindable(),
    end = $bindable(),
    opts,
    markerPercent = null,
    onchange,
    changeOnSlide = true,
    compact = false,
  } = $props();

  let node;
  let slider;

  $effect(() => {
    slider?.set([start, end]);
  });

  onMount(() => {
    slider = noUiSlider.create(node, {
      ...opts,
      start: [start, end],
      cssPrefix: "svelte-slide-",
    });

    const changeEvent = changeOnSlide ? "slide" : "change";
    slider.on(changeEvent, (values) => {
      start = Number(values[0]);
      end = Number(values[1]);
      onchange?.(start, end);
    });
  });

  onDestroy(() => {
    slider?.destroy();
  });

  export function update(newOpts, fireSetEvent = true) {
    slider?.updateOptions(newOpts, fireSetEvent);
  }
</script>

<div class="range-slider-container" class:compact>
  <div bind:this={node}></div>
  {#if markerPercent != null}
    <div class="marker" style:left="{markerPercent}%"></div>
  {/if}
</div>

<style lang="scss">
  .range-slider-container {
    position: relative;
  }

  .marker {
    position: absolute;
    top: 17px;
    height: 12px;
    width: 6px;
    margin-left: -3px;
    border-radius: var(--radius-xs);
    z-index: 10;
    pointer-events: none;

    background: var(--color-accent, var(--accent));
    opacity: 0.7;
  }

  /* The shared slider theme's default pip-label spacing runs the tick mark
     right up against the number below it - legacy gave its range sliders a
     few extra px here for the same reason. Scoped to this component only
     (via the .range-slider-container ancestor) so it doesn't affect the
     single-value Slider used elsewhere. */
  .range-slider-container :global(.svelte-slide-value-horizontal) {
    padding-top: 4px;
  }

  /* compact: a thin track, small round handles, short ticks and small
     labels, for sliders stacked in cards where height matters. */
  .compact :global(.svelte-slide-horizontal) {
    height: 6px;
    border-radius: 3px;
  }

  .compact :global(.svelte-slide-horizontal .svelte-slide-handle) {
    width: 16px;
    height: 16px;
    top: -6px;
    right: -8px;
    border-radius: 50%;
  }

  .compact :global(.svelte-slide-handle::before),
  .compact :global(.svelte-slide-handle::after) {
    display: none;
  }

  .compact :global(.svelte-slide-pips-horizontal) {
    padding-top: 2px;
  }

  .compact :global(.svelte-slide-marker-horizontal.svelte-slide-marker) {
    height: 3px;
  }

  .compact :global(.svelte-slide-marker-horizontal.svelte-slide-marker-large) {
    height: 6px;
  }

  .compact :global(.svelte-slide-value-horizontal) {
    margin-top: 0;
    padding-top: 0;
    font-size: 0.7rem;
  }

  .compact .marker {
    top: 8px;
    height: 7px;
    width: 4px;
    margin-left: -2px;
  }
</style>

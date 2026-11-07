<script>
  import * as noUiSlider from "nouislider";
  import { onDestroy, onMount } from "svelte";

  let { value = $bindable(), opts, onchange, changeOnSlide = true } = $props();

  let node;
  let slider;

  // Read `value` first: with the optional call alone, the effect ran before the slider
  // existed and never tracked `value`, so a change made elsewhere (a NumberInput) did not
  // move the slider (#483).
  $effect(() => {
    const current = value;
    slider?.set(current);
  });

  onMount(() => {
    slider = noUiSlider.create(node, { ...opts, cssPrefix: "svelte-slide-" });

    const changeEvent = changeOnSlide ? "slide" : "change";
    slider.on(changeEvent, (values) => {
      value = Number(values[0]);
      onchange?.(value);
    });
    slider.set(value);
  });

  // The mouse wheel steps the value while a handle of this slider has the focus (a click on
  // it gives the focus), so a page scrolled over it keeps its value (#483). set() fires no
  // change event, so the new value is passed on here.
  function onwheel(e) {
    if (!node.contains(document.activeElement) || !slider) return;
    e.preventDefault();
    const range = opts?.range ?? {};
    const step = opts?.step ?? 1;
    let next = Number(slider.get()) + (e.deltaY < 0 ? step : -step);
    if (range.min !== undefined) next = Math.max(range.min, next);
    if (range.max !== undefined) next = Math.min(range.max, next);
    slider.set(next);
    value = next;
    onchange?.(next);
  }

  onMount(() => {
    node.addEventListener("wheel", onwheel, { passive: false });
  });

  onDestroy(() => {
    node.removeEventListener("wheel", onwheel);
    slider.destroy();
  });

  export function update(opts) {
    slider?.updateOptions(opts);
  }
</script>

<div bind:this={node}></div>

<style lang="scss">
</style>

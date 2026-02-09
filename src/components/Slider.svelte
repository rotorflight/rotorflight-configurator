<script>
  import { onMount, onDestroy } from "svelte";
  import * as noUiSlider from "nouislider";

  let { value = $bindable(), opts, onchange, changeOnSlide = true } = $props();

  let node;
  let slider;

  $effect(() => {
    slider?.set(value);
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

  onDestroy(() => {
    slider.destroy();
  });

  export function update(opts) {
    slider?.updateOptions(opts);
  }
</script>

<div bind:this={node}></div>

<style lang="scss">
</style>

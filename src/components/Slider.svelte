<script>
  import { onMount, onDestroy } from "svelte";
  import * as noUiSlider from "nouislider";

  let { value = $bindable(), opts, onchange } = $props();

  let node;
  let slider;

  $effect(() => {
    slider?.set(value);
  });

  onMount(() => {
    slider = noUiSlider.create(node, { ...opts, cssPrefix: "svelte-slide-" });
    slider.on("slide", (values) => {
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

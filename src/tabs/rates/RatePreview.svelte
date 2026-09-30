<script>
  import { onDestroy, onMount } from "svelte";
  import { Clock } from "three";

  import Model from "@/components/Model.svelte";
  import Section from "@/components/Section.svelte";

  import { degToRad } from "@/js/utils/common.js";

  let { liveSetpoints } = $props();

  let model;
  const clock = new Clock();

  let shouldRender = true;
  function updatePreview() {
    if (!shouldRender) {
      return;
    }

    const delta = clock.getDelta();
    model?.rotateBy(
      delta * -degToRad(liveSetpoints.pitch),
      delta * -degToRad(liveSetpoints.yaw),
      delta * -degToRad(liveSetpoints.roll),
    );

    globalThis.requestAnimationFrame(updatePreview);
  }

  onMount(() => {
    updatePreview();
  });

  onDestroy(() => {
    shouldRender = false;
  });
</script>

<Section label="rateSetupRatesPreview">
  <div class="content">
    <Model bind:this={model} />
  </div>
</Section>

<style lang="scss">
  .content {
    position: relative;
    height: 353px;
  }
</style>

<script>
  import { onMount, onDestroy } from "svelte";
  import { Clock } from "three";

  import { i18n } from "@/js/i18n.js";
  import { degToRad } from "@/js/utils/common";

  import Model from "@/components/Model.svelte";

  import { Setpoint } from "./setpoint.svelte.js";

  let model;
  let clock = new Clock();

  let shouldRender = true;
  function updateModelPreview() {
    if (!shouldRender) {
      return;
    }

    const delta = clock.getDelta();
    model?.rotateBy(
      -degToRad(delta * Setpoint.pitch),
      -degToRad(delta * Setpoint.yaw),
      -degToRad(delta * Setpoint.roll),
    );

    globalThis.requestAnimationFrame(updateModelPreview);
  }

  onMount(() => {
    updateModelPreview();
  });

  onDestroy(() => {
    shouldRender = false;
  });

  function handleReset() {
    model?.reset();
  }
</script>

<div class="wrapper">
  <div class="header">{$i18n.t("receiverModelPreview")}</div>
  <div class="container">
    <Model bind:this={model} />
    <button class="reset-btn" onclick={handleReset}
      >{$i18n.t("resetModelPreviewOrientation")}</button
    >
  </div>
</div>

<style lang="scss">
  .wrapper {
    padding-top: var(--section-gap);
  }

  .header {
    @extend %section-header;
    padding-left: 8px;
  }

  .container {
    position: relative;
    height: 400px;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    overflow: hidden;

    :global(html[data-theme="light"]) & {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    :global(html[data-theme="dark"]) & {
      border-width: 0 1px 1px;
      border-style: solid;
      border-color: var(--color-neutral-800);
    }
  }

  .reset-btn {
    position: absolute;
    top: 0;
    right: 0;
    margin: 8px;
    font-weight: 400;
    font-size: 14px;
    padding: 6px 12px;
    transition: var(--animation-speed);

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-900);
      background-color: var(--color-neutral-200);
      border: 1px solid var(--color-neutral-400);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-100);
      background-color: var(--color-neutral-800);
      border: 1px solid var(--color-neutral-500);
    }
  }

  @media (hover: hover) {
    .reset-btn:hover {
      :global(html[data-theme="light"]) & {
        background-color: var(--color-neutral-300);
      }

      :global(html[data-theme="dark"]) & {
        background-color: var(--color-neutral-700);
      }
    }
  }

  @media only screen and (max-width: 480px) {
    .container {
      border-radius: 0;
    }
  }
</style>

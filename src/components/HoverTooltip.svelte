<script>
  import {
    arrow,
    computePosition,
    flip,
    offset,
    shift,
  } from "@floating-ui/dom";

  let { children, tooltip } = $props();
  let element;
  let arrowElement;
  let tooltipElement;

  async function onmouseover() {
    const { x, y, placement, middlewareData } = await computePosition(
      element,
      tooltipElement,
      {
        placement: "right",
        middleware: [
          offset(16),
          flip(),
          shift({ padding: 4 }),
          arrow({ element: arrowElement }),
        ],
      },
    );

    Object.assign(tooltipElement.style, {
      left: `${x}px`,
      top: `${y}px`,
    });

    const staticSide = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    }[placement.split("-")[0]];

    let transform = "";
    switch (staticSide) {
      case "right":
        transform = "scaleX(-1)";
        break;
      case "top":
        transform = "rotate(90deg) translateX(-50%) translateY(50%)";
        break;
      case "bottom":
        transform = "rotate(-90deg) translateX(-50%) translateY(-50%)";
        break;
    }

    const arrowData = middlewareData.arrow;
    Object.assign(arrowElement.style, {
      top: `${arrowData.y}px`,
      left: arrowData.x ? `${arrowData.x}px` : "",
      bottom: "",
      right: "",
      transform,
      [staticSide]: "-8px",
    });
  }
</script>

<!-- eslint-disable-next-line svelte/valid-compile -->
<div class="container" bind:this={element} {onmouseover}>
  {@render children?.()}
  <div class="tooltip" role="tooltip" bind:this={tooltipElement}>
    {@render tooltip?.()}
    <div class="tooltip-arrow" bind:this={arrowElement}></div>
  </div>
</div>

<style lang="scss">
  .container {
    position: relative;
    width: fit-content;

    &:hover .tooltip {
      display: block;
    }
  }

  .tooltip {
    width: max-content;
    position: absolute;
    max-width: 240px;
    padding: 8px;
    display: none;
    z-index: 2000;
    text-wrap: wrap;
    font-size: 12px;
    font-weight: 400;
    line-height: 18px;
    border-width: 1px;
    border-style: solid;
    border-radius: 2px;

    :global(html[data-theme="light"]) & {
      background: var(--color-neutral-50);
      border-color: var(--color-accent-500);
      color: var(--color-neutral-900);
      box-shadow: rgba(0, 0, 0, 0.25) 0px 5px 10px;
    }

    :global(html[data-theme="dark"]) & {
      background: var(--color-neutral-800);
      border-color: var(--color-accent-400);
      color: var(--color-neutral-50);
      box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 10px;

      background-color: hsl(160, 2%, 26%);
    }
  }

  .tooltip-arrow {
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    position: absolute;
    border-right: 8px solid var(--color-accent-500);

    &::after {
      content: "";
      width: 0;
      height: 0;
      border-top: 7px solid transparent;
      border-bottom: 7px solid transparent;
      position: absolute;
      top: -7px;
      left: 1px;

      :global(html[data-theme="light"]) & {
        border-right: 7px solid var(--color-neutral-50);
      }

      :global(html[data-theme="dark"]) & {
        border-right: 7px solid var(--color-neutral-800);

        border-right: 7px solid hsl(160, 2%, 26%);
      }
    }
  }
</style>

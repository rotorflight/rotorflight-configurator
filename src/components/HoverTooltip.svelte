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

  function onmouseleave() {
    tooltipElement.hidePopover();
  }

  async function onmouseover() {
    tooltipElement.showPopover();

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

<div class="container" bind:this={element} {onmouseover} {onmouseleave}>
  {@render children?.()}
  <div class="tooltip" role="tooltip" bind:this={tooltipElement} popover>
    {@render tooltip?.()}
    <div class="tooltip-arrow" bind:this={arrowElement}></div>
  </div>
</div>

<style lang="scss">
  [popover] {
    overflow: visible;
    animation: fadeIn 0.2s ease-out;

    &::backdrop {
      display: none;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .container {
    position: relative;
    width: fit-content;
  }

  .tooltip {
    width: max-content;
    position: relative;
    max-width: 240px;
    padding: 8px;
    text-wrap: wrap;
    font-size: 12px;
    font-weight: 400;
    line-height: 18px;
    border-radius: 2px;

    color: var(--color-text);
    background-color: var(--color-surface-float);
    border: 1px solid var(--color-border-accent);
    box-shadow: 0px 4px 12px -4px var(--color-shadow);
  }

  .tooltip-arrow {
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    position: absolute;
    border-right: 8px solid var(--color-border-accent);

    &::after {
      content: "";
      width: 0;
      height: 0;
      border-top: 7px solid transparent;
      border-bottom: 7px solid transparent;
      position: absolute;
      top: -7px;
      left: 1px;
      border-right: 7px solid var(--color-surface-float);
    }
  }
</style>

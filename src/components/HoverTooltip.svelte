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

    // Keep the tooltip within whichever panel the field lives in, so it
    // never spills sideways onto a neighbouring panel/column - the
    // viewport is wide enough that flip()/shift() would otherwise see
    // plenty of "room" over there and never budge.
    const boundary = element.closest("[data-tooltip-boundary]") ?? undefined;

    const { x, y, placement, middlewareData } = await computePosition(
      element,
      tooltipElement,
      {
        // Left/right only - never above or below - so the tooltip always
        // stays vertically inline with the field it's describing.
        placement: "right",
        middleware: [
          offset(12),
          flip({ fallbackPlacements: ["left"], boundary }),
          shift({ padding: 8, crossAxis: false, boundary }),
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
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 18px;
    border-radius: var(--radius-md);
    /* The tooltip must never intercept the pointer: it can end up positioned
       over neighbouring fields (or briefly over its own anchor before
       computePosition settles), and a click there should always reach the
       control underneath rather than being swallowed by the popover. */
    pointer-events: none;

    color: var(--color-text);
    background-color: var(--color-surface-float);
    /* A neutral hairline plus real elevation, rather than the accent
       outline this used to carry - a red frame on every hover tip read as
       an error state and put brand colour on the noisiest surface in the
       app. The shadow is what separates it from the panel underneath. */
    border: 1px solid var(--color-border-soft);
    box-shadow: var(--shadow-md);

    /* Multi-paragraph {@html} content (e.g. HelpIcon's) - same convention
       as Tooltip.svelte's .message: zero the UA default margin and space
       paragraphs deliberately instead, rather than however the browser's
       default <p> margin happens to render. */
    :global(p) {
      margin: 0;
    }

    :global(p) + :global(p) {
      margin-top: 10px;
    }
  }

  .tooltip-arrow {
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    position: absolute;
    border-right: 8px solid var(--color-border-soft);

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

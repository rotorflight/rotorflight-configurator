<script>
  import { SvelteSet } from "svelte/reactivity";

  import { FC } from "@/js/fc.svelte.js";

  import {
    CELL_COUNT,
    FUNCTION_COLORS,
    GRID_SIZE,
    OVERLAYS,
  } from "./constants.js";
  import { commitSelection, ledState } from "./state.svelte.js";
  import { cellIndex, hsvToColor } from "./util.js";

  const OVERLAY_DOT_COLORS = {
    t: "orange",
    o: "brown",
    b: "#3498ff",
    v: "#000",
    i: "yellow",
    w: "red",
    k: "brown",
    d: "#3498ff",
  };

  let gridEl;
  let dragging = $state(false);
  let anchor = $state(null);
  let hover = $state(null);

  let previewSelection = $derived.by(() => {
    if (!dragging || !anchor || !hover) return null;

    const x0 = Math.min(anchor.x, hover.x);
    const x1 = Math.max(anchor.x, hover.x);
    const y0 = Math.min(anchor.y, hover.y);
    const y1 = Math.max(anchor.y, hover.y);

    const set = new SvelteSet();
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        set.add(cellIndex(x, y));
      }
    }
    return set;
  });

  function cellFromEvent(e) {
    const rect = gridEl.getBoundingClientRect();
    const pitch = rect.width / GRID_SIZE;
    let x = Math.floor((e.clientX - rect.left) / pitch);
    let y = Math.floor((e.clientY - rect.top) / pitch);
    x = Math.max(0, Math.min(GRID_SIZE - 1, x));
    y = Math.max(0, Math.min(GRID_SIZE - 1, y));
    return { x, y };
  }

  function onpointerdown(e) {
    if (e.button !== 0) return;
    gridEl.setPointerCapture(e.pointerId);
    const cell = cellFromEvent(e);
    anchor = cell;
    hover = cell;
    dragging = true;
  }

  function onpointermove(e) {
    if (!dragging) return;
    hover = cellFromEvent(e);
  }

  function onpointerup() {
    if (!dragging) return;
    // Capture before clearing `dragging` - previewSelection is derived from
    // it, so reading it after would immediately recompute to null.
    const selection = previewSelection;
    dragging = false;
    if (selection) commitSelection(selection);
    anchor = null;
    hover = null;
  }

  function overlayLetters(cell) {
    return OVERLAYS.filter((letter) => cell.overlays[letter]);
  }
</script>

<div
  class="mainGrid"
  class:wire-mode={ledState.wireMode}
  bind:this={gridEl}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
>
  {#each { length: CELL_COUNT } as _, index (index)}
    {@const cell = ledState.grid[index]}
    {@const isSelected = previewSelection
      ? previewSelection.has(index)
      : ledState.selected.has(index)}
    {@const swatch = ["c", "r", "b"].includes(cell.func)
      ? hsvToColor(FC.LED_COLORS[cell.color])
      : ""}
    <div
      class="gPoint"
      class:selected={isSelected}
      class:has-func={cell.func !== ""}
      style:background={FUNCTION_COLORS[cell.func]}
    >
      <div class="indicators">
        {#if cell.directions.n}<span class="north"></span>{/if}
        {#if cell.directions.s}<span class="south"></span>{/if}
        {#if cell.directions.w}<span class="west"></span>{/if}
        {#if cell.directions.e}<span class="east"></span>{/if}
        {#if cell.directions.u}<span class="updown">U</span>{/if}
        {#if cell.directions.d}<span class="updown">D</span>{/if}
      </div>

      {#if cell.wire !== null}
        <span class="wire">{cell.wire}</span>
      {/if}

      {#if swatch}
        <span class="swatch" style:background={swatch}></span>
      {/if}

      {#if overlayLetters(cell).length}
        <span class="overlays">
          {#each overlayLetters(cell) as letter (letter)}
            <span class="dot" style:background={OVERLAY_DOT_COLORS[letter]}
            ></span>
          {/each}
        </span>
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .mainGrid {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 3px;
    width: 100%;
    max-width: 496px;
    aspect-ratio: 1;
    padding: 4px;
    border-radius: var(--radius-xs);
    background-color: #dcdcdc;
    background-image:
      repeating-linear-gradient(
        to right,
        transparent 0,
        transparent calc(25% - 1px),
        rgba(0, 0, 0, 0.15) calc(25% - 1px),
        rgba(0, 0, 0, 0.15) 25%
      ),
      repeating-linear-gradient(
        to bottom,
        transparent 0,
        transparent calc(25% - 1px),
        rgba(0, 0, 0, 0.15) calc(25% - 1px),
        rgba(0, 0, 0, 0.15) 25%
      );
    touch-action: none;
    user-select: none;

    &.wire-mode {
      background-color: rgba(15, 171, 22, 0.5);
    }
  }

  .gPoint {
    position: relative;
    aspect-ratio: 1;
    border: solid 1px #999;
    border-radius: 30%;
    background-color: #f4f4f4;
    cursor: pointer;

    &.has-func {
      box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.7);
    }

    &.selected {
      box-shadow: inset 0 0 8px rgba(255, 0, 255, 1) !important;
      border: solid 1px #000 !important;
    }
  }

  .indicators span {
    position: absolute;
    font-size: 7px;
    font-weight: bold;
    color: rgba(0, 0, 0, 0.8);
    line-height: 1;
  }

  .north {
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 4px solid rgba(0, 0, 0, 0.8);
  }

  .south {
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid rgba(0, 0, 0, 0.8);
  }

  .east {
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-left: 4px solid rgba(0, 0, 0, 0.8);
  }

  .west {
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-right: 4px solid rgba(0, 0, 0, 0.8);
  }

  .updown {
    top: 1px;
    left: 1px;
  }

  .wire {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.8);
    text-shadow:
      0 0 2px black,
      0 0 2px black;
    pointer-events: none;
  }

  .swatch {
    position: absolute;
    left: 15%;
    top: 15%;
    width: 30%;
    height: 30%;
    border-radius: var(--radius-xs);
    pointer-events: none;
  }

  .overlays {
    position: absolute;
    bottom: 1px;
    right: 1px;
    display: flex;
    gap: 1px;
    pointer-events: none;
  }

  .dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
  }

  @media only screen and (max-width: 575px) {
    .mainGrid {
      max-width: 100%;
    }
  }
</style>

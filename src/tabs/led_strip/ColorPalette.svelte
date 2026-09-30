<script>
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import { COLOR_COUNT, COLOR_TITLES } from "./constants.js";
  import {
    ledState,
    selectAltColor,
    selectColor,
    updateColorHSV,
  } from "./state.svelte.js";
  import { hsvToColor } from "./util.js";

  let activeHsv = $derived(
    FC.LED_COLORS[ledState.panel.color] ?? { h: 0, s: 0, v: 0 },
  );

  function onContextMenu(e, index) {
    e.preventDefault();
    selectAltColor(index);
  }
</script>

<div class="palette">
  {#each { length: COLOR_COUNT } as _, index (index)}
    <button
      class="swatch"
      class:active={ledState.panel.color === index}
      class:alt-active={ledState.panel.altColor === index}
      style:background={hsvToColor(FC.LED_COLORS[index]) || "#000"}
      title={$i18n.t(COLOR_TITLES[index])}
      onclick={() => selectColor(index)}
      oncontextmenu={(e) => onContextMenu(e, index)}
    >
      {index}
    </button>
  {/each}
</div>

<div class="sliders">
  <div class="row">
    <span class="label">{$i18n.t("ledStripH")}</span>
    <input
      type="range"
      min="0"
      max="359"
      value={activeHsv.h}
      oninput={(e) => updateColorHSV("h", Number(e.target.value))}
    />
    <span class="value">{activeHsv.h}</span>
  </div>
  <div class="row">
    <span class="label">{$i18n.t("ledStripS")}</span>
    <input
      type="range"
      min="0"
      max="255"
      value={activeHsv.s}
      oninput={(e) => updateColorHSV("s", Number(e.target.value))}
    />
    <span class="value">{activeHsv.s}</span>
  </div>
  <div class="row">
    <span class="label">{$i18n.t("ledStripV")}</span>
    <input
      type="range"
      min="0"
      max="255"
      value={activeHsv.v}
      oninput={(e) => updateColorHSV("v", Number(e.target.value))}
    />
    <span class="value">{activeHsv.v}</span>
  </div>
</div>

<style lang="scss">
  .palette {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  .swatch {
    height: 26px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xs);
    color: #fff;
    text-shadow:
      0 0 2px black,
      0 0 2px black;
    font-size: 0.7rem;
    cursor: pointer;

    &.active {
      border-color: #000;
      border-width: 2px;
    }

    &.alt-active {
      border-color: #f00;
      border-width: 2px;
    }
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }

  .row {
    display: grid;
    grid-template-columns: 14px 1fr 32px;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
  }

  .value {
    text-align: right;
    color: var(--color-text-soft);
  }

  input[type="range"] {
    width: 100%;
  }
</style>

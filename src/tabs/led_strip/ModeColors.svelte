<script>
  import Select from "@/components/Select.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import { MODE_OPTIONS, SPECIAL_COLOR_SLOTS } from "./constants.js";
  import { ledState, selectModeColor } from "./state.svelte.js";
  import { hsvToColor } from "./util.js";

  const DIRECTION_LABELS = [
    "ledStripDirN",
    "ledStripDirE",
    "ledStripDirS",
    "ledStripDirW",
    "ledStripDirU",
    "ledStripDirD",
  ];

  let selectedMode = $state(0);

  let modeOptions = $derived(
    MODE_OPTIONS.map((label, value) => ({ value, label: $i18n.t(label) })),
  );

  let visibleSpecialSlots = $derived(
    SPECIAL_COLOR_SLOTS.filter((slot) =>
      slot.forFunc.includes(ledState.panel.func),
    ),
  );

  function colorFor(mode, direction) {
    const mc = FC.LED_MODE_COLORS.find(
      (m) => m.mode === mode && m.direction === direction,
    );
    return mc ? hsvToColor(FC.LED_COLORS[mc.color]) : "";
  }

  function isActive(mode, direction) {
    return (
      ledState.selectedModeColor?.mode === mode &&
      ledState.selectedModeColor?.direction === direction
    );
  }
</script>

{#if ledState.panel.func === "f"}
  <div class="mode-colors">
    <div class="row">
      <span class="label">{$i18n.t("ledStripModeColorsTitle")}</span>
      <Select bind:value={selectedMode} options={modeOptions} />
    </div>
    <div class="buttons">
      {#each DIRECTION_LABELS as label, direction (direction)}
        <button
          class="mode-btn"
          class:active={isActive(selectedMode, direction)}
          style:background={colorFor(selectedMode, direction)}
          onclick={() => selectModeColor(selectedMode, direction)}
        >
          {$i18n.t(label)}
        </button>
      {/each}
    </div>
  </div>
{/if}

{#if visibleSpecialSlots.length}
  <div class="mode-colors">
    <span class="label">{$i18n.t("ledStripModesSpecialColorsTitle")}</span>
    <div class="buttons">
      {#each visibleSpecialSlots as slot (slot.direction)}
        <button
          class="mode-btn"
          class:active={isActive(6, slot.direction)}
          style:background={colorFor(6, slot.direction)}
          onclick={() => selectModeColor(6, slot.direction)}
        >
          {$i18n.t(slot.label)}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .mode-colors {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-soft);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .mode-btn {
    @extend %button;
    color: #fff;
    text-shadow:
      0 0 2px black,
      0 0 2px black;

    &.active {
      border-color: #000;
      border-width: 2px;
    }
  }
</style>

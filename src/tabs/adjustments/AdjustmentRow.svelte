<script>
  import wNumb from "wnumb";

  import NumberInput from "@/components/NumberInput.svelte";
  import RangeSlider from "@/components/RangeSlider.svelte";
  import Select from "@/components/Select.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import { FUNCTION_GROUPS, getFunctions } from "./functions.js";
  import {
    ALWAYS_ON_CH,
    AUX_MAX,
    AUX_MIN,
    PRIMARY_CHANNEL_COUNT,
    calcAdjValue,
    density,
    resetToOff,
  } from "./util.js";

  let { index, enaChannelOptions, adjChannelOptions, onRemove } = $props();

  const FUNCTIONS = getFunctions();

  let adjRange = $derived(FC.ADJUSTMENT_RANGES[index]);

  // adjType has no wire representation of its own (the firmware only knows
  // adjFunction/adjStep) - it's UI-only state seeded once from the loaded
  // data, then driven directly by the radio the user clicks, exactly like
  // legacy's mutable `adjRange.adjType`. It deliberately is NOT re-derived
  // from adjFunction on every change, because a user must be able to select
  // "Mapped"/"Stepped" *before* picking a function (which starts at None).
  let adjType = $derived.by(() =>
    adjRange.adjFunction > 0 ? (adjRange.adjStep > 0 ? 2 : 1) : 0,
  );

  let adjConfig = $derived(FUNCTIONS[adjRange.adjFunction] ?? FUNCTIONS[0]);

  let valSliderRef;

  function refreshValSlider(cfg) {
    valSliderRef?.update(
      {
        range: { min: cfg.min, max: cfg.max },
        pips: {
          mode: "values",
          values: cfg.pips,
          density: density(cfg.min, cfg.max, cfg.ticks),
          stepped: true,
        },
      },
      true,
    );
  }

  function goOff() {
    resetToOff(adjRange);
    refreshValSlider(FUNCTIONS[0]);
  }

  function setAdjType(newType) {
    adjType = newType;

    if (newType === 0) {
      goOff();
    } else if (newType === 1 && adjRange.adjStep > 0) {
      adjRange.adjStep = 0;
    } else if (newType === 2 && adjRange.adjStep === 0) {
      adjRange.adjStep = 1;
    }
  }

  function onFunctionChange(e) {
    const id = Number(e.target.value);
    const cfg = FUNCTIONS[id] ?? FUNCTIONS[0];
    adjRange.adjFunction = id;
    adjRange.adjMin = cfg.min;
    adjRange.adjMax = cfg.max;
    refreshValSlider(cfg);
  }

  function onEnaChannelChange(e) {
    const channel = Number(e.target.value);
    adjRange.enaChannel = channel;
    if (channel === ALWAYS_ON_CH) {
      adjRange.enaRange.start = 1500;
      adjRange.enaRange.end = 1500;
    }
  }

  function onAdjChannelChange(e) {
    adjRange.adjChannel = Number(e.target.value);
  }

  const channelRange = { min: AUX_MIN, max: AUX_MAX };
  const channelPips = [900, 1000, 1250, 1500, 1750, 2000, 2100];

  const rangeSliderOpts = {
    range: channelRange,
    step: 5,
    connect: true,
    behaviour: "snap-drag",
    format: wNumb({ decimals: 0 }),
    pips: {
      mode: "values",
      values: channelPips,
      density: density(AUX_MIN, AUX_MAX, 50),
      stepped: true,
    },
  };

  const incSliderOpts = {
    range: channelRange,
    step: 5,
    connect: true,
    behaviour: "snap-drag",
    format: wNumb({ decimals: 0 }),
  };

  const initialValSliderOpts = $derived({
    range: { min: adjConfig.min, max: adjConfig.max },
    step: 1,
    connect: true,
    behaviour: "snap-drag",
    format: wNumb({ decimals: 0 }),
    pips: {
      mode: "values",
      values: adjConfig.pips,
      density: density(adjConfig.min, adjConfig.max, adjConfig.ticks),
      stepped: true,
    },
  });

  // --- live RC channel visualization ---

  let enaChannelPos = $derived(
    adjRange.enaChannel >= 0 && adjRange.enaChannel < ALWAYS_ON_CH
      ? FC.RC.channels[adjRange.enaChannel + PRIMARY_CHANNEL_COUNT]
      : null,
  );

  let adjChannelPos = $derived(
    adjRange.adjChannel >= 0
      ? FC.RC.channels[adjRange.adjChannel + PRIMARY_CHANNEL_COUNT]
      : null,
  );

  function toPercent(pos) {
    return pos == null
      ? null
      : (((pos - AUX_MIN) / (AUX_MAX - AUX_MIN)) * 100).clamp(0, 100);
  }

  let enaMarkerPercent = $derived(
    adjType > 0 && adjRange.enaChannel !== ALWAYS_ON_CH
      ? toPercent(enaChannelPos)
      : null,
  );

  let adjMarkerPercent = $derived(
    adjType > 0 ? toPercent(adjChannelPos) : null,
  );

  let adjResult = $derived(
    calcAdjValue(adjRange, adjType, enaChannelPos, adjChannelPos, ALWAYS_ON_CH),
  );

  let valMarkerPercent = $derived(
    adjType === 1 && adjResult.active
      ? (
          ((adjResult.value - adjConfig.min) /
            (adjConfig.max - adjConfig.min)) *
          100
        ).clamp(0, 100)
      : null,
  );
</script>

<div class="adjustment-card">
  <div class="card-header">
    <span class="slot-label"
      >{$i18n.t("adjustmentsSlotLabel", { index: index + 1 })}</span
    >
    <div class="grow"></div>
    <button
      type="button"
      class="remove-btn"
      aria-label={$i18n.t("adjustmentsRemoveButton")}
      onclick={onRemove}
    >
      <em class="fas fa-trash"></em>
    </button>
  </div>

  <div class="card-body">
    <div class="cell mode">
      <label class="radio-option">
        <input
          type="radio"
          name="adjType-{index}"
          checked={adjType === 0}
          onchange={() => setAdjType(0)}
        />
        <span>{$i18n.t("adjustmentsTypeOff")}</span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          name="adjType-{index}"
          checked={adjType === 1}
          onchange={() => setAdjType(1)}
        />
        <span>{$i18n.t("adjustmentsTypeMapped")}</span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          name="adjType-{index}"
          checked={adjType === 2}
          onchange={() => setAdjType(2)}
        />
        <span>{$i18n.t("adjustmentsTypeStepped")}</span>
      </label>
    </div>

    <!-- row 1: enable channel -->
    <div class="cell ena-select" class:disabled={adjType === 0}>
      <div class="select-row">
        <span class="channel-label">{$i18n.t("adjustmentEnableChannel")}</span>
        <Select
          id="ena-channel-{index}"
          value={adjRange.enaChannel}
          options={enaChannelOptions}
          disabled={adjType === 0}
          onchange={onEnaChannelChange}
        />
      </div>
      <div class="channel-value-line">
        <span class="value-box"
          >{enaChannelPos != null ? enaChannelPos + "µs" : "-"}</span
        >
      </div>
    </div>
    <div
      class="cell ena-slider slider-wrap"
      class:disabled={adjType === 0 || adjRange.enaChannel === ALWAYS_ON_CH}
    >
      <RangeSlider
        opts={rangeSliderOpts}
        bind:start={adjRange.enaRange.start}
        bind:end={adjRange.enaRange.end}
        markerPercent={enaMarkerPercent}
      />
    </div>
    <div class="cell ena-range range-line" class:disabled={adjType === 0}>
      <NumberInput
        min={AUX_MIN}
        max={adjRange.enaRange.end}
        step="5"
        disabled={adjType === 0 || adjRange.enaChannel === ALWAYS_ON_CH}
        bind:value={adjRange.enaRange.start}
      />
      <span class="dash">-</span>
      <NumberInput
        min={adjRange.enaRange.start}
        max={AUX_MAX}
        step="5"
        disabled={adjType === 0 || adjRange.enaChannel === ALWAYS_ON_CH}
        bind:value={adjRange.enaRange.end}
      />
    </div>

    <!-- row 2: value channel -->
    <div class="cell ch-select" class:disabled={adjType === 0}>
      <div class="select-row">
        <span class="channel-label">{$i18n.t("adjustmentValueChannel")}</span>
        <Select
          id="adj-channel-{index}"
          value={adjRange.adjChannel}
          options={adjChannelOptions}
          disabled={adjType === 0}
          onchange={onAdjChannelChange}
        />
      </div>
      <div class="channel-value-line">
        <span class="value-box"
          >{adjChannelPos != null ? adjChannelPos + "µs" : "-"}</span
        >
      </div>
    </div>
    <div class="cell ch-slider">
      <div class="slider-wrap" class:disabled={adjType === 0}>
        <RangeSlider
          opts={rangeSliderOpts}
          bind:start={adjRange.adjRange1.start}
          bind:end={adjRange.adjRange1.end}
          markerPercent={adjMarkerPercent}
        />
      </div>
      {#if adjType === 2}
        <div class="slider-wrap">
          <RangeSlider
            opts={incSliderOpts}
            bind:start={adjRange.adjRange2.start}
            bind:end={adjRange.adjRange2.end}
          />
        </div>
      {/if}
    </div>
    <div class="cell ch-range">
      <div class="range-line" class:disabled={adjType === 0}>
        <NumberInput
          min={AUX_MIN}
          max={adjRange.adjRange1.end}
          step="5"
          disabled={adjType === 0}
          bind:value={adjRange.adjRange1.start}
        />
        <span class="dash">-</span>
        <NumberInput
          min={adjRange.adjRange1.start}
          max={AUX_MAX}
          step="5"
          disabled={adjType === 0}
          bind:value={adjRange.adjRange1.end}
        />
      </div>
      {#if adjType === 2}
        <div class="range-line">
          <NumberInput
            min={AUX_MIN}
            max={adjRange.adjRange2.end}
            step="5"
            bind:value={adjRange.adjRange2.start}
          />
          <span class="dash">-</span>
          <NumberInput
            min={adjRange.adjRange2.start}
            max={AUX_MAX}
            step="5"
            bind:value={adjRange.adjRange2.end}
          />
        </div>
      {/if}
    </div>

    <!-- row 3: function -->
    <div class="cell func" class:disabled={adjType === 0}>
      <select
        id="function-{index}"
        class="function-select"
        value={adjRange.adjFunction}
        disabled={adjType === 0}
        onchange={onFunctionChange}
      >
        <option value={0} hidden={FUNCTIONS[0].hide}
          >{$i18n.t("adjustmentsFunction" + FUNCTIONS[0].name)}</option
        >
        {#each FUNCTION_GROUPS as group (group.label)}
          {#if group.ids.some((id) => !FUNCTIONS[id].hide)}
            <optgroup label={$i18n.t(group.label)}>
              {#each group.ids as id (id)}
                <option value={id} hidden={FUNCTIONS[id].hide}>
                  {$i18n.t("adjustmentsFunction" + FUNCTIONS[id].name)}
                </option>
              {/each}
            </optgroup>
          {/if}
        {/each}
      </select>

      <div class="value-line">
        <span class="value-label">{$i18n.t("adjustmentFunctionValue")}</span>
        <span class="value-box">{adjResult.string}</span>
      </div>

      {#if adjType === 2}
        <div class="step-line">
          <span class="step-label">{$i18n.t("adjustmentRangeStep")}</span>
          <NumberInput min="0" max="255" bind:value={adjRange.adjStep} />
        </div>
      {/if}
    </div>
    <div class="cell func-slider">
      <div class="slider-wrap" class:disabled={adjType === 0}>
        <RangeSlider
          bind:this={valSliderRef}
          opts={initialValSliderOpts}
          bind:start={adjRange.adjMin}
          bind:end={adjRange.adjMax}
          markerPercent={valMarkerPercent}
        />
      </div>
    </div>
    <div class="cell func-range range-line" class:disabled={adjType === 0}>
      <NumberInput
        min={adjConfig.min}
        max={adjRange.adjMax}
        disabled={adjType === 0}
        bind:value={adjRange.adjMin}
      />
      <span class="dash">-</span>
      <NumberInput
        min={adjRange.adjMin}
        max={adjConfig.max}
        disabled={adjType === 0}
        bind:value={adjRange.adjMax}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .adjustment-card {
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background-color: var(--color-surface);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    font-weight: 600;

    color: var(--color-text-soft);
    background-color: var(--color-surface-float, var(--color-surface));
    border-bottom: 1px solid var(--color-border);
  }

  .grow {
    flex-grow: 1;
  }

  .remove-btn {
    background: none;
    border: none;
    padding: 4px 6px;
    cursor: pointer;
    color: var(--color-text-soft);

    &:hover {
      color: var(--color-danger, var(--accent));
    }
  }

  /* Mirrors the legacy table's 4-column x 3-row layout (Mode | Channel
     select | Slider | Range inputs), with Mode spanning rows 1-2 and the
     Function row spanning the Mode+Channel columns - so each conceptual
     row (Enable, Value channel, Function) reads left-to-right as one band,
     instead of grouping by column like a form. */
  .card-body {
    display: grid;
    grid-template-columns: 130px 190px minmax(260px, 1fr) 190px;
    grid-template-areas:
      "mode ena-select   ena-slider  ena-range"
      "mode ch-select    ch-slider   ch-range"
      "func func         func-slider func-range";
    column-gap: 16px;
    align-items: start;
    padding: 12px 14px;
  }

  .cell.disabled {
    opacity: 0.55;
  }

  .mode {
    grid-area: mode;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 12px 0 0;
    border-right: 1px solid var(--color-border);
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ena-select {
    grid-area: ena-select;
  }

  .ena-slider {
    grid-area: ena-slider;
  }

  .ena-range {
    grid-area: ena-range;
  }

  .ch-select {
    grid-area: ch-select;
  }

  .ch-slider {
    grid-area: ch-slider;
  }

  .ch-range {
    grid-area: ch-range;
  }

  .func {
    grid-area: func;
  }

  .func-slider {
    grid-area: func-slider;
  }

  .func-range {
    grid-area: func-range;
  }

  .ch-select,
  .ch-slider,
  .ch-range,
  .func,
  .func-slider,
  .func-range {
    padding-top: 20px;
    border-top: 1px solid var(--color-border);
  }

  .ena-select,
  .ch-select {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .select-row {
    display: flex;
    align-items: center;
    gap: 8px;

    /* Fixed width so the Enable/Value Channel rows' dropdowns line up
       regardless of the selected option's text length (e.g. "ALWAYS" vs
       "AUX1"). */
    :global(select) {
      width: 100px;
    }
  }

  .channel-label {
    min-width: 90px;
    font-size: 0.8rem;
    color: var(--color-text-soft);
  }

  .channel-value-line {
    display: flex;
    justify-content: flex-end;

    .value-box {
      width: 100px;
    }
  }

  .slider-wrap {
    margin: 6px 4px 42px;

    &.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  .range-line {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    margin-bottom: 10px;
  }

  .dash {
    padding: 0 2px;
  }

  .function-select {
    width: 100%;
  }

  .value-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 8px 0;
  }

  .value-box {
    min-width: 70px;
    padding: 2px 6px;
    text-align: right;
    font-family: var(--font-mono);
    border-radius: var(--radius-xs);

    color: var(--color-text);
    background-color: var(--color-input-bg);
    border: 1px solid var(--color-border-soft);
  }

  .step-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .step-label {
    color: var(--color-text-soft);
    font-size: 0.8rem;
  }

  @media only screen and (max-width: 768px) {
    .card-body {
      grid-template-columns: 1fr;
      grid-template-areas:
        "mode"
        "ena-select"
        "ena-slider"
        "ena-range"
        "ch-select"
        "ch-slider"
        "ch-range"
        "func"
        "func-slider"
        "func-range";
    }

    .mode {
      flex-direction: row;
      flex-wrap: wrap;
      padding: 0 0 8px;
      border-right: none;
      border-bottom: 1px solid var(--color-border);
    }

    .ch-select,
    .func {
      border-top: none;
      padding-top: 0;
    }
  }
</style>

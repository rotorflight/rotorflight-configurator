<script>
  import wNumb from "wnumb";

  import RangeSlider from "@/components/RangeSlider.svelte";
  import Select from "@/components/Select.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  // Roll, pitch, yaw, collective and throttle come before AUX1.
  const PRIMARY_CHANNEL_COUNT = 5;
  const CHANNEL_MIN = 900;
  const CHANNEL_MAX = 2100;

  let { item, showLogic, channelOptions, logicOptions, onEdit, onDelete } =
    $props();

  const sliderOpts = {
    range: { min: CHANNEL_MIN, max: CHANNEL_MAX },
    behaviour: "snap-drag",
    margin: 25,
    step: 5,
    connect: true,
    format: wNumb({ decimals: 0 }),
    pips: {
      mode: "values",
      values: [900, 1000, 1200, 1400, 1500, 1600, 1800, 2000, 2100],
      density: 4,
      stepped: true,
    },
  };

  function clampChannel(value) {
    return Math.min(CHANNEL_MAX, Math.max(CHANNEL_MIN, value));
  }

  let markerPercent = $derived(
    item.channel === -1
      ? null
      : ((clampChannel(FC.RC.channels[PRIMARY_CHANNEL_COUNT + item.channel]) -
          CHANNEL_MIN) /
          (CHANNEL_MAX - CHANNEL_MIN)) *
          100,
  );
</script>

<div class="row">
  <div class="channel-info">
    <Select
      bind:value={item.channel}
      options={channelOptions}
      onchange={onEdit}
    />
    {#if showLogic}
      <Select
        bind:value={item.logic}
        options={logicOptions}
        onchange={onEdit}
      />
    {/if}
    <div class="limits">
      <p class="limit">{$i18n.t("auxiliaryMin")} <span>{item.start}</span></p>
      <p class="limit">{$i18n.t("auxiliaryMax")} <span>{item.end}</span></p>
    </div>
  </div>

  <div class="slider">
    <RangeSlider
      compact
      bind:start={item.start}
      bind:end={item.end}
      opts={sliderOpts}
      {markerPercent}
      changeOnSlide={false}
      onchange={onEdit}
    />
  </div>

  <button class="delete" onclick={onDelete} aria-label="Delete">
    <span class="fas fa-times"></span>
  </button>
</div>

<style lang="scss">
  .row {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 32px 8px 12px;
    border-bottom: 1px solid var(--color-border-soft);

    &:last-child {
      border-bottom: none;
    }
  }

  .channel-info {
    flex: none;
    width: 110px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .limits {
    display: flex;
    justify-content: space-between;
    gap: 6px;
  }

  .limit {
    margin: 0;
    font-size: 0.75rem;
    color: var(--color-text-soft);

    span {
      font-weight: 600;
      color: var(--color-text);
    }
  }

  .slider {
    flex: 1;
    min-width: 0;
    padding: 10px 12px 22px;
  }

  .delete {
    position: absolute;
    top: 8px;
    right: 6px;
    background: none;
    border: none;
    padding: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text-soft);

    @media (hover: hover) {
      &:hover {
        color: var(--color-text);
      }
    }
  }
</style>

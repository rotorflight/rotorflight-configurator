<script>
  // This component shows a meter of the throttle channel that indicates the
  // current effect the throttle input is having on the governor

  import { onMount, onDestroy } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { RC_COMMAND } from "@/tabs/receiver/rc_command.svelte.js";

  import { GOV_THROTTLE_TYPE } from "./state.svelte.js";

  const RC_THROTTLE_DEADBAND = 5;

  let pollerInterval;

  onMount(() => {
    pollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RX_CHANNELS);
    }, 50);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
  });

  let min = FC.RX_CONFIG.rx_pulse_min;
  let max = FC.RX_CONFIG.rx_pulse_max;
  let current = $derived(RC_COMMAND.throttle?.pwm ?? 0);

  let markerOffset = $derived((100 * (current - min)) / (max - min));

  function getOffset(pwm) {
    return (100 * (pwm - min)) / (max - min);
  }

  let throttleLow = $derived.by(() => {
    if (FC.RC_CONFIG.rc_min_throttle > 0) {
      return FC.RC_CONFIG.rc_min_throttle;
    }
    return FC.RC_CONFIG.rc_center - FC.RC_CONFIG.rc_deflection * 0.9;
  });

  let throttleHigh = $derived.by(() => {
    if (FC.RC_CONFIG.rc_max_throttle > 0) {
      return FC.RC_CONFIG.rc_max_throttle;
    }
    return FC.RC_CONFIG.rc_center + FC.RC_CONFIG.rc_deflection * 0.9;
  });

  let pwmOff = $derived(throttleLow - RC_THROTTLE_DEADBAND);

  let ranges = $derived.by(() => {
    if (
      FC.GOVERNOR.gov_mode === 0 ||
      (FC.GOVERNOR.gov_mode === 1 &&
        FC.GOVERNOR.gov_throttle_type === GOV_THROTTLE_TYPE.NORMAL)
    ) {
      return [
        { label: "off", color: "red", pwmMin: min, pwmMax: pwmOff },
        { label: "run", color: "green", pwmMin: pwmOff, pwmMax: max },
      ];
    }

    if (FC.GOVERNOR.gov_throttle_type === GOV_THROTTLE_TYPE.FUNCTION) {
      let pwmIdle = Math.trunc(
        throttleLow + (throttleHigh - throttleLow) * 0.333,
      );
      let pwmAuto = Math.trunc(
        throttleLow + (throttleHigh - throttleLow) * 0.666,
      );

      return [
        { label: "off", color: "red", pwmMin: min, pwmMax: pwmOff },
        { label: "idle", color: "orange", pwmMin: pwmOff, pwmMax: pwmIdle },
        { label: "auto", color: "purple", pwmMin: pwmIdle, pwmMax: pwmAuto },
        { label: "run", color: "green", pwmMin: pwmAuto, pwmMax: max },
      ];
    }

    let pwmAuto =
      throttleLow +
      (throttleHigh - throttleLow) * (FC.GOVERNOR.gov_auto_throttle / 10 / 100);
    let pwmHandover =
      throttleLow +
      (throttleHigh - throttleLow) * (FC.GOVERNOR.gov_handover_throttle / 100);
    return [
      { label: "off", color: "red", pwmMin: min, pwmMax: pwmOff },
      { label: "idle", color: "orange", pwmMin: pwmOff, pwmMax: pwmAuto },
      { label: "auto", color: "purple", pwmMin: pwmAuto, pwmMax: pwmHandover },
      { label: "run", color: "green", pwmMin: pwmHandover, pwmMax: max },
    ];
  });

  let currentPercent = $derived(
    Math.min(
      Math.max(
        (100 * (current - throttleLow)) / (throttleHigh - throttleLow),
        0,
      ),
      100,
    ),
  );
</script>

<div class="container">
  <div class="meter-wrapper">
    <div class="meter">
      {#each ranges as range (range.label)}
        {#if range.pwmMax > range.pwmMin}
          <div
            class="range {range.color}"
            class:active={current >= range.pwmMin && current < range.pwmMax}
            style:left={`${getOffset(range.pwmMin)}%`}
            style:right={`${100 - getOffset(range.pwmMax)}%`}
          >
            <span class="text">
              {range.label}
            </span>
          </div>
        {/if}
      {/each}
    </div>
    <div class="current-text" style:left={`${markerOffset}%`}>
      {#if current < pwmOff}
        OFF
      {:else}
        {currentPercent.toFixed(1)}%
      {/if}
    </div>
    <div class="marker" style:left={`${markerOffset}%`}></div>
    <div class="min-throttle" style:right={`${100 - getOffset(throttleLow)}%`}>
      0%
    </div>
    <div class="max-throttle" style:left={`${getOffset(throttleHigh)}%`}>
      100%
    </div>
  </div>
</div>

<style lang="scss">
  @use "sass:color";

  .container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    padding-top: 32px;
    margin-bottom: 24px;
    margin-left: 24px;
    margin-right: 24px;
  }

  .meter {
    height: 24px;
    border-radius: 4px;
    background-color: var(--color-bg);
    border: 1px solid var(--color-bg);
    position: relative;
    overflow: hidden;
    box-sizing: content-box;

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.4);
      z-index: 2;
    }
  }

  .marker {
    --hue: 300deg;
    position: absolute;
    bottom: -8px;
    height: 14px;
    width: 2px;
    background-color: oklch(48% 80% var(--hue));
    border-radius: 1px;
    box-shadow: 0px 0px 6px oklch(80% 80% var(--hue));
  }

  .current-text {
    position: absolute;
    color: var(--color-text);
    bottom: -24px;
    transform: translateX(-50%);
  }

  .min-throttle {
    position: absolute;
    color: var(--color-text);
    top: 16px;
    padding-right: 4px;
    padding-bottom: 4px;

    border-right: 2px solid black;
  }

  .max-throttle {
    position: absolute;
    color: var(--color-text);
    top: 16px;
    padding-left: 4px;
    padding-bottom: 4px;

    border-left: 2px solid black;
  }

  .range {
    position: absolute;
    height: 24px;
    display: flex;
    justify-content: center;
    overflow: visible;
    line-height: 24px;

    text-transform: uppercase;
    font-weight: 600;
    box-sizing: border-box;
    border-bottom: 2px solid transparent;

    .text {
      white-space: nowrap;
      display: inline-block;
      z-index: 1;
    }

    &.active {
      border-bottom: 2px solid black;
    }

    &.red {
      background-color: oklch(80% 70% 30deg);
    }
    &.orange {
      background-color: oklch(80% 70% 80deg);
    }
    &.purple {
      background-color: oklch(80% 70% 280deg);
    }
    &.green {
      background-color: oklch(80% 70% 125deg);
    }
  }

  @media only screen and (max-width: 480px) {
    .range .text {
      font-size: 10px;
    }
  }
</style>

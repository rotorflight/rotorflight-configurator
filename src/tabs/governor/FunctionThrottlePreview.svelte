<script>
  // This component shows a meter of the throttle channel that indicates the
  // current effect the throttle input is having on the governor

  import { onMount, onDestroy } from "svelte";

  import { FC } from "@/js/fc.svelte.js";

  import { RC_COMMAND } from "@/tabs/receiver/rc_command.svelte.js";

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

  let throttleLow = FC.RC_CONFIG.rc_min_throttle;
  if (throttleLow === 0) {
    throttleLow = FC.RC_CONFIG.rc_center - FC.RC_CONFIG.rc_deflection * 0.9;
  }

  let throttleHigh = FC.RC_CONFIG.rc_max_throttle;
  if (throttleHigh === 0) {
    throttleHigh = FC.RC_CONFIG.rc_center + FC.RC_CONFIG.rc_deflection * 0.9;
  }

  let markerOffset = $derived((100 * (current - min)) / (max - min));

  function getOffset(pwm) {
    return (100 * (pwm - min)) / (max - min);
  }

  let pwmOff = $derived(throttleLow - RC_THROTTLE_DEADBAND);
  let pwmIdle = $derived(
    Math.trunc(throttleLow + (throttleHigh - throttleLow) * 0.333),
  );
  let pwmAuto = $derived(
    Math.trunc(throttleLow + (throttleHigh - throttleLow) * 0.666),
  );

  let ranges = $derived([
    { label: "off", pwmMin: min, pwmMax: pwmOff },
    { label: "idle", pwmMin: pwmOff, pwmMax: pwmIdle },
    { label: "auto", pwmMin: pwmIdle, pwmMax: pwmAuto },
    { label: "run", pwmMin: pwmAuto, pwmMax: max },
  ]);
</script>

<div class="container">
  <div class="meter-wrapper">
    <div class="meter">
      {#each ranges as range}
        <div
          class="range {range.label}"
          class:active={current >= range.pwmMin && current < range.pwmMax}
          style:left={`${getOffset(range.pwmMin)}%`}
          style:right={`${100 - getOffset(range.pwmMax)}%`}
        >
          {range.label}
        </div>
      {/each}
    </div>
    <div class="current-text" style:left={`${markerOffset}%`}>
      {current}μs
    </div>
    <div class="marker" style:left={`${markerOffset}%`}></div>
  </div>
</div>

<style lang="scss">
  @use "sass:color";

  .container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    margin-top: 16px;
    margin-bottom: 24px;
  }

  .meter {
    height: 24px;
    margin: 0px 24px;
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

  $range-color-red: oklch(80% 70% 30deg);
  $range-color-orange: oklch(80% 70% 80deg);
  $range-color-yellow: oklch(80% 70% 280deg);
  $range-color-green: oklch(80% 70% 125deg);

  .range {
    position: absolute;
    height: 24px;
    text-align: center;
    line-height: 24px;

    text-transform: uppercase;
    font-weight: 600;
    box-sizing: border-box;
    border-bottom: 2px solid transparent;

    &.active {
      border-bottom: 2px solid black;
    }

    &.off {
      background-color: $range-color-red;
    }
    &.idle {
      background-color: $range-color-orange;
    }
    &.auto {
      background-color: $range-color-yellow;
    }
    &.run {
      background-color: $range-color-green;
    }
  }
</style>

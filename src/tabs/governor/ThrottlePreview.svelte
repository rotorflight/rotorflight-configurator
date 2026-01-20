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
    margin-bottom: 32px;
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
    position: absolute;
    bottom: -12px;
    height: 12px;
    width: 2px;
    border-radius: 1px;

    :global(html[data-theme="light"]) & {
      --hue: 300deg;
      background-color: hsl(272.5, 100%, 47.05%);
      background-color: oklch(48% 80% 300deg);
      box-shadow: 0px 0px 6px hsl(272.5, 100%, 47.05%);
      box-shadow: 0px 0px 6px oklch(80% 80% 300deg);
    }

    :global(html[data-theme="dark"]) & {
      background-color: hsl(280, 80%, 40%);
      box-shadow: 0px 0px 6px black;
    }
  }

  .current-text {
    position: absolute;
    color: var(--color-text);
    bottom: -28px;
    transform: translateX(-50%);
  }

  .min-throttle {
    position: absolute;
    color: var(--color-text);
    top: 16px;
    padding-right: 4px;
    padding-bottom: 4px;

    :global(html[data-theme="light"]) & {
      border-right: 2px solid black;
    }

    :global(html[data-theme="dark"]) & {
      border-right: 2px solid hsl(0, 0%, 70%);
    }
  }

  .max-throttle {
    position: absolute;
    color: var(--color-text);
    top: 16px;
    padding-left: 4px;
    padding-bottom: 4px;

    :global(html[data-theme="light"]) & {
      border-left: 2px solid black;
    }

    :global(html[data-theme="dark"]) & {
      border-left: 2px solid hsl(0, 0%, 70%);
    }
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
      color: var(--color-text-soft);
    }

    &.active {
      :global(html[data-theme="light"]) & {
        border-bottom: 2px solid black;
      }

      :global(html[data-theme="dark"]) & {
        border-bottom: 2px solid hsl(0, 0%, 80%);
      }
    }

    &.red {
      :global(html[data-theme="light"]) & {
        background-color: hsl(7.4, 100%, 61.75%);
        background-color: oklch(80% 70% 30deg);
      }

      :global(html[data-theme="dark"]) & {
        background-color: hsl(2, 65%, 35%);
      }
    }

    &.orange {
      :global(html[data-theme="light"]) & {
        background-color: hsl(37, 100%, 48.65%);
        background-color: oklch(80% 70% 80deg);
      }

      :global(html[data-theme="dark"]) & {
        background-color: hsl(30, 70%, 40%);
      }
    }

    &.purple {
      :global(html[data-theme="light"]) & {
        background-color: hsl(245.3, 100%, 80.2%);
        background-color: oklch(0.8 0.28 280deg);
      }

      :global(html[data-theme="dark"]) & {
        background-color: hsl(258, 38%, 45%);
      }
    }

    &.green {
      :global(html[data-theme="light"]) & {
        background-color: hsl(78.6, 100%, 42.35%);
        background-color: oklch(80% 70% 125deg);
      }

      :global(html[data-theme="dark"]) & {
        background-color: hsl(92, 58%, 30%);
      }
    }
  }

  @media only screen and (max-width: 480px) {
    .range .text {
      font-size: 10px;
    }
  }
</style>

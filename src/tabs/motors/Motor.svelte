<script>
  import semver from "semver";
  import { onMount, onDestroy } from "svelte";
  import { slide } from "svelte/transition";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { API_VERSION_12_9 } from "@/js/data_storage.js";

  import Section from "@/components/Section.svelte";
  import Meter from "@/components/Meter.svelte";
  import Slider from "@/components/Slider.svelte";

  import motorState from "./state.svelte.js";

  let { index } = $props();

  let slider = $state();

  let width = $state(0);
  let mobile = $derived(width <= 480);
  let sliderDensity = $derived(mobile ? 10 : 5);
  let sliderValues = $derived.by(() => {
    const values = [];
    const step = mobile ? 20 : 10;
    for (let i = 0; i <= 100; i += step) {
      values.push(i);
    }

    return values;
  });

  let sliderOpts = $derived({
    range: {
      min: 0,
      max: 100,
    },
    connect: [true, false],
    start: 0,
    step: 1,
    behaviour: "snap-drag",
    pips: {
      mode: "values",
      values: sliderValues,
      density: sliderDensity,
      stepped: true,
    },
  });

  $effect(() => {
    slider?.update(sliderOpts);
  });

  let throttle = $derived.by(() => {
    const value = FC.MOTOR_DATA[index];

    if (value < 0) {
      return (value + 1000) / 10;
    }

    if (value > 0) {
      return (value - 1000) / 10;
    }

    return 0;
  });
  let rpm = $derived(FC.MOTOR_TELEMETRY_DATA.rpm[index] ?? 0);
  let voltage = $derived(FC.MOTOR_TELEMETRY_DATA.voltage[index] / 1000);
  let current = $derived(FC.MOTOR_TELEMETRY_DATA.current[index] / 1000);
  let temp1 = $derived(FC.MOTOR_TELEMETRY_DATA.temperature[index] / 10);
  let temp2 = $derived(FC.MOTOR_TELEMETRY_DATA.temperature2[index] / 10);
  let errors = $derived(FC.MOTOR_TELEMETRY_DATA.invalidPercent[index] / 100);

  let rpmMax = $state(5000);
  let voltageMax = $state(10);
  let currentMax = $state(10);
  let temp1Max = $state(100);
  let temp2Max = $state(100);

  $effect(() => {
    if (rpm > rpmMax) {
      rpmMax = Math.ceil((rpm + 1000) / 1000) * 1000;
    }

    if (voltage > voltageMax) {
      voltageMax = Math.ceil((voltage + 1) / 1) * 1;
    }

    if (current > currentMax) {
      currentMax = Math.ceil((current + 1) / 1) * 1;
    }

    if (temp1 > temp1Max) {
      temp1Max = Math.ceil((temp1 + 1) / 1) * 1;
    }

    if (temp2 > temp2Max) {
      temp2Max = Math.ceil((temp2 + 1) / 1) * 1;
    }
  });

  // Limit how frequently the throttle position can be updated
  let timeoutId;
  function updateThrottle() {
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        mspHelper.sendMotorOverride(index);
      }, 50);
    }
  }

  let overrideIntervalId;
  onMount(() => {
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)) {
      overrideIntervalId = setInterval(() => {
        mspHelper.sendMotorOverride(index);
      }, 250);
    }
  });

  onDestroy(() => {
    clearInterval(overrideIntervalId);
    clearTimeout(timeoutId);
    timeoutId = null;
  });
</script>

<svelte:window bind:innerWidth={width} />

<Section>
  {#snippet header()}
    <div class="header">
      <span>Motor #{index + 1}</span>
      {#if motorState.overrideEnabled}
        <span>-</span>
        <span>{FC.MOTOR_OVERRIDE[index] * 0.1}%</span>
      {/if}
    </div>
  {/snippet}
  {#if motorState.overrideEnabled}
    <div transition:slide>
      <div class="slider-container">
        <Slider
          bind:this={slider}
          bind:value={
            () => FC.MOTOR_OVERRIDE[index] * 0.1,
            (v) => (FC.MOTOR_OVERRIDE[index] = v * 10)
          }
          onchange={updateThrottle}
          opts={sliderOpts}
        />
      </div>
    </div>
  {/if}
  <div>
    {#if motorState.overrideEnabled}
      <div transition:slide>
        <div class="bar">
          <Meter
            title={$i18n.t("motorThrottle")}
            rightLabel="100%"
            leftLabel={`${throttle}%`}
            value={throttle}
          />
        </div>
      </div>
    {/if}
    <div class="bar">
      <Meter
        title={$i18n.t("motorRPM")}
        rightLabel={`${rpmMax.toLocaleString()} RPM`}
        leftLabel={`${rpm.toLocaleString()} RPM`}
        value={(100 * rpm) / rpmMax}
      />
    </div>
    {#if motorState.telemEnabled}
      <div transition:slide>
        <div class="bar">
          <Meter
            title={$i18n.t("motorVoltage")}
            rightLabel={`${voltageMax} V`}
            leftLabel={`${voltage.toFixed(2)} V`}
            value={(100 * voltage) / voltageMax}
          />
        </div>
        <div class="bar">
          <Meter
            title={$i18n.t("motorCurrent")}
            rightLabel={`${currentMax} A`}
            leftLabel={`${current.toFixed(2)} A`}
            value={(100 * current) / currentMax}
          />
        </div>
        <div class="bar">
          <Meter
            title={$i18n.t("motorTemperature", { number: 1 })}
            rightLabel={`${temp1Max} °C`}
            leftLabel={`${temp1.toFixed(1)} °C`}
            value={(100 * temp1) / temp1Max}
          />
        </div>
        <div class="bar">
          <Meter
            title={$i18n.t("motorTemperature", { number: 2 })}
            rightLabel={`${temp2Max} °C`}
            leftLabel={`${temp2.toFixed(1)} °C`}
            value={(100 * temp2) / temp2Max}
          />
        </div>
      </div>
    {/if}
    {#if FC.ESC_SENSOR_CONFIG.use_dshot_telemetry}
      <div transition:slide>
        <div class="bar">
          <Meter
            title={$i18n.t("motorDshotError")}
            rightLabel="100%"
            leftLabel={`${errors.toFixed(2)}%`}
            value={errors}
          />
        </div>
      </div>
    {/if}
  </div>
</Section>

<style lang="scss">
  .bar {
    padding: 4px;
  }

  .slider-container {
    margin-bottom: 20px;
    padding: 16px;
  }

  .header {
    @extend %section-header;
    padding-left: 8px;
    gap: 8px;
  }

  @media only screen and (max-width: 480px) {
    .header {
      margin-top: 16px;

      :global(html[data-theme="light"]) & {
        background: none;
      }

      :global(html[data-theme="dark"]) & {
        background: none;
      }
    }

    .slider-container {
      margin: 20px 16px;
    }
  }
</style>

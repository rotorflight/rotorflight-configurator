<script>
  import { onDestroy, onMount, untrack } from "svelte";

  import HelpIcon from "@/components/HelpIcon.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Switch from "@/components/Switch.svelte";

  import { config } from "@/js/config.svelte.ts";
  import { FC } from "@/js/fc.svelte.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { have_sensor } from "@/js/serial_backend.js";

  import SensorPanel from "./SensorPanel.svelte";
  import {
    WINDOW,
    accelAngles,
    dynamicDomain,
    makeBuffer,
    pushSample,
  } from "./util.js";

  const RATE_OPTIONS = [10, 20, 30, 40, 50, 100, 250, 500, 1000].map((ms) => ({
    value: ms,
    label: `${ms} ms`,
  }));
  const GYRO_SCALE_OPTIONS = [100, 500, 1000, 2000].map((v) => ({
    value: v,
    label: String(v),
  }));
  const ACCEL_SCALE_OPTIONS = [0.5, 1, 2].map((v) => ({
    value: v,
    label: String(v),
  }));
  const MAG_SCALE_OPTIONS = [0.5, 1].map((v) => ({
    value: v,
    label: String(v),
  }));

  const DEBUG_COLORS = ["#00a8f0", "#c0d800", "#cb4b4b", "#4da74d"];

  let loading = $state(true);

  let simpleBoard = $state(false);
  let disabled = $state({
    gyro: false,
    accel: false,
    mag: false,
    altitude: false,
    sonar: false,
  });

  let enabled = $state({
    gyro: false,
    accel: false,
    mag: false,
    altitude: false,
    sonar: false,
    debug: false,
  });

  let rates = $state({
    gyro: 50,
    accel: 50,
    mag: 50,
    altitude: 100,
    sonar: 100,
    debug: 500,
  });
  let scales = $state({ gyro: 2000, accel: 2, mag: 1 });

  let sampleIndex = $state({
    gyro: 0,
    accel: 0,
    mag: 0,
    altitude: 0,
    sonar: 0,
    debug: 0,
  });
  let buffers = $state({
    gyro: makeBuffer(3),
    accel: makeBuffer(3),
    mag: makeBuffer(3),
    altitude: makeBuffer(1),
    sonar: makeBuffer(1),
    debug: [makeBuffer(1), makeBuffer(1), makeBuffer(1), makeBuffer(1)],
  });

  let imuInterval,
    altitudeInterval,
    sonarInterval,
    debugInterval,
    statusInterval;

  function xDomain(index) {
    return [index - (WINDOW - 1), index];
  }

  let gyroSeries = $derived([
    { points: buffers.gyro[0].points, color: "#00a8f0" },
    { points: buffers.gyro[1].points, color: "#c0d800" },
    { points: buffers.gyro[2].points, color: "#cb4b4b" },
  ]);
  let accelSeries = $derived([
    { points: buffers.accel[0].points, color: "#00a8f0" },
    { points: buffers.accel[1].points, color: "#c0d800" },
    { points: buffers.accel[2].points, color: "#cb4b4b" },
  ]);
  let magSeries = $derived([
    { points: buffers.mag[0].points, color: "#00a8f0" },
    { points: buffers.mag[1].points, color: "#c0d800" },
    { points: buffers.mag[2].points, color: "#cb4b4b" },
  ]);
  let altitudeSeries = $derived([
    { points: buffers.altitude[0].points, color: "#00a8f0" },
  ]);
  let sonarSeries = $derived([
    { points: buffers.sonar[0].points, color: "#00a8f0" },
  ]);
  let debugSeries = $derived(
    buffers.debug.map((b, i) => [
      { points: b[0].points, color: DEBUG_COLORS[i] },
    ]),
  );

  let accelReadout = $derived.by(() => {
    const [x, y, z] = FC.SENSOR_DATA.accelerometer;
    const { roll, pitch } = accelAngles(x, y, z);
    return {
      x: `${x.toFixed(2)} (${roll})`,
      y: `${y.toFixed(2)} (${pitch})`,
      z: z.toFixed(2),
    };
  });

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);

    for (let i = 0; i < 3; i++) {
      FC.SENSOR_DATA.accelerometer[i] = 0;
      FC.SENSOR_DATA.gyroscope[i] = 0;
      FC.SENSOR_DATA.magnetometer[i] = 0;
      FC.SENSOR_DATA.debug[i] = 0;
    }
    FC.SENSOR_DATA.sonar = 0;
    FC.SENSOR_DATA.altitude = 0;

    simpleBoard = !(FC.CONFIG.boardType === 0 || FC.CONFIG.boardType === 2);
    disabled = {
      gyro: simpleBoard,
      accel: simpleBoard || !have_sensor(FC.CONFIG.activeSensors, "acc"),
      mag: simpleBoard || !have_sensor(FC.CONFIG.activeSensors, "mag"),
      altitude:
        simpleBoard ||
        !(
          have_sensor(FC.CONFIG.activeSensors, "baro") ||
          have_sensor(FC.CONFIG.activeSensors, "gps")
        ),
      sonar: simpleBoard || !have_sensor(FC.CONFIG.activeSensors, "sonar"),
    };

    const savedSettings = config.sensorSettings;
    if (savedSettings) {
      rates = { ...rates, ...savedSettings.rates };
      scales = { ...scales, ...savedSettings.scales };
    }

    const savedEnabled = config.graphsEnabled;
    if (savedEnabled) {
      enabled = {
        gyro: !!savedEnabled[0] && !disabled.gyro,
        accel: !!savedEnabled[1] && !disabled.accel,
        mag: !!savedEnabled[2] && !disabled.mag,
        altitude: !!savedEnabled[3] && !disabled.altitude,
        sonar: !!savedEnabled[4] && !disabled.sonar,
        debug: !!savedEnabled[5],
      };
    } else {
      enabled = {
        gyro: !disabled.gyro,
        accel: !disabled.accel,
        mag: !disabled.mag,
        altitude: !disabled.altitude,
        sonar: false,
        debug: false,
      };
    }

    loading = false;

    statusInterval = setInterval(() => {
      MSP.promise(MSPCodes.MSP_STATUS);
    }, 250);

    restartIntervals();
  });

  onDestroy(() => {
    clearInterval(imuInterval);
    clearInterval(altitudeInterval);
    clearInterval(sonarInterval);
    clearInterval(debugInterval);
    clearInterval(statusInterval);
  });

  function restartIntervals() {
    clearInterval(imuInterval);
    clearInterval(altitudeInterval);
    clearInterval(sonarInterval);
    clearInterval(debugInterval);
    imuInterval = altitudeInterval = sonarInterval = debugInterval = undefined;

    if (enabled.gyro || enabled.accel || enabled.mag) {
      const fastest = Math.min(
        ...[
          enabled.gyro && rates.gyro,
          enabled.accel && rates.accel,
          enabled.mag && rates.mag,
        ].filter((v) => v),
      );
      imuInterval = setInterval(async () => {
        await MSP.promise(MSPCodes.MSP_RAW_IMU);

        if (enabled.gyro) {
          buffers.gyro = pushSample(
            buffers.gyro,
            sampleIndex.gyro,
            FC.SENSOR_DATA.gyroscope,
          );
          sampleIndex.gyro++;
        }
        if (enabled.accel) {
          buffers.accel = pushSample(
            buffers.accel,
            sampleIndex.accel,
            FC.SENSOR_DATA.accelerometer,
          );
          sampleIndex.accel++;
        }
        if (enabled.mag) {
          buffers.mag = pushSample(
            buffers.mag,
            sampleIndex.mag,
            FC.SENSOR_DATA.magnetometer,
          );
          sampleIndex.mag++;
        }
      }, fastest);
    }

    if (enabled.altitude) {
      altitudeInterval = setInterval(async () => {
        await MSP.promise(MSPCodes.MSP_ALTITUDE);
        buffers.altitude = pushSample(buffers.altitude, sampleIndex.altitude, [
          FC.SENSOR_DATA.altitude,
        ]);
        sampleIndex.altitude++;
      }, rates.altitude);
    }

    if (enabled.sonar) {
      sonarInterval = setInterval(async () => {
        await MSP.promise(MSPCodes.MSP_SONAR);
        buffers.sonar = pushSample(buffers.sonar, sampleIndex.sonar, [
          FC.SENSOR_DATA.sonar,
        ]);
        sampleIndex.sonar++;
      }, rates.sonar);
    }

    if (enabled.debug) {
      debugInterval = setInterval(async () => {
        await MSP.promise(MSPCodes.MSP_DEBUG);
        buffers.debug = buffers.debug.map((b, i) =>
          pushSample(b, sampleIndex.debug, [FC.SENSOR_DATA.debug[i]]),
        );
        sampleIndex.debug++;
      }, rates.debug);
    }
  }

  $effect(() => {
    void enabled.gyro;
    void enabled.accel;
    void enabled.mag;
    void enabled.altitude;
    void enabled.sonar;
    void enabled.debug;
    void rates.gyro;
    void rates.accel;
    void rates.mag;
    void rates.altitude;
    void rates.sonar;
    void rates.debug;

    if (!loading) restartIntervals();
  });

  $effect(() => {
    if (loading) return;
    const graphsEnabled = [
      enabled.gyro,
      enabled.accel,
      enabled.mag,
      enabled.altitude,
      enabled.sonar,
      enabled.debug,
    ];
    /* config is reactive itself: write without subscribing to it */
    untrack(() => {
      config.graphsEnabled = graphsEnabled;
    });
  });

  $effect(() => {
    if (loading) return;
    const sensorSettings = {
      rates: $state.snapshot(rates),
      scales: $state.snapshot(scales),
    };
    untrack(() => {
      config.sensorSettings = sensorSettings;
    });
  });

  function onClickHelp() {
    window.open(getTabHelpURL("tabSensors"), "_system");
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabRawSensorData")}</h1>
  <div class="grow"></div>
  <HelpIcon>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html $i18n.t("sensorsInfo")}
  </HelpIcon>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

<Page {header} {loading}>
  {#if !simpleBoard}
    <div class="toggles">
      <label class="toggle">
        <Switch bind:checked={enabled.gyro} />
        {$i18n.t("sensorsGyroSelect")}
      </label>
      <label class="toggle">
        <Switch bind:checked={enabled.accel} disabled={disabled.accel} />
        {$i18n.t("sensorsAccelSelect")}
      </label>
      <label class="toggle">
        <Switch bind:checked={enabled.mag} disabled={disabled.mag} />
        {$i18n.t("sensorsMagSelect")}
      </label>
      <label class="toggle">
        <Switch bind:checked={enabled.altitude} disabled={disabled.altitude} />
        {$i18n.t("sensorsAltitudeSelect")}
      </label>
      <label class="toggle">
        <Switch bind:checked={enabled.sonar} disabled={disabled.sonar} />
        {$i18n.t("sensorsSonarSelect")}
      </label>
      <label class="toggle">
        <Switch bind:checked={enabled.debug} />
        {$i18n.t("sensorsDebugSelect")}
      </label>
    </div>
  {:else}
    <div class="toggles">
      <label class="toggle">
        <Switch bind:checked={enabled.debug} />
        {$i18n.t("sensorsDebugSelect")}
      </label>
    </div>
  {/if}

  {#if enabled.gyro}
    <Section label="sensorsGyroTitle">
      <SensorPanel
        rateOptions={RATE_OPTIONS}
        bind:rate={rates.gyro}
        scaleOptions={GYRO_SCALE_OPTIONS}
        bind:scale={scales.gyro}
        readouts={[
          {
            label: "X:",
            value: FC.SENSOR_DATA.gyroscope[0].toFixed(2),
            cls: "x",
          },
          {
            label: "Y:",
            value: FC.SENSOR_DATA.gyroscope[1].toFixed(2),
            cls: "y",
          },
          {
            label: "Z:",
            value: FC.SENSOR_DATA.gyroscope[2].toFixed(2),
            cls: "z",
          },
        ]}
        series={gyroSeries}
        xDomain={xDomain(sampleIndex.gyro)}
        yDomain={[-scales.gyro, scales.gyro]}
      />
    </Section>
  {/if}

  {#if enabled.accel}
    <Section label="sensorsAccelTitle">
      <SensorPanel
        rateOptions={RATE_OPTIONS}
        bind:rate={rates.accel}
        scaleOptions={ACCEL_SCALE_OPTIONS}
        bind:scale={scales.accel}
        readouts={[
          { label: "X:", value: accelReadout.x, cls: "x" },
          { label: "Y:", value: accelReadout.y, cls: "y" },
          { label: "Z:", value: accelReadout.z, cls: "z" },
        ]}
        series={accelSeries}
        xDomain={xDomain(sampleIndex.accel)}
        yDomain={[-scales.accel, scales.accel]}
      />
    </Section>
  {/if}

  {#if enabled.mag}
    <Section label="sensorsMagTitle">
      <SensorPanel
        rateOptions={RATE_OPTIONS}
        bind:rate={rates.mag}
        scaleOptions={MAG_SCALE_OPTIONS}
        bind:scale={scales.mag}
        readouts={[
          {
            label: "X:",
            value: FC.SENSOR_DATA.magnetometer[0].toFixed(2),
            cls: "x",
          },
          {
            label: "Y:",
            value: FC.SENSOR_DATA.magnetometer[1].toFixed(2),
            cls: "y",
          },
          {
            label: "Z:",
            value: FC.SENSOR_DATA.magnetometer[2].toFixed(2),
            cls: "z",
          },
        ]}
        series={magSeries}
        xDomain={xDomain(sampleIndex.mag)}
        yDomain={[-scales.mag, scales.mag]}
      />
    </Section>
  {/if}

  {#if enabled.altitude}
    <Section>
      {#snippet header()}
        <div class="section-header">
          <span class="title">{$i18n.t("sensorsAltitudeTitle")}</span>
          <div class="grow"></div>
          <HelpIcon>{$i18n.t("sensorsAltitudeHint")}</HelpIcon>
        </div>
      {/snippet}
      <SensorPanel
        rateOptions={RATE_OPTIONS}
        bind:rate={rates.altitude}
        readouts={[
          { label: "X:", value: FC.SENSOR_DATA.altitude.toFixed(2), cls: "x" },
        ]}
        series={altitudeSeries}
        xDomain={xDomain(sampleIndex.altitude)}
        yDomain={dynamicDomain(buffers.altitude)}
      />
    </Section>
  {/if}

  {#if enabled.sonar}
    <Section label="sensorsSonarTitle">
      <SensorPanel
        rateOptions={RATE_OPTIONS}
        bind:rate={rates.sonar}
        readouts={[
          { label: "X:", value: FC.SENSOR_DATA.sonar.toFixed(2), cls: "x" },
        ]}
        series={sonarSeries}
        xDomain={xDomain(sampleIndex.sonar)}
        yDomain={dynamicDomain(buffers.sonar)}
      />
    </Section>
  {/if}

  {#if enabled.debug}
    <Section label="sensorsDebugTitle">
      <div class="debug-stack">
        {#each debugSeries as series, i (i)}
          <SensorPanel
            subtitle={`${$i18n.t("sensorsDebugTitle")} ${i}`}
            rateOptions={i === 0 ? RATE_OPTIONS : undefined}
            bind:rate={rates.debug}
            readouts={[
              { label: "X:", value: String(FC.SENSOR_DATA.debug[i]), cls: "x" },
            ]}
            {series}
            xDomain={xDomain(sampleIndex.debug)}
            yDomain={dynamicDomain(buffers.debug[i])}
          />
        {/each}
      </div>
    </Section>
  {/if}
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }

  .help-btn {
    min-width: 60px;
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 16px;
    margin-top: var(--section-gap);
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
  }

  .section-header {
    @extend %section-header;
    padding-right: 8px;
  }

  .title {
    padding-left: 8px;
    font-weight: 600;
  }

  .debug-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>

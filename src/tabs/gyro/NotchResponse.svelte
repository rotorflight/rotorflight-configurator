<script>
  import semver from "semver";
  import { untrack } from "svelte";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  import { API_VERSION_12_8 } from "@/js/configurator.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import {
    collectNotches,
    combinedResponseDb,
    getFilterRateHz,
    groupAxes,
    logFrequencies,
  } from "./notch_response.js";

  let { FC } = $props();

  const MIN_HZ = 10;
  const MAX_HZ = 1000;
  const MIN_DB = -40;
  const MAX_DB = 3;
  const POINTS = 600;

  const HEIGHT = 220;
  const PAD = { left: 36, right: 12, top: 22, bottom: 24 };

  const axisProps = [
    { label: "titleRoll", color: "var(--color-roll)" },
    { label: "titlePitch", color: "var(--color-pitch)" },
    { label: "titleYaw", color: "var(--color-yaw)" },
  ];
  const SINGLE_CURVE_COLOR = "var(--color-accent-600)";

  // Starts at the governor head speed; after that the chart's own value.
  const initialHeadspeed = untrack(() => FC.GOVERNOR?.gov_headspeed) || 1800;
  let headspeed = $state(initialHeadspeed);
  let tailSpeed = $state(Math.round(initialHeadspeed * 4.5));
  let width = $state(600);
  let hoverHz = $state(null);

  let multiAxis = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8));
  let rpmEnabled = $derived(FC.FEATURE_CONFIG.features.RPM_FILTER);
  let motorizedTail = $derived(FC.MIXER_CONFIG.tail_rotor_mode > 0);

  let filterRate = $derived(
    getFilterRateHz(
      FC.CONFIG.sampleRateHz,
      FC.ADVANCED_CONFIG.pid_process_denom,
    ),
  );
  let maxHz = $derived(
    Math.max(Math.min(MAX_HZ, filterRate / 2 || MAX_HZ), MIN_HZ * 2),
  );

  // One curve per distinct axis setup: axes with the same notches share it.
  // Older firmware has one bank for all axes.
  let groups = $derived.by(() => {
    const axes = multiAxis && rpmEnabled ? [0, 1, 2] : [0];
    const perAxis = axes.map((axis) =>
      collectNotches({
        filterConfig: FC.FILTER_CONFIG,
        rpmEnabled,
        multiAxis,
        rpmBanks: multiAxis ? FC.RPM_FILTER_CONFIG_V2 : FC.RPM_FILTER_CONFIG,
        axis,
        filterRate,
        headspeed,
        tailSpeed,
        mainGear: FC.MOTOR_CONFIG.main_rotor_gear_ratio,
        tailGear: FC.MOTOR_CONFIG.tail_rotor_gear_ratio,
        motorizedTail,
      }),
    );
    const grouped = groupAxes(perAxis);
    return grouped.map((g) => ({
      ...g,
      // A single shared curve gets a neutral colour, not one axis's.
      color:
        grouped.length > 1 ? axisProps[g.axes[0]].color : SINGLE_CURVE_COLOR,
      name: g.axes.map((a) => $i18n.t(axisProps[a].label)).join(" + "),
    }));
  });

  let allNotches = $derived(groups.flatMap((g) => g.notches));

  // Also sample each notch center, so narrow notches show their full depth.
  let freqs = $derived(
    [
      ...logFrequencies(MIN_HZ, maxHz, POINTS),
      ...allNotches
        .map((n) => n.centerHz)
        .filter((hz) => hz > MIN_HZ && hz < maxHz),
    ].sort((a, b) => a - b),
  );

  let plotW = $derived(Math.max(width - PAD.left - PAD.right, 100));
  let plotH = HEIGHT - PAD.top - PAD.bottom;

  function x(hz) {
    const lo = Math.log10(MIN_HZ);
    const hi = Math.log10(maxHz);
    return PAD.left + ((Math.log10(hz) - lo) / (hi - lo)) * plotW;
  }

  function y(dbValue) {
    const v = Math.min(Math.max(dbValue, MIN_DB), MAX_DB);
    return PAD.top + ((MAX_DB - v) / (MAX_DB - MIN_DB)) * plotH;
  }

  function hzAt(px) {
    const lo = Math.log10(MIN_HZ);
    const hi = Math.log10(maxHz);
    const t = (px - PAD.left) / plotW;
    return 10 ** (lo + Math.min(Math.max(t, 0), 1) * (hi - lo));
  }

  let curves = $derived(
    groups.map((g) => {
      const response = combinedResponseDb(g.notches, freqs, filterRate);
      const path = freqs
        .map(
          (hz, i) =>
            `${i ? "L" : "M"}${x(hz).toFixed(1)},${y(response[i]).toFixed(1)}`,
        )
        .join("");
      const area = `${path}L${x(maxHz).toFixed(1)},${y(0)}L${x(MIN_HZ).toFixed(1)},${y(0)}Z`;
      return { ...g, path, area };
    }),
  );

  const X_TICKS = [10, 20, 50, 100, 200, 500, 1000];
  const Y_TICKS = [0, -10, -20, -30, -40];

  // One marker per label, at the middle of its notches (double and triple
  // notches share a label). Labels from all curves; a notch type that differs
  // between axes shows its largest count.
  let markers = $derived.by(() => {
    const byLabel = {};
    for (const g of groups) {
      const local = {};
      for (const n of g.notches) {
        const m = (local[n.label] ??= { ...n, hz: [] });
        m.hz.push(n.centerHz);
        m.fader = Math.min(m.fader, n.fader);
      }
      for (const m of Object.values(local)) {
        const prev = byLabel[m.label];
        if (!prev || m.hz.length > prev.hz.length) {
          byLabel[m.label] = m;
        }
      }
    }
    return Object.values(byLabel)
      .map((m) => ({
        ...m,
        hz: m.hz.reduce((a, b) => a + b, 0) / m.hz.length,
        count: m.hz.length,
      }))
      .filter((m) => m.hz >= MIN_HZ && m.hz <= maxHz)
      .sort((a, b) => a.hz - b.hz);
  });

  // Alternate label rows so close markers stay readable.
  function labelRow(i) {
    return i % 2 === 0 ? PAD.top - 10 : PAD.top - 1;
  }

  function markerClass(m) {
    if (m.kind === "static") return "static";
    return m.source >= 20 ? "tail" : "main";
  }

  let dynNotch = $derived(
    FC.FEATURE_CONFIG.features.DYN_NOTCH &&
      FC.FILTER_CONFIG.dyn_notch_count > 0 &&
      FC.FILTER_CONFIG.dyn_notch_max_hz > FC.FILTER_CONFIG.dyn_notch_min_hz
      ? {
          from: Math.max(FC.FILTER_CONFIG.dyn_notch_min_hz, MIN_HZ),
          to: Math.min(FC.FILTER_CONFIG.dyn_notch_max_hz, maxHz),
        }
      : null,
  );

  let hoverDb = $derived.by(() => {
    if (hoverHz === null) return [];
    return groups.map(
      (g) => combinedResponseDb(g.notches, [hoverHz], filterRate)[0],
    );
  });

  let notchCount = $derived(Math.max(...groups.map((g) => g.notches.length)));

  function onpointermove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    hoverHz = px < PAD.left || px > PAD.left + plotW ? null : hzAt(px);
  }
</script>

<Section label="gyroNotchResponse" summary="gyroNotchResponseHelp">
  <SubSection>
    <div class="controls">
      <Field
        id="notch-response-headspeed"
        label="gyroNotchResponseHeadspeed"
        unit="RPM"
      >
        <NumberInput
          id="notch-response-headspeed"
          min="0"
          max="10000"
          step="50"
          bind:value={headspeed}
        />
      </Field>
      {#if rpmEnabled && motorizedTail}
        <Field
          id="notch-response-tailspeed"
          label="gyroNotchResponseTailSpeed"
          unit="RPM"
        >
          <NumberInput
            id="notch-response-tailspeed"
            min="0"
            max="30000"
            step="100"
            bind:value={tailSpeed}
          />
        </Field>
      {/if}
      {#if groups.length > 1}
        <ul class="legend">
          {#each groups as g (g.name)}
            <li>
              <span class="swatch" style:background={g.color}></span>
              {g.name}
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="chart" bind:clientWidth={width}>
      {#if filterRate}
        <svg
          {width}
          height={HEIGHT}
          role="img"
          aria-label={$i18n.t("gyroNotchResponse")}
          {onpointermove}
          onpointerleave={() => (hoverHz = null)}
        >
          {#if dynNotch}
            <rect
              class="dyn-band"
              x={x(dynNotch.from)}
              y={PAD.top}
              width={Math.max(x(dynNotch.to) - x(dynNotch.from), 0)}
              height={plotH}
            />
            <text
              class="dyn-label"
              x={x(dynNotch.to) - 3}
              y={PAD.top + plotH - 4}
              text-anchor="end"
            >
              {$i18n.t("gyroNotchResponseDynamic")}
            </text>
          {/if}

          {#each Y_TICKS as t (t)}
            <line
              class="grid"
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(t)}
              y2={y(t)}
            />
            <text class="tick" x={PAD.left - 4} y={y(t) + 3} text-anchor="end">
              {t}
            </text>
          {/each}
          {#each X_TICKS.filter((t) => t <= maxHz) as t (t)}
            <line
              class="grid"
              x1={x(t)}
              x2={x(t)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
            <text
              class="tick"
              x={x(t)}
              y={HEIGHT - PAD.bottom + 14}
              text-anchor="middle"
            >
              {t}
            </text>
          {/each}
          <text
            class="tick unit"
            x={PAD.left - 4}
            y={PAD.top - 10}
            text-anchor="end"
          >
            dB
          </text>
          <text
            class="tick unit"
            x={PAD.left + plotW}
            y={HEIGHT - 2}
            text-anchor="end"
          >
            Hz
          </text>

          {#each markers as m, i (m.label)}
            <line
              class={["marker", markerClass(m), m.fader < 1 && "faded"]}
              x1={x(m.hz)}
              x2={x(m.hz)}
              y1={labelRow(i) + 2}
              y2={PAD.top + plotH}
            />
            <text
              class={["marker-label", markerClass(m), m.fader < 1 && "faded"]}
              x={x(m.hz)}
              y={labelRow(i)}
              text-anchor="middle"
            >
              {m.label}{m.count > 1 ? ` ×${m.count}` : ""}
            </text>
          {/each}

          {#if curves.length === 1}
            <path
              class="area"
              d={curves[0].area}
              style:fill={curves[0].color}
            />
          {/if}
          {#each curves as c (c.name)}
            <path class="curve" d={c.path} style:stroke={c.color} />
          {/each}

          {#if hoverHz !== null}
            <line
              class="hover"
              x1={x(hoverHz)}
              x2={x(hoverHz)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
            {#each curves as c, i (c.name)}
              <circle
                class="hover-dot"
                cx={x(hoverHz)}
                cy={y(hoverDb[i])}
                r="3"
                style:fill={c.color}
              />
            {/each}
          {/if}
        </svg>
        <div class="readout">
          {#if hoverHz !== null}
            {[
              `${hoverHz.toFixed(0)} Hz`,
              ...curves.map(
                (c, i) =>
                  `${curves.length > 1 ? `${c.name} ` : ""}${hoverDb[i].toFixed(1)} dB`,
              ),
            ].join(" · ")}
          {:else if notchCount === 0}
            {$i18n.t("gyroNotchResponseNone")}
          {:else if curves.length > 1}
            {$i18n.t("gyroNotchResponseAxesDiffer")}
          {:else}
            {$i18n.t("gyroNotchResponseCount", { notches: notchCount })}
          {/if}
        </div>
      {:else}
        <div class="readout">{$i18n.t("gyroNotchResponseNoRate")}</div>
      {/if}
    </div>
  </SubSection>
</Section>

<style lang="scss">
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
  }

  .legend {
    display: flex;
    gap: 12px;
    margin: 0 0 0 auto;
    padding: 4px 0;
    list-style: none;
    font-size: 11px;
    color: var(--color-text-soft);

    li {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  }

  .swatch {
    width: 14px;
    height: 3px;
    border-radius: 2px;
  }

  .chart {
    width: 100%;
    padding: 4px 0;
  }

  svg {
    display: block;
    border-radius: 4px;
    background: var(--color-surface-sunken);
    touch-action: none;
  }

  .grid {
    stroke: var(--color-border-soft);
    stroke-width: 1;
  }

  .tick {
    fill: var(--color-text-muted);
    font-size: 10px;
  }

  .dyn-band {
    fill: var(--color-text-muted);
    fill-opacity: 0.08;
  }

  .dyn-label {
    fill: var(--color-text-muted);
    font-size: 10px;
  }

  .area {
    fill-opacity: 0.15;
  }

  .curve {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .marker {
    stroke-width: 1;
    stroke-dasharray: 2 3;

    &.faded {
      opacity: 0.4;
    }
  }

  .marker-label {
    font-size: 10px;
    font-weight: 600;

    &.faded {
      opacity: 0.4;
    }
  }

  .main {
    stroke: var(--color-text-soft);
    fill: var(--color-text-soft);
  }

  .tail {
    stroke: var(--color-collective);
    fill: var(--color-collective);
  }

  .static {
    stroke: var(--color-text-muted);
    fill: var(--color-text-muted);
  }

  .hover {
    stroke: var(--color-text-muted);
    stroke-width: 1;
  }

  .hover-dot {
    stroke: var(--color-surface);
    stroke-width: 1;
  }

  .readout {
    min-height: 1.4em;
    padding-top: 2px;
    color: var(--color-text-muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
</style>

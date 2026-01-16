<script>
  import { onMount, onDestroy } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import InfoNote from "@/components/notes/InfoNote.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  let pollerInterval;
  let shouldUpdate = true;

  function getInputTarget() {
    const value = 0.5 + FC.RC_COMMAND[3] / 1000;
    return Number.isNaN(value) ? 0 : value;
  }

  let inputValue = $state(getInputTarget());

  // smooth the transition between RC command updates
  function updateValue() {
    if (!shouldUpdate) {
      return;
    }

    const target = getInputTarget();
    if (target !== inputValue) {
      inputValue += (target - inputValue) * 0.1;
      if (Math.abs(inputValue - target) < 0.01) {
        inputValue = target;
      }
    }

    globalThis.requestAnimationFrame(updateValue);
  }

  function asFivePointCurve(c) {
    if (c.length === 5) {
      return c;
    }

    return [c[0], c[2], c[4], c[6], c[8]];
  }

  function tryReduceCurve(curve) {
    let fivePoints = true;

    for (let i = 0; i < curve.length - 2; i += 2) {
      if (Math.round((curve[i] + curve[i + 2]) / 2) !== curve[i + 1]) {
        fivePoints = false;
        break;
      }
    }

    if (fivePoints) {
      return asFivePointCurve(curve);
    } else {
      return curve;
    }
  }

  function asNinePointCurve(c) {
    if (c.length === 9) {
      return c;
    }

    const newCurve = [c[0]];
    for (let i = 1; i < c.length; i++) {
      newCurve.push(Math.round(c[i - 1] + c[i]) / 2);
      newCurve.push(c[i]);
    }

    return newCurve;
  }

  let curve = $state([]);
  let numPoints = $state(0);

  // track external changes to curve
  let lastFcCurve = null;

  function exportCurve() {
    FC.GOVERNOR.gov_bypass_throttle = asNinePointCurve(curve).map((x) => x * 2);
    lastFcCurve = [...FC.GOVERNOR.gov_bypass_throttle];
  }

  function importCurve() {
    curve = tryReduceCurve(FC.GOVERNOR.gov_bypass_throttle).map((x) => x / 2);
    numPoints = curve.length;
    lastFcCurve = [...FC.GOVERNOR.gov_bypass_throttle];
  }

  function setNumPoints(value) {
    if (value === numPoints) {
      return;
    }

    let newCurve;
    if (value === 5) {
      newCurve = asFivePointCurve(curve);
    } else {
      newCurve = asNinePointCurve(curve);
    }

    curve = newCurve;
    numPoints = value;
    exportCurve();
  }

  onMount(() => {
    importCurve();

    pollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RC_COMMAND);
    }, 50);

    updateValue();
  });

  $effect(() => {
    // check if curve has been modified externally
    FC.GOVERNOR.gov_bypass_throttle;

    if (lastFcCurve === null) {
      return;
    }

    let changed = false;
    for (let i = 0; i < FC.GOVERNOR.gov_bypass_throttle.length; i++) {
      if (lastFcCurve[i] !== FC.GOVERNOR.gov_bypass_throttle[i]) {
        changed = true;
        break;
      }
    }

    if (changed) {
      importCurve();
    }
  });

  onDestroy(() => {
    shouldUpdate = false;
    clearInterval(pollerInterval);
  });

  const min = 0;
  const max = 100;
  const step = 0.5;

  let width = 300;
  let height = width;
  let padding = 16;

  const POINT_OPTS = [5, 9];

  function getX(i) {
    return padding + (width / (numPoints - 1)) * i;
  }

  function getY(i) {
    const mult = height / (max - min);
    return padding + height - curve[i] * mult;
  }

  function interpolate(x) {
    const bins = numPoints - 1;
    x = x * bins;
    const i = Math.floor(x);
    const a = curve[i];
    const b = curve[i + 1] ?? curve[i];
    const y = a + (x - i) * (b - a);
    return y / 100;
  }

  let draggingIndex = null;
  let activeIndex = $state(null);

  function onpointermove(e) {
    if (draggingIndex === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const svgY = e.clientY - rect.top;

    let point =
      (height -
        (Math.min(Math.max(svgY, padding), padding + height) - padding)) /
      height;
    point = point * (max - min) + min;
    curve[draggingIndex] = Math.round(point / step) * step;
    exportCurve();
  }

  function onpointerup(e) {
    draggingIndex = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  function onpointerdown(e, i) {
    draggingIndex = i;
    activeIndex = i;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  let currentY = $derived(interpolate(inputValue));
</script>

<Section label="govSectionThrottleCurve">
  <SubSection>
    <InfoNote message="govThrottleCurveNote" />
  </SubSection>
  <SubSection>
    <div class="container">
      <svg
        width={width + padding * 2}
        height={height + padding * 2}
        {onpointermove}
        {onpointerup}
      >
        <rect
          class="bg"
          x={0}
          y={0}
          width={width + padding * 2}
          height={height + padding * 2}
        />
        <rect
          class="gridline"
          x={padding}
          y={padding}
          {width}
          {height}
          fill="transparent"
          rx="4"
          ry="4"
          stroke-dasharray="2 2"
        />
        <line
          class="gridline"
          x1={padding}
          y1={padding + height / 2}
          x2={padding + width}
          y2={padding + height / 2}
          stroke-dasharray="2 2"
        />
        <line
          class="gridline"
          x1={padding + width / 2}
          y1={padding + height}
          x2={padding + width / 2}
          y2={padding}
          stroke-dasharray="2 2"
        />

        {#if FC.GOVERNOR.gov_idle_throttle > 0}
          {@const h = (FC.GOVERNOR.gov_idle_throttle / 1000) * height}
          <rect
            class="idle-indicator"
            x={padding}
            y={height + padding - h}
            {width}
            height={h}
          />
          <text
            class="idle-indicator-text"
            x={width + padding - 2}
            y={height + padding - h - 2}
            text-anchor="end"
            font-size="10"
          >
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html $i18n.t("govIdleThrottle")}
          </text>
        {/if}

        <line
          class="crosshair"
          x1={padding + width * inputValue}
          y1={padding}
          x2={padding + width * inputValue}
          y2={padding + height}
        />

        <line
          class="crosshair"
          x1={padding}
          y1={padding + height - currentY * height}
          x2={padding + width}
          y2={padding + height - currentY * height}
        />

        {#each { length: numPoints - 1 } as _, i (i)}
          <line
            class="curve-line"
            x1={getX(i)}
            y1={getY(i)}
            x2={getX(i + 1)}
            y2={getY(i + 1)}
          />
        {/each}

        {#each curve as _, i (i)}
          {#if i === activeIndex}
            <rect
              x={getX(i) - width / (numPoints - 1) / 2}
              y={0}
              width={width / (numPoints - 1)}
              height={height + padding * 2}
              fill="green"
              fill-opacity="0.15"
            />
          {/if}

          <circle class="curve-line" cx={getX(i)} cy={getY(i)} r="4" />

          <rect
            x={getX(i) - width / (numPoints - 1) / 2}
            y={0}
            width={width / (numPoints - 1)}
            height={height + padding * 2}
            fill="transparent"
            onpointerdown={(e) => {
              onpointerdown(e, i);
            }}
          />
        {/each}
      </svg>
      <div class="controls">
        <div class="points-control">
          <label for="points-control">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html $i18n.t("govThrottleCurveNumPoints")}
          </label>
          <select
            id="points-control"
            value={numPoints}
            onchange={(e) => setNumPoints(Number(e.target.value))}
          >
            {#each POINT_OPTS as numPoints (numPoints)}
              <option value={numPoints}>{numPoints}</option>
            {/each}
          </select>
        </div>

        <div class="current-value">
          <span>
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html $i18n.t("govThrottleCurveCurrentValue")}
          </span>
          <pre>{(100 * currentY).toFixed(1).padStart(6, " ")}%</pre>
        </div>

        <div class="point-text">
          {#each { length: numPoints } as _, i (i)}
            <div class="item" class:active={i === activeIndex}>
              <span>{i + 1}.</span>
              <pre>{curve[i].toFixed(1).padStart(6, " ")}%</pre>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </SubSection>
</Section>

<style lang="scss">
  .container {
    display: flex;
    gap: 8px;
    padding: 4px;
  }

  .curve-line {
    stroke-width: 2;

    :global(html[data-theme="light"]) & {
      stroke: red;
      fill: red;
      filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.2));
    }

    :global(html[data-theme="dark"]) & {
      stroke: hsl(0, 70%, 50%);
      fill: hsl(0, 70%, 50%);
      filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.5));
    }
  }

  .bg {
    fill: var(--color-bg);
  }

  .gridline {
    stroke: #888;
  }

  .crosshair {
    :global(html[data-theme="light"]) & {
      stroke: red;
    }

    :global(html[data-theme="dark"]) & {
      stroke: hsl(0, 70%, 50%);
    }
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .point-text {
    display: flex;
    flex-direction: column;

    .item {
      display: flex;
      align-items: center;
      padding: 2px;
      border-radius: 2px;

      &.active {
        background-color: rgba(0, 255, 0, 0.2);
      }
    }
  }

  .current-value {
    display: flex;
    flex-wrap: nowrap;
    text-wrap: nowrap;
  }

  .idle-indicator {
    :global(html[data-theme="light"]) & {
      fill: hsl(40, 90%, 70%);
    }

    :global(html[data-theme="dark"]) & {
      fill: hsl(30, 70%, 35%);
    }
  }

  .idle-indicator-text {
    fill: var(--color-text-soft);
  }

  svg {
    border-radius: 4px;
  }

  @media only screen and (max-width: 480px) {
    .container {
      flex-direction: column;
    }

    svg {
      margin: 0 auto;
    }
  }
</style>

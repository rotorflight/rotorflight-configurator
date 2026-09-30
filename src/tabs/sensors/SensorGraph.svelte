<script>
  // Canvas-based rolling line graph - one instance per sensor, redrawn
  // imperatively (like RateCurveChart) rather than diffed as SVG, since
  // graphs redraw at up to 100Hz while the tab is open.
  let { series, xDomain, yDomain } = $props();

  const MARGIN = { top: 10, right: 10, bottom: 6, left: 40 };
  const TICKS = 5;

  let canvasEl;
  let width = $state(0);
  let height = $state(0);

  function ticks(min, max, count) {
    return Array.from(
      { length: count },
      (_, i) => min + (i / (count - 1)) * (max - min),
    );
  }

  function formatTick(value) {
    return Math.abs(value) >= 10
      ? Math.round(value).toString()
      : (Math.round(value * 100) / 100).toString();
  }

  function redraw() {
    if (!canvasEl || !width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = width * dpr;
    canvasEl.height = height * dpr;

    const ctx = canvasEl.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = height - MARGIN.top - MARGIN.bottom;
    if (plotWidth <= 0 || plotHeight <= 0) return;

    const [xMin, xMax] = xDomain;
    const [yMin, yMax] = yDomain;
    const scaleX = (x) =>
      MARGIN.left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const scaleY = (y) =>
      MARGIN.top + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;

    ctx.strokeStyle = "silver";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const t of ticks(yMin, yMax, TICKS)) {
      const y = Math.round(scaleY(t)) + 0.5;
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + plotWidth, y);
    }
    for (const t of ticks(xMin, xMax, TICKS)) {
      const x = Math.round(scaleX(t)) + 0.5;
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotHeight);
    }
    ctx.stroke();

    ctx.strokeStyle = "#ccc";
    ctx.strokeRect(MARGIN.left + 0.5, MARGIN.top + 0.5, plotWidth, plotHeight);

    ctx.fillStyle = "#828885";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const t of ticks(yMin, yMax, TICKS)) {
      ctx.fillText(formatTick(t), MARGIN.left - 4, scaleY(t));
    }

    for (const s of series) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.points.forEach(([x, y], i) => {
        const px = scaleX(x);
        const py = scaleY(y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }

  $effect(() => {
    void series;
    void xDomain;
    void yDomain;
    void width;
    void height;
    redraw();
  });
</script>

<div class="graph" bind:clientWidth={width} bind:clientHeight={height}>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style lang="scss">
  .graph {
    width: 100%;
    height: 100%;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>

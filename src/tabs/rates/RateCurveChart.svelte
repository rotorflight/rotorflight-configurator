<script>
  import { onDestroy, onMount } from "svelte";

  import Section from "@/components/Section.svelte";

  import { RateCurve } from "@/js/RateCurve.js";
  import { FC } from "@/js/fc.svelte.js";

  import { convertToCollective } from "./rateTypes.js";

  let { ratesType, rates, polar, max, live } = $props();

  const rateCurve = new RateCurve();
  const SUPER_EXPO = true;

  let curveCanvas;
  let stickCanvas;
  let observer;
  let themeTick = $state(0);

  // Colours come from the theme tokens, so both themes read well.
  function token(name, fallback) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  }

  function colors() {
    return {
      axis: token("--color-border", "#888"),
      text: token("--color-text", "#000"),
      surface: token("--color-surface", "#fff"),
      roll: token("--color-roll", "#e05050"),
      pitch: token("--color-pitch", "#40a040"),
      yaw: token("--color-yaw", "#6060e0"),
      collective: token("--color-collective", "#c08000"),
    };
  }

  function drawAxes(context, width, height, c) {
    context.strokeStyle = c.axis;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.stroke();
  }

  function drawCurve(
    context,
    axis,
    deadband,
    maxAngularVel,
    color,
    yOffset,
    opts,
  ) {
    context.save();
    context.strokeStyle = color;
    context.translate(0, yOffset);
    rateCurve.draw(
      ratesType,
      rates[`${axis}_srate`],
      rates[`${axis}_rc_rate`],
      rates[`${axis}_rc_expo`],
      SUPER_EXPO,
      deadband,
      rates[`${axis}_rate_limit`],
      maxAngularVel,
      context,
      opts,
    );
    context.restore();
  }

  function redrawCurve() {
    if (!curveCanvas || !max.angularVel) return;

    const c = colors();
    const context = curveCanvas.getContext("2d");
    const { width, height } = curveCanvas;
    const lineScale = context.canvas.width / context.canvas.clientWidth;

    context.clearRect(0, 0, width, height);
    drawAxes(context, width, height, c);
    context.lineWidth = 2 * lineScale;

    drawCurve(context, "collective", 0, max.collective, c.collective, -4);
    drawCurve(context, "yaw", 0, max.angularVel, c.yaw, 4);
    if (polar) {
      drawCurve(context, "pitch", 0, max.angularVel, c.pitch, 0, {
        rcRange: 500 * Math.sqrt(2),
        maxAngularVel: max.polarCyclic,
      });
    } else {
      drawCurve(context, "roll", 0, max.angularVel, c.roll, -2);
      drawCurve(context, "pitch", 0, max.angularVel, c.pitch, 2);
    }
  }

  function drawStick(context, color, rcPos, value, maxValue) {
    const rateScaling = context.canvas.height / 2 / maxValue;
    context.save();
    context.fillStyle = color;
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.beginPath();
    context.arc(
      rcPos,
      -rateScaling * value,
      context.canvas.height / 60,
      0,
      2 * Math.PI,
    );
    context.fill();
    context.restore();
  }

  function drawText(context, text, x, y, align, color) {
    context.fillStyle = color;
    context.textAlign = align || "center";
    context.fillText(text, x, y);
  }

  // Rounded label pointing at (x, y); moves up or down to avoid the labels
  // already drawn this frame (collected in `dirty`).
  function drawBalloon(context, text, x, y, align, color, c, dirty) {
    const OFFSET = 125;
    const RADIUS = 10;
    const MARGIN = 5;
    const fontSize = parseInt(context.font, 10);
    const width = context.measureText(text).width * 1.2;
    const height = fontSize * 1.5;
    const pointerY = y;

    x *= context.canvas.clientWidth / context.canvas.clientHeight;
    x +=
      (align === "right" ? -(width + OFFSET) : 0) +
      (align === "left" ? OFFSET : 0);
    y -= height / 2;
    if (y < 0) y = 0;

    for (const d of dirty) {
      const overlapX =
        (x >= d.left && x <= d.right) ||
        (x + width >= d.left && x + width <= d.right);
      const overlapY =
        (y >= d.top && y <= d.bottom) ||
        (y + height >= d.top && y + height <= d.bottom);
      if (overlapX && overlapY) {
        y =
          y <= (d.bottom - d.top) / 2 && d.top - height > 0
            ? d.top - height
            : d.bottom;
      }
    }
    dirty.push({
      left: x,
      right: x + width,
      top: y - MARGIN,
      bottom: y + height + MARGIN,
    });

    const pointer = (height - 2 * RADIUS) / 6;
    context.beginPath();
    context.moveTo(x + RADIUS, y);
    context.lineTo(x + width - RADIUS, y);
    context.quadraticCurveTo(x + width, y, x + width, y + RADIUS);
    if (align === "right") {
      context.lineTo(x + width, y + RADIUS + pointer);
      context.lineTo(x + width + OFFSET, pointerY);
      context.lineTo(x + width, y + height - RADIUS - pointer);
    }
    context.lineTo(x + width, y + height - RADIUS);
    context.quadraticCurveTo(
      x + width,
      y + height,
      x + width - RADIUS,
      y + height,
    );
    context.lineTo(x + RADIUS, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - RADIUS);
    if (align === "left") {
      context.lineTo(x, y + height - RADIUS - pointer);
      context.lineTo(x - OFFSET, pointerY);
      context.lineTo(x, y + RADIUS - pointer);
    }
    context.lineTo(x, y + RADIUS);
    context.quadraticCurveTo(x, y, x + RADIUS, y);
    context.closePath();

    context.save();
    context.fillStyle = c.surface;
    context.fill();
    context.globalAlpha = 0.35;
    context.fillStyle = color;
    context.fill();
    context.globalAlpha = 0.8;
    context.strokeStyle = color;
    context.stroke();
    context.restore();

    drawText(
      context,
      text,
      x + width / 2,
      y + (height + fontSize) / 2 - 4,
      "center",
      c.text,
    );
  }

  function redrawStick() {
    if (!stickCanvas || !max.angularVel) return;

    const c = colors();
    const context = stickCanvas.getContext("2d");
    const { width, height } = stickCanvas;
    const maxAngularVel = max.angularVel;
    const windowScale = 400 / context.canvas.clientHeight;
    const rateScale = height / 2 / maxAngularVel;
    const lineScale = context.canvas.width / context.canvas.clientWidth;
    const textScale = context.canvas.clientHeight / context.canvas.clientWidth;

    context.save();
    context.clearRect(0, 0, width, height);
    context.font = `${windowScale <= 1 ? 24 : 24 * windowScale}pt "Open Sans", Arial, sans-serif`;

    if (polar) {
      drawStick(
        context,
        c.pitch,
        (live.polarCommand * 500) / Math.sqrt(2),
        live.polarCyclic,
        maxAngularVel,
      );
    } else {
      drawStick(context, c.roll, FC.RC_COMMAND[0], live.roll, maxAngularVel);
      drawStick(context, c.pitch, FC.RC_COMMAND[1], live.pitch, maxAngularVel);
    }
    drawStick(context, c.yaw, FC.RC_COMMAND[2], live.yaw, maxAngularVel);
    drawStick(
      context,
      c.collective,
      FC.RC_COMMAND[3],
      live.collective,
      max.collective,
    );

    context.lineWidth = lineScale;
    context.scale(textScale, 1);

    drawText(
      context,
      `${maxAngularVel.toFixed(0)}°/s`,
      (width / 2 - 10) / textScale,
      parseInt(context.font, 10) * 1.2,
      "right",
      c.text,
    );

    const dirty = [];
    drawBalloon(
      context,
      `${convertToCollective(ratesType, max.collective)}°`,
      width,
      0,
      "right",
      c.collective,
      c,
      dirty,
    );

    const maxBalloons = [{ value: max.yaw, color: c.yaw }];
    if (polar) {
      maxBalloons.push({ value: max.polarCyclic, color: c.pitch });
    } else {
      maxBalloons.push(
        { value: max.roll, color: c.roll },
        { value: max.pitch, color: c.pitch },
      );
    }
    maxBalloons
      .sort((a, b) => b.value - a.value)
      .forEach((b) =>
        drawBalloon(
          context,
          `${b.value.toFixed(0)}°/s`,
          width,
          rateScale * (maxAngularVel - b.value),
          "right",
          b.color,
          c,
          dirty,
        ),
      );

    drawBalloon(
      context,
      `${convertToCollective(ratesType, live.collective)}°`,
      10,
      50,
      "none",
      c.collective,
      c,
      dirty,
    );
    if (polar) {
      drawBalloon(
        context,
        `${live.polarCyclic.toFixed(0)}°/s`,
        10,
        250,
        "none",
        c.pitch,
        c,
        dirty,
      );
    } else {
      drawBalloon(
        context,
        `${live.roll.toFixed(0)}°/s`,
        10,
        150,
        "none",
        c.roll,
        c,
        dirty,
      );
      drawBalloon(
        context,
        `${live.pitch.toFixed(0)}°/s`,
        10,
        250,
        "none",
        c.pitch,
        c,
        dirty,
      );
    }
    drawBalloon(
      context,
      `${live.yaw.toFixed(0)}°/s`,
      10,
      350,
      "none",
      c.yaw,
      c,
      dirty,
    );

    context.restore();
  }

  $effect(() => {
    void [
      ratesType,
      polar,
      themeTick,
      JSON.stringify(rates),
      JSON.stringify(max),
    ];
    redrawCurve();
  });

  $effect(() => {
    void [themeTick, JSON.stringify(live), JSON.stringify(max), polar];
    redrawStick();
  });

  onMount(() => {
    // Redraw in the new colours when the theme changes.
    observer = new MutationObserver(() => themeTick++);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  });

  onDestroy(() => observer?.disconnect());
</script>

<Section label="rateSetupRatesCurve" summary="rateSetupRatesCurveTip">
  <div class="rate-curve">
    <canvas bind:this={curveCanvas} width="1000" height="1000"></canvas>
    <canvas bind:this={stickCanvas} width="1000" height="1000"></canvas>
  </div>
</Section>

<style lang="scss">
  .rate-curve {
    position: relative;
    height: 320px;
    min-width: 200px;
    background-color: var(--color-surface);
  }

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>

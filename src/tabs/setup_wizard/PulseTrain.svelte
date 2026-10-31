<script>
  // The signal a servo type gets, drawn to scale over the same 20 ms
  // window: one pulse every 1000 / rate ms, each `width` us wide (the
  // band's centre pulse). Shows at a glance that digital servos are updated
  // more often, and that narrow-band pulses are shorter. Decorative; the
  // tile's text gives the numbers.
  let { rate, width = 1500 } = $props();

  const WINDOW_MS = 20;
  const W = 120;
  const H = 22;
  const BASE = H - 3;

  let path = $derived.by(() => {
    const period = 1000 / rate;
    const pulse = Math.max((width / 1000 / WINDOW_MS) * W, 1);
    let d = `M0 ${BASE}`;
    for (let t = 0.5; t < WINDOW_MS; t += period) {
      const x = (t / WINDOW_MS) * W;
      if (x + pulse > W) break;
      d += ` L${x} ${BASE} L${x} 3 L${x + pulse} 3 L${x + pulse} ${BASE}`;
    }
    return `${d} L${W} ${BASE}`;
  });
</script>

<svg
  viewBox="0 0 {W} {H}"
  class="pulse-train"
  aria-hidden="true"
  focusable="false"
>
  <path d={path} />
</svg>

<style lang="scss">
  .pulse-train {
    display: block;
    width: 100%;
    max-width: 160px;
    height: auto;
  }

  path {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.3;
    stroke-linejoin: round;
  }
</style>

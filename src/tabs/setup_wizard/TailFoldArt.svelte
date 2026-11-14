<script>
  // The tail blades seen end-on, looking along the blades from the tip:
  // the shaft runs left to right, and at 22.5° pitch each way the two
  // blade chords open to 45°, the angle of a square of paper folded
  // corner to corner. Decorative; the text next to it says the same.
</script>

<svg viewBox="0 0 120 70" class="fold-art" aria-hidden="true" focusable="false">
  <!-- Tail rotor shaft and hub. -->
  <line class="shaft" x1="14" y1="35" x2="106" y2="35" />

  <!-- Zero pitch: the plane of rotation. -->
  <line class="zero" x1="60" y1="6" x2="60" y2="64" />

  <!-- Folded paper in the gap between the blades (45°). -->
  <path class="paper" d="M60 35 L49.3 9.2 L70.7 9.2 Z" />

  <!-- The two blades, 22.5° either side of zero pitch. -->
  <line class="blade" x1="49.3" y1="9.2" x2="70.7" y2="60.8" />
  <line class="blade" x1="70.7" y1="9.2" x2="49.3" y2="60.8" />
  <circle class="hub" cx="60" cy="35" r="3" />

  <text class="label" x="76" y="16">45°</text>
</svg>

<style lang="scss">
  .fold-art {
    display: block;
    width: 120px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .shaft {
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  .zero {
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  .paper {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1.2;
    stroke-linejoin: round;
  }

  .blade {
    stroke: currentColor;
    stroke-width: 4;
    stroke-linecap: round;
  }

  .hub {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
  }

  .label {
    fill: var(--color-accent-500);
    font-size: 10px;
    font-weight: 600;
  }
</style>

<!-- An ESC between the battery and the motor, with its telemetry wire
     running to a port on the flight controller. Decorative; the step's text
     explains. -->
<svg viewBox="0 0 150 74" class="esc-art" aria-hidden="true" focusable="false">
  <!-- Battery leads in, motor leads out. -->
  <line class="power" x1="2" y1="26" x2="34" y2="26" />
  <line class="power" x1="2" y1="34" x2="34" y2="34" />
  <line class="lead" x1="86" y1="22" x2="104" y2="22" />
  <line class="lead" x1="86" y1="30" x2="104" y2="30" />
  <line class="lead" x1="86" y1="38" x2="104" y2="38" />
  <rect class="motor" x="104" y="14" width="22" height="32" rx="4" />
  <rect class="body" x="34" y="14" width="52" height="32" rx="4" />
  <rect class="label" x="44" y="22" width="32" height="16" rx="2" />

  <!-- Telemetry and throttle wires down to the FC. -->
  <path class="lead" d="M52 46 C52 56 70 56 70 62" />
  <path class="telem" d="M60 46 C60 54 88 54 88 62" />
  <rect class="body" x="54" y="62" width="64" height="10" rx="2" />
  <rect class="port" x="82" y="60" width="12" height="5" rx="1" />
</svg>

<style lang="scss">
  .esc-art {
    display: block;
    width: 150px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .body,
  .motor {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }

  .label {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1;
  }

  .power {
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
  }

  .lead {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }

  .telem {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .port {
    fill: var(--color-accent-500);
  }
</style>

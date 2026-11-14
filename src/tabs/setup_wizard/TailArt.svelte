<script>
  // The tail end of the boom from above (tail left, tail rotor shaft
  // sticking out to the side), for each kind of tail. Decorative; the text
  // next to it says the same.
  //  - "servo": variable pitch, a pushrod from the servo to the bellcrank;
  //    with `move`, an arrow shows the slider going in towards the case;
  //  - "motor": a tail motor driving the rotor directly;
  //  - "bidirectional": a tail motor with a two-way arrow.
  let { kind = "servo", move = false } = $props();
</script>

<svg viewBox="0 0 120 70" class="tail-art" aria-hidden="true" focusable="false">
  <!-- Boom. -->
  <path class="body" d="M118 32 L30 31 L30 37 L118 38 Z" />

  {#if kind === "servo"}
    <!-- Tail case, rotor shaft, slider and blades. -->
    <rect class="body" x="22" y="28" width="14" height="12" rx="3" />
    <line class="shaft" x1="29" y1="40" x2="29" y2="60" />
    <rect class="slider" x="24" y="48" width="10" height="5" rx="1.5" />
    <ellipse class="rotor" cx="29" cy="60" rx="18" ry="2" />
    <!-- Bellcrank and pushrod back to the servo. -->
    <path class="link" d="M34 50 L42 50 L42 44" />
    <line class="link" x1="42" y1="44" x2="114" y2="44" />
    <rect class="body" x="104" y="46" width="14" height="10" rx="2" />
    {#if move}
      <path class="arrow" d="M10 58 L10 44" />
      <path class="head" d="M6 47 L10 41 L14 47 Z" />
    {/if}
  {:else}
    <!-- Motor on the boom end, rotor on its shaft. -->
    <rect class="motor" x="22" y="26" width="14" height="16" rx="3" />
    <line class="shaft" x1="29" y1="42" x2="29" y2="56" />
    <ellipse class="rotor" cx="29" cy="56" rx="18" ry="2" />
    {#if kind === "bidirectional"}
      <path class="arrow" d="M6 50 A8 8 0 0 0 6 62" />
      <path class="arrow" d="M52 50 A8 8 0 0 1 52 62" />
      <path class="head" d="M2 52 L6 46 L10 52 Z" />
      <path class="head" d="M48 60 L52 66 L56 60 Z" />
    {:else}
      <path class="arrow" d="M48 50 A8 8 0 0 1 48 62" />
      <path class="head" d="M44 60 L48 66 L52 60 Z" />
    {/if}
  {/if}
</svg>

<style lang="scss">
  .tail-art {
    display: block;
    width: 120px;
    height: auto;
    flex: none;
    overflow: visible;
    color: var(--color-text-muted);
  }

  .body {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }

  .motor {
    fill: var(--color-accent-soft);
    stroke: var(--color-accent-500);
    stroke-width: 1.4;
  }

  .shaft,
  .link {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .slider {
    fill: var(--color-accent-500);
  }

  .rotor {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.6;
  }

  .arrow {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  .head {
    fill: var(--color-accent-500);
  }
</style>

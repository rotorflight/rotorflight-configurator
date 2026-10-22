<script>
  // Side view of a helicopter (nose right) for the wizard's illustrations.
  // Decorative only: every scene is also described in the step's text.
  //  - "level": on its skids, level, with a spirit level above it;
  //  - "tailLift": skids' front on the ground, tail lifted 20 degrees;
  //  - "bladesOff": main blades dashed and crossed out ("blades off");
  //  - "tailBladesOff": the tail rotor dashed and crossed out;
  //  - "flying": in the air, level, with motion lines.
  let { scene = "level" } = $props();

  const GROUND = 70;

  // Lifting the tail swings the rotor up above the usual frame.
  let viewBox = $derived(scene === "tailLift" ? "0 -30 168 106" : "0 0 168 76");

  // Scenes with a rendered picture; the rest are still drawn below.
  const PHOTOS = {
    level: "/images/setup_wizard/heli_level.webp",
    tailLift: "/images/setup_wizard/heli_tail_lift.webp",
    bladesOff: "/images/setup_wizard/heli_blades_off.webp",
  };
</script>

{#snippet heli(blades = true, tailBlades = true)}
  <!-- Tail boom, fin and tail rotor. -->
  <path class="body" d="M90 45 L24 42.5 L24 46.5 L90 50 Z" />
  <path class="body" d="M28 43 L17 27 L22 27 L33 43 Z" />
  {#if tailBlades}
    <ellipse class="rotor" cx="20" cy="36" rx="1.6" ry="9" />
  {:else}
    <ellipse class="rotor off" cx="20" cy="36" rx="1.6" ry="9" />
    <line class="cross" x1="13" y1="29" x2="27" y2="43" />
    <line class="cross" x1="27" y1="29" x2="13" y2="43" />
  {/if}
  <!-- Canopy. -->
  <path
    class="body"
    d="M86 38 C100 31 128 31 140 44 C144 50 140 57 130 58 L90 58 C82 58 80 51 82 45 Z"
  />
  <path class="glass" d="M118 36.5 C128 37 136 41 139 46 L121 46 Z" />
  <!-- Skids. -->
  <line class="strut" x1="98" y1="58" x2="96" y2="65" />
  <line class="strut" x1="126" y1="58" x2="128" y2="65" />
  <path class="strut" d="M86 66 L134 66 C138 66 140 64 141 61" />
  <!-- Main shaft, swashplate and head. -->
  <line class="strut" x1="108" y1="33" x2="108" y2="18" />
  <rect class="swash" x="101" y="25" width="14" height="3.4" rx="1.2" />
  <circle class="hub" cx="108" cy="17" r="2.4" />
  {#if blades}
    <line class="blade" x1="52" y1="16" x2="164" y2="16" />
  {:else}
    <line class="blade off" x1="52" y1="16" x2="164" y2="16" />
    <line class="cross" x1="72" y1="8" x2="84" y2="22" />
    <line class="cross" x1="84" y1="8" x2="72" y2="22" />
  {/if}
{/snippet}

{#if PHOTOS[scene]}
  <img class="heli-side photo" src={PHOTOS[scene]} alt="" />
{:else}
  <svg {viewBox} class="heli-side" aria-hidden="true" focusable="false">
    {#if scene !== "flying"}
      <line class="ground" x1="6" y1={GROUND} x2="164" y2={GROUND} />
    {/if}

    {#if scene === "level"}
      <g transform="translate(0 4)">{@render heli()}</g>
      <rect class="vial" x="16" y="6" width="40" height="11" rx="5.5" />
      <line class="mark" x1="31" y1="6" x2="31" y2="17" />
      <line class="mark" x1="41" y1="6" x2="41" y2="17" />
      <circle class="bubble" cx="36" cy="11.5" r="3.2" />
    {:else if scene === "tailLift"}
      <line class="ref" x1="30" y1={GROUND} x2="141" y2={GROUND} />
      <g transform="rotate(20 141 {GROUND}) translate(0 4)">
        {@render heli()}
      </g>
      <path class="arc" d="M91 {GROUND} A50 50 0 0 1 94 52.9" />
      <text class="angle" x="72" y="65">20°</text>
    {:else if scene === "bladesOff"}
      <g transform="translate(0 4)">{@render heli(false)}</g>
    {:else if scene === "tailBladesOff"}
      <g transform="translate(0 4)">{@render heli(true, false)}</g>
    {:else if scene === "flying"}
      {@render heli()}
      <line class="speed" x1="4" y1="56" x2="18" y2="56" />
      <line class="speed" x1="0" y1="64" x2="20" y2="64" />
      <line class="ref" x1="6" y1="74" x2="164" y2="74" />
    {/if}
  </svg>
{/if}

<style lang="scss">
  .heli-side {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    color: var(--color-text-muted);

    &.photo {
      border-radius: 6px;
    }
  }

  .body {
    fill: var(--color-surface);
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linejoin: round;
  }

  .glass {
    fill: var(--color-border-soft);
    stroke: currentColor;
    stroke-width: 1.1;
  }

  .strut {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .swash,
  .hub {
    fill: var(--color-accent-500);
  }

  .blade {
    stroke: var(--color-accent-500);
    stroke-width: 2.4;
    stroke-linecap: round;

    &.off {
      stroke: currentColor;
      stroke-dasharray: 4 4;
      opacity: 0.6;
    }
  }

  .cross {
    stroke: var(--color-status-bad);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .rotor {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;

    &.off {
      stroke-dasharray: 3 3;
      opacity: 0.6;
    }
  }

  .ground {
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    opacity: 0.6;
  }

  .ref {
    stroke: currentColor;
    stroke-width: 1;
    stroke-dasharray: 3 3;
    opacity: 0.6;
  }

  .arc {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 1.4;
  }

  .angle {
    fill: var(--color-accent-500);
    font-size: 10px;
    font-weight: 700;
  }

  .speed {
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    opacity: 0.5;
  }

  .vial {
    fill: var(--color-accent-soft);
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .mark {
    stroke: currentColor;
    stroke-width: 1;
    opacity: 0.6;
  }

  .bubble {
    fill: var(--color-accent-500);
  }
</style>

<script>
  import { i18n } from "@/js/i18n.js";

  // Top view of the swashplate servos for a Mixer.SWASH_TYPE_* value, nose
  // up. Angles are measured from the nose, positive towards the right side;
  // they follow the servo order of mixerUpdate() in the firmware.
  let { swashType, tailServo = true } = $props();

  const LAYOUTS = {
    1: [
      { angle: null, role: "swashServoRolePitch" },
      { angle: null, role: "swashServoRoleRoll" },
      { angle: null, role: "swashServoRoleCollective" },
    ],
    2: ccpm(120),
    3: ccpm(135),
    4: ccpm(140),
    5: [
      { angle: 0, role: "swashServoRoleFront" },
      { angle: -90, role: "swashServoRoleLeft" },
    ],
    6: [
      { angle: -45, role: "swashServoRoleFrontLeft" },
      { angle: 45, role: "swashServoRoleFrontRight" },
    ],
  };

  // Servo 1 can sit in front of or behind the main shaft; the rear variant
  // mirrors the layout front to back, so servo 2 stays on the left.
  const REAR_VARIANT = new Set([2, 3, 4]);

  function ccpm(angle) {
    return [
      { angle: 0, role: "swashServoRoleCenter" },
      { angle: -angle, role: "swashServoRoleLeft" },
      { angle: angle, role: "swashServoRoleRight" },
    ];
  }

  const CX = 40;
  const CY = 40;
  const R = 24;

  function place(layout, mirror) {
    return layout.map((servo, i) => {
      const angle = mirror ? 180 - servo.angle : servo.angle;
      const rad = ((angle ?? 0) * Math.PI) / 180;
      return {
        ...servo,
        angle,
        number: i + 1,
        x: CX + R * Math.sin(rad),
        y: CY - R * Math.cos(rad),
      };
    });
  }

  let servos = $derived(LAYOUTS[swashType] ?? []);
  // Direct passes the controls through to an external mixer, so there's no
  // fixed position to draw.
  let placed = $derived(servos.every((servo) => servo.angle !== null));
  let variants = $derived(
    REAR_VARIANT.has(swashType)
      ? [
          { caption: "swashServoFront", servos: place(servos, false) },
          { caption: "swashServoRear", servos: place(servos, true) },
        ]
      : [{ caption: null, servos: place(servos, false) }],
  );
</script>

{#snippet badge(number, x, y, angle = 0)}
  <g transform="translate({x} {y})">
    <rect
      class="badge"
      x="-7"
      y="-7"
      width="14"
      height="14"
      rx="3"
      transform="rotate({angle})"
    />
    <text class="label" dy="0.35em">{number}</text>
  </g>
{/snippet}

{#if servos.length > 0}
  <div class="swash-diagram">
    {#each variants as variant (variant.caption)}
      <figure>
        <svg viewBox="0 0 80 116" aria-hidden="true">
          <path
            class="body"
            d="M40 6 C56 6 66 24 66 42 C66 58 57 68 46 70 L44 104 L36 104
               L34 70 C23 68 14 58 14 42 C14 24 24 6 40 6 Z"
          />
          <rect class="body" x="46" y="92" width="3" height="20" rx="1.5" />
          <circle
            class={["swash", !placed && "direct"]}
            cx={CX}
            cy={CY}
            r={R}
          />
          <path class="nose" d="M40 32 L46 46 L40 42 L34 46 Z" />
          {#if placed}
            {#each variant.servos as servo (servo.number)}
              {@render badge(servo.number, servo.x, servo.y, servo.angle)}
            {/each}
          {/if}
          {#if tailServo}
            {@render badge(4, 40, 100)}
          {/if}
        </svg>
        {#if variant.caption}
          <figcaption>{$i18n.t(variant.caption)}</figcaption>
        {/if}
      </figure>
    {/each}

    <ol class="legend">
      {#each variants[0].servos as servo (servo.number)}
        <li>
          <span class="chip">{servo.number}</span>
          {$i18n.t(servo.role)}
        </li>
      {/each}
      {#if tailServo}
        <li>
          <span class="chip">4</span>
          {$i18n.t("swashServoRoleTail")}
        </li>
      {/if}
    </ol>
  </div>
{/if}

<style lang="scss">
  .swash-diagram {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
  }

  figure {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin: 0;
  }

  figcaption {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  svg {
    flex: none;
    width: 84px;
    height: auto;
  }

  .body {
    fill: color-mix(in srgb, var(--color-accent-500) 16%, transparent);
  }

  .swash {
    fill: none;
    stroke: var(--color-accent-500);
    stroke-width: 3;
  }

  .swash.direct {
    stroke-width: 2;
    stroke-dasharray: 4 3;
    opacity: 0.6;
  }

  .nose {
    fill: var(--color-accent-500);
    opacity: 0.6;
  }

  .badge {
    fill: var(--color-text);
  }

  .label {
    fill: var(--color-surface);
    font-size: 10px;
    font-weight: 700;
    text-anchor: middle;
  }

  .legend {
    display: grid;
    gap: 3px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.85rem;
    color: var(--color-text-soft);
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chip {
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-surface);
    background-color: var(--color-text);
  }
</style>

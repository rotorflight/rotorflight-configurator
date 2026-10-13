<script>
  import HelpIcon from "@/components/HelpIcon.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Switch from "@/components/Switch.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import {
    firmwareLimitsTravel,
    servoSignalRange,
    servoTravelLimited,
    servoTravelLimits,
  } from "@/js/servoLimits.js";

  let { servos, hasExtendedServoScale, onFieldChange, onRateChange } = $props();

  const FLAG_REVERSE = 1;
  const FLAG_GEOCOR = 2;

  let scaleMin = $derived(hasExtendedServoScale ? 50 : 100);

  // Bus servos have no Rate (Hz) setting; their column shows the source
  // (RX or Mixer) instead. Each table is all PWM or all bus servos.
  let isBusTable = $derived(servos.length > 0 && servos[0].isBusServo);

  const BUS_SERVO_OFFSET = 8;
  const SOURCE_RX = 1;

  function busSource(servo) {
    return FC.BUS_SERVO_CONFIG?.[servo.mspIndex - BUS_SERVO_OFFSET] ?? 0;
  }

  // One entry per editable column. The header, the desktop rows and the
  // compact detail form all render from this list so they can't drift.
  let fields = $derived([
    { key: "mid", label: "servoMid", help: "servoMidHelp" },
    { key: "min", label: "servoMin", help: "servoMinHelp" },
    { key: "max", label: "servoMax", help: "servoMaxHelp" },
    { key: "rneg", label: "servoScaleNeg", help: "servoScaleNegHelp" },
    { key: "rpos", label: "servoScalePos", help: "servoScalePosHelp" },
    isBusTable
      ? { key: "source", label: "servoSource", help: "servoSourceHelp" }
      : { key: "rate", label: "servoRate", help: "servoRateHelp", html: true },
    { key: "speed", label: "servoSpeed", help: "servoSpeedHelp" },
    { key: "reverse", label: "servoReverse", help: "servoReverseHelp" },
    {
      key: "geocor",
      label: "servoGeometryCorrection",
      help: "servoGeometryCorrectionHelp",
      html: true,
    },
  ]);

  // No geometry correction for bus servos driven directly by the RX.
  function hasGeocor(servo) {
    return !(servo.isBusServo && busSource(servo) === SOURCE_RX);
  }

  // CSS Grid instead of a <table>: HTML tables with border-collapse are
  // prone to sub-pixel row-height rounding that visibly accumulates over
  // many rows (fine at row 1, drifted by row 10+) -- a grid sizes every row
  // independently and doesn't have that failure mode.
  const INDEX_COL = 40;
  const VALUE_COL_MIN = 96;
  const VALUE_COL_MAX = 112;
  const VALUE_COLS = 7; // Center, Min, Max, Scale -/+, Rate or Source, Speed
  const REVERSE_COL = 72;
  const GEOCOR_COL = 72;
  const SIGNAL_MIN = 90;
  const COLUMN_GAP = 4;
  const ROW_PADDING = 8;

  const gridColumns =
    `${INDEX_COL}px repeat(${VALUE_COLS}, minmax(${VALUE_COL_MIN}px, ${VALUE_COL_MAX}px)) ` +
    `${REVERSE_COL}px ${GEOCOR_COL}px minmax(${SIGNAL_MIN}px, 1fr)`;

  // The narrowest the grid can get before it overflows. Compared against
  // the measured width of the table's own container rather than a viewport
  // media query, which can't account for the side nav or the Section
  // padding around the table.
  const gridMinWidth =
    INDEX_COL +
    VALUE_COLS * VALUE_COL_MIN +
    REVERSE_COL +
    GEOCOR_COL +
    SIGNAL_MIN +
    (VALUE_COLS + 3) * COLUMN_GAP +
    ROW_PADDING;

  // Below gridMinWidth the table becomes a list of servos; tapping one
  // opens a single-column form with every field at a usable size. Width
  // starts at 0 before the first layout pass, so the list shows first --
  // a brief list on a wide screen reads better than a brief overflowing
  // grid on a narrow one.
  let containerWidth = $state(0);
  let compact = $derived(containerWidth === 0 || containerWidth < gridMinWidth);

  let selectedIndex = $state(null);
  let selectedServo = $derived(
    servos.find((servo) => servo.index === selectedIndex) ?? null,
  );

  // Drop a selection that no longer exists in this table (e.g. bus servos
  // switched off while one of them was open).
  $effect(() => {
    if (
      selectedIndex !== null &&
      !servos.some((servo) => servo.index === selectedIndex)
    ) {
      selectedIndex = null;
    }
  });

  // From 4.6.0 the firmware cuts Min/Max back so center + travel stays in
  // the signal range (see servoLimits.js), so the fields stop there too.
  let limitsTravel = $derived(firmwareLimitsTravel(FC.CONFIG.apiVersion));

  function bounds(servo, field) {
    const limits = limitsTravel
      ? servoTravelLimits(FC.SERVO_CONFIG[servo.index].mid, servo.isBusServo)
      : null;
    if (servo.isBusServo) {
      if (field === "mid") return { min: 1000, max: 2000 };
      if (field === "min") return { min: limits?.min ?? -500, max: -1 };
      if (field === "max") return { min: 1, max: limits?.max ?? 500 };
    } else {
      if (field === "mid") return { min: 50, max: 2250 };
      if (field === "min") return { min: limits?.min ?? -1000, max: 1000 };
      if (field === "max") return { min: -1000, max: limits?.max ?? 1000 };
    }
    return {};
  }

  function limited(servo) {
    if (!limitsTravel) return { min: false, max: false };
    return servoTravelLimited(FC.SERVO_CONFIG[servo.index], servo.isBusServo);
  }

  function limitTitle(servo, field) {
    if (!limited(servo)[field]) {
      return undefined;
    }
    const signal = servoSignalRange(servo.isBusServo);
    return $i18n.t("servoTravelLimitedHelp", {
      1: FC.SERVO_CONFIG[servo.index].mid,
      2: field === "max" ? signal.max : signal.min,
    });
  }

  function meterRange(servo) {
    if (servo.isBusServo) {
      return { min: 1000, max: 2000 };
    }

    const mid = FC.SERVO_CONFIG[servo.index].mid;
    if (mid <= 860) return { min: 375, max: 1145 };
    if (mid <= 1060) return { min: 460, max: 1460 };
    return { min: 500, max: 2500 };
  }

  function meterPercent(servo) {
    const { min, max } = meterRange(servo);
    const value = FC.SERVO_DATA[servo.index] ?? min;
    const percent = (100 * (value - min)) / (max - min);
    return Math.min(100, Math.max(0, percent));
  }

  function flag(index, mask) {
    return (FC.SERVO_CONFIG[index].flags & mask) !== 0;
  }

  function setFlag(index, mask, enabled) {
    FC.SERVO_CONFIG[index].flags = enabled
      ? FC.SERVO_CONFIG[index].flags | mask
      : FC.SERVO_CONFIG[index].flags & ~mask;
  }
</script>

{#snippet fieldLabel(field)}
  <span>{$i18n.t(field.label)}</span>
  <HelpIcon>
    {#if field.html}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t(field.help)}
    {:else}
      {$i18n.t(field.help)}
    {/if}
  </HelpIcon>
{/snippet}

{#snippet control(servo, field)}
  {@const config = FC.SERVO_CONFIG[servo.index]}
  {#if field.key === "mid"}
    <span>
      <NumberInput
        {...bounds(servo, "mid")}
        bind:value={config.mid}
        onchange={() => onFieldChange(servo.index)}
      />
    </span>
  {:else if field.key === "min" || field.key === "max"}
    <span
      class="travel-cell"
      class:limited={limited(servo)[field.key]}
      title={limitTitle(servo, field.key)}
    >
      <NumberInput
        {...bounds(servo, field.key)}
        bind:value={config[field.key]}
        onchange={() => onFieldChange(servo.index)}
      />
    </span>
  {:else if field.key === "rneg" || field.key === "rpos"}
    <span>
      <NumberInput
        min={scaleMin}
        max="1000"
        bind:value={config[field.key]}
        onchange={() => onFieldChange(servo.index)}
      />
    </span>
  {:else if field.key === "source"}
    <span class="servo-source">
      {busSource(servo) === SOURCE_RX ? "RX" : "Mixer"}
    </span>
  {:else if field.key === "rate"}
    <span>
      <NumberInput
        min="50"
        max="5000"
        bind:value={config.rate}
        onchange={() => onRateChange(servo.index)}
      />
    </span>
  {:else if field.key === "speed"}
    <span>
      <NumberInput
        min="0"
        max="60000"
        bind:value={config.speed}
        onchange={() => onFieldChange(servo.index)}
      />
    </span>
  {:else if field.key === "reverse"}
    <span class="servo-checkbox">
      <Switch
        bind:checked={
          () => flag(servo.index, FLAG_REVERSE),
          (v) => setFlag(servo.index, FLAG_REVERSE, v)
        }
        onchange={() => onFieldChange(servo.index)}
      />
    </span>
  {:else if field.key === "geocor"}
    <span class="servo-checkbox">
      {#if hasGeocor(servo)}
        <Switch
          bind:checked={
            () => flag(servo.index, FLAG_GEOCOR),
            (v) => setFlag(servo.index, FLAG_GEOCOR, v)
          }
          onchange={() => onFieldChange(servo.index)}
        />
      {/if}
    </span>
  {/if}
{/snippet}

{#snippet signal(servo)}
  <span class="servo-signal">
    <span class="meter">
      <span class="meter-fill" style="width: {meterPercent(servo)}%"></span>
    </span>
    <span class="meter-label">{FC.SERVO_DATA[servo.index] ?? 0}</span>
  </span>
{/snippet}

<div class="servo-config" bind:clientWidth={containerWidth}>
  {#if !compact}
    <div class="header-row" style="grid-template-columns: {gridColumns}">
      <span>{$i18n.t("servoNumber")}</span>
      {#each fields as field (field.key)}
        <span class="header-label-flex">{@render fieldLabel(field)}</span>
      {/each}
      <span>{$i18n.t("servoSignal")}</span>
    </div>

    {#each servos as servo (servo.index)}
      <div class="servo-row" style="grid-template-columns: {gridColumns}">
        <span class="servo-index">{servo.label}</span>
        {#each fields as field (field.key)}
          {@render control(servo, field)}
        {/each}
        {@render signal(servo)}
      </div>
    {/each}
  {:else if selectedServo}
    {@const servo = selectedServo}
    <div class="compact-detail">
      <button
        type="button"
        class="compact-back"
        onclick={() => (selectedIndex = null)}
      >
        <em class="fas fa-chevron-left"></em>
        {$i18n.t("servoListBack")}
      </button>

      <div class="compact-title">
        {$i18n.t("servoNumber")}
        {servo.label}
      </div>

      {#each fields as field (field.key)}
        {#if field.key !== "geocor" || hasGeocor(servo)}
          <div class="compact-field">
            <span class="header-label-flex compact-label">
              {@render fieldLabel(field)}
            </span>
            {@render control(servo, field)}
          </div>
        {/if}
      {/each}

      <div class="compact-field">
        <span class="compact-label">{$i18n.t("servoSignal")}</span>
        {@render signal(servo)}
      </div>
    </div>
  {:else}
    <div class="compact-list">
      {#each servos as servo (servo.index)}
        <button
          type="button"
          class="compact-row"
          onclick={() => (selectedIndex = servo.index)}
        >
          <span class="compact-row-index">{servo.label}</span>
          {@render signal(servo)}
          <span class="compact-row-mid">
            {$i18n.t("servoMid")}: {FC.SERVO_CONFIG[servo.index].mid}
          </span>
          {#if flag(servo.index, FLAG_REVERSE)}
            <span class="compact-row-tag">{$i18n.t("servoReverse")}</span>
          {/if}
          <em class="fas fa-chevron-right compact-row-chevron"></em>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .servo-config {
    width: 100%;
    margin-top: 2px;
  }

  .header-row,
  .servo-row {
    display: grid;
    align-items: center;
    column-gap: 4px;
  }

  .header-row {
    padding: 4px;
    font-weight: 600;
    font-size: 0.75rem;
    text-align: center;

    color: var(--color-text-soft);
    background-color: var(--color-surface-float, var(--color-surface));
    border-bottom: 1px solid var(--color-border);
  }

  .header-label-flex {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    min-width: 0;
    text-align: center;
    line-height: 1.2;
  }

  .header-label-flex :global(.container) {
    margin-left: 2px;
  }

  .servo-row {
    padding: 4px;
    text-align: center;
    border-bottom: 1px solid var(--color-border);
  }

  .servo-index {
    font-weight: 600;
  }

  /* Min/Max at the limit set by the center: see limitTitle(). */
  .travel-cell.limited :global(input) {
    color: var(--color-danger);
    font-weight: 700;
  }

  .servo-checkbox {
    display: flex;
    justify-content: center;
  }

  .servo-signal {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .meter {
    position: relative;
    display: block;
    flex: 1;
    height: 10px;
    border-radius: var(--radius-sm);
    overflow: hidden;

    background-color: var(--color-surface-float, var(--color-surface));
    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.2);
  }

  .meter-fill {
    position: absolute;
    top: 0;
    left: 0;
    display: block;
    height: 100%;
    border-radius: var(--radius-sm);
    background-color: var(--color-accent, var(--accent));
    transition: width 0.1s linear;
  }

  .servo-source {
    align-self: center;
    font-weight: 600;
  }

  .meter-label {
    min-width: 34px;
    font-size: 10px;
    font-weight: 600;
    text-align: right;

    color: var(--color-text-soft);
  }

  .compact-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 2px;
  }

  .compact-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font: inherit;
    text-align: left;
    cursor: pointer;

    color: var(--color-text);
    background-color: var(--color-surface);

    @media (hover: hover) {
      &:hover {
        background-color: var(--color-surface-float, var(--color-surface));
      }
    }

    .servo-signal {
      flex: 1;
      min-width: 70px;
    }
  }

  .compact-row-index {
    min-width: 1.8rem;
    font-weight: 700;
    text-align: center;
  }

  .compact-row-mid {
    flex-shrink: 0;
    font-size: 0.75rem;
    white-space: nowrap;

    color: var(--color-text-soft);
  }

  .compact-row-tag {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: var(--radius-xs);
    font-size: 0.65rem;
    font-weight: 700;

    color: var(--color-text-soft);
    background-color: var(--color-surface-float, var(--color-surface));
  }

  .compact-row-chevron {
    flex-shrink: 0;
    font-size: 0.8rem;

    color: var(--color-text-soft);
  }

  .compact-detail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 2px;
  }

  .compact-back {
    @extend %button;

    align-self: flex-start;
    gap: 6px;
    padding: 0 10px;
  }

  .compact-title {
    margin: 6px 0 4px;
    font-weight: 700;
    font-size: 0.95rem;
    text-align: center;
  }

  .compact-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 2.5rem;
    padding: 4px;
    border-bottom: 1px solid var(--color-border);

    .servo-signal {
      flex: 1;
      max-width: 240px;
    }
  }

  .compact-label {
    justify-content: flex-start;
    font-weight: 600;
    font-size: 0.85rem;
  }
</style>

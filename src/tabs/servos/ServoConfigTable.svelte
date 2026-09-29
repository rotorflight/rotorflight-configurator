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

  // CSS Grid instead of a <table>: HTML tables with border-collapse are
  // prone to sub-pixel row-height rounding that visibly accumulates over
  // many rows (fine at row 1, drifted by row 10+) -- a grid sizes every row
  // independently and doesn't have that failure mode.
  const gridColumns =
    "40px repeat(7, minmax(96px, 112px)) 72px 96px minmax(110px, 1fr)";

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

<div class="servo-config">
  <div class="header-row" style="grid-template-columns: {gridColumns}">
    <span>{$i18n.t("servoNumber")}</span>
    <span class="header-label-flex">
      <span>{$i18n.t("servoMid")}</span>
      <HelpIcon>{$i18n.t("servoMidHelp")}</HelpIcon>
    </span>
    <span class="header-label-flex">
      <span>{$i18n.t("servoMin")}</span>
      <HelpIcon>{$i18n.t("servoMinHelp")}</HelpIcon>
    </span>
    <span class="header-label-flex">
      <span>{$i18n.t("servoMax")}</span>
      <HelpIcon>{$i18n.t("servoMaxHelp")}</HelpIcon>
    </span>
    <span class="header-label-flex">
      <span>{$i18n.t("servoScaleNeg")}</span>
      <HelpIcon>{$i18n.t("servoScaleNegHelp")}</HelpIcon>
    </span>
    <span class="header-label-flex">
      <span>{$i18n.t("servoScalePos")}</span>
      <HelpIcon>{$i18n.t("servoScalePosHelp")}</HelpIcon>
    </span>
    {#if isBusTable}
      <span class="header-label-flex">
        <span>{$i18n.t("servoSource")}</span>
        <HelpIcon>{$i18n.t("servoSourceHelp")}</HelpIcon>
      </span>
    {:else}
      <span class="header-label-flex">
        <span>{$i18n.t("servoRate")}</span>
        <HelpIcon>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html $i18n.t("servoRateHelp")}
        </HelpIcon>
      </span>
    {/if}
    <span class="header-label-flex">
      <span>{$i18n.t("servoSpeed")}</span>
      <HelpIcon>{$i18n.t("servoSpeedHelp")}</HelpIcon>
    </span>
    <span class="header-label-flex">
      <span>{$i18n.t("servoReverse")}</span>
      <HelpIcon>{$i18n.t("servoReverseHelp")}</HelpIcon>
    </span>
    <span class="header-label-flex">
      <span>{$i18n.t("servoGeometryCorrection")}</span>
      <HelpIcon>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html $i18n.t("servoGeometryCorrectionHelp")}
      </HelpIcon>
    </span>
    <span>{$i18n.t("servoSignal")}</span>
  </div>

  {#each servos as servo (servo.index)}
    {@const config = FC.SERVO_CONFIG[servo.index]}
    <div class="servo-row" style="grid-template-columns: {gridColumns}">
      <span class="servo-index">{servo.label}</span>
      <span>
        <NumberInput
          {...bounds(servo, "mid")}
          bind:value={config.mid}
          onchange={() => onFieldChange(servo.index)}
        />
      </span>
      <span
        class="travel-cell"
        class:limited={limited(servo).min}
        title={limitTitle(servo, "min")}
      >
        <NumberInput
          {...bounds(servo, "min")}
          bind:value={config.min}
          onchange={() => onFieldChange(servo.index)}
        />
      </span>
      <span
        class="travel-cell"
        class:limited={limited(servo).max}
        title={limitTitle(servo, "max")}
      >
        <NumberInput
          {...bounds(servo, "max")}
          bind:value={config.max}
          onchange={() => onFieldChange(servo.index)}
        />
      </span>
      <span>
        <NumberInput
          min={scaleMin}
          max="1000"
          bind:value={config.rneg}
          onchange={() => onFieldChange(servo.index)}
        />
      </span>
      <span>
        <NumberInput
          min={scaleMin}
          max="1000"
          bind:value={config.rpos}
          onchange={() => onFieldChange(servo.index)}
        />
      </span>
      {#if servo.isBusServo}
        <span class="servo-source">
          {busSource(servo) === SOURCE_RX ? "RX" : "Mixer"}
        </span>
      {:else}
        <span>
          <NumberInput
            min="50"
            max="5000"
            bind:value={config.rate}
            onchange={() => onRateChange(servo.index)}
          />
        </span>
      {/if}
      <span>
        <NumberInput
          min="0"
          max="60000"
          bind:value={config.speed}
          onchange={() => onFieldChange(servo.index)}
        />
      </span>
      <span class="servo-checkbox">
        <Switch
          bind:checked={
            () => flag(servo.index, FLAG_REVERSE),
            (v) => setFlag(servo.index, FLAG_REVERSE, v)
          }
          onchange={() => onFieldChange(servo.index)}
        />
      </span>
      <span class="servo-checkbox">
        <!-- no geometry correction for bus servos driven directly by the RX -->
        {#if !(servo.isBusServo && busSource(servo) === SOURCE_RX)}
          <Switch
            bind:checked={
              () => flag(servo.index, FLAG_GEOCOR),
              (v) => setFlag(servo.index, FLAG_GEOCOR, v)
            }
            onchange={() => onFieldChange(servo.index)}
          />
        {/if}
      </span>
      <span class="servo-signal">
        <span class="meter">
          <span class="meter-fill" style="width: {meterPercent(servo)}%"></span>
        </span>
        <span class="meter-label">{FC.SERVO_DATA[servo.index] ?? 0}</span>
      </span>
    </div>
  {/each}
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
</style>

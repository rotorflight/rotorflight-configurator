<script>
  import wNumb from "wnumb";

  import NumberInput from "@/components/NumberInput.svelte";
  import Slider from "@/components/Slider.svelte";
  import Switch from "@/components/Switch.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  const OVERRIDE_OFF = 2001;

  let { servos } = $props();

  const sliderOpts = {
    range: { min: -90, max: 90 },
    start: 0,
    step: 5,
    behaviour: "snap-drag",
    pips: {
      mode: "values",
      values: [-80, -60, -40, -20, 0, 20, 40, 60, 80],
      density: 100 / ((80 + 80) / 5),
      stepped: true,
      format: wNumb({ decimals: 0 }),
    },
  };

  function isEnabled(servo) {
    const raw = FC.SERVO_OVERRIDE[servo.mspIndex];
    return raw >= -2000 && raw <= 2000;
  }

  function setEnabled(servo, enabled) {
    FC.SERVO_OVERRIDE[servo.mspIndex] = enabled ? 0 : OVERRIDE_OFF;
    mspHelper.sendServoOverride(servo.mspIndex);
  }

  function getAngle(servo) {
    if (!isEnabled(servo)) {
      return 0;
    }

    const raw = FC.SERVO_OVERRIDE[servo.mspIndex];
    return servo.isBusServo
      ? Math.round((raw * 90) / 500)
      : Math.round((raw * 50) / 1000);
  }

  function setAngle(servo, angle) {
    const raw = servo.isBusServo
      ? Math.round((angle * 500) / 90)
      : Math.round((angle * 1000) / 50);
    FC.SERVO_OVERRIDE[servo.mspIndex] = raw;
    mspHelper.sendServoOverride(servo.mspIndex);
  }
</script>

<div class="header-row">
  <span class="col-index">{$i18n.t("servoNumber")}</span>
  <span class="col-enable">{$i18n.t("servoOverrideEnable")}</span>
  <span class="col-angle">{$i18n.t("servoOverrideAngle")}</span>
  <span class="col-slider">{$i18n.t("servoOverrideSlider")}</span>
</div>

{#each servos as servo (servo.index)}
  <div class="servo-row">
    <span class="col-index">{servo.label}</span>
    <span class="col-enable">
      <Switch
        bind:checked={() => isEnabled(servo), (v) => setEnabled(servo, v)}
      />
    </span>
    <span class="col-angle">
      <NumberInput
        min="-90"
        max="90"
        step="5"
        disabled={!isEnabled(servo)}
        bind:value={() => getAngle(servo), (v) => setAngle(servo, v)}
      />
    </span>
    <div class="col-slider" class:disabled={!isEnabled(servo)}>
      <!-- changeOnSlide=false: only commit (and send to the FC) when the
           drag ends, same as the legacy tab's slide/change split -- not on
           every intermediate drag tick. -->
      <Slider
        opts={sliderOpts}
        changeOnSlide={false}
        bind:value={() => getAngle(servo), (v) => setAngle(servo, v)}
      />
    </div>
  </div>
{/each}

<style lang="scss">
  .header-row,
  .servo-row {
    display: grid;
    grid-template-columns: 60px 80px 100px minmax(220px, 1fr);
    align-items: center;
    column-gap: 12px;
  }

  .header-row {
    padding: 4px 10px;
    font-weight: 600;
    font-size: 0.75rem;

    color: var(--color-text-soft);
    background-color: var(--color-surface-float, var(--color-surface));
    border-bottom: 1px solid var(--color-border);
  }

  .servo-row {
    align-items: start;
    padding: 14px 10px 44px;
    border-bottom: 1px solid var(--color-border);
  }

  .col-index,
  .col-enable,
  .col-angle {
    padding-top: 4px;
  }

  .col-index {
    font-weight: 600;
    text-align: center;
  }

  .col-enable {
    text-align: center;
  }

  .col-slider {
    padding: 8px 20px 0;
  }

  .col-slider.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
</style>

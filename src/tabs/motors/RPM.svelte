<script>
  import { slide } from "svelte/transition";

  import { FC } from "@/js/fc.svelte.js";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import motorState from "./state.svelte.js";
</script>

<Section label="motorsSectionLabelRPM">
  <SubSection>
    <Field id="rpm-sensor" label="motorsRPMSensor">
      {#snippet tooltip()}
        <Tooltip help="motorsRPMSensorHelp" />
      {/snippet}
      <Switch
        id="rpm-sensor"
        bind:checked={FC.FEATURE_CONFIG.features.FREQ_SENSOR}
      />
    </Field>

    {#if motorState.isDshot}
      <div transition:slide>
        <Field id="dshot-bidir" label="motorsDshotBidir">
          {#snippet tooltip()}
            <Tooltip help="motorsDshotBidirHelp" />
          {/snippet}
          <Switch
            id="dshot-bidir"
            bind:checked={FC.ESC_SENSOR_CONFIG.use_dshot_telemetry}
          />
        </Field>
      </div>
    {/if}

    <Field label="motorsMainRotorGearRatio">
      {#snippet tooltip()}
        <Tooltip help="motorsMainRotorGearRatioHelp" />
      {/snippet}
      <div class="ratio-container">
        <span class="ratio">
          1:{(
            FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] /
            FC.MOTOR_CONFIG.main_rotor_gear_ratio[0]
          ).toFixed(2)}
        </span>
        <NumberInput
          min="1"
          max="50000"
          bind:value={FC.MOTOR_CONFIG.main_rotor_gear_ratio[0]}
        />
        <span class="ratio-separator">:</span>
        <NumberInput
          min="1"
          max="50000"
          bind:value={FC.MOTOR_CONFIG.main_rotor_gear_ratio[1]}
        />
      </div>
    </Field>

    <Field label="motorsTailRotorGearRatio">
      {#snippet tooltip()}
        <Tooltip help="motorsTailRotorGearRatioHelp" />
      {/snippet}
      <div class="ratio-container">
        <span class="ratio">
          1:{(
            FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] /
            FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0]
          ).toFixed(2)}
        </span>
        <NumberInput
          min="1"
          max="50000"
          bind:value={FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0]}
        />
        <span class="ratio-separator">:</span>
        <NumberInput
          min="1"
          max="50000"
          bind:value={FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1]}
        />
      </div>
    </Field>

    {#each { length: FC.CONFIG.motorCount } as _, i (i)}
      <Field id={`motor-poles-${i + 1}`} label={`motorsMotorPoles${i + 1}Long`}>
        {#snippet tooltip()}
          <Tooltip help="motorsMotorPolesHelp" />
        {/snippet}
        <NumberInput
          id={`motor-poles-${i + 1}`}
          min="2"
          max="255"
          step="2"
          bind:value={FC.MOTOR_CONFIG.motor_poles[i]}
        />
      </Field>
    {/each}
  </SubSection>
</Section>

<style lang="scss">
  .ratio-container {
    display: flex;
    align-items: center;
  }

  .ratio {
    margin-right: 8px;
    font-size: 0.7rem;
    font-weight: 400;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-700);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-200);
    }
  }

  .ratio-separator {
    padding: 0 6px;
    font-weight: bold;
  }
</style>

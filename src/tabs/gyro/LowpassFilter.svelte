<script>
  import { slide } from "svelte/transition";

  import { CONFIGURATOR } from "@/js/configurator.svelte.js";

  import Switch from "@/components/Switch.svelte";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  let { FC = $bindable() } = $props();

  const FILTER_TYPES = [
    { id: 0, name: "Disabled", visible: false },
    { id: 1, name: "1ˢᵗ order", visible: true },
    { id: 2, name: "2ⁿᵈ order", visible: true },
    { id: 3, name: "PT1", visible: false },
    { id: 4, name: "PT2", visible: false },
    { id: 5, name: "PT3", visible: false },
    { id: 6, name: "Order1", visible: false },
    { id: 7, name: "Butter", visible: false },
    { id: 8, name: "Bessel", visible: false },
    { id: 9, name: "Damped", visible: false },
  ];

  const defaultValues = FC.getFilterDefaults();
  const previousValues = {};

  let lowpass1Enabled = $derived(FC.FILTER_CONFIG.gyro_lowpass_type > 0);

  let lowpass1DynEnabled = $derived(
    FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz > 0 &&
      FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz <
        FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz,
  );

  let lowpass2Enabled = $derived(FC.FILTER_CONFIG.gyro_lowpass2_type > 0);

  function loadValue(name) {
    FC.FILTER_CONFIG[name] =
      FC.FILTER_CONFIG[name] || previousValues[name] || defaultValues[name];
  }

  function toggleLowpass1(enable) {
    if (enable) {
      loadValue("gyro_lowpass_type");
      loadValue("gyro_lowpass_hz");

      if (previousValues.gyro_lowpass_dyn_enable) {
        loadValue("gyro_lowpass_dyn_min_hz");
        loadValue("gyro_lowpass_dyn_max_hz");
      }
    } else {
      previousValues.gyro_lowpass_type = FC.FILTER_CONFIG.gyro_lowpass_type;
      previousValues.gyro_lowpass_hz = FC.FILTER_CONFIG.gyro_lowpass_hz;
      if (lowpass1DynEnabled) {
        previousValues.gyro_lowpass_dyn_min_hz =
          FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz;
        previousValues.gyro_lowpass_dyn_max_hz =
          FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz;
      }

      FC.FILTER_CONFIG.gyro_lowpass_type = 0;
      FC.FILTER_CONFIG.gyro_lowpass_hz = 0;
      FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz = 0;
      FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz = 0;
    }
  }

  function toggleLowpass1Dyn(enable) {
    if (enable) {
      loadValue("gyro_lowpass_dyn_min_hz");
      loadValue("gyro_lowpass_dyn_max_hz");
    } else {
      previousValues.gyro_lowpass_dyn_min_hz =
        FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz;
      previousValues.gyro_lowpass_dyn_max_hz =
        FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz;

      FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz = 0;
      FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz = 0;
    }

    previousValues.gyro_lowpass_dyn_enable = enable;
  }

  function toggleLowpass2(enable) {
    if (enable) {
      loadValue("gyro_lowpass2_type");
      loadValue("gyro_lowpass2_hz");
    } else {
      previousValues.gyro_lowpass2_type = FC.FILTER_CONFIG.gyro_lowpass2_type;
      previousValues.gyro_lowpass2_hz = FC.FILTER_CONFIG.gyro_lowpass2_hz;

      FC.FILTER_CONFIG.gyro_lowpass2_type = 0;
      FC.FILTER_CONFIG.gyro_lowpass2_hz = 0;
    }
  }
</script>

{#snippet filterOpts(value)}
  {#each FILTER_TYPES as filterType (filterType.id)}
    {#if filterType.visible || filterType.id === value}
      <option value={filterType.id}>{filterType.name}</option>
    {/if}
  {/each}
{/snippet}

<Section label="gyroLowpassFilterHeading" summary="gyroLowpassFilterHelp">
  <SubSection label={CONFIGURATOR.expertMode ? "gyroLowpassFilter1" : null}>
    <Field id="lowpass-filter-1-enable" label="genericEnable">
      <Switch
        id="lowpass-filter-1-enable"
        bind:checked={() => lowpass1Enabled, toggleLowpass1}
      />
    </Field>
    {#if lowpass1Enabled}
      <div transition:slide>
        <SubSection>
          <Field id="gyro-lowpass-1-type" label="gyroLowpassType">
            <select
              id="gyro-lowpass-1-type"
              bind:value={FC.FILTER_CONFIG.gyro_lowpass_type}
            >
              {@render filterOpts(FC.FILTER_CONFIG.gyro_lowpass_type)}
            </select>
          </Field>
          <Field
            id="gyro-lowpass-1-freq"
            label="gyroLowpassFrequency"
            unit="Hz"
          >
            <NumberInput
              id="gyro-lowpass-1-freq"
              min="0"
              max="1000"
              bind:value={FC.FILTER_CONFIG.gyro_lowpass_hz}
            />
          </Field>
          <Field id="gyro-lowpass-1-dyn" label="gyroLowpassDynamicCutoff">
            <Switch
              id="gyro-lowpass-1-dyn"
              bind:checked={() => lowpass1DynEnabled, toggleLowpass1Dyn}
            />
          </Field>
          {#if lowpass1DynEnabled}
            <div transition:slide>
              <SubSection>
                <Field
                  id="gyro-dyn-lowpass-min-freq"
                  label="gyroLowpassDynMinFrequency"
                  unit="Hz"
                >
                  <NumberInput
                    id="gyro-dyn-lowpass-min-freq"
                    min="0"
                    max="1000"
                    bind:value={FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz}
                  />
                </Field>
                <Field
                  id="gyro-dyn-lowpass-max-freq"
                  label="gyroLowpassDynMaxFrequency"
                  unit="Hz"
                >
                  <NumberInput
                    id="gyro-dyn-lowpass-max-freq"
                    min="0"
                    max="1000"
                    bind:value={FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz}
                  />
                </Field>
              </SubSection>
            </div>
          {/if}
        </SubSection>
      </div>
    {/if}
  </SubSection>
  {#if CONFIGURATOR.expertMode}
    <div transition:slide>
      <SubSection label="gyroLowpassFilter2">
        <Field id="lowpass-filter-2-enable" label="genericEnable">
          <Switch
            id="lowpass-filter-2-enable"
            bind:checked={() => lowpass2Enabled, toggleLowpass2}
          />
        </Field>
        {#if lowpass2Enabled}
          <div transition:slide>
            <SubSection>
              <Field id="gyro-lowpass-2-type" label="gyroLowpassType">
                <select
                  id="gyro-lowpass-2-type"
                  bind:value={FC.FILTER_CONFIG.gyro_lowpass2_type}
                >
                  {@render filterOpts(FC.FILTER_CONFIG.gyro_lowpass2_type)}
                </select>
              </Field>
              <Field
                id="gyro-lowpass-2-freq"
                label="gyroLowpassFrequency"
                unit="Hz"
              >
                <NumberInput
                  id="gyro-lowpass-2-freq"
                  min="0"
                  max="1000"
                  bind:value={FC.FILTER_CONFIG.gyro_lowpass2_hz}
                />
              </Field>
            </SubSection>
          </div>
        {/if}
      </SubSection>
    </div>
  {/if}
</Section>

<style lang="scss">
</style>

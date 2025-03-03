<script>
  import Switch from "@/components/Switch.svelte";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  let { FC = $bindable() } = $props();

  const defaultValues = FC.getFilterDefaults();
  const previousValues = {};

  let static1Enable = $derived(
    FC.FILTER_CONFIG.gyro_notch_hz > 0 &&
      FC.FILTER_CONFIG.gyro_notch_cutoff > 0,
  );
  let static2Enable = $derived(
    FC.FILTER_CONFIG.gyro_notch2_hz > 0 &&
      FC.FILTER_CONFIG.gyro_notch2_cutoff > 0,
  );

  function loadValue(name) {
    FC.FILTER_CONFIG[name] =
      FC.FILTER_CONFIG[name] || previousValues[name] || defaultValues[name];
  }

  function toggleStatic1(enable) {
    if (enable) {
      loadValue("gyro_notch_hz");
      loadValue("gyro_notch_cutoff");
    } else {
      previousValues.gyro_notch_hz = FC.FILTER_CONFIG.gyro_notch_hz;
      previousValues.gyro_notch_cutoff = FC.FILTER_CONFIG.gyro_notch_cutoff;

      FC.FILTER_CONFIG.gyro_notch_hz = 0;
      FC.FILTER_CONFIG.gyro_notch_cutoff = 0;
    }
  }

  function toggleStatic2(enable) {
    if (enable) {
      loadValue("gyro_notch2_hz");
      loadValue("gyro_notch2_cutoff");
    } else {
      previousValues.gyro_notch2_hz = FC.FILTER_CONFIG.gyro_notch2_hz;
      previousValues.gyro_notch2_cutoff = FC.FILTER_CONFIG.gyro_notch2_cutoff;

      FC.FILTER_CONFIG.gyro_notch2_hz = 0;
      FC.FILTER_CONFIG.gyro_notch2_cutoff = 0;
    }
  }
</script>

<Section label="gyroStaticFilterHeading" summary="gyroStaticFilterHelp">
  <SubSection label="gyroStaticFilter1">
    <Field id="static-filter-1-enable" label="genericEnable">
      <Switch
        id="static-filter-1-enable"
        bind:checked={() => static1Enable, toggleStatic1}
      />
    </Field>
    {#if static1Enable}
      <SubSection>
        <Field
          id="static-filter-1-center"
          label="gyroStaticFilterFrequency"
          unit="Hz"
        >
          <NumberInput
            id="static-filter-1-center"
            min="0"
            max="1000"
            bind:value={FC.FILTER_CONFIG.gyro_notch_hz}
          />
        </Field>
        <Field
          id="static-filter-1-cutoff"
          label="gyroStaticFilterCutoff"
          unit="Hz"
        >
          <NumberInput
            id="static-filter-1-cutoff"
            min="0"
            max="1000"
            bind:value={FC.FILTER_CONFIG.gyro_notch_cutoff}
          />
        </Field>
      </SubSection>
    {/if}
  </SubSection>
  <SubSection label="gyroStaticFilter2">
    <Field id="static-filter-2-enable" label="genericEnable">
      <Switch
        id="static-filter-2-enable"
        bind:checked={() => static2Enable, toggleStatic2}
      />
    </Field>
    {#if static2Enable}
      <SubSection>
        <Field
          id="static-filter-2-center"
          label="gyroStaticFilterFrequency"
          unit="Hz"
        >
          <NumberInput
            id="static-filter-2-center"
            min="0"
            max="1000"
            bind:value={FC.FILTER_CONFIG.gyro_notch2_hz}
          />
        </Field>
        <Field
          id="static-filter-2-cutoff"
          label="gyroStaticFilterCutoff"
          unit="Hz"
        >
          <NumberInput
            id="static-filter-2-cutoff"
            min="0"
            max="1000"
            bind:value={FC.FILTER_CONFIG.gyro_notch2_cutoff}
          />
        </Field>
      </SubSection>
    {/if}
  </SubSection>
</Section>

<style lang="scss">
</style>

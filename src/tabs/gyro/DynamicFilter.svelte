<script>
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  let { FC = $bindable() } = $props();
</script>

<Section label="gyroDynamicFilterHeading" summary="gyroDynamicFilterHelp">
  <SubSection>
    <Field id="dyn-notch-enable" label="genericEnable">
      <Switch
        id="dyn-notch-enable"
        bind:checked={FC.FEATURE_CONFIG.features.DYN_NOTCH}
      />
    </Field>
    {#if FC.FEATURE_CONFIG.features.DYN_NOTCH}
      <SubSection>
        <Field id="dyn-notch-count" label="gyroDynamicNotchCount">
          {#snippet tooltip()}
            <Tooltip help="gyroDynamicNotchCountHelp" />
          {/snippet}
          <NumberInput
            id="dyn-notch-count"
            min="0"
            max="8"
            bind:value={FC.FILTER_CONFIG.dyn_notch_count}
          />
        </Field>
        <Field id="dyn-notch-q" label="gyroDynamicNotchQ">
          {#snippet tooltip()}
            <Tooltip help="gyroDynamicNotchQHelp" />
          {/snippet}
          <NumberInput
            id="dyn-notch-q"
            min="1"
            max="10"
            step="0.1"
            bind:value={
              () => FC.FILTER_CONFIG.dyn_notch_q / 10,
              (v) => (FC.FILTER_CONFIG.dyn_notch_q = v * 10)
            }
          />
        </Field>
        <Field id="dyn-notch-min-hz" label="gyroDynamicNotchMinHz" unit="Hz">
          {#snippet tooltip()}
            <Tooltip help="gyroDynamicNotchMinHzHelp" />
          {/snippet}
          <NumberInput
            id="dyn-notch-min-hz"
            min="10"
            max="200"
            bind:value={FC.FILTER_CONFIG.dyn_notch_min_hz}
          />
        </Field>
        <Field id="dyn-notch-max-hz" label="gyroDynamicNotchMaxHz" unit="Hz">
          {#snippet tooltip()}
            <Tooltip help="gyroDynamicNotchMaxHzHelp" />
          {/snippet}
          <NumberInput
            id="dyn-notch-max-hz"
            min="100"
            max="500"
            bind:value={FC.FILTER_CONFIG.dyn_notch_max_hz}
          />
        </Field>
      </SubSection>
    {/if}
  </SubSection>
</Section>

<style lang="scss">
</style>

<script>
  import semver from "semver";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
</script>

<Section label="govSectionFilters">
  <SubSection>
    <Field id="gov-headspeed-filter" label="govHeadspeedFilterHz" unit="Hz">
      {#snippet tooltip()}
        <Tooltip
          help="govHeadspeedFilterHzHelp"
          attrs={[
            { name: "genericDefault", value: "10Hz" },
            { name: "genericRange", value: "0Hz - 250Hz" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-headspeed-filter"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_rpm_filter}
      />
    </Field>
    <Field id="gov-voltage-filter" label="govVoltageFilterHz" unit="Hz">
      {#snippet tooltip()}
        <Tooltip
          help="govVoltageFilterHzHelp"
          attrs={[
            { name: "genericDefault", value: "5Hz" },
            { name: "genericRange", value: "0Hz - 250Hz" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-voltage-filter"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_pwr_filter}
      />
    </Field>
    <Field id="gov-tta-filter" label="govTTAFilterHz" unit="Hz">
      {#snippet tooltip()}
        <Tooltip
          help="govTTAFilterHzHelp"
          attrs={[
            { name: "genericDefault", value: "0Hz" },
            { name: "genericRange", value: "0Hz - 250Hz" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-tta-filter"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_tta_filter}
      />
    </Field>
    <Field id="gov-ff-filter" label="govFFFilterHz" unit="Hz">
      {#snippet tooltip()}
        <Tooltip
          help="govFFFilterHzHelp"
          attrs={[
            { name: "genericDefault", value: "10Hz" },
            { name: "genericRange", value: "0Hz - 250Hz" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-ff-filter"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_ff_filter}
      />
    </Field>
    {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
      <Field id="gov-d-cutoff" label="govDCutoff" unit="Hz">
        {#snippet tooltip()}
          <Tooltip
            help="govDCutoffHelp"
            attrs={[
              { name: "genericDefault", value: "5Hz" },
              { name: "genericRange", value: "0Hz - 25Hz" },
            ]}
          />
        {/snippet}
        <NumberInput
          id="gov-d-cutoff"
          min="0"
          max="25"
          step="0.1"
          bind:value={
            () => FC.GOVERNOR.gov_d_filter / 10,
            (v) => (FC.GOVERNOR.gov_d_filter = v * 10)
          }
        />
      </Field>
    {/if}
  </SubSection>
</Section>

<style lang="scss">
</style>

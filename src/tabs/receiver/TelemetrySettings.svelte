<script>
  import semver from "semver";
  import { API_VERSION_12_7 } from "@/js/data_storage.js";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  let { FC = $bindable(), telemetry, resetTelemetry } = $props();
</script>

<Section label="receiverTelemetrySettings">
  <SubSection>
    <Field id="telemetry-enable" label="genericEnable">
      <Switch
        id="telemetry-enable"
        bind:checked={FC.FEATURE_CONFIG.features.TELEMETRY}
      />
    </Field>
  </SubSection>
  {#if FC.FEATURE_CONFIG.features.TELEMETRY}
    {#if telemetry.external}
      <SubSection label="receiverTelemetrySettingsSectionSignaling">
        <Field id="telemetry-inverted" label="receiverTelemetryInverted">
          <Switch
            id="telemetry-inverted"
            bind:checked={FC.TELEMETRY_CONFIG.telemetry_inverted}
          />
        </Field>
        <Field id="telemetry-halfduplex" label="receiverTelemetryHalfDuplex">
          <Switch
            id="telemetry-halfduplex"
            bind:checked={FC.TELEMETRY_CONFIG.telemetry_halfduplex}
          />
        </Field>
        {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)}
          <Field id="telemetry-pinswap" label="receiverTelemetryPinSwap">
            <Switch
              id="telemetry-pinswap"
              bind:checked={FC.TELEMETRY_CONFIG.telemetry_pinswap}
            />
          </Field>
        {/if}
      </SubSection>
    {/if}
    {#if !telemetry.external && telemetry.proto === "crsf" && semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)}
      <SubSection label="receiverTelemetrySettingsSectionCRSF">
        <Field id="telmetry-crsf-custom" label="receiverCrsfTelemetryMode">
          {#snippet tooltip()}
            <Tooltip help="receiverHelpCrsfTelemetryMode" />
          {/snippet}
          <Switch
            id="telmetry-crsf-custom"
            bind:checked={
              () => FC.TELEMETRY_CONFIG.crsf_telemetry_mode,
              (v) => {
                const currentProto = telemetry;
                FC.TELEMETRY_CONFIG.crsf_telemetry_mode = v;
                resetTelemetry(currentProto);
              }
            }
          />
        </Field>
        <Field
          id="telemetry-crsf-packet-rate"
          label="receiverCrsfTelemetryRate"
        >
          {#snippet tooltip()}
            <Tooltip help="receiverHelpCrsfTelemetryRate" />
          {/snippet}
          <NumberInput
            id="telemetry-crsf-packet-rate"
            min="0"
            max="1000"
            step="1"
            bind:value={FC.TELEMETRY_CONFIG.crsf_telemetry_rate}
          />
        </Field>
        <Field
          id="telmetry-crsf-packet-ratio"
          label="receiverCrsfTelemetryRatio"
        >
          {#snippet tooltip()}
            <Tooltip help="receiverHelpCrsfTelemetryRatio" />
          {/snippet}
          <NumberInput
            id="telmetry-crsf-packet-ratio"
            min="0"
            max="1000"
            step="1"
            bind:value={FC.TELEMETRY_CONFIG.crsf_telemetry_ratio}
          />
        </Field>
      </SubSection>
    {/if}
  {/if}
</Section>

<style lang="scss">
</style>

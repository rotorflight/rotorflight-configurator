<script>
  import semver from "semver";
  import { slide } from "svelte/transition";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import { API_VERSION_12_8, CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import motorState from "../motors/state.svelte.js";

  const filterStrengths = [
    "gyroRpmFilterPresetCustom",
    "gyroRpmFilterPresetLow",
    "gyroRpmFilterPresetMedium",
    "gyroRpmFilterPresetHigh",
  ];

  let { FC = $bindable(), notches = $bindable() } = $props();

  let enabled = $derived(FC.FEATURE_CONFIG.features.RPM_FILTER);
  let multiAxis = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8));

  let fastRpm = $derived(
    FC.FEATURE_CONFIG.features.FREQ_SENSOR ||
      (motorState.isDshot && FC.MOTOR_CONFIG.use_dshot_telemetry),
  );
</script>

<Section label="gyroRpmFilterSettings" summary="gyroRpmFilterHelp">
  {#if !fastRpm}
    <div class="warning-container">
      <WarningNote message="gyroRpmFilterConfigNote" />
    </div>
  {/if}

  <SubSection>
    <Field id="rpm-filter-enable" label="genericEnable">
      <Switch
        id="rpm-filter-enable"
        bind:checked={FC.FEATURE_CONFIG.features.RPM_FILTER}
      />
    </Field>

    {#if enabled && multiAxis}
      <div transition:slide>
        <SubSection>
          <Field id="rpm-filter-preset" label="gyroRpmFilterPreset">
            {#snippet tooltip()}
              <Tooltip
                help="gyroRpmFilterPresetHelp"
                attrs={[
                  {
                    name: "genericDefault",
                    value: $i18n.t("gyroRpmFilterPresetMedium"),
                  },
                ]}
              />
            {/snippet}
            <select
              id="rpm-filter-preset"
              bind:value={FC.FILTER_CONFIG.rpm_preset}
            >
              {#each filterStrengths as strength, index (strength)}
                <option value={index}>{$i18n.t(strength)}</option>
              {/each}
            </select>
          </Field>
          {#if CONFIGURATOR.expertMode}
            <div transition:slide>
              <Field
                id="rpm-filter-min-freq"
                label="gyroRpmFilterMinFreq"
                unit="Hz"
              >
                {#snippet tooltip()}
                  <Tooltip
                    help="gyroRpmFilterMinFreqHelp"
                    attrs={[{ name: "genericDefault", value: "20Hz" }]}
                  />
                {/snippet}
                <NumberInput
                  id="rpm-filter-min-freq"
                  min="1"
                  max="100"
                  bind:value={FC.FILTER_CONFIG.rpm_min_hz}
                />
              </Field>
            </div>
          {/if}
        </SubSection>
      </div>
    {/if}
  </SubSection>

  {#if enabled && !multiAxis}
    <div transition:slide>
      <SubSection label="gyroRpmFilterMinRPMGroup">
        <Field
          id="rpm-filter-rpm-limit-main"
          label="gyroRpmFilterMainRotorMinRPM"
        >
          {#snippet tooltip()}
            <Tooltip
              help="gyroRpmFilterMinRPMGroupHelp"
              attrs={[{ name: "genericDefault", value: "1000 RPM" }]}
            />
          {/snippet}
          <NumberInput
            id="rpm-filter-rpm-limit-main"
            min="0"
            max="10000"
            bind:value={notches.rpmLimitMain}
          />
        </Field>
        <Field
          id="rpm-filter-rpm-limit-tail"
          label="gyroRpmFilterTailRotorMinRPM"
        >
          {#snippet tooltip()}
            <Tooltip
              help="gyroRpmFilterMinRPMGroupHelp"
              attrs={[{ name: "genericDefault", value: "2000 RPM" }]}
            />
          {/snippet}
          <NumberInput
            id="rpm-filter-rpm-limit-tail"
            min="0"
            max="10000"
            bind:value={notches.rpmLimitTail}
          />
        </Field>
      </SubSection>
    </div>
  {/if}
</Section>

<style lang="scss">
  .warning-container {
    margin-top: 4px;
  }
</style>

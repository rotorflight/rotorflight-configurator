<script>
  import semver from "semver";
  import { slide } from "svelte/transition";

  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import motorState from "../motors/state.svelte.js";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

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
  .header {
    font-size: 1rem;
    font-weight: 600;
    font-weight: 600;
    border-bottom-width: 2px;
    border-style: solid;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-900);
      border-bottom-color: var(--color-neutral-300);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-100);
      border-bottom-color: var(--color-neutral-600);
    }
  }

  .row {
    display: flex;
    align-items: center;
    min-height: 2rem;

    label {
      display: flex;
      flex-grow: 1;
      align-items: center;
      padding: 4px 0;
    }
  }

  .input {
    max-width: 120px;
  }

  .group-heading {
    display: flex;
    font-weight: 600;
    grid-column: 1 / -1;
    margin-top: 8px;
  }

  .warning-container {
    margin-top: 4px;
  }

  @media only screen and (max-width: 480px) {
    .row {
      height: 3rem;
    }

    .row + .row {
      border-top-width: 1px;
      border-top-style: solid;

      :global(html[data-theme="light"]) & {
        border-top-color: var(--color-neutral-400);
      }

      :global(html[data-theme="dark"]) & {
        border-top-color: var(--color-neutral-700);
      }
    }
  }
</style>

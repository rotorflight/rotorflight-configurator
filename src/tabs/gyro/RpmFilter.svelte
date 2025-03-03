<script>
  import semver from "semver";

  import { i18n } from "@/js/i18n.js";

  import Field from "@/components/Field.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
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
</script>

<Section label="gyroRpmFilterSettings" summary="gyroRpmFilterHelp">
  <WarningNote message="gyroRpmFilterConfigNote" />

  <SubSection>
    <Field id="rpm-filter-enable" label="genericEnable">
      <Switch
        id="rpm-filter-enable"
        bind:checked={FC.FEATURE_CONFIG.features.RPM_FILTER}
      />
    </Field>

    {#if FC.FEATURE_CONFIG.features.RPM_FILTER}
      <SubSection>
        {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)}
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
              {#each filterStrengths as strength, index}
                <option value={index}>{$i18n.t(strength)}</option>
              {/each}
            </select>
          </Field>
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
        {:else if notches}
          <div class="group-heading">
            <span>{$i18n.t("gyroRpmFilterMinRPMGroup")}</span>
            <HelpIcon>
              <Tooltip help="gyroRpmFilterMinRPMGroupHelp" />
            </HelpIcon>
          </div>
          <div class="row">
            <label for="rpm-filter-rpm-limit-main">
              <span>{$i18n.t("gyroRpmFilterMainRotorMinRPM")}</span>
            </label>
            <div class="input">
              <NumberInput
                id="rpm-filter-rpm-limit-main"
                min="0"
                max="10000"
                bind:value={notches.rpmLimitMain}
              />
            </div>
          </div>
          <div class="row">
            <label for="rpm-filter-rpm-limit-tail">
              <span>{$i18n.t("gyroRpmFilterTailRotorMinRPM")}</span>
            </label>
            <div class="input">
              <NumberInput
                id="rpm-filter-rpm-limit-tail"
                min="0"
                max="10000"
                bind:value={notches.rpmLimitTail}
              />
            </div>
          </div>
        {/if}
      </SubSection>
    {/if}
  </SubSection>
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

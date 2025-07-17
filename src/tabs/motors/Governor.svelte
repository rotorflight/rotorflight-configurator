<script>
  import semver from "semver";
  import { slide } from "svelte/transition";

  import { FC } from "@/js/fc.svelte.js";
  import { API_VERSION_12_8 } from "@/js/data_storage";

  import Field from "@/components/Field.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  const govModes = ["OFF", "PASSTHROUGH", "STANDARD", "MODE1", "MODE2"];

  const fields = {};
  for (const field of [
    "gov_startup_time",
    "gov_spoolup_time",
    "gov_tracking_time",
    "gov_recovery_time",
    "gov_autorotation_bailout_time",
    "gov_autorotation_timeout",
    "gov_autorotation_min_entry_time",
    "gov_zero_throttle_timeout",
    "gov_lost_headspeed_timeout",
  ]) {
    Object.defineProperty(fields, field, {
      get() {
        return FC.GOVERNOR[field] / 10;
      },
      set(v) {
        FC.GOVERNOR[field] = v * 10;
      },
    });
  }

  let enabled = $derived(
    FC.FEATURE_CONFIG.features.GOVERNOR && FC.GOVERNOR.gov_mode > 0,
  );
</script>

<Section label="govFeatures">
  {#if enabled}
    <InfoNote message="govConfigurationNote" />
  {/if}

  <SubSection>
    <Field id="gov-mode" label="govMode">
      {#snippet tooltip()}
        <Tooltip help="govModeHelp" />
      {/snippet}
      <select
        id="gov-mode"
        bind:value={
          () =>
            FC.FEATURE_CONFIG.features.GOVERNOR ? FC.GOVERNOR.gov_mode : 0,
          (v) => {
            FC.GOVERNOR.gov_mode = v;
            FC.FEATURE_CONFIG.features.GOVERNOR = v > 0;
          }
        }
      >
        {#each govModes as mode, index (mode)}
          <option value={index}>{mode}</option>
        {/each}
      </select>
    </Field>
    {#if enabled}
      <div transition:slide>
        <SubSection>
          <Field
            id="gov-handover-throttle"
            label="govHandoverThrottle"
            unit="%"
          >
            {#snippet tooltip()}
              <Tooltip
                help="govHandoverThrottleHelp"
                attrs={[
                  { name: "genericDefault", value: "20%" },
                  { name: "genericRange", value: "10% - 50%" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-handover-throttle"
              min="10"
              max="50"
              bind:value={FC.GOVERNOR.gov_handover_throttle}
            />
          </Field>
          {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)}
            <Field
              id="gov-spoolup-min-throttle"
              label="govSpoolupMinThrottle"
              unit="%"
            >
              {#snippet tooltip()}
                <Tooltip
                  help="govSpoolupMinThrottleHelp"
                  attrs={[
                    { name: "genericDefault", value: "5%" },
                    { name: "genericRange", value: "0% - 50%" },
                  ]}
                />
              {/snippet}
              <NumberInput
                id="gov-spoolup-min-throttle"
                min="0"
                max="50"
                bind:value={FC.GOVERNOR.gov_spoolup_min_throttle}
              />
            </Field>
          {/if}
          <Field
            id="gov-zero-throttle-timeout"
            label="govZeroThrottleTimeout"
            unit="s"
          >
            {#snippet tooltip()}
              <Tooltip
                help="govZeroThrottleTimeoutHelp"
                attrs={[
                  { name: "genericDefault", value: "3s" },
                  { name: "genericRange", value: "0s - 10s" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-zero-throttle-timeout"
              min="0"
              max="10"
              step="0.1"
              bind:value={fields.gov_zero_throttle_timeout}
            />
          </Field>
          <Field
            id="gov-lost-headspeed-timeout"
            label="govLostHeadspeedTimeout"
            unit="s"
          >
            {#snippet tooltip()}
              <Tooltip
                help="govLostHeadspeedTimeoutHelp"
                attrs={[
                  { name: "genericDefault", value: "1s" },
                  { name: "genericRange", value: "0s - 10s" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-lost-headspeed-timeout"
              min="0"
              max="10"
              step="0.1"
              bind:value={fields.gov_lost_headspeed_timeout}
            />
          </Field>
        </SubSection>
      </div>
    {/if}
  </SubSection>

  {#if enabled}
    <div transition:slide>
      <SubSection label="govSectionRampTime">
        <Field id="gov-startup-time" label="govStartupTime" unit="s">
          {#snippet tooltip()}
            <Tooltip
              help="govStartupTimeHelp"
              attrs={[
                { name: "genericDefault", value: "20s" },
                { name: "genericRange", value: "0s - 60s" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="gov-startup-time"
            min="0"
            max="60"
            step="0.1"
            bind:value={fields.gov_startup_time}
          />
        </Field>
        <Field id="gov-spoolup-time" label="govSpoolupTime" unit="s">
          {#snippet tooltip()}
            <Tooltip
              help="govSpoolupTimeHelp"
              attrs={[
                { name: "genericDefault", value: "10s" },
                { name: "genericRange", value: "0s - 60s" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="gov-spoolup-time"
            min="0"
            max="60"
            step="0.1"
            bind:value={fields.gov_spoolup_time}
          />
        </Field>

        <Field id="gov-tracking-time" label="govTrackingTime" unit="s">
          {#snippet tooltip()}
            <Tooltip
              help="govTrackingTimeHelp"
              attrs={[
                { name: "genericDefault", value: "2s" },
                { name: "genericRange", value: "0s - 10s" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="gov-tracking-time"
            min="0"
            max="10"
            step="0.1"
            bind:value={fields.gov_tracking_time}
          />
        </Field>

        <Field id="gov-recovery-time" label="govRecoveryTime" unit="s">
          {#snippet tooltip()}
            <Tooltip
              help="govRecoveryTimeHelp"
              attrs={[
                { name: "genericDefault", value: "2s" },
                { name: "genericRange", value: "0s - 10s" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="gov-recovery-time"
            min="0"
            max="10"
            step="0.1"
            bind:value={fields.gov_recovery_time}
          />
        </Field>
        <Field id="gov-auto-bailout-time" label="govAutoBailoutTime" unit="s">
          {#snippet tooltip()}
            <Tooltip
              help="govAutoBailoutTimeHelp"
              attrs={[
                { name: "genericDefault", value: "0s" },
                { name: "genericRange", value: "0s - 10s" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="gov-auto-bailout-time"
            min="0"
            max="10"
            step="0.1"
            bind:value={fields.gov_autorotation_bailout_time}
          />
        </Field>
      </SubSection>
    </div>
    <div transition:slide>
      <SubSection label="govSectionAutorotation">
        <Field id="gov-auto-timeout" label="govAutoTimeout" unit="s">
          {#snippet tooltip()}
            <Tooltip
              help="govAutoTimeoutHelp"
              attrs={[
                { name: "genericDefault", value: "0s" },
                { name: "genericRange", value: "0s - 60s" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="gov-auto-timeout"
            type="number"
            min="0"
            max="60"
            step="0.1"
            bind:value={fields.gov_autorotation_timeout}
          />
        </Field>
        <Field
          id="gov-auto-min-entry-time"
          label="govAutoMinEntryTime"
          unit="s"
        >
          {#snippet tooltip()}
            <Tooltip
              help="govAutoMinEntryTimeHelp"
              attrs={[
                { name: "genericDefault", value: "5s" },
                { name: "genericRange", value: "0s - 60s" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="gov-auto-min-entry-time"
            min="0"
            max="60"
            step="0.1"
            bind:value={fields.gov_autorotation_min_entry_time}
          />
        </Field>
      </SubSection>
    </div>
    <div transition:slide>
      <SubSection label="govSectionFilters">
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
      </SubSection>
    </div>
  {/if}
</Section>

<style lang="scss">
</style>

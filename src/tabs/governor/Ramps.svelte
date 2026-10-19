<script>
  import semver from "semver";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";

  let is_12_9 = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9));

  const fields = {};
  for (const field of [
    "gov_startup_time",
    "gov_spoolup_time",
    "gov_tracking_time",
    "gov_recovery_time",
    "gov_autorotation_bailout_time",
    "gov_spooldown_time",
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
</script>

<Section label="govSectionRampTime">
  <SubSection>
    <Field
      expert
      changed={FC.GOVERNOR.gov_startup_time !== 200}
      id="gov-startup-time"
      label="govStartupTime"
      unit="s"
    >
      {#snippet tooltip()}
        <Tooltip
          help={is_12_9 ? "govStartupTimeHelp2" : "govStartupTimeHelp"}
          attrs={[
            { name: "genericDefault", value: "20s" },
            { name: "genericRange", value: "0s - 60s" },
          ]}
        />
      {/snippet}
      <div class="ramp-container">
        {#if is_12_9 && fields.gov_startup_time > 0}
          <div>
            {(100 / fields.gov_startup_time).toFixed(1)} %/s
          </div>
        {/if}
        <NumberInput
          id="gov-startup-time"
          min="0"
          max="60"
          step="0.1"
          bind:value={fields.gov_startup_time}
        />
      </div>
    </Field>
    <Field id="gov-spoolup-time" label="govSpoolupTime" unit="s">
      {#snippet tooltip()}
        <Tooltip
          help={is_12_9 ? "govSpoolupTimeHelp2" : "govSpoolupTimeHelp"}
          attrs={[
            { name: "genericDefault", value: "10s" },
            { name: "genericRange", value: "0s - 60s" },
          ]}
        />
      {/snippet}
      <div class="ramp-container">
        {#if is_12_9 && fields.gov_spoolup_time > 0}
          <div>
            {(100 / fields.gov_spoolup_time).toFixed(1)} %/s
          </div>
        {/if}
        <NumberInput
          id="gov-spoolup-time"
          min="0"
          max="60"
          step="0.1"
          bind:value={fields.gov_spoolup_time}
        />
      </div>
    </Field>
    {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
      <Field id="gov-spooldown-time" label="govSpooldownTime" unit="s">
        {#snippet tooltip()}
          <Tooltip
            help="govSpooldownTimeHelp"
            attrs={[
              { name: "genericDefault", value: "3s" },
              { name: "genericRange", value: "0s - 60s" },
            ]}
          />
        {/snippet}
        <div class="ramp-container">
          {#if is_12_9 && fields.gov_spooldown_time > 0}
            <div>
              {(100 / fields.gov_spooldown_time).toFixed(1)} %/s
            </div>
          {/if}
          <NumberInput
            id="gov-spooldown-time"
            min="0"
            max="60"
            step="0.1"
            bind:value={fields.gov_spooldown_time}
          />
        </div>
      </Field>
    {/if}
    <Field
      expert
      changed={FC.GOVERNOR.gov_tracking_time !== (is_12_9 ? 50 : 20)}
      id="gov-tracking-time"
      label="govTrackingTime"
      unit="s"
    >
      {#snippet tooltip()}
        <Tooltip
          help={is_12_9 ? "govTrackingTimeHelp2" : "govTrackingTimeHelp"}
          attrs={[
            { name: "genericDefault", value: "5s" },
            {
              name: "genericRange",
              value: `0s - ${is_12_9 ? "60" : "10"}s`,
            },
          ]}
        />
      {/snippet}

      <div class="ramp-container">
        {#if is_12_9 && fields.gov_tracking_time > 0}
          <div>
            {(100 / fields.gov_tracking_time).toFixed(1)} %/s
          </div>
        {/if}
        <NumberInput
          id="gov-tracking-time"
          min="0"
          max={is_12_9 ? "60" : "10"}
          step="0.1"
          bind:value={fields.gov_tracking_time}
        />
      </div>
    </Field>

    <Field
      expert
      changed={FC.GOVERNOR.gov_recovery_time !== (is_12_9 ? 30 : 20)}
      id="gov-recovery-time"
      label="govRecoveryTime"
      unit="s"
    >
      {#snippet tooltip()}
        <Tooltip
          help={is_12_9 ? "govRecoveryTimeHelp2" : "govRecoveryTimeHelp"}
          attrs={[
            { name: "genericDefault", value: "2s" },
            {
              name: "genericRange",
              value: `0s - ${is_12_9 ? "60" : "10"}s`,
            },
          ]}
        />
      {/snippet}
      <div class="ramp-container">
        {#if is_12_9 && fields.gov_recovery_time > 0}
          <div>
            {(100 / fields.gov_recovery_time).toFixed(1)} %/s
          </div>
        {/if}
        <NumberInput
          id="gov-recovery-time"
          min="0"
          max={is_12_9 ? "60" : "10"}
          step="0.1"
          bind:value={fields.gov_recovery_time}
        />
      </div>
    </Field>
    {#if !is_12_9}
      <Field
        expert
        changed={FC.GOVERNOR.gov_autorotation_bailout_time !== 0}
        id="gov-auto-bailout-time"
        label="govAutoBailoutTime"
        unit="s"
      >
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
    {/if}
  </SubSection>
</Section>

<style lang="scss">
  .ramp-container {
    display: flex;
    align-items: center;

    gap: 8px;
  }
</style>

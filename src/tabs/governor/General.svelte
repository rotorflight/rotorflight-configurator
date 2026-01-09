<script>
  import semver from "semver";
  import { slide } from "svelte/transition";

  import {
    API_VERSION_12_8,
    API_VERSION_12_9,
  } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";

  import Field from "@/components/Field.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import NormalThrottlePreview from "./NormalThrottlePreview.svelte";
  import SwitchThrottlePreview from "./SwitchThrottlePreview.svelte";
  import FunctionThrottlePreview from "./FunctionThrottlePreview.svelte";

  const GOVERNOR_THROTTLE = {
    NORMAL: 0,
    SWITCH: 1,
    FUNCTION: 2,
  };

  let enabled = $derived(
    FC.FEATURE_CONFIG.features.GOVERNOR && FC.GOVERNOR.gov_mode > 0,
  );

  let is_12_9 = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9));

  let govModes = $derived.by(() => {
    if (is_12_9) {
      return ["OFF", "LIMIT", "DIRECT", "ELECTRIC", "NITRO"];
    }

    return ["OFF", "PASSTHROUGH", "STANDARD", "MODE1", "MODE2"];
  });

  const fields = {};
  for (const field of [
    "gov_autorotation_timeout",
    "gov_autorotation_min_entry_time",
    "gov_zero_throttle_timeout",
    "gov_lost_headspeed_timeout",
    "gov_throttle_hold_timeout",
    "gov_idle_throttle",
    "gov_auto_throttle",
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

<Section label="govSectionGeneral">
  <SubSection>
    <InfoNote message="govConfigurationNote" />
  </SubSection>
  <SubSection>
    <Field id="gov-mode" label="govMode">
      {#snippet tooltip()}
        <Tooltip help={is_12_9 ? "govModeHelp2" : "govModeHelp"} />
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

    {#if semver.eq(FC.CONFIG.apiVersion, API_VERSION_12_8)}
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
    {#if !is_12_9}
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
    {:else}
      <Field id="gov-autorotation-timeout" label="govAutoTimeout" unit="s">
        {#snippet tooltip()}
          <Tooltip
            help="govAutoTimeoutHelp"
            attrs={[
              { name: "genericDefault", value: "15s" },
              { name: "genericRange", value: "0s - 250s" },
            ]}
          />
        {/snippet}
        <NumberInput
          id="gov-autorotation-timeout"
          min="0"
          max="250"
          bind:value={fields.gov_autorotation_timeout}
        />
      </Field>
      <Field
        id="gov-throttle-hold-timeout"
        label="govThrottleHoldTimeout"
        unit="s"
      >
        {#snippet tooltip()}
          <Tooltip
            help="govThrottleHoldTimeoutHelp"
            attrs={[
              { name: "genericDefault", value: "5s" },
              { name: "genericRange", value: "0s - 25s" },
            ]}
          />
        {/snippet}
        <NumberInput
          id="gov-throttle-hold-timeout"
          min="0"
          max="25"
          step="0.1"
          bind:value={fields.gov_throttle_hold_timeout}
        />
      </Field>
    {/if}

    {#if enabled && !is_12_9}
      <div transition:slide>
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
      </div>
    {/if}
  </SubSection>

  {#if enabled}
    <div transition:slide>
      <SubSection label="govSectionThrottle">
        {#if is_12_9}
          <Field id="gov-throttle-type" label="govThrottleType">
            {#snippet tooltip()}
              <Tooltip help="govThrottleTypeHelp" />
            {/snippet}
            <select
              id="gov-throttle-type"
              bind:value={FC.GOVERNOR.gov_throttle_type}
            >
              {#each Object.entries(GOVERNOR_THROTTLE) as [mode, index] (mode)}
                <option value={index}>{mode}</option>
              {/each}
            </select>
          </Field>

          <Field id="gov-idle-throttle" label="govIdleThrottle" unit="%">
            {#snippet tooltip()}
              <Tooltip
                help="govIdleThrottleHelp"
                attrs={[
                  { name: "genericDefault", value: "0%" },
                  { name: "genericRange", value: "0% - 25%" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-idle-throttle"
              min="0"
              max="25"
              step="0.1"
              bind:value={fields.gov_idle_throttle}
            />
          </Field>
          <Field id="gov-auto-throttle" label="govAutoThrottle" unit="%">
            {#snippet tooltip()}
              <Tooltip
                help="govAutoThrottleHelp"
                attrs={[
                  { name: "genericDefault", value: "0%" },
                  { name: "genericRange", value: "0% - 25%" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-auto-throttle"
              min="0"
              max="25"
              step="0.1"
              bind:value={fields.gov_auto_throttle}
            />
          </Field>
        {/if}
        <Field id="gov-handover-throttle" label="govHandoverThrottle" unit="%">
          {#snippet tooltip()}
            {#if is_12_9}
              <Tooltip
                help="govHandoverThrottleHelp"
                attrs={[
                  { name: "genericDefault", value: "20%" },
                  { name: "genericRange", value: "0% - 100%" },
                ]}
              />
            {:else}
              <Tooltip
                help="govHandoverThrottleHelp"
                attrs={[
                  { name: "genericDefault", value: "20%" },
                  { name: "genericRange", value: "10% - 50%" },
                ]}
              />
            {/if}
          {/snippet}
          {#if is_12_9}
            <NumberInput
              id="gov-handover-throttle"
              min="0"
              max="100"
              bind:value={FC.GOVERNOR.gov_handover_throttle}
            />
          {:else}
            <NumberInput
              id="gov-handover-throttle"
              min="10"
              max="50"
              bind:value={FC.GOVERNOR.gov_handover_throttle}
            />
          {/if}
        </Field>
        {#if FC.GOVERNOR.gov_throttle_type === 0}
          <NormalThrottlePreview />
        {:else if FC.GOVERNOR.gov_throttle_type === 1}
          <SwitchThrottlePreview />
        {:else if FC.GOVERNOR.gov_throttle_type === 2}
          <FunctionThrottlePreview />
        {/if}
      </SubSection>
    </div>
  {/if}
</Section>

<style lang="scss">
</style>

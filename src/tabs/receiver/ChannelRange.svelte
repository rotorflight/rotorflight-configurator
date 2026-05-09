<script>
  import semver from "semver";
  import { slide } from "svelte/transition";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";

  let gte_12_9 = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9));

  let initial_rc_min_throttle = FC.RC_CONFIG.rc_min_throttle;
  let initial_rc_max_throttle = FC.RC_CONFIG.rc_max_throttle;

  let autoThrottleRange = $derived(
    FC.RC_CONFIG.rc_min_throttle === 0 && FC.RC_CONFIG.rc_max_throttle === 0,
  );
</script>

{#snippet throttle_gte_12_9()}
  <SubSection label="receiverSettingsThrottleChannel">
    <Field
      id="auto-throttle-range"
      label="receiver.channel_range.automatic_throttle_range.label"
    >
      {#snippet tooltip()}
        <Tooltip help="receiver.channel_range.automatic_throttle_range.help" />
      {/snippet}
      <Switch
        id="auto-throttle-range"
        checked={autoThrottleRange}
        onchange={(e) => {
          if (e.target.checked) {
            initial_rc_min_throttle = FC.RC_CONFIG.rc_min_throttle;
            initial_rc_max_throttle = FC.RC_CONFIG.rc_max_throttle;

            FC.RC_CONFIG.rc_min_throttle = 0;
            FC.RC_CONFIG.rc_max_throttle = 0;
          } else {
            FC.RC_CONFIG.rc_min_throttle = initial_rc_min_throttle || 1100;
            FC.RC_CONFIG.rc_max_throttle = initial_rc_max_throttle || 1900;
          }
        }}
      />
    </Field>
    {#if !autoThrottleRange}
      <div transition:slide>
        <Field
          id="receiver-zero-throttle"
          label="receiverZeroThrottle"
          unit="μs"
        >
          {#snippet tooltip()}
            <Tooltip
              help="receiverHelpZeroThrottle2"
              attrs={[
                { name: "genericDefault", value: "1100μs" },
                { name: "genericRange", value: "885μs - 2115μs" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="receiver-zero-throttle"
            min="885"
            max="2115"
            bind:value={FC.RC_CONFIG.rc_min_throttle}
          />
        </Field>
        <Field
          id="receiver-full-throttle"
          label="receiverFullThrottle"
          unit="μs"
        >
          {#snippet tooltip()}
            <Tooltip
              help="receiverHelpFullThrottle2"
              attrs={[
                { name: "genericDefault", value: "1900μs" },
                { name: "genericRange", value: "885μs - 2115μs" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="receiver-full-throttle"
            min="885"
            max="2115"
            bind:value={FC.RC_CONFIG.rc_max_throttle}
          />
        </Field>
      </div>
    {/if}
  </SubSection>
{/snippet}

{#snippet throttle()}
  <SubSection label="receiverSettingsThrottleChannel">
    <Field id="receiver-arm-throttle" label="receiverArmingThrottle" unit="μs">
      {#snippet tooltip()}
        <Tooltip
          help="receiverHelpArmingThrottle"
          attrs={[
            { name: "genericDefault", value: "1050μs" },
            { name: "genericRange", value: "850μs - 1500μs" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="receiver-arm-throttle"
        min="850"
        max="1500"
        bind:value={FC.RC_CONFIG.rc_arm_throttle}
      />
    </Field>
    <Field id="receiver-zero-throttle" label="receiverZeroThrottle" unit="μs">
      {#snippet tooltip()}
        <Tooltip
          help="receiverHelpZeroThrottle"
          attrs={[
            { name: "genericDefault", value: "1100μs" },
            { name: "genericRange", value: "850μs - 1500μs" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="receiver-zero-throttle"
        min="850"
        max="1500"
        bind:value={FC.RC_CONFIG.rc_min_throttle}
      />
    </Field>
    <Field id="receiver-full-throttle" label="receiverFullThrottle" unit="μs">
      {#snippet tooltip()}
        <Tooltip
          help="receiverHelpFullThrottle"
          attrs={[
            { name: "genericDefault", value: "1900μs" },
            { name: "genericRange", value: "1500μs - 2150μs" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="receiver-full-throttle"
        min="1500"
        max="2150"
        bind:value={FC.RC_CONFIG.rc_max_throttle}
      />
    </Field>
  </SubSection>
{/snippet}

<Section label="receiverSettings">
  <SubSection>
    <Field id="receiver-stick-center" label="receiverStickCenter" unit="μs">
      {#snippet tooltip()}
        <Tooltip
          help="receiverHelpStickCenter"
          attrs={[
            { name: "genericDefault", value: "1500μs" },
            { name: "genericRange", value: "1400μs - 1600μs" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="receiver-stick-center"
        min="1400"
        max="1600"
        bind:value={FC.RC_CONFIG.rc_center}
      />
    </Field>
    <Field
      id="receiver-stick-deflection"
      label="receiverStickDeflection"
      unit="μs"
    >
      {#snippet tooltip()}
        <Tooltip
          help="receiverHelpStickDeflection"
          attrs={[
            { name: "genericDefault", value: "510μs" },
            { name: "genericRange", value: "200μs - 700μs" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="receiver-stick-deflection"
        min="200"
        max="700"
        bind:value={FC.RC_CONFIG.rc_deflection}
      />
    </Field>
    <Field
      id="receiver-cyclic-deadband"
      label="receiverCyclicDeadband"
      unit="μs"
    >
      {#snippet tooltip()}
        {#if gte_12_9}
          <Tooltip
            help="receiverHelpCyclicDeadband"
            attrs={[
              { name: "genericDefault", value: "5μs" },
              { name: "genericRange", value: "0μs - 100μs" },
            ]}
          />
        {:else}
          <Tooltip
            help="receiverHelpCyclicDeadband"
            attrs={[
              { name: "genericDefault", value: "2μs" },
              { name: "genericRange", value: "0μs - 32μs" },
            ]}
          />
        {/if}
      {/snippet}
      {#if gte_12_9}
        <NumberInput
          id="receiver-cyclic-deadband"
          min="0"
          max="100"
          bind:value={FC.RC_CONFIG.rc_deadband}
        />
      {:else}
        <NumberInput
          id="receiver-cyclic-deadband"
          min="0"
          max="32"
          bind:value={FC.RC_CONFIG.rc_deadband}
        />
      {/if}
    </Field>
    <Field id="receiver-yaw-deadband" label="receiverYawDeadband" unit="μs">
      {#snippet tooltip()}
        {#if gte_12_9}
          <Tooltip
            help="receiverHelpYawDeadband"
            attrs={[
              { name: "genericDefault", value: "5μs" },
              { name: "genericRange", value: "0μs - 100μs" },
            ]}
          />
        {:else}
          <Tooltip
            help="receiverHelpYawDeadband"
            attrs={[
              { name: "genericDefault", value: "2μs" },
              { name: "genericRange", value: "0μs - 100μs" },
            ]}
          />
        {/if}
      {/snippet}
      <NumberInput
        id="receiver-yaw-deadband"
        min="0"
        max="100"
        bind:value={FC.RC_CONFIG.rc_yaw_deadband}
      />
    </Field>
  </SubSection>
  {#if gte_12_9}
    {@render throttle_gte_12_9()}
  {:else}
    {@render throttle()}
  {/if}
</Section>

<style lang="scss">
</style>

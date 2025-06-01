<script>
  import semver from "semver";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
</script>

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
        {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
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
      {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
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
        {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
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
            { name: "genericRange", value: "850μs - 1500μs " },
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
</Section>

<style lang="scss">
</style>

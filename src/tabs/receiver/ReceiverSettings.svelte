<script>
  import semver from "semver";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";

  let { FC = $bindable() } = $props();
</script>

<Section label="receiverSettings">
  <SubSection>
    <Field id="receiver-stick-center" label="receiverStickCenter">
      {#snippet tooltip()}
        <Tooltip help="receiverHelpStickCenter" />
      {/snippet}
      <NumberInput
        id="receiver-stick-center"
        min="1400"
        max="1600"
        bind:value={FC.RC_CONFIG.rc_center}
      />
    </Field>
    <Field id="receiver-stick-deflection" label="receiverStickDeflection">
      {#snippet tooltip()}
        <Tooltip help="receiverHelpStickDeflection" />
      {/snippet}
      <NumberInput
        id="receiver-stick-deflection"
        min="200"
        max="700"
        bind:value={FC.RC_CONFIG.rc_deflection}
      />
    </Field>
    <Field id="receiver-arm-throttle" label="receiverArmingThrottle">
      {#snippet tooltip()}
        <Tooltip help="receiverHelpArmingThrottle" />
      {/snippet}
      <NumberInput
        id="receiver-arm-throttle"
        min="850"
        max="1500"
        bind:value={FC.RC_CONFIG.rc_arm_throttle}
      />
    </Field>
    <Field id="receiver-zero-throttle" label="receiverZeroThrottle">
      {#snippet tooltip()}
        <Tooltip help="receiverHelpZeroThrottle" />
      {/snippet}
      <NumberInput
        id="receiver-zero-throttle"
        min="850"
        max="1500"
        bind:value={FC.RC_CONFIG.rc_min_throttle}
      />
    </Field>
    <Field id="receiver-full-throttle" label="receiverFullThrottle">
      {#snippet tooltip()}
        <Tooltip help="receiverHelpFullThrottle" />
      {/snippet}
      <NumberInput
        id="receiver-full-throttle"
        min="1500"
        max="2150"
        bind:value={FC.RC_CONFIG.rc_max_throttle}
      />
    </Field>
    <Field id="receiver-cyclic-deadband" label="receiverCyclicDeadband">
      {#snippet tooltip()}
        <Tooltip help="receiverHelpCyclicDeadband" />
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
    <Field id="receiver-yaw-deadband" label="receiverYawDeadband">
      {#snippet tooltip()}
        <Tooltip help="receiverHelpYawDeadband" />
      {/snippet}
      <NumberInput
        id="receiver-yaw-deadband"
        min="0"
        max="100"
        bind:value={FC.RC_CONFIG.rc_yaw_deadband}
      />
    </Field>
  </SubSection>
</Section>

<style lang="scss">
</style>

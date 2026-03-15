<script>
  import { slide } from "svelte/transition";

  import { FC } from "@/js/fc.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { MSP } from "@/js/msp.svelte.js";

  import Field from "@/components/Field.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import motorState from "./state.svelte.js";

  let protocol = $derived(FC.MOTOR_CONFIG.motor_pwm_protocol);
  let isEnabled = $derived(
    motorState.throttleEnabled && FC.CONFIG.motorCount > 0,
  );

  let realtimeThrottleEndpoint = $state(false);

  function save(code) {
    return MSP.promise(code, mspHelper.crunch(code));
  }

  async function updateThrottleEndpoints() {
    if (!realtimeThrottleEndpoint) {
      return;
    }

    await save(MSPCodes.MSP_SET_MOTOR_CONFIG);
  }
</script>

<Section label="motorsSectionLabelThrottle">
  <SubSection>
    <Field id="esc-protocol" label="motorsEscProtocol">
      {#snippet tooltip()}
        <Tooltip help="motorsEscProtocolHelp" />
      {/snippet}
      <select id="esc-protocol" bind:value={FC.MOTOR_CONFIG.motor_pwm_protocol}>
        {#each motorState.throttleProtocols as proto, index (proto)}
          <option value={index}>{proto}</option>
        {/each}
      </select>
    </Field>
    {#if isEnabled && !motorState.isDshot}
      <div transition:slide>
        <Field id="pwm-freq" label="motorsUnsyncedPWMFreq" unit="Hz">
          {#snippet tooltip()}
            <Tooltip
              help="motorsUnsyncedPWMFreqHelp"
              attrs={[
                { name: "genericDefault", value: "250Hz" },
                { name: "genericRange", value: "50Hz - 8000Hz" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="pwm-freq"
            min="50"
            max="8000"
            bind:value={FC.MOTOR_CONFIG.motor_pwm_rate}
          />
        </Field>
      </div>
    {/if}

    {#if isEnabled && !motorState.isDshot && protocol !== 0 && !motorState.isCastleLink}
      <div transition:slide>
        <Field id="throttle-unsynced-pwm" label="motorsUnsyncedPwm">
          {#snippet tooltip()}
            <Tooltip help="motorsUnsyncedPwmHelp" />
          {/snippet}
          <Switch
            id="throttle-unsynced-pwm"
            bind:checked={FC.MOTOR_CONFIG.use_unsynced_pwm}
          />
        </Field>
      </div>
    {/if}
  </SubSection>

  {#if isEnabled && !motorState.isDshot}
    <div transition:slide>
      <SubSection label="motorsThrottleEndpoints">
        <div class="warning-container">
          <WarningNote message="motorsThrottleEndpointsWarning" />
        </div>
        <Field
          id="throttle-endpoint-realtime"
          label="motorsThrottleEndpointRealtime"
        >
          {#snippet tooltip()}
            <Tooltip help="motorsThrottleEndpointRealtimeHelp" />
          {/snippet}
          <Switch
            id="throttle-endpoint-realtime"
            bind:checked={realtimeThrottleEndpoint}
          />
        </Field>
        <Field
          id="throttle-off-pwm"
          label="motorsThrottleMinimumCommand"
          unit="μs"
        >
          {#snippet tooltip()}
            <Tooltip
              help="motorsThrottleMinimumCommandHelp"
              attrs={[
                { name: "genericDefault", value: "1000μs" },
                { name: "genericRange", value: "50μs - 2250μs" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="throttle-off-pwm"
            min="50"
            max="2250"
            bind:value={FC.MOTOR_CONFIG.mincommand}
            onchange={updateThrottleEndpoints}
          />
        </Field>

        <Field id="throttle-min-pwm" label="motorsThrottleMinimum" unit="μs">
          {#snippet tooltip()}
            <Tooltip
              help="motorsThrottleMinimumHelp"
              attrs={[
                { name: "genericDefault", value: "1070μs" },
                { name: "genericRange", value: "50μs - 2250μs" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="throttle-min-pwm"
            min="50"
            max="2250"
            bind:value={FC.MOTOR_CONFIG.minthrottle}
            onchange={updateThrottleEndpoints}
          />
        </Field>

        <Field id="throttle-max-pwm" label="motorsThrottleMaximum" unit="μs">
          {#snippet tooltip()}
            <Tooltip
              help="motorsThrottleMaximumHelp"
              attrs={[
                { name: "genericDefault", value: "2000μs" },
                { name: "genericRange", value: "50μs - 2250μs" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="throttle-max-pwm"
            min="50"
            max="2250"
            bind:value={FC.MOTOR_CONFIG.maxthrottle}
            onchange={updateThrottleEndpoints}
          />
        </Field>
      </SubSection>
    </div>
  {/if}
</Section>

<style lang="scss">
  .warning-container {
    margin-top: 8px;
  }
</style>

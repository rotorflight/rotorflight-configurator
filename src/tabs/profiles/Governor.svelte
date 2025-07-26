<script>
  import diff from "microdiff";
  import semver from "semver";
  import { onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  const flags = [
    "3POS_THROTTLE",
    "TX_THROTTLE_CURVE",
    "FALLBACK_PRECOMP",
    "VOLTAGE_COMP",
    "PID_SPOOLUP",
    "HS_ADJUSTMENT",
    "DYN_MIN_THROTTLE",
    "AUTOROTATION",
    "SUSPEND",
    "BYPASS",
  ];

  let { onchange } = $props();
  let initialState;

  function snapshotState() {
    return $state.snapshot({
      GOVERNOR: FC.GOVERNOR,
    });
  }

  onMount(() => {
    initialState = snapshotState();
  });

  $effect(() => {
    const changes = diff(initialState, snapshotState());
    if (changes.length > 0) {
      onchange?.();
    }
  });
</script>

<Section label="govProfile">
  <SubSection>
    <Field id="gov-headspeed" label="govHeadspeed" unit="rpm">
      {#snippet tooltip()}
        <Tooltip
          help="govHeadspeedHelp"
          attrs={[{ name: "genericRange", value: "100rpm - 50,000rpm" }]}
        />
      {/snippet}
      <NumberInput
        id="gov-headspeed"
        min="100"
        max="50000"
        step="10"
        bind:value={FC.GOVERNOR.gov_headspeed}
      />
    </Field>
    <Field id="gov-max-throttle" label="govMaxThrottle" unit="%">
      {#snippet tooltip()}
        <Tooltip
          help="govMaxThrottleHelp"
          attrs={[
            { name: "genericDefault", value: "100%" },
            { name: "genericRange", value: "0% - 100%" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-max-throttle"
        min="0"
        max="100"
        bind:value={FC.GOVERNOR.gov_max_throttle}
      />
    </Field>
    {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)}
      <Field id="gov-min-throttle" label="govMinThrottle" unit="%">
        {#snippet tooltip()}
          <Tooltip
            help="govMinThrottleHelp"
            attrs={[
              { name: "genericDefault", value: "10%" },
              { name: "genericRange", value: "0% - 100%" },
            ]}
          />
        {/snippet}
        <NumberInput
          id="gov-min-throttle"
          min="0"
          max="100"
          bind:value={FC.GOVERNOR.gov_min_throttle}
        />
      </Field>
    {/if}
    {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
      <Field id="gov-idle-throttle" label="govIdleThrottle" unit="%">
        {#snippet tooltip()}
          <Tooltip
            help="govIdleThrottleHelp"
            attrs={[
              { name: "genericDefault", value: "0%" },
              { name: "genericRange", value: "0% - 100%" },
            ]}
          />
        {/snippet}
        <NumberInput
          id="gov-idle-throttle"
          min="0"
          max="100"
          bind:value={FC.GOVERNOR.gov_idle_throttle}
        />
      </Field>
      <Field id="gov-auto-throttle" label="govAutoThrottle" unit="%">
        {#snippet tooltip()}
          <Tooltip
            help="govAutoThrottleHelp"
            attrs={[
              { name: "genericDefault", value: "0%" },
              { name: "genericRange", value: "0% - 100%" },
            ]}
          />
        {/snippet}
        <NumberInput
          id="gov-auto-throttle"
          min="0"
          max="100"
          bind:value={FC.GOVERNOR.gov_auto_throttle}
        />
      </Field>
      <Field id="gov-fallback-drop" label="govFallbackDrop" unit="%">
        {#snippet tooltip()}
          <Tooltip
            help="govFallbackDropHelp"
            attrs={[
              { name: "genericDefault", value: "10%" },
              { name: "genericRange", value: "0% - 50%" },
            ]}
          />
        {/snippet}
        <NumberInput
          id="gov-fallback-drop"
          min="0"
          max="50"
          bind:value={FC.GOVERNOR.gov_fallback_drop}
        />
      </Field>
    {/if}
  </SubSection>
  <SubSection label="PIDS">
    <Field id="gov-master-gain" label="govMasterGain">
      {#snippet tooltip()}
        <Tooltip
          help="govMasterGainHelp"
          attrs={[
            { name: "genericDefault", value: "40" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-master-gain"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_gain}
      />
    </Field>
    <Field id="gov-p-gain" label="govPGain">
      {#snippet tooltip()}
        <Tooltip
          help="govPGainHelp"
          attrs={[
            { name: "genericDefault", value: "40" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-p-gain"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_p_gain}
      />
    </Field>
    <Field id="gov-i-gain" label="govIGain">
      {#snippet tooltip()}
        <Tooltip
          help="govIGainHelp"
          attrs={[
            { name: "genericDefault", value: "50" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-i-gain"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_i_gain}
      />
    </Field>
    <Field id="gov-d-gain" label="govDGain">
      {#snippet tooltip()}
        <Tooltip
          help="govDGainHelp"
          attrs={[
            { name: "genericDefault", value: "0" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-d-gain"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_d_gain}
      />
    </Field>
    <Field id="gov-f-gain" label="govFGain">
      {#snippet tooltip()}
        <Tooltip
          help="govFGainHelp"
          attrs={[
            { name: "genericDefault", value: "10" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-f-gain"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_f_gain}
      />
    </Field>
  </SubSection>
  <SubSection label="Precompensation">
    <Field id="gov-yaw-precomp" label="govYawPrecomp">
      {#snippet tooltip()}
        <Tooltip
          help="govYawPrecompHelp"
          attrs={[
            { name: "genericDefault", value: "10" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-yaw-precomp"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_yaw_ff_weight}
      />
    </Field>
    <Field id="gov-cyclic-precomp" label="govCyclicPrecomp">
      {#snippet tooltip()}
        <Tooltip
          help="govCyclicPrecompHelp"
          attrs={[
            { name: "genericDefault", value: "10" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-cyclic-precomp"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_cyclic_ff_weight}
      />
    </Field>
    <Field id="gov-collective-precomp" label="govCollectivePrecomp">
      {#snippet tooltip()}
        <Tooltip
          help="govCollectivePrecompHelp"
          attrs={[
            { name: "genericDefault", value: "50" },
            { name: "genericRange", value: "0 - 250" },
          ]}
        />
      {/snippet}
      <NumberInput
        id="gov-collective-precomp"
        min="0"
        max="250"
        bind:value={FC.GOVERNOR.gov_collective_ff_weight}
      />
    </Field>
  </SubSection>
  {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
    <SubSection label="flags">
      {#each flags as flag, i (flag)}
        <Field id={`gov-flag-${flag}`} label={`govFlag_${flag}`}>
          {#snippet tooltip()}
            <Tooltip help={`govFlagHelp_${flag}`} />
          {/snippet}
          <Switch
            id={`gov-flag-${flag}`}
            bind:checked={
              () => bit_check(FC.GOVERNOR.gov_flags, i),
              (v) => {
                FC.GOVERNOR.gov_flags = (v ? bit_set : bit_clear)(
                  FC.GOVERNOR.gov_flags,
                  i,
                );
              }
            }
          />
        </Field>
      {/each}
    </SubSection>
  {/if}
</Section>

<style lang="scss">
</style>

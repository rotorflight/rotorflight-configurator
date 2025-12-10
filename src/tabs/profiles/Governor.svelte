<script>
  import diff from "microdiff";
  import semver from "semver";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";

  import { FC } from "@/js/fc.svelte.js";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  let govActive = $derived(FC.GOVERNOR.gov_mode > 1);

  const flagMap = {
    FALLBACK_PRECOMP: 2,
    VOLTAGE_COMP: 3,
    PID_SPOOLUP: 4,
    DYN_MIN_THROTTLE: 6,
  };

  const flags = {};
  for (const [name, index] of flagMap.entries()) {
    Object.defineProperty(flags, name, {
      get() {
        return bit_check(FC.GOVERNOR.gov_flags, index);
      },
      set(v) {
        FC.GOVERNOR.gov_flags = (v ? bit_set : bit_clear)(
          FC.GOVERNOR.gov_flags,
          index,
        );
      },
    });
  }

  /* Holds current flag state when enabling bypass, so it can be restored when
   * bypass is disabled */
  let preBypassFlags = 0;

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
    {#if govActive}
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
    {/if}
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
    {#if govActive && semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)}
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
    {#if govActive && semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
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
  {#if govActive}
    <SubSection label="profileGovPIDSection">
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
          disabled={flags.TX_PRECOMP_CURVE}
        />
      </Field>
    </SubSection>
    <SubSection label="profileGovPrecompSection">
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
          disabled={flags.TX_PRECOMP_CURVE}
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
          disabled={flags.TX_PRECOMP_CURVE}
        />
      </Field>
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
          disabled={flags.TX_PRECOMP_CURVE}
        />
      </Field>
    </SubSection>
  {/if}
  {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)}
    <SubSection label="profileGovFlagsSection">
      {#if FC.GOVERNOR.gov_throttle_type !== 0}
        <div></div>
      {:else if govActive}
        <Field id="gov-flag-HS_ADJUSTMENT" label="govFlag_HS_ADJUSTMENT">
          {#snippet tooltip()}
            <Tooltip help="govFlagHelp_HS_ADJUSTMENT" />
          {/snippet}
          <Switch
            id="gov-flag-HS_ADJUSTMENT"
            bind:checked={flags.HS_ADJUSTMENT}
            disabled={flags.BYPASS || flags.TX_PRECOMP_CURVE}
          />
        </Field>
      {/if}
      {#if govActive}
        <Field id="gov-flag-FALLBACK_PRECOMP" label="govFlag_FALLBACK_PRECOMP">
          {#snippet tooltip()}
            <Tooltip help="govFlagHelp_FALLBACK_PRECOMP" />
          {/snippet}
          <Switch
            id="gov-flag-FALLBACK_PRECOMP"
            bind:checked={flags.FALLBACK_PRECOMP}
            disabled={flags.BYPASS || flags.TX_PRECOMP_CURVE}
          />
        </Field>
        <Field id="gov-flag-PID_SPOOLUP" label="govFlag_PID_SPOOLUP">
          {#snippet tooltip()}
            <Tooltip help="govFlagHelp_PID_SPOOLUP" />
          {/snippet}
          <Switch
            id="gov-flag-PID_SPOOLUP"
            bind:checked={flags.PID_SPOOLUP}
            disabled={flags.BYPASS || flags.TX_PRECOMP_CURVE}
          />
        </Field>
      {/if}
      {#if FC.GOVERNOR.gov_mode === 2}
        <Field id="gov-flag-VOLTAGE_COMP" label="govFlag_VOLTAGE_COMP">
          {#snippet tooltip()}
            <Tooltip help="govFlagHelp_VOLTAGE_COMP" />
          {/snippet}
          <Switch
            id="gov-flag-VOLTAGE_COMP"
            bind:checked={flags.VOLTAGE_COMP}
            disabled={flags.BYPASS ||
              FC.BATTERY_CONFIG.voltageMeterSource !== 1}
          />
        </Field>
        <Field id="gov-flag-DYN_MIN_THROTTLE" label="govFlag_DYN_MIN_THROTTLE">
          {#snippet tooltip()}
            <Tooltip help="govFlagHelp_DYN_MIN_THROTTLE" />
          {/snippet}
          <Switch
            id="gov-flag-DYN_MIN_THROTTLE"
            bind:checked={flags.DYN_MIN_THROTTLE}
            disabled={flags.BYPASS}
          />
        </Field>
      {/if}
      <Field id="gov-flag-AUTOROTATION" label="govFlag_AUTOROTATION">
        {#snippet tooltip()}
          <Tooltip help="govFlagHelp_AUTOROTATION" />
        {/snippet}
        <Switch
          id="gov-flag-AUTOROTATION"
          bind:checked={flags.AUTOROTATION}
          disabled={flags.BYPASS}
        />
      </Field>
      {#if govActive}
        <div transition:slide>
          <Field id="gov-flag-SUSPEND" label="govFlag_SUSPEND">
            {#snippet tooltip()}
              <Tooltip help="govFlagHelp_SUSPEND" />
            {/snippet}
            <Switch id="gov-flag-SUSPEND" bind:checked={flags.SUSPEND} />
          </Field>
        </div>
      {/if}
      <Field id="gov-flag-BYPASS" label="govFlag_BYPASS">
        {#snippet tooltip()}
          <Tooltip help="govFlagHelp_BYPASS" />
        {/snippet}
        <Switch
          id="gov-flag-BYPASS"
          bind:checked={
            () => flags.BYPASS,
            (v) => {
              if (v) {
                preBypassFlags = FC.GOVERNOR.gov_flags;

                flags.FALLBACK_PRECOMP = false;
                flags.VOLTAGE_COMP = false;
                flags.PID_SPOOLUP = false;
                flags.HS_ADJUSTMENT = false;
                flags.DYN_MIN_THROTTLE = false;
                flags.AUTOROTATION = false;
              } else {
                FC.GOVERNOR.gov_flags = preBypassFlags;
              }

              flags.BYPASS = v;
            }
          }
        />
      </Field>
    </SubSection>
  {/if}
</Section>

<style lang="scss">
</style>

<script>
  import semver from "semver";
  import { slide } from "svelte/transition";

  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import {
    API_VERSION_12_8,
    API_VERSION_12_9,
  } from "@/js/configurator.svelte.js";

  import Field from "@/components/Field.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  let is_12_9 = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9));

  let govModes = $derived.by(() => {
    if (is_12_9) {
      return ["OFF", "EXTERNAL", "ELECTRIC", "NITRO"];
    }

    return ["OFF", "PASSTHROUGH", "STANDARD", "MODE1", "MODE2"];
  });

  const throttleTypes = ["NORMAL", "OFF_ON", "OFF_IDLE_ON", "OFF_IDLE_AUTO_ON"];

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
    "gov_throttle_hold_timeout",
    "gov_d_filter",
    "gov_spooldown_time",
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

  let enabled = $derived(
    FC.FEATURE_CONFIG.features.GOVERNOR && FC.GOVERNOR.gov_mode > 0,
  );
</script>

<Section label="govFeatures">
  {#if enabled}
    <div transition:slide>
      <InfoNote message="govConfigurationNote" />
    </div>
  {/if}

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
    {#if enabled}
      <div transition:slide>
        <SubSection>
          {#if is_12_9}
            <Field id="gov-throttle-type" label="govThrottleType">
              {#snippet tooltip()}
                <Tooltip help="govThrottleTypeHelp" />
              {/snippet}
              <select
                id="gov-throttle-type"
                bind:value={FC.GOVERNOR.gov_throttle_type}
              >
                {#each throttleTypes as mode, index (mode)}
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
          <Field
            id="gov-handover-throttle"
            label="govHandoverThrottle"
            unit="%"
          >
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
        </SubSection>
      </div>
    {/if}
  </SubSection>

  {#if is_12_9}
    {#if enabled}
      <div transition:slide>
        <SubSection label="govSectionThrottleCurve">
          <Field id="gov-idle-collective" label="govIdleCollective" unit="%">
            {#snippet tooltip()}
              <Tooltip
                help="govIdleCollectiveHelp"
                attrs={[
                  { name: "genericDefault", value: "-95%" },
                  { name: "genericRange", value: "-100% - 100%" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-idle-collective"
              min="-100"
              max="100"
              bind:value={FC.GOVERNOR.gov_idle_collective}
            />
          </Field>
          <Field id="gov-wot-collective" label="govWotCollective" unit="%">
            {#snippet tooltip()}
              <Tooltip
                help="govWotCollectiveHelp"
                attrs={[
                  { name: "genericDefault", value: "-10%" },
                  { name: "genericRange", value: "-100% - 100%" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-wot-collective"
              min="-100"
              max="100"
              bind:value={FC.GOVERNOR.gov_wot_collective}
            />
          </Field>
        </SubSection>
      </div>
    {/if}
  {/if}

  {#if enabled}
    <div transition:slide>
      <SubSection label="govSectionRampTime">
        {#if CONFIGURATOR.expertMode}
          <div transition:slide>
            <Field id="gov-startup-time" label="govStartupTime" unit="s">
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
                {#if is_12_9}
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
          </div>
        {/if}
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
            {#if is_12_9}
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
            {#if is_12_9}
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
        <Field id="gov-tracking-time" label="govTrackingTime" unit="s">
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
            {#if is_12_9}
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

        <Field id="gov-recovery-time" label="govRecoveryTime" unit="s">
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
            {#if is_12_9}
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
        {/if}
      </SubSection>
    </div>
  {/if}
  {#if !is_12_9}
    {#if enabled}
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
    {/if}
  {/if}
  {#if enabled && CONFIGURATOR.expertMode}
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
        {#if is_12_9}
          <Field id="gov-d-cutoff" label="govDCutoff" unit="Hz">
            {#snippet tooltip()}
              <Tooltip
                help="govDCutoffHelp"
                attrs={[
                  { name: "genericDefault", value: "5Hz" },
                  { name: "genericRange", value: "0Hz - 25Hz" },
                ]}
              />
            {/snippet}
            <NumberInput
              id="gov-d-cutoff"
              min="0"
              max="25"
              step="0.1"
              bind:value={fields.gov_d_filter}
            />
          </Field>
        {/if}
      </SubSection>
    </div>
  {/if}
</Section>

<style lang="scss">
  .ramp-container {
    display: flex;
    align-items: center;

    gap: 8px;
  }
</style>

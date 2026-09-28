<script>
  import semver from "semver";

  import Field from "@/components/Field.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import { API_VERSION_12_8 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import {
    DEBUG_AXIS,
    LOG_RATES,
    getDebugModes,
    getLogFields,
  } from "./util.js";

  let deviceOptions = $derived(
    [
      { value: 0, label: $i18n.t("blackboxLoggingNone") },
      FC.DATAFLASH.supported && {
        value: 1,
        label: $i18n.t("blackboxLoggingFlash"),
      },
      FC.SDCARD.supported && {
        value: 2,
        label: $i18n.t("blackboxLoggingSdCard"),
      },
      { value: 3, label: $i18n.t("blackboxLoggingSerial") },
    ].filter(Boolean),
  );

  let modeOptions = $derived([
    { value: 0, label: $i18n.t("blackboxModeOff") },
    { value: 1, label: $i18n.t("blackboxModeNormal") },
    { value: 2, label: $i18n.t("blackboxModeArmed") },
    { value: 3, label: $i18n.t("blackboxModeSwitch") },
  ]);

  let rateOptions = $derived.by(() => {
    const pidDenom = FC.ADVANCED_CONFIG.pid_process_denom;
    const pidRate = FC.CONFIG.sampleRateHz / pidDenom;
    const rateKey = Math.round(pidRate);
    const rates = LOG_RATES[rateKey] ?? LOG_RATES[0];

    const options = rates.map((value) => ({
      value,
      label: `${(pidRate / value).toFixed(0)}Hz`,
    }));

    if (!rates.includes(FC.BLACKBOX.blackboxDenom)) {
      const rate = pidRate / FC.BLACKBOX.blackboxDenom;
      options.push({
        value: FC.BLACKBOX.blackboxDenom,
        label: `${$i18n.t("blackboxRateCustom")} ${rate.toFixed(0)}Hz [1/${FC.BLACKBOX.blackboxDenom}]`,
      });
    }

    return options;
  });

  let debugModeOptions = $derived.by(() => {
    const names = getDebugModes(FC.CONFIG.apiVersion);
    const unknown = $i18n.t("blackboxDebugModeUnknown");

    const options = [];
    for (let i = 0; i < FC.DEBUG_CONFIG.debugModeCount; i++) {
      options.push({ value: i, label: i < names.length ? names[i] : unknown });
    }

    return options.sort((a, b) => {
      if (a.label === "NONE" || b.label === unknown) return -1;
      if (b.label === "NONE" || a.label === unknown) return 1;
      return a.label.localeCompare(b.label);
    });
  });

  let debugAxisOptions = $derived(
    DEBUG_AXIS.map((label, value) => ({ value, label })),
  );

  let logFields = $derived(getLogFields(FC.CONFIG.apiVersion));

  let showMode = $derived(FC.BLACKBOX.blackboxDevice !== 0);
  let showRateAndFlags = $derived(showMode && FC.BLACKBOX.blackboxMode !== 0);
  let showGracePeriod = $derived(
    showMode &&
      (FC.BLACKBOX.blackboxMode === 1 || FC.BLACKBOX.blackboxMode === 2) &&
      semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8),
  );
  let showEraseOptions = $derived(
    FC.BLACKBOX.blackboxDevice === 1 &&
      semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8),
  );

  let initialEraseMax = $derived(
    Math.min(64, FC.DATAFLASH.totalSize / 1024 / 1024),
  );
  let initialEraseMiB = $derived(
    Math.round(FC.BLACKBOX.blackboxInitialEraseKiB / 1024),
  );

  function onInitialEraseChange(v) {
    FC.BLACKBOX.blackboxInitialEraseKiB = Math.min(0xffff, v * 1024);
  }

  function toggleLogField(index) {
    FC.BLACKBOX.blackboxFields ^= 1 << index;
  }
</script>

<div class="grid">
  <Section>
    {#snippet header()}
      <div class="section-header">
        <span class="title">{$i18n.t("blackboxConfiguration")}</span>
        <div class="grow"></div>
        <HelpIcon>{$i18n.t("serialLoggingSupportedNote")}</HelpIcon>
      </div>
    {/snippet}

    <Field id="bb-device" label="blackboxDevice">
      {#snippet tooltip()}
        <Tooltip help="blackboxDeviceHelp" />
      {/snippet}
      <Select
        id="bb-device"
        bind:value={FC.BLACKBOX.blackboxDevice}
        options={deviceOptions}
      />
    </Field>

    {#if showMode}
      <Field id="bb-mode" label="blackboxMode">
        {#snippet tooltip()}
          <Tooltip help="blackboxModeHelp" />
        {/snippet}
        <Select
          id="bb-mode"
          bind:value={FC.BLACKBOX.blackboxMode}
          options={modeOptions}
        />
      </Field>
    {/if}

    {#if showRateAndFlags}
      <Field id="bb-rate" label="blackboxRateOfLogging">
        {#snippet tooltip()}
          <Tooltip help="blackboxRateOfLoggingHelp" />
        {/snippet}
        <Select
          id="bb-rate"
          bind:value={FC.BLACKBOX.blackboxDenom}
          options={rateOptions}
        />
      </Field>
    {/if}

    {#if showGracePeriod}
      <Field id="bb-grace" label="blackboxGracePeriod" unit="s">
        {#snippet tooltip()}
          <Tooltip help="blackboxGracePeriodHelp" />
        {/snippet}
        <NumberInput
          id="bb-grace"
          bind:value={FC.BLACKBOX.blackboxGracePeriod}
          min={0}
          max={60}
          step={1}
        />
      </Field>
    {/if}

    <Field id="bb-debug-mode" label="blackboxDebugMode">
      {#snippet tooltip()}
        <Tooltip help="blackboxDebugModeHelp" />
      {/snippet}
      <Select
        id="bb-debug-mode"
        bind:value={FC.DEBUG_CONFIG.debugMode}
        options={debugModeOptions}
      />
    </Field>

    <Field id="bb-debug-axis" label="blackboxDebugAxis">
      {#snippet tooltip()}
        <Tooltip help="blackboxDebugAxisHelp" />
      {/snippet}
      <Select
        id="bb-debug-axis"
        bind:value={FC.DEBUG_CONFIG.debugAxis}
        options={debugAxisOptions}
      />
    </Field>

    {#if showEraseOptions}
      <Field id="bb-initial-erase" label="blackboxInitialErase" unit="MiB">
        {#snippet tooltip()}
          <Tooltip help="blackboxInitialEraseHelp" />
        {/snippet}
        <NumberInput
          id="bb-initial-erase"
          bind:value={() => initialEraseMiB, onInitialEraseChange}
          min={0}
          max={initialEraseMax}
          step={1}
        />
      </Field>
      <Field id="bb-rolling-erase" label="blackboxRollingErase">
        {#snippet tooltip()}
          <Tooltip help="blackboxRollingEraseHelp" />
        {/snippet}
        <Switch
          id="bb-rolling-erase"
          bind:checked={FC.BLACKBOX.blackboxRollingErase}
        />
      </Field>
    {/if}
  </Section>

  {#if showRateAndFlags}
    <Section label="blackboxOptions">
      <div class="flags">
        {#each logFields as field, index (field)}
          <label class="flag">
            <input
              type="checkbox"
              checked={!!(FC.BLACKBOX.blackboxFields & (1 << index))}
              onchange={() => toggleLogField(index)}
            />
            {$i18n.t(`blackboxLog_${field}`)}
          </label>
        {/each}
      </div>
    </Section>
  {/if}
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(280px, 2fr);
    column-gap: var(--section-gap);
    align-items: start;
  }

  .section-header {
    @extend %section-header;
    padding-right: 8px;
  }

  .title {
    padding-left: 8px;
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .flags {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 6px 10px;
    padding: 6px;
  }

  .flag {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
  }

  @media only screen and (max-width: 700px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>

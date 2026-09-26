<script>
  import { onDestroy, onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import ErrorNote from "@/components/notes/ErrorNote.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import { FBUS_SERVO_DATA_BASE } from "./protocol.js";
  import xactState, { View } from "./state.svelte.js";

  // The firmware refuses XACT scan/save requests while armed, so keep the arming state
  // fresh while this tab is open (the global live status timer doesn't poll MSP_STATUS).
  const STATUS_POLL_INTERVAL_MS = 500;
  let statusPoller;

  let saving = $state(false);
  let showToolbar = $derived(
    xactState.view === View.FORM && xactState.isDirty(),
  );
  let showBackToList = $derived(
    xactState.view === View.FORM &&
      xactState.servos.length > 1 &&
      !xactState.isDirty(),
  );

  // Live checks against the other servos already discovered this scan, so picking a new
  // Physical ID/App ID gives immediate feedback on whether it actually resolves a collision --
  // xactState.values.duplicateAppId only reflects what was true when the servo was read, not
  // whatever's currently selected in the form.
  let physicalIdWillCollide = $derived(
    xactState.servos.some(
      (s) =>
        s.physicalId !== xactState.selectedPhysicalId &&
        s.physicalId === xactState.values.physicalId,
    ),
  );
  let appIdWillCollide = $derived(
    xactState.servos.some(
      (s) =>
        s.physicalId !== xactState.selectedPhysicalId &&
        s.appIdOffset === xactState.values.appIdOffset,
    ),
  );

  function hex(value, digits) {
    return value.toString(16).toUpperCase().padStart(digits, "0");
  }

  // Physical ID (00-1A) and App ID (6800-680F) are selects labelled by their literal hex bus
  // address, matching FrSky's own "XAct" ETHOS Device Config tool exactly.
  const physicalIdOptions = Array.from({ length: 27 }, (_, i) => ({
    value: i,
    label: hex(i, 2),
  }));
  const appIdOptions = Array.from({ length: 16 }, (_, i) => ({
    value: i,
    label: hex(FBUS_SERVO_DATA_BASE + i, 4),
  }));
  const rangeOptions = [
    { value: 0, label: "120°" },
    { value: 1, label: "90°" },
    { value: 2, label: "180°" },
  ];
  const directionOptions = [
    { value: 0, label: "xactServoDirectionClockwise" },
    { value: 1, label: "xactServoDirectionAnticlockwise" },
  ];
  const pulseTypeOptions = [
    { value: 0, label: "1500us" },
    { value: 1, label: "760us" },
  ];
  const workingModeOptions = [
    { value: 0, label: "xactServoWorkingModeAngle" },
    { value: 1, label: "xactServoWorkingModeRange" },
    { value: 2, label: "xactServoWorkingModeRotate" },
  ];

  onMount(() => {
    MSP.promise(MSPCodes.MSP_STATUS);
    statusPoller = setInterval(() => {
      MSP.promise(MSPCodes.MSP_STATUS);
    }, STATUS_POLL_INTERVAL_MS);
  });

  onDestroy(() => {
    clearInterval(statusPoller);
  });

  export async function onSave() {
    saving = true;
    try {
      await xactState.onSave();
    } finally {
      saving = false;
    }
  }

  export function onRevert() {
    xactState.onRevert();
  }

  export function isDirty() {
    return xactState.isDirty();
  }

  function onClickScan() {
    xactState.scan();
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabXactServoProgramming"), "_system");
  }

  function onClickBackToList() {
    xactState.backToList();
  }

  function onSelectServo(physicalId) {
    xactState.selectServo(physicalId);
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabXactServoProgramming")}</h1>
  <div class="grow"></div>
  <button
    class="btn"
    onclick={onClickScan}
    disabled={xactState.view === View.SCANNING || xactState.armed}
  >
    {$i18n.t("xactServoScanButton")}
  </button>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert} disabled={saving}>
    {$i18n.t("buttonRevert")}
  </button>
  <button class="btn" onclick={onSave} disabled={saving || xactState.armed}>
    {$i18n.t("buttonSave")}
  </button>
{/snippet}

{#snippet select(id, options, translate)}
  <select {id} bind:value={xactState.values[id]}>
    {#each options as option (option.value)}
      <option value={option.value}>
        {translate ? $i18n.t(option.label) : option.label}
      </option>
    {/each}
  </select>
{/snippet}

<Page {header} toolbar={showToolbar && toolbar}>
  <p class="intro">{$i18n.t("xactServoIntro")}</p>
  <WarningNote message="xactServoSingleServoNote" />

  {#if xactState.armed}
    <WarningNote message="xactServoArmedWarning" />
  {/if}

  {#if xactState.saveFailed}
    <ErrorNote message="xactServoSaveFailed" />
  {/if}

  {#if xactState.view === View.IDLE}
    <p class="status">{$i18n.t("xactServoIdle")}</p>
  {:else if xactState.view === View.SCANNING}
    <p class="status">{$i18n.t("xactServoScanning")}</p>
  {:else if xactState.view === View.NOT_FOUND}
    <p class="status error">{$i18n.t("xactServoNotFound")}</p>
  {:else if xactState.view === View.LIST}
    <p class="status">
      {$i18n.t("xactServoMultipleFound", { count: xactState.servos.length })}
    </p>
    <div class="servo-list">
      {#each xactState.servos as servo (servo.physicalId)}
        <button
          type="button"
          class="servo-list-row"
          disabled={xactState.armed}
          onclick={() => onSelectServo(servo.physicalId)}
        >
          <span class="servo-row-channel">
            {#if servo.ready}
              {$i18n.t("xactServoChannel")}: CH{servo.channel + 1}
            {:else}
              {$i18n.t("xactServoListReading")}
            {/if}
          </span>
          <span class="servo-row-field">
            {$i18n.t("xactServoPhysicalId")}: {hex(servo.physicalId, 2)}
          </span>
          <span class="servo-row-field">
            {$i18n.t("xactServoAppIdOffset")}: {hex(
              FBUS_SERVO_DATA_BASE + servo.appIdOffset,
              4,
            )}
          </span>
          <span class="row-grow"></span>
          {#if servo.duplicateAppId}
            <span class="servo-row-conflict">
              {$i18n.t("xactServoDuplicateAppIdBadge")}
            </span>
          {:else if servo.conflict}
            <span class="servo-row-conflict">
              {$i18n.t("xactServoConflictBadge")}
            </span>
          {/if}
          <em class="fas fa-chevron-right servo-row-chevron"></em>
        </button>
      {/each}
    </div>
  {:else if xactState.view === View.FORM}
    {#if showBackToList}
      <button type="button" class="back-btn" onclick={onClickBackToList}>
        <em class="fas fa-chevron-left"></em>
        {$i18n.t("xactServoBackToList")}
      </button>
    {/if}

    {#if physicalIdWillCollide}
      <WarningNote message="xactServoPhysicalIdCollisionWarning" />
    {:else if appIdWillCollide}
      <WarningNote message="xactServoDuplicateAppIdWarning" />
    {:else if xactState.values.conflict}
      <WarningNote message="xactServoConflictWarning" />
    {/if}

    <div class="pages">
      <Section label="xactServoSectionProtocol">
        <SubSection>
          <Field id="physicalId" label="xactServoPhysicalId">
            {#snippet tooltip()}
              <Tooltip help="xactServoPhysicalIdHelp" />
            {/snippet}
            {@render select("physicalId", physicalIdOptions, false)}
          </Field>
          <Field id="appIdOffset" label="xactServoAppIdOffset">
            {#snippet tooltip()}
              <Tooltip help="xactServoAppIdOffsetHelp" />
            {/snippet}
            {@render select("appIdOffset", appIdOptions, false)}
          </Field>
          <Field id="firmwareVersion" label="xactServoFirmwareVersion">
            {#snippet tooltip()}
              <Tooltip help="xactServoFirmwareVersionHelp" />
            {/snippet}
            <NumberInput
              id="firmwareVersion"
              value={xactState.values.firmwareVersion}
              disabled
              min={0}
              max={255}
              step={1}
            />
          </Field>
        </SubSection>
      </Section>

      <Section label="xactServoSectionServo">
        <SubSection>
          <Field id="range" label="xactServoRange">
            {#snippet tooltip()}
              <Tooltip help="xactServoRangeHelp" />
            {/snippet}
            {@render select("range", rangeOptions, false)}
          </Field>
          <Field id="direction" label="xactServoDirection">
            {#snippet tooltip()}
              <Tooltip help="xactServoDirectionHelp" />
            {/snippet}
            {@render select("direction", directionOptions, true)}
          </Field>
          <Field id="pulseType" label="xactServoPulseType">
            {#snippet tooltip()}
              <Tooltip help="xactServoPulseTypeHelp" />
            {/snippet}
            {@render select("pulseType", pulseTypeOptions, false)}
          </Field>
          <Field id="dataRate" label="xactServoDataRate" unit="ms">
            {#snippet tooltip()}
              <Tooltip help="xactServoDataRateHelp" />
            {/snippet}
            <NumberInput
              id="dataRate"
              bind:value={xactState.values.dataRate}
              min={10}
              max={60000}
              step={1}
            />
          </Field>
          <Field id="channel" label="xactServoChannel">
            {#snippet tooltip()}
              <Tooltip help="xactServoChannelHelp" />
            {/snippet}
            <NumberInput
              id="channel"
              bind:value={
                () => xactState.values.channel + 1,
                (v) => (xactState.values.channel = v - 1)
              }
              min={1}
              max={24}
              step={1}
            />
          </Field>
          <Field id="center" label="xactServoCenter">
            {#snippet tooltip()}
              <Tooltip help="xactServoCenterHelp" />
            {/snippet}
            <NumberInput
              id="center"
              bind:value={xactState.values.center}
              min={-125}
              max={125}
              step={1}
            />
          </Field>
        </SubSection>
      </Section>

      <Section label="xactServoSectionAdvanced">
        <SubSection>
          <Field id="holdingStrength" label="xactServoHoldingStrength">
            {#snippet tooltip()}
              <Tooltip help="xactServoHoldingStrengthHelp" />
            {/snippet}
            <NumberInput
              id="holdingStrength"
              bind:value={xactState.values.holdingStrength}
              min={4}
              max={15}
              step={1}
            />
          </Field>
          <Field id="operationSmoothing" label="xactServoOperationSmoothing">
            {#snippet tooltip()}
              <Tooltip help="xactServoOperationSmoothingHelp" />
            {/snippet}
            <NumberInput
              id="operationSmoothing"
              bind:value={xactState.values.operationSmoothing}
              min={0}
              max={50}
              step={1}
            />
          </Field>
          <Field id="deadband" label="xactServoDeadband">
            {#snippet tooltip()}
              <Tooltip help="xactServoDeadbandHelp" />
            {/snippet}
            <NumberInput
              id="deadband"
              bind:value={xactState.values.deadband}
              min={0}
              max={90}
              step={1}
            />
          </Field>
        </SubSection>
      </Section>

      {#if xactState.values.hasExtendedParams}
        <Section label="xactServoSectionSeries65">
          <SubSection>
            <Field id="workingMode" label="xactServoWorkingMode">
              {#snippet tooltip()}
                <Tooltip help="xactServoWorkingModeHelp" />
              {/snippet}
              {@render select("workingMode", workingModeOptions, true)}
            </Field>
            <Field id="maxAngle" label="xactServoMaxAngle" unit="°">
              {#snippet tooltip()}
                <Tooltip help="xactServoMaxAngleHelp" />
              {/snippet}
              <NumberInput
                id="maxAngle"
                bind:value={xactState.values.maxAngle}
                min={0}
                max={359}
                step={1}
              />
            </Field>
          </SubSection>
        </Section>
      {/if}
    </div>
  {/if}
</Page>

<style lang="scss">
  h1 {
    margin: 0;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }

  .help-btn {
    padding: 4px 8px;
    min-width: 60px;
  }

  .back-btn {
    @extend %button;
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0 8px 4px;
  }

  .intro {
    padding: 8px;
    color: var(--color-text-soft);
  }

  .status {
    padding: 8px;
    font-weight: 600;
  }

  .status.error {
    color: var(--color-red-900);
  }

  .pages {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  .servo-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 2px;
  }

  .servo-list-row {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font: inherit;
    text-align: left;
    cursor: pointer;

    color: var(--color-text);
    background-color: var(--color-surface);

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (hover: hover) {
      &:hover:not(:disabled) {
        background-color: var(--color-surface-float, var(--color-surface));
      }
    }
  }

  .servo-row-channel {
    flex-shrink: 0;
    min-width: 90px;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .servo-row-field {
    flex-shrink: 0;
    font-size: 0.85rem;
    color: var(--color-text-soft);
  }

  .row-grow {
    flex: 1;
  }

  .servo-row-conflict {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 700;

    color: var(--color-red-900);
  }

  .servo-row-chevron {
    flex-shrink: 0;
    font-size: 0.8rem;

    color: var(--color-text-soft);
  }
</style>

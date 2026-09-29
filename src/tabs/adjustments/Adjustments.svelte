<script>
  import diff from "microdiff";
  import { onDestroy, onMount } from "svelte";

  import Page from "@/components/Page.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import AdjustmentRow from "./AdjustmentRow.svelte";
  import {
    ALWAYS_ON_CH,
    PRIMARY_CHANNEL_COUNT,
    resetToOff,
    spreadCollapsedRanges,
  } from "./util.js";

  let loading = $state(true);
  let initialState = $state(null);
  let pollerInterval;
  let previousRCchannels = null;

  let initialVisibleSlots = [];
  let visibleSlots = $state([]);
  let revertGeneration = $state(0);

  function snapshotState() {
    return $state.snapshot({ ADJUSTMENT_RANGES: FC.ADJUSTMENT_RANGES });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }
    return diff(initialState, snapshotState());
  });

  let dirty = $derived(changes.length > 0);
  let showToolbar = $derived(!loading && dirty);

  let slotCount = $derived(FC.ADJUSTMENT_RANGES?.length ?? 0);
  let hiddenSlots = $derived(
    Array.from({ length: slotCount }, (_, i) => i).filter(
      (i) => !visibleSlots.includes(i),
    ),
  );

  let auxChannelCount = $derived(
    Math.max(0, (FC.RC?.active_channels ?? 0) - PRIMARY_CHANNEL_COUNT),
  );
  let channelOptions = $derived(
    Array.from({ length: auxChannelCount }, (_, i) => ({
      value: i,
      label: `AUX${i + 1}`,
    })),
  );
  let enaChannelOptions = $derived([
    ...channelOptions,
    { value: ALWAYS_ON_CH, label: $i18n.t("auxiliaryAlwaysChannelSelect") },
  ]);
  let adjChannelOptions = $derived([
    { value: -1, label: $i18n.t("auxiliaryAutoChannelSelect") },
    ...channelOptions,
  ]);

  function autoSelectChannel() {
    const autoRows = visibleSlots.filter(
      (i) => FC.ADJUSTMENT_RANGES[i].adjChannel === -1,
    );

    if (autoRows.length === 0) {
      previousRCchannels = null;
      return;
    }

    const currentChannels = FC.RC.channels.slice(
      PRIMARY_CHANNEL_COUNT,
      FC.RC.active_channels,
    );

    if (!previousRCchannels) {
      previousRCchannels = currentChannels;
      return;
    }

    let detected = null;
    let bestDelta = 100;
    for (let i = 0; i < currentChannels.length; i++) {
      const delta = Math.abs(currentChannels[i] - previousRCchannels[i]);
      if (delta > bestDelta) {
        detected = i;
        bestDelta = delta;
      }
    }

    if (detected !== null) {
      for (const rowIndex of autoRows) {
        FC.ADJUSTMENT_RANGES[rowIndex].adjChannel = detected;
      }
      previousRCchannels = null;
    }
  }

  function addAdjustment() {
    if (hiddenSlots.length === 0) {
      return;
    }
    const next = Math.min(...hiddenSlots);
    spreadCollapsedRanges(FC.ADJUSTMENT_RANGES[next]);
    visibleSlots = [...visibleSlots, next].sort((a, b) => a - b);
  }

  function removeAdjustment(index) {
    resetToOff(FC.ADJUSTMENT_RANGES[index]);
    visibleSlots = visibleSlots.filter((i) => i !== index);
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabAdjustments"), "_system");
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_RC);
    await MSP.promise(MSPCodes.MSP_ADJUSTMENT_RANGES);

    initialVisibleSlots = FC.ADJUSTMENT_RANGES.map((range, i) => i).filter(
      (i) => FC.ADJUSTMENT_RANGES[i].adjFunction > 0,
    );
    visibleSlots = [...initialVisibleSlots];

    initialState = snapshotState();
    loading = false;

    pollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RC);
      autoSelectChannel();
    }, 200);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
  });

  export async function onSave() {
    const dirtyIndices = new Set(changes.map((c) => c.path[1]));
    for (const index of dirtyIndices) {
      await new Promise((resolve) =>
        mspHelper.sendAdjustmentRange(index, resolve),
      );
    }
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    initialState = snapshotState();
    initialVisibleSlots = [...visibleSlots];
  }

  export async function onRevert() {
    const saved = initialState.ADJUSTMENT_RANGES;
    for (let i = 0; i < FC.ADJUSTMENT_RANGES.length; i++) {
      const target = FC.ADJUSTMENT_RANGES[i];
      const source = saved[i];
      target.adjFunction = source.adjFunction;
      target.enaChannel = source.enaChannel;
      target.enaRange.start = source.enaRange.start;
      target.enaRange.end = source.enaRange.end;
      target.adjChannel = source.adjChannel;
      target.adjRange1.start = source.adjRange1.start;
      target.adjRange1.end = source.adjRange1.end;
      target.adjRange2.start = source.adjRange2.start;
      target.adjRange2.end = source.adjRange2.end;
      target.adjMin = source.adjMin;
      target.adjMax = source.adjMax;
      target.adjStep = source.adjStep;
    }

    visibleSlots = [...initialVisibleSlots];
    revertGeneration++;
  }

  export function isDirty() {
    return dirty;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabAdjustments")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}
    >{$i18n.t("buttonHelp")}</button
  >
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSave")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="note">
    <p>{$i18n.t("adjustmentsHelp")}</p>
  </div>

  <div class="toolbox">
    <span class="slot-count"
      >{$i18n.t("adjustmentsSlotCount", {
        used: visibleSlots.length,
        total: slotCount,
      })}</span
    >
    <div class="grow"></div>
    <button
      class="btn add-btn"
      disabled={hiddenSlots.length === 0}
      onclick={addAdjustment}
    >
      <em class="fas fa-plus"></em>
      {$i18n.t("adjustmentsAddButton")}
    </button>
  </div>

  {#if visibleSlots.length === 0}
    <div class="empty-state">
      <p>{$i18n.t("adjustmentsEmptyState")}</p>
    </div>
  {:else}
    <div class="rows">
      {#each visibleSlots as index (index + ":" + revertGeneration)}
        <AdjustmentRow
          {index}
          {enaChannelOptions}
          {adjChannelOptions}
          onRemove={() => removeAdjustment(index)}
        />
      {/each}
    </div>
  {/if}
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }

  .help-btn {
    min-width: 60px;
  }

  .note {
    margin: var(--section-gap) 0 0;
    padding: 8px 12px;
    border-radius: var(--radius-sm);

    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-accent);
  }

  .toolbox {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: var(--section-gap);
    margin-bottom: var(--section-gap);
  }

  .slot-count {
    font-weight: 600;
    color: var(--color-text-soft);
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .empty-state {
    padding: 32px 16px;
    text-align: center;
    color: var(--color-text-soft);

    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>

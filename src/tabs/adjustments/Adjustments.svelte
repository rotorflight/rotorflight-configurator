<script>
  import diff from "microdiff";
  import { onDestroy, onMount } from "svelte";
  import { slide } from "svelte/transition";

  import Page from "@/components/Page.svelte";
  import PickerDialog from "@/components/PickerDialog.svelte";

  import { config } from "@/js/config.svelte.ts";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import AdjustmentRow from "./AdjustmentRow.svelte";
  import {
    FUNCTION_GROUPS,
    getFunctionDescription,
    getFunctions,
  } from "./functions.js";
  import {
    ALWAYS_ON_CH,
    PRIMARY_CHANNEL_COUNT,
    isWithin,
    resetToOff,
    spreadCollapsedRanges,
  } from "./util.js";

  const FUNCTIONS = getFunctions();
  const OTHER_GROUP = "adjustmentsGroupOther";

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

  // The function comes first: "Add Adjustment" and a card's title both open
  // this picker, and pickerSlot says which slot the choice goes to (null
  // for a new one). A function can be picked again for another slot.
  let functionPicker;
  let pickerSlot = null;

  let functionGroups = $derived(
    FUNCTION_GROUPS.map((group) => ({
      label: $i18n.t(group.label),
      items: group.ids
        .filter((id) => !FUNCTIONS[id].hide)
        .map((id) => ({
          value: id,
          label: $i18n.t("adjustmentsFunction" + FUNCTIONS[id].name),
          description: getFunctionDescription(FUNCTIONS[id].name),
          badge: visibleSlots.some(
            (i) => FC.ADJUSTMENT_RANGES[i].adjFunction === id,
          )
            ? $i18n.t("adjustmentsFunctionInUse")
            : "",
        })),
    })).filter((group) => group.items.length > 0),
  );

  // The cards sit under the picker's FUNCTION_GROUPS headings, in the same
  // order. Each group can be collapsed, and that's remembered.
  function groupKeyOf(id) {
    return (
      FUNCTION_GROUPS.find((group) => group.ids.includes(id))?.label ??
      OTHER_GROUP
    );
  }

  let cardGroups = $derived(
    [...FUNCTION_GROUPS.map((group) => group.label), OTHER_GROUP]
      .map((key) => ({
        key,
        slots: visibleSlots.filter(
          (i) => groupKeyOf(FC.ADJUSTMENT_RANGES[i].adjFunction) === key,
        ),
      }))
      .filter((group) => group.slots.length > 0),
  );

  let collapsedGroups = $state(config.adjustmentsCollapsedGroups);

  function setCollapsedGroups(keys) {
    collapsedGroups = keys;
    config.adjustmentsCollapsedGroups = keys;
  }

  function toggleGroup(key) {
    setCollapsedGroups(
      collapsedGroups.includes(key)
        ? collapsedGroups.filter((k) => k !== key)
        : [...collapsedGroups, key],
    );
  }

  function expandGroupOf(id) {
    const key = groupKeyOf(id);
    if (collapsedGroups.includes(key)) {
      toggleGroup(key);
    }
  }

  // Same test as a card's live header band: its enable channel lets it run.
  function isLive(index) {
    const adjRange = FC.ADJUSTMENT_RANGES[index];
    if (adjRange.enaChannel === ALWAYS_ON_CH) {
      return true;
    }
    const pos = FC.RC.channels[adjRange.enaChannel + PRIMARY_CHANNEL_COUNT];
    return pos != null && isWithin(pos, adjRange.enaRange);
  }

  function addAdjustment() {
    if (hiddenSlots.length === 0) {
      return;
    }
    pickerSlot = null;
    functionPicker.open();
  }

  function changeFunction(index) {
    pickerSlot = index;
    functionPicker.open(FC.ADJUSTMENT_RANGES[index].adjFunction);
  }

  function setFunction(adjRange, id) {
    const cfg = FUNCTIONS[id];
    adjRange.adjFunction = id;
    adjRange.adjMin = cfg.min;
    adjRange.adjMax = cfg.max;
  }

  function onPickFunction(id) {
    if (pickerSlot !== null) {
      setFunction(FC.ADJUSTMENT_RANGES[pickerSlot], id);
      expandGroupOf(id);
      return;
    }
    const next = Math.min(...hiddenSlots);
    const adjRange = FC.ADJUSTMENT_RANGES[next];
    spreadCollapsedRanges(adjRange);
    setFunction(adjRange, id);
    adjRange.adjStep = 0; // start as Mapped
    visibleSlots = [...visibleSlots, next].sort((a, b) => a - b);
    expandGroupOf(id);
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
  <button
    class="btn add-btn"
    disabled={hiddenSlots.length === 0}
    onclick={addAdjustment}
  >
    <em class="fas fa-plus"></em>
    {$i18n.t("adjustmentsAddButton")}
  </button>
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

  <p class="slot-count">
    {$i18n.t("adjustmentsSlotCount", {
      used: visibleSlots.length,
      total: slotCount,
    })}
  </p>

  {#if visibleSlots.length === 0}
    <div class="empty-state">
      <p>{$i18n.t("adjustmentsEmptyState")}</p>
    </div>
  {:else}
    {#each cardGroups as group (group.key)}
      {@const open = !collapsedGroups.includes(group.key)}
      <section class="group">
        <button
          type="button"
          class="group-header"
          aria-expanded={open}
          onclick={() => toggleGroup(group.key)}
        >
          <em class={["fas", "fa-chevron-right", "chevron", open && "open"]}
          ></em>
          <span class="group-title">{$i18n.t(group.key)}</span>
          <span class="group-count">{group.slots.length}</span>
          {#if group.slots.some(isLive)}
            <span class="live-dot" title={$i18n.t("adjustmentsGroupLive")}
            ></span>
          {/if}
        </button>
        {#if open}
          <div class="rows" transition:slide={{ duration: 150 }}>
            {#each group.slots as index (index + ":" + revertGeneration + ":" + FC.ADJUSTMENT_RANGES[index].adjFunction)}
              <AdjustmentRow
                {index}
                {enaChannelOptions}
                {adjChannelOptions}
                onChangeFunction={() => changeFunction(index)}
                onRemove={() => removeAdjustment(index)}
              />
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  {/if}
</Page>

<PickerDialog
  bind:this={functionPicker}
  title={$i18n.t("adjustmentsPickFunctionTitle")}
  groups={functionGroups}
  searchPlaceholder={$i18n.t("adjustmentsFunctionSearch")}
  noMatchesText={$i18n.t("adjustmentsFunctionNoMatches")}
  onSelect={onPickFunction}
/>

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

  .slot-count {
    margin: var(--section-gap) 0 0;
    font-weight: 600;
    color: var(--color-text-soft);
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
  }

  .empty-state,
  .group {
    margin-top: var(--section-gap);
  }

  .empty-state {
    padding: 32px 16px;
    text-align: center;
    color: var(--color-text-soft);

    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);
  }

  /* Each group is a panel: a solid header bar with an accent edge, and its
     cards inset on a sunken background, so the cards read as belonging to
     it rather than floating under a thin heading. */
  .group {
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-left: 4px solid var(--color-accent-500);
    border-radius: var(--radius-md);
    background-color: var(--color-surface-sunken);
    box-shadow: var(--shadow-xs);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    font: inherit;
    font-size: 1rem;
    font-weight: 700;
    text-align: left;
    color: var(--color-text);
    background-color: var(--color-surface);
    border: none;
    cursor: pointer;

    &[aria-expanded="true"] {
      border-bottom: 1px solid var(--color-border);
    }

    @media (hover: hover) {
      &:hover {
        background-color: var(--color-hover);
      }
    }

    &:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 3px var(--color-focus-ring);
    }
  }

  .chevron {
    width: 1em;
    font-size: 0.8rem;
    color: var(--color-text-soft);
    transition: transform var(--animation-speed);

    &.open {
      transform: rotate(90deg);
    }
  }

  .group-count {
    min-width: 1.75em;
    padding: 0 8px;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.6;
    text-align: center;
    border-radius: var(--radius-pill);
    color: var(--color-text-alt);
    background-color: var(--color-accent-500);
  }

  .live-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background-color: var(--color-accent-500);
    box-shadow: 0 0 0 3px var(--color-accent-soft);
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
</style>

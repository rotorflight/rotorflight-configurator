<script>
  import { onDestroy, onMount } from "svelte";

  import CollapsibleGroup from "@/components/CollapsibleGroup.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import Page from "@/components/Page.svelte";
  import PickerDialog from "@/components/PickerDialog.svelte";

  import {
    EXPERT_MODES,
    MODE_GROUPS,
    MODE_GROUP_OTHER,
    UNUSED_MODES,
    getModeDescription,
    getModeDisplayName,
    getModeOrder,
  } from "@/js/FlightMode.js";
  import { config } from "@/js/config.svelte.ts";
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { bit_check } from "@/js/serial_backend.js";

  import ModeCard from "./ModeCard.svelte";

  // Roll, pitch, yaw, collective and throttle come before AUX1.
  const PRIMARY_CHANNEL_COUNT = 5;

  let loading = $state(true);
  let dirty = $state(false);
  let showToolbar = $derived(!loading && dirty);

  let entries = $state({});
  let initialEntries;
  // Modes listed on the page: ARM, every mode with a range or link, and
  // any mode picked from "Add mode" this session. Everything else lives in
  // the picker, so the page only grows with what's actually configured.
  let shownModes = $state([]);
  let initialShownModes;
  let previousRcChannels = null;

  let rcPollerInterval;
  let statusPollerInterval;

  // ARM is always the first mode reported by the FC; keep it pinned at the
  // top of the list and order the rest by MODE_GROUPS, then name. Modes
  // that are heli-specific/unused, or expert-only while not in expert mode,
  // are dropped from the list entirely -- and (matching legacy) from what
  // gets saved, since only modes represented here are written back.
  let modeIndices = $derived.by(() => {
    const indices = [];
    for (let i = 0; i < FC.AUX_CONFIG.length; i++) {
      const modeName = FC.AUX_CONFIG[i];
      if (UNUSED_MODES.includes(modeName)) continue;
      if (EXPERT_MODES.includes(modeName) && !CONFIGURATOR.expertMode) continue;
      indices.push(i);
    }
    const armIndex = indices.shift();
    indices.sort((a, b) => {
      const oa = getModeOrder(FC.AUX_CONFIG[a]);
      const ob = getModeOrder(FC.AUX_CONFIG[b]);
      return (
        oa.group - ob.group ||
        oa.index - ob.index ||
        getModeDisplayName(FC.AUX_CONFIG[a]).localeCompare(
          getModeDisplayName(FC.AUX_CONFIG[b]),
        )
      );
    });
    if (armIndex !== undefined) indices.unshift(armIndex);
    return indices;
  });

  let visibleIndices = $derived(
    modeIndices.filter((i) => i === modeIndices[0] || shownModes.includes(i)),
  );

  // The cards sit under the same MODE_GROUPS headings as the add-mode
  // picker, in the same order. Each group can be collapsed, and that's
  // remembered.
  function groupKeyOf(modeIndex) {
    return (
      MODE_GROUPS[getModeOrder(FC.AUX_CONFIG[modeIndex]).group]?.key ??
      MODE_GROUP_OTHER
    );
  }

  // visibleIndices is already in group order, so each group is one run.
  let modeGroups = $derived.by(() => {
    const groups = [];
    for (const i of visibleIndices) {
      const key = groupKeyOf(i);
      if (groups.at(-1)?.key !== key) groups.push({ key, modes: [] });
      groups.at(-1).modes.push(i);
    }
    return groups;
  });

  let collapsedGroups = $state(config.modesCollapsedGroups);

  function setCollapsedGroups(keys) {
    collapsedGroups = keys;
    config.modesCollapsedGroups = keys;
  }

  function toggleGroup(key) {
    setCollapsedGroups(
      collapsedGroups.includes(key)
        ? collapsedGroups.filter((k) => k !== key)
        : [...collapsedGroups, key],
    );
  }

  // Modes not on the page yet, bucketed by MODE_GROUPS for the add dialog.
  // modeIndices is already in group order, so buckets fill in order.
  let addModeGroups = $derived.by(() => {
    const groups = [];
    for (const i of modeIndices) {
      if (visibleIndices.includes(i)) continue;
      const modeName = FC.AUX_CONFIG[i];
      const key = MODE_GROUPS[getModeOrder(modeName).group]?.key;
      const label = $i18n.t(`auxiliaryGroup${key ?? MODE_GROUP_OTHER}`);
      if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
      groups.at(-1).items.push({
        value: i,
        label: getModeDisplayName(modeName),
        description: getModeDescription(modeName),
      });
    }
    return groups;
  });

  let addModeDialog;

  let auxChannelCount = $derived(
    Math.max(0, FC.RC.active_channels - PRIMARY_CHANNEL_COUNT),
  );

  let channelOptions = $derived([
    { value: -1, label: $i18n.t("auxiliaryAutoChannelSelect") },
    ...Array.from({ length: auxChannelCount }, (_, i) => ({
      value: i,
      label: `AUX ${i + 1}`,
    })),
  ]);

  let logicOptions = $derived([
    { value: 0, label: $i18n.t("auxiliaryModeLogicOR") },
    { value: 1, label: $i18n.t("auxiliaryModeLogicAND") },
  ]);

  // Every mode (including the current one, disabled) so a CLI-set self-link
  // is still visible rather than silently vanishing from the list.
  let linkOptions = $derived([
    { value: 0, label: "" },
    ...FC.AUX_CONFIG.slice(1).map((modeName, i) => ({
      value: FC.AUX_CONFIG_IDS[i + 1],
      label: getModeDisplayName(modeName),
    })),
  ]);

  function buildEntries() {
    const modeIdToIndex = {};
    for (const modeIndex of modeIndices) {
      modeIdToIndex[FC.AUX_CONFIG_IDS[modeIndex]] = modeIndex;
    }

    const result = {};
    for (const modeIndex of modeIndices) {
      result[modeIndex] = [];
    }

    for (let i = 0; i < FC.MODE_RANGES.length; i++) {
      const range = FC.MODE_RANGES[i];
      const extra = FC.MODE_RANGES_EXTRA[i];
      if (!range || !extra || range.id !== extra.id) continue;

      const modeIndex = modeIdToIndex[range.id];
      if (modeIndex === undefined) continue;

      if (range.id === 0 || extra.linkedTo === 0) {
        if (range.range.start >= range.range.end) continue; // invalid/unused slot
        result[modeIndex].push({
          type: "range",
          channel: range.auxChannelIndex,
          logic: extra.modeLogic,
          start: range.range.start,
          end: range.range.end,
        });
      } else {
        result[modeIndex].push({
          type: "link",
          logic: extra.modeLogic,
          linkedTo: extra.linkedTo,
        });
      }
    }

    return result;
  }

  function isArmSwitchActive() {
    if (FC.CONFIG.armingDisableCount > 0) {
      const armSwitchMask = 1 << (FC.CONFIG.armingDisableCount - 1);
      return (FC.CONFIG.armingDisableFlags & armSwitchMask) > 0;
    }
    return false;
  }

  function isModeOn(modeIndex) {
    if (modeIndex === 0 && isArmSwitchActive()) return true;
    return bit_check(FC.CONFIG.mode, modeIndex);
  }

  function autoSelectChannel() {
    const autoItems = [];
    for (const modeIndex of modeIndices) {
      for (const item of entries[modeIndex] ?? []) {
        if (item.type === "range" && item.channel === -1) autoItems.push(item);
      }
    }

    if (autoItems.length === 0) {
      previousRcChannels = null;
      return;
    }

    const rcChannels = FC.RC.channels.slice(
      PRIMARY_CHANNEL_COUNT,
      PRIMARY_CHANNEL_COUNT + auxChannelCount,
    );

    if (!previousRcChannels) {
      previousRcChannels = rcChannels;
      return;
    }

    let channel = -1;
    let chDelta = 100;
    for (let index = 0; index < rcChannels.length; index++) {
      const delta = Math.abs(rcChannels[index] - previousRcChannels[index]);
      if (delta > chDelta) {
        channel = index;
        chDelta = delta;
      }
    }

    if (channel !== -1) {
      for (const item of autoItems) item.channel = channel;
      previousRcChannels = null;
    } else {
      previousRcChannels = rcChannels;
    }
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_RC);
    await MSP.promise(MSPCodes.MSP_BOXIDS);
    await MSP.promise(MSPCodes.MSP_BOXNAMES);
    await MSP.promise(MSPCodes.MSP_RSSI_CONFIG);
    await MSP.promise(MSPCodes.MSP_MODE_RANGES);
    await MSP.promise(MSPCodes.MSP_MODE_RANGES_EXTRA);
    await MSP.promise(MSPCodes.MSP_SERIAL_CONFIG);

    entries = buildEntries();
    shownModes = modeIndices.filter((i) => entries[i].length > 0);
    initialEntries = structuredClone($state.snapshot(entries));
    initialShownModes = [...shownModes];
    loading = false;

    rcPollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RC);
      autoSelectChannel();
    }, 200);

    statusPollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_STATUS);
    }, 500);
  });

  onDestroy(() => {
    clearInterval(rcPollerInterval);
    clearInterval(statusPollerInterval);
  });

  function markDirty() {
    dirty = true;
  }

  function addRange(modeIndex) {
    entries[modeIndex].push({
      type: "range",
      channel: -1,
      logic: 0,
      start: 1300,
      end: 1700,
    });
    dirty = true;
  }

  function addLink(modeIndex) {
    entries[modeIndex].push({ type: "link", logic: 0, linkedTo: 0 });
    dirty = true;
  }

  function addMode(modeIndex) {
    if (!shownModes.includes(modeIndex)) shownModes.push(modeIndex);
    const key = groupKeyOf(modeIndex);
    if (collapsedGroups.includes(key)) toggleGroup(key);
    addRange(modeIndex);
  }

  function removeMode(modeIndex) {
    entries[modeIndex] = [];
    shownModes = shownModes.filter((i) => i !== modeIndex);
    dirty = true;
  }

  function deleteItem(modeIndex, item) {
    const list = entries[modeIndex];
    const index = list.indexOf(item);
    if (index !== -1) list.splice(index, 1);
    dirty = true;
  }

  export async function onSave() {
    const requiredCount = FC.MODE_RANGES.length;
    const newRanges = [];
    const newExtra = [];

    for (const modeIndex of modeIndices) {
      const modeId = FC.AUX_CONFIG_IDS[modeIndex];
      for (const item of entries[modeIndex]) {
        if (item.type === "range") {
          newRanges.push({
            id: modeId,
            auxChannelIndex: item.channel,
            range: { start: item.start, end: item.end },
          });
          newExtra.push({ id: modeId, modeLogic: item.logic, linkedTo: 0 });
        } else {
          newRanges.push({
            id: modeId,
            auxChannelIndex: 0,
            range: { start: 900, end: 900 },
          });
          newExtra.push({
            id: modeId,
            modeLogic: item.logic,
            linkedTo: item.linkedTo,
          });
        }
      }
    }

    while (newRanges.length < requiredCount) {
      newRanges.push({
        id: 0,
        auxChannelIndex: 0,
        range: { start: 900, end: 900 },
      });
      newExtra.push({ id: 0, modeLogic: 0, linkedTo: 0 });
    }

    FC.MODE_RANGES = newRanges;
    FC.MODE_RANGES_EXTRA = newExtra;

    await new Promise((resolve) => mspHelper.sendModeRanges(resolve));
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    initialEntries = structuredClone($state.snapshot(entries));
    initialShownModes = [...shownModes];
    dirty = false;
  }

  export async function onRevert() {
    entries = structuredClone(initialEntries);
    shownModes = [...initialShownModes];
    dirty = false;
  }

  export function isDirty() {
    return dirty;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabAuxiliary"), "_system");
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabAuxiliary")}</h1>
  <div class="grow"></div>
  <HelpIcon>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html $i18n.t("auxiliaryHelp")}
  </HelpIcon>
  <button
    class="btn add-mode"
    disabled={addModeGroups.length === 0}
    onclick={() => addModeDialog.open()}
  >
    <span class="fas fa-plus"></span>
    {$i18n.t("auxiliaryAddMode")}
  </button>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSave")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  {#each modeGroups as group (group.key)}
    <CollapsibleGroup
      title={$i18n.t(`auxiliaryGroup${group.key}`)}
      count={group.modes.length}
      live={group.modes.some(isModeOn)}
      liveTitle={$i18n.t("auxiliaryGroupLive")}
      open={!collapsedGroups.includes(group.key)}
      onToggle={() => toggleGroup(group.key)}
    >
      {#each group.modes as modeIndex (modeIndex)}
        <ModeCard
          modeId={FC.AUX_CONFIG_IDS[modeIndex]}
          modeName={FC.AUX_CONFIG[modeIndex]}
          items={entries[modeIndex] ?? []}
          isOn={isModeOn(modeIndex)}
          {channelOptions}
          {logicOptions}
          {linkOptions}
          onAddRange={() => addRange(modeIndex)}
          onAddLink={() => addLink(modeIndex)}
          onDeleteItem={(item) => deleteItem(modeIndex, item)}
          onRemove={modeIndex === modeIndices[0]
            ? null
            : () => removeMode(modeIndex)}
          onEdit={markDirty}
        />
      {/each}
    </CollapsibleGroup>
  {/each}
</Page>

<PickerDialog
  bind:this={addModeDialog}
  title={$i18n.t("auxiliaryAddModeTitle")}
  groups={addModeGroups}
  searchPlaceholder={$i18n.t("auxiliaryAddModeSearch")}
  noMatchesText={$i18n.t("auxiliaryAddModeNoMatches")}
  onSelect={addMode}
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
    padding: 4px 8px;
    min-width: 60px;
  }

  .add-mode {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
  }
</style>

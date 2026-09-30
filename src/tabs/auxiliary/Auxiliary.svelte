<script>
  import { onDestroy, onMount, untrack } from "svelte";

  import HelpIcon from "@/components/HelpIcon.svelte";
  import Page from "@/components/Page.svelte";
  import Switch from "@/components/Switch.svelte";

  import {
    EXPERT_MODES,
    UNUSED_MODES,
    getModeDisplayName,
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

  let hideUnused = $state(!!config.hideUnusedModes);
  $effect(() => {
    const value = hideUnused;
    /* config is reactive itself: write without subscribing to it */
    untrack(() => {
      config.hideUnusedModes = value;
    });
  });

  let entries = $state({});
  let initialEntries = $state.raw();
  let previousRcChannels = null;

  let rcPollerInterval;
  let statusPollerInterval;

  // ARM is always the first mode reported by the FC; keep it pinned at the
  // top of the list and alphabetize the rest by their display name. Modes
  // that are heli-specific/unused are dropped from the list entirely -- and
  // (matching legacy) from what gets saved, since only modes represented
  // here are written back.
  let modeIndices = $derived.by(() => {
    const indices = [];
    for (let i = 0; i < FC.AUX_CONFIG.length; i++) {
      if (UNUSED_MODES.includes(FC.AUX_CONFIG[i])) continue;
      indices.push(i);
    }
    /* firmware order, as before */
    return indices;
  });

  // Expert-only modes are just not shown in basic mode; they are still
  // saved. One that has a range or link (now or when loaded) stays shown.
  let shownModeIndices = $derived(
    modeIndices.filter(
      (i) =>
        CONFIGURATOR.expertMode ||
        !EXPERT_MODES.includes(FC.AUX_CONFIG[i]) ||
        entries[i]?.length > 0 ||
        initialEntries?.[i]?.length > 0,
    ),
  );

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
    initialEntries = structuredClone($state.snapshot(entries));
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
    dirty = false;
  }

  export async function onRevert() {
    entries = structuredClone(initialEntries);
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
  <label class="toggle-unused">
    <Switch bind:checked={hideUnused} />
    {$i18n.t("auxiliaryToggleUnused")}
  </label>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSave")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  {#each shownModeIndices as modeIndex (modeIndex)}
    <ModeCard
      modeId={FC.AUX_CONFIG_IDS[modeIndex]}
      modeName={FC.AUX_CONFIG[modeIndex]}
      items={entries[modeIndex] ?? []}
      hidden={hideUnused &&
        modeIndices.some((i) => entries[i]?.length > 0) &&
        (entries[modeIndex]?.length ?? 0) === 0}
      isOn={isModeOn(modeIndex)}
      {channelOptions}
      {logicOptions}
      {linkOptions}
      onAddRange={() => addRange(modeIndex)}
      onAddLink={() => addLink(modeIndex)}
      onDeleteItem={(item) => deleteItem(modeIndex, item)}
      onEdit={markDirty}
    />
  {/each}
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
    padding: 4px 8px;
    min-width: 60px;
  }

  .toggle-unused {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
  }
</style>

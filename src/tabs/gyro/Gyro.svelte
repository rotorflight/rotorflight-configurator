<script>
  import semver from "semver";
  import { slide } from "svelte/transition";
  import { onMount } from "svelte";
  import diff from "microdiff";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { getTabHelpURL } from "@/js/help";

  import CustomNotches from "./CustomNotches.svelte";
  import DynamicFilter from "./DynamicFilter.svelte";
  import LowpassFilter from "./LowpassFilter.svelte";
  import Page from "@/components/Page.svelte";
  import RpmFilter from "./RpmFilter.svelte";
  import NotchFilter from "./NotchFilter.svelte";

  import {
    parseRpmFilterConfig1,
    parseRpmFilterConfig2,
    generateRpmFilterConfig1,
    generateRpmFilterConfig2,
    NOTCH_COUNT,
  } from "./filter_config.js";

  let loading = $state(true);
  let initialState;

  function snapshotState() {
    return $state.snapshot({
      RPM_FILTER_CONFIG: FC.RPM_FILTER_CONFIG,
      RPM_FILTER_CONFIG_V2: FC.RPM_FILTER_CONFIG_V2,
      FILTER_CONFIG: FC.FILTER_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }

    return diff(initialState, snapshotState());
  });
  let showToolbar = $derived(!loading && changes.length > 0);
  let disableSave = $derived.by(() => {
    if (FC.RPM_FILTER_CONFIG.length > NOTCH_COUNT) {
      return true;
    }

    for (const bank of FC.RPM_FILTER_CONFIG_V2) {
      if (bank.length > NOTCH_COUNT) {
        return true;
      }
    }

    return false;
  });

  let notches = $state(null);
  let enabled = $derived(FC.FEATURE_CONFIG.features.RPM_FILTER);
  let custom = $derived.by(() => {
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      return enabled && FC.FILTER_CONFIG.rpm_preset === 0;
    }

    return enabled;
  });

  function parseNotches() {
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      notches = parseRpmFilterConfig2($state.snapshot(FC.RPM_FILTER_CONFIG_V2));
    } else {
      notches = parseRpmFilterConfig1($state.snapshot(FC.RPM_FILTER_CONFIG));
    }
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_FILTER_CONFIG);
    await MSP.promise(MSPCodes.MSP_MOTOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);

    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      await mspHelper.requestRpmFilterBanks();
    } else {
      await MSP.promise(MSPCodes.MSP_RPM_FILTER);
    }

    parseNotches();
    initialState = snapshotState();
    loading = false;
  });

  export async function onSave() {
    await MSP.promise(
      MSPCodes.MSP_SET_FEATURE_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_FEATURE_CONFIG),
    );
    await MSP.promise(
      MSPCodes.MSP_SET_FILTER_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_FILTER_CONFIG),
    );
    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      await mspHelper.sendRPMFiltersV2();
    } else {
      await mspHelper.sendRPMFilters();
    }

    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  $effect(() => {
    if (!notches) {
      return;
    }

    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
      if (custom) {
        FC.RPM_FILTER_CONFIG_V2 = generateRpmFilterConfig2(notches);
      }
    } else {
      FC.RPM_FILTER_CONFIG = generateRpmFilterConfig1(notches);
    }
  });

  export function onRevert() {
    Object.assign(FC.RPM_FILTER_CONFIG, initialState.RPM_FILTER_CONFIG);
    Object.assign(FC.RPM_FILTER_CONFIG_V2, initialState.RPM_FILTER_CONFIG_V2);
    Object.assign(FC.FILTER_CONFIG, initialState.FILTER_CONFIG);
    FC.FEATURE_CONFIG.features.bitfield = initialState.features;
    parseNotches();
  }

  function onResetNotches() {
    FC.RPM_FILTER_CONFIG = [];
    FC.RPM_FILTER_CONFIG_V2 = [[], [], []];
    parseNotches();
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabGyro"), "_system");
  }

  export function isDirty() {
    return changes.length > 0;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabGyro")}</h1>
  <div class="grow"></div>
  <button class="help-btn" onclick={onClickHelp}>Help</button>
{/snippet}

{#snippet toolbar()}
  <button onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button disabled={disableSave} onclick={onSave}>
    {$i18n.t("buttonSaveReboot")}
  </button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <div>
      <LowpassFilter {FC} />
      <NotchFilter {FC} />
      <DynamicFilter {FC} />
    </div>
    <div>
      <RpmFilter {FC} {notches} />
      {#if custom}
        <div transition:slide>
          <CustomNotches {FC} {notches} {onResetNotches} />
        </div>
      {/if}
    </div>
  </div>
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  button {
    @extend %button;
  }

  .help-btn {
    padding: 4px 8px;
    min-width: 60px;
  }

  @media only screen and (max-width: 480px) {
    .content {
      grid-template-columns: 1fr;
      row-gap: 0;
    }
  }

  .grow {
    flex-grow: 1;
  }
</style>

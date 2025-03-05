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
  import StaticFilter from "./StaticFilter.svelte";

  import {
    parseRpmFilterConfig1,
    parseRpmFilterConfig2,
    generateRpmFilterConfig1,
    generateRpmFilterConfig2,
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

  async function onSave() {
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
      const config = generateRpmFilterConfig2(notches);
      FC.RPM_FILTER_CONFIG_V2 = config;
    } else {
      const config = generateRpmFilterConfig1(notches);
      FC.RPM_FILTER_CONFIG = config;
    }
  });

  function onRevert() {
    Object.assign(FC.RPM_FILTER_CONFIG, initialState.RPM_FILTER_CONFIG);
    Object.assign(FC.RPM_FILTER_CONFIG_V2, initialState.RPM_FILTER_CONFIG_V2);
    Object.assign(FC.FILTER_CONFIG, initialState.FILTER_CONFIG);
    FC.FEATURE_CONFIG.features.bitfield = initialState.features;
  }

  function onResetNotches() {
    FC.RPM_FILTER_CONFIG = [];
    FC.RPM_FILTER_CONFIG_V2 = [{}, {}, {}];
    parseNotches();
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabGyro"), "_system");
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabGyro")}</h1>
  <div class="grow"></div>
  <button class="help-btn" onclick={onClickHelp}>Help</button>
{/snippet}

{#snippet toolbar()}
  <button onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button onclick={onSave}>{$i18n.t("buttonSaveReboot")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <div class="column">
      <LowpassFilter {FC} />
      <StaticFilter {FC} />
      <DynamicFilter {FC} />
    </div>
    <div class="column">
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
  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    column-gap: var(--section-gap);
    row-gap: var(--section-gap);
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
  }

  button {
    border-radius: 2px;
    padding: 8px;
    transition: var(--animation-speed);

    :global(html[data-theme="light"]) & {
      border: none;
      color: var(--color-neutral-800);
      background-color: var(--color-neutral-300);

      &:hover {
        background-color: var(--color-neutral-200);
      }

      &:active {
        background-color: var(--color-neutral-400);
      }
    }

    :global(html[data-theme="dark"]) & {
      border: none;
      color: var(--color-neutral-900);
      background-color: var(--color-neutral-200);

      &:hover {
        background-color: var(--color-neutral-300);
      }

      &:active {
        background-color: var(--color-neutral-400);
      }
    }
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

    .column {
      gap: 0;
    }
  }

  .grow {
    flex-grow: 1;
  }
</style>

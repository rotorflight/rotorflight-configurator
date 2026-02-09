<script>
  import diff from "microdiff";
  import semver from "semver";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";

  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { FC } from "@/js/fc.svelte.js";
  import { reinitialiseConnection } from "@/js/serial_backend";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import Page from "@/components/Page.svelte";

  import General from "./General.svelte";
  import Filters from "./Filters.svelte";
  import Ramps from "./Ramps.svelte";
  import ThrottleCurve from "./ThrottleCurve.svelte";

  import govState from "./state.svelte.js";

  let loading = $state(true);
  let initialState;

  function snapshotState() {
    return $state.snapshot({
      GOVERNOR: FC.GOVERNOR,
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

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_GOVERNOR_CONFIG);

    await MSP.promise(MSPCodes.MSP_RX_CONFIG);
    await MSP.promise(MSPCodes.MSP_RC_CONFIG);
    await MSP.promise(MSPCodes.MSP_RX_MAP);
    await MSP.promise(MSPCodes.MSP_RX_CHANNELS);

    initialState = snapshotState();
    loading = false;
  });

  export async function onSave() {
    function save(code) {
      return MSP.promise(code, mspHelper.crunch(code));
    }

    await save(MSPCodes.MSP_SET_GOVERNOR_CONFIG);
    await save(MSPCodes.MSP_SET_FEATURE_CONFIG);

    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  export async function onRevert() {
    Object.assign(FC.GOVERNOR, initialState.GOVERNOR);
    FC.FEATURE_CONFIG.features.bitfield = initialState.features;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabGovernor"), "_system");
  }

  export function isDirty() {
    return changes.length > 0;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabGovernor")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>
    {$i18n.t("buttonRevert")}
  </button>
  <button class="btn" onclick={onSave}>
    {$i18n.t("buttonSaveReboot")}
  </button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <div>
      <General />
      {#if govState.govRamps}
        <div transition:slide>
          <Ramps />
        </div>
      {/if}
    </div>
    <div>
      {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9) && govState.enabled}
        <div transition:slide>
          <ThrottleCurve />
        </div>
      {/if}
      {#if govState.enabled && CONFIGURATOR.expertMode}
        <div transition:slide>
          <Filters />
        </div>
      {/if}
    </div>
  </div>
</Page>

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  .fallback-group {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .help-btn {
    padding: 4px 8px;
    min-width: 60px;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }
</style>

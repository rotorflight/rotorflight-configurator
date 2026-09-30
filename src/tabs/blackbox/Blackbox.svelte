<script>
  import diff from "microdiff";
  import { onMount } from "svelte";

  import Page from "@/components/Page.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { reinitialiseConnection } from "@/js/serial_backend.js";

  import Configuration from "./Configuration.svelte";
  import DataflashLogger from "./DataflashLogger.svelte";
  import SdCardLogger from "./SdCardLogger.svelte";

  let loading = $state(true);
  let initialState;

  function snapshotState() {
    return $state.snapshot({
      BLACKBOX: FC.BLACKBOX,
      DEBUG_CONFIG: FC.DEBUG_CONFIG,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }

    return diff(initialState, snapshotState());
  });

  let dirty = $derived(changes.length > 0);
  let showToolbar = $derived(!loading && dirty && FC.BLACKBOX.supported);

  let mscReady = $derived(
    FC.DATAFLASH.totalSize > 0 || FC.SDCARD.state === MSP.SDCARD_STATE_READY,
  );

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_NAME);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG);
    await MSP.promise(MSPCodes.MSP_DATAFLASH_SUMMARY);
    await MSP.promise(MSPCodes.MSP_SDCARD_SUMMARY);
    await MSP.promise(MSPCodes.MSP_BLACKBOX_CONFIG);
    await MSP.promise(MSPCodes.MSP_DEBUG_CONFIG);

    initialState = snapshotState();
    loading = false;
  });

  export async function onSave() {
    await MSP.promise(
      MSPCodes.MSP_SET_DEBUG_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_DEBUG_CONFIG),
    );
    await MSP.promise(
      MSPCodes.MSP_SET_BLACKBOX_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_BLACKBOX_CONFIG),
    );
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  export function onRevert() {
    Object.assign(FC.BLACKBOX, initialState.BLACKBOX);
    Object.assign(FC.DEBUG_CONFIG, initialState.DEBUG_CONFIG);
  }

  export function isDirty() {
    return dirty;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabBlackbox"), "_system");
  }

  function onClickRebootMsc() {
    const type =
      GUI.operating_system === "Linux"
        ? mspHelper.REBOOT_TYPES.MSC_UTC
        : mspHelper.REBOOT_TYPES.MSC;
    MSP.send_message(MSPCodes.MSP_SET_REBOOT, [type], false);
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabBlackbox")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSaveReboot")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  {#if !FC.BLACKBOX.supported && !FC.DATAFLASH.supported}
    <p class="note">{$i18n.t("blackboxNotSupported")}</p>
  {/if}

  {#if FC.BLACKBOX.supported}
    <Configuration />
  {/if}

  <DataflashLogger
    {mscReady}
    onRebootMsc={onClickRebootMsc}
    showMsc={FC.DATAFLASH.supported}
  />
  <SdCardLogger
    {mscReady}
    onRebootMsc={onClickRebootMsc}
    showMsc={!FC.DATAFLASH.supported}
  />
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
    margin-top: var(--section-gap);
    padding: 8px 12px;
    border-radius: var(--radius-sm);

    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-accent);
  }
</style>

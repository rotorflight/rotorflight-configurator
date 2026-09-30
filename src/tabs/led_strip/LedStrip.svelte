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

  import ColorPalette from "./ColorPalette.svelte";
  import Controls from "./Controls.svelte";
  import GlobalSettings from "./GlobalSettings.svelte";
  import Grid from "./Grid.svelte";
  import ModeColors from "./ModeColors.svelte";
  import Wiring from "./Wiring.svelte";
  import { initFromFC, ledState } from "./state.svelte.js";
  import { loadGridFromLedStrip } from "./util.js";

  let loading = $state(true);
  let initialState = $state();

  function snapshotState() {
    return $state.snapshot({
      LED_STRIP: FC.LED_STRIP,
      LED_COLORS: FC.LED_COLORS,
      LED_MODE_COLORS: FC.LED_MODE_COLORS,
      LED_STRIP_CONFIG: FC.LED_STRIP_CONFIG,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) return [];
    return diff(initialState, snapshotState());
  });

  let dirty = $derived(changes.length > 0);
  let showToolbar = $derived(!loading && dirty);

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_LED_STRIP_CONFIG);
    await MSP.promise(MSPCodes.MSP_LED_STRIP_MODECOLOR);
    await MSP.promise(MSPCodes.MSP_LED_COLORS);
    await MSP.promise(MSPCodes.MSP_LED_STRIP_SETTINGS);

    initFromFC();
    initialState = snapshotState();
    loading = false;
  });

  export async function onSave() {
    function send(fn) {
      return new Promise((resolve) => fn(resolve));
    }

    await send(mspHelper.sendLedStripConfig.bind(mspHelper));
    await send(mspHelper.sendLedStripColors.bind(mspHelper));
    await send(mspHelper.sendLedStripModeColors.bind(mspHelper));
    await send(mspHelper.sendLedStripSettings.bind(mspHelper));
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    initialState = snapshotState();
  }

  export function onRevert() {
    const snapshot = $state.snapshot(initialState);
    FC.LED_STRIP = structuredClone(snapshot.LED_STRIP);
    FC.LED_COLORS = structuredClone(snapshot.LED_COLORS);
    FC.LED_MODE_COLORS = structuredClone(snapshot.LED_MODE_COLORS);
    Object.assign(FC.LED_STRIP_CONFIG, snapshot.LED_STRIP_CONFIG);

    ledState.grid = loadGridFromLedStrip(FC.LED_STRIP);
    ledState.selected.clear();
    ledState.wireMode = false;
    ledState.selectedModeColor = null;
  }

  export function isDirty() {
    return dirty;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabLedStrip"), "_system");
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabLedStrip")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSave")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <p class="help">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html $i18n.t("ledStripHelp")}
  </p>

  <div class="layout">
    <div class="grid-col">
      <Grid />
    </div>

    <div class="controls-col">
      <Controls />
      <ModeColors />
      <ColorPalette />
      <Wiring />
      <GlobalSettings />
    </div>
  </div>
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

  .help {
    margin: var(--section-gap) 0 0;
    font-size: 0.8rem;
    color: var(--color-text-soft);
  }

  .layout {
    display: flex;
    flex-wrap: wrap;
    gap: var(--section-gap);
    margin-top: 8px;
    align-items: flex-start;
  }

  .grid-col {
    flex: 1 1 400px;
    max-width: 520px;
  }

  .controls-col {
    flex: 1 1 380px;
    max-width: 480px;
  }
</style>

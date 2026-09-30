<script>
  import diff from "microdiff";
  import { onDestroy, onMount } from "svelte";
  import { SvelteURL } from "svelte/reactivity";
  import { slide } from "svelte/transition";

  import Field from "@/components/Field.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import { DarkTheme } from "@/js/DarkTheme.js";
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { Features } from "@/js/features.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { bit_check, reinitialiseConnection } from "@/js/serial_backend.js";
  import { windowWatcherUtil } from "@/js/utils/window_watchers.js";

  import ChannelAssignment from "./ChannelAssignment/ChannelAssignment.svelte";
  import ChannelRange from "./ChannelRange.svelte";
  import ModelPreview from "./ModelPreview.svelte";
  import ReceiverType from "./ReceiverType.svelte";
  import TelemetrySensors from "./TelemetrySensors/TelemetrySensors.svelte";
  import TelemetrySettings from "./TelemetrySettings.svelte";
  import {
    EXTERNAL_TELEMETRY_PROTOCOLS,
    RX_PROTOCOLS,
    TelemetryType,
  } from "./protocols.js";

  let loading = $state(true);
  let initialState;
  let sensorUpdateIntervalId;
  let backupRxPollerIntervalId;

  function snapshotState() {
    return $state.snapshot({
      RC_MAP: FC.RC_MAP,
      RSSI_CONFIG: FC.RSSI_CONFIG,
      RC_CONFIG: FC.RC_CONFIG,
      RX_CONFIG: FC.RX_CONFIG,
      TELEMETRY_CONFIG: FC.TELEMETRY_CONFIG,
      RX_INPUT_BACKUP_CONFIG: FC.RX_INPUT_BACKUP_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }

    return diff(initialState, snapshotState());
  });

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_RX_CONFIG);
    await MSP.promise(MSPCodes.MSP_RX_MAP);
    await MSP.promise(MSPCodes.MSP_RC_CONFIG);
    await MSP.promise(MSPCodes.MSP_RC_TUNING);
    await MSP.promise(MSPCodes.MSP_RSSI_CONFIG);
    await MSP.promise(MSPCodes.MSP_SERIAL_CONFIG);
    await MSP.promise(MSPCodes.MSP_TELEMETRY_CONFIG);
    await MSP.promise(MSPCodes.MSP_RC);

    initialState = snapshotState();
    loading = false;

    sensorUpdateIntervalId = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RX_CHANNELS);
      await MSP.promise(MSPCodes.MSP_RC_COMMAND);
      await MSP.promise(MSPCodes.MSP_ANALOG);
    }, 25);

    if (hasBackupRxPort) {
      await MSP.promise(MSPCodes.MSP2_GET_RX_INPUT_BACKUP_CONFIG);
    }

    // Polled unconditionally, not just when hasBackupRxPort - mainLinkUp
    // (the primary RX's own live signal state) is shown in the Serial RX #1
    // box regardless of whether a backup port is configured at all; the
    // backup-specific fields just stay at their disabled/empty defaults when
    // it isn't.
    await MSP.promise(MSPCodes.MSP2_GET_RX_INPUT_BACKUP_STATUS);
    // 200ms rather than the 25ms main-channel poll above - this only needs to
    // look live for a status badge, not drive a hot loop always.
    backupRxPollerIntervalId = setInterval(() => {
      MSP.promise(MSPCodes.MSP2_GET_RX_INPUT_BACKUP_STATUS);
    }, 200);

    // initialState is snapshotted above before this block runs, so re-snapshot
    // now that RX_INPUT_BACKUP_CONFIG has actually been fetched - otherwise
    // isDirty()/onRevert() would compare against the pre-fetch default values
    // for a tab that hadn't even loaded its own config yet.
    initialState = snapshotState();
  });

  onDestroy(() => {
    clearInterval(sensorUpdateIntervalId);
    clearInterval(backupRxPollerIntervalId);
  });

  export async function onSave() {
    function save(code) {
      return MSP.promise(code, mspHelper.crunch(code));
    }

    await save(MSPCodes.MSP_SET_RX_MAP);
    await save(MSPCodes.MSP_SET_RX_CONFIG);
    await save(MSPCodes.MSP_SET_RC_CONFIG);
    await save(MSPCodes.MSP_SET_RSSI_CONFIG);
    await save(MSPCodes.MSP_SET_TELEMETRY_CONFIG);
    await save(MSPCodes.MSP_SET_FEATURE_CONFIG);
    if (hasBackupRxPort) {
      await save(MSPCodes.MSP2_SET_RX_INPUT_BACKUP_CONFIG);
    }

    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  export function onRevert() {
    Object.assign(FC.RC_MAP, initialState.RC_MAP);
    Object.assign(FC.RSSI_CONFIG, initialState.RSSI_CONFIG);
    Object.assign(FC.RC_CONFIG, initialState.RC_CONFIG);
    Object.assign(FC.RX_CONFIG, initialState.RX_CONFIG);
    Object.assign(FC.TELEMETRY_CONFIG, initialState.TELEMETRY_CONFIG);
    Object.assign(
      FC.RX_INPUT_BACKUP_CONFIG,
      initialState.RX_INPUT_BACKUP_CONFIG,
    );
    FC.FEATURE_CONFIG.features.bitfield = initialState.features;
  }

  export function isDirty() {
    return changes.length > 0;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabReceiver"), "_system");
  }

  let showBindButton = $derived(
    bit_check(
      FC.CONFIG.targetCapabilities,
      FC.TARGET_CAPABILITIES_FLAGS.SUPPORTS_RX_BIND,
    ),
  );

  // TODO: Check gui is nwjs
  let showSticksButton = $derived(FC.FEATURE_CONFIG.features.RX_MSP);

  let showToolbar = $derived(
    !loading && (changes.length > 0 || showSticksButton || showBindButton),
  );

  const SERIALRX_FUNCTION = 64;
  let hasSerialRxPort = $derived(
    FC.SERIAL_CONFIG.ports.some(
      (port) => port.functionMask & SERIALRX_FUNCTION,
    ),
  );

  // Serial Rx (Backup) - see FUNCTION_RX_INPUT_BACKUP in rotorflight-firmware.
  // No dedicated feature bit, same as SERIALRX_FUNCTION above: the port assignment
  // itself is the enablement.
  const RX_INPUT_BACKUP_FUNCTION = 8388608;
  let hasBackupRxPort = $derived(
    FC.SERIAL_CONFIG.ports.some(
      (port) => port.functionMask & RX_INPUT_BACKUP_FUNCTION,
    ),
  );
  let backupRxStatus = $derived(
    FC.RX_INPUT_BACKUP_STATUS ?? {
      enabled: false,
      mainLinkUp: null,
      provider: 0,
      linkUp: false,
      activeSource: "main",
      channels: [],
    },
  );

  // Keep in sync with rotorflight-firmware's cli/settings.c
  // lookupTableRxInputBackupProvider[] (same order, NONE=0 first) - this
  // array's index must match the firmware enum. Display text matches
  // RX_PROTOCOLS' own naming (./protocols.js) for the same protocols, so the
  // two dropdowns read consistently rather than one using full names and the
  // other short codes.
  const RX_INPUT_BACKUP_PROVIDER_NAMES = [
    "None",
    "Futaba S.BUS",
    "FrSky FBUS",
    "FrSky F.PORT",
    "FrSky F.PORT2",
    "Jeti EXBUS",
    "TBS CRSF",
  ];

  let extTelemProto = $derived.by(() => {
    for (const proto of EXTERNAL_TELEMETRY_PROTOCOLS) {
      for (const port of FC.SERIAL_CONFIG.ports) {
        if (port.functionMask & proto.id) {
          return proto;
        }
      }
    }
  });

  let rxFeature = $derived.by(() => {
    // only one rx proto feature should be enabled
    for (const f of Features.GROUPS.RX_PROTO) {
      if (FC.FEATURE_CONFIG.features[f]) {
        return f;
      }
    }
  });

  // find active rx protocol
  let rxProtoIndex = $derived.by(() => {
    if (!rxFeature) {
      return 0;
    }

    for (let i = 1; i < RX_PROTOCOLS.length; i++) {
      const proto = RX_PROTOCOLS[i];
      if (proto.feature !== rxFeature) {
        continue;
      }

      if (
        rxFeature === "RX_SERIAL" &&
        (proto.id !== FC.RX_CONFIG.serialrx_provider || !hasSerialRxPort)
      ) {
        continue;
      }

      if (rxFeature === "RX_SPI" && proto.id !== FC.RX_CONFIG.rxSpiProtocol) {
        continue;
      }

      return i;
    }
  });

  let rxProto = $derived(RX_PROTOCOLS[rxProtoIndex]);

  let telemetry = $derived(extTelemProto?.telemetry ?? rxProto?.telemetry);

  const telemetryCache = {};
  function resetTelemetry(fromProto) {
    if (fromProto && fromProto.type !== TelemetryType.TOGGLE) {
      if (!telemetryCache[fromProto.type]) {
        telemetryCache[fromProto.type] = {};
      }

      // cache current telemetry
      telemetryCache[fromProto.type][fromProto.proto] = {
        telemetry_sensors: FC.TELEMETRY_CONFIG.telemetry_sensors,
        telemetry_sensors_list: $state.snapshot(
          FC.TELEMETRY_CONFIG.telemetry_sensors_list,
        ),
      };
    }

    if (telemetry && telemetry.type !== TelemetryType.TOGGLE) {
      // load cached telemetry
      const cachedTelemetry = telemetryCache[telemetry.type]?.[telemetry.proto];
      if (cachedTelemetry) {
        Object.assign(FC.TELEMETRY_CONFIG, cachedTelemetry);
        return;
      }
    }

    FC.TELEMETRY_CONFIG.telemetry_sensors = 0;
    FC.TELEMETRY_CONFIG.telemetry_sensors_list = [];
  }

  function setRxProto(i) {
    const usingExtTelem = !!extTelemProto;
    const currentProto = rxProto;
    const newRxProto = RX_PROTOCOLS[i];
    FC.FEATURE_CONFIG.features.setGroup("RX_PROTO", false);
    if (newRxProto.feature) {
      FC.FEATURE_CONFIG.features.setFeature(newRxProto.feature, true);
    }

    if (newRxProto.feature === "RX_SERIAL") {
      FC.RX_CONFIG.serialrx_provider = newRxProto.id;
    } else if (newRxProto.feature === "RX_SPI") {
      FC.RX_CONFIG.rxSpiProtocol = newRxProto.id;
    }

    if (!usingExtTelem) {
      resetTelemetry(currentProto.telemetry);
    }
  }

  // Given to the virtual receiver window so it can send channels (it can't
  // see this window's objects otherwise).
  function setRawRx(channels) {
    if (
      CONFIGURATOR.connectionValid &&
      !["cli", "presets"].includes(GUI.active_tab)
    ) {
      const data = [];
      FC.RC_MAP.forEach((axis, channel) => {
        data[axis] = channels[channel];
      });
      mspHelper.setRawRx(data);
      return true;
    } else {
      return false;
    }
  }

  function showVirtualTx() {
    const windowWidth = 370;
    const windowHeight = 510;

    if (__BACKEND__ === "web") {
      // A plain popup. Whatever is set on it now is lost when its page
      // loads, so it collects what it needs from window.opener instead (see
      // src/js/tabs/receiver_msp.js).
      window.receiverMspBridge = {
        setRawRx,
        translate: (key) => $i18n.t(key),
      };
      DarkTheme.isDarkThemeEnabled((isEnabled) => {
        window.receiverMspBridge.darkTheme = isEnabled;
      });
      window.open(
        new URL("src/tabs/receiver_msp.html", document.baseURI).toString(),
        "receiver_msp",
        `popup,width=${windowWidth},height=${windowHeight}`,
      );
      return;
    }

    // use a fully qualified url so nw doesn't look on the filesystem
    // when using the vite dev server
    const location = new SvelteURL(window.location.href);
    location.pathname = "/src/tabs/receiver_msp.html";
    nw.Window.open(
      location.toString(),
      {
        id: "receiver_msp",
        always_on_top: true,
        max_width: windowWidth,
        max_height: windowHeight,
      },
      function (createdWindow) {
        createdWindow.resizeTo(windowWidth, windowHeight);

        // Give the window a callback it can use to send the channels (otherwise it can't see those objects)
        createdWindow.window.setRawRx = setRawRx;

        // the window has no localisation of its own
        windowWatcherUtil.passValue(createdWindow.window, "translate", (key) =>
          $i18n.t(key),
        );

        DarkTheme.isDarkThemeEnabled(function (isEnabled) {
          windowWatcherUtil.passValue(
            createdWindow.window,
            "darkTheme",
            isEnabled,
          );
        });
      },
    );
  }

  function onBind() {
    MSP.send_message(MSPCodes.MSP2_BETAFLIGHT_BIND);
    GUI.log($i18n.t("receiverButtonBindMessage"));
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabReceiver")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  {#if showSticksButton}
    <button class="btn" onclick={showVirtualTx}
      >{$i18n.t("receiverButtonSticks")}</button
    >
  {/if}
  {#if showBindButton}
    <button class="btn" onclick={onBind}>{$i18n.t("receiverButtonBind")}</button
    >
  {/if}
  {#if changes.length > 0}
    <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
    <button class="btn" onclick={onSave}>
      {$i18n.t("buttonSaveReboot")}
    </button>
  {/if}
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <div>
      <ReceiverType
        {rxProtoIndex}
        {hasSerialRxPort}
        {setRxProto}
        mainLinkUp={backupRxStatus.mainLinkUp}
        {hasBackupRxPort}
        backupActive={backupRxStatus.activeSource === "backup"}
      />
      {#if hasBackupRxPort}
        {#snippet backupConfigHeader()}
          <div class="section-header">
            <span class="title">{$i18n.t("tabRxInputBackupConfig")}</span>
            <div class="grow"></div>
            <span
              class="badge"
              class:up={backupRxStatus.linkUp}
              class:down={!backupRxStatus.linkUp}
            >
              {backupRxStatus.linkUp
                ? $i18n.t("rxInputBackupStatusLinkUp")
                : $i18n.t("rxInputBackupStatusLinkDown")}
            </span>
            <span
              class="badge"
              class:active={backupRxStatus.activeSource === "backup"}
            >
              {backupRxStatus.activeSource === "backup"
                ? $i18n.t("rxInputBackupStatusActiveBackup")
                : $i18n.t("rxInputBackupStatusActiveMain")}
            </span>
          </div>
        {/snippet}
        <Section header={backupConfigHeader}>
          <SubSection>
            <Field id="backup-rx-provider" label="receiverBackupRxProvider">
              <select
                id="backup-rx-provider"
                bind:value={FC.RX_INPUT_BACKUP_CONFIG.provider}
              >
                {#each RX_INPUT_BACKUP_PROVIDER_NAMES as name, i (name)}
                  <option value={i}>{name}</option>
                {/each}
              </select>
            </Field>
          </SubSection>
          <SubSection label="receiverBackupRxSignaling">
            <Field id="backup-rx-inverted" label="receiverBackupRxInverted">
              {#snippet tooltip()}
                <Tooltip help="receiverBackupRxInvertedHelp" />
              {/snippet}
              <Switch
                id="backup-rx-inverted"
                bind:checked={FC.RX_INPUT_BACKUP_CONFIG.inverted}
              />
            </Field>
            <Field id="backup-rx-halfduplex" label="receiverBackupRxHalfDuplex">
              {#snippet tooltip()}
                <Tooltip help="receiverBackupRxHalfDuplexHelp" />
              {/snippet}
              <Switch
                id="backup-rx-halfduplex"
                bind:checked={FC.RX_INPUT_BACKUP_CONFIG.halfDuplex}
              />
            </Field>
            <Field id="backup-rx-pinswap" label="receiverBackupRxPinSwap">
              {#snippet tooltip()}
                <Tooltip help="receiverBackupRxPinSwapHelp" />
              {/snippet}
              <Switch
                id="backup-rx-pinswap"
                bind:checked={FC.RX_INPUT_BACKUP_CONFIG.pinSwap}
              />
            </Field>
          </SubSection>
        </Section>
      {/if}
      <ChannelRange />
      {#if telemetry}
        <div transition:slide>
          <TelemetrySettings {telemetry} {resetTelemetry} />
        </div>
        {#if FC.FEATURE_CONFIG.features.TELEMETRY && telemetry.type !== TelemetryType.TOGGLE}
          <div transition:slide|global>
            <TelemetrySensors {telemetry} />
          </div>
        {/if}
      {/if}
    </div>
    <div>
      <ChannelAssignment />
      <ModelPreview />
    </div>
  </div>
</Page>

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  /* Custom Section header (badges live here, not in the body) - replicates
     %section-header (_global.scss) plus a right-aligned badge row, kept
     compact rather than adding a separate summary line below the title.
     Mirrors ReceiverType.svelte's own identical block for its RX #1 header. */
  .section-header {
    @extend %section-header;

    padding-right: 8px;
    gap: 8px;
  }

  .title {
    padding-left: 8px;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  .badge.up {
    color: var(--color-border-accent);
    border-color: var(--color-border-accent);
  }

  /* "active" here means the backup link is the one currently driving the
     aircraft (main link down) -- worth calling out the same way "down" is. */
  .badge.down,
  .badge.active {
    color: var(--color-danger, var(--color-border-accent));
    border-color: var(--color-danger, var(--color-border-accent));
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

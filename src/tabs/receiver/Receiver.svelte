<script>
  import diff from "microdiff";
  import { onDestroy, onMount } from "svelte";
  import { SvelteURL } from "svelte/reactivity";
  import { slide } from "svelte/transition";

  import Page from "@/components/Page.svelte";

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
  // $state, not a plain let: `changes` below reads this inside an early
  // return (`if (!initialState) return [];`) that touches nothing else
  // reactive. A plain variable's reassignment isn't a tracked dependency in
  // runes mode, so if `changes` is ever first evaluated before onMount sets
  // this, its $derived.by would memoize at [] permanently - reassigning
  // initialState later wouldn't be a change any tracked dependency saw, so
  // it would never recompute again regardless of later edits. $state makes
  // the assignment itself a tracked dependency. This mattered less before
  // `changes` fed a prop (hasUnsavedChanges below) into ReceiverType's own
  // Detect Wiring guard - now a stale-empty `changes` would silently let the
  // wizard run against unsaved state.
  let initialState = $state();
  let sensorUpdateTimer;
  let armedPollerTimer;
  let pollersStopped = false;
  let receiverTypeRef;

  function snapshotState() {
    return $state.snapshot({
      RC_MAP: FC.RC_MAP,
      RSSI_CONFIG: FC.RSSI_CONFIG,
      RC_CONFIG: FC.RC_CONFIG,
      RX_CONFIG: FC.RX_CONFIG,
      TELEMETRY_CONFIG: FC.TELEMETRY_CONFIG,
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

    // Self-rescheduling (setTimeout that re-arms only after the previous
    // round finishes), not setInterval with an async body. setInterval fires
    // on a fixed wall-clock schedule regardless of whether the previous
    // callback's awaits have resolved - on a real (non-instant) serial link,
    // 3 sequential MSP round-trips can exceed even a 25ms period, so ticks
    // start overlapping: each overlap opens a fresh in-flight request for a
    // different MSP code (MSP.send_message only dedupes a second request for
    // a code already queued, not different codes), so the backlog of
    // outstanding requests only grows over time and can flood the link badly
    // enough to starve the wiring-detect wizard's own poll of ever getting a
    // timely response.
    async function pollSensors() {
      if (pollersStopped) return;
      await MSP.promise(MSPCodes.MSP_RX_CHANNELS);
      await MSP.promise(MSPCodes.MSP_RC_COMMAND);
      await MSP.promise(MSPCodes.MSP_ANALOG);
      if (!pollersStopped) {
        sensorUpdateTimer = setTimeout(pollSensors, 25);
      }
    }
    pollSensors();

    // Separate, much slower poll for `armed` rather than folding it into the
    // loop above - it doesn't need anywhere near 25ms freshness for a UI
    // gate, so it gets its own light cadence instead of riding along on the
    // hot one.
    async function pollArmed() {
      if (pollersStopped) return;
      await MSP.promise(MSPCodes.MSP_STATUS);
      if (!pollersStopped) {
        armedPollerTimer = setTimeout(pollArmed, 1000);
      }
    }
    pollArmed();
  });

  onDestroy(() => {
    pollersStopped = true;
    clearTimeout(sensorUpdateTimer);
    clearTimeout(armedPollerTimer);
    receiverTypeRef?.cleanup();
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

  // The RX wiring trial cycles the live receiver connection, so
  // ReceiverType.svelte needs this to refuse to even open its Detect Wiring
  // wizard while armed, on top of the firmware's own ARMING_FLAG(ARMED)
  // rejection.
  let armed = $derived(bit_check(FC.CONFIG.mode, FC.AUX_CONFIG.indexOf("ARM")));

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
        bind:this={receiverTypeRef}
        {rxProtoIndex}
        {hasSerialRxPort}
        {setRxProto}
        onSaveRequested={onSave}
        hasUnsavedChanges={changes.length > 0}
        {armed}
      />
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

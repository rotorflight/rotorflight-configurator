<script>
  import diff from "microdiff";
  import { onMount } from "svelte";
  import { FC } from "@/js/fc.svelte.js";
  import { Features } from "@/js/features.svelte";
  import ReceiverSettings from "./ReceiverSettings.svelte";
  import ReceiverType from "./ReceiverType.svelte";
  import TelemetrySettings from "./TelemetrySettings.svelte";
  import TelemetrySensors from "./TelemetrySensors/TelemetrySensors.svelte";
  import {
    TelemetryType,
    RX_PROTOCOLS,
    EXTERNAL_TELEMETRY_PROTOCOLS,
  } from "./protocols.js";

  let { onchange } = $props();

  let initialState;

  function snapshotState() {
    return $state.snapshot({
      rc: FC.RC_CONFIG,
      rx: FC.RX_CONFIG,
      telemetry: FC.TELEMETRY_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  }

  onMount(() => {
    initialState = snapshotState();
  });

  $effect(() => {
    const changes = diff(initialState, snapshotState());
    if (changes.length > 0) {
      onchange?.();
    }
  });

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

    // load cached telemetry
    const cachedTelemetry = telemetryCache[telemetry.type]?.[telemetry.proto];
    if (cachedTelemetry) {
      Object.assign(FC.TELEMETRY_CONFIG, cachedTelemetry);
    } else {
      FC.TELEMETRY_CONFIG.telemetry_sensors = 0;
      FC.TELEMETRY_CONFIG.telemetry_sensors_list = [];
    }
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

    if (currentProto.telemetry && !usingExtTelem) {
      resetTelemetry(currentProto.telemetry);
    }
  }
</script>

<div class="container">
  <ReceiverType {FC} {rxProtoIndex} {hasSerialRxPort} {setRxProto} />
  <ReceiverSettings {FC} />
  {#if telemetry}
    <TelemetrySettings {FC} {telemetry} {resetTelemetry} />
    {#if FC.FEATURE_CONFIG.features.TELEMETRY && telemetry.type !== TelemetryType.TOGGLE}
      <TelemetrySensors {FC} {telemetry} />
    {/if}
  {/if}
</div>

<style lang="scss">
  .container {
    > :global(*) + :global(*) {
      margin-top: 24px;
    }
  }
</style>

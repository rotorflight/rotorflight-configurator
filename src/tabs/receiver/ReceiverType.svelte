<script>
  import semver from "semver";
  import { API_VERSION_12_7 } from "@/js/data_storage.js";
  import Switch from "@/components/Switch.svelte";
  import Field from "@/components/Field.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Section from "@/components/Section.svelte";
  import { RX_PROTOCOLS } from "./protocols.js";

  let {
    FC = $bindable(),
    rxProtoIndex,
    hasSerialRxPort,
    extTelemProto,
  } = $props();
</script>

<Section label="receiverSelection">
  <SubSection>
    <Field id="receiver-protocol" label="receiverProtocol">
      <select
        id="receiver-protocol"
        bind:value={
          () => rxProtoIndex,
          (i) => {
            const rxProto = RX_PROTOCOLS[i];
            FC.FEATURE_CONFIG.features.setGroup("RX_PROTO", false);
            if (rxProto.feature) {
              FC.FEATURE_CONFIG.features.setFeature(rxProto.feature, true);
            }

            if (rxProto.feature === "RX_SERIAL") {
              FC.RX_CONFIG.serialrx_provider = rxProto.id;
            } else if (rxProto.feature === "RX_SPI") {
              FC.RX_CONFIG.rxSpiProtocol = rxProto.id;
            }

            if (!extTelemProto) {
              FC.TELEMETRY_CONFIG.telemetry_sensors = 0;
              FC.TELEMETRY_CONFIG.telemetry_sensors_list.fill(0);
            }
          }
        }
      >
        {#each RX_PROTOCOLS as proto, i}
          <!-- always show selected protocol -->
          {#if !proto.hide || rxProtoIndex === i}
            <option
              value={i}
              disabled={proto.feature === "RX_SERIAL" && !hasSerialRxPort}
            >
              {proto.name}
            </option>
          {/if}
        {/each}
      </select>
    </Field>
  </SubSection>
  {#if RX_PROTOCOLS[rxProtoIndex]?.feature === "RX_SERIAL"}
    <SubSection label="Signaling">
      <Field id="receiver-serialrx-inverted" label="receiverSerialInverted">
        {#snippet tooltip()}
          <Tooltip help="receiverSerialInvertedHelp" />
        {/snippet}
        <Switch
          id="receiver-serialrx-inverted"
          bind:checked={FC.RX_CONFIG.serialrx_inverted}
        />
      </Field>
      <Field id="receiver-serialrx-halfduplex" label="receiverSerialHalfDuplex">
        {#snippet tooltip()}
          <Tooltip help="receiverSerialHalfDuplexHelp" />
        {/snippet}
        <Switch
          id="receiver-serialrx-halfduplex"
          bind:checked={FC.RX_CONFIG.serialrx_halfduplex}
        />
      </Field>
      {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)}
        <Field id="receiver-serialrx-pinswap" label="receiverSerialPinSwap">
          {#snippet tooltip()}
            <Tooltip help="receiverSerialPinSwapHelp" />
          {/snippet}
          <Switch
            id="receiver-serialrx-pinswap"
            bind:checked={FC.RX_CONFIG.serialrx_pinswap}
          />
        </Field>
      {/if}
    </SubSection>
  {/if}
</Section>

<style lang="scss">
  select {
    min-width: 180px;
  }
</style>

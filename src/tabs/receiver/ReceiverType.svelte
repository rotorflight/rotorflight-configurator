<script>
  import semver from "semver";
  import { slide } from "svelte/transition";
  import { API_VERSION_12_7 } from "@/js/configurator.svelte.js";
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
    setRxProto,
  } = $props();
</script>

<Section label="receiverSelection">
  <SubSection>
    <Field id="receiver-protocol" label="receiverProtocol">
      <select
        id="receiver-protocol"
        bind:value={() => rxProtoIndex, setRxProto}
      >
        {#each RX_PROTOCOLS as proto, i (proto.name)}
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
    <div transition:slide>
      <SubSection label="receiverSelectionSectionSignaling">
        <Field id="receiver-serialrx-inverted" label="receiverSerialInverted">
          {#snippet tooltip()}
            <Tooltip help="receiverSerialInvertedHelp" />
          {/snippet}
          <Switch
            id="receiver-serialrx-inverted"
            bind:checked={FC.RX_CONFIG.serialrx_inverted}
          />
        </Field>
        <Field
          id="receiver-serialrx-halfduplex"
          label="receiverSerialHalfDuplex"
        >
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
    </div>
  {/if}
</Section>

<style lang="scss">
  select {
    min-width: 180px;
  }
</style>

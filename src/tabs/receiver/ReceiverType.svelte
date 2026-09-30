<script>
  import semver from "semver";
  import { slide } from "svelte/transition";

  import Field from "@/components/Field.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import { API_VERSION_12_7 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import { RX_PROTOCOLS } from "./protocols.js";

  let {
    rxProtoIndex,
    hasSerialRxPort,
    setRxProto,
    mainLinkUp,
    hasBackupRxPort,
    backupActive,
  } = $props();
</script>

{#snippet header()}
  <div class="section-header">
    <span class="title">{$i18n.t("receiverSelection")}</span>
    <div class="grow"></div>
    {#if mainLinkUp !== null}
      <span class="badge" class:up={mainLinkUp} class:down={!mainLinkUp}>
        {mainLinkUp
          ? $i18n.t("rxInputBackupStatusLinkUp")
          : $i18n.t("rxInputBackupStatusLinkDown")}
      </span>
      {#if hasBackupRxPort}
        <span class="badge" class:active={backupActive}>
          {backupActive
            ? $i18n.t("rxInputBackupStatusActiveBackup")
            : $i18n.t("rxInputBackupStatusActiveMain")}
        </span>
      {/if}
    {/if}
  </div>
{/snippet}

<Section {header}>
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

  /* Custom Section header (badges live here, not in the body) - replicates
     %section-header (_global.scss) plus a right-aligned badge row, kept
     compact rather than adding a separate summary line below the title.
     Mirrors Receiver.svelte's own identical block for the RX #2 header. */
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
</style>

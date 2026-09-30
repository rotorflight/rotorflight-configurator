<script>
  import semver from "semver";
  import { mount, unmount } from "svelte";
  import { slide } from "svelte/transition";

  import Field from "@/components/Field.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import { API_VERSION_12_7 } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import RxWiringDetectWizard from "./RxWiringDetectWizard.svelte";
  import { RX_PROTOCOLS } from "./protocols.js";

  let {
    rxProtoIndex,
    hasSerialRxPort,
    setRxProto,
    onSaveRequested,
    hasUnsavedChanges,
    armed,
  } = $props();

  let wizardDisabled = $state(false);
  let wizardInstance = null;

  function closeWizard() {
    if (!wizardInstance) return;
    const instance = wizardInstance;
    wizardInstance = null;
    unmount(instance);
  }

  function onClickDetectWiring() {
    closeWizard();

    // Snapshotted so a detection the user doesn't actually keep (closes the
    // wizard instead of using its Save & Reboot) can be discarded rather
    // than leaving the tab permanently dirty.
    const before = {
      inverted: FC.RX_CONFIG.serialrx_inverted,
      halfDuplex: FC.RX_CONFIG.serialrx_halfduplex,
      pinSwap: FC.RX_CONFIG.serialrx_pinswap,
    };
    let applied = false;
    let saved = false;

    wizardInstance = mount(RxWiringDetectWizard, {
      target: document.body,
      props: {
        onDetected: (inverted, halfDuplex, pinSwap) => {
          applied = true;
          FC.RX_CONFIG.serialrx_inverted = inverted;
          FC.RX_CONFIG.serialrx_halfduplex = halfDuplex;
          FC.RX_CONFIG.serialrx_pinswap = pinSwap;
        },
        onButtonDisabled: (v) => (wizardDisabled = v),
        onClose: () => {
          if (applied && !saved) {
            FC.RX_CONFIG.serialrx_inverted = before.inverted;
            FC.RX_CONFIG.serialrx_halfduplex = before.halfDuplex;
            FC.RX_CONFIG.serialrx_pinswap = before.pinSwap;
          }
          closeWizard();
        },
        onSaveRequested: () => {
          saved = true;
          onSaveRequested?.();
        },
      },
    });
  }

  // Called by Receiver.svelte on unmount/revert - the wizard lives outside
  // this component's own tree (mounted to <body>), so it isn't torn down
  // automatically when this component is.
  export function cleanup() {
    wizardInstance?.stop();
    closeWizard();
  }
</script>

{#snippet wiringDetectActions()}
  <div class="wiring-detect">
    <button
      class="btn"
      disabled={wizardDisabled || hasUnsavedChanges || armed}
      title={armed
        ? $i18n.t("receiverWiringDetectArmedFirst")
        : hasUnsavedChanges
          ? $i18n.t("receiverWiringDetectSaveFirst")
          : undefined}
      onclick={onClickDetectWiring}
    >
      {$i18n.t("receiverWiringDetectButton")}
    </button>
    <HelpIcon>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("receiverWiringDetectHelp")}
    </HelpIcon>
  </div>
{/snippet}

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
      <SubSection
        label="receiverSelectionSectionSignaling"
        actions={wiringDetectActions}
      >
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

  .wiring-detect {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .btn {
    @extend %button;

    padding: 4px 8px;
  }
</style>

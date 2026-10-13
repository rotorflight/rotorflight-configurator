<script>
  import semver from "semver";
  import { mount, unmount } from "svelte";
  import { slide } from "svelte/transition";

  import Field from "@/components/Field.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  import {
    API_VERSION_12_7,
    API_VERSION_12_8,
  } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import EscWiringDetectWizard from "./EscWiringDetectWizard.svelte";
  import motorState from "./state.svelte.js";

  let { onSaveRequested, hasUnsavedChanges, armed } = $props();

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
      halfDuplex: FC.ESC_SENSOR_CONFIG.half_duplex,
      pinSwap: FC.ESC_SENSOR_CONFIG.pinswap,
    };
    let applied = false;
    let saved = false;

    wizardInstance = mount(EscWiringDetectWizard, {
      target: document.body,
      props: {
        onDetected: (halfDuplex, pinSwap) => {
          applied = true;
          FC.ESC_SENSOR_CONFIG.half_duplex = halfDuplex;
          FC.ESC_SENSOR_CONFIG.pinswap = pinSwap;
        },
        onButtonDisabled: (v) => (wizardDisabled = v),
        onClose: () => {
          if (applied && !saved) {
            FC.ESC_SENSOR_CONFIG.half_duplex = before.halfDuplex;
            FC.ESC_SENSOR_CONFIG.pinswap = before.pinSwap;
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

  // Called by Motors.svelte on unmount/revert - the wizard lives outside
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
      disabled={wizardDisabled ||
        motorState.isSrxl2 ||
        motorState.overrideEnabled ||
        hasUnsavedChanges ||
        armed}
      title={armed
        ? $i18n.t("motorsEscWiringDetectArmedFirst")
        : hasUnsavedChanges
          ? $i18n.t("motorsEscWiringDetectSaveFirst")
          : undefined}
      onclick={onClickDetectWiring}
    >
      {$i18n.t("motorsEscWiringDetectButton")}
    </button>
    <HelpIcon>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("motorsEscWiringDetectHelp")}
    </HelpIcon>
  </div>
{/snippet}

<Section label="motorsEscTelemetry">
  {#if !motorState.isCastleLink}
    <div transition:slide>
      <SubSection>
        <Field id="esc-telemetry-protocol" label="motorsEscTelemetryProtocol">
          {#snippet tooltip()}
            <Tooltip help="motorsEscTelemetryProtocolHelp" />
          {/snippet}
          <select
            id="esc-telemetry-protocol"
            bind:value={FC.ESC_SENSOR_CONFIG.protocol}
          >
            {#each motorState.telemetryProtocols as proto, index (proto)}
              <option value={index}>{proto}</option>
            {/each}
          </select>
        </Field>
      </SubSection>
    </div>
  {/if}
  {#if motorState.telemEnabled && motorState.hasTelemPort}
    <div transition:slide>
      <SubSection label="motorsSectionSignaling" actions={wiringDetectActions}>
        <Field
          id="esc-telemetry-half-duplex"
          label="motorsEscTelemetryHalfDuplex"
        >
          {#snippet tooltip()}
            <Tooltip help="motorsEscTelemetryHalfDuplexHelp" />
          {/snippet}
          <Switch
            id="esc-telemetry-half-duplex"
            bind:checked={FC.ESC_SENSOR_CONFIG.half_duplex}
          />
        </Field>

        {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)}
          <Field id="esc-telemetry-pinswap" label="motorsEscTelemetryPinswap">
            {#snippet tooltip()}
              <Tooltip help="motorsEscTelemetryPinswapHelp" />
            {/snippet}
            <Switch
              id="esc-telemetry-pinswap"
              bind:checked={FC.ESC_SENSOR_CONFIG.pinswap}
            />
          </Field>
        {/if}
      </SubSection>
    </div>
  {/if}
  {#if motorState.telemEnabled && semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)}
    <div transition:slide>
      <SubSection label="motorsSectionSensorCorrection">
        <Field id="voltage-correction" label="motorsVoltageCorrection" unit="%">
          {#snippet tooltip()}
            <Tooltip
              help="motorsVoltageCorrectionHelp"
              attrs={[
                { name: "genericDefault", value: "0%" },
                { name: "genericRange", value: "-100% - 125%" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="voltage-correction"
            min="-100"
            max="125"
            bind:value={FC.ESC_SENSOR_CONFIG.voltage_correction}
          />
        </Field>
        <Field id="current-correction" label="motorsCurrentCorrection" unit="%">
          {#snippet tooltip()}
            <Tooltip
              help="motorsCurrentCorrectionHelp"
              attrs={[
                { name: "genericDefault", value: "0%" },
                { name: "genericRange", value: "-100% - 125%" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="current-correction"
            min="-100"
            max="125"
            bind:value={FC.ESC_SENSOR_CONFIG.current_correction}
          />
        </Field>
        <Field
          id="consumption-correction"
          label="motorsConsumptionCorrection"
          unit="%"
        >
          {#snippet tooltip()}
            <Tooltip
              help="motorsConsumptionCorrectionHelp"
              attrs={[
                { name: "genericDefault", value: "0%" },
                { name: "genericRange", value: "-100% - 125%" },
              ]}
            />
          {/snippet}
          <NumberInput
            id="consumption-correction"
            min="-100"
            max="125"
            bind:value={FC.ESC_SENSOR_CONFIG.consumption_correction}
          />
        </Field>
      </SubSection>
    </div>
  {/if}
</Section>

<style lang="scss">
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

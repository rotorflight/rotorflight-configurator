<script>
  import { getContext, mount, onDestroy, onMount, unmount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import {
    PORT_NAMES_RF2,
    UART_NAMES,
    VCP_PORT_IDENTIFIER,
    getPortFunc,
  } from "@/tabs/configuration/util.js";
  import EscWiringDetectWizard from "@/tabs/motors/EscWiringDetectWizard.svelte";
  import motorState from "@/tabs/motors/state.svelte.js";

  import EscArt from "./EscArt.svelte";

  const wiz = getContext("setupWizard");

  const ESC_SENSOR_FUNCTION = 1024;
  const POLL_MS = 250;

  let changed = $state(false);
  let pollTimer;
  let stopped = false;

  onMount(() => {
    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY);
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    }
    poll();
  });

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
    detectInstance?.stop?.();
    closeDetect();
  });

  wiz.setCommit(async () => {
    if (!changed) return;
    motorState.fixConfig();
    for (const code of [
      MSPCodes.MSP_SET_SERIAL_CONFIG,
      MSPCodes.MSP_SET_FEATURE_CONFIG,
      MSPCodes.MSP_SET_ESC_SENSOR_CONFIG,
    ]) {
      await MSP.promise(code, mspHelper.crunch(code));
    }
  });

  function markChanged() {
    changed = true;
    wiz.markChanged();
  }

  //// 1. Protocol. Castle Link carries its telemetry on the throttle wire.

  function setProtocol(index) {
    FC.ESC_SENSOR_CONFIG.protocol = index;
    markChanged();
  }

  //// 2. Port, as on the Receiver step.

  function maskOf(port) {
    return port.functionMask ?? 0;
  }

  function setMask(port, mask) {
    port.functionMask = mask;
    port.functions = mspHelper.serialPortFunctionMaskToFunctions(mask);
  }

  let ports = $derived(
    (FC.SERIAL_CONFIG.ports ?? []).filter(
      (p) => p && p.identifier !== VCP_PORT_IDENTIFIER,
    ),
  );
  let escPort = $derived(
    ports.find((p) => maskOf(p) & ESC_SENSOR_FUNCTION) ?? null,
  );

  function portName(port) {
    const names = PORT_NAMES_RF2[FC.CONFIG.boardDesign];
    return (
      names?.[port.identifier] ?? UART_NAMES[port.identifier] ?? port.identifier
    );
  }

  function usedFor(port) {
    const func = getPortFunc(maskOf(port));
    return $i18n.t(`portsFunction_${func ? func.name : "CUSTOM"}`);
  }

  function choosePort(port) {
    if (port === escPort || maskOf(port) !== 0) return;
    if (escPort) setMask(escPort, maskOf(escPort) & ~ESC_SENSOR_FUNCTION);
    setMask(port, ESC_SENSOR_FUNCTION);
    markChanged();
  }

  //// 3. Wiring detection (half duplex, pin swap) and live readings.

  let canDetect = $derived(
    !changed &&
      !!escPort &&
      motorState.hasTelemPort &&
      !motorState.isSrxl2 &&
      !wiz.armed,
  );
  let detecting = $state(false);
  let detectInstance = null;

  function closeDetect() {
    if (!detectInstance) return;
    const instance = detectInstance;
    detectInstance = null;
    unmount(instance);
  }

  function detectWiring() {
    closeDetect();
    const before = {
      halfDuplex: FC.ESC_SENSOR_CONFIG.half_duplex,
      pinSwap: FC.ESC_SENSOR_CONFIG.pinswap,
    };
    let applied = false;
    let saved = false;

    // Mounted to <body>: see Telemetry.svelte.
    detectInstance = mount(EscWiringDetectWizard, {
      target: document.body,
      props: {
        onDetected: (halfDuplex, pinSwap) => {
          applied = true;
          FC.ESC_SENSOR_CONFIG.half_duplex = halfDuplex;
          FC.ESC_SENSOR_CONFIG.pinswap = pinSwap;
        },
        onButtonDisabled: (v) => (detecting = v),
        onClose: () => {
          if (applied && !saved) {
            FC.ESC_SENSOR_CONFIG.half_duplex = before.halfDuplex;
            FC.ESC_SENSOR_CONFIG.pinswap = before.pinSwap;
          }
          detecting = false;
          closeDetect();
        },
        onSaveRequested: () => {
          saved = true;
          changed = true;
          wiz.saveAndReboot();
        },
      },
    });
  }

  let t = $derived(FC.MOTOR_TELEMETRY_DATA);
  let receiving = $derived(
    (t.voltage?.[0] ?? 0) > 0 || (t.temperature?.[0] ?? 0) > 0,
  );
</script>

<div class="with-art">
  <div class="art"><EscArt /></div>
  <div class="text"><p>{$i18n.t("setupWizardEscIntro")}</p></div>
</div>

<section class="card">
  <h3><span class="num">1</span>{$i18n.t("motorsEscTelemetryProtocol")}</h3>
  {#if motorState.isCastleLink}
    <p>{$i18n.t("setupWizardEscCastle")}</p>
  {:else}
    <div class="actions">
      <select
        value={FC.ESC_SENSOR_CONFIG.protocol}
        onchange={(e) => setProtocol(Number(e.target.value))}
      >
        {#each motorState.telemetryProtocols as proto, index (proto)}
          <option value={index}>{proto}</option>
        {/each}
      </select>
      <span class="muted">{$i18n.t("setupWizardEscProtocolHelp")}</span>
    </div>
  {/if}
</section>

{#if motorState.hasTelemPort}
  <section class="card">
    <h3><span class="num">2</span>{$i18n.t("setupWizardEscPortTitle")}</h3>
    <div class="tiles" role="radiogroup">
      {#each ports as port (port.identifier)}
        {@const isEsc = port === escPort}
        {@const free = maskOf(port) === 0}
        <button
          type="button"
          role="radio"
          aria-checked={isEsc}
          class={["tile", isEsc && "selected"]}
          disabled={!isEsc && !free}
          onclick={() => choosePort(port)}
        >
          <span class="tile-name">
            {portName(port)}
            {#if isEsc}
              <i class="fas fa-check-circle" aria-hidden="true"></i>
            {/if}
          </span>
          <span class="muted">
            {#if isEsc}
              {$i18n.t("setupWizardEscPortEsc")}
            {:else if free}
              {$i18n.t("setupWizardReceiverPortFree")}
            {:else}
              {$i18n.t("setupWizardReceiverPortInUse", { 1: usedFor(port) })}
            {/if}
          </span>
        </button>
      {/each}
    </div>
    {#if !escPort}
      <p class="muted">{$i18n.t("setupWizardEscPortNone")}</p>
    {/if}
  </section>
{/if}

{#if changed}
  <div class="callout">
    <i class="fas fa-sync-alt" aria-hidden="true"></i>
    <span>{$i18n.t("setupWizardRebootNeeded")}</span>
    <button class="btn primary" onclick={wiz.saveAndReboot}>
      {$i18n.t("buttonSaveReboot")}
    </button>
  </div>
{/if}

{#if motorState.telemEnabled}
  <section class={["card", receiving && "complete"]}>
    <h3>
      <span class="num">3</span>{$i18n.t("setupWizardEscCheckTitle")}
      {#if !changed}
        <span class={["badge", receiving ? "good" : "bad"]}>
          {receiving
            ? $i18n.t("setupWizardEscReceiving")
            : $i18n.t("setupWizardEscNothing")}
        </span>
      {/if}
    </h3>
    <p>{$i18n.t("setupWizardEscCheckText")}</p>
    <div class="readings">
      <span class="pill">{((t.voltage?.[0] ?? 0) / 1000).toFixed(1)} V</span>
      <span class="pill">{((t.current?.[0] ?? 0) / 1000).toFixed(1)} A</span>
      <span class="pill">{((t.temperature?.[0] ?? 0) / 10).toFixed(0)} °C</span>
      <span class="pill">{t.rpm?.[0] ?? 0} RPM</span>
    </div>
    {#if motorState.hasTelemPort}
      <div class="actions">
        <button
          class="btn"
          disabled={!canDetect || detecting}
          onclick={detectWiring}
        >
          {$i18n.t("motorsEscWiringDetectButton")}
        </button>
        {#if changed}
          <span class="muted">{$i18n.t("setupWizardReceiverSaveFirst")}</span>
        {/if}
      </div>
    {/if}
  </section>
{:else}
  <p class="muted">{$i18n.t("setupWizardEscSkip")}</p>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  select {
    min-width: 220px;
  }

  .readings {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>

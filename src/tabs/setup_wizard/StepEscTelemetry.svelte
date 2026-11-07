<script>
  import semver from "semver";
  import { getContext, mount, onDestroy, onMount, unmount } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
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
  import TabButton from "./TabButton.svelte";

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
    loadPower();
  });

  //// Battery and SmartFuel, as the Ethos wizard's power screens set them:
  //// the voltage and current sources, the cells and capacity of the active
  //// battery profile, and the SmartFuel mode. Written on Save.

  const SMARTFUEL_KEYS = ["None", "Voltage", "Current", "Combined"];
  const smartFuelSupported = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9);
  // FBUS meters exist from API 12.9, as in the Power tab.
  const meterKeys = smartFuelSupported
    ? ["None", "Adc", "Esc", "Fbus"]
    : ["None", "Adc", "Esc"];

  let powerLoaded = $state(false);
  let powerChanged = false;
  let cells = $state(0);
  let capacityInput = $state(0);

  let activeProfile = $derived(FC.BATTERY_STATE.batteryProfile ?? 0);
  let needsVoltage = $derived(
    smartFuelSupported && [1, 3].includes(FC.SMARTFUEL_CONFIG?.mode),
  );

  async function loadPower() {
    await MSP.promise(MSPCodes.MSP_BATTERY_CONFIG);
    await MSP.promise(MSPCodes.MSP_BATTERY_STATE);
    if (smartFuelSupported) await MSP.promise(MSPCodes.MSP2_SMARTFUEL_CONFIG);
    cells = FC.BATTERY_CONFIG.hasProfileCells
      ? FC.BATTERY_CONFIG.cellCounts[activeProfile]
      : FC.BATTERY_CONFIG.cellCount;
    capacityInput = FC.BATTERY_CONFIG.capacities?.[activeProfile] ?? 0;
    powerLoaded = true;
  }

  function changePower(apply) {
    apply();
    powerChanged = true;
    wiz.markChanged();
  }

  function setVoltageSource(value) {
    changePower(() => {
      FC.BATTERY_CONFIG.voltageMeterSource = value;
    });
  }

  function setCurrentSource(value) {
    changePower(() => {
      FC.BATTERY_CONFIG.currentMeterSource = value;
    });
  }

  function setCells(value) {
    const count = Math.max(0, Math.min(24, Math.round(value)));
    changePower(() => {
      // The legacy field mirrors the active profile, as the Power tab saves it.
      FC.BATTERY_CONFIG.cellCount = count;
      if (FC.BATTERY_CONFIG.hasProfileCells) {
        FC.BATTERY_CONFIG.cellCounts[activeProfile] = count;
      }
    });
  }

  function setCapacity(value) {
    const mah = Math.max(0, Math.min(40000, Math.round(value)));
    changePower(() => {
      FC.BATTERY_CONFIG.capacities[activeProfile] = mah;
      FC.BATTERY_CONFIG.capacity = mah;
    });
  }

  function setSmartFuel(mode) {
    changePower(() => {
      FC.SMARTFUEL_CONFIG.mode = mode;
    });
  }

  async function writePower() {
    await MSP.promise(
      MSPCodes.MSP_SET_BATTERY_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_BATTERY_CONFIG),
    );
    if (smartFuelSupported) {
      await MSP.promise(
        MSPCodes.MSP2_SET_SMARTFUEL_CONFIG,
        mspHelper.crunch(MSPCodes.MSP2_SET_SMARTFUEL_CONFIG),
      );
    }
    powerChanged = false;
  }

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
    detectInstance?.stop?.();
    closeDetect();
  });

  wiz.setCommit(async () => {
    if (powerChanged) await writePower();
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

  // Port, feature and protocol are read at power-up only. This step comes
  // after the gate, so Next has to ask for the reboot (see SetupWizard).
  function markChanged() {
    changed = true;
    wiz.markChanged();
    wiz.requestReboot();
  }

  //// 1. Used or not, then the protocol. Castle Link carries its telemetry
  //// on the throttle wire, so there is nothing to choose.

  // "Not used": the flight controller measures the battery itself (ADC),
  // or nothing does. Turns the protocol off and frees its port.
  let inUse = $state(motorState.telemEnabled);

  function setInUse(value) {
    if (inUse === value) return;
    inUse = value;
    if (value) return;
    if (FC.ESC_SENSOR_CONFIG.protocol !== 0) setProtocol(0);
    if (escPort) {
      setMask(escPort, maskOf(escPort) & ~ESC_SENSOR_FUNCTION);
      markChanged();
    }
  }

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
  <h3><span class="num">1</span>{$i18n.t("setupWizardEscUseTitle")}</h3>
  {#if motorState.isCastleLink}
    <p>{$i18n.t("setupWizardEscCastle")}</p>
  {:else}
    <div class="tiles" role="radiogroup">
      {#each [true, false] as used (used)}
        <button
          type="button"
          role="radio"
          aria-checked={inUse === used}
          class={["tile", inUse === used && "selected"]}
          onclick={() => setInUse(used)}
        >
          <span class="tile-name">
            {$i18n.t(used ? "setupWizardEscUsed" : "setupWizardEscNotUsed")}
            {#if inUse === used}
              <i class="fas fa-check-circle" aria-hidden="true"></i>
            {/if}
          </span>
          <span class="muted">
            {$i18n.t(
              used ? "setupWizardEscUsedHelp" : "setupWizardEscNotUsedHelp",
            )}
          </span>
        </button>
      {/each}
    </div>
    {#if inUse}
      <div class="actions">
        <select
          value={FC.ESC_SENSOR_CONFIG.protocol}
          onchange={(e) => setProtocol(Number(e.target.value))}
        >
          {#if FC.ESC_SENSOR_CONFIG.protocol === 0}
            <option value={0} disabled>
              {$i18n.t("setupWizardEscProtocolPick")}
            </option>
          {/if}
          <!-- Disabled (0) is the Not used tile. -->
          {#each motorState.telemetryProtocols as proto, index (proto)}
            {#if index > 0}
              <option value={index}>{proto}</option>
            {/if}
          {/each}
        </select>
        <span class="muted">{$i18n.t("setupWizardEscProtocolHelp")}</span>
      </div>
    {/if}
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
{:else if !inUse}
  <p class="muted">{$i18n.t("setupWizardEscSkip")}</p>
  <div>
    <TabButton tab="power">{$i18n.t("setupWizardOpenPower")}</TabButton>
  </div>
{/if}

{#if powerLoaded}
  <section class="card">
    <h3>{$i18n.t("setupWizardPowerTitle")}</h3>
    <p>{$i18n.t("setupWizardPowerText")}</p>

    <span class="muted">{$i18n.t("powerBatteryVoltageMeterSource")}</span>
    <div class="tiles" role="radiogroup">
      {#each meterKeys as key, value (key)}
        <button
          type="button"
          role="radio"
          aria-checked={FC.BATTERY_CONFIG.voltageMeterSource === value}
          class={[
            "tile",
            FC.BATTERY_CONFIG.voltageMeterSource === value && "selected",
          ]}
          onclick={() => setVoltageSource(value)}
        >
          <span class="tile-name">
            {$i18n.t(`powerBatteryVoltageMeterType${key}`)}
          </span>
        </button>
      {/each}
    </div>

    <span class="muted">{$i18n.t("powerBatteryCurrentMeterSource")}</span>
    <div class="tiles" role="radiogroup">
      {#each meterKeys as key, value (key)}
        <button
          type="button"
          role="radio"
          aria-checked={FC.BATTERY_CONFIG.currentMeterSource === value}
          class={[
            "tile",
            FC.BATTERY_CONFIG.currentMeterSource === value && "selected",
          ]}
          onclick={() => setCurrentSource(value)}
        >
          <span class="tile-name">
            {$i18n.t(`powerBatteryCurrentMeterType${key}`)}
          </span>
        </button>
      {/each}
    </div>

    <p class="muted">
      {$i18n.t("setupWizardPowerProfile", { 1: activeProfile + 1 })}
    </p>
    <div class="fields">
      <span>{$i18n.t("powerBatteryCellCount")}</span>
      <NumberInput
        min="0"
        max="24"
        step="1"
        bind:value={cells}
        onchange={() => setCells(cells)}
      />
      <span class="muted">S</span>
      <span>{$i18n.t("powerBatteryCapacity")}</span>
      <NumberInput
        min="0"
        max="40000"
        step="1"
        bind:value={capacityInput}
        onchange={() => setCapacity(capacityInput)}
      />
      <span class="muted">mAh</span>
    </div>

    {#if smartFuelSupported}
      <span class="muted">{$i18n.t("powerSmartFuelSource")}</span>
      <div class="tiles" role="radiogroup">
        {#each SMARTFUEL_KEYS as key, mode (key)}
          <button
            type="button"
            role="radio"
            aria-checked={FC.SMARTFUEL_CONFIG.mode === mode}
            class={["tile", FC.SMARTFUEL_CONFIG.mode === mode && "selected"]}
            onclick={() => setSmartFuel(mode)}
          >
            <span class="tile-name">
              {$i18n.t(`powerSmartFuelSourceType${key}`)}
            </span>
          </button>
        {/each}
      </div>
      {#if needsVoltage && FC.BATTERY_CONFIG.voltageMeterSource === 0}
        <div class="note">{$i18n.t("setupWizardPowerNeedsVoltage")}</div>
      {/if}
    {/if}
  </section>
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

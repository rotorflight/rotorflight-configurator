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
  import RxWiringDetectWizard from "@/tabs/receiver/RxWiringDetectWizard.svelte";
  import { CHANNEL_PRESETS } from "@/tabs/receiver/channelPresets.js";
  import { RX_PROTOCOLS } from "@/tabs/receiver/protocols.js";

  import LiveBar from "./LiveBar.svelte";
  import ReceiverArt from "./ReceiverArt.svelte";
  import StickIcon from "./StickIcon.svelte";
  import { mapFromDetected, movedChannel } from "./heli.js";

  const wiz = getContext("setupWizard");

  const SERIALRX_FUNCTION = 64;
  const ARMING_DISABLED_RX_FAILSAFE = 1 << 2;
  const POLL_MS = 100;

  // Serial receivers only: the wizard doesn't set up PPM, PWM or SPI.
  const PROTOCOLS = RX_PROTOCOLS.filter(
    (p) => p.feature === "RX_SERIAL" && !p.hide,
  );

  // RC_MAP order. `move`: the stick movement that should move the bar to
  // the right, drawn with StickIcon (x 1 right, y -1 forward or up).
  const FUNCTIONS = [
    { key: "roll", label: "controlAxisRoll", move: { x: 1, y: 0 } },
    { key: "pitch", label: "controlAxisPitch", move: { x: 0, y: -1 } },
    { key: "yaw", label: "controlAxisYaw", move: { x: 1, y: 0 } },
    {
      key: "collective",
      label: "controlAxisCollective",
      move: { x: 0, y: -1 },
    },
    { key: "throttle", label: "controlAxisThrottle", move: { x: 0, y: -1 } },
  ];

  // Detection asks for collective first: it is the stick most likely to be
  // resting at an end, so it is moved on purpose before anything else.
  // Throttle comes last, as it is often a switch.
  const DETECT_ORDER = [3, 0, 1, 2, 4].map((i) => FUNCTIONS[i]);

  let loading = $state(true);
  let connChanged = $state(false);
  let mapChanged = $state(false);
  let pollTimer;
  let stopped = false;

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_SERIAL_CONFIG);
    await MSP.promise(MSPCodes.MSP_RX_CONFIG);
    await MSP.promise(MSPCodes.MSP_RC_CONFIG);
    loading = false;

    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_RX_CHANNELS);
      orderDetectTick();
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
    function send(code) {
      return MSP.promise(code, mspHelper.crunch(code));
    }
    if (connChanged) {
      await send(MSPCodes.MSP_SET_SERIAL_CONFIG);
      await send(MSPCodes.MSP_SET_FEATURE_CONFIG);
      await send(MSPCodes.MSP_SET_RX_CONFIG);
    }
    if (mapChanged) {
      await send(MSPCodes.MSP_SET_RX_MAP);
    }
  });

  //// 1. Port. Only a free port, or the one the receiver is on now, can be
  //// chosen: the others are in use for something else.

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
  let rxPort = $derived(
    ports.find((p) => maskOf(p) & SERIALRX_FUNCTION) ?? null,
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
    if (port === rxPort || maskOf(port) !== 0) return;
    if (rxPort) setMask(rxPort, maskOf(rxPort) & ~SERIALRX_FUNCTION);
    setMask(port, SERIALRX_FUNCTION);
    changeConnection();
  }

  //// 2. Protocol.

  let serialRx = $derived(!!FC.FEATURE_CONFIG.features.RX_SERIAL);
  let protocol = $derived(
    serialRx
      ? (PROTOCOLS.find((p) => p.id === FC.RX_CONFIG.serialrx_provider) ?? null)
      : null,
  );

  function chooseProtocol(id) {
    const proto = PROTOCOLS.find((p) => p.id === Number(id));
    if (!proto) return;
    FC.FEATURE_CONFIG.features.setGroup("RX_PROTO", false);
    FC.FEATURE_CONFIG.features.setFeature("RX_SERIAL", true);
    FC.RX_CONFIG.serialrx_provider = proto.id;
    changeConnection();
  }

  function changeConnection() {
    connChanged = true;
    wiz.markChanged();
  }

  //// 3. Signal: whether the FC sees the receiver, and wiring detection
  //// (inverted, half duplex, pin swap), which tries each combination on
  //// the live port.

  let linkUp = $derived(
    (FC.CONFIG.armingDisableFlags & ARMING_DISABLED_RX_FAILSAFE) === 0,
  );
  let canDetect = $derived(
    !connChanged && !!rxPort && !!protocol && !wiz.armed,
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
      inverted: FC.RX_CONFIG.serialrx_inverted,
      halfDuplex: FC.RX_CONFIG.serialrx_halfduplex,
      pinSwap: FC.RX_CONFIG.serialrx_pinswap,
    };
    let applied = false;
    let saved = false;

    // Mounted to <body>: see ReceiverType.svelte.
    detectInstance = mount(RxWiringDetectWizard, {
      target: document.body,
      props: {
        onDetected: (inverted, halfDuplex, pinSwap) => {
          applied = true;
          FC.RX_CONFIG.serialrx_inverted = inverted;
          FC.RX_CONFIG.serialrx_halfduplex = halfDuplex;
          FC.RX_CONFIG.serialrx_pinswap = pinSwap;
        },
        onButtonDisabled: (v) => (detecting = v),
        onClose: () => {
          if (applied && !saved) {
            FC.RX_CONFIG.serialrx_inverted = before.inverted;
            FC.RX_CONFIG.serialrx_halfduplex = before.halfDuplex;
            FC.RX_CONFIG.serialrx_pinswap = before.pinSwap;
          }
          detecting = false;
          closeDetect();
        },
        onSaveRequested: () => {
          saved = true;
          connChanged = true;
          wiz.saveAndReboot();
        },
      },
    });
  }

  //// 4. Channels: order, and a live bar per stick function.

  let preset = $derived(
    CHANNEL_PRESETS.find((p) => p.map.every((ch, i) => FC.RC_MAP?.[i] === ch))
      ?.label ?? null,
  );

  function choosePreset(p) {
    orderDetect = null;
    if (preset === p.label) return;
    setMap(p.map);
  }

  function setMap(map) {
    FC.RC_MAP = [...map];
    mapChanged = true;
    wiz.markChanged();
  }

  //// Order detection: one stick at a time, the channel that clearly moves
  //// most from where it started is that stick's. The result is a custom
  //// order unless it happens to match one of the presets.

  let orderDetect = $state(null);

  let hasChannels = $derived((FC.RX_CHANNELS ?? []).some((v) => v > 0));

  function channelsNow() {
    const length = Math.min(FC.RC_MAP?.length ?? 8, FC.RX_CHANNELS.length);
    return Array.from({ length }, (_, i) => FC.RX_CHANNELS[i] ?? 0);
  }

  function startOrderDetect() {
    const start = channelsNow();
    orderDetect = { found: [], start, peaks: start.map(() => 0) };
  }

  function orderDetectTick() {
    if (!orderDetect) return;
    const now = channelsNow();
    const { found, start } = orderDetect;
    const peaks = orderDetect.peaks.map((p, i) =>
      Math.max(p, Math.abs((now[i] ?? 0) - (start[i] ?? 0))),
    );
    const channel = movedChannel(peaks, found);
    if (channel < 0) {
      orderDetect.peaks = peaks;
      return;
    }
    const next = [...found, channel];
    if (next.length === DETECT_ORDER.length) {
      orderDetect = null;
      // Back into RC_MAP order.
      const byFunction = FUNCTIONS.map((fn) => next[DETECT_ORDER.indexOf(fn)]);
      setMap(mapFromDetected(byFunction, FC.RC_MAP.length));
      return;
    }
    // Next stick: measured from where everything is now.
    orderDetect = { found: next, start: now, peaks: now.map(() => 0) };
  }

  function reading(index) {
    const channel = FC.RC_MAP?.[index];
    const raw = FC.RX_CHANNELS?.[channel] ?? 0;
    const centre = FC.RC_CONFIG?.rc_center || 1500;
    const span = FC.RC_CONFIG?.rc_deflection || 500;
    return {
      channel,
      raw,
      known: raw > 0,
      f: raw > 0 ? (raw - centre) / span : 0,
    };
  }

  let readings = $derived(FUNCTIONS.map((fn, i) => ({ ...fn, ...reading(i) })));
</script>

<div class="with-art">
  <div class="art"><ReceiverArt /></div>
  <div class="text"><p>{$i18n.t("setupWizardReceiverIntro")}</p></div>
</div>

{#if !loading}
  <!-- 1 + 2: how the receiver is connected. -->
  <section class="card">
    <h3><span class="num">1</span>{$i18n.t("setupWizardReceiverPortTitle")}</h3>
    <div class="tiles" role="radiogroup">
      {#each ports as port (port.identifier)}
        {@const isRx = port === rxPort}
        {@const free = maskOf(port) === 0}
        <button
          type="button"
          role="radio"
          aria-checked={isRx}
          class={["tile", isRx && "selected"]}
          disabled={!isRx && !free}
          onclick={() => choosePort(port)}
        >
          <span class="tile-name">
            {portName(port)}
            {#if isRx}
              <i class="fas fa-check-circle" aria-hidden="true"></i>
            {/if}
          </span>
          <span class="muted">
            {#if isRx}
              {$i18n.t("setupWizardReceiverPortReceiver")}
            {:else if free}
              {$i18n.t("setupWizardReceiverPortFree")}
            {:else}
              {$i18n.t("setupWizardReceiverPortInUse", { 1: usedFor(port) })}
            {/if}
          </span>
        </button>
      {/each}
    </div>
    {#if !rxPort}
      <p class="muted">{$i18n.t("setupWizardReceiverPortNone")}</p>
    {/if}

    <h3>
      <span class="num">2</span>{$i18n.t("setupWizardReceiverProtocolTitle")}
    </h3>
    <div class="actions">
      <select
        value={protocol?.id ?? ""}
        onchange={(e) => chooseProtocol(e.target.value)}
      >
        {#if !protocol}
          <option value="" disabled>
            {$i18n.t("setupWizardReceiverProtocolPick")}
          </option>
        {/if}
        {#each PROTOCOLS as proto (proto.name)}
          <option value={proto.id}>{proto.name}</option>
        {/each}
      </select>
      <span class="muted">{$i18n.t("setupWizardReceiverProtocolHelp")}</span>
    </div>

    {#if connChanged}
      <div class="callout">
        <i class="fas fa-sync-alt" aria-hidden="true"></i>
        <span>{$i18n.t("setupWizardRebootNeeded")}</span>
        <button class="btn primary" onclick={wiz.saveAndReboot}>
          {$i18n.t("buttonSaveReboot")}
        </button>
      </div>
    {/if}
  </section>

  <!-- 3: is anything arriving? -->
  <section class="card">
    <h3>
      <span class="num">3</span>{$i18n.t("setupWizardReceiverSignalTitle")}
      {#if !connChanged}
        <span class={["badge", linkUp ? "good" : "bad"]}>
          <i
            class={["fas", linkUp ? "fa-check" : "fa-times"]}
            aria-hidden="true"
          ></i>
          {linkUp
            ? $i18n.t("setupWizardReceiverLinkUp")
            : $i18n.t("setupWizardReceiverLinkDown")}
        </span>
      {/if}
    </h3>
    <p>{$i18n.t("setupWizardReceiverSignalText")}</p>
    <div class="actions">
      <button
        class="btn"
        disabled={!canDetect || detecting}
        onclick={detectWiring}
      >
        {$i18n.t("receiverWiringDetectButton")}
      </button>
      {#if connChanged}
        <span class="muted">{$i18n.t("setupWizardReceiverSaveFirst")}</span>
      {/if}
    </div>
  </section>

  <!-- 4: channel order and direction. -->
  <section class="card">
    <h3>
      <span class="num">4</span>{$i18n.t("setupWizardReceiverChannelsTitle")}
    </h3>
    <div class="tiles" role="radiogroup">
      {#each CHANNEL_PRESETS as p (p.label)}
        <button
          type="button"
          role="radio"
          aria-checked={preset === p.label}
          class={["tile", preset === p.label && "selected"]}
          onclick={() => choosePreset(p)}
        >
          <span class="tile-name">
            {p.label}
            {#if preset === p.label}
              <i class="fas fa-check-circle" aria-hidden="true"></i>
            {/if}
          </span>
        </button>
      {/each}
      <!-- Custom: detected from the sticks, or set on the Receiver tab. -->
      <button
        type="button"
        role="radio"
        aria-checked={!preset}
        class={["tile", !preset && !orderDetect && "selected"]}
        disabled={!hasChannels || !!orderDetect}
        onclick={startOrderDetect}
      >
        <span class="tile-name">
          {$i18n.t("setupWizardReceiverOrderDetect")}
          {#if !preset && !orderDetect}
            <i class="fas fa-check-circle" aria-hidden="true"></i>
          {/if}
        </span>
        <span class="muted"
          >{$i18n.t("setupWizardReceiverOrderDetectHelp")}</span
        >
      </button>
    </div>

    {#if orderDetect}
      {@const active = orderDetect.found.length}
      <div class="detect" aria-live="polite">
        <strong>{$i18n.t("setupWizardReceiverDetectTitle")}</strong>
        <ol class="detect-steps">
          {#each DETECT_ORDER as fn, i (fn.key)}
            <li class={[i < active && "done", i === active && "active"]}>
              <StickIcon x={fn.move.x} y={fn.move.y} />
              <span class="detect-text">
                {$i18n.t(`setupWizardReceiverDetect_${fn.key}`)}
              </span>
              <span class="detect-state">
                {#if i < active}
                  <i class="fas fa-check" aria-hidden="true"></i>
                  {$i18n.t("setupWizardReceiverChannel", {
                    1: orderDetect.found[i] + 1,
                  })}
                {:else if i === active}
                  {$i18n.t("setupWizardReceiverDetectWaiting")}
                {/if}
              </span>
            </li>
          {/each}
        </ol>
        <div class="actions">
          <button class="btn" onclick={startOrderDetect}>
            {$i18n.t("setupWizardReceiverDetectRestart")}
          </button>
          <button class="btn" onclick={() => (orderDetect = null)}>
            {$i18n.t("cancel")}
          </button>
        </div>
      </div>
    {/if}

    <p>{$i18n.t("setupWizardReceiverCheckText")}</p>
    <div class="bars">
      {#each readings as r (r.key)}
        <span class="bar-name">{$i18n.t(r.label)}</span>
        <span class="muted">
          {$i18n.t("setupWizardReceiverChannel", { 1: r.channel + 1 })}
        </span>
        <LiveBar f={r.f} />
        <span class="raw">{r.known ? r.raw : "–"}</span>
        <span class="muted">{$i18n.t(`setupWizardReceiverHint_${r.key}`)}</span>
      {/each}
    </div>
    <p class="muted">{$i18n.t("setupWizardReceiverCheckWrong")}</p>
  </section>
{/if}

<div>
  <button class="btn" onclick={() => wiz.openTab("receiver")}>
    {$i18n.t("setupWizardOpenReceiver")}
  </button>
</div>

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

  /* Order detection, one stick at a time. */

  .detect {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--color-accent-500);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
  }

  .detect-steps {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      opacity: 0.5;

      &.active {
        opacity: 1;
        background-color: var(--color-accent-soft);
        font-weight: 600;
      }

      &.done {
        opacity: 1;
      }
    }
  }

  .detect-text {
    flex: 1;
  }

  .detect-state {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85em;
    font-variant-numeric: tabular-nums;

    .done & {
      color: var(--color-status-good);
    }

    .active & {
      animation: waiting 0.8s ease-in-out infinite alternate;
    }
  }

  @keyframes waiting {
    from {
      opacity: 0.4;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .detect-state {
      animation: none !important;
    }
  }

  /* Channel check. */

  .bars {
    display: grid;
    grid-template-columns: auto auto minmax(120px, 1fr) 5ch auto;
    align-items: center;
    gap: 10px 12px;
  }

  .bar-name {
    font-weight: 600;
  }

  .raw {
    font-size: 0.85em;
    font-variant-numeric: tabular-nums;
  }

  @media only screen and (max-width: 600px) {
    .bars {
      grid-template-columns: auto minmax(100px, 1fr) 5ch;

      > .muted {
        display: none;
      }
    }
  }
</style>

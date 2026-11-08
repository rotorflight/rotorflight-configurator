<script>
  import "rrweb/dist/style.css";
  import { tick } from "svelte";

  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { usbDevices } from "@/js/port_handler.js";
  import {
    askForControl,
    askToAllow,
    declineControl,
    dismissAllowRequest,
    dismissDeclined,
    giveControl,
    handOver,
    killSession,
    openRemoteSupportTab,
    pendingForPilot,
    remote,
    setSoundMuted,
    showsPeer,
    startWatching,
    stopSession,
    stopWatching,
    takeControl,
    unlockSound,
  } from "@/js/protocols/RemoteView.svelte.js";
  import { serial } from "@/js/serial.js";

  // What a remote support session shows over the whole configurator, on
  // every tab: the frame and badge that mark a session, and the other side's
  // screen in place of this configurator while the other side has control of
  // the flight controller: the supporter's screen on the pilot's side (whose
  // configurator lets go of the board so the supporter can use it), or the
  // pilot's on the supporter's side once the pilot has taken control, e.g. to
  // calibrate something. The buttons that hand control over are here. Starting
  // and ending sessions is the Remote Support tab's job
  // (src/tabs/remote_support/RemoteSupport.svelte); see RemoteSupport.js and
  // RemoteView.svelte.js for the session itself.
  //
  // What the other side asks for shows as cards at the top of the window,
  // with the buttons to answer; on the pilot's side a chime and a flashing
  // title bring them back to the window (RemoteAttention.js). While the
  // browser shares nothing at all, a large prompt in the middle tells the
  // pilot to allow their port: an unfamiliar user won't look for the button.
  let viewerEl = $state();
  let viewerOpen = $state(false);

  // Pilot: what is waiting for them (see pendingForPilot()).
  let pending = $derived(pendingForPilot());
  // Supporter: the pilot shares no port, but could allow one.
  let canAskPort = $derived(
    remote.role === "join" &&
      remote.control === "supporter" &&
      remote.peerConnected &&
      remote.peerCanAllow.serial &&
      remote.peerShared.serial === 0,
  );

  const isWeb = __BACKEND__ === "web";
  const hasWebUsb = isWeb && "usb" in navigator;

  // Fixed positioning is relative to the nearest transformed ancestor, and
  // #content carries a (no-op) transform, so live under <body> instead.
  function portal(node) {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      },
    };
  }

  if (isWeb) {
    // Leaving the page would drop a shared board without its stop sequence,
    // so warn first; if they leave anyway, end the session as best we can.
    window.addEventListener("beforeunload", (event) => {
      if (remote.role !== null) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    window.addEventListener("pagehide", () => {
      if (remote.role !== null) {
        stopSession();
      }
    });
  }

  /** Lets the pilot grant the browser access to another serial port. */
  async function allowPort() {
    try {
      await serial.requestWebSerialPort();
    } catch (err) {
      console.warn("Remote support: no port allowed", err);
    }
  }

  /** Lets the pilot grant the browser access to a board in bootloader (DFU) mode. */
  async function allowDfu() {
    try {
      await navigator.usb.requestDevice({ filters: usbDevices.filters });
    } catch (err) {
      console.warn("Remote support: no DFU device allowed", err);
    }
  }

  function toggleSound() {
    setSoundMuted(!remote.muted);
  }

  /** Any click in the pilot's window lets the chime play (browser rule). */
  function onPointerDown() {
    if (remote.role === "share") {
      unlockSound();
    }
  }

  async function watch() {
    viewerOpen = true;
    await tick();
    startWatching(viewerEl);
  }

  function stopWatch() {
    stopWatching();
    viewerOpen = false;
  }

  // Show the other side's screen while it has control. Sharing with the
  // supporter in control: give up the flight controller.
  $effect(() => {
    const show = showsPeer();
    if (show && !viewerOpen) {
      if (remote.role === "share" && (GUI.connected_to || GUI.connecting_to)) {
        document.querySelector("div#connectbutton a.connect")?.click();
      }
      watch();
    } else if (!show && viewerOpen) {
      stopWatch();
      if (remote.role === null) {
        // Show how the session ended.
        openRemoteSupportTab();
      }
    }
  });
</script>

<svelte:window onpointerdown={onPointerDown} />

{#snippet soundToggle(cls)}
  <button
    class={cls}
    onclick={toggleSound}
    title={remote.muted
      ? $i18n.t("remoteSupportSoundOn")
      : $i18n.t("remoteSupportSoundOff")}
    aria-label={remote.muted
      ? $i18n.t("remoteSupportSoundOn")
      : $i18n.t("remoteSupportSoundOff")}
  >
    <span class="fas {remote.muted ? 'fa-volume-mute' : 'fa-volume-up'}"></span>
  </button>
{/snippet}

{#if remote.role !== null}
  <!-- A session gives someone else access to a flight controller, so it
       must be impossible to miss on any tab. -->
  <div class="session-frame" use:portal>
    <div class="session-badge" class:needs-action={pending.control}>
      <span class="fas fa-headset"></span>
      <span>
        {#if remote.role === "join"}
          {$i18n.t("remoteSupportFrameJoined")}
        {:else if remote.control === "pilot"}
          {$i18n.t("remoteSupportFramePilotControl")}
        {:else if remote.peerConnected}
          {$i18n.t("remoteSupportFrameConnected")}
        {:else}
          {$i18n.t("remoteSupportFrameWaiting")}
        {/if}
      </span>
      {#if remote.beingWatched && remote.role === "share"}
        <span
          class="fas fa-eye"
          title={$i18n.t("remoteSupportBeingWatchedPilot")}
        ></span>
      {/if}
      {#if remote.controlError}
        <span class="control-error">{remote.controlError}</span>
      {/if}
      {#if canAskPort}
        <button
          class="highlight"
          onclick={() => askToAllow("serial")}
          disabled={remote.allowAskSent.serial}
        >
          {$i18n.t("remoteSupportAskAllowPort")}
        </button>
      {/if}
      {#if remote.role === "join" && remote.control === "supporter" && remote.peerConnected}
        <button
          onclick={handOver}
          disabled={remote.controlBusy}
          title={$i18n.t("remoteSupportHandOverTitle")}
        >
          {$i18n.t("remoteSupportHandOver")}
        </button>
      {:else if remote.role === "share" && remote.control === "pilot"}
        <button
          class:highlight={remote.controlAsked}
          onclick={giveControl}
          disabled={remote.controlBusy}
        >
          {$i18n.t("remoteSupportGiveControl")}
        </button>
      {/if}
      {#if remote.role === "share"}
        {@render soundToggle("")}
      {/if}
      <button onclick={killSession}>{$i18n.t("remoteSupportKill")}</button>
    </div>
  </div>

  <!-- Requests from the other side, with the buttons to answer them. They
       stay until answered or no longer needed. -->
  <div class="notices" use:portal role="status" aria-live="polite">
    {#if pending.control}
      <div class="notice needs-action">
        <span class="fas fa-hand-paper icon"></span>
        <span class="text">{$i18n.t("remoteSupportControlAsked")}</span>
        <button
          class="primary"
          onclick={giveControl}
          disabled={remote.controlBusy}
        >
          {$i18n.t("remoteSupportGiveControl")}
        </button>
        <button onclick={declineControl}>
          {$i18n.t("remoteSupportNotNow")}
        </button>
      </div>
    {/if}
    {#if pending.serial && !pending.nothingShared}
      <div class="notice needs-action">
        <span class="fab fa-usb icon"></span>
        <span class="text">{$i18n.t("remoteSupportAllowPortRequest")}</span>
        <button class="primary" onclick={allowPort}>
          {$i18n.t("remoteSupportAllowPort")}
        </button>
        <button onclick={() => dismissAllowRequest("serial")}>
          {$i18n.t("remoteSupportDismiss")}
        </button>
      </div>
    {/if}
    {#if pending.dfu}
      <div class="notice needs-action">
        <span class="fas fa-microchip icon"></span>
        <span class="text">{$i18n.t("remoteSupportAllowDfuRequest")}</span>
        <button class="primary" onclick={allowDfu}>
          {$i18n.t("remoteSupportAllowDfu")}
        </button>
        <button onclick={() => dismissAllowRequest("dfu")}>
          {$i18n.t("remoteSupportDismiss")}
        </button>
      </div>
    {/if}
    {#if remote.role === "join" && remote.control === "pilot" && remote.controlDeclined}
      <div class="notice">
        <span class="fas fa-info-circle icon"></span>
        <span class="text">{$i18n.t("remoteSupportControlDeclined")}</span>
        <button onclick={dismissDeclined}>
          {$i18n.t("remoteSupportDismiss")}
        </button>
      </div>
    {/if}
    {#if remote.role === "join"}
      {#each ["serial", "dfu"] as kind (kind)}
        {#if remote.allowAskSent[kind]}
          <div class="notice">
            <span class="fas fa-hourglass-half icon"></span>
            <span class="text">
              {kind === "dfu"
                ? $i18n.t("remoteSupportAllowDfuAskSent")
                : $i18n.t("remoteSupportAllowPortAskSent")}
            </span>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
{/if}

{#if viewerOpen}
  <div class="viewer" use:portal>
    <div class="viewer-bar">
      <span class="fas fa-eye"></span>
      <span class="label">
        {#if !remote.peerConnected}
          {$i18n.t("remoteSupportFrameWaiting")}
        {:else if remote.role === "join"}
          {remote.hasFrame
            ? $i18n.t("remoteSupportWatchingPilot")
            : $i18n.t("remoteSupportWatchWaitingPilot")}
        {:else if !remote.hasFrame}
          {$i18n.t("remoteSupportWatchWaiting")}
        {:else}
          {$i18n.t("remoteSupportWatching")}
        {/if}
      </span>
      <span class="reminder">
        <span class="fas fa-exclamation-triangle"></span>
        {remote.role === "join"
          ? $i18n.t("remoteSupportSafetyReminder")
          : $i18n.t("remoteSupportSafetyReminderPilot")}
      </span>
      {#if remote.controlError}
        <span class="control-error">{remote.controlError}</span>
      {/if}
      {#if remote.role === "share" && remote.peerConnected}
        <button
          class="btn"
          onclick={takeControl}
          disabled={remote.controlBusy}
          title={$i18n.t("remoteSupportTakeControlTitle")}
        >
          <span class="fas fa-hand-paper"></span>
          {$i18n.t("remoteSupportTakeControl")}
        </button>
      {:else if remote.role === "join"}
        <button
          class="btn"
          onclick={askForControl}
          disabled={remote.controlAskSent}
        >
          {remote.controlAskSent
            ? $i18n.t("remoteSupportControlAskSent")
            : $i18n.t("remoteSupportAskControl")}
        </button>
      {/if}
      {#if isWeb && remote.role === "share"}
        <!-- The supporter only sees what the browser was allowed to share. -->
        <button
          class="btn"
          class:pulse={pending.serial || pending.nothingShared}
          onclick={allowPort}
        >
          {$i18n.t("remoteSupportAllowPort")}
        </button>
        {#if hasWebUsb}
          <button class="btn" class:pulse={pending.dfu} onclick={allowDfu}>
            {$i18n.t("remoteSupportAllowDfu")}
          </button>
        {/if}
      {/if}
      {#if remote.role === "share"}
        {@render soundToggle("btn")}
      {/if}
      <button class="btn danger" onclick={killSession}>
        {$i18n.t("remoteSupportKill")}
      </button>
    </div>
    <div class="viewer-body">
      <div class="viewer-stage" bind:this={viewerEl}></div>
      {#if !remote.peerConnected || !remote.hasFrame}
        <div class="viewer-placeholder">
          {#if !remote.peerConnected}
            <p>{$i18n.t("remoteSupportViewerCodeHint")}</p>
            <p class="code">{remote.code || "..."}</p>
          {:else if remote.role === "join"}
            <p>{$i18n.t("remoteSupportWatchWaitingPilot")}</p>
          {:else}
            <p>{$i18n.t("remoteSupportWatchWaiting")}</p>
          {/if}
        </div>
      {/if}
      {#if pending.nothingShared}
        <!-- Nothing shared yet: the supporter can't do anything until the
             pilot allows their port, so say so where they look. -->
        <div class="allow-prompt">
          <div class="allow-card">
            <span class="fab fa-usb big-icon"></span>
            <h2>{$i18n.t("remoteSupportAllowPromptTitle")}</h2>
            <p>{$i18n.t("remoteSupportAllowPromptText")}</p>
            <button class="big pulse" onclick={allowPort}>
              {$i18n.t("remoteSupportAllowPort")}
            </button>
            {#if hasWebUsb}
              <p class="secondary">
                {$i18n.t("remoteSupportAllowPromptDfu")}
                <button class="link" onclick={allowDfu}>
                  {$i18n.t("remoteSupportAllowDfu")}
                </button>
              </p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .session-frame {
    position: fixed;
    inset: 0;
    z-index: 9500;
    border: 4px solid var(--color-accent-500);
    /* The frame only marks the window; everything inside stays usable. */
    pointer-events: none;
  }

  .session-badge {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 6px 5px 12px;
    color: #fff;
    background: var(--color-accent-500);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    font-weight: 600;
    white-space: nowrap;
    pointer-events: auto;

    button {
      padding: 1px 8px;
      color: inherit;
      font: inherit;
      font-weight: 400;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    button.highlight {
      color: var(--color-accent-500);
      background: #fff;
      font-weight: 600;
    }

    button:disabled {
      opacity: 0.6;
      cursor: wait;
    }

    .control-error {
      font-weight: 400;
    }

    .control-error {
      max-width: 40vw;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .session-badge.needs-action {
    animation: attention-pulse 1.2s ease-in-out infinite;
  }

  /* Requests from the other side: above everything, also the viewer. */
  .notices {
    position: fixed;
    top: 44px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10002;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(640px, calc(100vw - 32px));
    pointer-events: none;
  }

  .notice {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 12px;
    color: var(--color-text);
    background: var(--color-surface, var(--color-bg));
    border: 1px solid var(--color-border, rgba(0, 0, 0, 0.2));
    border-left: 6px solid var(--color-accent-500);
    border-radius: var(--radius-md);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    animation: notice-in 0.25s ease-out;

    .icon {
      font-size: 1.4em;
      color: var(--color-accent-500);
    }

    .text {
      flex: 1;
      min-width: 200px;
    }

    button {
      padding: 3px 12px;
      line-height: 24px;
      cursor: pointer;
    }

    button.primary {
      color: #fff;
      background: var(--color-accent-500);
      font-weight: 600;
    }
  }

  .notice.needs-action {
    animation:
      notice-in 0.25s ease-out,
      attention-glow 1.6s ease-in-out 0.25s infinite;
  }

  @keyframes notice-in {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }
  }

  @keyframes attention-glow {
    50% {
      box-shadow:
        0 6px 24px rgba(0, 0, 0, 0.3),
        0 0 0 4px color-mix(in srgb, var(--color-accent-500) 45%, transparent);
    }
  }

  @keyframes attention-pulse {
    50% {
      filter: brightness(1.35);
    }
  }

  /* The other side's screen looks just like this configurator, so
     frame it unmistakably. */
  .viewer {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
    border: 4px solid var(--color-accent-500);
  }

  .viewer-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    color: #fff;
    background: var(--color-accent-500);

    .label {
      flex: 1;
      font-weight: 600;
    }

    .btn {
      padding: 2px 10px;
      color: inherit;
      font: inherit;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .btn.danger {
      background: rgba(0, 0, 0, 0.45);
      font-weight: 600;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: default;
    }

    .btn.pulse {
      color: var(--color-accent-500);
      background: #fff;
      font-weight: 600;
      animation: attention-pulse-white 1.2s ease-in-out infinite;
    }
  }

  .viewer-body {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  .viewer-stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    /* Read-only: nothing here can reach the other side. */
    pointer-events: none;
  }

  @keyframes attention-pulse-white {
    50% {
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.6);
    }
  }

  .allow-prompt {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: color-mix(in srgb, var(--color-bg) 70%, transparent);
  }

  .allow-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    max-width: 520px;
    padding: 28px 32px;
    text-align: center;
    color: var(--color-text);
    background: var(--color-surface, var(--color-bg));
    border: 3px solid var(--color-accent-500);
    border-radius: var(--radius-md);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);

    .big-icon {
      font-size: 3em;
      color: var(--color-accent-500);
    }

    h2 {
      margin: 0;
      font-size: 1.5em;
      font-weight: 600;
    }

    p {
      margin: 0;
      font-size: 1.1em;
    }

    button.big {
      padding: 8px 28px;
      line-height: 28px;
      font-size: 1.3em;
      font-weight: 600;
      color: #fff;
      background: var(--color-accent-500);
      cursor: pointer;
    }

    button.big.pulse {
      animation: attention-glow 1.6s ease-in-out infinite;
    }

    .secondary {
      font-size: 0.95em;
      opacity: 0.85;
    }

    button.link {
      padding: 0;
      line-height: inherit;
      color: var(--color-accent-500);
      background: none;
      text-decoration: underline;
      cursor: pointer;
    }
  }

  /* Covers the stage until the supporter's screen arrives (or after they
     left, when it would be stale). */
  .viewer-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 1.3em;
    background: var(--color-bg);

    p {
      margin: 0;
    }

    .code {
      font-size: 2.4em;
      font-variant-numeric: tabular-nums;
      user-select: all;
    }
  }
</style>

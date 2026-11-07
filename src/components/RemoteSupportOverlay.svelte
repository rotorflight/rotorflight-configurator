<script>
  import "rrweb/dist/style.css";
  import { tick } from "svelte";

  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { usbDevices } from "@/js/port_handler.js";
  import {
    askForControl,
    giveControl,
    handOver,
    killSession,
    openRemoteSupportTab,
    remote,
    showsPeer,
    startWatching,
    stopSession,
    stopWatching,
    takeControl,
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
  let viewerEl = $state();
  let viewerOpen = $state(false);

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

{#if remote.role !== null}
  <!-- A session gives someone else access to a flight controller, so it
       must be impossible to miss on any tab. -->
  <div class="session-frame" use:portal>
    <div class="session-badge">
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
      {#if remote.role === "join" && remote.control === "supporter" && remote.peerConnected}
        <button
          onclick={handOver}
          disabled={remote.controlBusy}
          title={$i18n.t("remoteSupportHandOverTitle")}
        >
          {$i18n.t("remoteSupportHandOver")}
        </button>
      {:else if remote.role === "share" && remote.control === "pilot"}
        {#if remote.controlAsked}
          <span class="asked">{$i18n.t("remoteSupportControlAsked")}</span>
        {/if}
        <button
          class:highlight={remote.controlAsked}
          onclick={giveControl}
          disabled={remote.controlBusy}
        >
          {$i18n.t("remoteSupportGiveControl")}
        </button>
      {/if}
      <button onclick={killSession}>{$i18n.t("remoteSupportKill")}</button>
    </div>
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
        <button class="btn" onclick={allowPort}>
          {$i18n.t("remoteSupportAllowPort")}
        </button>
        {#if hasWebUsb}
          <button class="btn" onclick={allowDfu}>
            {$i18n.t("remoteSupportAllowDfu")}
          </button>
        {/if}
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

    .asked,
    .control-error {
      font-weight: 400;
    }

    .control-error {
      max-width: 40vw;
      overflow: hidden;
      text-overflow: ellipsis;
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

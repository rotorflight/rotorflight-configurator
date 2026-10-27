<script>
  import { onMount } from "svelte";

  import Page from "@/components/Page.svelte";

  import { i18n } from "@/js/i18n.js";
  import { canShareDevices } from "@/js/protocols/RemoteSupport.js";
  import {
    killSession,
    remote,
    startSession,
    startSharing,
  } from "@/js/protocols/RemoteView.svelte.js";
  import { serial } from "@/js/serial.js";

  // The Remote Support tab: start a session as the pilot or the supporter,
  // and see how it is going. What a running session shows on every tab
  // (frame, badge, the supporter's screen) is RemoteSupportOverlay.svelte.
  let joinCode = $state("");
  // Both sides confirm the safety notes before a session can start.
  let shareAcknowledged = $state(false);
  let joinAcknowledged = $state(false);

  // In the browser, sharing needs Web Serial or WebUSB; joining doesn't.
  const isWeb = __BACKEND__ === "web";
  const canShare = canShareDevices();

  // The browser only hands out ports the pilot has allowed, so show which
  // those are before sharing.
  let allowedPorts = $state([]);

  async function refreshAllowedPorts() {
    if (!isWeb || !canShare) {
      return;
    }
    try {
      allowedPorts = (await serial.loadWebSerialPorts()).map(
        (p) => p.displayName,
      );
    } catch {
      allowedPorts = [];
    }
  }

  onMount(refreshAllowedPorts);

  /** Lets the pilot grant the browser access to a serial port. */
  async function allowPort() {
    try {
      await serial.requestWebSerialPort();
    } catch (err) {
      console.warn("Remote support: no port allowed", err);
    }
    await refreshAllowedPorts();
  }

  async function share() {
    if (!shareAcknowledged) {
      return;
    }
    if (isWeb && allowedPorts.length === 0) {
      // Ask for a port now, while the click still counts as a gesture.
      await allowPort();
    }
    await startSharing();
  }

  function join() {
    if (joinAcknowledged) {
      startSession(joinCode);
    }
  }

  let status = $derived.by(() => {
    if (remote.role === "share") {
      return remote.peerConnected
        ? $i18n.t("remoteSupportSupporterConnected")
        : $i18n.t("remoteSupportWaitingSupporter");
    }
    if (remote.role === "join") {
      return $i18n.t("remoteSupportConnectedPilot");
    }
    return "";
  });
</script>

{#snippet header()}
  <h1>{$i18n.t("remoteSupportTitle")}</h1>
{/snippet}

<Page {header}>
  {#if remote.role === null}
    {#if remote.message}
      <p class="message" class:error={remote.error}>{remote.message}</p>
    {/if}

    <div class="roles">
      <section class="card">
        <h2>
          <span class="fas fa-plane"></span>
          {$i18n.t("remoteSupportShareTitle")}
        </h2>
        <p class="lead">{$i18n.t("remoteSupportShareChoice")}</p>
        {#if canShare}
          <ul class="steps">
            <li>{$i18n.t("remoteSupportShareStep1")}</li>
            <li>{$i18n.t("remoteSupportShareStep2")}</li>
            {#if isWeb}
              <li>{$i18n.t("remoteSupportWebShareHint")}</li>
            {/if}
          </ul>
          {#if isWeb}
            <div class="ports">
              <h3>{$i18n.t("remoteSupportAllowedPorts")}</h3>
              {#if allowedPorts.length}
                <ul>
                  {#each allowedPorts as name (name)}
                    <li>{name}</li>
                  {/each}
                </ul>
              {:else}
                <p>{$i18n.t("remoteSupportNoAllowedPorts")}</p>
              {/if}
              <button class="btn" onclick={allowPort}>
                {$i18n.t("remoteSupportAllowPort")}
              </button>
            </div>
          {/if}
          <div class="safety">
            <h3>
              <span class="fas fa-exclamation-triangle"></span>
              {$i18n.t("remoteSupportBeforeShare")}
            </h3>
            <ul>
              <li>{$i18n.t("remoteSupportSafetyPilot1")}</li>
              <li>{$i18n.t("remoteSupportSafetyPilot2")}</li>
              <li>{$i18n.t("remoteSupportSafetyPilot3")}</li>
            </ul>
            <label>
              <input type="checkbox" bind:checked={shareAcknowledged} />
              {$i18n.t("remoteSupportSafetyAck")}
            </label>
          </div>
          <div class="actions">
            <button
              class="btn primary"
              disabled={!shareAcknowledged}
              onclick={share}
            >
              {$i18n.t("remoteSupportShare")}
            </button>
          </div>
        {:else}
          <p class="unsupported">
            {$i18n.t("remoteSupportShareUnsupported")}
          </p>
        {/if}
      </section>

      <section class="card">
        <h2>
          <span class="fas fa-headset"></span>
          {$i18n.t("remoteSupportJoinTitle")}
        </h2>
        <p class="lead">{$i18n.t("remoteSupportJoinChoice")}</p>
        <div class="safety">
          <h3>
            <span class="fas fa-exclamation-triangle"></span>
            {$i18n.t("remoteSupportBeforeJoin")}
          </h3>
          <ul>
            <li>{$i18n.t("remoteSupportSafetySupporter1")}</li>
            <li>{$i18n.t("remoteSupportSafetySupporter2")}</li>
            <li>{$i18n.t("remoteSupportSafetySupporter3")}</li>
            <li>{$i18n.t("remoteSupportSafetySupporter4")}</li>
          </ul>
          <label>
            <input type="checkbox" bind:checked={joinAcknowledged} />
            {$i18n.t("remoteSupportSafetyAck")}
          </label>
        </div>
        <div class="actions">
          <input
            type="text"
            bind:value={joinCode}
            placeholder={$i18n.t("remoteSupportCodePlaceholder")}
            autocomplete="off"
            spellcheck="false"
            onkeydown={(e) => e.key === "Enter" && join()}
          />
          <button
            class="btn primary"
            disabled={!joinAcknowledged}
            onclick={join}
          >
            {$i18n.t("remoteSupportJoin")}
          </button>
        </div>
      </section>
    </div>
  {:else}
    <section class="card session">
      {#if remote.role === "share"}
        <h2>{$i18n.t("remoteSupportCode")}</h2>
        <p class="code">{remote.code || "..."}</p>
        <p class="lead">{$i18n.t("remoteSupportViewerCodeHint")}</p>
      {:else}
        <h2>
          <span class="fas fa-headset"></span>
          {$i18n.t("remoteSupportJoinTitle")}
        </h2>
      {/if}
      <p class="status">{status}</p>
      {#if remote.device}
        <p>{$i18n.t("remoteSupportDevice", [remote.device])}</p>
      {/if}
      {#if remote.role === "join"}
        <div class="safety">
          <p>
            <span class="fas fa-exclamation-triangle"></span>
            {$i18n.t("remoteSupportSafetyReminder")}
          </p>
        </div>
        <p class="watched" class:on={remote.beingWatched}>
          <span class="fas {remote.beingWatched ? 'fa-eye' : 'fa-eye-slash'}"
          ></span>
          {remote.beingWatched
            ? $i18n.t("remoteSupportBeingWatched")
            : $i18n.t("remoteSupportNotWatched")}
        </p>
      {/if}
      <div class="actions">
        <button class="btn danger" onclick={killSession}>
          {$i18n.t("remoteSupportKill")}
        </button>
      </div>
    </section>
  {/if}
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .message {
    margin: 0 0 var(--section-gap);
    padding: 10px 14px;
    border-left: 4px solid var(--color-yellow-500);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-yellow-500) 12%, transparent);

    &.error {
      border-color: var(--color-status-bad);
      background: color-mix(in srgb, var(--color-status-bad) 10%, transparent);
    }
  }

  .roles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: var(--section-gap);
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 20px;
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
  }

  .session {
    max-width: 40em;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;

    .fas {
      color: var(--color-accent-500);
    }
  }

  h3 {
    margin: 0 0 6px;
    font-size: 0.95rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    line-height: 1.5;
  }

  .lead {
    color: var(--color-text-soft);
  }

  ul {
    margin: 0;
    padding-left: 1.3em;

    li {
      margin: 0 0 4px;
      line-height: 1.45;
    }
  }

  .steps {
    color: var(--color-text-soft);
  }

  .ports {
    padding: 10px 12px;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-sm);

    p,
    ul {
      margin-bottom: 8px;
      color: var(--color-text-soft);
    }
  }

  /* Safety notes: hard to overlook, but not alarming. */
  .safety {
    padding: 10px 12px;
    border-left: 4px solid var(--color-yellow-500);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-yellow-500) 12%, transparent);

    ul {
      margin-bottom: 8px;
    }

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      cursor: pointer;
    }
  }

  .unsupported {
    color: var(--color-text-soft);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;

    input {
      flex: 1;
      min-width: 0;
    }
  }

  .code {
    font-size: 2.2em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    user-select: all;
  }

  .status {
    font-weight: 600;
  }

  .watched {
    color: var(--color-text-soft);

    &.on {
      color: var(--color-status-good);
    }
  }

  @media only screen and (max-width: 900px) {
    .roles {
      grid-template-columns: 1fr;
    }
  }
</style>

<script>
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import { i18n } from "@/js/i18n.js";

  import { HandshakeStatus } from "./handshake.js";
  import escState from "./state.svelte.js";

  const statusKeys = {
    [HandshakeStatus.GUARDING]: "escProgrammingStatusGuarding",
    [HandshakeStatus.SWITCHING]: "escProgrammingStatusSwitching",
    [HandshakeStatus.WAITING]: "escProgrammingStatusWaiting",
    [HandshakeStatus.POLLING]: "escProgrammingStatusPolling",
  };

  let statusKey = $derived(
    statusKeys[escState.status] ?? "escProgrammingStatusPolling",
  );
</script>

<div class="status">
  {#if escState.status === HandshakeStatus.FAILED}
    <p class="error">{$i18n.t("escProgrammingStatusFailed")}</p>
    {#if escState.error}
      <p class="error-detail">{escState.error}</p>
    {/if}
    <div class="actions">
      <button class="btn" onclick={() => escState.retryDetection()}>
        {$i18n.t("escProgrammingRetry")}
      </button>
      <button class="btn" onclick={() => escState.cancelDetection()}>
        {$i18n.t("escProgrammingCancel")}
      </button>
    </div>
  {:else}
    {#if escState.status === HandshakeStatus.POWER_CYCLE}
      <WarningNote message="escProgrammingStatusPowerCycle" />
    {/if}
    <div class="spinner"></div>
    <p>{$i18n.t(statusKey)}</p>
    <button class="btn" onclick={() => escState.cancelDetection()}>
      {$i18n.t("escProgrammingCancel")}
    </button>
  {/if}
</div>

<style lang="scss">
  .status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px 8px;
  }

  .spinner {
    margin: 12px;
    height: 64px;
    width: 64px;
    background-image: url("/images/loading-spin.svg");
    background-repeat: no-repeat;
    background-position: center center;
  }

  .error {
    font-weight: 600;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    @extend %button;
  }
</style>

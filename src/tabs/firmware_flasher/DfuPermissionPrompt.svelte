<script>
  // Shown mid-flash when STM32.js has rebooted a board into DFU that this
  // browser has no WebUSB permission for yet -- see requestDfuPermission()
  // in state.svelte.js. The click here is the user gesture requestDevice()
  // needs; granting resumes the parked flash, cancelling fails it cleanly.
  import { onDestroy } from "svelte";

  import { i18n } from "@/js/i18n.js";
  import { requestWebUsbDeviceFromPicker } from "@/js/serial_backend.js";

  import { flashState, resolveDfuPermission } from "./state.svelte.js";

  async function onClickAllow() {
    const device = await requestWebUsbDeviceFromPicker();
    // A cancelled chooser leaves the prompt up so the user can try again.
    if (device) resolveDfuPermission(true);
  }

  // Leaving the tab mid-prompt must still release GUI.connect_lock and
  // finish the flash attempt, or the next visit starts out locked.
  onDestroy(() => {
    if (flashState.dfuPermissionPending) resolveDfuPermission(false);
  });
</script>

{#if flashState.dfuPermissionPending}
  <p class="dfu-permission">
    <em class="fas fa-microchip"></em>
    <button class="btn primary" onclick={onClickAllow}>
      {$i18n.t("firmwareFlasherDfuPermissionGrant")}
    </button>
    <button class="btn" onclick={() => resolveDfuPermission(false)}>
      {$i18n.t("firmwareFlasherDfuPermissionCancel")}
    </button>
  </p>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .dfu-permission {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 6px 0 0;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-accent);
    background-color: var(--color-surface);

    em {
      color: var(--color-accent-500);
    }
  }
</style>

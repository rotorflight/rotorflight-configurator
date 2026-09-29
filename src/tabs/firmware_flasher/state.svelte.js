// STM32.js/STM32DFU.js call back into `TABS.firmware_flasher.flashingMessage()`/
// `.flashProgress()` directly (not through the mounted Svelte component) while a
// flash is in progress, so this state has to live outside the component and be
// exposed on the tab adapter object registered in TABS - see
// src/js/tabs/firmware_flasher.js.
export const FLASH_MESSAGE_TYPES = {
  NEUTRAL: "NEUTRAL",
  VALID: "VALID",
  INVALID: "INVALID",
  ACTION: "ACTION",
};

export const flashState = $state({
  message: "",
  messageType: FLASH_MESSAGE_TYPES.NEUTRAL,
  progress: 0,
  flashingEnabled: false,
  showSaveLink: false,
  dfuPermissionPending: false,
});

// Web build only: a board rebooted from serial into its DFU bootloader shows
// up as a new USB device, which navigator.usb.getDevices() doesn't report
// until the user grants access with requestDevice(). That needs a user
// gesture, which STM32.js's post-reboot code (running off timers) no longer
// has, and it can't be granted up front because the device doesn't exist
// until the reboot. So STM32.js parks the rest of the flash here and the UI
// shows a button whose click supplies the gesture (DfuPermissionPrompt).
let pendingDfuPermission = null;

export function requestDfuPermission(onGranted, onDeclined) {
  pendingDfuPermission = { onGranted, onDeclined };
  flashState.dfuPermissionPending = true;
}

export function resolveDfuPermission(granted) {
  const pending = pendingDfuPermission;
  pendingDfuPermission = null;
  flashState.dfuPermissionPending = false;
  if (!pending) return;
  if (granted) pending.onGranted();
  else pending.onDeclined();
}

export function setFlashingMessage(message, type) {
  flashState.messageType = type ?? FLASH_MESSAGE_TYPES.NEUTRAL;
  if (message != null) {
    flashState.message = message;
    flashState.showSaveLink = false;
  }
  return flashApi;
}

export function setFlashProgress(value) {
  flashState.progress = value;
  return flashApi;
}

export function setFlashingEnabled(enabled) {
  flashState.flashingEnabled = enabled;
}

export const flashApi = {
  flashingMessage: setFlashingMessage,
  flashProgress: setFlashProgress,
};

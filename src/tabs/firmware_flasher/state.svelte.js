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
});

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

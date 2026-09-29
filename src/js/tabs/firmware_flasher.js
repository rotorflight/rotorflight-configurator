import { mount, unmount } from "svelte";

import { FirmwareCache } from "@/js/FirmwareCache.js";
import { GUI } from "@/js/gui.js";
import { PortHandler } from "@/js/port_handler.js";

import FirmwareFlasher from "@/tabs/firmware_flasher/FirmwareFlasher.svelte";
import {
  FLASH_MESSAGE_TYPES,
  requestDfuPermission,
  setFlashingEnabled,
  setFlashingMessage,
  setFlashProgress,
} from "@/tabs/firmware_flasher/state.svelte.js";

import { TABS } from "./tabs.js";

const tab = {
  tabName: "firmware_flasher",
  svelteComponent: null,

  // STM32.js/STM32DFU.js call these directly on TABS.firmware_flasher while a
  // flash is in progress - keep this exact chainable contract.
  FLASH_MESSAGE_TYPES,

  flashingMessage(message, type) {
    setFlashingMessage(message, type);
    return this;
  },

  flashProgress(value) {
    setFlashProgress(value);
    return this;
  },

  enableFlashing(enabled) {
    setFlashingEnabled(enabled);
  },

  // Web build only, see state.svelte.js.
  requestDfuPermission(onGranted, onDeclined) {
    requestDfuPermission(onGranted, onDeclined);
  },

  initialize(callback) {
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(FirmwareFlasher, { target });

    GUI.content_ready(callback);
  },

  cleanup(callback) {
    if (this.svelteComponent) {
      unmount(this.svelteComponent);
      this.svelteComponent = null;
    }
    PortHandler.flush_callbacks();
    FirmwareCache.unload();

    // Update Firmware button at top
    $("div#flashbutton a.flash_state").removeClass("active");
    $("div#flashbutton a.flash").removeClass("active");

    callback?.();
  },
};

TABS[tab.tabName] = tab;

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && GUI.active_tab === tab.tabName) {
      TABS[tab.tabName].initialize();
    }
  });

  import.meta.hot.dispose(() => {
    tab.cleanup();
  });
}

import { mount } from "svelte";

import { Beepers } from "@/js/Beepers.js";
import { CliAutoComplete } from "@/js/CliAutoComplete.js";
import { Clipboard } from "@/js/Clipboard.js";
import { ConfigInserter } from "@/js/ConfigInserter.js";
import { ConfigStorage } from "@/js/ConfigStorage.js";
import { DarkTheme } from "@/js/DarkTheme.js";
import { Features } from "@/js/features.svelte.js";
import { FirmwareCache } from "@/js/FirmwareCache.js";
import { Mixer } from "@/js/Mixer.js";
import { RateCurve, RateCurve2 } from "@/js/RateCurve.js";
import { VirtualFC } from "@/js/VirtualFC.js";
import * as backupRestore from "@/js/backup_restore.js";
import * as dataStorage from "@/js/data_storage.js";
import * as defaultHuffmanTree from "@/js/default_huffman_tree.js";
import { FC } from "@/js/fc.svelte.js";
import { GuiControl } from "@/js/gui.js";
import { getTabHelpURL } from "@/js/help.js";
import { huffmanDecodeBuf } from "@/js/huffman.js";
import { i18n } from "@/js/localization.js";
import * as main from "@/js/main.js";
import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes";
import { MspHelper } from "@/js/msp/MSPHelper.js";
import { UI_PHONES } from "@/js/phones_ui.js";
import { PortHandler, usbDevices } from "@/js/port_handler.js";
import { portUsage } from "@/js/port_usage.svelte.js";
import { STM32 } from "@/js/protocols/stm32.js";
import { STM32DFU } from "@/js/protocols/stm32usbdfu.js";
import { ReleaseChecker } from "@/js/release_checker.js";
import { serial } from "@/js/serial.js";
import * as serialBackend from "@/js/serial_backend.js";
import * as utilsCommon from "@/js/utils/common.js";

import "@/js/injected_methods.js";
import "@/js/tabs/index.js";

import "nouislider/dist/nouislider.css";
import "@/css/slider.css";
import "@/css/app.css";

import BatteryLegend from "@/components/BatteryLegend.svelte";
import Logo from "@/components/Logo.svelte";
import StatusBar from "@/components/StatusBar.svelte";

globalThis.GUI = new GuiControl();

// TODO: Remove these items from the global namespace.
// Import them directly where they are needed.
Object.assign(globalThis, {
  ...backupRestore,
  ...dataStorage,
  ...defaultHuffmanTree,
  ...main,
  ...serialBackend,
  ...utilsCommon,
  Beepers,
  CliAutoComplete,
  Clipboard,
  ConfigInserter,
  ConfigStorage,
  DarkTheme,
  FC,
  Features,
  FirmwareCache,
  MSP,
  MSPCodes,
  Mixer,
  MspHelper,
  PortHandler,
  RateCurve,
  RateCurve2,
  ReleaseChecker,
  STM32,
  STM32DFU,
  UI_PHONES,
  VirtualFC,
  getTabHelpURL,
  huffmanDecodeBuf,
  i18n,
  portUsage,
  serial,
  usbDevices,
});

CONFIGURATOR.version = __APP_VERSION__;
CONFIGURATOR.gitChangesetId = __COMMIT_HASH__;

mount(BatteryLegend, { target: document.querySelector("#battery-legend") });
mount(StatusBar, { target: document.querySelector("#status-bar") });
mount(Logo, { target: document.querySelector("#logo-desktop") });
mount(Logo, { target: document.querySelector("#logo-mobile") });

if (__BACKEND__ === "nwjs") {
  Clipboard._configureClipboardAsNwJs(GUI.nwGui);
}

if (__BACKEND__ === "cordova") {
  (async () => {
    const chromeapi = await import("@/js/cordova_chromeapi.js");
    const startup = await import("@/js/cordova_startup.js");
    Object.assign(globalThis, {
      ...chromeapi,
      ...startup,
    });

    Clipboard._configureClipboardAsCordova();
    cordovaApp.initialize();
  })();
}

if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", () => {
    serial.disconnect();
  });
}

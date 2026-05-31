import "multiple-select";
import { mount } from "svelte";

import { CliAutoComplete } from "@/js/CliAutoComplete.js";
import * as backupRestore from "@/js/backup_restore.js";
import * as configurator from "@/js/configurator.svelte.js";
import * as defaultHuffmanTree from "@/js/default_huffman_tree.js";
import { FC } from "@/js/fc.svelte.js";
import { GuiControl } from "@/js/gui.js";
import { getTabHelpURL } from "@/js/help.js";
import { i18n } from "@/js/localization.js";
import * as main from "@/js/main.js";
import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes";
import { MspHelper } from "@/js/msp/MSPHelper.js";
import { serial } from "@/js/serial.js";
import * as serialBackend from "@/js/serial_backend.js";
import * as utilsCommon from "@/js/utils/common.js";

import "@/js/injected_methods.js";
import "@/js/tabs/index.js";

import "multiple-select/dist/multiple-select.css";
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
  ...configurator,
  ...defaultHuffmanTree,
  ...main,
  ...serialBackend,
  ...utilsCommon,
  CliAutoComplete,
  FC,
  MSP,
  MSPCodes,
  MspHelper,
  getTabHelpURL,
  i18n,
  serial,
});

mount(BatteryLegend, { target: document.querySelector("#battery-legend") });
mount(StatusBar, { target: document.querySelector("#status-bar") });
mount(Logo, { target: document.querySelector("#logo-desktop") });
mount(Logo, { target: document.querySelector("#logo-mobile") });

if (__BACKEND__ === "cordova") {
  (async () => {
    const chromeapi = await import("@/js/cordova_chromeapi.js");
    const startup = await import("@/js/cordova_startup.js");
    Object.assign(globalThis, {
      ...chromeapi,
      ...startup,
    });

    cordovaApp.initialize();
  })();
}

if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", (event) => {
    if (
      (event.path?.endsWith(".html") && event.path !== "/index.html") ||
      event.path === "/"
    ) {
      return;
    }

    console.log("vite disconnecting serial");
    serial.disconnect();
  });
}

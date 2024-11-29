import { Beepers } from "@/js/Beepers.js";
import { Clipboard } from "@/js/Clipboard.js";
import { ConfigInserter } from "@/js/ConfigInserter.js";
import { ConfigStorage } from "@/js/ConfigStorage.js";
import { DarkTheme } from "@/js/DarkTheme.js";
import { Features } from "@/js/Features.js";
import { FirmwareCache } from "@/js/FirmwareCache.js";
import { Mixer } from "@/js/Mixer.js";
import { RPMFilter } from "@/js/RPMFilter.js";
import { RateCurve, RateCurve2 } from "@/js/RateCurve.js";
import { FC } from "@/js/fc.js";
import { GuiControl } from "@/js/gui.js";
import { getTabHelpURL } from "@/js/help.js";
import { MSP } from "@/js/msp.js";
import { MSPCodes } from "@/js/msp/MSPCodes";
import { MspHelper } from "@/js/msp/MSPHelper.js";
import { UI_PHONES } from "@/js/phones_ui.js";
import { PortHandler, usbDevices } from "@/js/port_handler.js";
import { PortUsage } from "@/js/port_usage.js";
import { STM32 } from "@/js/protocols/stm32.js";
import { STM32DFU } from "@/js/protocols/stm32usbdfu.js";
import { ReleaseChecker } from "@/js/release_checker.js";
import { serial } from "@/js/serial.js";
import * as serialBackend from "@/js/serial_backend.js";

import "@/components/init.js";
import "@/js/filesystem.js";
import "@/js/tabs/index.js";

import "nouislider/dist/nouislider.css";
import "@/css/slider.css";

CONFIGURATOR.version = __APP_VERSION__;
CONFIGURATOR.gitChangesetId = __COMMIT_HASH__;

globalThis.GUI = new GuiControl();

Object.assign(globalThis, {
  ...serialBackend,
  Beepers,
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
  PortUsage,
  RPMFilter,
  RateCurve,
  RateCurve2,
  ReleaseChecker,
  STM32,
  STM32DFU,
  UI_PHONES,
  getTabHelpURL,
  serial,
  usbDevices,
});

if (GUI.isNWJS()) {
  Clipboard._configureClipboardAsNwJs(GUI.nwGui);
} else if (GUI.isCordova()) {
  Clipboard._configureClipboardAsCordova();
} else {
  Clipboard._configureClipboardAsOther();
}

import { Beepers } from "@/js/Beepers.js";
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
import { PortHandler, usbDevices } from "@/js/port_handler.js";
import { PortUsage } from "@/js/port_usage.js";
import { STM32 } from "@/js/protocols/stm32.js";
import { STM32DFU } from "@/js/protocols/stm32usbdfu.js";
import { ReleaseChecker } from "@/js/release_checker.js";
import { serial } from "@/js/serial.js";

import "@/components/init.js";
import "@/js/filesystem.js";
import "@/js/tabs/index.js";

import "nouislider/dist/nouislider.css";
import "@/css/slider.css";

CONFIGURATOR.version = __APP_VERSION__;
CONFIGURATOR.gitChangesetId = __COMMIT_HASH__;

globalThis.GUI = new GuiControl();

Object.assign(globalThis, {
  Beepers,
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

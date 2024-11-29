import { ConfigInserter } from "@/js/ConfigInserter.js";
import { ConfigStorage } from "@/js/ConfigStorage.js";
import { DarkTheme } from "@/js/DarkTheme.js";
import { Features } from "@/js/Features.js";
import { Mixer } from "@/js/Mixer.js";
import { RPMFilter } from "@/js/RPMFilter.js";
import { RateCurve, RateCurve2 } from "@/js/RateCurve.js";
import { GuiControl } from "@/js/gui.js";
import { PortUsage } from "@/js/port_usage.js";
import { STM32 } from "@/js/protocols/stm32.js";
import { STM32DFU } from "@/js/protocols/stm32usbdfu.js";

import "@/components/init.js";
import "@/js/filesystem.js";
import "@/js/tabs/index.js";

import "nouislider/dist/nouislider.css";
import "@/css/slider.css";

CONFIGURATOR.version = __APP_VERSION__;
CONFIGURATOR.gitChangesetId = __COMMIT_HASH__;

globalThis.GUI = new GuiControl();

Object.assign(globalThis, {
  ConfigInserter,
  ConfigStorage,
  DarkTheme,
  Features,
  Mixer,
  PortUsage,
  RPMFilter,
  RateCurve,
  RateCurve2,
  STM32,
  STM32DFU,
});

if (GUI.isNWJS()) {
  Clipboard._configureClipboardAsNwJs(GUI.nwGui);
} else if (GUI.isCordova()) {
  Clipboard._configureClipboardAsCordova();
} else {
  Clipboard._configureClipboardAsOther();
}

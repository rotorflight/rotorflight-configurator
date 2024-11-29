import { Features } from "@/js/Features.js";
import { Mixer } from "@/js/Mixer.js";
import { RPMFilter } from "@/js/RPMFilter.js";
import { RateCurve, RateCurve2 } from "@/js/RateCurve.js";
import { STM32 } from '@/js/protocols/stm32.js';
import { STM32DFU } from '@/js/protocols/stm32usbdfu.js';

import "@/components/init.js";
import "@/js/filesystem.js";
import "@/js/tabs/index.js";

import "nouislider/dist/nouislider.css";
import "@/css/slider.css";

CONFIGURATOR.version = __APP_VERSION__;
CONFIGURATOR.gitChangesetId = __COMMIT_HASH__;

Object.assign(globalThis, {
  Features,
  Mixer,
  RPMFilter,
  RateCurve,
  RateCurve2,
  STM32,
  STM32DFU,
});

import { Features } from "@/js/Features.js";
import { Mixer } from "@/js/Mixer.js";
import { RPMFilter } from "@/js/RPMFilter.js";

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
});

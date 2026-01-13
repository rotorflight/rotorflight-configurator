import semver from "semver";

import { FC } from "@/js/fc.svelte.js";
import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";

class State {
  is_12_9 = $derived(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9));

  govModes = $derived(
    this.is_12_9
      ? ["OFF", "LIMIT", "DIRECT", "ELECTRIC", "NITRO"]
      : ["OFF", "PASSTHROUGH", "STANDARD", "MODE1", "MODE2"],
  );

  govMode = $derived(this.govModes[FC.GOVERNOR.gov_mode]);

  enabled = $derived(
    FC.FEATURE_CONFIG.features.GOVERNOR && FC.GOVERNOR.gov_mode > 0,
  );

  govRamps = $derived.by(() => {
    if (this.is_12_9) {
      return this.enabled && FC.GOVERNOR.gov_mode > 1;
    }

    return this.enabled;
  });

  govHeadspeed = $derived.by(() => {
    if (this.is_12_9) {
      return this.enabled && FC.GOVERNOR.gov_mode > 2;
    }

    return this.enabled && FC.GOVERNOR.gov_mode > 1;
  });

  govLimits = $derived(this.enabled);

  govAutorotation = $derived(
    this.is_12_9 && this.enabled && FC.GOVERNOR.gov_mode > 1,
  );
}

export default new State();

export const GOV_THROTTLE_TYPE = {
  NORMAL: 0,
  SWITCH: 1,
  FUNCTION: 2,
};

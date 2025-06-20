import semver from "semver";

import { FC } from "@/js/fc.svelte.js";
import { API_VERSION_12_8 } from "@/js/data_storage";

class State {
  overrideEnabled = $state(false);

  throttleProtocols = $derived([
    "PWM",
    "ONESHOT125",
    "ONESHOT42",
    "MULTISHOT",
    "BRUSHED",
    "DSHOT150",
    "DSHOT300",
    "DSHOT600",
    "PROSHOT",
    ...(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8) ? ["CASTLE"] : []),
    "DISABLED",
  ]);

  telemetryProtocols = $derived([
    "Disabled",
    "BLHeli32",
    "Hobbywing Platinum V4 / FlyFun V5",
    "Hobbywing Platinum V5",
    "Scorpion",
    "Kontronik",
    "OMPHobby",
    "ZTW",
    "APD",
    "OpenYGE",
    "FLYROTOR",
    "Graupner",
    ...(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8) ? ["XDFLY"] : []),
  ]);

  throttleEnabled = $derived(
    this.throttleProtocols[FC.MOTOR_CONFIG.motor_pwm_protocol] !== "DISABLED",
  );
  isDshot = $derived(
    this.throttleProtocols[FC.MOTOR_CONFIG.motor_pwm_protocol].startsWith(
      "DSHOT",
    ),
  );
  isCastleLink = $derived(
    this.throttleProtocols[FC.MOTOR_CONFIG.motor_pwm_protocol] === "CASTLE",
  );
  hasTelemPort = $derived(FC.ESC_SENSOR_CONFIG.protocol > 0);
  telemEnabled = $derived(this.hasTelemPort || this.isCastleLink);

  /**
   * Sets the correct features and config based on the state of CastleLink
   */
  fixConfig() {
    FC.FEATURE_CONFIG.features.ESC_SENSOR = this.telemEnabled;
    if (this.isCastleLink) {
      FC.ESC_SENSOR_CONFIG.protocol = 0;
    }
  }
}

export default new State();

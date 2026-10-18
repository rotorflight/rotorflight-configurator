// What the governor needs from the rest of the setup.

import { FC } from "@/js/fc.svelte.js";
import motorState from "@/tabs/motors/state.svelte.js";

// ELECTRIC and NITRO (STANDARD and up before API 12.9) hold the headspeed,
// and only arm with a fast RPM signal: an RPM sensor or bidirectional
// DShot (isMotorFastRpmSourceActive, flight/motors.c). Serial ESC
// telemetry is too slow. Read from the config, so it can be shown before
// the reboot; the sensor's pin is not checked.
export function hasFastRpm() {
  if (!FC.MOTOR_CONFIG.motor_poles?.[0]) return false;
  if (FC.FEATURE_CONFIG.features.FREQ_SENSOR) return true;
  return motorState.isDshot && !!FC.MOTOR_CONFIG.use_dshot_telemetry;
}

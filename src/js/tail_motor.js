import semver from "semver";

import { API_VERSION_12_10 } from "@/js/configurator.svelte.js";
import { FC } from "@/js/fc.svelte.js";
import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import { mspHelper } from "@/js/msp/MSPHelper.js";

// What a motorised tail needs besides the tail mode, shared by the Mixer
// tab and the Setup Wizard:
// - the tail pin as MOTOR 2. Many boards come with it as SERVO 4, so
//   MSP2_TAIL_MOTOR_OUTPUT (API 12.10) switches it, as
//   `resource SERVO 4 NONE` + `resource MOTOR 2 <pin>` would.
// - Tail Torque Assist, off by default, on every profile.

// tailOutput_e, tailOutputResult_e in flight/servos.h.
export const TAIL_OUTPUT = { SERVO: 0, MOTOR: 1, BOTH: 2, NONE: 3 };
export const TAIL_RESULT = {
  OK: 0,
  CUSTOM: 1,
  NO_MAIN_MOTOR: 2,
  NO_TIMER: 3,
  TIMER_SHARED: 4,
  INVALID: 5,
  NO_DMA: 6,
};

const ACTION_READ = 0;
const ACTION_TO_SERVO = 1;
const ACTION_TO_MOTOR = 2;

export const TTA_GAIN_MOTOR = 100;
export const TTA_GAIN_OFF = 0;

export function hasTailOutputSwitch() {
  return semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_10);
}

// { output, result } (TAIL_OUTPUT, TAIL_RESULT), or null where the
// firmware doesn't know the command.
async function tailOutputCommand(action) {
  if (!hasTailOutputSwitch()) return null;
  const response = await MSP.promise(MSPCodes.MSP2_TAIL_MOTOR_OUTPUT, [
    action,
  ]);
  const data = response?.data;
  if (!data || data.byteLength < 2) return null;
  return { output: data.getUint8(0), result: data.getUint8(1) };
}

export function readTailOutput() {
  return tailOutputCommand(ACTION_READ);
}

// Unsaved: the caller saves to EEPROM and reboots.
export function switchTailOutput(motorised) {
  return tailOutputCommand(motorised ? ACTION_TO_MOTOR : ACTION_TO_SERVO);
}

// Whether the tail pin is where the tail mode needs it.
export function tailOutputMatches(output, motorised) {
  if (motorised) {
    return output === TAIL_OUTPUT.MOTOR || output === TAIL_OUTPUT.BOTH;
  }
  return output === TAIL_OUTPUT.SERVO || output === TAIL_OUTPUT.BOTH;
}

// gov_tta_gain is per profile: select each in turn, then the one that was
// active. Unsaved.
export async function setTtaGainAllProfiles(gain) {
  await MSP.promise(MSPCodes.MSP_STATUS);
  const active = FC.CONFIG.profile;
  for (let profile = 0; profile < FC.CONFIG.numProfiles; profile++) {
    await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [profile]);
    await MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE);
    if (FC.GOVERNOR.gov_tta_gain === gain) continue;
    FC.GOVERNOR.gov_tta_gain = gain;
    await MSP.promise(
      MSPCodes.MSP_SET_GOVERNOR_PROFILE,
      mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR_PROFILE),
    );
  }
  await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [active]);
  await MSP.promise(MSPCodes.MSP_STATUS);
  await MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE);
}

// After a reboot, from the MSP_MOTOR the caller polls: a motor whose
// output didn't set up reads 0 (msp.c). One failing motor stops them all,
// and the FC then refuses to arm (API 12.10). "main" when no motor runs,
// "tail" when only a motorised tail's MOTOR 2 is missing, else null.
export function motorOutputProblem(protocolEnabled, motorised) {
  if (!protocolEnabled) return null;
  if (!FC.MOTOR_DATA[0]) return "main";
  if (motorised && !FC.MOTOR_DATA[1]) return "tail";
  return null;
}

// Everything a change of tail mode needs besides the mode itself. Returns
// the pin switch reply (null without the command).
export async function applyTailMode(motorised) {
  const reply = await switchTailOutput(motorised);
  await setTtaGainAllProfiles(motorised ? TTA_GAIN_MOTOR : TTA_GAIN_OFF);
  return reply;
}

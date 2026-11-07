// The throttle range over the ESC link for a YGE (#529), as the EdgeTX and Ethos suites do it.
//
// The measured range (FC.RC_CONFIG's throttle endpoints) goes to two places: the FC's motor
// endpoints, and the ESC's own 0 % pulse and span. A range counts as set only when both read
// back. The ESC fields and their meaning are carried over from the EdgeTX suite and are not
// yet checked against a YGE ESC.

import { FC } from "@/js/fc.svelte.js";
import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import { mspHelper } from "@/js/msp/MSPHelper.js";
import { getManufacturer } from "@/tabs/esc_programming/manufacturers/index.js";
import {
  buildManufacturerPayload,
  mismatchedKeys,
  parseManufacturerBuffer,
} from "@/tabs/esc_programming/engine.js";
import { delay, readEscParametersOnce } from "@/tabs/esc_programming/detection.js";

// The ESC telemetry protocol of a YGE (manufacturers/yge.js escSensorProtocolIds).
export const YGE_PROTOCOL = 9;

// The YGE fields that hold a throttle range, and what they accept (microseconds).
const RANGE = {
  zero: "stick_zero_us",
  zeroMin: 900,
  zeroMax: 1900,
  span: "stick_range_us",
  spanMin: 600,
  spanMax: 1500,
};

// The motor's stop command while the range is set: the FC's idle, as Ethos sets it.
const MINCOMMAND = 1000;

// The ESC fields for a throttle range, or the reason it cannot be written.
export function rangeChanges(minUs, maxUs) {
  if (typeof minUs !== "number" || typeof maxUs !== "number") {
    return { reason: "no_range" };
  }
  if (minUs <= 1000 || maxUs <= minUs) return { reason: "no_range" };
  const span = maxUs - minUs;
  if (minUs < RANGE.zeroMin || minUs > RANGE.zeroMax) {
    return { reason: "out_of_range" };
  }
  if (span < RANGE.spanMin || span > RANGE.spanMax) {
    return { reason: "out_of_range" };
  }
  return { changes: { [RANGE.zero]: minUs, [RANGE.span]: span } };
}

// Sets the FC's motor endpoints for the range. The caller saves them to EEPROM.
// Resolves false when the FC refuses the write.
export async function setFcEndpoints(minUs, maxUs) {
  const code = MSPCodes.MSP_SET_MOTOR_CONFIG;
  FC.MOTOR_CONFIG.mincommand = MINCOMMAND;
  FC.MOTOR_CONFIG.minthrottle = minUs;
  FC.MOTOR_CONFIG.maxthrottle = maxUs;
  const reply = await MSP.promise(code, mspHelper.crunch(code));
  return !reply?.unsupported;
}

// The FC's motor endpoints, read back from the FC.
export async function readFcEndpoints() {
  await MSP.promise(MSPCodes.MSP_MOTOR_CONFIG);
  return {
    min: FC.MOTOR_CONFIG.minthrottle,
    max: FC.MOTOR_CONFIG.maxthrottle,
  };
}

// Writes the range fields to the YGE, keeping every other field as the ESC holds it, and
// reads them back up to three times. Resolves {} when the ESC holds them, else {reason}.
export async function writeYgeRange(changes) {
  const yge = getManufacturer("yge");
  const before = await readEscParametersOnce();
  const current = parseManufacturerBuffer(yge, before).display;
  const payload = buildManufacturerPayload(
    yge,
    { ...current, ...changes },
    before,
  );
  const reply = await MSP.promise(
    MSPCodes.MSP_SET_ESC_PARAMETERS,
    Array.from(payload),
  );
  if (reply?.unsupported) return { reason: "write" };

  const keys = Object.keys(changes);
  let mismatch = keys;
  for (let attempt = 0; attempt < 3 && mismatch.length > 0; attempt++) {
    await delay(attempt === 0 ? 300 : 600);
    const after = await readEscParametersOnce();
    const afterDisplay = parseManufacturerBuffer(yge, after).display;
    mismatch = mismatchedKeys(changes, afterDisplay, keys);
  }
  return mismatch.length > 0 ? { reason: "mismatch" } : {};
}

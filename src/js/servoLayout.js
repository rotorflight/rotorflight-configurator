import semver from "semver";

import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";

// How a board's servo outputs are laid out, in one place, because two
// tabs have to agree on it: the Servos tab draws a row per servo, and
// the Mixer tab decides which outputs a custom rule may drive. They
// disagreed before this existed -- the mixer assumed servos were just
// 1..servoCount, which silently offered PWM servos a board doesn't
// have and hid every bus servo.

// Bus servo channels the firmware carries (BUS_SERVO_CHANNELS,
// pg/bus_servo.h). MSP_BUS_SERVO_CONFIG always reports this many.
export const BUS_SERVO_CHANNELS = 18;

// Servos from this firmware index on are bus servos (BUS_SERVO_OFFSET
// in pg/bus_servo.h). PWM servos occupy 0..7 below it.
export const BUS_SERVO_OFFSET = 8;

// Of the 18 the firmware carries, only this many are shown. Kept here
// rather than inline in the Servos tab so the Mixer tab offers exactly
// the outputs the Servos tab lists -- a bus servo the user can't see
// or configure shouldn't be selectable as a mixer output either.
export const BUS_SERVO_DISPLAY_LIMIT = 16;

export const MAX_PWM_SERVOS = 8;

/**
 * Whether bus servos are in play: new enough firmware, and a serial
 * port actually configured to carry them. Without an FBUS/SBUS output
 * the firmware reports the channels but nothing drives them.
 */
export function busServosActive(apiVersion, serialPorts) {
  if (!apiVersion || !semver.gte(apiVersion, API_VERSION_12_9)) return false;

  return !!serialPorts?.some(
    (port) =>
      port.functions.includes("FBUS_OUT") || port.functions.includes("SBUS_OUT"),
  );
}

/**
 * How many PWM servos this board has.
 *
 * FC.CONFIG.servoCount counts bus servos too once the bus is active, so
 * it can't be used directly. SERVO_CONFIG is packed as the PWM servos
 * followed by all BUS_SERVO_CHANNELS of them, which is what makes the
 * subtraction the reliable answer in that case.
 */
export function pwmServoCount(active, servoConfigLength, statusServoCount) {
  if (active) return Math.max(0, servoConfigLength - BUS_SERVO_CHANNELS);
  return Math.min(statusServoCount ?? 0, MAX_PWM_SERVOS);
}

/** How many bus servos are shown, which is none when the bus is off. */
export function busServoCount(active) {
  return active ? Math.min(BUS_SERVO_CHANNELS, BUS_SERVO_DISPLAY_LIMIT) : 0;
}

/**
 * The mixer output index a bus servo drives. Mixer outputs are 1-based
 * (None=0, Servo1-26=1-26, Motor1-4=27-30) over the same servo numbering
 * the firmware uses, so bus servo 0 -- "Bus Servo 1" on screen -- is
 * output 9. Deliberately independent of how many PWM servos the board
 * has: the firmware reserves 0..7 for PWM whether or not they're wired,
 * so the bus always starts at the same place.
 */
export function busServoOutput(busIndex) {
  return BUS_SERVO_OFFSET + busIndex + 1;
}

/**
 * Where a mixer output's live value sits in FC.SERVO_DATA.
 *
 * MSP_SERVO is packed, not indexed by servo number: the firmware sends
 * getServoCount() PWM outputs followed by all BUS_SERVO_CHANNELS bus
 * outputs, skipping the unconfigured PWM slots in between (msp.c,
 * MSP_SERVO). So a bus servo's position in that payload moves with how
 * many PWM servos the board has, even though its own servo index never
 * does -- reading it at `dst - 1` lands on the wrong servo on any board
 * with fewer than BUS_SERVO_OFFSET PWM servos, and past the end of the
 * array for the higher channels.
 *
 * @param {number} dst - mixer output index (1-based: Servo 1 is 1).
 * @param {number} pwmServos - PWM servos this board has.
 */
export function servoDataIndex(dst, pwmServos) {
  const servoIndex = dst - 1;

  if (servoIndex >= BUS_SERVO_OFFSET) {
    return pwmServos + (servoIndex - BUS_SERVO_OFFSET);
  }

  return servoIndex;
}

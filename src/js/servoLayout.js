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

// A bus channel's source (busServoSourceType_e, pg/bus_servo.h). On RX it
// passes the receiver straight through and ignores the mixer. Firmware
// defaults channels 1-8 to Mixer and 9-18 to RX (pg/bus_servo.c).
export const BUS_SOURCE_MIXER = 0;
export const BUS_SOURCE_RX = 1;

/**
 * The mixer output a bus channel follows. Bus channels read the mixer by
 * channel number (sbusOutMixerIndex() in drivers/sbus_output.c, and
 * rotorflight-firmware#516): bus channel 1 follows mixer output 1, the
 * same output PWM servo 1 follows. So channels 1-8 mirror PWM servos 1-8
 * and channels 9-16 are outputs only the bus has.
 *
 * This is NOT the bus servo's own servo index (BUS_SERVO_OFFSET + i, i.e.
 * S9 for channel 1). That index only selects the channel's servo
 * settings -- centre, limits, scale -- on the Servos tab; it isn't what
 * the mixer drives. A rule on mixer output 9 moves bus channel 9.
 *
 * @param {number} busIndex - 0-based bus channel.
 * @returns {number} mixer output index (1-based).
 */
export function busServoOutput(busIndex) {
  return busIndex + 1;
}

/**
 * Where a mixer output's live value sits in FC.SERVO_DATA.
 *
 * MSP_SERVO is packed, not indexed by servo number: the firmware sends
 * getServoCount() PWM outputs followed by all BUS_SERVO_CHANNELS bus
 * outputs, skipping the unconfigured PWM slots in between (msp.c,
 * MSP_SERVO). An output with a PWM pin is read from that pin; one without
 * is read from the bus channel that follows it, whose place in the
 * payload moves with how many PWM servos the board has.
 *
 * @param {number} dst - mixer output index (1-based: Servo 1 is 1).
 * @param {number} pwmServos - PWM servos this board has.
 * @param {boolean} busActive - whether the bus channels are in the payload.
 */
export function servoDataIndex(dst, pwmServos, busActive) {
  if (busActive && dst > pwmServos) {
    return pwmServos + (dst - 1);
  }

  return dst - 1;
}

/**
 * What to call the bus in output labels: "SBUS" or "FBUS", or "" when
 * both kinds of output port are set up (or neither).
 */
export function busLabelFor(serialPorts = []) {
  const sbus = serialPorts.some((p) => p.functions.includes("SBUS_OUT"));
  const fbus = serialPorts.some((p) => p.functions.includes("FBUS_OUT"));
  if (sbus === fbus) return "";
  return sbus ? "SBUS" : "FBUS";
}

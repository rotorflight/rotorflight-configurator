import semver from "semver";

import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";

// Servo output limits, matching the firmware's validateAndFixServoConfig()
// (rotorflight-firmware src/main/flight/servos.c). From 4.6.0 (API 12.9) the
// firmware keeps center + min/max inside the servo's signal range and
// rewrites the stored min/max whenever they'd go past it. Earlier firmware
// stores min/max as sent.

// PWM_SERVO_PULSE_MIN/MAX (rx/rx.h)
const PWM_SIGNAL = { min: 50, max: 2500 };
// BUS_SERVO_MIN/MAX_SIGNAL (pg/bus_servo.h)
const BUS_SIGNAL = { min: 1000, max: 2000 };

// SERVO_LIMIT_MIN/MAX (flight/servos.h)
const TRAVEL_LIMIT = 1000;

// Travel the Servos tab offers either side of center. Bus servos only span
// 1000-2000, so a centered bus servo can't use more than 500.
const PWM_TRAVEL = 1000;
const BUS_TRAVEL = 500;

// Servos with a firmware index from here on are bus servos (BUS_SERVO_OFFSET
// in pg/bus_servo.h).
export const BUS_SERVO_OFFSET = 8;

// Whether this firmware cuts min/max back to fit the signal range.
export function firmwareLimitsTravel(apiVersion) {
  return !!apiVersion && semver.gte(apiVersion, API_VERSION_12_9);
}

export function servoSignalRange(isBusServo) {
  return isBusServo ? BUS_SIGNAL : PWM_SIGNAL;
}

// Travel range for the Min/Max fields, before the center is considered.
export function servoTravelRange(isBusServo) {
  const travel = isBusServo ? BUS_TRAVEL : PWM_TRAVEL;
  return { min: -travel, max: travel };
}

// Most travel either side of center that keeps the output in range.
export function servoTravelLimits(mid, isBusServo) {
  const signal = servoSignalRange(isBusServo);
  const travel = servoTravelRange(isBusServo);
  return {
    min: Math.max(travel.min, signal.min - mid),
    max: Math.min(travel.max, signal.max - mid),
  };
}

// Whether min/max sit at a limit set by the center rather than by the
// travel range, i.e. the firmware has cut (or would cut) them to fit.
export function servoTravelLimited(config, isBusServo) {
  const signal = servoSignalRange(isBusServo);
  const travel = servoTravelRange(isBusServo);
  const minLimit = signal.min - config.mid;
  const maxLimit = signal.max - config.mid;
  return {
    min: minLimit > travel.min && config.min <= minLimit,
    max: maxLimit < travel.max && config.max >= maxLimit,
  };
}

// Same fix the firmware applies on every servo config write.
export function clampServoConfig(config, isBusServo) {
  const signal = servoSignalRange(isBusServo);
  config.mid = Math.min(Math.max(config.mid, signal.min), signal.max);
  config.min = Math.min(Math.max(config.min, -TRAVEL_LIMIT), 0);
  config.max = Math.min(Math.max(config.max, 0), TRAVEL_LIMIT);
  config.min = Math.max(config.min, signal.min - config.mid);
  config.max = Math.min(config.max, signal.max - config.mid);
}

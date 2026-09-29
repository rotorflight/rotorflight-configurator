import semver from "semver";

import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";

// Servo output limits, matching the firmware (rotorflight-firmware
// src/main/flight/servos.c). From 4.6.0 (API 12.9) the firmware keeps
// center + min/max inside the servo's signal range. It first did that by
// rewriting the stored min/max; it now keeps them as set and limits them
// against the center when working out the output, so moving the center back
// gives the full travel again. Either way servoTravelLimited() flags the
// servos it affects. Earlier firmware doesn't limit travel by the center.

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

// Whether this firmware limits min/max by the center to fit the signal range.
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

// Travel the output actually uses at this center (servoTravelMin/Max()).
export function servoUsableTravel(config, isBusServo) {
  const signal = servoSignalRange(isBusServo);
  return {
    min: Math.max(config.min, signal.min - config.mid),
    max: Math.min(config.max, signal.max - config.mid),
  };
}

// Whether min/max reach a limit set by the center rather than by the travel
// range, so the output stops short of (or exactly at) the signal limit.
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

// Same fix the firmware's validateAndFixServoConfig() applies on every servo
// config write. It doesn't touch min/max against the center.
export function clampServoConfig(config, isBusServo) {
  const signal = servoSignalRange(isBusServo);
  config.mid = Math.min(Math.max(config.mid, signal.min), signal.max);
  config.min = Math.min(Math.max(config.min, -TRAVEL_LIMIT), 0);
  config.max = Math.min(Math.max(config.max, 0), TRAVEL_LIMIT);
}

// Pure helpers for the Setup Wizard: which servo does what, and the unit
// conversions the Mixer and Servos tabs use.

import { Mixer } from "@/js/Mixer.js";
import { SWASH_LAYOUTS, TAIL_SERVO } from "@/js/swash.js";

// Mixer inputs (flight/mixer.h MIXER_IN_STABILIZED_*).
export const ROLL = 1;
export const PITCH = 2;
export const YAW = 3;
export const COLLECTIVE = 4;
export const STABILIZED_AXES = [ROLL, PITCH, YAW, COLLECTIVE];

// Mixer override units per degree (or per % of tail motor throttle), as on
// the Mixer tab: 1000 is 12° on the swash and 24° on a variable pitch tail.
const MAIN_RAW_PER_DEG = 1000 / 12;
const TAIL_RAW_PER_DEG = 1000 / 24;
const TAIL_MOTOR_RAW_PER_PERCENT = 10;

export function swashRaw(degrees) {
  return Math.round(degrees * MAIN_RAW_PER_DEG);
}

export function tailRaw(degrees, motorised) {
  return Math.round(
    degrees * (motorised ? TAIL_MOTOR_RAW_PER_PERCENT : TAIL_RAW_PER_DEG),
  );
}

// Servo override units for a PWM servo: 1000 is 50°, as on the Servos tab.
export function servoRaw(degrees) {
  return Math.round((degrees * 1000) / 50);
}

// Mixer input min/max (or blade_pitch_limit) to degrees and back.
export function limitDegrees(raw, tail = false) {
  return Math.round(raw * (tail ? 24 : 12)) / 1000;
}

export function limitRaw(degrees, tail = false) {
  return Math.round((degrees * 1000) / (tail ? 24 : 12));
}

// The servos the wizard sets up, in output order: the swash servos of the
// swash type, then the tail servo when the tail is variable pitch. Only
// those the board has an output for.
export function wizardServos(mixerConfig, servoCount) {
  const layout = SWASH_LAYOUTS[mixerConfig?.swash_type] ?? [];
  const servos = layout
    .map((s, servo) => ({ servo, role: s.role, kind: "swash" }))
    .filter((s) => s.servo < servoCount);
  if (
    mixerConfig?.tail_rotor_mode === Mixer.TAIL_MODE_VARIABLE &&
    TAIL_SERVO < servoCount
  ) {
    servos.push({ servo: TAIL_SERVO, role: "swashServoRoleTail", kind: "tail" });
  }
  return servos;
}

// Servo numbers (1-based) the setup needs but the board has no output for.
export function missingServos(mixerConfig, servoCount) {
  const wanted = (SWASH_LAYOUTS[mixerConfig?.swash_type] ?? []).map(
    (_, i) => i,
  );
  if (mixerConfig?.tail_rotor_mode === Mixer.TAIL_MODE_VARIABLE) {
    wanted.push(TAIL_SERVO);
  }
  return wanted.filter((i) => i >= servoCount).map((i) => i + 1);
}

// The calibration (mixer input rate, 0.1 %) that turns `measured` degrees at
// `commanded` degrees of override into the commanded angle. Kept in the
// Mixer tab's 20-200 % range.
export function calibratedRate(rate, commanded, measured) {
  if (!(measured > 0) || !(commanded > 0)) return rate;
  const sign = rate < 0 ? -1 : 1;
  const next = (Math.abs(rate) * commanded) / measured;
  return sign * Math.round(Math.max(200, Math.min(2000, next)));
}

//// Receiver channel order.
//
// RC_MAP[function] = receiver channel, functions in the order roll, pitch,
// yaw, collective, throttle, aux 1-3 (rxConfig()->rcmap).

// A full map from the channels found for the first functions (in order);
// the rest take the remaining channels in order.
export function mapFromDetected(found, length) {
  const rest = [];
  for (let channel = 0; channel < length; channel++) {
    if (!found.includes(channel)) rest.push(channel);
  }
  return [...found, ...rest].slice(0, length);
}

// Minimum movement (us) that counts as "this stick moved", and how much
// further it must have moved than any other channel.
const DETECT_MIN_US = 300;
const DETECT_RATIO = 2;

// Given each channel's largest movement from its starting value so far,
// the one channel that clearly moved, or -1 while it isn't clear yet.
// Channels in `exclude` (already found) are ignored.
export function movedChannel(peaks, exclude = []) {
  let best = -1;
  let second = 0;
  for (let channel = 0; channel < peaks.length; channel++) {
    if (exclude.includes(channel)) continue;
    const peak = peaks[channel];
    if (best < 0 || peak > peaks[best]) {
      if (best >= 0) second = Math.max(second, peaks[best]);
      best = channel;
    } else {
      second = Math.max(second, peak);
    }
  }
  if (best < 0 || peaks[best] < DETECT_MIN_US) return -1;
  return peaks[best] >= second * DETECT_RATIO ? best : -1;
}

//// Mode switches.

const CHANNEL_MIN = 900;
const CHANNEL_MAX = 2100;

// Mode range for a switch the pilot just flicked from `from` to `to` (us):
// centred on where it landed, reaching half-way back towards where it
// started, and out to the end stop when the switch is at an end. Gives
// 1500-2100 for a 2-position switch and the right band on a 3-position one.
export function rangeForSwitch(from, to) {
  const half = Math.abs(to - from) / 2;
  let start = Math.round((to - half) / 25) * 25;
  let end = Math.round((to + half) / 25) * 25;
  if (to > 1900) end = CHANNEL_MAX;
  if (to < 1100) start = CHANNEL_MIN;
  return {
    start: Math.max(CHANNEL_MIN, start),
    end: Math.min(CHANNEL_MAX, end),
  };
}

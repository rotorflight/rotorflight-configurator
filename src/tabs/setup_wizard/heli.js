// Pure helpers for the Setup Wizard: which servo does what, and the unit
// conversions the Mixer and Servos tabs use.

import { Mixer } from "@/js/Mixer.js";
import { RATES_TYPE } from "@/js/RateCurve.js";
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
export function movedChannel(peaks, exclude = [], minUs = DETECT_MIN_US) {
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
  if (best < 0 || peaks[best] < minUs) return -1;
  return peaks[best] >= second * DETECT_RATIO ? best : -1;
}

//// Stick center (rc_center). Radios don't all send 1500 us with the
//// sticks centered (some ELRS setups send 1520), and an offset reads as
//// every stick held slightly off center. Measured on roll, pitch and yaw,
//// which spring back to center; collective does not.

// The range rc_center accepts here (the Receiver tab's).
export const CENTRE_MIN = 1400;
export const CENTRE_MAX = 1600;
// A channel whose readings spread more than this (us) is still moving.
const CENTRE_STILL_US = 10;
// Roll, pitch and yaw must agree to within this (us). One further out has
// its trim (or subtrim) off center.
const CENTRE_AGREE_US = 5;
// Center is worth changing when it is off by more than this (us).
const CENTRE_OFF_US = 3;
// Sticks resting this close (us) to rc_center are taken to be centered.
const CENTRE_NEAR_US = 60;

// From samples of the centered sticks, each [roll, pitch, yaw] in us, the
// stick center, or why there isn't one:
//   { status: "ok", centre }
//   { status: "noSignal" }        no samples, or a channel reads 0
//   { status: "moving" }          a stick moved while sampling
//   { status: "trim", axis, centre }
//                                 axis (0 roll, 1 pitch, 2 yaw) is further
//                                 than CENTRE_AGREE_US from the others
//   { status: "range", centre }   centre outside CENTRE_MIN..CENTRE_MAX
export function centreFromSamples(samples) {
  if (!samples?.length) return { status: "noSignal" };
  const means = [0, 1, 2].map((axis) => {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const s of samples) {
      const v = s[axis] ?? 0;
      min = Math.min(min, v);
      max = Math.max(max, v);
      sum += v;
    }
    return { min, max, mean: sum / samples.length };
  });
  if (means.some((m) => m.min <= 0)) return { status: "noSignal" };
  if (means.some((m) => m.max - m.min > CENTRE_STILL_US)) {
    return { status: "moving" };
  }
  const values = means.map((m) => m.mean);
  const centre = Math.round(values.reduce((a, b) => a + b, 0) / 3);
  // The odd one out is the axis furthest from the middle value.
  const middle = [...values].sort((a, b) => a - b)[1];
  let worst = 0;
  for (let axis = 1; axis < 3; axis++) {
    if (Math.abs(values[axis] - middle) > Math.abs(values[worst] - middle)) {
      worst = axis;
    }
  }
  if (Math.abs(values[worst] - middle) > CENTRE_AGREE_US) {
    return { status: "trim", axis: worst, centre };
  }
  if (centre < CENTRE_MIN || centre > CENTRE_MAX) {
    return { status: "range", centre };
  }
  return { status: "ok", centre };
}

// Whether a measured centre differs enough from rc_center to change it.
export function centreIsOff(centre, rcCenter) {
  return Math.abs(centre - rcCenter) > CENTRE_OFF_US;
}

// For the live hint: the centre the sticks show while they rest near
// rc_center, when it differs from rc_center, otherwise null.
export function suggestedCentre(samples, rcCenter) {
  const result = centreFromSamples(samples);
  if (result.status !== "ok") return null;
  if (Math.abs(result.centre - rcCenter) > CENTRE_NEAR_US) return null;
  return centreIsOff(result.centre, rcCenter) ? result.centre : null;
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

// Collective pitch at full stick, set by the collective rate (not by the
// mixer's collective limit, which only caps it). RC_TUNING holds the MSP
// bytes / 100; the scales are the Rates tab's display units, in degrees
// (tabs/rates/rateTypes.js). At full stick the ROTORFLIGHT curve gives
// its rate, and ACTUAL the larger of its centre and max rates. Other
// rates types don't give it as a plain number: null.
const ROTORFLIGHT_COL_DEG = 12.5;
const ACTUAL_COL_DEG = 25;

export function collectiveAtFullStick(tuning) {
  switch (tuning.rates_type) {
    case RATES_TYPE.ROTORFLIGHT:
      return round1(tuning.collective_rc_rate * ROTORFLIGHT_COL_DEG);
    case RATES_TYPE.ACTUAL:
      return round1(
        Math.max(tuning.collective_rc_rate, tuning.collective_srate) *
          ACTUAL_COL_DEG,
      );
    default:
      return null;
  }
}

// Sets it in `tuning`; false for a rates type it can't be set in.
export function setCollectiveAtFullStick(tuning, degrees) {
  switch (tuning.rates_type) {
    case RATES_TYPE.ROTORFLIGHT:
      tuning.collective_rc_rate = round2(degrees / ROTORFLIGHT_COL_DEG);
      return true;
    case RATES_TYPE.ACTUAL:
      tuning.collective_srate = round2(degrees / ACTUAL_COL_DEG);
      tuning.collective_rc_rate = Math.min(
        tuning.collective_rc_rate,
        tuning.collective_srate,
      );
      return true;
    default:
      return false;
  }
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

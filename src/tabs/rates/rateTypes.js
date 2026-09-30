import semver from "semver";

import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";
import { RATES_TYPE } from "@/js/RateCurve.js";

export { RATES_TYPE };

export const RATE_PROFILE_COUNT = 6;
export const RATE_PROFILE_MASK = 128;
export const CYCLIC_RING_DEFAULT = 150;

export const RATES_TYPE_IMAGES = [
  "none.svg",
  "betaflight.svg",
  "raceflight.svg",
  "kiss.svg",
  "actual.svg",
  "quickrates.svg",
  "rotorflight.svg",
];

export function getRatesTypes(apiVersion) {
  return [
    "None",
    "Betaflight",
    "Raceflight",
    "KISS",
    "Actual",
    "QuickRates",
    ...(semver.gte(apiVersion, API_VERSION_12_9) ? ["Rotorflight"] : []),
  ];
}

export const DYNAMICS_DEFAULTS = {
  DYNAMICS_4_5: {
    roll_setpoint_boost_gain: 0,
    pitch_setpoint_boost_gain: 0,
    yaw_setpoint_boost_gain: 0,
    collective_setpoint_boost_gain: 0,
    roll_setpoint_boost_cutoff: 15,
    pitch_setpoint_boost_cutoff: 15,
    yaw_setpoint_boost_cutoff: 90,
    collective_setpoint_boost_cutoff: 15,
    yaw_dynamic_ceiling_gain: 30,
    yaw_dynamic_deadband_gain: 30,
    yaw_dynamic_deadband_filter: 60,
    roll_response_time: 0,
    pitch_response_time: 0,
    yaw_response_time: 0,
    collective_response_time: 0,
  },
  DYNAMICS_4_6: {
    roll_setpoint_boost_gain: 0,
    pitch_setpoint_boost_gain: 0,
    yaw_setpoint_boost_gain: 0,
    collective_setpoint_boost_gain: 0,
    roll_setpoint_boost_cutoff: 15,
    pitch_setpoint_boost_cutoff: 15,
    yaw_setpoint_boost_cutoff: 90,
    collective_setpoint_boost_cutoff: 15,
    yaw_dynamic_ceiling_gain: 0,
    yaw_dynamic_deadband_gain: 10,
    yaw_dynamic_deadband_filter: 60,
    roll_response_time: 0,
    pitch_response_time: 0,
    yaw_response_time: 0,
    collective_response_time: 0,
  },
};

// Column labels, input ranges and defaults per rates type (display units).
// rcRate/rate/expo: roll, pitch and yaw; rcCol/col: collective.
const NONE_CONFIG = {
  labels: { rcRate: "rateSetupRcRate", rate: "rateSetupRate", expo: "rateSetupRcExpo" },
  rcRate: { min: 0, max: 0, step: 0, def: 0, yawDef: 0 },
  rate: { min: 0, max: 0, step: 0, def: 0, yawDef: 0 },
  rcCol: { min: 0, max: 0, step: 0, def: 0 },
  col: { min: 0, max: 0, step: 0, def: 0 },
  expo: { min: 0, max: 0, step: 0, def: 0, yawDef: 0, colDef: 0 },
};

const TYPE_CONFIG = {
  [RATES_TYPE.BETAFLIGHT]: {
    labels: { rcRate: "rateSetupRcRate", rate: "rateSetupRate", expo: "rateSetupRcExpo" },
    rcRate: { min: 0.01, max: 2.55, step: 0.01, def: 1.2, yawDef: 2.0 },
    rate: { min: 0, max: 0.99, step: 0.01, def: 0, yawDef: 0 },
    rcCol: { min: 0.01, max: 2.2, step: 0.01, def: 2.03 },
    col: { min: 0, max: 0.99, step: 0.01, def: 0.01 },
    expo: { min: 0, max: 1, step: 0.01, def: 0, yawDef: 0, colDef: 0 },
  },
  [RATES_TYPE.RACEFLIGHT]: {
    labels: { rcRate: "rateSetupRcRateRaceflight", rate: "rateSetupRateRaceflight", expo: "rateSetupRcExpoRaceflight" },
    rcRate: { min: 10, max: 1000, step: 10, def: 240, yawDef: 400 },
    rate: { min: 0, max: 255, step: 1, def: 0, yawDef: 0 },
    rcCol: { min: 0, max: 25, step: 0.1, def: 12.5 },
    col: { min: 0, max: 255, step: 1, def: 0 },
    expo: { min: 0, max: 100, step: 1, def: 0, yawDef: 0, colDef: 0 },
  },
  [RATES_TYPE.KISS]: {
    labels: { rcRate: "rateSetupRcRate", rate: "rateSetupRcRateRaceflight", expo: "rateSetupRcExpoKISS" },
    rcRate: { min: 0.01, max: 2.55, step: 0.01, def: 1.2, yawDef: 2.0 },
    rate: { min: 0, max: 0.99, step: 0.01, def: 0, yawDef: 0 },
    rcCol: { min: 0.01, max: 2.55, step: 0.01, def: 2.5 },
    col: { min: 0, max: 0.99, step: 0.01, def: 0 },
    expo: { min: 0, max: 1, step: 0.01, def: 0, yawDef: 0, colDef: 0 },
  },
  [RATES_TYPE.ACTUAL]: {
    labels: { rcRate: "rateSetupRcRateActual", rate: "rateSetupRateQuickRates", expo: "rateSetupRcExpoRaceflight" },
    rcRate: { min: 10, max: 1000, step: 10, def: 180, yawDef: 180 },
    rate: { min: 0, max: 1000, step: 10, def: 240, yawDef: 400 },
    rcCol: { min: 0, max: 25, step: 0.5, def: 12.5 },
    col: { min: 0, max: 25, step: 0.5, def: 12.5 },
    expo: { min: 0, max: 1, step: 0.01, def: 0, yawDef: 0, colDef: 0 },
  },
  [RATES_TYPE.QUICKRATES]: {
    labels: { rcRate: "rateSetupRcRate", rate: "rateSetupRateQuickRates", expo: "rateSetupRcExpoRaceflight" },
    rcRate: { min: 0.01, max: 2.55, step: 0.01, def: 1.2, yawDef: 2.0 },
    rate: { min: 0, max: 1000, step: 10, def: 240, yawDef: 400 },
    rcCol: { min: 0.01, max: 2.55, step: 0.01, def: 2.5 },
    col: { min: 0, max: 1000, step: 10, def: 500 },
    expo: { min: 0, max: 1, step: 0.01, def: 0, yawDef: 0, colDef: 0 },
  },
  [RATES_TYPE.ROTORFLIGHT]: {
    labels: { rcRate: "rateSetupRotorflightRate", rate: "rateSetupRotorflightShape", expo: "rateSetupRotorflightExpo" },
    rcRate: { min: 10, max: 1000, step: 5, def: 250, yawDef: 400 },
    rate: { min: 0, max: 127, step: 1, def: 12, yawDef: 12 },
    rcCol: { min: 0, max: 25, step: 0.25, def: 12.5 },
    col: { min: 0, max: 127, step: 1, def: 12 },
    expo: { min: 0, max: 100, step: 1, def: 40, yawDef: 50, colDef: 0 },
  },
};

export function typeConfig(type) {
  return TYPE_CONFIG[type] ?? NONE_CONFIG;
}

const AXES = ["roll", "pitch", "yaw", "collective"];

// Multipliers from the FC's RC_TUNING units to the displayed units.
function scales(type) {
  switch (type) {
    case RATES_TYPE.RACEFLIGHT:
      return { srate: 100, rcRate: 1000, colRcRate: 25, colSrate: 100, expo: 100 };
    case RATES_TYPE.ACTUAL:
      return { srate: 1000, rcRate: 1000, colRcRate: 25, colSrate: 25, expo: 1 };
    case RATES_TYPE.QUICKRATES:
      return { srate: 1000, rcRate: 1, colRcRate: 1, colSrate: 480, expo: 1 };
    case RATES_TYPE.ROTORFLIGHT:
      return { srate: 100, rcRate: 500, colRcRate: 50 / 4, colSrate: 100, expo: 100 };
    default:
      return { srate: 1, rcRate: 1, colRcRate: 1, colSrate: 1, expo: 1 };
  }
}

/** RC_TUNING rate fields in display units for `type`. */
export function toDisplay(type, tuning) {
  const s = scales(type);
  const out = {};
  for (const axis of AXES) {
    const col = axis === "collective";
    out[`${axis}_rc_rate`] = tuning[`${axis}_rc_rate`] * (col ? s.colRcRate : s.rcRate);
    out[`${axis}_srate`] = tuning[`${axis}_srate`] * (col ? s.colSrate : s.srate);
    out[`${axis}_rc_expo`] = tuning[`${axis}_rc_expo`] * s.expo;
    out[`${axis}_rate_limit`] = tuning[`${axis}_rate_limit`];
  }
  return out;
}

/** Writes display-unit rate fields back into `tuning` (RC_TUNING units). */
export function fromDisplay(type, display, tuning) {
  const s = scales(type);
  for (const axis of AXES) {
    const col = axis === "collective";
    tuning[`${axis}_rc_rate`] = display[`${axis}_rc_rate`] / (col ? s.colRcRate : s.rcRate);
    tuning[`${axis}_srate`] = display[`${axis}_srate`] / (col ? s.colSrate : s.srate);
    tuning[`${axis}_rc_expo`] = display[`${axis}_rc_expo`] / s.expo;
  }
}

/** Display defaults for all rate fields of `type` (used on a type change or reset). */
export function defaultRates(type) {
  const c = typeConfig(type);
  return {
    roll_rc_rate: c.rcRate.def,
    pitch_rc_rate: c.rcRate.def,
    yaw_rc_rate: c.rcRate.yawDef,
    collective_rc_rate: c.rcCol.def,
    roll_srate: c.rate.def,
    pitch_srate: c.rate.def,
    yaw_srate: c.rate.yawDef,
    collective_srate: c.col.def,
    roll_rc_expo: c.expo.def,
    pitch_rc_expo: c.expo.def,
    yaw_rc_expo: c.expo.yawDef,
    collective_rc_expo: c.expo.colDef,
  };
}

/** Collective maximum shown in degrees of blade pitch. */
export function convertToCollective(type, rate) {
  switch (type) {
    case RATES_TYPE.NONE:
    case RATES_TYPE.BETAFLIGHT:
    case RATES_TYPE.KISS:
    case RATES_TYPE.QUICKRATES:
      return (rate / 40).toFixed(1);
    default:
      return rate.toFixed(1);
  }
}

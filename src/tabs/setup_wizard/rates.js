// Flying-style rates for the wizard, as in Wingflight's wizard: one choice
// sets roll, pitch and yaw rate and expo. Sport is the firmware's default
// rate profile (pg/rates.c); Trainer is slower, 3D faster. They use the
// ROTORFLIGHT rates type (API 12.9+), or ACTUAL before it, and leave the
// collective pitch as it is: the Blade pitch step sets that.

import semver from "semver";

import { RATES_TYPE } from "@/js/RateCurve.js";
import { API_VERSION_12_9 } from "@/js/configurator.svelte.js";

import { collectiveAtFullStick, setCollectiveAtFullStick } from "./heli.js";

// Rates in deg/s at full stick, expo in %.
export const STYLES = [
  { key: "trainer", cyclic: 180, yaw: 270, expo: { cyclic: 40, yaw: 50 } },
  { key: "sport", cyclic: 250, yaw: 400, expo: { cyclic: 40, yaw: 50 } },
  { key: "3d", cyclic: 400, yaw: 600, expo: { cyclic: 30, yaw: 40 } },
];

// The ROTORFLIGHT curve's shape (its "srate"), the firmware default.
const SHAPE = 12;
// ACTUAL: centre sensitivity as a share of the max rate, as the
// firmware's ACTUAL defaults (180 of 240 deg/s).
const ACTUAL_CENTRE = 0.75;
const DEFAULT_COLLECTIVE = 12.5;

const AXES = { roll: "cyclic", pitch: "cyclic", yaw: "yaw" };

export function wizardRatesType(apiVersion) {
  return semver.gte(apiVersion, API_VERSION_12_9)
    ? RATES_TYPE.ROTORFLIGHT
    : RATES_TYPE.ACTUAL;
}

// The ROTORFLIGHT curve's exponent for a shape (getRotorflightRates).
export function curveShape() {
  return SHAPE / 16 + 2;
}

// Writes `style` into an RC_TUNING (MSP units: the bytes / 100).
export function applyStyle(tuning, style, ratesType) {
  const collective = collectiveAtFullStick(tuning) ?? DEFAULT_COLLECTIVE;
  tuning.rates_type = ratesType;
  for (const [axis, kind] of Object.entries(AXES)) {
    const rate = style[kind];
    const expo = style.expo[kind] / 100;
    if (ratesType === RATES_TYPE.ROTORFLIGHT) {
      tuning[`${axis}_rc_rate`] = round2(rate / 500);
      tuning[`${axis}_srate`] = SHAPE / 100;
    } else {
      tuning[`${axis}_rc_rate`] = round2((rate * ACTUAL_CENTRE) / 1000);
      tuning[`${axis}_srate`] = round2(rate / 1000);
    }
    tuning[`${axis}_rc_expo`] = expo;
  }
  tuning.collective_rc_expo = 0;
  if (ratesType === RATES_TYPE.ROTORFLIGHT) {
    tuning.collective_srate = SHAPE / 100;
  } else {
    // setCollectiveAtFullStick keeps the centre at or below the max.
    tuning.collective_rc_rate = round2(collective / 25);
  }
  setCollectiveAtFullStick(tuning, collective);
}

// The style an RC_TUNING was set to, or null.
export function matchingStyle(tuning, ratesType) {
  if (!tuning || tuning.rates_type !== ratesType) return null;
  const probe = { ...tuning };
  return (
    STYLES.find((style) => {
      applyStyle(probe, style, ratesType);
      return Object.keys(AXES).every((axis) =>
        ["rc_rate", "srate", "rc_expo"].every(
          (f) => Math.abs(probe[`${axis}_${f}`] - tuning[`${axis}_${f}`]) < 0.005,
        ),
      );
    }) ?? null
  );
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

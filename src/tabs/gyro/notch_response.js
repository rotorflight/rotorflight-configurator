// Frequency response of the gyro notch filters, computed the way the firmware
// sets them up (rotorflight-firmware: src/main/sensors/gyro_init.c,
// src/main/flight/rpm_filter.c and src/main/common/filter.c).

// Firmware rpm_filter.c: rpmFilterPreset[]. The firmware copies the selected
// preset into the custom banks at boot, so the configurator only sees it after
// a save and reboot. Mirroring it here lets the chart follow the dropdown.
const LNC2 = (q) => Math.trunc(-1000 / q);
const RNC2 = (q) => Math.trunc(1000 / q);

function preset(sources, centers, qs) {
  return sources.map((axis, a) =>
    axis.map((source, i) => ({
      rpm_source: source,
      notch_center: centers[a][i] ?? 0,
      notch_q: qs[a][i],
    })),
  );
}

export const RPM_FILTER_PRESETS = {
  // Low
  1: preset(
    [
      [11, 12, 14, 21],
      [11, 12, 14, 21],
      [11, 12, 21],
    ],
    [[], [], []],
    [
      [80, 40, 60, 50],
      [80, 40, 60, 50],
      [80, 40, 50],
    ],
  ),
  // Medium
  2: preset(
    [
      [11, 12, 13, 14, 21, 22, 10],
      [11, 12, 13, 14, 21, 22, 10],
      [11, 12, 13, 14, 21, 22, 10],
    ],
    [[], [], []],
    [
      [80, 30, 80, 60, 60, 50, 80],
      [80, 30, 80, 60, 60, 50, 80],
      [80, 40, 80, 80, 60, 50, 80],
    ],
  ),
  // High
  3: preset(
    [
      [11, 12, 12, 13, 14, 15, 16, 21, 22, 10],
      [11, 12, 12, 13, 14, 15, 16, 21, 22, 10],
      [11, 12, 13, 14, 21, 22, 10],
    ],
    [[0, LNC2(30), RNC2(30), 0], [0, LNC2(30), RNC2(30), 0], []],
    [
      [50, 30, 30, 80, 50, 80, 80, 60, 50, 80],
      [50, 30, 30, 80, 50, 80, 80, 60, 50, 80],
      [80, 40, 80, 80, 50, 40, 80],
    ],
  ),
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function gearRatio(ratio) {
  return Math.max(ratio?.[0] ?? 1, 1) / Math.max(ratio?.[1] ?? 1, 1);
}

/**
 * The rate the gyro filters run at: gyro.filterRateHz in the firmware.
 * filter_process_denom is not sent over MSP and defaults to the PID denom.
 */
export function getFilterRateHz(sampleRateHz, pidProcessDenom) {
  if (!sampleRateHz) {
    return 0;
  }
  return sampleRateHz / Math.max(pidProcessDenom || 1, 1);
}

/** Firmware filter.c: notchFilterGetQ(). */
export function notchQFromCutoff(centerHz, cutoffHz) {
  if (centerHz > 0 && cutoffHz > 0 && cutoffHz < centerHz) {
    return (centerHz * cutoffHz) / (centerHz * centerHz - cutoffHz * cutoffHz);
  }
  return 0;
}

/**
 * Complex response of a firmware BIQUAD_NOTCH at frequency hz.
 * fader blends between pass-through (0) and the full notch (1), as
 * rpmFilterGyro() does.
 */
export function notchResponse(hz, centerHz, q, sampleRate, fader = 1) {
  const fc = Math.min(centerHz, 0.475 * sampleRate);
  const w0 = (2 * Math.PI * fc) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cos0 = Math.cos(w0);

  const b0 = 1;
  const b1 = -2 * cos0;
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * cos0;
  const a2 = 1 - alpha;

  // z^-1 = e^-jw
  const w = (2 * Math.PI * hz) / sampleRate;
  const c1 = Math.cos(w);
  const s1 = -Math.sin(w);
  const c2 = Math.cos(2 * w);
  const s2 = -Math.sin(2 * w);

  const numRe = b0 + b1 * c1 + b2 * c2;
  const numIm = b1 * s1 + b2 * s2;
  const denRe = a0 + a1 * c1 + a2 * c2;
  const denIm = a1 * s1 + a2 * s2;

  const den = denRe * denRe + denIm * denIm;
  let re = (numRe * denRe + numIm * denIm) / den;
  let im = (numIm * denRe - numRe * denIm) / den;

  if (fader !== 1) {
    re = 1 + (re - 1) * fader;
    im = im * fader;
  }

  return { re, im };
}

/**
 * Rotor and motor speeds (RPM) the RPM notches follow, from the headspeed.
 * Firmware motors.c: mainGearRatio and tailGearRatio.
 */
export function getRotorSpeeds({
  headspeed,
  tailSpeed,
  mainGear,
  tailGear,
  motorizedTail,
}) {
  const main = gearRatio(mainGear);
  const tail = gearRatio(tailGear);

  const mainMotor = headspeed / main;

  if (motorizedTail) {
    // Tail rotor speed is set on its own; tail motor = rotor / gear ratio.
    return {
      mainMotor,
      mainRotor: headspeed,
      tailMotor: tailSpeed / tail,
      tailRotor: tailSpeed,
      mainGearRatio: main,
      tailGearRatio: tail,
    };
  }

  // Driven tail: the firmware uses mainGearRatio / tailGearRatio on the
  // main motor RPM, so the tail rotor turns at headspeed / tailGearRatio.
  return {
    mainMotor,
    mainRotor: headspeed,
    tailMotor: mainMotor,
    tailRotor: headspeed / tail,
    mainGearRatio: main,
    tailGearRatio: tail,
  };
}

/**
 * Frequency in Hz of an RPM source at the given speeds, before the center
 * offset. Returns null for a source the firmware leaves unused.
 */
export function sourceFrequency(source, speeds, motorizedTail) {
  if (source === 10) {
    // Main motor, only when not direct drive
    return speeds.mainGearRatio === 1 ? null : speeds.mainMotor / 60;
  }
  if (source >= 11 && source <= 18) {
    return (speeds.mainRotor * (source - 10)) / 60;
  }
  if (source === 20) {
    // Tail motor, only for a geared motorised tail
    return motorizedTail && speeds.tailGearRatio !== 1
      ? speeds.tailMotor / 60
      : null;
  }
  if (source >= 21 && source <= 28) {
    return (speeds.tailRotor * (source - 20)) / 60;
  }
  return null;
}

/** Short label for an RPM source: "1×", "M", "T1×", "TM". */
export function sourceLabel(source) {
  if (source === 10) return "M";
  if (source >= 11 && source <= 18) return `${source - 10}×`;
  if (source === 20) return "TM";
  if (source >= 21 && source <= 28) return `T${source - 20}×`;
  return String(source);
}

function staticNotches(filterConfig, filterRate) {
  const notches = [];
  const nyquist = filterRate / 2;

  const pairs = [
    [filterConfig?.gyro_notch_hz, filterConfig?.gyro_notch_cutoff, "N1"],
    [filterConfig?.gyro_notch2_hz, filterConfig?.gyro_notch2_cutoff, "N2"],
  ];

  for (const [hz, cutoff, label] of pairs) {
    if (!hz || !cutoff) continue;

    // Firmware gyro_init.c: calculateNyquistAdjustedNotchHz()
    let center = hz;
    if (center > nyquist) {
      if (cutoff < nyquist) {
        center = nyquist;
      } else {
        continue;
      }
    }

    const q = notchQFromCutoff(center, cutoff);
    if (q > 0) {
      notches.push({ kind: "static", label, centerHz: center, q, fader: 1 });
    }
  }

  return notches;
}

function rpmNotchesV2(bank, speeds, opts) {
  const notches = [];
  const maxHz = 0.45 * opts.filterRate;
  const minHz = clamp(opts.minHz || 20, 10, 0.5 * maxHz);
  const fadeHz = 1.25 * minHz;

  for (const entry of bank ?? []) {
    if (!entry.rpm_source || !entry.notch_q) continue;

    const base = sourceFrequency(entry.rpm_source, speeds, opts.motorizedTail);
    if (base === null) continue;

    const freq = base * (1 + (entry.notch_center || 0) / 10000);
    const q = clamp(entry.notch_q, 10, 250) / 10;
    const center = clamp(freq, minHz, maxHz);
    // Firmware maths.h: transition()
    const fader = clamp((freq - minHz) / (fadeHz - minHz), 0, 1);

    notches.push({
      kind: "rpm",
      source: entry.rpm_source,
      label: sourceLabel(entry.rpm_source),
      targetHz: freq,
      centerHz: center,
      q,
      fader,
    });
  }

  return notches;
}

function rpmNotchesV1(bank, speeds, opts) {
  const notches = [];
  const minLimit = 0.4 * opts.filterRate;
  const maxHz = 0.45 * opts.filterRate;

  for (const entry of bank ?? []) {
    if (!entry.rpm_source || !entry.rpm_ratio || !entry.notch_q) continue;

    const base = sourceFrequency(entry.rpm_source, speeds, opts.motorizedTail);
    if (base === null) continue;

    // Legacy firmware: ratio = 10000 / (rpm_ratio * 60), and rpm_limit is
    // the minimum rotor RPM, scaled the same way as the notch itself.
    const scale = 10_000 / clamp(entry.rpm_ratio, 1, 50_000);
    const freq = base * scale;

    const rotorSpeed =
      entry.rpm_source < 20 ? speeds.mainRotor : speeds.tailRotor;
    const hzPerRpm = rotorSpeed > 0 ? freq / rotorSpeed : 0;
    const minHz = clamp((entry.rpm_limit || 0) * hzPerRpm, 10, minLimit);

    notches.push({
      kind: "rpm",
      source: entry.rpm_source,
      label: sourceLabel(entry.rpm_source),
      targetHz: freq,
      centerHz: clamp(freq, minHz, maxHz),
      q: clamp(entry.notch_q, 5, 250) / 10,
      fader: 1,
    });
  }

  return notches;
}

/**
 * All notches active on one axis at the given head speed.
 *
 * @param {object} opts
 * @param {object} opts.filterConfig FC.FILTER_CONFIG
 * @param {boolean} opts.rpmEnabled RPM_FILTER feature
 * @param {boolean} opts.multiAxis API >= 12.8 (per-axis banks)
 * @param {Array} opts.rpmBanks FC.RPM_FILTER_CONFIG_V2 (3 banks) or
 *   FC.RPM_FILTER_CONFIG (one bank) for older firmware
 * @param {number} opts.axis 0 roll, 1 pitch, 2 yaw
 * @param {number} opts.filterRate gyro filter rate in Hz
 * @param {number} opts.headspeed main rotor RPM
 * @param {number} opts.tailSpeed tail rotor RPM, for a motorised tail
 */
export function collectNotches(opts) {
  const filterRate = opts.filterRate;
  if (!filterRate) {
    return [];
  }

  const notches = staticNotches(opts.filterConfig, filterRate);

  if (!opts.rpmEnabled || !(opts.headspeed > 0)) {
    return notches;
  }

  const speeds = getRotorSpeeds(opts);
  const rpmOpts = {
    filterRate,
    motorizedTail: opts.motorizedTail,
    minHz: opts.filterConfig?.rpm_min_hz,
  };

  if (opts.multiAxis) {
    const presetIndex = opts.filterConfig?.rpm_preset ?? 0;
    const banks = RPM_FILTER_PRESETS[presetIndex] ?? opts.rpmBanks;
    notches.push(...rpmNotchesV2(banks?.[opts.axis], speeds, rpmOpts));
  } else {
    notches.push(...rpmNotchesV1(opts.rpmBanks, speeds, rpmOpts));
  }

  return notches;
}

/**
 * Groups axes whose notches are the same, so axes with the same setup share
 * one curve. Takes one notch list per axis; returns [{ axes, notches }] in
 * axis order.
 */
export function groupAxes(notchesPerAxis) {
  const groups = [];
  const byKey = {};

  notchesPerAxis.forEach((notches, axis) => {
    const key = JSON.stringify(
      notches.map((n) => [n.label, n.centerHz, n.q, n.fader]).sort(),
    );
    if (byKey[key]) {
      byKey[key].axes.push(axis);
    } else {
      byKey[key] = { axes: [axis], notches };
      groups.push(byKey[key]);
    }
  });

  return groups;
}

/** Combined magnitude in dB of all notches in series, at each frequency. */
export function combinedResponseDb(notches, freqs, sampleRate) {
  return freqs.map((hz) => {
    let re = 1;
    let im = 0;
    for (const n of notches) {
      const h = notchResponse(hz, n.centerHz, n.q, sampleRate, n.fader);
      const r = re * h.re - im * h.im;
      im = re * h.im + im * h.re;
      re = r;
    }
    const mag = Math.hypot(re, im);
    return 20 * Math.log10(Math.max(mag, 1e-6));
  });
}

/** Log-spaced frequencies from min to max. */
export function logFrequencies(minHz, maxHz, count) {
  const lo = Math.log10(minHz);
  const hi = Math.log10(maxHz);
  return Array.from(
    { length: count },
    (_, i) => 10 ** (lo + ((hi - lo) * i) / (count - 1)),
  );
}

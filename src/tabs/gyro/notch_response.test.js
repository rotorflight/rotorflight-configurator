import { describe, expect, it } from "vitest";

import {
  RPM_FILTER_PRESETS,
  collectNotches,
  combinedResponseDb,
  getFilterRateHz,
  getRotorSpeeds,
  groupAxes,
  notchQFromCutoff,
  notchResponse,
} from "./notch_response.js";

const FS = 4000;

function db(h) {
  return 20 * Math.log10(Math.hypot(h.re, h.im));
}

describe("notch response", () => {
  it("passes DC and removes the center frequency", () => {
    expect(db(notchResponse(0.01, 100, 3, FS))).toBeCloseTo(0, 3);
    expect(db(notchResponse(100, 100, 3, FS))).toBeLessThan(-60);
  });

  it("is -3 dB at center ± center / (2Q)", () => {
    // Bandwidth f0/Q, split around the center on a log scale.
    const f0 = 200;
    const q = 4;
    const half = f0 / q / 2;
    const lo = Math.sqrt(half * half + f0 * f0) - half;
    const hi = lo + f0 / q;
    expect(db(notchResponse(lo, f0, q, 1e6))).toBeCloseTo(-3.01, 1);
    expect(db(notchResponse(hi, f0, q, 1e6))).toBeCloseTo(-3.01, 1);
  });

  it("does nothing with fader 0", () => {
    const h = notchResponse(100, 100, 3, FS, 0);
    expect(h.re).toBeCloseTo(1, 9);
    expect(h.im).toBeCloseTo(0, 9);
  });

  it("matches the firmware Q from center and cutoff", () => {
    expect(notchQFromCutoff(260, 160)).toBeCloseTo((260 * 160) / (260 ** 2 - 160 ** 2));
    expect(notchQFromCutoff(100, 100)).toBe(0);
  });
});

describe("rotor speeds", () => {
  it("follows the firmware gear ratios", () => {
    const s = getRotorSpeeds({
      headspeed: 2000,
      mainGear: [1, 9],
      tailGear: [1, 5],
      motorizedTail: false,
    });
    expect(s.mainMotor).toBeCloseTo(18000);
    expect(s.tailRotor).toBeCloseTo(10000);
  });

  it("uses the tail speed for a motorised tail", () => {
    const s = getRotorSpeeds({
      headspeed: 2000,
      tailSpeed: 6000,
      mainGear: [1, 9],
      tailGear: [1, 2],
      motorizedTail: true,
    });
    expect(s.tailRotor).toBe(6000);
    expect(s.tailMotor).toBeCloseTo(12000);
  });
});

describe("collectNotches", () => {
  const base = {
    filterConfig: { rpm_preset: 0, rpm_min_hz: 20 },
    rpmEnabled: true,
    multiAxis: true,
    axis: 0,
    filterRate: FS,
    headspeed: 1800,
    mainGear: [1, 10],
    tailGear: [1, 4],
    motorizedTail: false,
  };

  it("places harmonics and double notch side bands", () => {
    const rpmBanks = [
      [
        { rpm_source: 11, notch_q: 50, notch_center: 0 },
        { rpm_source: 12, notch_q: 30, notch_center: -33 },
        { rpm_source: 12, notch_q: 30, notch_center: 33 },
        { rpm_source: 21, notch_q: 60, notch_center: 0 },
        { rpm_source: 10, notch_q: 80, notch_center: 0 },
      ],
      [],
      [],
    ];
    const n = collectNotches({ ...base, rpmBanks });

    expect(n.map((x) => x.label)).toEqual(["1×", "2×", "2×", "T1×", "M"]);
    expect(n[0].centerHz).toBeCloseTo(30);
    expect(n[1].centerHz).toBeCloseTo(60 * (1 - 0.0033));
    expect(n[2].centerHz).toBeCloseTo(60 * (1 + 0.0033));
    expect(n[3].centerHz).toBeCloseTo(120);
    expect(n[4].centerHz).toBeCloseTo(300);
    expect(n[0].q).toBe(5);
  });

  it("uses the preset banks when a preset is selected", () => {
    const n = collectNotches({
      ...base,
      filterConfig: { rpm_preset: 3, rpm_min_hz: 20 },
      rpmBanks: [[], [], []],
    });
    expect(n.length).toBe(RPM_FILTER_PRESETS[3][0].length);
  });

  it("fades notches below the minimum frequency", () => {
    const rpmBanks = [[{ rpm_source: 11, notch_q: 50, notch_center: 0 }], [], []];
    const slow = collectNotches({ ...base, headspeed: 600, rpmBanks });
    expect(slow[0].centerHz).toBe(20);
    expect(slow[0].fader).toBe(0);

    const mid = collectNotches({ ...base, headspeed: 1350, rpmBanks });
    expect(mid[0].fader).toBeCloseTo(0.5);
  });

  it("adds the static notches", () => {
    const n = collectNotches({
      ...base,
      rpmEnabled: false,
      filterConfig: {
        gyro_notch_hz: 260,
        gyro_notch_cutoff: 160,
        gyro_notch2_hz: 0,
        gyro_notch2_cutoff: 0,
      },
    });
    expect(n).toHaveLength(1);
    expect(n[0].label).toBe("N1");
    const [dip] = combinedResponseDb(n, [260], FS);
    expect(dip).toBeLessThan(-60);
  });

  it("reads the legacy single bank", () => {
    const rpmBanks = [
      { rpm_source: 11, rpm_ratio: 10_000, rpm_limit: 1000, notch_q: 50 },
    ];
    const n = collectNotches({ ...base, multiAxis: false, rpmBanks });
    expect(n[0].centerHz).toBeCloseTo(30);
  });
});

describe("groupAxes", () => {
  const base = {
    rpmEnabled: true,
    multiAxis: true,
    filterRate: FS,
    headspeed: 1800,
    mainGear: [1, 10],
    tailGear: [1, 4],
    motorizedTail: false,
    rpmBanks: [[], [], []],
  };

  function groupsFor(presetIndex) {
    const filterConfig = { rpm_preset: presetIndex, rpm_min_hz: 20 };
    return groupAxes(
      [0, 1, 2].map((axis) => collectNotches({ ...base, filterConfig, axis })),
    ).map((g) => g.axes);
  }

  it("shares one curve between roll and pitch in the presets", () => {
    expect(groupsFor(1)).toEqual([[0, 1], [2]]);
    expect(groupsFor(2)).toEqual([[0, 1], [2]]);
    expect(groupsFor(3)).toEqual([[0, 1], [2]]);
  });

  it("merges all axes when they match", () => {
    const bank = [{ rpm_source: 11, notch_q: 50, notch_center: 0 }];
    const filterConfig = { rpm_preset: 0, rpm_min_hz: 20 };
    const perAxis = [0, 1, 2].map((axis) =>
      collectNotches({
        ...base,
        filterConfig,
        rpmBanks: [bank, bank, bank],
        axis,
      }),
    );
    expect(groupAxes(perAxis).map((g) => g.axes)).toEqual([[0, 1, 2]]);
  });
});

describe("filter rate", () => {
  it("divides the gyro rate by the PID denom", () => {
    expect(getFilterRateHz(8000, 2)).toBe(4000);
    expect(getFilterRateHz(0, 1)).toBe(0);
  });
});

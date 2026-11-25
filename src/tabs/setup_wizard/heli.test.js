import { describe, expect, it } from "vitest";

import { centreFromSamples, centreIsOff, suggestedCentre } from "./heli.js";

// Samples are [roll, pitch, yaw] in us.
describe("stick center", () => {
  it("finds a 1520 us center", () => {
    const samples = [
      [1519, 1520, 1521],
      [1520, 1521, 1520],
      [1521, 1519, 1520],
    ];
    expect(centreFromSamples(samples)).toEqual({ status: "ok", centre: 1520 });
    expect(centreIsOff(1520, 1500)).toBe(true);
    expect(centreIsOff(1502, 1500)).toBe(false);
  });

  it("needs a signal and still sticks", () => {
    expect(centreFromSamples([])).toEqual({ status: "noSignal" });
    expect(centreFromSamples([[1500, 0, 1500]])).toEqual({
      status: "noSignal",
    });
    expect(
      centreFromSamples([
        [1500, 1500, 1500],
        [1530, 1500, 1500],
      ]),
    ).toEqual({ status: "moving" });
  });

  it("names the axis with its trim off", () => {
    // Roll and yaw at 1520, pitch trimmed up to 1540.
    expect(centreFromSamples([[1520, 1540, 1520]])).toEqual({
      status: "trim",
      axis: 1,
      centre: 1527,
    });
    // Within 5 us is fine.
    expect(centreFromSamples([[1518, 1522, 1520]]).status).toBe("ok");
  });

  it("refuses a center outside the range", () => {
    expect(centreFromSamples([[1700, 1700, 1700]])).toEqual({
      status: "range",
      centre: 1700,
    });
  });

  it("hints only for resting sticks near the center", () => {
    expect(suggestedCentre([[1520, 1520, 1521]], 1500)).toBe(1520);
    // Already right.
    expect(suggestedCentre([[1501, 1500, 1500]], 1500)).toBe(null);
    // Sticks held somewhere else, not centered.
    expect(suggestedCentre([[1590, 1590, 1590]], 1500)).toBe(null);
    // A trim off: Detect explains that, the hint stays quiet.
    expect(suggestedCentre([[1520, 1540, 1520]], 1500)).toBe(null);
  });
});

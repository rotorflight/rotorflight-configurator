// Pure helpers for the Setup Wizard's Profile switch step: the adjustment
// ranges it writes (rotorflight-firmware fc/rc_adjustments.c) and reading
// them back. Adapted from Wingflight's setup wizard (trimGain.js).
//
// The step is built to fit an 8-channel link: CH1-5 are roll, pitch, yaw,
// collective and throttle, which leaves AUX1-3 (CH6-8) for ARM, the profile
// switch and a rescue/trainer switch. Master gain then follows the profile
// switch (it is stored per PID profile), and the trim-button and knob
// methods, which need a channel of their own, are for links with more.

// Enable channel meaning "always on" (ALWAYS_ON_CH in
// tabs/adjustments/util.js; not imported so this file stays pure).
const ALWAYS_ON_CH = 255;

// Roll, pitch, yaw, collective and throttle come before AUX1.
export const CONTROL_CHANNELS = 5;
// AUX channels that fit an 8-channel link.
export const AUX_IN_8_CHANNELS = 3;

// The channel number a pilot sees for AUX channel `aux` (0 = AUX1 = CH6).
export function channelNumber(aux) {
  return aux + CONTROL_CHANNELS + 1;
}

// Adjustment functions (fc/rc_adjustments.h).
export const ADJ = {
  RATE_PROFILE: 1,
  PID_PROFILE: 2,
  CYCLIC_MASTER_GAIN: 83,
  YAW_MASTER_GAIN: 84,
};

// MASTER_GAIN_MIN / MAX, flight/pid.h, in %.
export const GAIN_MIN = 25;
export const GAIN_MAX = 200;
// A knob covers 50-150 %, centred on 100 %: the useful part, with finer
// control than the firmware's full range.
export const KNOB_MIN = 50;
export const KNOB_MAX = 150;
// Each trim button press, in %.
export const GAIN_STEP = 5;

// Ranges are stored in 5 us steps (STEP_TO_CHANNEL_VALUE, fc/rc_modes.h)
// between 875 and 2125 us.
function toStep(us) {
  return Math.max(875, Math.min(2125, Math.round(us / 5) * 5));
}

// An always-on, mapped ("continuous") range: the position of AUX channel
// `aux` is the value, from `min` at `low` us to `max` at `high` us.
export function mappedRange(adjFunction, aux, low, high, min, max) {
  return {
    adjFunction,
    enaChannel: ALWAYS_ON_CH,
    enaRange: { start: 1500, end: 1500 },
    adjChannel: aux,
    adjRange1: { start: toStep(low), end: toStep(high) },
    adjRange2: { start: 1500, end: 1500 },
    adjMin: min,
    adjMax: max,
    adjStep: 0,
  };
}

//// Profile switch.

// Distinct switch positions in recorded channel values (us): values closer
// than CLUSTER_US are one position. Sorted, as {low, high, centre}.
const CLUSTER_US = 150;

export function switchPositions(samples) {
  const sorted = samples.filter((v) => v > 0).sort((a, b) => a - b);
  const positions = [];
  for (const value of sorted) {
    const last = positions[positions.length - 1];
    if (last && value - last.high < CLUSTER_US) {
      last.high = value;
    } else {
      positions.push({ low: value, high: value });
    }
  }
  return positions.map((p) => ({ ...p, centre: (p.low + p.high) / 2 }));
}

// The most positions a profile switch may have: profiles 1-3. A switch
// with more is counted as three.
export const MAX_PROFILE_POSITIONS = 3;

// A profile range over the switch's real travel: its lowest position is
// profile 1, its highest `count`. The firmware maps the channel linearly
// over the range and rounds, so each position lands on its own profile.
export function profileRange(adjFunction, aux, positions) {
  const count = Math.min(positions.length, MAX_PROFILE_POSITIONS);
  const low = positions[0].centre;
  const high = positions[positions.length - 1].centre;
  return mappedRange(adjFunction, aux, low, high, 1, count);
}

//// Master gain on a knob.

export function knobRange(adjFunction, aux) {
  // 25 us past 1000-2000 at each end, so a radio's full travel stays
  // inside the range and reaches both ends; centred on 1500.
  return mappedRange(adjFunction, aux, 975, 2025, KNOB_MIN, KNOB_MAX);
}

//// Master gain on the trim buttons, all on one channel.
//
// Heli pilots rarely use stick trims, so the trim buttons are free. One mix
// per button on a spare channel, source MAX, weight below, active only
// while that button is pressed (EdgeTX: the trim switch as the mix switch;
// Ethos: an action on the trim). Each button then puts its own value on
// the channel, and stepped ranges tell them apart: a press steps the
// flight controller's master gain by GAIN_STEP.

export const GAIN_BUTTONS = [
  { key: "cyclicDown", adjFunction: ADJ.CYCLIC_MASTER_GAIN, dir: -1, weight: 30 },
  { key: "cyclicUp", adjFunction: ADJ.CYCLIC_MASTER_GAIN, dir: 1, weight: 40 },
  { key: "yawDown", adjFunction: ADJ.YAW_MASTER_GAIN, dir: -1, weight: 50 },
  { key: "yawUp", adjFunction: ADJ.YAW_MASTER_GAIN, dir: 1, weight: 60 },
];

// Channel value for a MAX source at `weight` %: 100 % is 1500 + 512 us on
// both EdgeTX and Ethos.
export function buttonValue(weight) {
  return 1500 + weight * 5.12;
}

// The channel window each button's value falls in: from half-way to the
// button below to half-way to the one above (the same half-gap past the
// first and last), so neighbouring windows meet without overlapping. The
// idle channel (1500, no button) is below the first window.
export function buttonWindow(index) {
  const values = GAIN_BUTTONS.map((b) => buttonValue(b.weight));
  const value = values[index];
  const below = index > 0 ? values[index - 1] : 2 * value - values[index + 1];
  const above =
    index < values.length - 1
      ? values[index + 1]
      : 2 * value - values[index - 1];
  return {
    start: toStep((below + value) / 2),
    end: toStep((value + above) / 2),
  };
}

// The button the channel is showing at `position` (us), or null.
export function buttonAt(position) {
  if (!(position > 0)) return null;
  const index = GAIN_BUTTONS.findIndex((_, i) => {
    const window = buttonWindow(i);
    return position >= window.start && position < window.end;
  });
  return index >= 0 ? GAIN_BUTTONS[index] : null;
}

// The always-on stepped range for `adjFunction` on AUX channel `aux`: its
// down button's window steps down, its up button's window steps up.
export function steppedGainRange(adjFunction, aux) {
  const window = (dir) =>
    buttonWindow(
      GAIN_BUTTONS.findIndex(
        (b) => b.adjFunction === adjFunction && b.dir === dir,
      ),
    );
  return {
    adjFunction,
    enaChannel: ALWAYS_ON_CH,
    enaRange: { start: 1500, end: 1500 },
    adjChannel: aux,
    adjRange1: window(-1),
    adjRange2: window(1),
    adjMin: GAIN_MIN,
    adjMax: GAIN_MAX,
    adjStep: GAIN_STEP,
  };
}

//// Reading back.

// The slot already holding `adjFunction`, else the first free one, else -1.
export function slotFor(ranges, adjFunction) {
  const own = ranges.findIndex((r) => r?.adjFunction === adjFunction);
  if (own >= 0) return own;
  return ranges.findIndex((r) => !r || r.adjFunction === 0);
}

export function rangeOf(ranges, adjFunction) {
  return ranges.find((r) => r?.adjFunction === adjFunction) ?? null;
}

// The AUX channel driving `adjFunction`, or null.
export function channelOf(ranges, adjFunction) {
  return rangeOf(ranges, adjFunction)?.adjChannel ?? null;
}

// The value a mapped range gives for a channel position (us), as the
// firmware computes it (processRcAdjustments, continuous adjustment).
export function mappedValue(range, position) {
  const width = range.adjRange1.end - range.adjRange1.start;
  const span = range.adjMax - range.adjMin;
  if (!(width > 0) || !(span > 0)) return range.adjMin;
  const value =
    range.adjMin +
    Math.trunc(((position - range.adjRange1.start) * span + width / 2) / width);
  return Math.max(range.adjMin, Math.min(range.adjMax, value));
}

// How the profile switch is set up now: "both" (PID and rate profiles on
// one channel), "pid", or "none".
export function profileMode(ranges) {
  const pid = channelOf(ranges, ADJ.PID_PROFILE);
  if (pid === null) return "none";
  return channelOf(ranges, ADJ.RATE_PROFILE) === pid ? "both" : "pid";
}

// How master gain is adjusted in flight: "buttons" (stepped), "knob"
// (mapped) or "profile" (no range: the profile switch picks it).
export function gainMode(ranges) {
  const range = rangeOf(ranges, ADJ.CYCLIC_MASTER_GAIN);
  if (!range) return "profile";
  return range.adjStep > 0 ? "buttons" : "knob";
}

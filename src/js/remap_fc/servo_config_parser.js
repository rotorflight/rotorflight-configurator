/**
 * File: src/js/remap_fc/servo_config_parser.js
 * Parses the text output of the flight controller's `servo` CLI
 * command into each configured servo's own update rate (PWM frequency,
 * in Hz) -- the value RemapFc.svelte's servo-frequency review card
 * compares across every servo that shares a timer, since a timer's own
 * period is one property of the whole timer, not something each
 * channel on it can set independently: two servos sharing a timer but
 * configured for different rates can never both actually run at their
 * own configured one.
 */

// Line format, e.g.:
//   servo 1 1500 -700 700 500 500 333 0 0
// Fields after the index are, in order: mid, min, max, rneg, rpos,
// rate, speed, flags -- matching FC.SERVO_CONFIG's own field order
// (see virtual_fc.js). Only `rate` (the 6th of those) is needed here.
const SERVO_LINE_RE =
  /^servo\s+(\d+)\s+-?\d+\s+-?\d+\s+-?\d+\s+-?\d+\s+-?\d+\s+(-?\d+)\s+-?\d+\s+-?\d+$/i;

/**
 * @param {string} servoText - The `servo` CLI command's own output.
 * @returns {Object.<string, number>} option key (e.g. "S1") -> that
 *   servo's configured update rate in Hz.
 */
export function parseServoRates(servoText) {
  const rates = {};

  for (const rawLine of servoText.split(/\r?\n/)) {
    const match = rawLine.trim().match(SERVO_LINE_RE);
    if (!match) continue;

    const [, index, rate] = match;
    rates[`S${index}`] = Number(rate);
  }

  return rates;
}

import { CONFIGURATOR } from "@/js/configurator.svelte.js";
import { safeStopGroups } from "@/js/msp/safe_stop.js";
import { serial } from "@/js/serial.js";

// Between the groups of the stop sequence, so a slow link can't overrun the
// board's receive buffer.
const GROUP_PAUSE = 20;
// The board answers the frames one MSP task cycle at a time; see
// waitUntilQuiet().
const QUIET_TIME = 300;
const POLL_INTERVAL = 50;

/**
 * Stops the motors and releases every servo, mixer and mode override on the
 * connected FC (see safe_stop.js). For a tab that set overrides without a
 * timeout, and for anything that lets go of the FC: otherwise the servos
 * stay where they were left, and arming stays blocked, until the board
 * reboots. `disarm`: also disarm first (see safeStopGroups()).
 */
export async function releaseOverrides({ disarm = false } = {}) {
  if (CONFIGURATOR.virtualMode || !serial.connected) {
    return;
  }
  for (const group of safeStopGroups({ disarm })) {
    serial.send(group.buffer);
    await new Promise((resolve) => setTimeout(resolve, GROUP_PAUSE));
  }
}

/**
 * Waits until the FC has stopped answering for a moment (at most `maxTime`
 * ms), i.e. it has worked through everything sent to it. Before closing the
 * port right after releaseOverrides(): the board takes about a second for
 * the whole sequence, and closing earlier can cut it short.
 */
export async function waitUntilQuiet(maxTime) {
  const start = Date.now();
  let received = serial.bytesReceived;
  let lastChange = Date.now();
  while (Date.now() - lastChange < QUIET_TIME && Date.now() - start < maxTime) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    if (serial.bytesReceived !== received) {
      received = serial.bytesReceived;
      lastChange = Date.now();
    }
  }
}

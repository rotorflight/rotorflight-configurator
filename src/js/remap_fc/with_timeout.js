/**
 * File: src/js/remap_fc/with_timeout.js
 * Races `promise` against a timeout, rejecting with an error naming
 * `label` if it fires first, and clearing the timer either way -- left
 * running, it would still fire after `promise` already won the race,
 * rejecting a promise nothing is left to handle (an unhandled
 * rejection a few seconds into every successful call, not just a
 * slow/failed one). Shared by remap_fc.js (bounding its bulk CLI
 * transfer steps) and rotorflight_target_source.js (bounding its
 * GitHub fetches), which both need the identical race/cleanup but
 * bound different kinds of work.
 * @param {Promise} promise
 * @param {number} ms
 * @param {string} label - Named in the timeout error, e.g. "diff all".
 * @returns {Promise}
 */
export function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Timed out waiting for ${label}`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

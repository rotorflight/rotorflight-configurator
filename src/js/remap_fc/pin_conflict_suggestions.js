/**
 * File: src/js/remap_fc/pin_conflict_suggestions.js
 * When a timer/DMA clash survives a full reallocation pass (see
 * timer_dma_reconciler.js's reallocateTimersAndDma) -- meaning no
 * choice of timer/DMA on the *current* pin assignments can resolve
 * it -- the problem is which option sits on which pin, not the
 * timer/DMA choice on that pin. This searches for an alternative pin
 * assignment that would let a fresh reallocation resolve everything,
 * so the UI can offer it as a one-click fix rather than leaving the
 * user to work out a swap by hand.
 *
 * The search itself is deliberately simple: for each feature a full
 * reallocation pass still couldn't resolve, try moving it onto every
 * other row's own default pin, one at a time -- a swap if that pin is
 * currently occupied (the two features trade places), a plain move if
 * it's free. Each candidate layout is itself run through a full
 * reallocation pass; only ones that leave nothing unresolved at all
 * are kept. This is a single-swap search, not an exhaustive one -- a
 * clash that needs two coordinated moves at once to resolve won't find
 * a suggestion here. Deliberately no automatic fallback for that case
 * either (e.g. silently clearing the pin back to unassigned): the
 * caller shows a plain message pointing back at whichever option the
 * user just placed, rather than this module guessing at some other
 * feature to touch on their behalf.
 */

import { buildFeatureRows, reallocateTimersAndDma, buildTimerDmaCommands } from "./timer_dma_reconciler.js";

/**
 * @typedef {Object} PinConflictSuggestion
 * @property {"swap"|"move"} type
 * @property {string} feature - The unresolved feature this suggestion moves.
 * @property {?string} otherFeature - For "swap", the feature it trades places with.
 * @property {string} targetPin - The pin `feature` would move to.
 * @property {import("./hardware_parser.js").HardwareMap} apply - The
 *   resulting working hardware map, ready to adopt as-is if this
 *   suggestion is accepted.
 *
 * Deliberately no human-readable description here -- this module has
 * no knowledge of a board's reference design, so it only ever knows
 * `feature`/`otherFeature` by their raw CLI option keys (e.g. "M1"),
 * never a board's own connector name for them (e.g. "ESC"). Building
 * the label is the caller's job -- see RemapFc.svelte's
 * suggestionLabel, which uses the same optionLabel() every other
 * option label in this tab goes through.
 */

/**
 * @typedef {Object} PinConflictSearchResult
 * @property {string[]} unresolvedFeatures - Empty if the working
 *   state's current pin assignments are fine as they are (no reason
 *   for the caller to show anything). Non-empty means a full
 *   reallocation pass still leaves at least this many features
 *   genuinely conflicting -- always shown by the caller regardless of
 *   whether any suggestions were actually found for them.
 * @property {PinConflictSuggestion[]} suggestions - Empty either
 *   because unresolvedFeatures is empty (nothing to suggest a fix
 *   for), or because unresolvedFeatures is non-empty but no single
 *   swap/move resolves it -- the caller tells these two apart via
 *   unresolvedFeatures itself.
 */

/**
 * Whether a full reallocation pass over this hardware map leaves
 * nothing unresolved.
 * @param {import("./hardware_parser.js").HardwareMap} hardwareMap
 * @param {?string} mcuType
 * @param {Object} mcuAllData
 * @param {Set<string>} reservedDmaStreams
 * @param {Set<string>} reservedTimers
 * @returns {string[]} The features still unresolved after reallocating, if any.
 */
function unresolvedAfterReallocation(
  hardwareMap,
  mcuType,
  mcuAllData,
  reservedDmaStreams,
  reservedTimers,
) {
  const featureRows = buildFeatureRows(hardwareMap, mcuType, mcuAllData);
  const allocation = reallocateTimersAndDma(featureRows, reservedDmaStreams, reservedTimers);
  return buildTimerDmaCommands(
    featureRows,
    allocation,
    reservedDmaStreams,
    reservedTimers,
  ).unresolved;
}

/**
 * @param {import("./hardware_parser.js").HardwareMap} workingCurrent
 * @param {?string} mcuType
 * @param {Object} mcuAllData - The parsed contents of MCU-all.json.
 * @param {Set<string>} reservedDmaStreams
 * @param {Set<string>} reservedTimers
 * @param {import("./remap_table.js").RemapRow[]} tableRows - Every
 *   row currently in the table, as candidate target pins to move an
 *   unresolved feature onto.
 * @param {string[]} unresolvedFeatures - The features a reallocation
 *   pass over workingCurrent as it stands right now leaves unresolved
 *   (timer_dma_reconciler.js's reconcileTimersAndDma already computes
 *   this once per edit as reconciled.unresolved; it's passed in rather
 *   than recomputed here so this search can never disagree with it
 *   about whether there's a clash to search a fix for in the first
 *   place -- recomputing independently risked the two falling out of
 *   sync, since reconcileTimersAndDma skips reallocation entirely when
 *   the *current* allocation already has no clash, while a fresh
 *   reallocation from scratch can land on a different, occasionally
 *   worse, outcome than the one already in place).
 * @returns {PinConflictSearchResult}
 */
export function findPinConflictSuggestions(
  workingCurrent,
  mcuType,
  mcuAllData,
  reservedDmaStreams,
  reservedTimers,
  tableRows,
  unresolvedFeatures,
) {
  if (unresolvedFeatures.length === 0) return { unresolvedFeatures, suggestions: [] };

  const occupantOf = (pin) =>
    Object.keys(workingCurrent).find((key) => workingCurrent[key].pin === pin);
  const resolves = (candidate) =>
    unresolvedAfterReallocation(
      candidate,
      mcuType,
      mcuAllData,
      reservedDmaStreams,
      reservedTimers,
    ).length === 0;

  const suggestions = [];

  for (const feature of unresolvedFeatures) {
    const currentPin = workingCurrent[feature]?.pin;
    if (!currentPin) continue;

    for (const row of tableRows) {
      if (!row.defaultPin || row.defaultPin === currentPin) continue;

      const displaced = occupantOf(row.defaultPin);
      // feature always ends up on row.defaultPin, and (when the target
      // pin was occupied) displaced always ends up on feature's old
      // pin -- so every key that would be removed here is immediately
      // reassigned, and spreading the overrides on top is equivalent
      // to the original clear-then-set without a dynamic delete.
      const candidate = { ...workingCurrent, [feature]: { pin: row.defaultPin } };
      if (displaced) candidate[displaced] = { pin: currentPin };

      if (!resolves(candidate)) continue;

      suggestions.push(
        displaced
          ? {
              type: "swap",
              feature,
              otherFeature: displaced,
              targetPin: row.defaultPin,
              apply: candidate,
            }
          : {
              type: "move",
              feature,
              otherFeature: null,
              targetPin: row.defaultPin,
              apply: candidate,
            },
      );
    }
  }

  return { unresolvedFeatures, suggestions };
}

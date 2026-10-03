/**
 * File: src/js/remap_fc/timer_dma_reconciler.js
 * The entry point the "Load Changes" flow calls before sending its
 * `resource` commands: builds a per-feature view of the working
 * hardware map's timer/DMA state, checks whether anything about to be
 * sent to the flight controller would actually clash (a freshly
 * assigned/moved feature has no timer yet, two features would land on
 * the same timer+channel or DMA stream, a feature would land on a DMA
 * stream something outside this tool's control already owns -- SPI,
 * ADC, etc. -- or two different feature types would share a timer
 * base), and -- only if something does -- runs the full
 * timer_allocator.js/dma_allocator.js pass and turns its result into
 * the `timer`/`dma pin` CLI commands needed to apply it.
 *
 * Deliberately an all-or-nothing decision: a clash anywhere means
 * every feature's timer and DMA is reallocated from scratch together,
 * rather than patching just the clashing ones. The whole point of the
 * base-exclusivity and critical-base rules is that one feature's
 * "safe" choice depends on every other feature's choice too, so a
 * partial reallocation could just move the clash elsewhere.
 *
 * timer_allocator.js/dma_allocator.js always assign every feature
 * *something*, even when literally every option available to it
 * collides with something else already claimed -- rather than
 * silently leaving a feature unconfigured (which would read as
 * "nothing wrong here" when something very much still is), the
 * allocators force their best remaining choice through regardless.
 * This file is what actually notices that a forced choice still
 * collides, via stillConflictingFeatures below -- checking the
 * allocation's own *output* for the same rules detectClashes checks
 * against the *current*, pre-allocation state -- and is what actually
 * withholds sending it, in buildTimerDmaCommands.
 */

import { getPinTimerOptions } from "./timer_dma_lookup.js";
import { classifyFeature, featureNeedsDma } from "./feature_classifier.js";
import { allocateTimers } from "./timer_allocator.js";
import { allocateDma } from "./dma_allocator.js";

/**
 * @typedef {Object} FeatureTimerRow
 * @property {string} feature
 * @property {string} pin
 * @property {"motor"|"servo"|"freq"|"led"|"other"} type
 * @property {import("./timer_dma_lookup.js").TimerOption[]} options
 * @property {?import("./timer_dma_lookup.js").TimerOption} currentOption -
 *   Whichever of `options` this feature's HardwareMap entry currently
 *   points to (matched by AF), or null if it has none/an unrecognised
 *   one -- e.g. every feature the table's edits touched, since those
 *   are only ever given a pin, never a timer/DMA (see RemapFc.svelte's
 *   handleCurrentOptionChange).
 * @property {?import("./timer_dma_lookup.js").DmaChoice} currentDma -
 *   The DMA choice currentOption's own list points to at the
 *   HardwareMap entry's dma index, or null -- always null when
 *   needsDma is false, regardless of what the HardwareMap entry
 *   itself reports, since this tool never treats a servo/frequency
 *   input's DMA index as meaningful (see featureNeedsDma).
 * @property {boolean} needsDma - Whether this tool tracks/claims DMA
 *   for this feature's type at all -- see feature_classifier.js's
 *   featureNeedsDma.
 */

/**
 * Builds one row per feature actually assigned a pin in the working
 * hardware map, joined against this MCU's timer options for that pin
 * and whatever timer/DMA that feature is currently recorded as using.
 *
 * Only considers motor/servo/freq/LED features -- workingCurrent also
 * carries every UART/I2C resource the board has wired (RX/TX/SDA/SCL),
 * which classifyFeature reports as "other". Those pins often still
 * report *some* timer AF/DMA in a `dump hardware` (the MCU pin is
 * electrically capable of PWM even though it's actually wired for
 * serial), but this tool never manages their timer/DMA -- treating
 * them as real timer users would make them compete for exclusive
 * timer bases against genuine motor/servo/freq features, flagging a
 * perfectly healthy default configuration as clashing with itself.
 * @param {import("./hardware_parser.js").HardwareMap} workingCurrent
 * @param {?string} mcuType
 * @param {Object} mcuAllData - The parsed contents of MCU-all.json.
 * @returns {FeatureTimerRow[]}
 */
export function buildFeatureRows(workingCurrent, mcuType, mcuAllData) {
  return Object.entries(workingCurrent)
    .filter(([feature]) => classifyFeature(feature) !== "other")
    .map(([feature, entry]) => {
      const options = getPinTimerOptions(mcuAllData, mcuType, entry.pin);
      const needsDma = featureNeedsDma(feature);

      // A HardwareMap entry's own `timer` field holds the pin's AF
      // value (e.g. "AF2"), not the full "TIM3 CH1" descriptor --
      // match it back to whichever option reports that AF to find
      // what's actually selected right now.
      const currentOption = entry.timer
        ? (options.find((o) => o.af === entry.timer) ?? null)
        : null;
      const currentDma =
        needsDma && currentOption
          ? (currentOption.dma[Number(entry.dma)] ?? null)
          : null;

      return {
        feature,
        pin: entry.pin,
        type: classifyFeature(feature),
        options,
        currentOption,
        currentDma,
        needsDma,
      };
    });
}

/**
 * @typedef {Object} ClashReport
 * @property {boolean} hasClash
 * @property {string[]} reasons - Human-readable descriptions of each
 *   clash found, joined and shown directly in the allocation-invalid
 *   warning panel (see RemapFc.svelte's use of
 *   remapFcAllocationInvalidWarning) -- word them for a user reading
 *   them there, not just for debugging.
 */

/**
 * Checks the working set's current timer/DMA state for anything that
 * needs a reallocation pass: a feature with no timer chosen yet --
 * every newly assigned/moved one, but also one whose pin genuinely has
 * zero timer options at all (e.g. a receive-only UART pin), which is
 * just as broken and needs the same reallocation-then-still-unresolved
 * treatment (see buildTimerDmaCommands) rather than being silently
 * accepted -- two features sharing a full timer+channel or a base
 * across feature types, a feature already sitting on a timer+channel or
 * base something outside this tool's control (the gyro's clock/sync
 * signal, ...) has permanently claimed, two features sharing a DMA
 * stream, or a feature already sitting on a stream something outside
 * this tool's control (SPI, ADC, ...) has permanently claimed.
 * @param {FeatureTimerRow[]} featureRows
 * @param {Set<string>} [reservedStreams] - See
 *   timer_dma_lookup.js's parseReservedDmaStreams.
 * @param {Set<string>} [reservedTimers] - See
 *   timer_dma_lookup.js's parseReservedTimers.
 * @returns {ClashReport}
 */
export function detectClashes(
  featureRows,
  reservedStreams = new Set(),
  reservedTimers = new Set(),
) {
  const reasons = [];

  for (const row of featureRows) {
    if (!row.currentOption) {
      reasons.push(`${row.feature} (${row.pin}) has no timer chosen yet`);
    }
  }

  const seenFullTimers = new Map();
  const baseOwner = new Map();
  const seenDma = new Map();

  for (const row of featureRows) {
    if (row.currentOption) {
      const { timer, base } = row.currentOption;

      if (reservedTimers.has(timer)) {
        reasons.push(`${row.feature} sits on ${timer}, which is reserved for another peripheral`);
      }

      const timerOwner = seenFullTimers.get(timer);
      if (timerOwner) {
        reasons.push(`${row.feature} and ${timerOwner} both use ${timer}`);
      } else {
        seenFullTimers.set(timer, row.feature);
      }

      const baseOwnerFeature = baseOwner.get(base);
      if (baseOwnerFeature && baseOwnerFeature.type !== row.type) {
        reasons.push(
          `${row.feature} (${row.type}) and ${baseOwnerFeature.feature} (${baseOwnerFeature.type}) both use base ${base}`,
        );
      } else if (!baseOwnerFeature) {
        baseOwner.set(base, { feature: row.feature, type: row.type });
      }
    }

    if (row.currentDma) {
      const stream = row.currentDma.stream;

      if (reservedStreams.has(stream)) {
        reasons.push(`${row.feature} sits on ${stream}, which is reserved for another peripheral`);
      }

      const dmaOwner = seenDma.get(stream);
      if (dmaOwner) {
        reasons.push(`${row.feature} and ${dmaOwner} both use ${stream}`);
      } else {
        seenDma.set(stream, row.feature);
      }
    }
  }

  return { hasClash: reasons.length > 0, reasons };
}

/**
 * @typedef {Object} FeatureAllocation
 * @property {string} feature
 * @property {string} pin
 * @property {?import("./timer_dma_lookup.js").TimerOption} chosen
 * @property {import("./dma_allocator.js").DmaAllocationResult} dma
 */

/**
 * Runs the full timer, then DMA, allocation pass over every feature
 * row together.
 * @param {FeatureTimerRow[]} featureRows
 * @param {Set<string>} [reservedStreams] - See
 *   timer_dma_lookup.js's parseReservedDmaStreams.
 * @param {Set<string>} [reservedTimers] - See
 *   timer_dma_lookup.js's parseReservedTimers.
 * @returns {FeatureAllocation[]}
 */
export function reallocateTimersAndDma(
  featureRows,
  reservedStreams = new Set(),
  reservedTimers = new Set(),
) {
  const timerRows = allocateTimers(
    featureRows.map(({ feature, pin, options, needsDma }) => ({
      feature,
      pin,
      options,
      needsDma,
    })),
    reservedTimers,
  );
  const dmaResults = allocateDma(timerRows, reservedStreams);

  return timerRows.map((row) => ({
    feature: row.feature,
    pin: row.pin,
    chosen: row.chosen,
    dma: dmaResults[row.feature],
  }));
}

/**
 * Which features in a fresh allocation still genuinely can't be sent as
 * a working configuration, checking the allocation's own *output* for
 * exactly the rules detectClashes checks against the *current*,
 * pre-allocation state -- two features sharing a full timer+channel,
 * two different feature types sharing a base, a feature sitting on a
 * timer/DMA stream this tool doesn't control, or two features sharing a
 * DMA stream -- plus one the pre-allocation state can't have: a feature
 * that needs DMA whose *chosen* timer simply has no DMA options at all.
 *
 * The collision checks are what catch a forced choice
 * timer_allocator.js's pickBestOption or dma_allocator.js's allocateDma
 * pushed through despite every option colliding with something -- see
 * each of their own file comments for why they force one through
 * rather than leaving the feature unconfigured. The zero-DMA-options
 * check catches a different failure those two can't force their way
 * out of: allocateDma only ever forces a *colliding* choice through
 * when the chosen timer has DMA options at all, just all already
 * claimed (dmaOptions.length > 0); when the chosen timer has none
 * whatsoever (dmaOptions.length === 0 -- e.g. a pin whose only timer
 * alternate functions are on basic timers with no DMA request line at
 * all), it correctly leaves selectedDMAIndex at -1 instead of
 * fabricating one. Left unchecked, that reads as "nothing wrong here"
 * to the caller: a timer command still gets sent for a motor/LED that
 * will never actually receive any DMA-driven output. No reallocation
 * of timers/DMA among features could ever fix this -- the pin itself
 * has no usable option -- so this is exactly the class of problem
 * pin_conflict_suggestions.js's swap/move search exists for, and it
 * only runs for features this function reports.
 * @param {FeatureTimerRow[]} featureRows - For each result's own type/needsDma.
 * @param {FeatureAllocation[]} allocation
 * @param {Set<string>} reservedStreams
 * @param {Set<string>} reservedTimers
 * @returns {Set<string>} Feature keys that can't be sent as-is.
 */
function stillConflictingFeatures(
  featureRows,
  allocation,
  reservedStreams,
  reservedTimers,
) {
  const rowByFeature = new Map(featureRows.map((row) => [row.feature, row]));
  const seenFullTimers = new Map();
  const baseOwner = new Map();
  const seenDma = new Map();
  const conflicting = new Set();

  for (const result of allocation) {
    const type = rowByFeature.get(result.feature)?.type;

    if (result.chosen) {
      const { timer, base } = result.chosen;

      if (reservedTimers.has(timer)) conflicting.add(result.feature);

      const timerOwner = seenFullTimers.get(timer);
      if (timerOwner) {
        conflicting.add(result.feature);
        conflicting.add(timerOwner);
      } else {
        seenFullTimers.set(timer, result.feature);
      }

      const baseOwnerEntry = baseOwner.get(base);
      if (baseOwnerEntry && baseOwnerEntry.type !== type) {
        conflicting.add(result.feature);
        conflicting.add(baseOwnerEntry.feature);
      } else if (!baseOwnerEntry) {
        baseOwner.set(base, { feature: result.feature, type });
      }
    }

    const dmaInfo = result.dma?.dmaInfo;
    if (dmaInfo) {
      const stream = dmaInfo.stream;

      if (reservedStreams.has(stream)) conflicting.add(result.feature);

      const dmaOwner = seenDma.get(stream);
      if (dmaOwner) {
        conflicting.add(result.feature);
        conflicting.add(dmaOwner);
      } else {
        seenDma.set(stream, result.feature);
      }
    } else if (
      rowByFeature.get(result.feature)?.needsDma &&
      result.chosen &&
      result.dma?.selectedDMAIndex === -1
    ) {
      conflicting.add(result.feature);
    }
  }

  return conflicting;
}

/**
 * Turns a fresh allocation into the CLI commands needed to apply it,
 * skipping any feature whose allocated timer/DMA already matches what
 * it's currently set to -- so a reallocation triggered by one clashing
 * feature doesn't churn every other feature's settings along with it
 * unless the allocator genuinely moved them too.
 *
 * Every pin whose timer or DMA is changing is freed first (`timer
 * <PIN> NONE` / `dma pin <PIN> NONE`), and only once every removal has
 * been sent does any new assignment go out -- the same two-phase
 * ordering remap_table.js's buildChangeCommands uses for `resource`,
 * so a straight swap between two pins can never try to claim a value
 * the other side hasn't freed yet.
 *
 * A feature still conflicting with another even after a full
 * reallocation pass (stillConflictingFeatures above -- the pin
 * assignment itself is the actual problem, not the timer/DMA choice
 * on it; see pin_conflict_suggestions.js for the fix that actually
 * addresses that) is left alone entirely -- no removal, no addition --
 * rather than sending a `timer`/`dma pin` command this tool already
 * knows collides with something. Sending `timer <PIN> NONE` on its own
 * would take a working output and turn it into a broken one; leaving
 * it exactly as it was is worse only in that the clash it was already
 * part of isn't fixed, which is the same outcome as not running the
 * allocator at all. Reported back via `unresolved` so the caller can
 * warn about it instead.
 * @param {FeatureTimerRow[]} featureRows
 * @param {FeatureAllocation[]} allocation
 * @param {Set<string>} [reservedStreams]
 * @param {Set<string>} [reservedTimers]
 * @returns {{commands: string[], unresolved: string[]}}
 */
export function buildTimerDmaCommands(
  featureRows,
  allocation,
  reservedStreams = new Set(),
  reservedTimers = new Set(),
) {
  const currentByFeature = new Map(featureRows.map((row) => [row.feature, row]));
  const conflicting = stillConflictingFeatures(
    featureRows,
    allocation,
    reservedStreams,
    reservedTimers,
  );
  const timerRemovals = [];
  const timerAdditions = [];
  const dmaRemovals = [];
  const dmaAdditions = [];
  const unresolved = [];

  for (const result of allocation) {
    const current = currentByFeature.get(result.feature);

    // Either this feature is one of the ones stillConflictingFeatures
    // found still colliding despite the allocator's best effort, or it
    // has no timer chosen at all -- whether because every option
    // collided with something (rare, since pickBestOption/allocateDma
    // force a choice through whenever any option exists) or, more
    // commonly, because its pin genuinely has zero timer options at all
    // (e.g. a receive-only UART pin). Both leave this feature exactly
    // as broken: a motor/servo/freq/LED with nothing actually driving
    // it doesn't work regardless of *why* it has no timer, so both are
    // reported the same way -- previously the zero-options case was
    // silently treated as "nothing to warn about", which let a bad
    // dropdown pick or a pin-conflict suggestion (see
    // pin_conflict_suggestions.js's resolves, which reads this same
    // unresolved list) accept a resource command that could never
    // actually work.
    if (conflicting.has(result.feature) || !result.chosen) {
      unresolved.push(result.feature);
      continue;
    }

    const oldAF = current?.currentOption?.af ?? null;
    const newAF = result.chosen?.af ?? null;
    const afChanged = oldAF !== newAF;

    if (afChanged) {
      if (oldAF !== null) timerRemovals.push(`timer ${result.pin} NONE`);
      if (newAF !== null) timerAdditions.push(`timer ${result.pin} ${newAF}`);
    }

    // A DMA index only means the same thing across two allocations if
    // the AF (and so the timer option it indexes into) hasn't changed
    // -- once the AF moves, last time's index refers to a different
    // option's DMA list entirely, so a changed AF always means the old
    // DMA choice (if any) needs freeing rather than being compared.
    const oldDmaIndex = !afChanged ? (current?.currentDma?.index ?? null) : null;
    const oldDmaPresent = afChanged ? current?.currentDma != null : oldDmaIndex !== null;
    const newDmaIndex = result.dma.selectedDMAIndex >= 0 ? result.dma.selectedDMAIndex : null;
    const dmaChanged = afChanged ? oldDmaPresent || newDmaIndex !== null : oldDmaIndex !== newDmaIndex;

    if (dmaChanged) {
      if (oldDmaPresent) dmaRemovals.push(`dma pin ${result.pin} NONE`);
      if (newDmaIndex !== null) dmaAdditions.push(`dma pin ${result.pin} ${newDmaIndex}`);
    }
  }

  return {
    commands: [...timerRemovals, ...timerAdditions, ...dmaRemovals, ...dmaAdditions],
    unresolved,
  };
}

// Turns a FeatureTimerRow's own as-read state into the same shape
// reallocateTimersAndDma() returns, so buildAllocationTable below can
// show a consistent table whether or not anything actually needed
// reallocating.
function allocationFromCurrentState(featureRows) {
  return featureRows.map((row) => ({
    feature: row.feature,
    pin: row.pin,
    chosen: row.currentOption,
    dma: {
      dmaOptions: row.currentOption?.dma ?? [],
      selectedDMAIndex: row.currentDma?.index ?? -1,
      dmaInfo: row.currentDma,
    },
  }));
}

/**
 * @typedef {Object} AllocationTableRow
 * @property {string} feature
 * @property {string} pin
 * @property {boolean} unresolved - Whether this feature's timer could
 *   not be resolved at all, so what's shown is its unchanged existing
 *   state rather than anything actually being applied.
 * @property {boolean} dmaManaged - Whether this tool actually tracks/
 *   claims DMA for this feature (see feature_classifier.js's
 *   featureNeedsDma) -- false for a servo/frequency input. The
 *   dmaCommand/dma fields below are still populated when false, but
 *   purely informationally: firmware never uses DMA for such a
 *   feature regardless of what's shown, and this tool never sends the
 *   command. The UI should style these visibly differently (e.g.
 *   greyed out/struck through) from a real, actionable DMA outcome.
 * @property {string} timerCommand - The `timer` CLI command, for
 *   reference alongside the human-readable form below.
 * @property {string} timer - A human-readable resolution, e.g.
 *   "pin A03: TIM9 CH2 (AF3)" -- much easier to place at a glance than
 *   "timer A03 AF3" alone.
 * @property {{af: string, label: string, chosen: boolean}[]} timerOptions -
 *   Every timer/AF this pin actually supports (not just the one
 *   chosen), so the UI can show the full picture -- e.g. to check
 *   whether a still-free option exists before touching a wire -- with
 *   `chosen` marking which one (if any) this row is actually using.
 *   Empty for a pin with no timer capability at all.
 * @property {string} dmaCommand - The `dma pin` CLI command -- see
 *   dmaManaged above for when this is informational only.
 * @property {string} dma - A human-readable resolution, e.g.
 *   "pin A09: DMA2 Stream 6 Channel 0" -- see dmaManaged above.
 */

/**
 * Builds one row per feature describing its timer/DMA outcome, for
 * display in the UI's allocation panel. Always shows the allocator's
 * own calculated result, unresolved or not -- pickBestOption/
 * allocateDma always force their best remaining choice through even
 * when it still collides with something, rather than leaving the
 * feature unconfigured, precisely so there's always something real to
 * show here rather than a blank "-" that would misleadingly read as
 * "nothing wrong." unresolved (see buildTimerDmaCommands) marks which
 * rows are still genuinely conflicting despite that, purely for the
 * caller's own styling (e.g. this tab renders those rows struck
 * through/highlighted) -- it doesn't change which value gets shown.
 *
 * A feature with nothing chosen at all -- genuinely no timer options
 * for its pin at all, not a clash (see buildTimerDmaCommands' own
 * comment) -- shows "-" rather than a synthetic "timer <PIN> NONE"/
 * "dma pin <PIN> NONE": there's nothing there and nothing this
 * allocator could ever assign, so a command-shaped string would
 * misleadingly suggest otherwise.
 * @param {FeatureTimerRow[]} featureRows
 * @param {FeatureAllocation[]} allocation
 * @param {string[]} unresolved
 * @returns {AllocationTableRow[]}
 */
export function buildAllocationTable(featureRows, allocation, unresolved = []) {
  const currentByFeature = new Map(featureRows.map((row) => [row.feature, row]));
  const unresolvedSet = new Set(unresolved);

  return allocation.map((result) => {
    const current = currentByFeature.get(result.feature);
    const dmaManaged = current?.needsDma ?? true;
    const chosen = result.chosen;

    // For a feature this tool actually manages DMA for, show what was
    // (or would be) really assigned -- allocateDma already never
    // claims a stream for anything else, so result.dma is always
    // empty for those. Show the first DMA choice its chosen timer
    // defines anyway, purely informationally (see dmaManaged above):
    // firmware ignores it regardless, so there's nothing to actually
    // send, but it's still worth showing what's technically available.
    const dmaInfo = dmaManaged ? result.dma.dmaInfo : (chosen?.dma?.[0] ?? null);
    const dmaIndex = dmaManaged
      ? result.dma.selectedDMAIndex
      : chosen?.dma?.length
        ? 0
        : -1;

    const timerOptions = (current?.options ?? []).map((option) => ({
      af: option.af,
      label: `${option.timer} (${option.af})`,
      chosen: chosen ? option.af === chosen.af : false,
    }));

    return {
      feature: result.feature,
      pin: result.pin,
      unresolved: unresolvedSet.has(result.feature),
      dmaManaged,
      timerCommand: chosen ? `timer ${result.pin} ${chosen.af}` : "-",
      timer: chosen ? `pin ${result.pin}: ${chosen.timer} (${chosen.af})` : "-",
      timerOptions,
      dmaCommand: dmaIndex >= 0 ? `dma pin ${result.pin} ${dmaIndex}` : "-",
      dma: dmaInfo ? `pin ${result.pin}: ${dmaInfo.stream} Channel ${dmaInfo.channel}` : "-",
    };
  });
}

/**
 * The single entry point for the apply flow. Always runs the full
 * timer/DMA allocation pass and returns calculatedTable (what a from-
 * scratch allocation pass computes -- the working state's own current
 * timer/DMA when nothing needs fixing, since that's already the
 * correct answer) for display in the UI, but only stages `commands`
 * (and only reports `unresolved`) when the working state's current
 * timer/DMA actually has a clash: calculating what a reallocation
 * *would* look like is harmless and useful to see at any time, but
 * only ever worth actually sending when something's genuinely wrong.
 * @param {import("./hardware_parser.js").HardwareMap} workingCurrent
 * @param {?string} mcuType
 * @param {Object} mcuAllData
 * @param {Set<string>} [reservedDmaStreams] - DMA streams already
 *   claimed by something outside this tool's control (SPI, ADC, ...)
 *   -- see timer_dma_lookup.js's parseReservedDmaStreams. Never
 *   offered to a motor/servo/freq/LED feature, and a feature already
 *   sitting on one of these counts as a clash on its own.
 * @param {Set<string>} [reservedTimers] - Full timer+channel strings
 *   already claimed by something outside this tool's control (the
 *   gyro's clock/sync signal, ...) -- see timer_dma_lookup.js's
 *   parseReservedTimers. Same treatment as reservedDmaStreams.
 * @returns {{commands: string[], clash: ClashReport, unresolved: string[], calculatedTable: AllocationTableRow[], allocation: FeatureAllocation[]}}
 *   allocation is the raw result underlying calculatedTable -- callers
 *   that need a resolved feature's actual af/dma index (not just its
 *   human-readable/command-string form) read it from here, e.g.
 *   RemapFc.svelte's markApplied writing a just-sent allocation back
 *   into its own working state once it's actually been applied.
 */
export function reconcileTimersAndDma(
  workingCurrent,
  mcuType,
  mcuAllData,
  reservedDmaStreams = new Set(),
  reservedTimers = new Set(),
) {
  const featureRows = buildFeatureRows(workingCurrent, mcuType, mcuAllData);
  const clash = detectClashes(featureRows, reservedDmaStreams, reservedTimers);

  if (!clash.hasClash) {
    const allocation = allocationFromCurrentState(featureRows);
    const calculatedTable = buildAllocationTable(featureRows, allocation);
    return { commands: [], clash, unresolved: [], calculatedTable, allocation };
  }

  const allocation = reallocateTimersAndDma(featureRows, reservedDmaStreams, reservedTimers);
  const { commands, unresolved } = buildTimerDmaCommands(
    featureRows,
    allocation,
    reservedDmaStreams,
    reservedTimers,
  );
  return {
    commands,
    clash,
    unresolved,
    calculatedTable: buildAllocationTable(featureRows, allocation, unresolved),
    allocation,
  };
}

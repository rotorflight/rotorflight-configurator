/**
 * File: src/js/remap_fc/dma_allocator.js
 * Picks a DMA stream for every feature that's already been given a
 * timer (see timer_allocator.js) and actually uses DMA at all -- a
 * motor (conservatively assumed to, since its real protocol isn't
 * known at this stage of setup) or the LED strip (which always does).
 * A servo or frequency input never uses DMA regardless of any other
 * setting, so it's skipped entirely here -- see
 * feature_classifier.js's featureNeedsDma, and each row's own
 * needsDma. A stream can only serve one feature at a time,
 * and a motor/the LED strip -- the outputs most sensitive to
 * DMA contention -- may take a stream a lower-priority
 * feature already claimed (though in practice, with servos/frequency
 * inputs excluded, the only lower-priority claimant left is a
 * reserved stream this tool doesn't manage at all, which is never
 * stealable regardless of priority).
 *
 * Claims are tracked per *stream*, not per stream+channel: on the
 * underlying STM32 DMA hardware, a stream is a single physical unit
 * that can only be muxed to one peripheral's request (its "channel")
 * at a time, so two features on the same stream but different
 * channels would still conflict -- they just wouldn't be moving data
 * at the same instant, which is never true here since every feature
 * needs to be live simultaneously in flight. The flight controller's
 * own `dma show` reports claims the same way (per stream, no channel
 * shown at all), confirming the stream itself is the real resource.
 *
 * Each timer option's own DMA list (from MCU-all.json, already
 * normalised by timer_dma_lookup.js) is specific to that pin's chosen
 * timer/AF, so this can only run after timer_allocator.js has picked
 * each feature's timer -- the DMA index space is meaningless without
 * knowing which timer option it belongs to.
 */

import { classifyFeature, HIGH_DMA_PRIORITY_TYPES } from "./feature_classifier.js";

// A sentinel claimant for a stream reserved by something outside this
// tool's control entirely -- SPI_MISO/SPI_MOSI/ADC and the like (see
// timer_dma_lookup.js's parseReservedDmaStreams). Deliberately not a
// real feature type, so it never matches HIGH_DMA_PRIORITY_TYPES and
// so can never be "stolen" the way a low-priority feature's own claim
// can -- reassigning a motor onto the gyro's SPI DMA stream wouldn't
// free anything up, it would just corrupt the gyro's data.
const RESERVED_CLAIMANT = "__reserved__";

/**
 * @typedef {Object} DmaAllocationResult
 * @property {import("./timer_dma_lookup.js").DmaChoice[]} dmaOptions -
 *   Every DMA choice the feature's chosen timer offers, in MCU-all.json
 *   order (indices match the CLI's `dma pin <PIN> <INDEX>`).
 * @property {number} selectedDMAIndex - Index into dmaOptions, or -1
 *   if the timer has no DMA options at all.
 * @property {?import("./timer_dma_lookup.js").DmaChoice} dmaInfo
 */

/**
 * Allocates a DMA stream to every row that has a chosen timer and
 * needs DMA at all (row.needsDma -- see feature_classifier.js's
 * featureNeedsDma). A row with a chosen timer but needsDma false
 * (a servo or frequency input) is reported with its options for
 * reference but never actually claims a stream.
 * @param {import("./timer_allocator.js").TimerAllocationRow[]} timerRows
 * @param {Set<string>} [reservedStreams] - Streams already claimed by
 *   something this tool doesn't manage (see
 *   timer_dma_lookup.js's parseReservedDmaStreams) -- e.g. "DMA1 Stream 3".
 *   Never offered to any feature, and never stealable regardless of
 *   priority.
 * @returns {Object.<string, DmaAllocationResult>} keyed by feature.
 */
export function allocateDma(timerRows, reservedStreams = new Set()) {
  // stream -> the feature type (or RESERVED_CLAIMANT) that currently
  // holds it, so a later high-priority feature can tell whether it's
  // worth taking.
  const claimedBy = new Map();
  for (const stream of reservedStreams) {
    claimedBy.set(stream, RESERVED_CLAIMANT);
  }

  const results = {};

  for (const row of timerRows) {
    if (!row.chosen) {
      results[row.feature] = { dmaOptions: [], selectedDMAIndex: -1, dmaInfo: null };
      continue;
    }

    // A servo or frequency input never actually uses DMA regardless
    // of its timer choice (see feature_classifier.js's
    // featureNeedsDma) -- report its options for reference, but never
    // claim a stream for it, so it can neither be flagged as clashing
    // over DMA nor block a motor/LED feature that actually needs one.
    if (!row.needsDma) {
      results[row.feature] = {
        dmaOptions: row.chosen.dma,
        selectedDMAIndex: -1,
        dmaInfo: null,
      };
      continue;
    }

    const dmaOptions = row.chosen.dma;
    const isHigh = HIGH_DMA_PRIORITY_TYPES.has(classifyFeature(row.feature));

    // Prefer the first free choice; failing that, a high-priority
    // feature may take the first choice held by a low-priority one --
    // but never one held by something outside this tool's control.
    let best = -1;
    for (let i = 0; i < dmaOptions.length; i++) {
      const key = dmaOptions[i].stream;
      const takenByType = claimedBy.get(key);

      if (!takenByType) {
        if (best === -1) best = i;
        continue;
      }
      if (
        isHigh &&
        takenByType !== RESERVED_CLAIMANT &&
        !HIGH_DMA_PRIORITY_TYPES.has(takenByType) &&
        best === -1
      ) {
        best = i;
      }
    }

    // Every option is already held by something this feature isn't
    // allowed to take (another high-priority feature, or something
    // reserved outside this tool's control) -- rather than leaving
    // this feature with no DMA at all, force its first option anyway.
    // Downstream code (see timer_dma_reconciler.js's
    // buildTimerDmaCommands) is responsible for noticing the
    // resulting stream collision and refusing to actually send it,
    // the same reasoning timer_allocator.js's pickBestOption follows
    // for the equivalent timer case.
    if (best === -1 && dmaOptions.length > 0) {
      best = 0;
    }

    if (best >= 0) {
      claimedBy.set(dmaOptions[best].stream, classifyFeature(row.feature));
    }

    results[row.feature] = {
      dmaOptions,
      selectedDMAIndex: best,
      dmaInfo: best >= 0 ? dmaOptions[best] : null,
    };
  }

  return results;
}

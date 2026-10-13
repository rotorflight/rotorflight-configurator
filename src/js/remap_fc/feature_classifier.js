/**
 * File: src/js/remap_fc/feature_classifier.js
 * Classifies a remap_table.js option key (e.g. "M1", "S3", "Freq2",
 * "LED") into the broad feature type the timer/DMA allocators reason
 * about, and defines the groups of options that prefer to share a
 * timer base with each other.
 */

const MOTOR_RE = /^M[1-4]$/;
const SERVO_RE = /^S[1-8]$/;
const FREQ_RE = /^Freq\d+$/;

/**
 * Classifies an option key into "motor", "servo", "freq", "led", or
 * "other" -- the categories the timer allocator's base-exclusivity and
 * critical-base rules are keyed on.
 * @param {string} optionKey
 * @returns {"motor"|"servo"|"freq"|"led"|"other"}
 */
export function classifyFeature(optionKey) {
  if (MOTOR_RE.test(optionKey)) return "motor";
  if (SERVO_RE.test(optionKey)) return "servo";
  if (FREQ_RE.test(optionKey)) return "freq";
  if (optionKey === "LED") return "led";
  return "other";
}

// Groups that prefer to share a common timer base with unique
// channels on it, tried together before falling back to allocating
// their members individually. See timer_allocator.js's tryGroup.
export const SERVO_GROUP = ["S1", "S2", "S3"];
export const MOTOR_GROUP = ["M1", "M2", "M3", "M4"];

// Feature types whose DMA claim takes priority over every other type
// when two features want the same DMA stream/channel -- motors and
// the LED strip are the outputs most sensitive to DMA contention (a
// stolen stream shows up as glitching/dropped frames), so they're
// allowed to take a stream/channel a lower-priority feature (e.g. a
// servo or frequency input) already claimed. See dma_allocator.js.
export const HIGH_DMA_PRIORITY_TYPES = new Set(["motor", "led"]);

// Feature types this tool actually tracks or claims DMA for at all. A
// motor output's real protocol (PWM vs DSHOT) isn't known at this
// stage of setup -- MSP_MOTOR_CONFIG isn't even fetched here -- so
// every motor is conservatively assumed to need DMA, the same as the
// LED strip always genuinely does. A servo is always plain PWM and a
// frequency input is plain input capture, so neither ever uses DMA
// regardless of any other setting: this tool never claims one for
// them, and never treats a DMA index either happens to still report
// (leftover from a previous configuration, say) as a real clash. See
// timer_dma_reconciler.js's buildFeatureRows and dma_allocator.js's
// allocateDma, the two places this actually matters.
export const DMA_MANAGED_TYPES = new Set(["motor", "led"]);

/**
 * Whether this tool should track/claim DMA for this feature at all --
 * see DMA_MANAGED_TYPES.
 * @param {string} optionKey
 * @returns {boolean}
 */
export function featureNeedsDma(optionKey) {
  return DMA_MANAGED_TYPES.has(classifyFeature(optionKey));
}

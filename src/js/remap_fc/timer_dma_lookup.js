/**
 * File: src/js/remap_fc/timer_dma_lookup.js
 * Looks up the timer/DMA options a given MCU reports for a given pin
 * (from MCU-all.json), and normalises each option into the shape the
 * timer/DMA allocators need to reason about: a timer's base (e.g.
 * "TIM3" from "TIM3 CH1"), its channel, whether it's a negative
 * channel, and its DMA choices split into stream/channel pairs.
 */

/**
 * @typedef {Object} DmaChoice
 * @property {number} index - This DMA choice's position in the pin's
 *   own DMA list for this timer/AF -- the CLI's `dma pin <PIN>
 *   <INDEX>` command refers to a pin by this ordinal, not by stream
 *   name, so it must be preserved even after the list is filtered.
 * @property {string} stream - e.g. "DMA1 Stream 5".
 * @property {string} channel - e.g. "3".
 */

/**
 * @typedef {Object} TimerOption
 * @property {string} timer - Full timer+channel, e.g. "TIM3 CH1N".
 * @property {string} af - The alternate-function name, e.g. "AF2".
 * @property {?string} base - The timer base, e.g. "TIM3", or null if
 *   `timer` couldn't be parsed.
 * @property {?string} channel - The channel suffix, e.g. "CH1N".
 * @property {boolean} negative - Whether this is a negative ("N")
 *   channel.
 * @property {DmaChoice[]} dma
 */

// A timer string like "TIM3 CH1N" -> base "TIM3": strip the channel
// suffix, keeping the "N" as part of it so isNegativeTimer can still
// see it on the raw string.
function timerBase(timer) {
  if (!timer) return null;
  return timer.split(" ")[0] || null;
}

function timerChannel(timer) {
  if (!timer) return null;
  return timer.split(" ")[1] || null;
}

function isNegativeTimer(timer) {
  return /N$/.test(timer ?? "");
}

// Splits a raw DMA string like "DMA1 Stream 5 Channel 3" into its
// stream ("DMA1 Stream 5") and channel ("3"), keeping the option's
// index in the source array so it can still be referred back to by
// `dma pin <PIN> <INDEX>` after any later filtering.
function parseDmaChoices(rawDma) {
  return (rawDma ?? []).map((entry, index) => {
    const parts = entry.split(" ");
    return {
      index,
      stream: `${parts[0]} ${parts[1]} ${parts[2]}`,
      channel: parts[4],
    };
  });
}

// Some flight controller firmware builds report a specific silicon
// variant in `dump hardware`'s own version banner (e.g. "STM32F405")
// rather than the shared family name MCU-all.json actually keys its
// pin data under (e.g. "STM32F40X" -- ST's own reference manual
// groups F405/F407/F415/F417 as one family sharing an identical
// peripheral/AF layout, so Betaflight/Rotorflight's resource tables
// are built once per family, not once per exact chip). Confirmed
// against a MATEKF405TE's own `dump hardware` -- its reported "timer
// C09 AF3" (TIM8 CH4) matches MCU-all.json's STM32F40X entry for C09
// exactly. Add an entry here whenever a new board's dump reports a
// raw MCU string MCU-all.json has no exact key for, once its correct
// family has been confirmed the same way against MCU-all.json's own
// pin data for that board -- never guessed ahead of an actual report.
const MCU_ALIASES = {
  STM32F405: "STM32F40X",
};

// Resolves a raw reported MCU string to whichever MCU-all.json key
// actually has data for it -- the exact string first (true for every
// MCU family MCU-all.json was generated with a matching key for, e.g.
// "STM32F7X2"), falling back to MCU_ALIASES for a known family alias.
function resolveMcuKey(mcuAllData, mcuType) {
  if (mcuAllData?.[mcuType]) return mcuType;
  return MCU_ALIASES[mcuType] ?? mcuType;
}

/**
 * Whether MCU-all.json has real timer/DMA data for the given reported
 * MCU string, once resolved through MCU_ALIASES. False for a genuinely
 * unrecognised MCU -- getPinTimerOptions would otherwise return []
 * for every pin silently, with nothing telling the user why timer/DMA
 * can never be resolved.
 * @param {Object} mcuAllData
 * @param {?string} mcuType
 * @returns {boolean}
 */
export function isMcuSupported(mcuAllData, mcuType) {
  if (!mcuType) return false;
  return Boolean(mcuAllData?.[resolveMcuKey(mcuAllData, mcuType)]);
}

/**
 * Returns every timer option MCU-all.json reports for the given pin
 * on the given MCU, normalised for the allocators. Empty if the MCU
 * or pin isn't known, or the pin has no timer options at all.
 * @param {Object} mcuAllData - The parsed contents of MCU-all.json.
 * @param {?string} mcuType - e.g. "STM32F7X2" -- see resolveMcuKey for
 *   when this isn't already one of MCU-all.json's own top-level keys.
 * @param {string} pin - e.g. "A02".
 * @returns {TimerOption[]}
 */
export function getPinTimerOptions(mcuAllData, mcuType, pin) {
  const resolvedMcu = resolveMcuKey(mcuAllData, mcuType);
  const entries = mcuAllData?.[resolvedMcu]?.pins?.[pin]?.timers ?? [];

  return entries.map((entry) => ({
    timer: entry.timer,
    af: entry.af ?? null,
    base: timerBase(entry.timer),
    channel: timerChannel(entry.timer),
    negative: isNegativeTimer(entry.timer),
    dma: parseDmaChoices(entry.dma),
  }));
}

// Line format of the CLI's `dma show`, e.g.:
//   DMA1 Stream 3: SPI_MISO 2
//   DMA2 Stream 0: ADC
//   DMA1 Stream 6: FREE
const DMA_SHOW_LINE_RE = /^(DMA\d+ Stream \d+):\s*(\S.*)$/;

// Claim prefixes this tool itself manages -- a stream reported against
// one of these just reflects a resource/timer/DMA choice this tool
// already made (or is about to re-derive), not a foreign claim to
// avoid.
const OWN_CLAIM_PREFIXES = ["MOTOR", "SERVO", "FREQ", "LED_STRIP"];

/**
 * Parses the CLI's `dma show` output into the set of DMA streams
 * already claimed by something this tool has no control over -- SPI
 * buses (the gyro/flash), the battery/current ADC, and any other
 * fixed peripheral wiring. These must never be offered to a motor/
 * servo/freq/LED feature: unlike this tool's own claims, which can be
 * freely reallocated among themselves, stealing one of these would
 * silently corrupt whatever that peripheral is (a glitching gyro read,
 * a corrupted flash write), not just free up a spare stream.
 * @param {string} dmaShowText
 * @returns {Set<string>} stream names, e.g. "DMA1 Stream 3".
 */
export function parseReservedDmaStreams(dmaShowText) {
  const reserved = new Set();

  for (const rawLine of dmaShowText.split(/\r?\n/)) {
    const match = rawLine.trim().match(DMA_SHOW_LINE_RE);
    if (!match) continue;

    const [, stream, claim] = match;
    const claimUpper = claim.toUpperCase();
    if (claimUpper === "FREE") continue;
    if (OWN_CLAIM_PREFIXES.some((prefix) => claimUpper.startsWith(prefix))) continue;

    reserved.add(stream);
  }

  return reserved;
}

// Line formats of the CLI's `timer show`, e.g.:
//   TIM1:
//       CH2 : MOTOR 1
//   TIM4: FREE
// A base with any claim at all is printed as a bare "TIMx:" header
// followed by one indented "CHn : CLAIM" line per claimed channel; a
// base with nothing claimed on it at all is printed as a single
// "TIMx: FREE" line instead, with no channel lines to follow.
const TIMER_BASE_LINE_RE = /^(TIM\d+):\s*(FREE)?$/;
const TIMER_CHANNEL_LINE_RE = /^CH(\d+)\s*:\s*(\S.*)$/;

/**
 * Parses the CLI's `timer show` output into the set of full
 * timer+channel combinations (e.g. "TIM11 CH1") already claimed by
 * something outside this tool's control -- the gyro's clock/sync
 * signal, a hardware PPM input, and the like. These must never be
 * offered to a motor/servo/freq/LED feature, the same as a reserved
 * DMA stream (see parseReservedDmaStreams) -- stealing one wouldn't
 * free up a spare timer channel, it would silently break whatever
 * that peripheral is.
 * @param {string} timerShowText
 * @returns {Set<string>} full timer+channel strings, e.g. "TIM11 CH1".
 */
export function parseReservedTimers(timerShowText) {
  const reserved = new Set();
  let currentBase = null;

  for (const rawLine of timerShowText.split(/\r?\n/)) {
    const line = rawLine.trim();

    const baseMatch = line.match(TIMER_BASE_LINE_RE);
    if (baseMatch) {
      // A bare "TIMx:" header starts a run of channel-claim lines to
      // track; "TIMx: FREE" has none, so there's nothing to track
      // until the next header.
      currentBase = baseMatch[2] ? null : baseMatch[1];
      continue;
    }

    if (!currentBase) continue;
    const channelMatch = line.match(TIMER_CHANNEL_LINE_RE);
    if (!channelMatch) continue;

    const [, channelNum, claim] = channelMatch;
    const claimUpper = claim.toUpperCase();
    if (OWN_CLAIM_PREFIXES.some((prefix) => claimUpper.startsWith(prefix))) continue;

    reserved.add(`${currentBase} CH${channelNum}`);
  }

  return reserved;
}

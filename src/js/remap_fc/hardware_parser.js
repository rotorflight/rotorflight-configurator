/**
 * File: src/js/remap_fc/hardware_parser.js
 * Parses the text output of the flight controller's `dump hardware`
 * CLI command into a structured map of resource-to-pin assignments.
 */

/**
 * @typedef {Object} HardwareResource
 * @property {string} pin - The pin the resource is assigned to (e.g. "A08").
 * @property {string} [timer] - The timer alternate function assigned to the pin (e.g. "AF2"), if any.
 * @property {string} [dma] - The DMA stream/channel index assigned to the pin, if any.
 */

/**
 * @typedef {Object.<string, HardwareResource>} HardwareMap
 * Maps a hardware resource key (e.g. "M1", "S3", "RX1", "SDA2",
 * "Freq2", "LED") to its assigned pin and that pin's timer/DMA
 * configuration. Only resources that are actually assigned a pin are
 * present as keys.
 */

// Maps a `resource` command's tag (as it appears in `dump hardware`
// output, e.g. `resource MOTOR 1 A08`) to the prefix used for the key
// in the parsed HardwareMap (e.g. "M1").
const RESOURCE_KEY_PREFIXES = {
  MOTOR: "M",
  SERVO: "S",
  SERIAL_RX: "RX",
  SERIAL_TX: "TX",
  I2C_SDA: "SDA",
  I2C_SCL: "SCL",
  LED_STRIP: "LED",
  FREQ: "Freq",
};

// Inverse of RESOURCE_KEY_PREFIXES: maps a HardwareMap key's prefix
// back to the CLI resource tag used in a `resource <TAG> <index> <PIN>`
// command, for reconstructing commands from a key (see
// buildResourceCommand below).
const RESOURCE_TAGS_BY_PREFIX = Object.fromEntries(
  Object.entries(RESOURCE_KEY_PREFIXES).map(([tag, prefix]) => [prefix, tag]),
);

// Line formats to match in `dump hardware` output, e.g.:
//   resource MOTOR 1 A08
//   timer A08 AF1
//   dma pin A08 0
const RESOURCE_LINE_RE = /^resource\s+(\w+)\s+(\d+)\s+(\S+)$/i;
const TIMER_LINE_RE = /^timer\s+(\S+)\s+(\S+)$/i;
const DMA_LINE_RE = /^dma\s+pin\s+(\S+)\s+(\S+)$/i;

// parsePinMetadata builds a pin -> {timer, dma} lookup from the
// `timer <pin> <af>` and `dma pin <pin> <index>` lines in a
// `dump hardware`, since timer/DMA assignments are reported per pin
// rather than per resource.
function parsePinMetadata(dumpText) {
  const pinMetadata = {};

  // Walk every line once, checking it against both the timer and DMA
  // patterns and merging whichever matches into that pin's entry.
  for (const rawLine of dumpText.split(/\r?\n/)) {
    const line = rawLine.trim();

    // Timer line: record the AF assigned to this pin, if any.
    const timerMatch = line.match(TIMER_LINE_RE);
    if (timerMatch) {
      const [, pin, af] = timerMatch;
      if (af.toUpperCase() === "NONE") continue;
      const key = pin.toUpperCase();
      pinMetadata[key] = { ...pinMetadata[key], timer: af.toUpperCase() };
      continue;
    }

    // DMA line: record the DMA stream/channel assigned to this pin, if any.
    const dmaMatch = line.match(DMA_LINE_RE);
    if (dmaMatch) {
      const [, pin, dma] = dmaMatch;
      if (dma.toUpperCase() === "NONE") continue;
      const key = pin.toUpperCase();
      pinMetadata[key] = { ...pinMetadata[key], dma };
    }
  }

  return pinMetadata;
}

// Matches the MCU family name (e.g. "STM32F7X2") as it appears in the
// version banner near the top of a `dump hardware`, e.g.:
//   # Rotorflight / STM32F7X2 (S7X2) 4.6.0-0.0.10 ...
// in the same naming used as the top-level keys of MCU-all.json.
const MCU_TYPE_RE = /STM32[A-Z0-9]+/i;

/**
 * Parses the flight controller's MCU type (e.g. "STM32F7X2") out of a
 * `dump hardware` CLI command's output. The dump's own first line is
 * just the echoed command, so this scans for the pattern rather than
 * assuming a fixed line position.
 * @param {string} dumpText
 * @returns {?string}
 */
export function parseMcuType(dumpText) {
  for (const rawLine of dumpText.split(/\r?\n/)) {
    const match = rawLine.match(MCU_TYPE_RE);
    if (match) return match[0].toUpperCase();
  }
  return null;
}

/**
 * Parses the text output of a `dump hardware` CLI command into a
 * HardwareMap of configured resources, each enriched with its pin's
 * timer and DMA assignment (if any).
 * @param {string} dumpText
 * @returns {HardwareMap}
 */
export function parseHardwareDump(dumpText) {
  // Build the pin -> {timer, dma} lookup first so it's ready to join
  // against each resource line below.
  const pinMetadata = parsePinMetadata(dumpText);
  const hardware = {};

  // Walk every `resource` line, skip unassigned/unrecognized ones, and
  // enrich each configured resource with its pin's timer/DMA metadata.
  for (const rawLine of dumpText.split(/\r?\n/)) {
    const match = rawLine.trim().match(RESOURCE_LINE_RE);
    if (!match) continue;

    const [, tag, index, rawPin] = match;
    if (rawPin.toUpperCase() === "NONE") continue;

    const prefix = RESOURCE_KEY_PREFIXES[tag.toUpperCase()];
    if (!prefix) continue;

    // LED is a single resource (the LED strip pin), so it has no
    // per-index suffix unlike the other resource types.
    const key = prefix === "LED" ? "LED" : `${prefix}${index}`;
    const pin = rawPin.toUpperCase();
    const meta = pinMetadata[pin] ?? {};

    hardware[key] = {
      pin,
      ...(meta.timer !== undefined ? { timer: meta.timer } : {}),
      ...(meta.dma !== undefined ? { dma: meta.dma } : {}),
    };
  }

  return hardware;
}

// Splits a HardwareMap key like "M1" or "Freq2" into its letter prefix
// and numeric index; "LED" has no index of its own (see
// parseHardwareDump), so it's special-cased to the CLI's own fixed
// index of 1 for that resource.
const OPTION_KEY_RE = /^([A-Za-z]+)(\d+)$/;

/**
 * Builds the `resource <TAG> <index> <PIN>` CLI command that assigns
 * (or, when pin is null/undefined, frees) the given HardwareMap option
 * key — the inverse of parseHardwareDump's per-line parsing.
 * @param {string} optionKey e.g. "M1", "Freq2", "LED"
 * @param {?string} pin e.g. "A08", or null/undefined to free the resource
 * @returns {string}
 */
export function buildResourceCommand(optionKey, pin) {
  let tag;
  let index;

  if (optionKey === "LED") {
    tag = RESOURCE_TAGS_BY_PREFIX["LED"];
    index = 1;
  } else {
    const match = optionKey.match(OPTION_KEY_RE);
    if (!match) {
      throw new Error(`Unrecognized option key: ${optionKey}`);
    }
    const [, prefix, indexStr] = match;
    tag = RESOURCE_TAGS_BY_PREFIX[prefix];
    if (!tag) {
      throw new Error(`Unrecognized option key prefix: ${prefix}`);
    }
    index = indexStr;
  }

  // The flight controller's own dumps write this sentinel in uppercase
  // (e.g. "resource MOTOR 3 NONE") -- match that exactly rather than
  // relying on the firmware's CLI parser being case-insensitive about
  // its own commands.
  return `resource ${tag} ${index} ${pin ?? "NONE"}`;
}

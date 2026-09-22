/**
 * File: src/js/remap_fc/reference_design_labels.js
 * Builds a pin -> friendly label lookup from reference_designs.json
 * and manufacturer_designs.json, for whichever entry (or entries)
 * match the connected board, so the remap table and "+ Add" can show
 * the board's own silkscreen naming (e.g. "ESC", "TAIL", "Port A Rx")
 * alongside the CLI's own MOTOR/SERVO/SERIAL_RX numbering. Also exports
 * expandOptionName, a reference-design-independent fallback that
 * spells out an option key's own CLI shorthand (e.g. "S1" -> "Servo 1")
 * for anything neither file covers at all -- the final, generic level
 * of this three-level chain, used by RemapFc.svelte's displayName once
 * this file's own lookup below has nothing for a given pin.
 *
 * The two files are looked up differently (see findUsages) and then
 * merged, manufacturer data taking priority: manufacturer_designs.json
 * is matched by the board's own reported name (FC.CONFIG.boardName),
 * case-insensitively and as a *prefix* rather than requiring an exact
 * match -- a manufacturer's own boardName routinely carries extra
 * trailing detail no product-line key should have to enumerate, e.g.
 * "FLYDRAGON_PRO42688" (the trailing digits are a specific
 * MCU/revision code) still matches a "FLYDRAGON_PRO" entry.
 * reference_designs.json is matched by design *family* instead -- the
 * first three characters of FC.CONFIG.boardDesign (e.g. "F7A1" ->
 * "F7A") -- since an official Rotorflight reference design is shared
 * by several board models, not one specific boardName.
 *
 * Merging rather than picking one exclusively matters for a board like
 * VANTAC_RF007 or the NEXUS_X/XR/F7 family: these are real official
 * F7A/F7B/F7C reference-design boards, so reference_designs.json
 * already has their *complete* pin picture (including reserved
 * gyro/baro/flash pins manufacturer_designs.json was never meant to
 * repeat) -- their own manufacturer_designs.json entry exists purely
 * to give buildDesignOrder their real physical silkscreen order, and
 * deliberately only lists their named connectors. If manufacturer data
 * won outright instead of merging, those boards would silently lose
 * reserved-pin protection on every pin their (intentionally partial)
 * manufacturer entry doesn't mention.
 */

// Design family: a board design's first three characters, e.g. "F7A1"
// -> "F7A", "F7C5" -> "F7C". null for a board with no boardDesign at
// all (an undocumented target, or one -- like a manufacturer's own
// custom layout -- that was simply never assigned one).
function designFamily(boardDesign) {
  return boardDesign ? boardDesign.slice(0, 3) : null;
}

// The design-family half of findUsages below -- an official
// Rotorflight reference design, shared by several board models.
function findUsagesByFamily(referenceDesigns, boardDesign) {
  const family = designFamily(boardDesign);
  return family && referenceDesigns?.[family] ? referenceDesigns[family] : null;
}

// The board-name half of findUsages below -- a manufacturer's own
// custom design, documented under its own boardName rather than a
// shared family (see this file's own header comment for the prefix
// matching rule). Exported separately from findUsages, rather than
// folded into it as a private detail, because buildDesignOrder below
// deliberately only ever consults *this* half: reordering the FC
// Label column to match a manufacturer's own physical pin layout only
// makes sense for a manufacturer's own design, not an official
// Rotorflight reference design's -- F7A/F7B/F7C's own usage order is
// just upstream MCU-Pin-Allocation-table extraction order, with no
// intentional display sequence to preserve, and reordering by it would
// make those boards worse, not better.
/**
 * @param {Object} referenceDesigns - The parsed contents of reference_designs.json (merged with manufacturer_designs.json).
 * @param {?string} boardName - e.g. "FLYDRAGON_PRO42688", from FC.CONFIG.boardName.
 * @returns {?Object} The matched entry's usages object, or null if no manufacturer design's key is a case-insensitive prefix of boardName.
 */
export function findUsagesByName(referenceDesigns, boardName) {
  if (!referenceDesigns || !boardName) return null;
  const lowerName = boardName.toLowerCase();

  // More than one key can legitimately prefix-match the same
  // boardName -- "NEXUS_X" and "NEXUS_XR" are both real, separately
  // documented entries, and "nexus_xr" starts with both. Taking
  // whichever matched first in object iteration order (as this used
  // to) would resolve NEXUS_XR to NEXUS_X's entry purely by luck of
  // key insertion order, silently losing everything NEXUS_XR's own
  // entry documents that NEXUS_X's doesn't. The longest matching key
  // is always the more specific one, so it wins.
  const nameKey = Object.keys(referenceDesigns)
    .filter((key) => lowerName.startsWith(key.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  return nameKey ? referenceDesigns[nameKey] : null;
}

// Resolves the connected board's full usages picture -- see this
// file's own header comment for how the two sources are matched and
// why they're merged rather than one exclusively replacing the other.
// Manufacturer data is spread last, so a usage name it also documents
// overrides the reference design's own entry for that name outright
// (a genuine pin/wiring difference, not just a display-order
// preference -- that's buildDesignOrder's own, separate concern); a
// usage name only the manufacturer documents (e.g. VANTAC_RF007's own
// board-specific naming) is simply added; and a usage name only the
// reference design documents (every reserved gyro/baro/flash pin a
// manufacturer entry never repeats) is left untouched. null only when
// neither source matched at all.
function findUsages(referenceDesigns, boardDesign, boardName) {
  const familyUsages = findUsagesByFamily(referenceDesigns, boardDesign);
  const nameUsages = findUsagesByName(referenceDesigns, boardName);
  if (!familyUsages && !nameUsages) return null;
  return { ...familyUsages, ...nameUsages };
}

// Converts a reference design's own pin spelling ("PA9", "PC12") to
// the zero-padded form used throughout this tool's own HardwareMap
// pins ("A09", "C12").
function normalizePin(pin) {
  const match = pin.match(/^P([A-Z])(\d+)$/);
  if (!match) return pin;
  const [, letter, number] = match;
  return `${letter}${number.padStart(2, "0")}`;
}

// A multi-pin usage (e.g. "Port A": [TX4, RX4]) needs each of its own
// pins told apart from each other -- inferred from whichever of TX/RX
// leads that pin's own "function" column (e.g. "TX4 / T5CH1" -> "Tx",
// "RX3 / SDA2 / T2CH4" -> "Rx"). A usage with only one pin needs no
// such suffix, since there's nothing to disambiguate.
function directionSuffix(usageEntry) {
  if (/^TX/i.test(usageEntry.function)) return "Tx";
  if (/^RX/i.test(usageEntry.function)) return "Rx";
  return null;
}

/**
 * @param {Object} referenceDesigns - The parsed contents of reference_designs.json.
 * @param {?string} boardDesign - e.g. "F7C5", from FC.CONFIG.boardDesign.
 * @param {?string} boardName - e.g. "FLYDRAGON_PRO42688", from FC.CONFIG.boardName
 *   -- merged with, and taking priority over, whatever boardDesign's
 *   own family match finds (see findUsages).
 * @returns {Object.<string, string>} pin (e.g. "A09") -> friendly label (e.g. "ESC", "Port A Rx").
 */
export function buildReferenceLabels(referenceDesigns, boardDesign, boardName) {
  const usages = findUsages(referenceDesigns, boardDesign, boardName);
  if (!usages) return {};

  const labels = {};
  for (const [usageName, entries] of Object.entries(usages)) {
    const multiPin = entries.length > 1;
    for (const entry of entries) {
      const suffix = multiPin ? directionSuffix(entry) : null;
      labels[normalizePin(entry.pin)] = suffix ? `${usageName} ${suffix}` : usageName;
    }
  }
  return labels;
}

// Reference design usages that wire a pin to fixed onboard sensor/
// support hardware rather than a general-purpose, reassignable
// connector -- e.g. the barometer's own I2C bus, or the primary
// gyro's SPI lines. Reassigning one of these through this tool
// wouldn't free up a spare pin, it would silently break whatever
// that sensor is (across F7A/F7B/F7C's own reference designs, this is
// every usage name that isn't a Port/AUX/SBUS/TLM/RPM connector or a
// motor/servo output).
const RESERVED_USAGE_NAMES = new Set([
  "Gyro CS",
  "Gyro SCK",
  "Gyro SDO",
  "Gyro SDI",
  "Gyro INT",
  "Gyro CLK",
  "Acc CS",
  "ACC CS",
  "Acc INT",
  "Compass CS",
  "Compass EXTI",
  "Baro",
  "Flash",
  "Vbat",
  "Vbec (VX)",
  "Vbus (5V)",
  "Ibus",
  "Vext",
  "Buzzer",
  "Beeper",
  "LED Green",
  "LED Red",
  "SDCard CS",
  "SDCard Detect",
  "USB Detect",
]);

/**
 * @param {Object} referenceDesigns - The parsed contents of reference_designs.json.
 * @param {?string} boardDesign - e.g. "F7C5", from FC.CONFIG.boardDesign.
 * @param {?string} boardName - e.g. "FLYDRAGON_PRO42688", from FC.CONFIG.boardName
 *   -- merged with, and taking priority over, whatever boardDesign's
 *   own family match finds (see findUsages).
 * @returns {Set<string>} pins (e.g. "C09") reserved for fixed onboard
 *   sensor/support wiring per the board's reference design -- these
 *   should never be offered for reassignment, and never even show up
 *   in "+ Add" -- there's nothing to discover by clicking one, since
 *   it was never a real, addressable CLI resource in the first place.
 *   See buildHiddenPins below for the manufacturer-flagged equivalent.
 */
export function buildReservedPins(referenceDesigns, boardDesign, boardName) {
  const usages = findUsages(referenceDesigns, boardDesign, boardName);
  if (!usages) return new Set();

  const pins = new Set();
  for (const [usageName, entries] of Object.entries(usages)) {
    if (!RESERVED_USAGE_NAMES.has(usageName)) continue;
    for (const entry of entries) {
      pins.add(normalizePin(entry.pin));
    }
  }
  return pins;
}

/**
 * @param {Object} referenceDesigns - The parsed contents of reference_designs.json.
 * @param {?string} boardDesign - e.g. "F7C5", from FC.CONFIG.boardDesign.
 * @param {?string} boardName - e.g. "FLYDRAGON_PRO42688", from FC.CONFIG.boardName
 *   -- merged with, and taking priority over, whatever boardDesign's
 *   own family match finds (see findUsages).
 * @returns {Set<string>} pins a manufacturer design explicitly marks
 *   `"hide": true` (e.g. Flydragon Pro's Int Rec.Tx/Rx, hard-wired
 *   straight to an onboard receiver with no physical port to connect
 *   anything else to, even though the underlying UART resource is
 *   otherwise a perfectly ordinary, CLI-remappable one). RemapFc.svelte
 *   consults this set for the same two purposes buildReservedPins'
 *   pins are: excluded from "+ Add"/"Other Pins" entirely, and its own
 *   dropdown locked (showing an explanatory message in place of a
 *   choice) on the rare board where the pin is still shown as a
 *   permanent row. Kept as a separate function from buildReservedPins
 *   because the two sets come from different data (fixed reserved
 *   sensor/support usage names vs. a manufacturer's own per-pin flag)
 *   even though callers now treat them identically.
 */
export function buildHiddenPins(referenceDesigns, boardDesign, boardName) {
  const usages = findUsages(referenceDesigns, boardDesign, boardName);
  if (!usages) return new Set();

  const pins = new Set();
  for (const entries of Object.values(usages)) {
    for (const entry of entries) {
      if (entry.hide === true) pins.add(normalizePin(entry.pin));
    }
  }
  return pins;
}

// A usage name that starts with "Port " (e.g. "Port A", "Port C") is a
// generic, unlabelled UART/I2C connector meant for whatever the user
// wants to attach to it -- there's nothing to automatically show until
// something's actually wired there (see RemapFc.svelte's
// setHardware). Every other non-reserved usage a reference design
// documents (AUX, SBUS, TLM, RPM, ...) names a specific, purpose-built
// connector that's worth showing on its own, the same as a
// motor/servo header always is.
function isGenericPortUsage(usageName) {
  return usageName.startsWith("Port ");
}

// A usage entry can opt itself out of automatic-row status with
// `"default": false` (see manufacturer_designs.json's own _file
// comment) -- a pin worth labelling correctly once the user goes
// looking for it via "+ Add" (see buildReferenceLabels, unaffected by
// this), but not one that should clutter the table unasked, the way
// FlyDragon Pro's onboard/internal receiver UART (Int Rec.Tx/Rx) does.
// Checked against every entry, not just the first, so a genuinely
// multi-pin usage only opts out if *none* of its pins want the
// automatic row.
function isOptedOutOfDefault(entries) {
  return entries.every((entry) => entry.default === false);
}

function namedConnectorPinsFromUsages(usages) {
  if (!usages) return new Set();

  const pins = new Set();
  for (const [usageName, entries] of Object.entries(usages)) {
    if (isGenericPortUsage(usageName) || RESERVED_USAGE_NAMES.has(usageName)) continue;
    if (isOptedOutOfDefault(entries)) continue;
    for (const entry of entries) {
      pins.add(normalizePin(entry.pin));
    }
  }
  return pins;
}

/**
 * @param {Object} referenceDesigns - The parsed contents of reference_designs.json.
 * @param {?string} boardDesign - e.g. "F7C5", from FC.CONFIG.boardDesign.
 * @param {?string} boardName - e.g. "FLYDRAGON_PRO42688", from FC.CONFIG.boardName
 *   -- merged with, and taking priority over, whatever boardDesign's
 *   own family match finds (see findUsages).
 * @returns {Set<string>} pins (e.g. "A03") for named, purpose-built
 *   connectors this reference design documents (AUX, SBUS, TLM, RPM,
 *   ...) -- these should always get their own row once the board's
 *   design is known, whether or not anything is currently wired to
 *   them, unlike a generic "Port X" connector, reserved sensor/support
 *   wiring (see buildReservedPins), or a usage explicitly opted out of
 *   this via `"default": false` (see isOptedOutOfDefault) -- one of
 *   those is still labelled correctly via buildReferenceLabels, just
 *   not auto-shown, reachable only through "+ Add" like a plain
 *   UART/I2C pin.
 */
export function buildNamedConnectorPins(referenceDesigns, boardDesign, boardName) {
  return namedConnectorPinsFromUsages(
    findUsages(referenceDesigns, boardDesign, boardName),
  );
}

/**
 * Same as buildNamedConnectorPins, but only ever consults a manufacturer
 * design match (findUsagesByName), never an official reference design's
 * family match. Used by RemapFc.svelte's setHardware to decide which
 * named connectors need its own-defaults fallback (see that function's
 * own comment): an official F7A/F7B/F7C reference design's named
 * connectors are always genuinely populated by real compiled firmware
 * defaults, so a pin with nothing at all assigned there means something
 * else is going on, not the same "physically wired but left
 * unconfigured in this firmware build" situation a manufacturer's own
 * board can have (e.g. Flydragon Pro's AUX).
 * @param {Object} referenceDesigns - The parsed contents of manufacturer_designs.json (merged with reference_designs.json).
 * @param {?string} boardName - e.g. "FLYDRAGON_PRO42688", from FC.CONFIG.boardName.
 * @returns {Set<string>} pins (e.g. "B09") for named connectors a
 *   manufacturer design documents.
 */
export function buildManufacturerNamedConnectorPins(referenceDesigns, boardName) {
  return namedConnectorPinsFromUsages(findUsagesByName(referenceDesigns, boardName));
}

/**
 * The FC Label column's row order. Prefers a board's own manufacturer
 * design (see findUsagesByName) when one exists -- e.g. the Flydragon
 * Pro's silkscreen, top to bottom: TAIL, CH3, CH2, CH1, ESC, RPM, RX2,
 * TX2, AUX -- since that's a deliberately supplied physical layout.
 * Falls back to the matching official Rotorflight reference design's
 * own order (findUsagesByFamily) when a board follows one but has no
 * manufacturer entry of its own: reference_designs.json's own JSON key
 * order is just upstream MCU-Pin-Allocation-table extraction order
 * rather than a deliberately chosen display sequence, but it's still
 * that real board's actual pin layout, and a better default than
 * falling straight through to remap_table.js's own generic OPTION_KEYS
 * order -- used only once neither a manufacturer design nor a
 * reference design family matches at all, or for an option beyond
 * what either one mentions (a beyond-capacity M5+/S9+, say).
 * @param {Object} referenceDesigns - The parsed contents of reference_designs.json (merged with manufacturer_designs.json).
 * @param {?string} boardDesign - e.g. "F7B5", from FC.CONFIG.boardDesign.
 * @param {?string} boardName - e.g. "FLYDRAGON_PRO42688", from FC.CONFIG.boardName.
 * @param {import("./hardware_parser.js").HardwareMap} defaultHardware - This board's own default hardware map, to resolve a pin back to the option key that defaults to it.
 * @returns {?string[]} option keys in display order, or null if neither a manufacturer design nor a reference design family matched at all.
 */
export function buildDesignOrder(referenceDesigns, boardDesign, boardName, defaultHardware) {
  const usages =
    findUsagesByName(referenceDesigns, boardName) ??
    findUsagesByFamily(referenceDesigns, boardDesign);
  if (!usages) return null;

  const pinToOption = {};
  for (const [option, entry] of Object.entries(defaultHardware)) {
    if (entry?.pin !== undefined) pinToOption[entry.pin] = option;
  }

  const order = [];
  for (const entries of Object.values(usages)) {
    for (const entry of entries) {
      const option = pinToOption[normalizePin(entry.pin)];
      if (option && !order.includes(option)) order.push(option);
    }
  }
  return order;
}

// The full word for an option key's own CLI shorthand prefix -- used
// as a fallback name (see expandOptionName) for a board with no
// matching reference design at all, or for an option a documented
// reference design just doesn't happen to cover.
const PREFIX_NAMES = {
  M: "Motor",
  S: "Servo",
  Freq: "Frequency",
  RX: "Serial RX",
  TX: "Serial TX",
  SDA: "I2C SDA",
  SCL: "I2C SCL",
};

const OPTION_KEY_RE = /^([A-Za-z]+)(\d+)$/;

/**
 * Expands a remap_table.js option key's own CLI shorthand into a
 * full, readable name, e.g. "S1" -> "Servo 1", "RX2" -> "Serial RX 2"
 * -- reference-design-independent, so it works the same on any board.
 * Falls back to the key itself for anything unrecognised.
 * @param {string} option
 * @returns {string}
 */
export function expandOptionName(option) {
  if (option === "LED") return "LED Strip";

  const match = option.match(OPTION_KEY_RE);
  if (!match) return option;

  const [, prefix, index] = match;
  const name = PREFIX_NAMES[prefix];
  return name ? `${name} ${index}` : option;
}

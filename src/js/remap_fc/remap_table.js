/**
 * File: src/js/remap_fc/remap_table.js
 * Builds the "Remap FC" comparison table: for a given list of hardware
 * options, shows the pin each one is assigned by default, and which
 * option (if any) currently occupies that same pin. Also works out
 * which default-only options are still free to be added to the table,
 * and diffs an edited working copy back against what was actually read
 * to build the CLI commands needed to apply the changes.
 */

import { buildResourceCommand } from "./hardware_parser.js";

// Rotorflight's own hard limits on how many motor/servo outputs it can
// actually drive (see feature_classifier.js's MOTOR_RE/SERVO_RE, which
// caps classification the same way). A Betaflight-shared target can
// define more -- up to 8 motors, sometimes 12 servos -- surfaced only
// via rotorflight_target_source.js for a board with no
// Rotorflight-specific build of its own, since Rotorflight's own
// `dump hardware` never reports beyond these. A beyond-capacity option
// (e.g. "M5") still gets a normal row (RemapFc.svelte's setHardware)
// so its pin can be repurposed, but must never be *choosable* -- see
// isOverCapacity below.
export const MAX_VALID_MOTORS = 4;
export const MAX_VALID_SERVOS = 8;

const MOTOR_OR_SERVO_INDEX_RE = /^(M|S)(\d+)$/;

/**
 * Whether optionKey names a motor/servo index beyond what Rotorflight
 * can actually use. Used by getRowSelectableOptions to keep such a key
 * from ever being offered as a value, regardless of source -- a
 * namedConnectorKeys caller passes in whatever a reference design
 * documents, which isn't guaranteed to respect Rotorflight's own
 * capacity. Deliberately not applied to row visibility (setHardware)
 * or "+ Add" (getAddableOptions), which still need the row itself to
 * exist so its pin can be reassigned to something valid.
 * @param {string} optionKey - e.g. "M1", "S9".
 * @returns {boolean}
 */
export function isOverCapacity(optionKey) {
  const match = optionKey.match(MOTOR_OR_SERVO_INDEX_RE);
  if (!match) return false;
  const [, prefix, indexStr] = match;
  const index = Number(indexStr);
  return prefix === "M" ? index > MAX_VALID_MOTORS : index > MAX_VALID_SERVOS;
}

/**
 * Whether boardDesign means "no real Rotorflight-specific board design"
 * -- either genuinely absent, or the generic "BTFL" placeholder
 * Rotorflight uses for an unrecognised Betaflight target. Shared by
 * RemapFc.svelte (to decide whether to show a bare, uncased PCB board
 * diagram instead of a real cased one) and remap_fc.js (to decide
 * whether to fetch richer Betaflight-target defaults from
 * rotorflight_target_source.js) -- both need the identical check.
 * @param {?string} boardDesign - e.g. "F7C5", "BTFL", or null/undefined, from FC.CONFIG.boardDesign.
 * @returns {boolean}
 */
export function isGenericBoardDesign(boardDesign) {
  return !boardDesign || boardDesign === "BTFL";
}

const UART_OR_I2C_RE = /^(RX|TX|SDA|SCL)\d+$/;

/**
 * Whether optionKey is a UART (RX/TX) or I2C (SDA/SCL) resource. The
 * board's named connectors -- TLM, SBUS, AUX, ... -- are just labelled
 * UART pins, so they match this too. Such a resource can only ever be
 * mapped to a PWM output (motor/servo/Freq/LED) or back to its own
 * original pin: it must never be moved onto a *different* UART/I2C pin.
 * Swapping two fixed connectors is physically meaningless, and this
 * tool doesn't validate UART/I2C pin capability the way it does
 * timers/DMA, so it would emit a `resource` command for a pin the
 * target may not be able to route that peripheral to at all. See
 * getRowSelectableOptions.
 * @param {string} optionKey - e.g. "RX2", "SDA1".
 * @returns {boolean}
 */
export function isUartOrI2cResource(optionKey) {
  return UART_OR_I2C_RE.test(optionKey);
}

/**
 * @typedef {Object} RemapRow
 * @property {string} option - The resource key, e.g. "M1".
 * @property {?string} defaultPin - The pin that resource is assigned by default, if any.
 * @property {?string} currentOption - The resource key currently occupying defaultPin, if any.
 */

/**
 * @typedef {Object} AddableOption
 * @property {string} option - The resource key, e.g. "M2".
 * @property {string} defaultPin - The pin that resource is assigned by default.
 */

// The narrower set of options whose rows are shown automatically,
// based on what's actually assigned when the FC is read: motors,
// servos, output-frequency groups, and the LED pin. UART/I2C
// resources are deliberately left out here — they shouldn't clutter
// the table just because they happen to be wired — but are still
// reachable via "+ Add" (see OPTION_KEYS below).
export const TABLE_OPTION_KEYS = [
  "M1",
  "M2",
  "M3",
  "M4",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "Freq1",
  "Freq2",
  "Freq3",
  "Freq4",
  "LED",
];

// The full set of options a row can ever be shown for — everything in
// TABLE_OPTION_KEYS plus the UART and I2C resources, which only ever
// appear via an explicit "+ Add" pick. In canonical display order.
// Exported so callers can sort/filter an arbitrary set of option keys
// back into this order, and so "+ Add" can offer the complete list.
//
// M5-M12/S9-S12 go beyond MAX_VALID_MOTORS/MAX_VALID_SERVOS — see
// isOverCapacity's own comment for why a board can still report them
// (via rotorflight_target_source.js) despite Rotorflight itself never
// being able to use them. RX/TX go up to 12 and SDA/SCL up to 4 to
// match the CLI's own resource catalog (`resource SERIAL_RX 12 ...`,
// `resource I2C_SDA 4 ...`), even though only a handful of MCUs — none
// currently supported by Rotorflight — actually wire that
// many UART/I2C instances. Every one of these stays invisible for a
// board that doesn't actually report it — getAddableOptions gates on
// `option in defaultHardware`, and setHardware's own visibleOptions
// computation gates the rest the same way — so this is just here so a
// board that *does* report one isn't silently missing a pin this tool
// can't see or manage.
export const OPTION_KEYS = [
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7",
  "M8",
  "M9",
  "M10",
  "M11",
  "M12",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "S9",
  "S10",
  "S11",
  "S12",
  "Freq1",
  "Freq2",
  "Freq3",
  "Freq4",
  "RX1",
  "RX2",
  "RX3",
  "RX4",
  "RX5",
  "RX6",
  "RX7",
  "RX8",
  "RX9",
  "RX10",
  "RX11",
  "RX12",
  "TX1",
  "TX2",
  "TX3",
  "TX4",
  "TX5",
  "TX6",
  "TX7",
  "TX8",
  "TX9",
  "TX10",
  "TX11",
  "TX12",
  "SDA1",
  "SDA2",
  "SDA3",
  "SDA4",
  "SCL1",
  "SCL2",
  "SCL3",
  "SCL4",
  "LED",
];

/**
 * Builds a row for each of the given options (in the order given),
 * joining each to its default pin and whichever option (if any)
 * currently occupies that same pin.
 * @param {string[]} options
 * @param {import("./hardware_parser.js").HardwareMap} currentHardware
 * @param {import("./hardware_parser.js").HardwareMap} defaultHardware
 * @returns {RemapRow[]}
 */
export function buildRowsForOptions(options, currentHardware, defaultHardware) {
  // For each option, find its default pin, then find whichever
  // current option (if any) now sits on that same pin — that's the
  // "what took this pin's place" join.
  return options.map((option) => {
    const defaultPin = defaultHardware[option]?.pin ?? null;
    const currentOption =
      defaultPin === null
        ? null
        : (Object.keys(currentHardware).find(
            (key) => currentHardware[key].pin === defaultPin,
          ) ?? null);

    return { option, defaultPin, currentOption };
  });
}

// isEligibleToAdd applies the FC's own filling-order rules on top of
// plain availability: motors and servos must be filled in sequence
// (S4 can't be offered until S1-S3 are *all* already configured, same
// for M — checking only the immediate predecessor isn't enough, since
// removing an earlier one, e.g. S2, while S3/S4 stay configured would
// otherwise leave that gap invisible and still let S5 through), and an
// output-frequency group can only be offered once its matching motor
// is (Freq2 needs M2). "Configured" here means either claimed as some
// row's Current Option (e.g. M1 might be configured by having been
// picked as a different pin's occupant — RX1's Current Option, say —
// without M1 ever getting its own dedicated row), or simply having a
// row of its own at all, even an unresolved "Set Option" one — a row
// that exists but hasn't been given a value yet still counts as "this
// slot has been started", which is enough to unblock the next one in
// sequence, depending on what the caller passes in. Anything else
// (LED, UART/I2C) has no such constraint.
function isEligibleToAdd(option, configuredOptions) {
  const match = option.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return true;
  const [, prefix, indexStr] = match;
  const index = Number(indexStr);

  if (prefix === "M" || prefix === "S") {
    for (let i = 1; i < index; i++) {
      if (!configuredOptions.includes(`${prefix}${i}`)) return false;
    }
    return true;
  }

  if (prefix === "Freq") {
    return configuredOptions.includes(`M${index}`);
  }

  return true;
}

/**
 * Finds motors/servos stranded above a gap in their own numbering.
 *
 * isEligibleToAdd above stops a gap being created from below -- S5
 * can't be *assigned* until S1-S4 all are. Nothing stops one being
 * created from above, though: vacating S5 (reassigning its pin to a
 * motor, say) while S6 stays put is an ordinary edit, and leaves a
 * hole the add-side rule would never have allowed.
 *
 * That matters because the firmware doesn't skip the hole, it stops
 * at it. servoInit() walks ioTags from index 0 and breaks on the
 * first unassigned one, then takes servoCount from however far it
 * got -- so a gap at S5 doesn't cost you S5, it costs you S5 and
 * everything above it. Worse, the loss is silent: servoOutput[] is
 * pre-filled with each servo's mid value and the slots past
 * servoCount simply never get written again, so a stranded output
 * reports a steady centre reading exactly like a live one that
 * happens to be centred. Mixer rules pointed at it look fine and do
 * nothing. Motors work the same way (motorInit()/getMotorCount()).
 *
 * @param {string[]} configuredOptions - Option keys currently claimed (e.g. ["M1","S1","S2","S6"]).
 * @returns {{prefix: string, missing: string[], stranded: string[]}[]} One entry per affected prefix, empty when the numbering is contiguous.
 */
export function findSequenceGaps(configuredOptions) {
  const gaps = [];

  for (const prefix of ["M", "S"]) {
    const indices = configuredOptions
      .map((option) => option.match(/^([A-Za-z]+)(\d+)$/))
      .filter((match) => match && match[1] === prefix)
      .map((match) => Number(match[2]));

    if (indices.length === 0) continue;

    const highest = Math.max(...indices);
    const missing = [];

    for (let i = 1; i < highest; i++) {
      if (!indices.includes(i)) missing.push(i);
    }

    if (missing.length === 0) continue;

    // Everything above the *first* hole is what the firmware drops,
    // not just the entries adjacent to it.
    const firstHole = missing[0];

    gaps.push({
      prefix,
      missing: missing.map((i) => `${prefix}${i}`),
      stranded: indices
        .filter((i) => i > firstHole)
        .sort((a, b) => a - b)
        .map((i) => `${prefix}${i}`),
    });
  }

  return gaps;
}

/**
 * Returns the options that could be offered by "+ Add": every option
 * this board's default structure actually reports a pin for — every
 * physical connector this board actually has — except ones already
 * spoken for by a row of their own.
 *
 * Deliberately ignores the FC's filling-order rules (see
 * isEligibleToAdd): "+ Add" only brings a hidden row into view, it
 * doesn't assign anything to it (see handleAddChange — a freshly-added
 * row starts "unset", with no value at all), so it can never create
 * the kind of gap that rule exists to prevent. That constraint is
 * enforced where it actually matters instead: when a value is picked
 * for some row's Current Option (see getRowSelectableOptions). Without
 * this distinction, removing every servo would make it impossible to
 * see S1-S4 (or Freq1) as addable again all at once, even though
 * bringing all four back into view is completely safe — only actually
 * giving one of them a value would need to respect the sequence.
 *
 * Motors, servos, output-frequency groups, and the LED pin (see
 * TABLE_OPTION_KEYS) always have their own row the moment they're
 * eligible (they're only ever removed from the table by being set to
 * "None" — see handleCurrentOptionChange), so a "homeless" one — no
 * longer claimed by anything, e.g. M1's own row got reassigned to
 * something else — never needs offering here: its own row's dropdown
 * already includes it as a choice (see optionsForRow's row.option
 * bypass), so it can always be reclaimed there directly. Offering it
 * here too would just be a second, redundant path to the exact same
 * place — worse, a misleading one, since picking it here is a silent
 * no-op (handleAddChange skips anything already in visibleOptions).
 * So these are only offered once their row has actually been removed
 * entirely (visibleOptions no longer includes them).
 *
 * A UART/I2C resource, on the other hand, is only ever offered as its
 * own row's Current Option (restoring a displaced pad -- see
 * getRowSelectableOptions), never as another row's, so there's no
 * separate reclaim path to worry about — once one has a row, regardless
 * of what that row currently holds, it's fully spoken for and excluded
 * via visibleOptions too, the same as TABLE_OPTION_KEYS options are
 * here.
 * Sorted so a UART/I2C port's two halves sit next to each other --
 * RX5 immediately followed by TX5, SDA2 immediately followed by SCL2
 * -- rather than OPTION_KEYS' own raw order, which lists every RX (or
 * SDA) pin on the whole board in one block and every TX (or SCL) pin
 * in another, regardless of which port each actually belongs to.
 * Motor/servo/freq/LED options are unaffected, keeping OPTION_KEYS'
 * own relative order (and sorting before every UART/I2C option, same
 * as today) -- they're not part of a two-pin port, so there's nothing
 * to group them by.
 * @param {import("./hardware_parser.js").HardwareMap} defaultHardware
 * @param {string[]} visibleOptions - option keys that currently have a row.
 * @returns {AddableOption[]}
 */
export function getAddableOptions(defaultHardware, visibleOptions) {
  return OPTION_KEYS.filter(
    (option) => option in defaultHardware && !visibleOptions.includes(option),
  )
    .map((option) => ({ option, defaultPin: defaultHardware[option].pin }))
    .sort((a, b) => compareBySortKey(portGroupedSortKey(a.option), portGroupedSortKey(b.option)));
}

// A UART/I2C option's own port number and direction rank (RX/SDA
// before TX/SCL) -- see getAddableOptions' own comment for why. Every
// other option key sorts by its own OPTION_KEYS position instead,
// under a bus rank of -1 so it always sorts before any UART/I2C
// option, matching OPTION_KEYS' own existing relative order.
const UART_I2C_BUS_RANK = { RX: 0, TX: 0, SDA: 1, SCL: 1 };
const UART_I2C_DIRECTION_RANK = { RX: 0, TX: 1, SDA: 0, SCL: 1 };
const UART_I2C_OPTION_RE = /^(RX|TX|SDA|SCL)(\d+)$/;

function portGroupedSortKey(option) {
  const match = option.match(UART_I2C_OPTION_RE);
  if (!match) return [-1, OPTION_KEYS.indexOf(option), 0];

  const [, prefix, indexStr] = match;
  return [UART_I2C_BUS_RANK[prefix], Number(indexStr), UART_I2C_DIRECTION_RANK[prefix]];
}

function compareBySortKey(keyA, keyB) {
  for (let i = 0; i < keyA.length; i++) {
    if (keyA[i] !== keyB[i]) return keyA[i] - keyB[i];
  }
  return 0;
}

// A motor/servo/frequency option's own group prefix and numeric index
// -- used by orderFeatureKeys below to work out, per group, whether
// this board's own physical layout numbers that group upward or
// downward as you read down the column. LED has no numeric suffix and
// never groups with anything, so it deliberately doesn't match.
const FEATURE_GROUP_RE = /^(M|S|Freq)(\d+)$/;

function featureGroupPrefix(key) {
  return key.match(FEATURE_GROUP_RE)?.[1] ?? null;
}

function featureGroupIndex(key) {
  const match = key.match(FEATURE_GROUP_RE);
  return match ? Number(match[2]) : null;
}

/**
 * Orders the Feature column's rows to match this board's own physical
 * top-to-bottom layout (see reference_design_labels.js's
 * buildDesignOrder), instead of TABLE_OPTION_KEYS' fixed
 * motors-then-servos-then-freq-then-LED order -- a board like the
 * NEXUS_X, whose real silkscreen reads S1/S2/S3/TAIL(S4)/ESC(M1)/
 * RPM(Freq1) top to bottom, should show its Feature rows in that same
 * interleaved order, not with every motor artificially pulled to the
 * top.
 *
 * designOrder only ever documents a board's *default* named
 * connectors, so a beyond-default member of a numbered group -- an S5
 * added via "+ Add" onto a UART pin, say, on a board whose reference
 * design only ever names S1-S4 -- has no position of its own to fall
 * back on. For those, this infers the group's own counting direction
 * from whichever members designOrder *does* place (does the number
 * increase or decrease as you read down the column?) and inserts the
 * newcomer immediately beyond the group's furthest known member in
 * that same direction, so it reads as a natural continuation rather
 * than always being appended dead last regardless of which way the
 * board actually counts. A group with fewer than two known members --
 * most boards' single default motor is the common case -- has nothing
 * to infer a direction from, so it defaults to increasing (a lone M1
 * assumed to sit at the edge of the column, with any M2/M3 that might
 * later join it continuing downward from there); a group with no known
 * members at all is simply appended in numeric order at the very end.
 * @param {?string[]} designOrder - This board's own physical row order
 *   (see RemapFc.svelte's designOrder), or null for a board matching no
 *   manufacturer or reference design at all.
 * @param {string[]} presentKeys - TABLE_OPTION_KEYS entries that
 *   currently need a Feature row (see RemapFc.svelte's featureRows).
 * @returns {string[]} presentKeys, reordered.
 */
export function orderFeatureKeys(designOrder, presentKeys) {
  const presentSet = new Set(presentKeys);
  if (!designOrder) {
    return TABLE_OPTION_KEYS.filter((key) => presentSet.has(key));
  }

  const result = designOrder.filter((key) => presentSet.has(key));
  const extras = TABLE_OPTION_KEYS.filter(
    (key) => presentSet.has(key) && !result.includes(key),
  );

  const extrasByPrefix = new Map();
  for (const key of extras) {
    const prefix = featureGroupPrefix(key);
    if (!prefix) continue;
    if (!extrasByPrefix.has(prefix)) extrasByPrefix.set(prefix, []);
    extrasByPrefix.get(prefix).push(key);
  }

  for (const [prefix, group] of extrasByPrefix) {
    const known = result
      .map((key, pos) => ({ key, pos, index: featureGroupIndex(key) }))
      .filter((entry) => featureGroupPrefix(entry.key) === prefix);

    if (known.length === 0) {
      result.push(...group.sort((a, b) => featureGroupIndex(a) - featureGroupIndex(b)));
      continue;
    }

    const increasing = known.length < 2 || known[known.length - 1].index >= known[0].index;
    group.sort((a, b) =>
      increasing
        ? featureGroupIndex(a) - featureGroupIndex(b)
        : featureGroupIndex(b) - featureGroupIndex(a),
    );

    const anchor = increasing ? known[known.length - 1] : known[0];
    const insertAt = increasing ? anchor.pos + 1 : anchor.pos;
    result.splice(insertAt, 0, ...group);
  }

  // Anything present but neither placed by designOrder nor grouped
  // above (LED has no numeric suffix to group by, so a LED pin
  // designOrder doesn't document falls through to here) -- appended in
  // TABLE_OPTION_KEYS' own relative order, same as the no-designOrder
  // fallback.
  const placed = new Set(result);
  const leftover = TABLE_OPTION_KEYS.filter((key) => presentSet.has(key) && !placed.has(key));
  result.push(...leftover);

  return result;
}

/**
 * Returns the options that could be assigned as a row's Current
 * Option: the FC's own fixed PWM features — motors, servos,
 * output-frequency groups, and the LED pin (see TABLE_OPTION_KEYS) —
 * that aren't already claimed by some row and that pass the FC's
 * filling-order rules (see isEligibleToAdd) so gaps can't be created
 * (e.g. S3 can't be picked unless S1 and S2 are already claimed).
 *
 * The UART/I2C rule (see isUartOrI2cResource): a UART or I2C resource
 * is NEVER offered as a selectable option in any row -- not another
 * row's (moving SERIAL_RX 2 onto a servo pad is meaningless, and this
 * tool doesn't validate UART/I2C pin capability), and not even a
 * board-named connector's (TLM/SBUS/AUX are just labelled UART pins).
 * The one exception is a UART/I2C row's own original resource, so a
 * labelled pad a remap displaced -- "Port C Tx" now holding a servo --
 * can be restored. Everything else UART/I2C is reachable only via
 * "+ Add", which brings the pad's row back so a PWM feature can take
 * it or its own resource can be restored.
 *
 * Deliberately uses claimedOptions rather than the broader
 * "configured" notion getAddableOptions uses: a row's own dropdown
 * always includes itself as a choice, so if merely *having a row*
 * counted as satisfying the previous index, a freshly-added, still-
 * unresolved M1 would immediately unlock M2 in its own dropdown — the
 * next one shouldn't become pickable until the previous one has an
 * actual value, not just a row.
 *
 * Unlike getAddableOptions, this deliberately ignores defaultHardware
 * for TABLE_OPTION_KEYS: a row's Current Option is picked from the
 * FC's fixed set of possible options, not from whatever this specific
 * board's default dump happens to report.
 * @param {string} rowOption - the row's own resource key (its labelled
 *   pad's default), e.g. "S4" or "RX2".
 * @param {string[]} claimedOptions - option keys currently claimed as some row's Current Option.
 * @param {boolean} [pinHasTimer] - Whether the row's own pin has *any*
 *   timer option at all (see timer_dma_lookup.js's getPinTimerOptions)
 *   -- every TABLE_OPTION_KEYS candidate (motor/servo/freq/LED) needs
 *   some timer to function at all, so offering one for a pin with none
 *   would let the user pick a value that can never actually work: the
 *   `resource` command sends fine, but the feature has nothing driving
 *   it, a problem no timer/DMA reallocation could ever fix (the pin
 *   itself is the problem). Doesn't affect a UART/I2C row's own
 *   restore-original-resource bypass below, which never needs a timer
 *   regardless. Defaults to true so an existing caller that doesn't
 *   pass it keeps today's behaviour.
 * @param {boolean} [locked] - Whether this row's own pin is
 *   explicitly marked `"hide": true` in a manufacturer design (see
 *   reference_design_labels.js's buildHiddenPins) -- a pin that's a
 *   genuine, otherwise-ordinary CLI resource electrically,
 *   but is hard-wired straight to something onboard with no physical
 *   port to connect anything else to (e.g. Flydragon Pro's Int
 *   Rec.Tx/Rx, wired directly to the onboard receiver). Locked takes
 *   priority over everything else here: nothing is ever offered, not
 *   even the row's own restore-original-resource bypass, since
 *   there's nothing to "restore" a pin like this away from in the
 *   first place. Defaults to false so an existing caller that doesn't
 *   pass it keeps today's behaviour.
 * @returns {string[]}
 */
export function getRowSelectableOptions(
  rowOption,
  claimedOptions,
  pinHasTimer = true,
  locked = false,
) {
  if (locked) return [];

  const pool = isUartOrI2cResource(rowOption)
    ? [...TABLE_OPTION_KEYS, rowOption]
    : TABLE_OPTION_KEYS;

  return pool.filter((option) => {
    // A UART/I2C row always offers its own resource back, so a labelled
    // pad a remap displaced (e.g. "Port C Tx" now holding a servo) can
    // be restored even while that resource sits claimed on some other
    // pin. isEligibleToAdd's filling-order rules only ever apply to
    // M/S/Freq, so this bypass only matters for the restore-your-own-
    // UART case.
    if (option === rowOption && isUartOrI2cResource(rowOption)) return true;

    if (!pinHasTimer) return false;

    return (
      !isOverCapacity(option) &&
      !claimedOptions.includes(option) &&
      isEligibleToAdd(option, claimedOptions)
    );
  });
}

/**
 * Diffs the as-read hardware map against the edited working copy and
 * returns the ordered CLI commands needed to apply the changes to the
 * flight controller.
 *
 * Every affected resource is freed first (`resource <TAG> <index>
 * none`), and only once every removal has been sent does any new/moved
 * assignment go out (`resource <TAG> <index> <PIN>`). Freeing
 * everything before claiming anything means a straight swap between
 * two resources (M1 and S2 trading pins, say) can never try to claim a
 * pin the other side hasn't freed yet, regardless of which one the
 * user happened to edit first.
 * @param {import("./hardware_parser.js").HardwareMap} original - The hardware map as last read from the FC.
 * @param {import("./hardware_parser.js").HardwareMap} working - The edited, in-progress working copy.
 * @returns {string[]}
 */
export function buildChangeCommands(original, working) {
  const removals = [];
  const additions = [];

  const allKeys = new Set([
    ...Object.keys(original),
    ...Object.keys(working),
  ]);

  for (const key of allKeys) {
    const beforePin = original[key]?.pin ?? null;
    const afterPin = working[key]?.pin ?? null;
    if (beforePin === afterPin) continue;

    if (beforePin !== null) removals.push(buildResourceCommand(key, null));
    if (afterPin !== null) additions.push(buildResourceCommand(key, afterPin));
  }

  return [...removals, ...additions];
}

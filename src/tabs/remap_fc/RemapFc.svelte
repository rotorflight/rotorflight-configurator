<script>
  /**
   * File: src/tabs/remap_fc/RemapFc.svelte
   * UI for the "Remap FC" tab: a run button plus a live, editable
   * current-vs-default pin remap table, driven by remap_fc.js via the
   * exported setRunning/setError/setHardware/reset functions. All the
   * table-building and editing logic lives in this component — the
   * tab controller only hands over the raw current/default hardware
   * maps read from the FC.
   */
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { getTabHelpURL } from "@/js/help";
  import { i18n } from "@/js/i18n.js";
  import { classifyFeature } from "@/js/remap_fc/feature_classifier.js";
  import {
    MANUFACTURER_BOARD_COLORS,
    MANUFACTURER_BOARD_NAMES,
    MANUFACTURER_BRAND_IMAGES,
  } from "@/js/remap_fc/manufacturer_branding.js";
  import { findPinConflictSuggestions } from "@/js/remap_fc/pin_conflict_suggestions.js";
  import {
    buildDesignOrder,
    buildHiddenPins,
    buildManufacturerNamedConnectorPins,
    buildNamedConnectorPins,
    buildReferenceLabels,
    buildReservedPins,
    expandOptionName,
  } from "@/js/remap_fc/reference_design_labels.js";
  import {
    loadManufacturerDesigns,
    loadReferenceDesigns,
  } from "@/js/remap_fc/reference_design_source.js";
  import {
    OPTION_KEYS,
    TABLE_OPTION_KEYS,
    buildChangeCommands,
    buildRowsForOptions,
    findSequenceGaps,
    getAddableOptions,
    getRowSelectableOptions,
    isGenericBoardDesign,
    isUartOrI2cResource,
    orderFeatureKeys,
  } from "@/js/remap_fc/remap_table.js";
  import {
    getPinTimerOptions,
    isMcuSupported,
  } from "@/js/remap_fc/timer_dma_lookup.js";
  import { reconcileTimersAndDma } from "@/js/remap_fc/timer_dma_reconciler.js";
  import mcuAllData from "@/tabs/remap_fc/MCU-all.json";
  import manufacturerDesignsLocal from "@/tabs/remap_fc/manufacturer_designs.json";
  import referenceDesignsLocal from "@/tabs/remap_fc/reference_designs.json";

  // Each of referenceDesignsData/manufacturerDesignsData starts as its
  // own bundled copy, then independently replaces itself with the
  // latest version fetched from GitHub (see reference_design_source.js)
  // once that resolves, so a newly documented board -- official or
  // manufacturer-supplied -- doesn't need a new configurator release
  // before it shows up here. referenceDesigns itself just re-merges
  // whichever combination of the two is current, manufacturer data
  // spread last so a (currently never-occurring, but never assumed
  // impossible) key collision between the two files favours the
  // manufacturer's own entry.
  let referenceDesignsData = $state(referenceDesignsLocal);
  let manufacturerDesignsData = $state(manufacturerDesignsLocal);
  let referenceDesigns = $derived({
    ...referenceDesignsData,
    ...manufacturerDesignsData,
  });
  loadReferenceDesigns(referenceDesignsLocal).then((data) => {
    referenceDesignsData = data;
  });
  loadManufacturerDesigns(manufacturerDesignsLocal).then((data) => {
    manufacturerDesignsData = data;
  });

  // Sentinel dropdown value meaning "nothing assigned to this pin" —
  // distinct from the empty placeholder value used by the "+ Add" row.
  const NONE_VALUE = "__none__";

  /**
   * @typedef {Object} Props
   * @property {() => void} onRunClick - Called when the run button is pressed.
   * @property {(commands: string[]) => void} onLoadChanges - Called with the full staged command list (`resource`/`timer`/`dma pin` plus a trailing "save") when "Load Changes" is pressed.
   */
  /** @type {Props} */
  const { onRunClick, onLoadChanges } = $props();

  // --- Local UI state, all driven by remap_fc.js via the exported
  // setters below (this component never fetches anything itself). ---
  let running = $state(false);
  // 0-100 while remap_fc.js's own CliEngine is mid-way through sending
  // back a large batch (currently just the post-read full-config
  // restore, which can run to a couple thousand lines) -- null the
  // rest of the time, including for every other `running` step, which
  // are all fast enough not to need it. Set via setRestoreProgress().
  let restoreProgress = $state(null);
  let error = $state(null);
  // Whether a read has completed — flips the pre-read intro/button
  // over to the board info card and table.
  let hasRead = $state(false);
  // MCU family (e.g. "STM32F7X2"), matching MCU-all.json's top-level
  // keys.
  let mcuType = $state(null);
  // Editable working copy of the current hardware map, staged only
  // until "Load Changes" is pressed.
  /** @type {import("@/js/remap_fc/hardware_parser.js").HardwareMap} */
  let workingCurrent = $state({});
  // Baseline as last read/applied -- workingCurrent is diffed against
  // this to find what actually changed.
  /** @type {import("@/js/remap_fc/hardware_parser.js").HardwareMap} */
  let originalCurrent = $state({});
  // Read-only reference for each option's default pin; never changes
  // after a read. This is the *augmented* map setHardware builds (see
  // its own fallbackAnchors comment) -- rawDefaultHardware below is the
  // one to hand back to setHardware itself (e.g. from
  // handleClearChanges), since feeding this augmented one back in as
  // its own input would make every fallback anchor look
  // already-claimed and silently stop getting recreated.
  /** @type {import("@/js/remap_fc/hardware_parser.js").HardwareMap} */
  let defaultHardware = $state({});
  // The defaultHw setHardware was actually called with, before its own
  // fallback-anchor augmentation -- see defaultHardware's own comment.
  /** @type {import("@/js/remap_fc/hardware_parser.js").HardwareMap} */
  let rawDefaultHardware = $state({});
  // DMA streams claimed outside this tool's control (SPI, ADC, ...),
  // so reallocation never proposes stealing them.
  /** @type {Set<string>} */
  let reservedDmaStreams = $state(new Set());
  // Same idea for timer+channel claims (the gyro's clock/sync, ...).
  /** @type {Set<string>} */
  let reservedTimers = $state(new Set());
  // Each configured servo's own update rate (Hz), from `servo` -- see
  // servo_config_parser.js's parseServoRates. Drives the servo-
  // frequency review card below the table.
  /** @type {Object.<string, number>} */
  let servoRates = $state({});
  // Option keys with a row in the table, seeded on read and grown via
  // "+ Add". Picking "None" removes the row again.
  /** @type {string[]} */
  let visibleOptions = $state([]);
  // Options whose row shows the "Default" placeholder instead of a
  // resolved value.
  /** @type {string[]} */
  let unsetOptions = $state([]);
  // Bound to the "+ Add" dropdown; reset to the placeholder after
  // each selection.
  let selectedAddOption = $state("");
  // Whether "+ Add" is showing its dropdown rather than the button
  // that reveals it.
  let addMenuOpen = $state(false);
  // Option most recently placed via a row's dropdown -- used by the
  // pin-conflict panel to point back at the user's last edit.
  let lastChangedOption = $state(null);
  // Whether the "Calculated config" card is expanded -- collapsed by
  // default, since most users never need it.
  let showCalculatedDetails = $state(false);

  // The FC Label row whose Current Option card is open, by option key
  // -- null while no pin is selected (the card area then shows a
  // placeholder instead of being empty -- see cardRow/the template).
  // Only one open at a time; the card itself lives to the right of the
  // Feature column, not anchored under the button that opened it.
  let openCardOption = $state(null);

  // Which column opened the card: "pin" (an FC Label button) gets the
  // full editing card (pin number, description, the Current Option
  // dropdown); "feature" (a Feature button, on the same underlying pad
  // -- see the template's toggleCard call) is read-only, just the
  // description -- clicking a feature is about learning what it's for,
  // not remapping it, so the pin number and the dropdown (which would
  // let you change what's already showing) don't belong there.
  let openCardSource = $state(null);

  // The actual row the open card should show, if any -- null both
  // before anything's been clicked and if the selected option's row
  // has since disappeared (e.g. set to None while it was open), so the
  // template only needs one placeholder-vs-card branch.
  let cardRow = $derived(
    tableRows.find((row) => row.option === openCardOption) ?? null,
  );

  // Whether MCU-all.json has real timer/DMA data for this board's
  // MCU -- false means pin remapping can't be safely calculated, so
  // the tool shows a warning instead of opening (see the template).
  let mcuSupported = $derived(isMcuSupported(mcuAllData, mcuType));

  // The "Read FC" button's own label: plain while idle, "Reading FC"
  // for the several fast steps that make up most of a read, and (once
  // remap_fc.js's setRestoreProgress reports one) a live percentage
  // for the one step slow enough to actually need it -- replaying the
  // full config backup, which can run to a couple thousand lines. A
  // static "Reading FC" for that whole stretch would look identical to
  // a genuine hang; showing it actually advancing is the difference.
  let runButtonLabel = $derived(
    !running
      ? $i18n.t("remapFcRunButton")
      : restoreProgress != null
        ? $i18n.t("remapFcRunningProgress", {
            percent: Math.round(restoreProgress),
          })
        : $i18n.t("remapFcRunning"),
  );

  // This board's own row order (see buildDesignOrder) -- its
  // manufacturer design's physical pin layout if it has one (e.g. the
  // Flydragon Pro's silkscreen order top to bottom), else its matching
  // official Rotorflight reference design's own order if it follows
  // one. null for a board matching neither, which just means "no
  // override" below.
  let designOrder = $derived(
    buildDesignOrder(
      referenceDesigns,
      FC.CONFIG.boardDesign,
      FC.CONFIG.boardName,
      defaultHardware,
    ),
  );

  // Keep the visible rows in a fixed order, regardless of the order
  // options were added in: this board's own designOrder first if it
  // has one, then remap_table.js's generic OPTION_KEYS order for
  // anything designOrder doesn't cover (or the whole list, for a board
  // with no designOrder at all).
  let orderedVisible = $derived(
    designOrder
      ? [
          ...designOrder.filter((option) => visibleOptions.includes(option)),
          ...OPTION_KEYS.filter(
            (option) =>
              visibleOptions.includes(option) && !designOrder.includes(option),
          ),
        ]
      : OPTION_KEYS.filter((option) => visibleOptions.includes(option)),
  );

  // The rows actually rendered in the FC Label column, recomputed from
  // the (possibly edited) working copy every time it changes.
  let tableRows = $derived(
    buildRowsForOptions(orderedVisible, workingCurrent, defaultHardware),
  );

  // The Feature column: every TABLE_OPTION_KEYS feature currently
  // allocated to some pin, in this board's own physical row order (see
  // orderFeatureKeys) rather than TABLE_OPTION_KEYS' fixed
  // motors-then-servos-then-freq-then-LED order, so a board whose real
  // silkscreen interleaves them (e.g. the NEXUS_X's
  // S1/S2/S3/TAIL/ESC/RPM) shows its Feature rows the same way instead
  // of pulling every motor to the top. A feature with nowhere to point
  // (not in workingCurrent at all) is left out entirely, not just
  // dimmed -- there's no pin for a wire to reach.
  //
  // A pad still holding its own original UART/I2C identity (see the
  // UART/I2C rule -- it can never hold anything else's) gets no Feature
  // entry or wire at all: it isn't "pointing" anywhere interesting. Its
  // FC Label row looks the same as any other configured row -- and its
  // own card explains what "default" means for it (see
  // cardDescription).
  //
  // Filters out a feature with no matching pinRow: that happens when
  // the live config already has this feature CLI-remapped (outside
  // this tool) onto a pin that isn't any resource's own default pin,
  // so no visible FC Label row's defaultPin matches it. There's no row
  // for such a feature's wire to point at, so it's excluded here
  // rather than reaching the template with pinRow: null -- every
  // consumer below (the {#each} key, the wire link lookup, the
  // onclick) dereferences pinRow.option unconditionally.
  let featureRows = $derived(
    orderFeatureKeys(
      designOrder,
      TABLE_OPTION_KEYS.filter((key) => key in workingCurrent),
    )
      .map((key) => ({
        key,
        pinRow: tableRows.find((row) => row.currentOption === key) ?? null,
      }))
      .filter((featureRow) => featureRow.pinRow !== null),
  );

  // One connecting wire per Feature row whose pad still has a row on
  // the FC Label side, expressed as the two columns' own row *indices*
  // (see wireRowHeight/wireY below for how that becomes an actual SVG
  // path) -- both columns render every row at the same height, so the
  // index alone is enough to place it, once that height is known.
  let wireLinks = $derived(
    featureRows
      .map((featureRow, rightIndex) => {
        const leftIndex = tableRows.findIndex(
          (row) => row.option === featureRow.pinRow.option,
        );
        return leftIndex === -1 ? null : { leftIndex, rightIndex };
      })
      .filter((link) => link !== null),
  );

  // Geometry for the wires SVG between the FC Label and Feature
  // columns. wireHeaderHeight/wireRowHeight are measured live from the
  // actual rendered DOM (bind:clientHeight on .column-header and every
  // .pin-row, in the template -- they all share the same fixed CSS
  // height, so whichever one renders last just re-confirms the same
  // value) rather than trusted as fixed constants -- a hardcoded pixel
  // guess here previously drifted out
  // of sync with the real render (most visibly at a non-100% zoom
  // level, where the browser's own subpixel rounding of .pin-row's
  // CSS height isn't guaranteed to match a constant computed assuming
  // exact whole pixels), which showed up as the wires no longer
  // meeting the pins they're supposed to connect to. The *_FALLBACK
  // values only matter for the one frame before the bound elements
  // have actually rendered.
  const WIRE_HEADER_HEIGHT_FALLBACK = 29;
  const WIRE_ROW_HEIGHT_FALLBACK = 33;
  const WIRE_GUTTER_WIDTH = 130;
  let measuredHeaderHeight = $state(0);
  let measuredRowHeight = $state(0);
  let wireHeaderHeight = $derived(
    measuredHeaderHeight || WIRE_HEADER_HEIGHT_FALLBACK,
  );
  let wireRowHeight = $derived(measuredRowHeight || WIRE_ROW_HEIGHT_FALLBACK);
  function wireY(index) {
    return wireHeaderHeight + index * wireRowHeight + wireRowHeight / 2;
  }
  let wireSvgHeight = $derived(
    wireHeaderHeight +
      Math.max(tableRows.length, featureRows.length) * wireRowHeight,
  );
  // A gentle S-curve rather than a straight line, so a long run of
  // same-row (uncrossed) wires still reads clearly instead of a solid
  // horizontal bar; the control points sit at the gutter's own midpoint.
  function wirePath(leftIndex, rightIndex) {
    const y1 = wireY(leftIndex);
    const y2 = wireY(rightIndex);
    const midX = WIRE_GUTTER_WIDTH / 2;
    return `M0,${y1} C${midX},${y1} ${midX},${y2} ${WIRE_GUTTER_WIDTH},${y2}`;
  }

  // Diagram height -- just the row span (wireSvgHeight minus its own
  // header term), since .board-diagram-caption's own height is set
  // inline to wireHeaderHeight too (see the template), the same as
  // .column-header. That's what actually makes the top/bottom insets
  // match: the diagram and the FC Label column both reserve the same
  // header height above their own row span, so lining up wrap-top with
  // row-span-top (via matching row-span *heights*) is enough -- no
  // need to also match the header regions' own heights pixel-for-pixel
  // separately, since they're already forced identical. Clamped to a
  // sensible range. This app's runtime doesn't support CSS
  // aspect-ratio, so deriving this from wireSvgHeight -- itself built
  // from the live-measured row/header heights above, not the row
  // *count* alone -- is the reliable alternative to also measuring the
  // diagram column's own rendered height directly (which would need
  // to filter out the "+ Add" dropdown temporarily inflating it).
  let diagramHeight = $derived(
    Math.min(480, Math.max(160, wireSvgHeight - wireHeaderHeight)),
  );
  // Width derived from the diagram's own square shape (see the
  // inline <svg>'s viewBox below -- it's cropped to a square on the
  // board's right side, right edge aligned with the board's own
  // right edge, deliberately excluding the USB-C connector's whole
  // left-side territory so no manufacturer's connector position or
  // orientation ever needs to be accounted for here), so the artwork
  // fills the wrapper edge to edge as it grows.
  const DIAGRAM_ASPECT_RATIO = 1;
  let diagramWidth = $derived(diagramHeight * DIAGRAM_ASPECT_RATIO);

  // The board's own printed brand name -- distinct from
  // manufacturers.js's own `name` (the parent RC-radio manufacturer,
  // e.g. "FrSky"), this is what's actually silkscreened on the board
  // itself (e.g. "Vantac"). Falls back to FC.CONFIG's own reported
  // manufacturerId when a board has no dedicated diagram. See
  // manufacturer_branding.js for MANUFACTURER_BOARD_NAMES itself.
  let boardBrandName = $derived(
    MANUFACTURER_BOARD_NAMES[FC.CONFIG.manufacturerId] ??
      FC.CONFIG.manufacturerId,
  );

  // The board's own printed branding artwork -- one <MANUFACTURER>_
  // BRAND.svg file per manufacturer (see src/images/remap_fc/), each
  // laid over the diagram at a fixed width (see BRAND_IMAGE_WIDTH)
  // with its own aspect ratio setting the height, so every image can
  // have a different natural shape without needing per-manufacturer
  // layout code. A manufacturer with no entry here just shows the
  // plain generic body. See manufacturer_branding.js for
  // MANUFACTURER_BRAND_IMAGES itself.
  const BRAND_IMAGE_X = 590;
  const BRAND_IMAGE_Y = 109; // 55 + 10% of the board's own 540-tall height
  const BRAND_IMAGE_WIDTH = 400;
  let boardBrandImage = $derived(
    MANUFACTURER_BRAND_IMAGES[FC.CONFIG.manufacturerId],
  );

  // The board's own model text, shown under the brand image -- e.g.
  // "VANTAC_RF007" becomes just "RF007" (the brand image already
  // shows "VANTAC"), stripping the leading "<brand>_" case
  // insensitively. A board name that doesn't start with the brand
  // (e.g. "NEXUS_XR") is shown exactly as reported, unstripped.
  let boardModelName = $derived.by(() => {
    const raw = FC.CONFIG.boardName ?? "";
    const prefix = `${boardBrandName}_`;
    return raw.slice(0, prefix.length).toUpperCase() === prefix.toUpperCase()
      ? raw.slice(prefix.length)
      : raw;
  });

  // The model text is drawn at a fixed base font size, then scaled
  // (via boardModelTextScale, applied as a <g> transform around it)
  // so its rendered width always matches MODEL_TEXT_TARGET_WIDTH --
  // short names like "RF007" get scaled up, long ones scaled down,
  // rather than every name just rendering at whatever width its own
  // character count happens to produce. SVG has no CSS-style
  // auto-fit for text, so this measures the actual rendered width via
  // getComputedTextLength() and recomputes the scale whenever the
  // name changes.
  //
  // Scaling is uniform (x and y together, via the <g> transform), so
  // filling the same target *width* regardless of length also means a
  // short name gets taller the more it's scaled up -- a name as short
  // as "V2_2" filled MODEL_TEXT_TARGET_WIDTH at a large enough scale
  // to grow tall enough to overlap the brand image above it.
  // MAX_MODEL_TEXT_SCALE caps how far a short name is ever enlarged
  // (past this, it just doesn't reach the full target width), keeping
  // its height bounded instead.
  const MODEL_TEXT_TARGET_WIDTH = BRAND_IMAGE_WIDTH;
  const MAX_MODEL_TEXT_SCALE = 1.5;
  let modelTextEl = $state(null);
  let boardModelTextScale = $state(1);
  $effect(() => {
    // Read boardModelName so this re-measures whenever the displayed
    // name changes, not just when modelTextEl is (re)bound.
    void boardModelName;
    if (modelTextEl) {
      const width = modelTextEl.getComputedTextLength();
      boardModelTextScale =
        width > 0
          ? Math.min(MODEL_TEXT_TARGET_WIDTH / width, MAX_MODEL_TEXT_SCALE)
          : 1;
    }
  });

  // A board reporting no reference design at all, or the generic
  // "BTFL" placeholder Rotorflight uses for an unrecognised
  // Betaflight target, isn't a real cased board. It's shown as a
  // bare, uncased PCB (see GENERIC.svg) instead of the cased shape
  // below -- see isGenericBoardDesign for the identical check
  // remap_fc.js uses to decide whether to fetch richer
  // Betaflight-target defaults.
  let isGenericBoard = $derived(isGenericBoardDesign(FC.CONFIG.boardDesign));

  // Body/bezel colours for the board diagram -- grey is the generic
  // fallback; manufacturers with a real reference diagram get their
  // own real case colours instead. See manufacturer_branding.js for
  // MANUFACTURER_BOARD_COLORS itself.
  let boardBezelColor = $derived(
    MANUFACTURER_BOARD_COLORS[FC.CONFIG.manufacturerId]?.bezel ?? "#9ba3ac",
  );
  let boardBodyColor = $derived(
    MANUFACTURER_BOARD_COLORS[FC.CONFIG.manufacturerId]?.body ?? "#4b5561",
  );

  // Pin -> board's own silkscreen name (e.g. "ESC", "TAIL") from the
  // matching reference design; empty for an undocumented board.
  // Matched primarily by design family (FC.CONFIG.boardDesign), or by
  // the board's own reported name (FC.CONFIG.boardName) for a board
  // with no reference design of its own -- see findUsages.
  let referenceLabels = $derived(
    buildReferenceLabels(
      referenceDesigns,
      FC.CONFIG.boardDesign,
      FC.CONFIG.boardName,
    ),
  );

  // Pins wired to fixed onboard sensors (baro, gyro, ...) -- excluded
  // from "+ Add" so they can't be reassigned.
  let reservedPins = $derived(
    buildReservedPins(
      referenceDesigns,
      FC.CONFIG.boardDesign,
      FC.CONFIG.boardName,
    ),
  );

  // Pins a manufacturer design explicitly marks `"hide": true` -- a
  // genuine, otherwise-ordinary CLI resource electrically, but
  // hard-wired straight to something onboard with no physical port to
  // connect anything else to (e.g. Flydragon Pro's Int Rec.Tx/Rx).
  // Excluded from "+ Add"/"Other Pins" the same as reservedPins, and
  // (on the rare board where the pin is still shown as a permanent
  // row) its own dropdown is locked too.
  let hiddenPins = $derived(
    buildHiddenPins(
      referenceDesigns,
      FC.CONFIG.boardDesign,
      FC.CONFIG.boardName,
    ),
  );

  // Pins the reference design names as a specific connector (AUX,
  // SBUS, TLM, RPM, ...) rather than a generic port.
  let namedConnectorPins = $derived(
    buildNamedConnectorPins(
      referenceDesigns,
      FC.CONFIG.boardDesign,
      FC.CONFIG.boardName,
    ),
  );

  // The subset of namedConnectorPins a manufacturer design specifically
  // documents (never an official reference design family) -- see
  // buildManufacturerNamedConnectorPins and setHardware's own comment
  // for why only these get the own-defaults fallback.
  let manufacturerNamedConnectorPins = $derived(
    buildManufacturerNamedConnectorPins(referenceDesigns, FC.CONFIG.boardName),
  );

  // Whether option's row is a permanent fixture of the table: a fixed
  // FW feature (motor/servo/Freq/LED) or the reference design's own
  // named connector (TLM/SBUS/AUX, ...). Both always get a row and stay
  // in the table when set to "None", unlike a dynamically-added row (a
  // beyond-capacity M5+/S9+, or a generic UART/I2C port), which
  // disappears back to "+ Add" once cleared.
  function isPermanentOption(option, defaultPin) {
    return (
      TABLE_OPTION_KEYS.includes(option) ||
      (defaultPin != null && namedConnectorPins.has(defaultPin))
    );
  }

  // Board's own name for a port (e.g. "ESC", "TAIL") from its
  // reference design, falling back to expandOptionName's spelled-out
  // CLI name. For the physical port itself -- never overridden, since
  // that identity can't change (see optionLabel for the function
  // being picked instead).
  function displayName(option) {
    const pin = defaultHardware[option]?.pin;
    return (
      (pin !== undefined && referenceLabels[pin]) || expandOptionName(option)
    );
  }

  // FC Label column / "+ Add" menu text: displayName, with a generic
  // "Servo N" or "Motor N" pad name (from a reference design that
  // doesn't give it its own identity, or expandOptionName's fallback on
  // an undocumented board) shortened to its CLI-style "SN"/"MN" form. A
  // pad with a real name of its own -- "TAIL", "ESC", "SBUS" -- never
  // matches this and is left untouched.
  const GENERIC_SERVO_MOTOR_RE = /^(Servo|Motor) (\d+)$/;
  function fcLabel(option) {
    const name = displayName(option);
    const match = name.match(GENERIC_SERVO_MOTOR_RE);
    return match ? `${match[1][0]}${match[2]}` : name;
  }

  // The FC Label *column*'s own text -- fcLabel with a generic UART/I2C
  // bus name ("Serial RX 1", "I2C SDA 3") further shortened to just its
  // bus/instance half ("RX 1", "SDA 3"): the column is too narrow for
  // the full name to ever fit without truncating (see pin-row-text's
  // own CSS). The "+ Add" menu and the pin card's own title (see
  // fcLabel's other callers) keep the full name -- they have the room,
  // and it reads better there without the identical column-width
  // constraint forcing it shorter.
  const BUS_PREFIX_RE = /^(?:Serial|I2C) /;
  function pinColumnLabel(option) {
    return fcLabel(option).replace(BUS_PREFIX_RE, "");
  }

  // The bus-and-instance name for a UART/I2C resource key -- "UART RX 1",
  // "I2C SDA 1". Falls back to expandOptionName for anything unexpected.
  function busResourceName(option) {
    const match = option.match(/^(RX|TX|SDA|SCL)(\d+)$/);
    if (!match) return expandOptionName(option);
    const [, prefix, index] = match;
    const bus = prefix === "SDA" || prefix === "SCL" ? "I2C" : "UART";
    return `${bus} ${prefix} ${index}`;
  }

  // Label for the resource on the *other* end of a row -- the value
  // being picked as its Current Option, not the physical pad. Always
  // the plain CLI-style name (expandOptionName: "Motor 1", "Servo 3",
  // "Frequency 1", "LED Strip"), never a board's own silkscreen name
  // for it -- that's what displayName/fcLabel are for, on the FC Label
  // side. Keeping the Feature side's own *labels* board-independent
  // this way is unrelated to featureRows' own row *order*, which does
  // vary per board (see orderFeatureKeys). A UART/I2C resource can only
  // ever be its own row's value (see the UART/I2C rule), so it's
  // always "this pad, unremapped" -- reads as plain "Default" rather
  // than the bus name (see busResourceName for that; it still appears,
  // spelled out, in cardDescription).
  function optionLabel(option) {
    if (isUartOrI2cResource(option)) return $i18n.t("remapFcDefaultOption");
    return expandOptionName(option);
  }

  // Purpose hint keys for a UART/I2C pad's own default identity, keyed
  // by its friendly connector name (see displayName) -- deliberately
  // narrow: only connectors with an unambiguous, board-independent
  // meaning across the RC/FC hobby (TLM = the ESC telemetry return,
  // SBUS = the receiver's SBUS signal). AUX and any other/generic
  // UART/I2C pad has no fixed purpose of its own, so falls back to
  // remapFcHintGeneric.
  const CONNECTOR_HINT_KEYS = {
    TLM: "remapFcHintTlm",
    SBUS: "remapFcHintSbus",
  };

  // Purpose hint keys for a PWM feature's own well-established,
  // board-independent role on a typical helicopter build -- keyed by
  // the CLI option key itself, since (unlike a UART connector) the
  // feature's identity IS the canonical thing here, not whichever pad
  // it currently sits on. Deliberately incomplete: M3/M4, S5-S8 and
  // Freq2-4 vary too much by build (twin-motor rigs, flaps, retracts,
  // extra sensors, ...) to state a specific purpose for confidently, so
  // they fall back to the generic remapFcCardDescription blurb instead
  // of a guessed-at one.
  const FEATURE_PURPOSE_KEYS = {
    M1: "remapFcPurposeM1",
    M2: "remapFcPurposeM2",
    S1: "remapFcPurposeS1",
    S2: "remapFcPurposeS2",
    S3: "remapFcPurposeS3",
    S4: "remapFcPurposeS4",
    Freq1: "remapFcPurposeFreq1",
    LED: "remapFcPurposeLed",
  };

  // Title for the open card. A "pin" card (opened from the FC Label
  // column) is about the pad, so it's titled with the pad's own name
  // (fcLabel), same as always. A "feature" card (opened from the
  // Feature column) is about the feature instead -- titled with that
  // feature's own name (optionLabel(row.currentOption): "Servo 1"),
  // not the pad it happens to currently sit on.
  function cardTitle(row) {
    return openCardSource === "feature" && row.currentOption
      ? optionLabel(row.currentOption)
      : fcLabel(row.option);
  }

  // Whether a pad's own pin can never actually be reassigned to
  // anything else at all, for whichever reason -- explicitly hidden as
  // an internal/hard-wired connection with no physical port (see
  // hiddenPins), or simply having zero timer capability (see
  // pinHasTimerCapability, defined below). Used by cardDescription to
  // skip the "can be freely repurposed" hint, which would otherwise
  // flatly contradict either pin's own "nothing to pick from" message
  // shown just below it in the template.
  function hasNoAlternativeResource(pin) {
    return hiddenPins.has(pin) || !pinHasTimerCapability(pin);
  }

  // Description shown in a pad's Current Option card. A UART/I2C pad's
  // own row names its underlying bus resource ("UART RX 2") and a
  // connector-purpose hint, since "Default" alone (see optionLabel)
  // doesn't say what that default actually is. A PWM feature currently
  // sitting on this pad gets its own purpose hint if it has one (see
  // FEATURE_PURPOSE_KEYS); everything else (an empty pad, or a feature
  // without a confident hint) gets the generic "choose a feature" blurb.
  //
  // escapeValue: false -- hint is itself an already-resolved
  // translation being interpolated into another one, and i18next
  // HTML-escapes interpolated values by default (quotes/apostrophes
  // become &quot;/&#39;), which is meant for untrusted values inserted
  // as raw HTML. This is plain developer-authored text rendered as a
  // text node (Svelte's {expression}, never {@html}), so there's
  // nothing to protect against and escaping just corrupts the
  // punctuation on screen. Same fix already used in filesystem.js.
  function cardDescription(row) {
    if (isUartOrI2cResource(row.option)) {
      // No alternative resource for this pad at all (see
      // hasNoAlternativeResource) skips the repurposing hint entirely
      // -- "can be freely repurposed" would flatly contradict the
      // separate "cannot be remapped"/"no alternative resource
      // features" message the template shows right below for one of
      // these, rather than complementing it the way the hint does for
      // an ordinary pad.
      if (hasNoAlternativeResource(row.defaultPin)) {
        return $i18n.t("remapFcCardDescriptionUartNoAlternative", {
          resource: busResourceName(row.option),
        });
      }

      const hintKey = CONNECTOR_HINT_KEYS[displayName(row.option)];
      return $i18n.t("remapFcCardDescriptionUart", {
        resource: busResourceName(row.option),
        hint: $i18n.t(hintKey ?? "remapFcHintGeneric"),
        interpolation: { escapeValue: false },
      });
    }

    const purposeKey =
      row.currentOption && FEATURE_PURPOSE_KEYS[row.currentOption];
    return $i18n.t(purposeKey ?? "remapFcCardDescription");
  }

  // Friendly FC Label name for a raw MCU pin (e.g. "B14" -> "Servo 1"),
  // used by suggestionLabel below -- pin_conflict_suggestions.js only
  // deals in raw pins and CLI keys, not this board's own pad naming.
  // The unabbreviated displayName, not fcLabel's "S1" short form: this
  // reads as a sentence ("Move Servo 3 to Servo 1"), where the fully
  // spelled-out name (matching how the feature side of that same
  // sentence already reads) fits better than a terse column label.
  // Falls back to the bare pin if no option in defaultHardware claims
  // it (shouldn't normally happen -- every suggested target pin comes
  // from some row's own defaultPin).
  function pinLabel(pin) {
    const option = Object.keys(defaultHardware).find(
      (key) => defaultHardware[key].pin === pin,
    );
    return option ? displayName(option) : pin;
  }

  // Human-readable label for a pin-conflict suggestion, using this
  // board's own reference-design labels (pin_conflict_suggestions.js
  // only knows raw CLI keys like "M1").
  function suggestionLabel(suggestion) {
    return suggestion.type === "swap"
      ? $i18n.t("remapFcSuggestionSwap", {
          feature: optionLabel(suggestion.feature),
          otherFeature: optionLabel(suggestion.otherFeature),
        })
      : $i18n.t("remapFcSuggestionMove", {
          feature: optionLabel(suggestion.feature),
          targetPin: pinLabel(suggestion.targetPin),
        });
  }

  // Options claimed by some row's Current Option right now. Also
  // unions in any TABLE_OPTION_KEYS member present directly in
  // workingCurrent, since a row's own join can't discover an occupant
  // whose own default hardware sets no pin (e.g. an LED strip some
  // boards don't wire by default) -- without this it would wrongly
  // show back up as free.
  let claimedOptions = $derived([
    ...new Set([
      ...tableRows
        .map((row) => row.currentOption)
        .filter((option) => option !== null),
      ...TABLE_OPTION_KEYS.filter((option) => option in workingCurrent),
    ]),
  ]);

  // Motors/servos left stranded above a hole in their own numbering.
  // The add-side rule (isEligibleToAdd) can't catch this: the hole
  // gets made by vacating something in the middle, not by assigning
  // out of order. Blocks Save, because the firmware silently drops
  // every output above the hole -- see findSequenceGaps.
  let sequenceGaps = $derived(hasRead ? findSequenceGaps(claimedOptions) : []);

  // Everything still addable via "+ Add" -- every default option not
  // already shown a row, minus reservedPins and hiddenPins.
  let addablePool = $derived(
    getAddableOptions(defaultHardware, visibleOptions).filter(
      (addable) =>
        !reservedPins.has(addable.defaultPin) &&
        !hiddenPins.has(addable.defaultPin),
    ),
  );

  // Whether there's anything left to add — used to hide the "+ Add"
  // row once nothing remains.
  let hasRealAddableOptions = $derived(addablePool.length > 0);

  // How many rows the "+ Add" listbox shows at once while open: every
  // choice plus the placeholder, capped so it can't grow unreasonably
  // tall when there's a lot to pick from.
  let addMenuSize = $derived(Math.min(addablePool.length + 1, 16));

  // Pool for a row's own Current Option dropdown. Excludes the row's
  // own current pick from claimedOptions first, so a candidate that's
  // only eligible because of it isn't offered (M3 needs M2 configured
  // -- offering M3 while M2 is what this row holds would let picking
  // it break that invariant). Otherwise excludes only options
  // genuinely claimed elsewhere (not merely "unset" in another row).
  //
  // getRowSelectableOptions applies the UART/I2C rule: a row may only be
  // pointed at a PWM output (motor/servo/Freq/LED), and a UART/I2C pad
  // (TLM, SBUS, AUX, SDA/SCL, ...) additionally at its own original
  // resource. A UART/I2C resource is never offered anywhere else -- see
  // its doc comment.
  /**
   * @param {import("@/js/remap_fc/remap_table.js").RemapRow} row
   */
  // Whether row's own pin has any timer capability at all -- see
  // getRowSelectableOptions' own pinHasTimer param for why a row on a
  // pin with none (e.g. a receive-only UART pin like D02) must never
  // offer a PWM-needing candidate (motor/servo/freq/LED): the
  // `resource` command would send fine, but the feature would have
  // nothing driving it, silently and with no warning anywhere else in
  // this tool -- this is the one place that gets caught before it's
  // ever picked.
  function pinHasTimerCapability(pin) {
    return getPinTimerOptions(mcuAllData, mcuType, pin).length > 0;
  }

  function optionsForRow(row) {
    const claimedIfPicked = row.currentOption
      ? claimedOptions.filter((option) => option !== row.currentOption)
      : claimedOptions;

    return [
      NONE_VALUE,
      ...getRowSelectableOptions(
        row.option,
        claimedIfPicked,
        pinHasTimerCapability(row.defaultPin),
        hiddenPins.has(row.defaultPin),
      ),
    ].filter((option) => option !== row.currentOption);
  }

  // `resource` commands needed to reach workingCurrent from
  // originalCurrent, recomputed on every edit.
  let pendingCommands = $derived(
    buildChangeCommands(originalCurrent, workingCurrent),
  );
  let hasPendingChanges = $derived(pendingCommands.length > 0);

  // Always-current timer/DMA reallocation pass over the working
  // state, recomputed on every edit rather than needing a separate
  // "Allocate" step (see markApplied for how re-sending is avoided).
  // Empty/no-clash before the FC's been read.
  let reconciled = $derived(
    hasRead
      ? reconcileTimersAndDma(
          workingCurrent,
          mcuType,
          mcuAllData,
          reservedDmaStreams,
          reservedTimers,
        )
      : {
          commands: [],
          clash: { hasClash: false, reasons: [] },
          unresolved: [],
          calculatedTable: [],
          allocation: [],
        },
  );
  let timerDmaCommands = $derived(reconciled.commands);
  let calculatedAllocationTable = $derived(reconciled.calculatedTable);
  let unresolvedFeatures = $derived(reconciled.unresolved);

  // Candidate pin swaps/moves that would let reallocation resolve
  // everything, for whichever features `reconciled` already found
  // unresolved -- passing reconciled.unresolved in (rather than having
  // this recompute its own "unresolved" independently) guarantees the
  // two can never disagree about whether there's a clash to suggest a
  // fix for. suggestions can still be empty with unresolvedFeatures
  // non-empty, when no single swap/move fixes it.
  let pinConflictResult = $derived(
    hasRead
      ? findPinConflictSuggestions(
          workingCurrent,
          mcuType,
          mcuAllData,
          reservedDmaStreams,
          reservedTimers,
          tableRows,
          unresolvedFeatures,
        )
      : { unresolvedFeatures: [], suggestions: [] },
  );

  // Bound to the suggestion picker as a string (native <select> values
  // are always strings); clamped in case the list shrinks.
  let selectedSuggestionIndex = $state("0");
  let selectedSuggestion = $derived(
    pinConflictResult.suggestions[
      Math.min(
        Number(selectedSuggestionIndex),
        pinConflictResult.suggestions.length - 1,
      )
    ] ?? null,
  );

  // The feature the pin-conflict warning panel's manual-fix message/
  // button targets when no swap/move resolves the clash -- whichever
  // one the user most recently placed, falling back to whichever
  // unresolved feature comes first if nothing's been touched yet this
  // session (e.g. the clash was already there on read).
  //
  // Only trusts lastChangedOption while it still names something
  // actually present in workingCurrent -- handleCurrentOptionChange
  // sets it whenever a row is *placed*, but never clears it once set,
  // so picking "None" on that same row afterwards (or a different row's
  // edit evicting it from its pin) would otherwise leave this pointing
  // at a feature that no longer exists anywhere on the board:
  // handleResetToSetOption's own tableRows lookup would then silently
  // find nothing and no-op, while the panel still displayed that stale
  // feature's name as the thing needing a manual fix.
  let manualFixTarget = $derived(
    (lastChangedOption in workingCurrent ? lastChangedOption : null) ??
      pinConflictResult.unresolvedFeatures[0] ??
      null,
  );

  // Whether there's anything staged to actually send -- resource
  // changes, timer/DMA changes, or both. Drives the "Load Changes"
  // button/preview panel, which needs to appear even when the only
  // thing staged is a timer/DMA fix with no resource edits alongside it.
  let hasStagedCommands = $derived(
    hasPendingChanges || timerDmaCommands.length > 0,
  );

  // The rate a freshly assigned/moved servo will actually come up at
  // once it's saved and the FC reboots -- servoRates is only ever
  // populated once, from the initial `servo` read, so a servo with no
  // resource assigned yet at that point has no entry of its own there
  // at all (the CLI's own `servo` dump only reports indices that
  // currently have one). Every other servo this board's `servo` dump
  // did report shares the identical rate (see the screenshots this was
  // confirmed against), so that's a real, board-specific value to fall
  // back on -- not a guessed universal constant that could be wrong
  // for some other firmware target -- for anything servoTimerGroups
  // below still can't otherwise account for.
  let assumedDefaultServoRate = $derived(
    Object.values(servoRates).find((rate) => rate !== undefined) ?? null,
  );

  // Every servo currently resolved to a real timer (see
  // reconciled.allocation), grouped by that timer's own base (e.g.
  // "TIM3") -- a timer's whole period/frequency is one property of the
  // timer itself, shared across every channel on it, so every servo in
  // a group is expected to share one single rate (see the servo-rate
  // card's own description) rather than being tracked/compared
  // per-servo here; that expectation is enforced elsewhere, not
  // something this card needs to verify. Purely informational: never
  // treated as a clash reconcileTimersAndDma itself reports, and never
  // blocks Load Changes.
  let servoTimerGroups = $derived.by(() => {
    // A plain object/array throughout, deliberately -- this is a
    // throwaway grouping built fresh on every recompute, never mutated
    // afterward, so there's no reactive state here for SvelteMap to
    // actually help track.
    const byBase = {};
    for (const result of reconciled.allocation) {
      if (classifyFeature(result.feature) !== "servo" || !result.chosen)
        continue;
      (byBase[result.chosen.base] ??= []).push(result.feature);
    }

    return Object.entries(byBase)
      .map(([base, features]) => {
        const sorted = [...features].sort();
        // A freshly reassigned/moved servo has no rate of its own yet
        // -- but if it now shares a timer with a servo that *does*
        // have a known rate, that's the rate it'll actually end up at
        // too (every servo on a timer shares one rate), so that's used
        // first rather than assumedDefaultServoRate purely because
        // this particular group member happens to sort first. Only
        // once nothing in the group has its own known rate does this
        // fall back to the board's own apparent default -- flagged via
        // isDefault so the template can label it, rather than
        // presenting it as an equally-confirmed reported value.
        const knownRate = sorted
          .map((feature) => servoRates[feature])
          .find((r) => r !== undefined);
        const rate = knownRate ?? assumedDefaultServoRate;
        return {
          base,
          features: sorted,
          rate,
          isDefault: knownRate === undefined,
        };
      })
      .sort(
        // By each group's own lowest servo number (e.g. a group
        // containing S4 sorts after one containing S1) rather than by
        // timer base name, which is allocator-driven and meaningless
        // to read by -- this way the groups list in the same S1->S8
        // order the rest of the table already uses.
        (a, b) =>
          Number(a.features[0].slice(1)) - Number(b.features[0].slice(1)),
      );
  });

  // Every managed motor output is assumed to run plain DMA-driven
  // DSHOT (see feature_classifier.js's featureNeedsDma), so these are
  // forced alongside every staged change.
  const DSHOT_SETTING_COMMANDS = [
    "set dshot_burst = OFF",
    "set dshot_bitbang = OFF",
  ];

  // What "Load Changes" sends and the preview panel shows -- the
  // single place "save" gets appended.
  let commandsToSend = $derived([
    ...DSHOT_SETTING_COMMANDS,
    ...pendingCommands,
    ...timerDmaCommands,
    "save",
  ]);

  // --- Functions below are called from remap_fc.js on the mounted
  // instance (e.g. `component.setRunning(true)`), the same way
  // Failsafe.svelte exposes onSave/onRevert/isDirty. ---

  export function setRunning(value) {
    running = value;
  }

  export function setRestoreProgress(value) {
    restoreProgress = value;
  }

  export function setError(message) {
    error = message;
  }

  /**
   * Seeds the editable working copy from a fresh CLI read. A row shows
   * for a TABLE_OPTION_KEYS identity whenever its default pin is
   * occupied for anything TABLE_OPTION_KEYS or the reference design
   * doesn't cover; a TABLE_OPTION_KEYS identity or a reference design's
   * own named connector (TLM/SBUS/AUX, ...) always gets a row, empty or
   * not (see isPermanentOption) -- an unoccupied one just shows "None".
   * @param {import("@/js/remap_fc/hardware_parser.js").HardwareMap} current
   * @param {import("@/js/remap_fc/hardware_parser.js").HardwareMap} defaultHw
   * @param {?string} mcu
   * @param {Set<string>} [reservedDma] - See remap_fc.js's #reservedDmaStreams.
   * @param {Set<string>} [reservedTmr] - See remap_fc.js's #reservedTimers.
   * @param {Object.<string, number>} [servoRts] - See remap_fc.js's #servoRates.
   */
  export function setHardware(
    current,
    defaultHw,
    mcu,
    reservedDma = new Set(),
    reservedTmr = new Set(),
    servoRts = {},
  ) {
    rawDefaultHardware = defaultHw;

    // A manufacturer design's own named connector can be physically
    // wired to a pin this board's compiled defaults leave completely
    // unclaimed -- Flydragon Pro's AUX (B09) is a real example: the
    // manufacturer confirms it's unconnected by default (it shares its
    // pin with a secondary gyro interrupt), but it's still meant to be
    // usable for remapping. Without a fallback such a pin is invisible
    // everywhere: no option in defaultHw has that pin, so neither the
    // visibleOptions loop below nor getAddableOptions (which requires
    // `option in defaultHardware`) ever surfaces it.
    //
    // This never guesses *what* such a pin should default to -- a bare
    // timer channel like AUX's is just as plausibly an extra servo as
    // it is a frequency input (see FLYDRAGON_V2_2's RPM-S, exactly that
    // same ambiguity from otherwise-identical manufacturer data), and
    // manufacturer_designs.json doesn't say which. So this only ever
    // anchors the row to *some* currently-unclaimed TABLE_OPTION_KEYS
    // identity -- purely an internal handle so the row can exist and
    // its pin can be reassigned through the normal machinery (the
    // anchor itself is never shown -- fcLabel resolves the row's label
    // from its pin, not its anchor key, and the row starts in
    // unsetOptions below so its Current Option area prompts for a pick
    // rather than showing the anchor as if it were a real default) --
    // and only for a manufacturer design's own connectors, never an
    // official reference design's (see
    // buildManufacturerNamedConnectorPins).
    const augmentedDefaultHw = { ...defaultHw };
    const fallbackAnchors = [];
    for (const pin of manufacturerNamedConnectorPins) {
      const alreadyClaimed = Object.values(augmentedDefaultHw).some(
        (entry) => entry.pin === pin,
      );
      if (alreadyClaimed) continue;

      const anchor = TABLE_OPTION_KEYS.find(
        (option) => !(option in augmentedDefaultHw),
      );
      if (!anchor) continue; // no free slot left to anchor this pin to

      augmentedDefaultHw[anchor] = { pin };
      fallbackAnchors.push(anchor);
    }

    workingCurrent = { ...current };
    originalCurrent = { ...current };
    defaultHardware = augmentedDefaultHw;
    mcuType = mcu;
    servoRates = servoRts;
    reservedDmaStreams = reservedDma;
    reservedTimers = reservedTmr;
    hasRead = true;

    const occupantOf = (pin) =>
      Object.keys(current).find((key) => current[key].pin === pin);

    visibleOptions = OPTION_KEYS.filter((option) => {
      const defaultPin = defaultHardware[option]?.pin;
      if (defaultPin === undefined) return false;

      // A pin a manufacturer design marks `"hide": true` never gets an
      // automatic row, even a fixed FW feature slot like LED that would
      // otherwise always show one below (see hiddenPins' own comment --
      // e.g. a board whose LED header is documented but not actually
      // wired to anything usable).
      if (hiddenPins.has(defaultPin)) return false;

      // A fixed FW feature or a reference design's own named connector
      // always gets a row -- whether or not anything currently occupies
      // its pin (see isPermanentOption).
      if (isPermanentOption(option, defaultPin)) return true;

      // Everything else -- a beyond-capacity M5+/S9+, or a UART/I2C pin
      // the reference design doesn't name -- only gets an automatic row
      // once a real feature has actually taken its pin; otherwise it's
      // reachable via "+ Add".
      const occupant = occupantOf(defaultPin);
      return occupant !== undefined && TABLE_OPTION_KEYS.includes(occupant);
    });

    // Rows freshly read from the FC are never "unset", except a
    // manufacturer-design fallback anchor (see above), which starts
    // exactly like a manually "+ Add"ed row: labelled correctly, but
    // with no value assigned until the user actually picks one.
    unsetOptions = fallbackAnchors;
  }

  /**
   * Adopts the working copy as the new baseline once staged commands
   * are actually sent (see remap_fc.js's #doApplySequence), and writes
   * back reconciled's resolved timer/dma for every feature it
   * resolved, so the next reactive pass doesn't propose resending the
   * same commands.
   */
  export function markApplied() {
    const next = { ...workingCurrent };
    for (const result of reconciled.allocation) {
      if (reconciled.unresolved.includes(result.feature)) continue;
      const entry = next[result.feature];
      if (!entry) continue;

      next[result.feature] = {
        ...entry,
        timer: result.chosen?.af,
        dma:
          result.dma?.selectedDMAIndex >= 0
            ? String(result.dma.selectedDMAIndex)
            : undefined,
      };
    }

    workingCurrent = next;
    originalCurrent = { ...next };
  }

  export function reset() {
    error = null;
    hasRead = false;
    mcuType = null;
    restoreProgress = null;
    workingCurrent = {};
    originalCurrent = {};
    defaultHardware = {};
    rawDefaultHardware = {};
    reservedDmaStreams = new Set();
    reservedTimers = new Set();
    servoRates = {};
    visibleOptions = [];
    unsetOptions = [];
    selectedAddOption = "";
    addMenuOpen = false;
    lastChangedOption = null;
    openCardOption = null;
    openCardSource = null;
  }

  // onClick handles the "Read FC" button: clear any previous run's
  // state before asking the tab controller to start a new one.
  function onClick() {
    reset();
    onRunClick();
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabRemapFC"), "_system");
  }

  // Fires when an FC Label or Feature button is clicked: opens that
  // pad's Current Option card in the clicked column's own mode (see
  // openCardSource), or closes it again if it was already open in that
  // exact mode -- clicking the other column's button for the same pad
  // switches modes rather than closing.
  function toggleCard(option, source) {
    if (openCardOption === option && openCardSource === source) {
      openCardOption = null;
      openCardSource = null;
    } else {
      openCardOption = option;
      openCardSource = source;
    }
  }

  // handleAddChange fires when an option is picked from the "+ Add"
  // dropdown: give it a row (if it doesn't already have one), then close
  // the dropdown back down to just the "+ Add" button. Only a
  // dynamically-added row (a beyond-capacity M5+/S9+, or a generic
  // UART/I2C port -- see isPermanentOption) ever reaches here at all,
  // since every permanent row already has one. It starts "unset" (the
  // "Default" placeholder) unless its resource turns out to already
  // be assigned, in which case its real value shows straight away.
  /**
   * @param {Event} e
   */
  function handleAddChange(e) {
    const option = e.target.value;
    selectedAddOption = "";
    addMenuOpen = false;
    if (!option || visibleOptions.includes(option)) return;

    visibleOptions = [...visibleOptions, option];
    if (workingCurrent[option]?.pin == null) {
      unsetOptions = [...unsetOptions, option];
    }
  }

  // handleLoadChanges fires when "Load Changes" is pressed: hand the
  // full command list -- the staged diff plus the trailing "save" --
  // to the tab controller, which sends it to the flight controller and
  // saves/reboots to make the change take effect.
  function handleLoadChanges() {
    onLoadChanges?.(commandsToSend);
  }

  // handleClearChanges fires when "Clear Changes" is pressed: discards
  // every edit made since the last successful read/apply by simply
  // re-running setHardware with originalCurrent -- the same as what
  // happens right after an initial read, since originalCurrent already
  // holds exactly that baseline (see setHardware/markApplied). Passes
  // the already-known servoRates back through explicitly -- omitting it
  // would fall back to setHardware's own default ({}), silently wiping
  // servo rate data a revert never actually invalidates (it doesn't
  // re-read the FC), which previously left every servoTimerGroups entry
  // showing "None" after Revert instead of the board's real rates.
  // Passes rawDefaultHardware, not defaultHardware, for the same
  // reason: defaultHardware is setHardware's own *augmented* output
  // (see its comment), and feeding that back in as input makes every
  // fallback-anchored connector look already-claimed, so it silently
  // stops being recreated -- which previously lost the "Default"
  // placeholder for a connector like Flydragon Pro's AUX after Revert,
  // showing it as a plain "None" instead.
  function handleClearChanges() {
    setHardware(
      originalCurrent,
      rawDefaultHardware,
      mcuType,
      reservedDmaStreams,
      reservedTimers,
      servoRates,
    );
  }

  // Fires when a row's Current Option changes: frees whoever occupied
  // that pin, then assigns the pick. On "None", a dynamically-added row
  // (a beyond-capacity M5+/S9+, or a generic UART/I2C port) disappears
  // back to "+ Add"; a permanent row (see isPermanentOption) stays in
  // the table showing "None".
  /**
   * @param {import("@/js/remap_fc/remap_table.js").RemapRow} row
   * @param {Event} e
   */
  function handleCurrentOptionChange(row, e) {
    const chosen = e.target.value;

    // Drop whoever currently occupies this row's default pin (a pin can
    // only host one resource) by rebuilding the map without them,
    // rather than a dynamically-computed delete.
    const next = Object.fromEntries(
      Object.entries(workingCurrent).filter(
        ([, resource]) => resource.pin !== row.defaultPin,
      ),
    );

    if (chosen === NONE_VALUE) {
      if (!isPermanentOption(row.option, row.defaultPin)) {
        visibleOptions = visibleOptions.filter(
          (option) => option !== row.option,
        );
      }
    } else if (chosen) {
      next[chosen] = { pin: row.defaultPin };
      lastChangedOption = chosen;
    }

    unsetOptions = unsetOptions.filter((option) => option !== row.option);
    workingCurrent = next;
  }

  // Adopts the selected suggestion's precomputed pin layout wholesale,
  // clearing any stale "unset" state its feature(s) carried.
  function handleAcceptSuggestion() {
    if (!selectedSuggestion) return;

    workingCurrent = selectedSuggestion.apply;

    const affected = [
      selectedSuggestion.feature,
      selectedSuggestion.otherFeature,
    ].filter((option) => option !== null);
    unsetOptions = unsetOptions.filter((option) => !affected.includes(option));

    selectedSuggestionIndex = "0";
  }

  // handleResetToSetOption fires from the pin-conflict panel's
  // manual-fix button (shown when no suggestion resolves the clash):
  // clears the target's pin and marks its row unset -- not "None",
  // which would blacklist a row-less feature from claimedOptions
  // permanently. Explicit button rather than an automatic revert, so
  // the clash stays visible until confirmed.
  function handleResetToSetOption() {
    if (!manualFixTarget) return;

    const affectedRow = tableRows.find(
      (row) => row.currentOption === manualFixTarget,
    );
    if (!affectedRow) return;

    workingCurrent = Object.fromEntries(
      Object.entries(workingCurrent).filter(([key]) => key !== manualFixTarget),
    );
    unsetOptions = unsetOptions.includes(affectedRow.option)
      ? unsetOptions
      : [...unsetOptions, affectedRow.option];
    lastChangedOption = null;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabRemapFC")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

<!-- Action row, only while something is staged -- same bottom toolbar
     every other Svelte tab uses for Revert / Save & Reboot. The full
     list of commands shows in the "Pending Changes" card in the body
     once "Show details" is on. -->
{#snippet toolbar()}
  <button class="btn" onclick={handleClearChanges} disabled={running}>
    {$i18n.t("buttonRevert")}
  </button>
  <button
    class="btn"
    onclick={handleLoadChanges}
    disabled={running ||
      pinConflictResult.unresolvedFeatures.length > 0 ||
      sequenceGaps.length > 0}
    title={pinConflictResult.unresolvedFeatures.length > 0
      ? $i18n.t("remapFcLoadChangesBlocked")
      : sequenceGaps.length > 0
        ? $i18n.t("remapFcSequenceGapBlocked")
        : ""}
  >
    {running ? $i18n.t("remapFcApplying") : $i18n.t("buttonSaveReboot")}
  </button>
{/snippet}

<Page {header} toolbar={hasStagedCommands && toolbar} loading={false}>
  <!-- Before a read, offer the button that triggers one, plus a short
       explanation of what the tab actually does -- everything else
       below only has anything to show once the FC's actually been
       read, so there'd otherwise be nothing on screen to explain the
       tab to someone opening it for the first time. -->
  {#if !hasRead}
    <div class="intro-card">
      <Section label="remapFcIntroHeading">
        <!-- One padded wrapper for the whole card body: Section's own
             .content only insets 4px, which leaves buttons and text
             hugging the card edge. -->
        <div class="intro-body">
          <div class="intro-content">
            <p>{$i18n.t("remapFcIntroDescription")}</p>
            <img
              class="intro-illustration"
              src="/images/remap_fc/REMAP_ILLUSTRATION.svg"
              alt=""
            />
          </div>
          <button class="btn run-btn" onclick={onClick} disabled={running}>
            {runButtonLabel}
          </button>
        </div>
      </Section>
    </div>
  {/if}

  <!-- Error from the last CLI sequence, if any. -->
  {#if error}
    <div class="error_message">{error}</div>
  {/if}

  {#if hasRead}
    {#if mcuSupported}
      <div class="board-info-card">
        <Section>
          {#snippet header()}
            <div class="header">
              <span class="title"
                >{FC.CONFIG.manufacturerId} {FC.CONFIG.boardName}</span
              >
            </div>
          {/snippet}

          {#if mcuType || FC.CONFIG.boardDesign}
            <table class="info-table">
              <tbody>
                {#if mcuType}
                  <tr>
                    <td>{$i18n.t("remapFcMcuLabel")}</td>
                    <td>{mcuType}</td>
                  </tr>
                {/if}
                <!-- The board's reference design (e.g. "F7A1"). This
                   comes from FC.CONFIG (populated via MSP at connect
                   time, not parsed from the CLI dump), so it's
                   already known before any read, but this whole card
                   only renders once hasRead is true anyway. -->
                {#if FC.CONFIG.boardDesign}
                  <tr>
                    <td>{$i18n.t("remapFcDesignLabel")}</td>
                    <td>{FC.CONFIG.boardDesign}</td>
                  </tr>
                {/if}
              </tbody>
            </table>
          {/if}
        </Section>
      </div>

      <!-- Controls the "Calculated config" card further down -- kept up
         here, next to the board info it actually toggles context for,
         rather than inside the card it hides, since a control that's
         only visible once you've already shown the thing it hides
         would be unreachable to turn back off from a glance. -->
      {#if calculatedAllocationTable.length}
        <label class="details-toggle">
          <Switch bind:checked={showCalculatedDetails} />
          <span>{$i18n.t("remapFcShowDetails")}</span>
        </label>
      {/if}

      <div class="table-with-diagram">
        <!-- Two fallback diagrams: a bare, uncased PCB (GENERIC.svg)
           for a board reporting no real reference design at all (see
           isGenericBoard), or a plain rounded-rect case (drawn inline
           below, not its own SVG file) for every other board -- not
           board-specific artwork, building/fetching a dedicated
           diagram per manufacturer doesn't scale. Grey is the fallback
           colour a board with no dedicated case colours of its own
           gets (see boardBezelColor/boardBodyColor for manufacturers
           with their own real ones). The FC's own reported name sits
           above the diagram, not overlaid on it. -->
        <div class="board-diagram-column">
          <div
            class="board-diagram-caption"
            style="height: {wireHeaderHeight}px"
          >
            {boardBrandName}
            {FC.CONFIG.boardName}
          </div>
          <div
            class="board-diagram-wrap"
            style="width: {diagramWidth}px; height: {diagramHeight}px;"
          >
            <svg
              class="board-diagram"
              viewBox="530 10 540 540"
              xmlns="http://www.w3.org/2000/svg"
            >
              {#if isGenericBoard}
                <image
                  href="/images/remap_fc/GENERIC.svg"
                  x="530"
                  y="10"
                  width="540"
                  height="540"
                  preserveAspectRatio="xMidYMid meet"
                />
              {:else}
                <rect
                  x="30"
                  y="10"
                  width="1040"
                  height="540"
                  rx="20"
                  fill={boardBezelColor}
                />
                <rect
                  x="56"
                  y="36"
                  width="988"
                  height="488"
                  rx="14"
                  fill={boardBodyColor}
                />
                <!-- Manufacturer branding: a single <MANUFACTURER>_BRAND.svg
                 image (see boardBrandImage/MANUFACTURER_BRAND_IMAGES)
                 laid over the board for whichever manufacturer is
                 connected, scaled to one fixed width with height
                 following that image's own aspect ratio. A new
                 manufacturer only ever needs its own image file dropped
                 in plus one line added to MANUFACTURER_BRAND_IMAGES. -->
                {#if boardBrandImage}
                  <image
                    href="/images/remap_fc/{boardBrandImage.file}"
                    x={BRAND_IMAGE_X}
                    y={BRAND_IMAGE_Y}
                    width={BRAND_IMAGE_WIDTH}
                    height={BRAND_IMAGE_WIDTH / boardBrandImage.aspect}
                    preserveAspectRatio="xMinYMin meet"
                  />
                  <g
                    transform="translate({BRAND_IMAGE_X} 440) scale({boardModelTextScale})"
                  >
                    <text
                      bind:this={modelTextEl}
                      x="0"
                      y="0"
                      font-family="Arial, sans-serif"
                      font-weight="900"
                      font-size="70"
                      letter-spacing="1"
                      fill="#ffffff">{boardModelName}</text
                    >
                  </g>
                {/if}
              {/if}
            </svg>
          </div>
        </div>

        <!-- A re-read clears the table for several seconds while the
           CLI sequence runs -- key off running rather than the row
           counts, so a board with genuinely no rows still renders
           nothing here. -->
        {#if running}
          <div class="table-loading">
            <div class="spinner"></div>
            <p>{$i18n.t("remapFcLoadingHardware")}</p>
          </div>
        {:else if tableRows.length || hasRealAddableOptions}
          {@const activeLeftIndex = tableRows.findIndex(
            (row) => row.option === openCardOption,
          )}
          <div class="wiring-row">
            <!-- FC Label column: one button per physical pad. Clicking
                 it opens/closes its Current Option card (see
                 .card-col below) -- it no longer carries its own
                 dropdown. -->
            <div class="pins-col">
              <div
                class="column-header"
                bind:clientHeight={measuredHeaderHeight}
              >
                {$i18n.t("remapFcTableOption")}
              </div>
              {#each tableRows as row (row.option)}
                <button
                  type="button"
                  class="pin-row"
                  class:active={openCardOption === row.option}
                  onclick={() => toggleCard(row.option, "pin")}
                  bind:clientHeight={measuredRowHeight}
                >
                  <img class="pin-icon" src="/images/remap_fc/PIN.svg" alt="" />
                  <span class="pin-row-text">{pinColumnLabel(row.option)}</span>
                </button>
              {/each}
              {#if hasRealAddableOptions}
                <div class="add-row">
                  {#if addMenuOpen}
                    <!-- svelte-ignore a11y_autofocus -->
                    <div class="add-menu">
                      <select
                        class="add-menu-select"
                        autofocus
                        bind:value={selectedAddOption}
                        onchange={handleAddChange}
                        onblur={() => (addMenuOpen = false)}
                        size={addMenuSize}
                      >
                        <option value="">{$i18n.t("remapFcAddOption")}</option>
                        {#each addablePool as addable (addable.option)}
                          <option value={addable.option}>
                            {fcLabel(addable.option)}
                          </option>
                        {/each}
                      </select>
                    </div>
                  {:else}
                    <button
                      class="btn add-btn"
                      onclick={() => (addMenuOpen = true)}
                    >
                      {$i18n.t("remapFcAddOption")}
                    </button>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- The literal connections: one path per Feature row,
                 from its FC Label row's index to its own. Both columns
                 render every row at the same height (wireRowHeight,
                 measured off the .pin-row rows below), so a plain
                 index->pixel formula (wireY) places every endpoint. -->
            <svg
              class="wires"
              width={WIRE_GUTTER_WIDTH}
              height={wireSvgHeight}
              viewBox="0 0 {WIRE_GUTTER_WIDTH} {wireSvgHeight}"
            >
              {#each wireLinks as link (featureRows[link.rightIndex].pinRow.option)}
                <path
                  class:active={link.leftIndex === activeLeftIndex}
                  d={wirePath(link.leftIndex, link.rightIndex)}
                />
              {/each}
            </svg>

            <!-- Feature column: a button per feature, in this board's
                 own physical row order (see featureRows/
                 orderFeatureKeys) -- a pin with nothing allocated has
                 no entry here at all. Clicking
                 one opens a read-only card (see toggleCard's "feature"
                 mode) titled with the feature's own name and showing
                 its purpose hint, if it has one (see cardDescription). -->
            <div class="features-col">
              <div class="column-header">
                {$i18n.t("remapFcTableCurrentOption")}
              </div>
              {#each featureRows as featureRow (featureRow.pinRow.option)}
                <button
                  type="button"
                  class="feature-row"
                  class:active={openCardOption === featureRow.pinRow.option}
                  onclick={() =>
                    toggleCard(featureRow.pinRow.option, "feature")}
                >
                  {optionLabel(featureRow.key)}
                </button>
              {/each}
            </div>

            <!-- The open pad's card -- a standing placeholder while
                 nothing's selected, rather than empty, so there's
                 always something here prompting the next action. Its
                 content depends on openCardSource (see toggleCard): a
                 "pin" card gets the full title+pin/description/dropdown
                 treatment; a "feature" card is read-only -- title (the
                 feature's own name, see cardTitle) and description
                 only, no pin number and no dropdown, since clicking a
                 feature is about learning what it's for, not
                 remapping it. -->
            <div class="card-col">
              {#if cardRow}
                {@const unset = unsetOptions.includes(cardRow.option)}
                {@const isPinCard = openCardSource === "pin"}
                <div class="option-card">
                  <div class="option-card-header">
                    <span class="option-card-title">
                      {cardTitle(cardRow)}
                      {#if isPinCard && cardRow.defaultPin}
                        <span class="option-card-pin"
                          >({cardRow.defaultPin})</span
                        >
                      {/if}
                    </span>
                    <button
                      type="button"
                      class="option-card-close"
                      onclick={() => {
                        openCardOption = null;
                        openCardSource = null;
                      }}
                      aria-label={$i18n.t("remapFcCloseCard")}
                    >
                      &times;
                    </button>
                  </div>
                  <p class="option-card-description">
                    {cardDescription(cardRow)}
                  </p>
                  {#if isPinCard && hiddenPins.has(cardRow.defaultPin)}
                    <!-- A manufacturer design can mark a pin
                         "hide": true (see reference_design_labels.js's
                         buildHiddenPins) -- a genuine,
                         otherwise-ordinary CLI resource electrically,
                         but hard-wired straight to something onboard
                         (e.g. Flydragon Pro's Int Rec.Tx/Rx, wired
                         directly to the onboard receiver) with no
                         physical port to connect anything else to.
                         Excluded from "+ Add" the same as reservedPins;
                         this branch only matters on the rare board
                         where the pin is still shown as a permanent
                         row. Checked before the no-timer case below
                         since it's a stronger, unconditional reason: it
                         can still apply to a pin that *does* have a
                         timer. -->
                    <p class="option-card-description">
                      {$i18n.t("remapFcPinNotRemappable")}
                    </p>
                  {:else if isPinCard && !pinHasTimerCapability(cardRow.defaultPin)}
                    <!-- A pin with zero timer options can never drive
                         any PWM-needing feature (see
                         pinHasTimerCapability/getRowSelectableOptions'
                         own pinHasTimer param) -- its only ever
                         possible Current Option is its own original
                         resource, so there's nothing an interactive
                         dropdown would actually let the user change. -->
                    <p class="option-card-description">
                      {$i18n.t("remapFcNoAlternativeFeatures")}
                    </p>
                  {:else if isPinCard}
                    <!-- Force a remount whenever the displayed value
                         changes (e.g. because a different row's edit
                         cleared this row's occupant, or this row just
                         got resolved out of the "unset" placeholder
                         state) so the select always reflects it. -->
                    {#key unset ? "unset" : cardRow.currentOption}
                      <Select
                        value={unset
                          ? ""
                          : (cardRow.currentOption ?? NONE_VALUE)}
                        onchange={(e) => handleCurrentOptionChange(cardRow, e)}
                        options={[
                          ...(unset
                            ? [
                                {
                                  value: "",
                                  label: $i18n.t("remapFcDefaultOption"),
                                  disabled: true,
                                  hidden: true,
                                },
                              ]
                            : cardRow.currentOption
                              ? [
                                  {
                                    value: cardRow.currentOption,
                                    label: optionLabel(cardRow.currentOption),
                                  },
                                ]
                              : []),
                          ...optionsForRow(cardRow).map((option) => ({
                            value: option,
                            label:
                              option === NONE_VALUE
                                ? $i18n.t("remapFcNoneOption")
                                : optionLabel(option),
                          })),
                        ]}
                      />
                    {/key}
                  {/if}
                </div>
              {:else}
                <div class="option-card option-card-placeholder">
                  <p class="option-card-description">
                    {$i18n.t("remapFcCardPlaceholder")}
                  </p>
                </div>
              {/if}

              <!-- Config review: every resolved servo's own update
                   rate, grouped by shared timer (see
                   servoTimerGroups), one group per line -- led with
                   the rate itself (what the user actually set) rather
                   than the underlying timer base (meaningless outside
                   this tool), followed by which servos it covers. Each
                   group line is the one thing here actually worth a
                   glance, so it's set apart (brighter, see
                   .servo-rate-group-line) from the label above and the
                   hint below, which stay quiet. Every servo in a group
                   is expected to share one rate (see the hint), so
                   this is purely an indication of what's currently
                   configured, not another interactive card, and still
                   styled well below the pad detail card above it
                   overall. Never blocks Load Changes. -->
              {#if servoTimerGroups.length}
                <div class="servo-rate-footnote">
                  <p class="servo-rate-footnote-label">
                    {$i18n.t("remapFcServoRateHeading")}:
                  </p>
                  <div class="servo-rate-groups">
                    {#each servoTimerGroups as group (group.base)}
                      <p class="servo-rate-group-line">
                        {#if group.rate == null}
                          {$i18n.t("remapFcNoneOption")}
                        {:else if group.isDefault}
                          {$i18n.t("remapFcServoRateDefaultEntry", {
                            rate: group.rate,
                          })}
                        {:else}
                          {`${group.rate}Hz`}
                        {/if}
                        → {group.features
                          .map((feature) => optionLabel(feature))
                          .join(", ")}
                      </p>
                    {/each}
                  </div>
                  <p class="servo-rate-footnote-hint">
                    {$i18n.t("remapFcServoRateDescription")}
                  </p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="mcu-unsupported-card">
        <Section>
          {#snippet header()}
            <div class="header">
              <span class="title warning-title"
                >{$i18n.t("remapFcMcuUnsupportedHeading")}</span
              >
            </div>
          {/snippet}
          <p class="allocation-warning">
            {mcuType
              ? $i18n.t("remapFcMcuUnsupportedMessage", { mcu: mcuType })
              : $i18n.t("remapFcMcuUnknownMessage")}
          </p>
        </Section>
      </div>
    {/if}
  {/if}

  <!-- Shown once the current pin assignment has a timer/DMA clash
       reallocation alone can't resolve -- above Pending Changes,
       since "Load Changes" is blocked while this is up. -->
  <!-- A motor/servo left stranded above a hole in its own numbering.
       Blocks "Load Changes" like the pin-conflict card does, because
       the firmware stops at the first unassigned output instead of
       skipping it -- so applying this would quietly drop everything
       above the hole (see findSequenceGaps). -->
  {#if mcuSupported && sequenceGaps.length}
    <div class="pin-conflict-card">
      <Section>
        {#snippet header()}
          <div class="header">
            <span class="title warning-title"
              >{$i18n.t("remapFcSequenceGapHeading")}</span
            >
          </div>
        {/snippet}

        <p class="allocation-warning">
          {$i18n.t("remapFcSequenceGapWarning", {
            missing: sequenceGaps.flatMap((gap) => gap.missing).join(", "),
            stranded: sequenceGaps.flatMap((gap) => gap.stranded).join(", "),
          })}
        </p>
      </Section>
    </div>
  {/if}

  {#if mcuSupported && pinConflictResult.unresolvedFeatures.length}
    <div class="pin-conflict-card">
      <Section>
        {#snippet header()}
          <div class="header">
            <span class="title warning-title"
              >{$i18n.t("remapFcAllocationInvalidHeading")}</span
            >
          </div>
        {/snippet}

        <p class="allocation-warning">
          {$i18n.t("remapFcAllocationInvalidWarning", {
            reasons: reconciled.clash.reasons.join("; "),
          })}
        </p>

        <!-- Accept Suggestion adopts selectedSuggestion.apply wholesale
             (see handleAcceptSuggestion). No suggestion found means
             the manual-fix message/button shows instead. -->
        {#if pinConflictResult.suggestions.length}
          <div class="suggestion-row">
            {#if pinConflictResult.suggestions.length > 1}
              <Select
                bind:value={selectedSuggestionIndex}
                options={pinConflictResult.suggestions.map(
                  (suggestion, index) => ({
                    value: String(index),
                    label: suggestionLabel(suggestion),
                  }),
                )}
              />
            {:else if selectedSuggestion}
              <span>{suggestionLabel(selectedSuggestion)}</span>
            {/if}
            <button
              class="btn accept-suggestion-btn"
              onclick={handleAcceptSuggestion}
            >
              {$i18n.t("remapFcAcceptSuggestion")}
            </button>
          </div>
        {:else}
          <p class="allocation-warning suggestion-manual-fix">
            {$i18n.t("remapFcSuggestionManualFix", {
              feature: optionLabel(manualFixTarget),
            })}
          </p>
          <div class="suggestion-row">
            <button
              class="btn accept-suggestion-btn"
              onclick={handleResetToSetOption}
            >
              {$i18n.t("remapFcResetToSetOption")}
            </button>
          </div>
        {/if}
      </Section>
    </div>
  {/if}

  <!-- A genuine problem (unresolvedFeatures) always stays visible
       regardless of "Show details" -- only the table itself hides
       behind the toggle. -->
  {#if mcuSupported && calculatedAllocationTable.length}
    {#if unresolvedFeatures.length}
      <p class="allocation-warning">
        {$i18n.t("remapFcAllocationUnresolved", {
          features: unresolvedFeatures.join(", "),
        })}
      </p>
    {/if}

    {#if showCalculatedDetails}
      <div class="calculated-config-card">
        <Section label="remapFcAllocationCalculatedHeading">
          <table class="allocation-table">
            <thead>
              <tr>
                <th>{$i18n.t("remapFcAllocationFeature")}</th>
                <th>{$i18n.t("remapFcAllocationPin")}</th>
                <th>{$i18n.t("remapFcAllocationTimer")}</th>
                <th>{$i18n.t("remapFcAllocationDma")}</th>
              </tr>
            </thead>
            <tbody>
              {#each calculatedAllocationTable as row (row.feature)}
                <tr class:unresolved={row.unresolved}>
                  <td>{row.feature}</td>
                  <td>{row.pin}</td>
                  <td>
                    {#if row.timerOptions.length}
                      <ul class="timer-options">
                        {#each row.timerOptions as option (option.af)}
                          <li class:chosen={option.chosen}>{option.label}</li>
                        {/each}
                      </ul>
                    {:else}
                      -
                    {/if}
                  </td>
                  <td class:dma-unmanaged={!row.dmaManaged}>
                    <div>{row.dmaCommand}</div>
                    <div class="allocation-resolved">{row.dma}</div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </Section>
      </div>
    {/if}

    <!-- The exact CLI batch "Load Changes" will send, revealed by the
         same "Show details" toggle as the calculated-config table. -->
    {#if showCalculatedDetails && hasStagedCommands}
      <div class="pending-changes-card">
        <Section label="remapFcChangesHeading">
          <pre class="pending-commands">{commandsToSend.join("\n")}</pre>
        </Section>
      </div>
    {/if}
  {/if}
</Page>

<style lang="scss">
  .btn {
    @extend %button;
  }

  /* align-self keeps it from stretching to the intro card's full width;
     spacing off the text/illustration above comes from .intro-body's gap. */
  .run-btn {
    align-self: flex-start;
  }

  /* Custom Section headers (board-info card, live-warning card):
     matches Section.svelte/Status.svelte's own header/title styling,
     since supplying a header snippet bypasses Section's default one
     entirely. */
  .header {
    @extend %section-header;
    padding-right: 8px;
  }

  .title {
    padding-left: 8px;
    font-weight: 600;
  }

  .warning-title {
    color: var(--color-red-500);
  }

  /* Plain label/value rows, matching Status.svelte's own info-table
     convention. */
  .info-table {
    width: 100%;

    td {
      padding: 3px 0;
      font-size: 0.8rem;

      &:last-child {
        text-align: right;
        font-weight: 600;
      }
    }
  }

  /* Hugs its own short content, matching Status.svelte's compact
     info cards; margin-bottom separates it from the table below. */
  .board-info-card {
    max-width: 320px;
    margin-bottom: 24px;
  }

  /* Wider than .board-info-card since the table has four columns, but
     still capped rather than spanning the full page. */
  .calculated-config-card,
  .pin-conflict-card,
  .mcu-unsupported-card {
    max-width: 560px;
  }

  .intro-card {
    max-width: 700px;
  }

  /* Wraps the whole intro card body in real padding -- Section's own
     .content only gives 4px, so without this the text and Read FC
     button sit flush against the card edge. */
  .intro-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 16px 12px;
  }

  .intro-content {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;

    p {
      flex: 1 1 280px;
      margin: 0;
      color: var(--color-text);
      opacity: 0.85;
      line-height: 1.5;
    }
  }

  .intro-illustration {
    flex: 0 0 auto;
    width: 340px;
    height: auto;
  }

  .details-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    width: fit-content;
    font-size: 0.85rem;
    color: var(--color-text);
    margin-bottom: 16px;
  }

  .allocation-warning {
    color: var(--color-red-500);
  }

  /* The suggestion picker (a single suggestion shows as plain text
     instead -- see the template) plus "Accept Suggestion", at the
     bottom of the pin-conflict warning panel. */
  .suggestion-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  /* Shown instead of .suggestion-row when no swap/move resolves the
     clash -- same top spacing, so the two are interchangeable. */
  .suggestion-manual-fix {
    margin: 10px 0 0;
  }

  .accept-suggestion-btn {
    @extend %button;
  }

  /* Deliberately quiet overall -- an indication, not another
     interactive card: no box, border, or shadow, at the same 260px
     width/left margin as .option-card so it still lines up under the
     pad detail card above it. The gap separates the label, the
     groups block as a whole, and the hint -- see .servo-rate-groups
     for the tighter spacing between individual group lines within
     that block. */
  .servo-rate-footnote {
    width: 260px;
    margin: 0 0 0 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    line-height: 1.4;
  }

  /* Tighter than .servo-rate-footnote's own gap -- these lines read
     as one related group of results, so they sit closer to each
     other than to the label above/hint below the whole block. */
  .servo-rate-groups {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .servo-rate-footnote-label,
  .servo-rate-footnote-hint {
    margin: 0;
    font-size: 0.72rem;
    color: var(--color-text);
    opacity: 0.6;
  }

  /* The one thing here actually worth a glance -- brighter (bold,
     fuller opacity) than the label/hint around it, at the same size
     as them, so the timer groupings stand out as the important
     information without overpowering the quiet caption feel. */
  .servo-rate-group-line {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text);
    opacity: 0.95;
  }

  .allocation-table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 4px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      vertical-align: top;
    }

    th {
      opacity: 0.8;
    }

    /* Flags a row left untouched because nothing could be resolved
       for it, rather than one that was actually (re)allocated. */
    tr.unresolved td {
      color: var(--color-red-500);
    }

    /* A DMA cell shown for reference only (servo/freq inputs never
       actually use DMA -- see featureNeedsDma); struck through so it
       reads as inert. */
    td.dma-unmanaged {
      opacity: 0.5;
      text-decoration: line-through;
    }
  }

  .allocation-resolved {
    opacity: 0.7;
    font-size: 0.9em;
  }

  /* Every timer option this pin actually supports, not just the one
     in use -- the chosen one stands out at full weight/opacity, the
     rest are dimmed rather than removed entirely, so it's still
     obvious what else was available. */
  .timer-options {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      font-size: 0.85em;
      white-space: nowrap;
      opacity: 0.45;
    }

    li.chosen {
      font-weight: 600;
      opacity: 1;
    }
  }

  /* Read-only preview of exactly what "Save and Reboot" will paste into
     the CLI. Same width cap as the calculated-config card it sits
     beside. */
  .pending-changes-card {
    max-width: 560px;
  }

  .pending-commands {
    margin: 0;
    padding: 8px 12px;
    max-height: 50vh;
    overflow: auto;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-input-bg);
    white-space: pre;
    color: var(--color-text);
  }

  /* Header spacer: pushes the help button to the right, matching every
     other tab's <Page> header. */
  .grow {
    flex-grow: 1;
  }

  .help-btn {
    @extend %button;
    padding: 4px 8px;
    min-width: 60px;
  }

  /* Lays the board diagram out beside the remap table on wide
     viewports, and stacks them (diagram above table) once there's not
     enough room for both side by side. */
  .table-with-diagram {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0;
  }

  .board-diagram-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    margin-left: 24px;
  }

  /* Height set inline to wireHeaderHeight (the script block's live
     measurement of .column-header's own rendered height), not a fixed
     px value here -- with no gap below it either (see
     .board-diagram-column), this puts .board-diagram-wrap's own top
     exactly level with the FC Label column's first row, the same way
     diagramHeight is sized to exactly match its row span. Without this
     the diagram's top/bottom insets relative to the first/last row
     visibly drifted apart depending on how tall this caption's own
     natural line box happened to render. */
  .board-diagram-caption {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    font-weight: 700;
    font-size: 13px;
    color: var(--color-text);
    text-align: center;
  }

  /* No CSS sizing here -- width/height come from diagramWidth/
     diagramHeight (see the component script above), since this app's
     runtime doesn't support CSS aspect-ratio. */
  .board-diagram-wrap {
    position: relative;
  }

  .board-diagram {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* Shown in place of the table while a read is in flight -- matches
     Page.svelte's own loading spinner, smaller and inline. */
  .table-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    align-self: stretch;
    /* Lines up with .remap-table's own th/td padding. */
    padding-left: 12px;
    color: var(--color-text);
    opacity: 0.8;
  }

  .table-loading .spinner {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    background-image: url("/images/loading-spin.svg");
    background-repeat: no-repeat;
    background-position: center center;
    background-size: contain;
  }

  /* FC Label / wires / Feature / card layout. Two independently
     ordered row lists (pins physical order, features in that same
     board's physical order too -- see orderFeatureKeys) connected by
     SVG wires -- see featureRows/wireLinks/wireY in the
     script block. wireHeaderHeight/wireRowHeight there are measured
     live off .column-header/every .pin-row (bind:clientHeight in
     the template), so a wire's endpoint always matches the actual
     rendered row position, including under browser zoom. */
  .wiring-row {
    display: flex;
    align-items: flex-start;
  }

  .column-header {
    height: 29px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    white-space: nowrap;
    color: var(--color-text);
    opacity: 0.8;
  }

  .pins-col,
  .features-col {
    display: flex;
    flex-direction: column;
  }

  /* Same width as .features-col -- the wire gutter between them (see
     WIRE_GUTTER_WIDTH in the script block) stays fixed regardless, so
     widening this doesn't touch that. */
  .pins-col,
  .features-col {
    min-width: 140px;
  }

  /* Stacks the pad detail card and the quiet servo-rate footnote (see
     servoTimerGroups) below it -- a tighter gap than between two full
     cards, so the footnote reads as attached to/about the card above
     it rather than a peer of its own. */
  .card-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Both are buttons, on the same underlying pad, but open the card in
     different modes (see toggleCard/openCardSource): an FC Label row
     opens the full editing card; a Feature row opens a read-only one
     describing just that feature. */
  .pin-row,
  .feature-row {
    height: 33px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0 12px;
    border: none;
    border-bottom: 1px solid var(--color-border);
    background: none;
    font: inherit;
    text-align: left;
    white-space: nowrap;
    color: var(--color-text);
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        background-color: var(--color-surface-float);
      }
    }

    &.active {
      background-color: var(--color-surface-float);
    }
  }

  .pin-row {
    /* Pulls the pin icon in close to the board diagram beside it
       (a thin gap rather than the shared 12px .pin-row/.feature-row
       padding) while keeping the label text exactly where it was --
       gap grows by the same 8px padding-left loses, so the label's
       distance from the row's own left edge (icon + gap) is unchanged. */
    padding-left: 4px;
    gap: 16px;
  }

  .pin-icon {
    display: block;
    width: 15px;
    height: auto;
    flex-shrink: 0;
  }

  /* Ellipsis rather than overflowing/wrapping -- still a safety net
     even at .pins-col's now-wider, .features-col-matching width (see
     above), for a longer name than this board's own ("TAIL", "SBUS")
     that would otherwise spill past the row. min-width: 0 lets a flex
     child actually shrink below its content's natural width, which a
     plain overflow/text-overflow pair alone won't do. */
  .pin-row-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* The wires themselves: a gentle S-curve per Feature row (see
     wirePath), the one belonging to the open card picked out in the
     accent colour so it's obvious which pad it leads back to. */
  .wires {
    flex-shrink: 0;

    path {
      fill: none;
      stroke: var(--color-border-accent);
      stroke-width: 1.5;
      opacity: 0.5;

      &.active {
        stroke: var(--color-accent-500);
        stroke-width: 2;
        opacity: 1;
      }
    }
  }

  .add-row {
    padding-top: 8px;
    /* Anchors the .add-menu overlay below. */
    position: relative;
  }

  .add-btn {
    @extend %button;
  }

  /* The expanded "+ Add" picker floats over whatever sits below (the
     Pending Changes card) rather than being clipped to a single row by
     the global select{height:1.5rem} rule or shoving the page layout
     around while it's open. Closes on blur (see the select's onblur). */
  .add-menu {
    position: absolute;
    top: 6px;
    left: 12px;
    z-index: 30;
  }

  .add-menu-select {
    /* height:auto lets the `size` attribute set the visible rows,
       overriding the global select{height:1.5rem}. */
    height: auto;
    min-width: 220px;
    padding: 4px 0;
    background-color: var(--color-input-bg);
    border: 1px solid var(--color-border-accent);
    border-radius: 4px;
    box-shadow: 0 6px 20px var(--color-shadow);

    option {
      padding: 3px 12px;
    }
  }

  /* The selected pad's Current Option card. Always present -- see
     .option-card-placeholder for the "nothing selected yet" state. */
  .option-card {
    width: 260px;
    margin-left: 16px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background-color: var(--color-surface-float);
    border: 1px solid var(--color-border-accent);
    border-radius: 6px;
    box-shadow: 0 6px 20px var(--color-shadow);
  }

  /* Shown instead of a real card before any pin's been clicked (or
     after the selected one's row disappeared -- see cardRow). Just the
     prompt, centred, at roughly the same height a real card's header +
     description would take up so nothing jumps when a pin is picked. */
  .option-card-placeholder {
    min-height: 64px;
    align-items: center;
    justify-content: center;

    .option-card-description {
      text-align: center;
    }
  }

  .option-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-weight: 600;
    color: var(--color-text);
  }

  /* The pad's own MCU pin (e.g. "A03") -- shown here, in the card
     title, rather than in the FC Label row itself (where it used to
     sit behind the "Show details" toggle). */
  .option-card-pin {
    margin-left: 4px;
    font-weight: 400;
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .option-card-close {
    padding: 0 4px;
    border: none;
    background: none;
    color: var(--color-text);
    opacity: 0.6;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        opacity: 1;
      }
    }
  }

  /* pre-line rather than the default: remapFcCardDescriptionUart puts a
     blank line between its two sentences (the plain "defaults to X"
     fact and the longer purpose/how-to-enable hint), which a plain
     text node would otherwise collapse away like any other whitespace. */
  .option-card-description {
    margin: 0;
    white-space: pre-line;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--color-text);
    opacity: 0.75;
  }

  /* Fills the card's own fixed width. :global(), since Select.svelte
     renders the actual <select> itself. */
  .option-card :global(select) {
    width: 100%;
  }

  .error_message {
    color: var(--color-red-500);
  }
</style>

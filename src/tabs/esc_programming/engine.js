// Generic byte-buffer <-> parameter-value engine shared by every ESC manufacturer module.
// Field tuples are a superset of the dialects found in the Lua ESC_PARAMETERS_*.lua sources
// (see C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_*.lua
// and core.lua's createConfigAPI). Manufacturers with genuinely non-declarative logic (AM32,
// Bluejay, HW5) layer optional parseRead/buildWritePayload hooks on top of this engine instead
// of forcing their quirks into the generic tuple shape.

export const TYPE_WIDTH = {
    U8: 1, S8: 1,
    U16: 2, S16: 2,
    U24: 3, S24: 3,
    U32: 4, S32: 4,
    U40: 5, S40: 5,
    U48: 6, S48: 6,
    U56: 7, S56: 7,
    U64: 8, S64: 8,
};

// Widths above this read/write as BigInt to avoid precision loss past Number.MAX_SAFE_INTEGER;
// only used for a handful of read-only informational fields (serial numbers etc).
const BIGINT_WIDTH_THRESHOLD = 6;

function isSignedType(type) {
    return type.startsWith("S");
}

// "BYTES" is an opaque fixed-width byte block (its own explicit `width`, not looked up from
// TYPE_WIDTH) -- used for HW5's ASCII header fields (firmware_version, hardware_version, etc)
// where the content is a string a manufacturer module decodes itself, not an integer.
function fieldWidth(field) {
    return field.type === "BYTES" ? field.width : TYPE_WIDTH[field.type];
}

function readUint(bytes, offset, width, littleEndian) {
    let value = 0n;
    if (littleEndian) {
        for (let i = width - 1; i >= 0; i--) {
            value = (value << 8n) | BigInt(bytes[offset + i] ?? 0);
        }
    } else {
        for (let i = 0; i < width; i++) {
            value = (value << 8n) | BigInt(bytes[offset + i] ?? 0);
        }
    }
    return value;
}

function toSignedBig(value, width) {
    const bits = BigInt(width * 8);
    const signBit = 1n << (bits - 1n);
    return (value & signBit) ? value - (1n << bits) : value;
}

export function readRawField(bytes, offset, field) {
    const width = fieldWidth(field);
    if (width == null) {
        throw new Error(`esc_programming: unknown field type "${field.type}" for "${field.key}"`);
    }
    if (field.type === "BYTES") {
        return bytes.subarray(offset, offset + width);
    }
    const littleEndian = field.byteorder !== "big";
    let value = readUint(bytes, offset, width, littleEndian);
    if (isSignedType(field.type)) {
        value = toSignedBig(value, width);
    }
    return width <= BIGINT_WIDTH_THRESHOLD ? Number(value) : value;
}

export function writeRawField(bytes, offset, field, rawValue) {
    const width = fieldWidth(field);
    if (width == null) {
        throw new Error(`esc_programming: unknown field type "${field.type}" for "${field.key}"`);
    }
    if (field.type === "BYTES") {
        bytes.set(rawValue.subarray(0, width), offset);
        return;
    }
    const littleEndian = field.byteorder !== "big";
    let value = typeof rawValue === "bigint" ? rawValue : BigInt(Math.trunc(rawValue ?? 0));
    if (value < 0n) {
        value += 1n << BigInt(width * 8);
    }
    for (let i = 0; i < width; i++) {
        const shift = littleEndian ? i : width - 1 - i;
        bytes[offset + shift] = Number((value >> BigInt(shift * 8)) & 0xFFn);
    }
}

// Assigns sequential byte offsets to every field in declaration order. Fields are consumed
// in order regardless of whether they end up shown in the UI (reserved/padding bytes still
// occupy space). Returns each field annotated with {byteOffset, width} plus overall byte
// counts. NOTE: this is deliberately named `byteOffset`, not `offset` -- several fields (e.g.
// OMP's gov_p/motor_poles) already have their own `offset` property meaning a display-value
// bias (see toDisplay/toRaw below); spreading a byte position into that same key silently
// corrupted their display transform (and, worse, the activefields capability mask itself,
// since it has no declared offset and so picked up its own byte position as a bogus bias).
export function computeLayout(fields) {
    let byteOffset = 0;
    let mandatoryBytes = 0;
    const laidOut = fields.map((field) => {
        const width = fieldWidth(field);
        if (width == null) {
            throw new Error(`esc_programming: unknown field type "${field.type}" for "${field.key}"`);
        }
        const laid = { ...field, byteOffset, width };
        byteOffset += width;
        if (field.mandatory !== false) {
            mandatoryBytes = byteOffset;
        }
        return laid;
    });
    return { fields: laidOut, minBytes: mandatoryBytes, totalBytes: byteOffset };
}

export function toDisplay(field, raw) {
    if (typeof raw === "bigint" || raw instanceof Uint8Array) {
        return raw; // wide informational / opaque BYTES fields: caller decodes/formats itself
    }
    const scale = field.scale ?? 1;
    const mult = field.mult ?? 1;
    const offset = field.offset ?? 0;
    return (raw / scale) * mult + offset;
}

function toRaw(field, display) {
    if (typeof display === "bigint") {
        return display;
    }
    const scale = field.scale ?? 1;
    const mult = field.mult ?? 1;
    const offset = field.offset ?? 0;
    return Math.round(((display - offset) / mult) * scale);
}

// field.min/max/default are transcribed verbatim from the Lua FIELD_SPEC, which are RAW-space
// (pre scale/offset/mult) -- confirmed against app/lib/fields/number.lua:16-19, which adds
// f.offset to f.min/f.max before scaling to build the widget's display-space bounds. These
// helpers apply the same transform so callers (ParameterForm) never render raw-space numbers.
export function displayMin(field) {
    return field.min == null ? undefined : toDisplay(field, field.min);
}

export function displayMax(field) {
    return field.max == null ? undefined : toDisplay(field, field.max);
}

// Default UI increment: explicit field.uiStep wins (used by manufacturers with a custom
// parseRead/buildWritePayload, e.g. AM32, where generic scale/offset don't apply); otherwise
// derive a sensible display-space step from scale/mult so scaled fields don't default to a
// step of 1 raw unit (e.g. Scorpion's min_voltage, scale=100, would otherwise jump 1V/click).
export function displayStep(field) {
    if (field.uiStep != null) return field.uiStep;
    const scale = field.scale ?? 1;
    const mult = field.mult ?? 1;
    return mult / scale;
}

// Two enum shapes are supported: `enum` (a dense array, array[raw] === label -- the common
// case, covers every manufacturer except Bluejay) and `enumMap` (an array of [rawValue, label]
// pairs for non-sequential raw values, e.g. Bluejay's rampupPowerEthos table which maps
// raw 1..13 to "1x".."13x" plus raw 0 to "Off" -- not expressible as a dense array).
export function hasEnum(field) {
    return Boolean(field.enum || field.enumMap);
}

export function resolveEnumLabel(field, raw) {
    if (field.enumMap) return field.enumMap.find(([value]) => value === raw)?.[1];
    if (!field.enum) return undefined;
    return field.enum[raw];
}

function resolveEnumRaw(field, label) {
    if (field.enumMap) return field.enumMap.find(([, text]) => text === label)?.[0];
    return field.enum.indexOf(label);
}

// Normalizes either enum shape into {value, label} pairs for a Select component.
export function fieldOptions(field) {
    if (field.enumMap) return field.enumMap.map(([, label]) => ({ value: label, label }));
    return (field.enum ?? []).map((label) => ({ value: label, label }));
}

// A field gated by a capability bitmask (e.g. OMP/XDFly/ZTW's `activefields`) is only
// meaningful when its bit is set in the named bitmask field's already-parsed raw value.
export function isFieldVisible(field, values) {
    if (field.activeFieldBit == null) return true;
    if (!field.activeFieldMask) return true;
    const mask = values[field.activeFieldMask];
    if (mask == null) return true;
    return Boolean(mask & (1 << field.activeFieldBit));
}

// Parses a raw response buffer into {values, display, present} keyed by field.key.
// `present` is false for trailing optional (mandatory:false) fields the buffer is too short
// to contain -- this is how version-gated trailing fields (e.g. FlyRotor's >=22.0.0 extras)
// are handled: firmware simply omits the bytes for ESCs/versions that don't support them.
export function parseBuffer(fields, bytes) {
    const { fields: laidOut } = computeLayout(fields);
    const values = {};
    const display = {};
    const present = {};

    for (const field of laidOut) {
        const available = bytes.length >= field.byteOffset + field.width;
        present[field.key] = available;
        if (!available) continue;

        const raw = readRawField(bytes, field.byteOffset, field);
        values[field.key] = raw;

        if (field.bitmap) {
            for (const sub of field.bitmap) {
                const bit = (raw >> sub.bit) & 1;
                values[sub.key] = bit;
                display[sub.key] = sub.enum ? resolveEnumLabel(sub, bit) : bit;
            }
        }

        display[field.key] = hasEnum(field) ? resolveEnumLabel(field, raw) : toDisplay(field, raw);
    }

    return { values, display, present, layout: laidOut };
}

// Builds a write payload. `previousRawBytes` (the last successful read) seeds the buffer so
// reserved/unknown/not-yet-editable bytes round-trip untouched instead of being zeroed --
// the safe default for every manufacturer, matching HW5's Lua "patch known offsets only" approach.
export function buildPayload(fields, displayValues, previousRawBytes) {
    const { fields: laidOut, totalBytes } = computeLayout(fields);
    const bytes = new Uint8Array(totalBytes);
    if (previousRawBytes) {
        bytes.set(previousRawBytes.subarray(0, Math.min(previousRawBytes.length, totalBytes)));
    }

    for (const field of laidOut) {
        if (field.bitmap) {
            let raw = previousRawBytes ? readRawField(previousRawBytes, field.byteOffset, field) : 0;
            for (const sub of field.bitmap) {
                if (!(sub.key in displayValues)) continue;
                const bitValue = sub.enum
                    ? sub.enum.indexOf(displayValues[sub.key])
                    : Number(displayValues[sub.key]);
                raw = (raw & ~(1 << sub.bit)) | ((bitValue & 1) << sub.bit);
            }
            writeRawField(bytes, field.byteOffset, field, raw);
            continue;
        }

        if (!(field.key in displayValues)) continue;
        const raw = hasEnum(field)
            ? resolveEnumRaw(field, displayValues[field.key])
            : toRaw(field, displayValues[field.key]);
        writeRawField(bytes, field.byteOffset, field, raw);
    }

    return bytes;
}

// Confirms a response buffer actually came from the given (user-selected) manufacturer.
// Checks the signature byte, plus each module's optional disambiguate() hook for the
// shared-signature pair (BLHeli_S/Bluejay both use 0xC1, split by a second byte).
export function matchesManufacturer(bytes, manufacturer) {
    if (!bytes || bytes.length < 1) return false;
    if (bytes[0] !== manufacturer.signature) return false;
    if (manufacturer.disambiguate) return manufacturer.disambiguate(bytes) === true;
    return true;
}

// Dispatchers used by the tab instead of calling parseBuffer/buildPayload directly, so that
// manufacturers with non-declarative logic (AM32's dual timing_advance encoding, Bluejay's
// layout_revision-conditional retyping, HW5's profile system) can layer optional
// parseRead/buildWritePayload hooks on top of the generic engine without every caller needing
// to know which manufacturers are "special."
export function parseManufacturerBuffer(manufacturer, bytes) {
    const result = parseBuffer(manufacturer.fields, bytes);
    return manufacturer.parseRead ? manufacturer.parseRead(result, bytes) : result;
}

export function buildManufacturerPayload(manufacturer, displayValues, previousRawBytes) {
    if (manufacturer.buildWritePayload) {
        return manufacturer.buildWritePayload(displayValues, previousRawBytes);
    }
    return buildPayload(manufacturer.fields, displayValues, previousRawBytes);
}

// Some fields' effective type/enum/range depends on already-parsed session state (Bluejay's
// layout_revision-conditional retyping is the only current case) rather than being static --
// manufacturers needing this export a resolveFieldMeta(field, values) hook; everyone else is a
// pass-through. Always call this before rendering a field, not `field` directly.
export function resolveManufacturerField(manufacturer, field, values) {
    return manufacturer.resolveFieldMeta ? manufacturer.resolveFieldMeta(field, values) : field;
}

// Bluejay-style layout_revision page-field gating (mirrors the Lua source's keepField
// helper): a page field entry can declare minLayout/maxLayout/onlyLayout constraints so the
// same apikey can appear as two differently-labeled/typed page entries (e.g. rpm_power_slope
// is "Rampup Start Power" on layout<=200 and "Rampup Power" on layout>=201). No-op (always
// kept) for manufacturers/pages that don't set these, and when layoutRevision is unknown.
export function keepPageField(pageField, layoutRevision) {
    if (layoutRevision == null) return true;
    if (pageField.visible) return pageField.visible(layoutRevision); // escape hatch for OR-shaped conditions
    if (pageField.onlyLayout != null) return layoutRevision === pageField.onlyLayout;
    if (pageField.minLayout != null && layoutRevision < pageField.minLayout) return false;
    if (pageField.maxLayout != null && layoutRevision > pageField.maxLayout) return false;
    return true;
}

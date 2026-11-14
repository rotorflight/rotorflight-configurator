// Ported verbatim from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_YGE.lua
// and escmfg/yge/{init.lua,pages/*.lua}. Group B (native MSP, no target-switch handshake).
// The `flags` U8 field packs 4 boolean/enum sub-values (direction, f3cauto, keepmah, bec12v)
// at bits 0-3 -- expressed declaratively via engine.js's `bitmap` primitive, no custom
// parseRead/buildWritePayload needed (confirmed no override exists in the Lua source; only
// the bitmap post-processing, which core.lua's ui.lua consumes via 0-based sequential bit
// indices matching declaration order).
//
// Note: the Lua "Other" page's apikey for pole-pair count is "motor_pole_pairs" (single "l"),
// but the actual FIELD_SPEC field name is "motor_poll_pairs" (double "l") -- a mismatch in the
// source itself. Ported here using the real field name so the value actually binds.

import { API_VERSION_12_7 } from "@/js/configurator.svelte.js";

import { buildPayload, computeLayout, parseBuffer, sameValue } from "../engine.js";
import { registerManufacturer } from "./registry.js";

const escMode = ["Free (Attention!)", "Heli Ext Governor", "Heli Governor", "Heli Governor Store", "Aero Glider", "Aero Motor", "Aero F3A"];
const rotation = ["Normal", "Reverse"];
const cutoff = ["Off", "Slowdown", "Cutoff"];
const cutoffVoltage = ["2.9 V", "3.0 V", "3.1 V", "3.2 V", "3.3 V", "3.4 V"];
const offOn = ["Off", "On"];
const throttleResponse = ["Slow", "Medium", "Fast", "Custom (PC Defined)"];
// The ESC's own words, not list positions: automatic modes 16..19, fixed advance angles 1..6.
// Word 0 is a second spelling of automatic mode 1, shown as "Auto Normal" by parseRead.
// Words 7..15 and above 19 are not defined by the ESC and have no label.
const motorTiming = [
    [16, "Auto Normal"],
    [17, "Auto Efficient"],
    [18, "Auto Power"],
    [19, "Auto Extreme"],
    [1, "0°"],
    [2, "6°"],
    [3, "12°"],
    [4, "18°"],
    [5, "24°"],
    [6, "30°"],
];

// The block: a 2-byte header (signature, command), then the ESC's count of U16 words at bytes 2..3
// (esc_model + esc_version * 256). The ESC decides the count, so the block is 2 + 2 * count bytes long
// (rotorflight-lua-ethos-suite, msp_esc_parameters_yge.lua, #2458). The named fields below are the
// first part of it; whatever follows them is the ESC's own tail, carried through a write unchanged.
const PARAM_HEADER_BYTES = 2;
const PARAM_COUNT_OFFSET = 2;
const MAX_PARAM_COUNT = 64;

// A read keeps what the ESC sent: the named fields the block carries are shown, and nothing is
// refused here. The write checks the block (see writePlan).
function parseRead(parsed) {
    const { values, display } = parsed;
    // Word 0 of the timing is the same mode as 16 ("Auto Normal"), so it is shown as that.
    if (values.timing === 0) display.timing = "Auto Normal";
    return parsed;
}

// A write the Configurator refuses before anything is sent. The key and its values are an i18n
// message, shown above the form.
function refuse(key, params = {}) {
    return Object.assign(new Error(key), { refusal: true, key, params });
}

// The block length a write must have, from the count the ESC reports. A count the Configurator
// cannot write, or a block that is not that long, is refused: a write must be exactly the length
// the ESC asked for.
function writePlan(bytes) {
    const count = bytes[PARAM_COUNT_OFFSET] + bytes[PARAM_COUNT_OFFSET + 1] * 256;
    const expected = PARAM_HEADER_BYTES + count * 2;
    const minCount = (NAMED_BYTES - PARAM_HEADER_BYTES) / 2;
    if (count < minCount || count > MAX_PARAM_COUNT) {
        throw refuse("escProgrammingBlockCount", { 1: count, 2: minCount, 3: MAX_PARAM_COUNT });
    }
    if (bytes.length !== expected) {
        throw refuse("escProgrammingBlockLength", { 1: bytes.length, 2: count, 3: expected });
    }
    return expected;
}
const freewheel = ["Off", "Auto", "*Unused*", "Always On"];

const fields = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    { key: "esc_model", type: "U8" },
    { key: "esc_version", type: "U8" },
    { key: "governor", type: "U16", enum: escMode },
    { key: "lv_bec_voltage", type: "U16", min: 55, max: 84, unit: "v", scale: 10 },
    { key: "timing", type: "U16", enumMap: motorTiming },
    { key: "acceleration", type: "U16" },
    { key: "gov_p", type: "U16", min: 1, max: 10 },
    { key: "gov_i", type: "U16", min: 1, max: 10 },
    { key: "throttle_response", type: "U16", enum: throttleResponse },
    { key: "auto_restart_time", type: "U16", enum: cutoff },
    { key: "cell_cutoff", type: "U16", enum: cutoffVoltage },
    { key: "active_freewheel", type: "U16", enum: freewheel },
    { key: "esc_type", type: "U16" },
    { key: "firmware_version", type: "U32" },
    { key: "serial_number", type: "U32" },
    { key: "unknown_1", type: "U16" },
    { key: "stick_zero_us", type: "U16", min: 900, max: 1900, unit: "us" },
    { key: "stick_range_us", type: "U16", min: 600, max: 1500, unit: "us" },
    { key: "unknown_2", type: "U16" },
    { key: "motor_poll_pairs", type: "U16", min: 1, max: 100 },
    { key: "pinion_teeth", type: "U16", min: 1, max: 255 },
    { key: "main_teeth", type: "U16", min: 1, max: 1800 },
    { key: "min_start_power", type: "U16", min: 0, max: 26, unit: "%" },
    { key: "max_start_power", type: "U16", min: 0, max: 31, unit: "%" },
    { key: "unknown_3", type: "U16" },
    {
        key: "flags",
        type: "U8",
        bitmap: [
            { key: "direction", bit: 0, enum: rotation },
            { key: "f3cauto", bit: 1, enum: offOn },
            { key: "keepmah", bit: 2, enum: offOn },
            { key: "bec12v", bit: 3, enum: offOn },
        ],
    },
    { key: "unknown_4", type: "U8", enum: offOn },
    { key: "current_limit", type: "U16", min: 1, max: 65500, unit: "A", scale: 100 },
];

// The named fields: the first 58 bytes of the block. Past them comes the ESC's own tail, whose
// length is the count's (8 bytes for the 32 parameters of the sim fixture; see writePlan).
const NAMED_BYTES = computeLayout(fields).totalBytes;

const pages = [
    {
        title: "Basic",
        fields: [
            { apikey: "governor", label: "ESC Mode" },
            { apikey: "direction", label: "Direction" },
            { apikey: "lv_bec_voltage", label: "BEC" },
            { apikey: "f3cauto", label: "F3C Autorotation" },
            { apikey: "keepmah", label: "Keep mAh Count" },
            { apikey: "auto_restart_time", label: "Auto Restart Time" },
            { apikey: "cell_cutoff", label: "Cell Cutoff" },
            { apikey: "current_limit", label: "Current Limit" },
        ],
    },
    {
        title: "Advanced",
        fields: [
            { apikey: "min_start_power", label: "Min Start Power" },
            { apikey: "max_start_power", label: "Max Start Power" },
            { apikey: "throttle_response", label: "Throttle Response" },
            { apikey: "timing", label: "Motor Timing" },
            { apikey: "active_freewheel", label: "Active Freewheel" },
        ],
    },
    {
        title: "Other",
        fields: [
            { apikey: "gov_p", label: "Gov-P" },
            { apikey: "gov_i", label: "Gov-I" },
            { apikey: "motor_poll_pairs", label: "Motor Pole Pairs" },
            { apikey: "main_teeth", label: "Main Teeth" },
            { apikey: "pinion_teeth", label: "Pinion Teeth" },
            { apikey: "stick_zero_us", label: "Stick Zero" },
            { apikey: "stick_range_us", label: "Stick Range" },
        ],
    },
];

// Ported from escmfg/yge/init.lua's getEscModel (escType lookup)/getEscFirmware. The Lua
// source reads these through a +2 "mspHeaderBytes" byte offset that, worked through against
// this buffer's actual layout, lands exactly on the esc_type/firmware_version fields below --
// so this reads those named fields directly instead of re-deriving raw byte offsets.
// Per ESC id: the name, whether it has a BEC at all (an Opto has none, so its row is hidden),
// and whether it can take the 12.0 V BEC. The table is the Ethos suite's (lib/msp_esc_parameters_yge.lua,
// #2459). An id this table does not know keeps the row and the 8.4 V ceiling.
const ESC_MODELS = {
    848: { name: "YGE 35 LVT BEC", bec: true, bec12v: false },
    1616: { name: "YGE 65 LVT BEC", bec: true, bec12v: false },
    2128: { name: "YGE 85 LVT BEC", bec: true, bec12v: false },
    2384: { name: "YGE 95 LVT BEC", bec: true, bec12v: false },
    4944: { name: "YGE 135 LVT BEC", bec: true, bec12v: false },
    8273: { name: "YGE 205 HVT BEC", bec: true, bec12v: true },
    2304: { name: "YGE 90 HVT Opto", bec: false, bec12v: false },
    4608: { name: "YGE 120 HVT Opto", bec: false, bec12v: false },
    4928: { name: "YGE Opto 135", bec: false, bec12v: false },
    9552: { name: "YGE Opto 255", bec: false, bec12v: false },
    16464: { name: "YGE Opto 405", bec: false, bec12v: false },
    4177: { name: "YGE Aureus 105", bec: true, bec12v: false },
    4179: { name: "YGE Aureus 105v2", bec: true, bec12v: true },
    4689: { name: "YGE Saphir 125", bec: true, bec12v: false },
    4691: { name: "YGE Saphir 125v2", bec: true, bec12v: true },
    5025: { name: "YGE Aureus 135", bec: true, bec12v: false },
    5027: { name: "YGE Aureus 135v2", bec: true, bec12v: true },
    5457: { name: "YGE Saphir 155", bec: true, bec12v: false },
    5459: { name: "YGE Saphir 155v2", bec: true, bec12v: true },
    5712: { name: "YGE 165 HVT", bec: true, bec12v: true },
    8272: { name: "YGE 205 HVT v2", bec: true, bec12v: true },
};

// The model of the connected ESC, or undefined.
function modelOf(values) {
    return values?.esc_type == null ? undefined : ESC_MODELS[values.esc_type];
}

function describeEsc(values) {
    const parts = [];
    if (values.esc_type != null) {
        parts.push(modelOf(values)?.name ?? `YGE ESC (${values.esc_type})`);
    } else {
        parts.push("YGE");
    }
    if (values.firmware_version != null) parts.push((values.firmware_version / 100000).toFixed(5));
    return parts.join(" ");
}

// Verbatim from ESC_PARAMETERS_YGE.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    165, 0, 32, 0,
    3, 0, // governor
    55, 0, // lv_bec_voltage
    0, 0, // timing
    0, 0, // acceleration
    4, 0, // gov_p
    3, 0, // gov_i
    1, 0, // throttle_response
    1, 0, // auto_restart_time
    2, 0, // cell_cutoff
    3, 0, // active_freewheel
    80, 3, // esc_type
    131, 148, 1, 0, // firmware_version
    30, 170, 0, 0, // serial_number
    3, 0, // unknown_1
    86, 4, // stick_zero_us
    22, 3, // stick_range_us
    163, 15, // unknown_2
    1, 0, // motor_poll_pairs
    2, 0, // pinion_teeth
    2, 0, // main_teeth
    20, 0, // min_start_power
    20, 0, // max_start_power
    0, 0, // unknown_3
    0, // flags
    0, // unknown_4
    2, 19, // current_limit
    2, 0, 20, 0, // tail: 8 bytes for count 32
    22, 0, 0, 0, // tail
];

// The BEC ceiling: 12.0 V for a model that can take it, 8.4 V for the rest. Raw units (tenths of a volt).
function resolveFieldMeta(field, values) {
    if (field.key !== "lv_bec_voltage") return field;
    return modelOf(values)?.bec12v ? { ...field, max: BEC_VOLTAGE_MAX_12V } : field;
}

// The BEC row is shown for every model but the Opto ones, which have no BEC to set.
function rowVisible(apikey, values) {
    if (apikey !== "lv_bec_voltage") return true;
    return modelOf(values)?.bec !== false;
}

// The flag bit that tells the ESC to run its 12 V BEC (bit 3 of the flags byte). It has no row:
// it is the voltage's own decision, so it follows the voltage when the pilot moves it, and is
// otherwise written back as the ESC holds it.
const FLAG_BIT_BEC12V = 3;
const BEC_VOLTAGE_MAX_12V = 120;

function withBit(value, bit, on) {
    const mask = 2 ** bit;
    const set = Math.floor(value / mask) % 2 === 1;
    if (on && !set) return value + mask;
    if (!on && set) return value - mask;
    return value;
}

function buildWritePayload(displayValues, previousRawBytes) {
    if (!previousRawBytes) throw refuse("escProgrammingBlockUnread");
    const expected = writePlan(previousRawBytes);
    const named = buildPayload(fields, displayValues, previousRawBytes);
    const payload = new Uint8Array(expected);
    payload.set(named, 0);
    // The ESC's own tail goes back as it was read, not zeroed.
    payload.set(previousRawBytes.subarray(NAMED_BYTES, expected), NAMED_BYTES);

    const layout = computeLayout(fields).fields;
    const fieldAt = (key) => layout.find((field) => field.key === key);
    const before = parseBuffer(fields, previousRawBytes);

    // An untouched "Auto Normal" is written back as the ESC holds it (word 0), not as 16.
    const timing = fieldAt("timing");
    if (before.values.timing === 0 && displayValues.timing === "Auto Normal") {
        const from = timing.byteOffset;
        payload.set(previousRawBytes.subarray(from, from + timing.width), from);
    }

    // The 12 V flag follows the voltage only when the pilot moved it.
    if (!sameValue(before.display.lv_bec_voltage, displayValues.lv_bec_voltage)) {
        const flags = fieldAt("flags");
        const on = Math.abs(displayValues.lv_bec_voltage - 12) < 1e-9;
        payload[flags.byteOffset] = withBit(payload[flags.byteOffset], FLAG_BIT_BEC12V, on);
    }
    return payload;
}

const yge = {
    id: "yge",
    name: "YGE",
    group: "native",
    signature: 0xA5,
    escSensorProtocolIds: [9],
    minApiVersion: API_VERSION_12_7,
    fields,
    pages,
    simResponse,
    describeEsc,
    parseRead,
    resolveFieldMeta,
    rowVisible,
    buildWritePayload,
};

registerManufacturer(yge);

export default yge;

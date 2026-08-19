// Ported from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_HW5.lua
// and escmfg/hw5/init.lua. Group B (native MSP, no target-switch handshake). The most bespoke
// of the 10 manufacturers: after a fixed ASCII header (firmware/hardware/esc_type/mode_name
// strings), a run of single-byte "item" fields follows whose *byte position* depends on which
// hardware model is detected -- not just their displayed value. Ported as a full
// parseRead/buildWritePayload override operating directly on the raw buffer, since the
// generic engine's static sequential-offset layout can't express a position that changes
// per-instance based on decoded header text.
//
// Simplification: the Lua source also has a ~300-line escmfg/hw5/profile.lua that swaps in
// narrower per-hardware-model option lists (e.g. some models only support 3S-8S packs) and
// occasionally trims the Basic page's field list. Not replicated here -- this module always
// uses ESC_PARAMETERS_HW5.lua's own (superset) tables, which is exactly the Lua behavior for
// any hardware model profile.lua doesn't have a specific entry for. The underlying byte
// offsets (selectItemLayout below) are unaffected by that layer, so this does not change what
// gets written to the ESC, only how permissive the on-screen option lists are.

import { registerManufacturer } from "./registry.js";

const flightMode = ["Fixed Wing", "Heli Ext Governor", "Heli Governor", "Heli Governor Store"];
const rotation = ["CW", "CCW"];
const lipoCellCount = ["Auto Calculate", "3S", "4S", "5S", "6S", "7S", "8S", "9S", "10S", "11S", "12S", "13S", "14S"];
const cutoffType = ["Soft Cutoff", "Hard Cutoff"];
const cutoffVoltage = ["Disabled", "2.8", "2.9", "3.0", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"];
const restartTime = ["1s", "1.5s", "2s", "2.5s", "3s"];
const responseTime = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const startupPowerEnum = ["1", "2", "3", "4", "5", "6", "7"];
const enabledDisabled = ["Enabled", "Disabled"];
const brakeType = ["Disabled", "Normal", "Proportional", "Reverse"];

// Header layout (0-indexed byte offsets), verbatim from the Lua BASE_POS table.
const HEADER_FIELDS = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    { key: "firmware_version", type: "BYTES", width: 16 },
    { key: "hardware_version", type: "BYTES", width: 16 },
    { key: "esc_type", type: "BYTES", width: 16 },
    { key: "mode_name", type: "BYTES", width: 15 },
];
const HARDWARE_VERSION_OFFSET = 18; // esc_signature(1) + esc_command(1) + firmware_version(16)
const ESC_TYPE_OFFSET = 34; // + hardware_version(16)
const ITEM_REGION_START = 65; // + esc_type(16) + mode_name(15)

// Item metadata (min/max/enum/unit) -- byte *position* comes from selectItemLayout() below,
// not from this list's order.
const ITEM_META = {
    flight_mode: { min: 0, max: 3, default: 0, enum: flightMode },
    lipo_cell_count: { min: 0, max: 12, default: 0, enum: lipoCellCount },
    volt_cutoff_type: { min: 0, max: 1, default: 0, enum: cutoffType },
    cutoff_voltage: { min: 0, max: 11, default: 3, enum: cutoffVoltage },
    bec_voltage: { min: 0, max: 70, default: 0 },
    startup_time: { min: 4, max: 25, default: 0, unit: "s" },
    response_time: { min: 0, max: 9, default: 0, enum: responseTime },
    gov_p_gain: { min: 0, max: 9, default: 0 },
    gov_i_gain: { min: 0, max: 9, default: 0 },
    auto_restart: { min: 0, max: 90, default: 25 },
    restart_time: { min: 0, max: 4, default: 1, enum: restartTime },
    brake_type: { min: 0, max: 3, default: 0, enum: brakeType },
    brake_force: { min: 0, max: 100, default: 0, unit: "%" },
    timing: { min: 0, max: 30, default: 0 },
    rotation: { min: 0, max: 1, default: 0, enum: rotation },
    active_freewheel: { min: 0, max: 1, default: 0, enum: enabledDisabled },
    startup_power: { min: 0, max: 6, default: 2, enum: startupPowerEnum },
};

// Item name -> 1-based index within the item region, per hardware/esc-type. Verbatim from
// ESC_PARAMETERS_HW5.lua's DEFAULT_ITEMS/OPTO_ITEMS/HW1128_ITEMS/HW1132_ITEMS.
const DEFAULT_ITEMS = { flight_mode: 1, lipo_cell_count: 2, volt_cutoff_type: 3, cutoff_voltage: 4, bec_voltage: 5, startup_time: 6, gov_p_gain: 7, gov_i_gain: 8, auto_restart: 9, restart_time: 10, brake_type: 11, brake_force: 12, timing: 13, rotation: 14, active_freewheel: 15, startup_power: 16 };
const OPTO_ITEMS = { flight_mode: 1, lipo_cell_count: 2, volt_cutoff_type: 3, cutoff_voltage: 4, startup_time: 5, gov_p_gain: 6, gov_i_gain: 7, auto_restart: 8, restart_time: 9, brake_type: 10, brake_force: 11, timing: 12, rotation: 13, active_freewheel: 14, startup_power: 15 };
const HW1128_ITEMS = { lipo_cell_count: 1, volt_cutoff_type: 2, cutoff_voltage: 3, brake_type: 5, brake_force: 6, timing: 7, rotation: 8, active_freewheel: 9, startup_power: 10 };
const HW1132_ITEMS = { lipo_cell_count: 1, volt_cutoff_type: 2, cutoff_voltage: 3, bec_voltage: 4, response_time: 5, timing: 6, rotation: 7, active_freewheel: 8, startup_power: 9 };

const fields = [...HEADER_FIELDS, ...Object.entries(ITEM_META).map(([key, meta]) => ({ key, type: "U8", ...meta }))];

const pages = [
    {
        title: "Basic",
        fields: [
            { apikey: "flight_mode", label: "Flight Mode" },
            { apikey: "rotation", label: "Rotation" },
            { apikey: "bec_voltage", label: "BEC Voltage" },
            { apikey: "lipo_cell_count", label: "LiPo Cell Count" },
            { apikey: "volt_cutoff_type", label: "Volt Cutoff Type" },
            { apikey: "cutoff_voltage", label: "Cutoff Voltage" },
        ],
    },
    {
        title: "Advanced",
        fields: [
            { apikey: "gov_p_gain", label: "P-Gain" },
            { apikey: "gov_i_gain", label: "I-Gain" },
            { apikey: "startup_time", label: "Startup Time" },
            { apikey: "restart_time", label: "Restart Time" },
            { apikey: "auto_restart", label: "Auto Restart" },
            { apikey: "timing", label: "Timing" },
            { apikey: "startup_power", label: "Startup Power" },
            { apikey: "active_freewheel", label: "Active Freewheel" },
            { apikey: "brake_type", label: "Brake Type" },
            { apikey: "brake_force", label: "Brake Force%" },
            { apikey: "response_time", label: "Response Time" },
        ],
    },
];

function decodeAsciiRun(bytes, offset, length) {
    let text = "";
    for (let i = 0; i < length; i++) {
        const byte = bytes[offset + i];
        if (byte) text += String.fromCharCode(byte);
    }
    return text;
}

function selectItemLayout(hardwareText, escTypeText) {
    const hardware = hardwareText.toUpperCase();
    const escType = escTypeText.toUpperCase();
    if (escType.includes("OPTO")) return OPTO_ITEMS;
    if (hardware.includes("HW1128")) return HW1128_ITEMS;
    if (hardware.includes("HW1132")) return HW1132_ITEMS;
    return DEFAULT_ITEMS;
}

function parseRead(parsed, bytes) {
    const { values, display } = parsed;
    const hardwareText = decodeAsciiRun(bytes, HARDWARE_VERSION_OFFSET, 16);
    const escTypeText = decodeAsciiRun(bytes, ESC_TYPE_OFFSET, 16);
    const layout = selectItemLayout(hardwareText, escTypeText);

    // Clear every possible item key first -- only the ones in this hardware's layout should
    // end up present, so ParameterForm (gated on `apikey in escState.values`) hides the rest.
    for (const key of Object.keys(ITEM_META)) {
        Reflect.deleteProperty(values, key);
        Reflect.deleteProperty(display, key);
    }

    for (const [key, itemIndex] of Object.entries(layout)) {
        const offset = ITEM_REGION_START + itemIndex - 1;
        const raw = bytes[offset] ?? 0;
        values[key] = raw;
        const meta = ITEM_META[key];
        display[key] = meta.enum ? meta.enum[raw] : raw;
    }

    return parsed;
}

function buildWritePayload(displayValues, previousRawBytes) {
    const bytes = previousRawBytes ? Uint8Array.from(previousRawBytes) : new Uint8Array(ITEM_REGION_START);
    const hardwareText = decodeAsciiRun(bytes, HARDWARE_VERSION_OFFSET, 16);
    const escTypeText = decodeAsciiRun(bytes, ESC_TYPE_OFFSET, 16);
    const layout = selectItemLayout(hardwareText, escTypeText);

    for (const [key, itemIndex] of Object.entries(layout)) {
        if (!(key in displayValues)) continue;
        const offset = ITEM_REGION_START + itemIndex - 1;
        const meta = ITEM_META[key];
        const raw = meta.enum ? meta.enum.indexOf(displayValues[key]) : Math.round(displayValues[key]);
        bytes[offset] = raw;
    }

    return bytes;
}

// Ported from escmfg/hw5/init.lua's getEscModel/getEscVersion/getEscFirmware: these three ASCII
// header fields are already parsed as raw byte ranges above.
function describeEsc(values) {
    const firmware = values.firmware_version ? decodeAsciiRun(values.firmware_version, 0, values.firmware_version.length).trim() : "";
    const model = values.esc_type ? decodeAsciiRun(values.esc_type, 0, values.esc_type.length).trim() : "";
    return [model || "Hobbywing V5", firmware].filter(Boolean).join(" ");
}

// Verbatim from ESC_PARAMETERS_HW5.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    253, 0,
    32, 32, 32, 80, 76, 45, 48, 52, 46, 49, 46, 48, 50, 32, 32, 32, // firmware_version
    72, 87, 49, 49, 48, 54, 95, 86, 49, 48, 48, 52, 53, 54, 78, 66, // hardware_version
    80, 108, 97, 116, 105, 110, 117, 109, 95, 86, 53, 32, 32, 32, 32, 32, // esc_type
    80, 108, 97, 116, 105, 110, 117, 109, 32, 86, 53, 32, 32, 32, 32, // mode_name
    0, // flight_mode
    0, // lipo_cell_count
    0, // volt_cutoff_type
    3, // cutoff_voltage
    0, // bec_voltage
    11, // startup_time
    1, // response_time
    6, // gov_p_gain
    5, // gov_i_gain
    25, // auto_restart
    1, // restart_time
    0, // brake_type
    0, // brake_force
    24, // timing
    0, // rotation
    0, // active_freewheel
    2, // startup_power
];

const hw5 = {
    id: "hw5",
    name: "Hobbywing V5",
    group: "native",
    signature: 0xFD,
    escSensorProtocolIds: [3],
    fields,
    pages,
    parseRead,
    buildWritePayload,
    simResponse,
    describeEsc,
};

registerManufacturer(hw5);

export default hw5;

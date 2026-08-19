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

import { registerManufacturer } from "./registry.js";

const escMode = ["Free (Attention!)", "Heli Ext Governor", "Heli Governor", "Heli Governor Store", "Aero Glider", "Aero Motor", "Aero F3A"];
const rotation = ["Normal", "Reverse"];
const cutoff = ["Off", "Slowdown", "Cutoff"];
const cutoffVoltage = ["2.9 V", "3.0 V", "3.1 V", "3.2 V", "3.3 V", "3.4 V"];
const offOn = ["Off", "On"];
const throttleResponse = ["Slow", "Medium", "Fast", "Custom (PC Defined)"];
const motorTiming = ["Auto Normal", "Auto Efficient", "Auto Power", "Auto Extreme", "0°", "6°", "12°", "18°", "24°", "30°"];
const freewheel = ["Off", "Auto", "*Unused*", "Always On"];

const fields = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    { key: "esc_model", type: "U8" },
    { key: "esc_version", type: "U8" },
    { key: "governor", type: "U16", enum: escMode },
    { key: "lv_bec_voltage", type: "U16", min: 55, max: 84, unit: "v", scale: 10 },
    { key: "timing", type: "U16", enum: motorTiming },
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

const pages = [
    {
        title: "Basic",
        fields: [
            { apikey: "governor", label: "ESC Mode" },
            { apikey: "direction", label: "Direction" },
            { apikey: "lv_bec_voltage", label: "BEC" },
            { apikey: "f3cauto", label: "F3C Autorotation" },
            { apikey: "keepmah", label: "Keep mAh Count" },
            { apikey: "bec12v", label: "12V BEC" },
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
const escTypeLabels = {
    848: "YGE 35 LVT BEC",
    1616: "YGE 65 LVT BEC",
    2128: "YGE 85 LVT BEC",
    2384: "YGE 95 LVT BEC",
    4944: "YGE 135 LVT BEC",
    2304: "YGE 90 HVT Opto",
    4608: "YGE 120 HVT Opto",
    5712: "YGE 165 HVT",
    8272: "YGE 205 HVT",
    8273: "YGE 205 HVT BEC",
    4177: "YGE Aureus 105",
    4179: "YGE Aureus 105v2",
    5025: "YGE Aureus 135",
    5027: "YGE Aureus 135v2",
    5457: "YGE Saphir 155",
    5459: "YGE Saphir 155v2",
    4689: "YGE Saphir 125",
    4928: "YGE Opto 135",
    9552: "YGE Opto 255",
    16464: "YGE Opto 405",
};

function describeEsc(values) {
    const parts = [];
    if (values.esc_type != null) {
        parts.push(escTypeLabels[values.esc_type] ?? `YGE ESC (${values.esc_type})`);
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
];

const yge = {
    id: "yge",
    name: "YGE",
    group: "native",
    signature: 0xA5,
    escSensorProtocolIds: [9],
    fields,
    pages,
    simResponse,
    describeEsc,
};

registerManufacturer(yge);

export default yge;

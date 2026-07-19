// Ported from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_XDFLY.lua
// and escmfg/xdfly/{init.lua,pages/*.lua}. Group B (native MSP, no target-switch handshake).
//
// OMP/XDFly/ZTW happen to share a byte-identical FIELD_SPEC in the Lua source (confirmed by
// diffing), but each gets its own self-contained file here rather than a shared factory, since
// they're independent ESC families that may diverge over time.

import { registerManufacturer } from "./registry.js";

const govMode = ["ESC Governor", "External Governor", "Fixed Wing"];
const lowVoltage = ["Off", "2.7V", "3.0V", "3.2V", "3.4V", "3.6V", "3.8V"];
const timingMode = ["Auto", "Low", "Medium", "High"];
const becLvVoltage = ["6.0V", "7.4V", "8.4V"];
const motorDirection = ["CW", "CCW"];
const accel = ["Fast", "Normal", "Slow", "Very Slow"];
const autoRestart = ["Off", "90s"];
const becHvVoltage = Array.from({ length: 31 }, (_, i) => `${(6.0 + i * 0.2).toFixed(1)}V`);
const startupPower = ["Low", "Medium", "High"];
const brakeType = ["Normal", "Reverse"];
const srFunc = ["On", "Off"];
const ledColor = ["Red", "YELLOW", "ORANGE", "GREEN", "JADE GREEN", "BLUE", "CYAN", "PURPLE", "PINK", "WHITE"];
const fanControl = ["On", "Off"];

const ACTIVE_FIELD_MASK = "activefields";

const fields = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    { key: "esc_model", type: "U8" },
    { key: "esc_version", type: "U8" },
    { key: "governor", type: "U16", enum: govMode, activeFieldBit: 1, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "cell_cutoff", type: "U16", enum: lowVoltage, activeFieldBit: 10, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "timing", type: "U16", enum: timingMode, activeFieldBit: 3, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "lv_bec_voltage", type: "U16", enum: becLvVoltage, activeFieldBit: 4, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "motor_direction", type: "U16", enum: motorDirection, activeFieldBit: 5, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "gov_p", type: "U16", min: 1, max: 10, default: 5, offset: 1, activeFieldBit: 5, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "gov_i", type: "U16", min: 1, max: 10, default: 5, offset: 1, activeFieldBit: 6, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "acceleration", type: "U16", enum: accel, activeFieldBit: 8, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "auto_restart_time", type: "U16", enum: autoRestart, activeFieldBit: 9, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "hv_bec_voltage", type: "U16", enum: becHvVoltage, activeFieldBit: 10, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "startup_power", type: "U16", enum: startupPower, activeFieldBit: 11, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "brake_type", type: "U16", enum: brakeType },
    { key: "brake_force", type: "U16", min: 0, max: 100, default: 0, unit: "%", activeFieldBit: 13, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "sr_function", type: "U16", enum: srFunc, activeFieldBit: 14, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "capacity_correction", type: "U16", min: 0, max: 20, default: 10, unit: "%", offset: -10, activeFieldBit: 15, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "motor_poles", type: "U16", min: 1, max: 55, default: 10, offset: 1, activeFieldBit: 16, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "led_color", type: "U16", enum: ledColor, activeFieldBit: 17, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "smart_fan", type: "U16", enum: fanControl, activeFieldBit: 18, activeFieldMask: ACTIVE_FIELD_MASK },
    { key: "activefields", type: "U32" },
];

const pages = [
    {
        title: "Basic",
        fields: [
            { apikey: "lv_bec_voltage", label: "LV BEC Voltage" },
            { apikey: "hv_bec_voltage", label: "HV BEC Voltage" },
            { apikey: "motor_direction", label: "Motor Direction" },
            { apikey: "startup_power", label: "Startup Power" },
            { apikey: "led_color", label: "LED Color" },
            { apikey: "smart_fan", label: "Smart Fan" },
        ],
    },
    {
        title: "Advanced",
        fields: [
            { apikey: "timing", label: "Timing" },
            { apikey: "acceleration", label: "Acceleration" },
            { apikey: "brake_type", label: "Brake Type" },
            { apikey: "brake_force", label: "Brake Force" },
            { apikey: "sr_function", label: "SR Function" },
            { apikey: "capacity_correction", label: "Capacity Correction" },
            { apikey: "auto_restart_time", label: "Auto Restart Time" },
            { apikey: "cell_cutoff", label: "Cell Cutoff" },
        ],
    },
    {
        title: "Governor",
        fields: [
            { apikey: "governor", label: "Governor" },
            { apikey: "gov_p", label: "Gov-P" },
            { apikey: "gov_i", label: "Gov-I" },
            { apikey: "motor_poles", label: "Motor Poles" },
        ],
    },
];

// Ported from escmfg/xdfly/init.lua's getEscModel/getEscFirmware: the "model" byte is actually
// the raw esc_version field (a 1-based index into this capacity table), and the "firmware"
// is the esc_model field's raw byte split into hi/lo nibbles -- the Lua source's field naming
// and its header meaning are swapped, so this reads values.esc_version for capacity and
// values.esc_model for firmware, not the other way around.
const escCapacityLabels = ["RESERVED", "35A", "65A", "85A", "125A", "155A", "130A", "195A", "300A"];

function describeEsc(values) {
    const capacity = escCapacityLabels[(values.esc_version ?? 0) - 1] ?? "UNKNOWN";
    const parts = ["XDFLY", capacity];
    if (values.esc_model != null) parts.push(`SW${values.esc_model >> 4}.${values.esc_model & 0xF}`);
    return parts.join(" ");
}

// Verbatim from ESC_PARAMETERS_XDFLY.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    166, 0, 23, 3,
    0, 0, // governor
    0, 0, // cell_cutoff
    0, 0, // timing
    0, 0, // lv_bec_voltage
    0, 0, // motor_direction
    4, 0, // gov_p
    3, 0, // gov_i
    0, 0, // acceleration
    0, 0, // auto_restart_time
    0, 0, // hv_bec_voltage
    0, 0, // startup_power
    0, 0, // brake_type
    0, 0, // brake_force
    0, 0, // sr_function
    0, 0, // capacity_correction
    9, 0, // motor_poles
    0, 0, // led_color
    0, 0, // smart_fan
    238, 255, 1, 0, // activefields
];

const xdfly = {
    id: "xdfly",
    name: "XDFLY",
    group: "native",
    signature: 0xA6,
    escSensorProtocolIds: [12],
    fields,
    pages,
    simResponse,
    describeEsc,
};

registerManufacturer(xdfly);

export default xdfly;

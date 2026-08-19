// Ported verbatim from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_FLYROTOR.lua
// and escmfg/flrtr/{init.lua,pages/*.lua}. Group B (native MSP, no target-switch handshake).
// Fields from active_freewheel through battery_capacity only exist on firmware/api>=22.0.0 in
// the Lua source; here they're simply mandatory:false so the engine's buffer-length-driven
// "present" detection (engine.js parseBuffer) handles older ESCs that omit the trailing bytes,
// rather than needing an explicit api-version gate.
//
// Note: the Lua "Other" page additionally hides its first 5 fields for the specific
// "FLYROTOR 150A" hardware model (escmfg/flrtr/pages/esc_other.lua:31-46) -- not replicated
// here as a first pass; all fields are always shown.

import { registerManufacturer } from "./registry.js";

const escMode = ["ESC Governor", "Linear Throttle", "RF Gyro Governor"];
const becVoltage = ["Disabled", "7.5V", "8.0V", "8.5V", "12.0V"];
const electricalAngle = ["Automatic", "1°", "2°", "3°", "4°", "5°", "6°", "7°", "8°", "9°", "10°"];
const motorDirection = ["Normal", "Reversed"];
const fanControl = ["Temp Control", "Always On", "Always Off"];
const disabledEnabled = ["Disabled", "Enabled"];
const throttleProtocol = ["PWM", "DShot", "Serial"];
const telemetryProtocol = ["FLYROTOR"];
const tblLed = [
    "CUSTOM", "OFF", "RED", "GREEN", "BLUE", "YELLOW", "MAGENTA", "CYAN", "WHITE", "ORANGE",
    "GRAY", "MAROON", "DARK_GREEN", "NAVY", "PURPLE", "TEAL", "SILVER", "PINK", "GOLD", "BROWN",
    "LIGHT_BLUE", "FL_PINK", "FL_ORANGE", "FL_LIME", "FL_MINT", "FL_CYAN", "FL_PURPLE",
    "FL_HOT_PINK", "FL_LIGHT_YELLOW", "FL_AQUAMARINE", "FL_GOLD", "FL_DEEP_PINK",
    "FL_NEON_GREEN", "FL_ORANGE_RED",
];

const fields = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    { key: "esc_type", type: "U8" },
    { key: "esc_model", type: "U16", byteorder: "big" },
    { key: "esc_sn", type: "U64" },
    { key: "esc_iap", type: "U24" },
    { key: "esc_fw", type: "U24" },
    { key: "esc_hardware", type: "U8" },
    { key: "throttle_min", type: "U16", byteorder: "big" },
    { key: "throttle_max", type: "U16", byteorder: "big" },
    { key: "esc_mode", type: "U8", enum: escMode },
    { key: "cell_count", type: "U8", min: 4, max: 14, default: 6 },
    { key: "low_voltage_protection", type: "U8", min: 28, max: 38, default: 30, unit: "V", scale: 10 },
    { key: "temperature_protection", type: "U8", min: 50, max: 135, default: 125, unit: "°" },
    { key: "bec_voltage", type: "U8", enum: becVoltage },
    { key: "electrical_angle", type: "U8", enum: electricalAngle },
    { key: "motor_direction", type: "U8", enum: motorDirection },
    { key: "starting_torque", type: "U8", min: 1, max: 15, default: 3 },
    { key: "response_speed", type: "U8", min: 1, max: 15, default: 5 },
    { key: "buzzer_volume", type: "U8", min: 1, max: 5, default: 2 },
    { key: "current_gain", type: "S8", min: 0, max: 40, default: 20, offset: -20 },
    { key: "fan_control", type: "U8", enum: fanControl },
    { key: "soft_start", type: "U8", min: 5, max: 55, default: 15, unit: "s" },
    { key: "auto_restart_time", type: "U8", min: 0, max: 100, default: 30, unit: "s" },
    { key: "restart_acc", type: "U8", min: 1, max: 10, default: 5 },
    { key: "gov_p", type: "U8", min: 0, max: 100, default: 45 },
    { key: "gov_i", type: "U8", min: 0, max: 100, default: 35 },
    { key: "active_freewheel", type: "U8", min: 0, max: 1, enum: disabledEnabled, mandatory: false },
    { key: "drive_freq", type: "U8", min: 10, max: 24, default: 16, unit: "KHz" },
    { key: "motor_erpm_max", type: "U24", min: 0, max: 1000000, uiStep: 100, byteorder: "big" },
    { key: "throttle_protocol", type: "U8", enum: throttleProtocol, mandatory: false },
    { key: "telemetry_protocol", type: "U8", enum: telemetryProtocol, mandatory: false },
    { key: "led_color_index", type: "U8", enum: tblLed, mandatory: false },
    { key: "led_color_rgb", type: "U24", mandatory: false },
    { key: "motor_temp_sensor", type: "U8", enum: disabledEnabled, mandatory: false },
    { key: "motor_temp", type: "U8", min: 50, max: 150, unit: "°", mandatory: false },
    { key: "battery_capacity", type: "U16", min: 0, max: 50000, unit: "mAh", uiStep: 100, byteorder: "big", mandatory: false },
];

const pages = [
    {
        title: "General",
        fields: [
            { apikey: "cell_count", label: "LiPo Cell Count" },
            { apikey: "low_voltage_protection", label: "Low Voltage Limit" },
            { apikey: "temperature_protection", label: "Temperature Limit" },
            { apikey: "bec_voltage", label: "SBEC Voltage" },
            { apikey: "electrical_angle", label: "Electrical Angle" },
            { apikey: "motor_direction", label: "Motor Direction" },
            { apikey: "starting_torque", label: "Starting Power" },
            { apikey: "response_speed", label: "Response Speed" },
            { apikey: "buzzer_volume", label: "Beeper Volume" },
            { apikey: "current_gain", label: "Current Gain" },
            { apikey: "fan_control", label: "Cooling Fan Mode" },
        ],
    },
    {
        title: "Advanced",
        fields: [
            { apikey: "auto_restart_time", label: "Auto Bailout Time" },
            { apikey: "restart_acc", label: "Auto Bailout Accel" },
            { apikey: "active_freewheel", label: "Active Freewheeling" },
            { apikey: "drive_freq", label: "Drive Frequency" },
        ],
    },
    {
        title: "Governor",
        fields: [
            { apikey: "esc_mode", label: "ESC Mode" },
            { apikey: "soft_start", label: "Soft Start Time" },
            { apikey: "gov_p", label: "Governor P" },
            { apikey: "gov_i", label: "Governor I" },
            { apikey: "motor_erpm_max", label: "Maximum Motor ERPM" },
        ],
    },
    {
        title: "Other",
        fields: [
            { apikey: "throttle_protocol", label: "Throttle Protocol" },
            { apikey: "telemetry_protocol", label: "Telemetry Protocol" },
            { apikey: "led_color_index", label: "LED Color" },
            { apikey: "motor_temp_sensor", label: "Motor Temperture Sensor" },
            { apikey: "motor_temp", label: "Motor Temperture Limit" },
            { apikey: "battery_capacity", label: "Capacity Limit" },
        ],
    },
];

// Ported from escmfg/flrtr/init.lua's getEscModel/getEscFirmware: esc_iap/esc_fw are parsed
// here as combined little-endian U24s, but the Lua source prints their 3 raw bytes individually
// as version components -- decompose back into bytes to match (esc_sn's serial-number half of
// the Lua header is skipped: the reference indices there {13,12,11,9} repeat byte 9, an
// upstream transcription bug that produces a meaningless value).
function describeEsc(values) {
    if (values.esc_model == null) return "FLYROTOR";
    const iap = values.esc_iap ?? 0;
    const fw = values.esc_fw ?? 0;
    const hw = values.esc_hardware ?? 0;
    const iapStr = `${iap & 0xFF}.${(iap >> 8) & 0xFF}.${(iap >> 16) & 0xFF}`;
    const fwStr = `${fw & 0xFF}.${(fw >> 8) & 0xFF}.${(fw >> 16) & 0xFF}`;
    return `FLYROTOR ${values.esc_model}A 1.${hw}/${iapStr} ${fwStr}`;
}

// Verbatim from ESC_PARAMETERS_FLYROTOR.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    115, 0, 0,
    1, 24, // esc_model
    231, 79, 190, 216, 78, 29, 169, 244, // esc_sn
    1, 0, 0, // esc_iap
    1, 0, 1, // esc_fw
    0, // esc_hardware
    4, 76, // throttle_min
    7, 148, // throttle_max
    0, // esc_mode
    6, // cell_count
    30, // low_voltage_protection
    125, // temperature_protection
    1, // bec_voltage
    0, // electrical_angle
    0, // motor_direction
    3, // starting_torque
    5, // response_speed
    1, // buzzer_volume
    20, // current_gain
    0, // fan_control
    15, // soft_start
    15, // auto_restart_time
    15, // restart_acc
    45, // gov_p
    35, // gov_i
    0, // active_freewheel
    16, // drive_freq
    1, 255, 184, // motor_erpm_max
    0, // throttle_protocol
    0, // telemetry_protocol
    3, // led_color_index
    0, 0, 0, // led_color_rgb
    0, // motor_temp_sensor
    100, // motor_temp
    0, 0, // battery_capacity
];

const flyrotor = {
    id: "flrtr",
    name: "FLYROTOR",
    group: "native",
    signature: 0x73,
    escSensorProtocolIds: [10],
    fields,
    pages,
    simResponse,
    describeEsc,
};

registerManufacturer(flyrotor);

export default flyrotor;

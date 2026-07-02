// Ported verbatim from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_AM32.lua
// and escmfg/am32/{init.lua,pages/*.lua}. Group A (bootloader-bridged via
// MSP_SET_4WIF_ESC_FWD_PROG, needs the target-switch handshake in handshake.js).
//
// 7 fields (timing_advance, motor_kv, servo_low_threshold, servo_high_threshold,
// servo_neutral, low_voltage_threshold, current_limit) use hand-rolled scale/offset math in
// the Lua source instead of the declarative FIELD_SPEC scale/offset columns, so they're
// handled here via parseRead/buildWritePayload overrides rather than generic field metadata.

import { computeLayout, writeRawField, buildPayload } from "../engine.js";
import { registerManufacturer } from "./registry.js";

const motorDirection = ["Normal", "Reversed"];
const timingAdvanceLabels = ["0°", "7.5°", "15°", "22.5°"];
const onOff = ["Off", "On"];
const protocolEnum = ["Auto", "Dshot 300-600", "Servo 1-2ms", "Serial", "BF Safe Arming"];
const brakeOnStop = ["Off", "Brake", "Active Brake"];
const variablePwm = ["Fixed", "Variable", "By RPM"];
const lowVoltageCutoff = ["Off", "Cell Based", "Absolute"];

const fields = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    { key: "reserved_0", type: "U8" },
    { key: "eeprom_version", type: "U8" },
    { key: "reserved_1", type: "U8" },
    { key: "version_major", type: "U8" },
    { key: "version_minor", type: "U8" },
    { key: "max_ramp", type: "U8" },
    { key: "minimum_duty_cycle", type: "U8" },
    { key: "disable_stick_calibration", type: "U8" },
    { key: "absolute_voltage_cutoff", type: "U8" },
    { key: "current_p", type: "U8" },
    { key: "current_i", type: "U8" },
    { key: "current_d", type: "U8" },
    { key: "active_brake_power", type: "U8" },
    { key: "reserved_eeprom_3_0", type: "U8" },
    { key: "reserved_eeprom_3_1", type: "U8" },
    { key: "reserved_eeprom_3_2", type: "U8" },
    { key: "reserved_eeprom_3_3", type: "U8" },
    { key: "motor_direction", type: "U8", enum: motorDirection },
    { key: "bidirectional_mode", type: "U8", enum: onOff },
    { key: "sinusoidal_startup", type: "U8", enum: onOff },
    { key: "complementary_pwm", type: "U8", enum: onOff },
    { key: "variable_pwm_frequency", type: "U8", enum: variablePwm },
    { key: "stuck_rotor_protection", type: "U8", enum: onOff },
    { key: "timing_advance", type: "U8", enum: timingAdvanceLabels }, // custom dual encoding, see below
    { key: "pwm_frequency", type: "U8", min: 8, max: 144, unit: "kHz" },
    { key: "startup_power", type: "U8", min: 50, max: 150, default: 100, unit: "%" },
    { key: "motor_kv", type: "U8", min: 20, max: 10220, unit: "KV", uiStep: 40 }, // custom: raw*40+20
    { key: "motor_poles", type: "U8", min: 2, max: 36, default: 14 },
    { key: "brake_on_stop", type: "U8", enum: brakeOnStop },
    { key: "stall_protection", type: "U8", enum: onOff },
    { key: "beep_volume", type: "U8", min: 0, max: 11, default: 10 },
    { key: "interval_telemetry", type: "U8", enum: onOff },
    { key: "servo_low_threshold", type: "U8", min: 750, max: 1250, unit: "us", uiStep: 2 }, // custom: raw*2+750
    { key: "servo_high_threshold", type: "U8", min: 1750, max: 2250, unit: "us", uiStep: 2 }, // custom: raw*2+1750
    { key: "servo_neutral", type: "U8", min: 1374, max: 1630, unit: "us" }, // custom: raw+1374
    { key: "servo_dead_band", type: "U8", min: 0, max: 100 },
    { key: "low_voltage_cutoff", type: "U8", enum: lowVoltageCutoff },
    { key: "low_voltage_threshold", type: "U8", min: 250, max: 350, unit: "cV" }, // custom: raw+250
    { key: "rc_car_reversing", type: "U8", enum: onOff },
    { key: "use_hall_sensors", type: "U8", enum: onOff },
    { key: "sine_mode_range", type: "U8", min: 5, max: 25 },
    { key: "brake_strength", type: "U8", min: 0, max: 10, default: 0 },
    { key: "running_brake_level", type: "U8", min: 0, max: 10, default: 0 },
    { key: "temperature_limit", type: "U8", min: 70, max: 141, unit: "C" },
    { key: "current_limit", type: "U8", min: 0, max: 202, uiStep: 2 }, // custom: raw*2
    { key: "sine_mode_power", type: "U8", min: 1, max: 10 },
    { key: "esc_protocol", type: "U8", enum: protocolEnum },
    { key: "auto_advance", type: "U8", enum: onOff },
];

const pages = [
    {
        title: "Basic",
        fields: [
            { apikey: "motor_direction", label: "Direction" },
            { apikey: "motor_kv", label: "Motor KV" },
            { apikey: "motor_poles", label: "Motor Poles" },
            { apikey: "startup_power", label: "Startup Power" },
            { apikey: "brake_on_stop", label: "Brake on Stop" },
            { apikey: "brake_strength", label: "Brake Strength" },
            { apikey: "running_brake_level", label: "Running Brake" },
            { apikey: "beep_volume", label: "Beep Volume" },
        ],
    },
    {
        title: "Advanced",
        fields: [
            { apikey: "timing_advance", label: "Timing" },
            { apikey: "stuck_rotor_protection", label: "Stuck Rotor Protection" },
            { apikey: "sinusoidal_startup", label: "Sinusoidal Startup" },
            { apikey: "sine_mode_power", label: "Sine Power Mode" },
            { apikey: "sine_mode_range", label: "Sine Mode Range" },
            { apikey: "bidirectional_mode", label: "Bidirectional Mode" },
            { apikey: "esc_protocol", label: "Protocol" },
            { apikey: "stall_protection", label: "Stall Protection" },
            { apikey: "interval_telemetry", label: "Telemetry Interval" },
            { apikey: "auto_advance", label: "Auto Advance" },
            { apikey: "complementary_pwm", label: "Complementary PWM" },
            { apikey: "variable_pwm_frequency", label: "Variable PWM Frequency" },
            { apikey: "pwm_frequency", label: "PWM Frequency" },
        ],
    },
    {
        title: "Limits",
        fields: [
            { apikey: "temperature_limit", label: "Temperature Limit" },
            { apikey: "current_limit", label: "Current Limit" },
            { apikey: "low_voltage_cutoff", label: "Low Voltage Cutoff" },
            { apikey: "low_voltage_threshold", label: "Low Voltage Threshold" },
            { apikey: "servo_low_threshold", label: "Servo Low Threshold" },
            { apikey: "servo_high_threshold", label: "Servo High Threshold" },
            { apikey: "servo_neutral", label: "Servo Neutral" },
            { apikey: "servo_dead_band", label: "Servo Dead Band" },
            { apikey: "rc_car_reversing", label: "RC Car Reversing" },
            { apikey: "use_hall_sensors", label: "Use Hall Sensors" },
        ],
    },
];

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// raw 10-42 => "new" encoding (n*8+10), raw 0-3 => "legacy" encoding (direct index). The
// encoding actually in use is auto-detected from the read value and must be reused on write.
function normalizeTimingAdvance(raw) {
    if (raw == null) return { display: undefined, encoding: "unknown" };
    if (raw >= 10 && raw <= 42) {
        return { display: clamp(Math.round((raw - 10) / 8), 0, 3), encoding: "new" };
    }
    if (raw >= 0 && raw <= 3) {
        return { display: raw, encoding: "legacy" };
    }
    return { display: clamp(Math.round(raw), 0, 3), encoding: "unknown" };
}

function encodeTimingAdvance(display, encoding) {
    const n = clamp(Math.round(display ?? 0), 0, 3);
    return encoding === "new" ? 10 + n * 8 : n;
}

const TIMING_ENCODING_KEY = "__am32_timing_advance_encoding";

const customFields = {
    timing_advance: {
        toDisplay: (raw) => normalizeTimingAdvance(raw).display,
        toRaw: (display, context) => encodeTimingAdvance(display, context.timingAdvanceEncoding),
    },
    motor_kv: {
        toDisplay: (raw) => raw * 40 + 20,
        toRaw: (display) => clamp(Math.round((display - 20) / 40), 0, 255),
    },
    servo_low_threshold: {
        toDisplay: (raw) => raw * 2 + 750,
        toRaw: (display) => clamp(Math.round((display - 750) / 2), 0, 255),
    },
    servo_high_threshold: {
        toDisplay: (raw) => raw * 2 + 1750,
        toRaw: (display) => clamp(Math.round((display - 1750) / 2), 0, 255),
    },
    servo_neutral: {
        toDisplay: (raw) => raw + 1374,
        toRaw: (display) => clamp(Math.round(display - 1374), 0, 255),
    },
    low_voltage_threshold: {
        toDisplay: (raw) => raw + 250,
        toRaw: (display) => clamp(Math.round(display - 250), 0, 255),
    },
    current_limit: {
        toDisplay: (raw) => raw * 2,
        toRaw: (display) => clamp(Math.round(display / 2), 0, 255),
    },
};

function parseRead(parsed) {
    const { values, display } = parsed;
    for (const [key, transform] of Object.entries(customFields)) {
        if (values[key] == null) continue;
        display[key] = transform.toDisplay(values[key]);
    }
    display[TIMING_ENCODING_KEY] = normalizeTimingAdvance(values.timing_advance).encoding;
    return parsed;
}

function buildWritePayload(displayValues, previousRawBytes) {
    const context = { timingAdvanceEncoding: displayValues[TIMING_ENCODING_KEY] ?? "legacy" };

    // Let the generic engine handle every plain field; strip the custom ones so their
    // previous raw bytes round-trip untouched, then patch in the correctly-encoded bytes below.
    const genericValues = { ...displayValues };
    for (const key of Object.keys(customFields)) Reflect.deleteProperty(genericValues, key);
    Reflect.deleteProperty(genericValues, TIMING_ENCODING_KEY);

    const payload = buildPayload(fields, genericValues, previousRawBytes);

    const { fields: laidOut } = computeLayout(fields);
    for (const [key, transform] of Object.entries(customFields)) {
        if (!(key in displayValues)) continue;
        const field = laidOut.find((f) => f.key === key);
        writeRawField(payload, field.byteOffset, field, transform.toRaw(displayValues[key], context));
    }

    return payload;
}

// Ported from escmfg/am32/init.lua's getEscFirmware: AM32 has no model name in its response,
// so the header is just the tool name plus the raw version_major/version_minor bytes.
function describeEsc(values) {
    const parts = ["AM32"];
    if (values.version_major != null && values.version_minor != null) {
        parts.push(`SW${values.version_major}.${values.version_minor}`);
    }
    return parts.join(" ");
}

// Verbatim from ESC_PARAMETERS_AM32.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    194, 64, 1, 3, 1, 2, 19, 50, 1, 0, 10, 100, 0, 100, 0, 255, 255, 255, 255, 0, 0, 0, 0, 0,
    1, 26, 16, 50, 12, 24, 0, 1, 5, 0, 128, 128, 128, 50, 0, 50, 0, 0, 10, 10, 5, 145, 102, 7, 1, 0,
];

const am32 = {
    id: "am32",
    name: "AM32",
    group: "bridged",
    signature: 0xC2,
    escSensorProtocolIds: [1],
    fields,
    pages,
    parseRead,
    buildWritePayload,
    simResponse,
    describeEsc,
    handshake: {
        preSwitchDelayMs: 800,
        switchReadDelayMs: 4000,
        pollIntervalMs: 600,
        retryIntervalMs: 1200,
        detectTimeoutMs: 20000,
        readSwitchRetryCount: 3,
        readSwitchRetryDelayMs: 250,
        postSaveSwitchCycle: true,
        postSaveSettleDelayMs: 1000,
        postSaveSwitchRetryCount: 1,
        postSaveSwitchRetryDelayMs: 750,
        postSaveReturnTargetDelayMs: 1000,
        postSaveFlushRead: false,
        postSaveFlushReadDelayMs: 350,
    },
};

registerManufacturer(am32);

export default am32;

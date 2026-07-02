// Ported verbatim from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_BLHELI_S.lua
// and escmfg/blheli_s/{init.lua,pages/*.lua}. Group A (bootloader-bridged, shares esc_signature
// 0xC1 with Bluejay -- disambiguated by main_revision === 16, see disambiguate() below).
//
// The 3 ppm_*_throttle fields use a parseRead/buildWritePayload override (raw*4+1000) mirroring
// the Lua source's normalizePpm/encodePpm exactly, rather than expressing it via generic
// scale/offset metadata -- the Lua FIELD_SPEC declares these fields' min/max already in
// display-space (1000-2020us) with no scale/offset set, so replicating the override keeps the
// min/max numbers directly usable without an extra raw<->display bounds conversion.

import { buildPayload, computeLayout, writeRawField } from "../engine.js";
import { registerManufacturer } from "./registry.js";

const onOff = ["Off", "On"];
const startupPowerEnum = ["0.031", "0.047", "0.063", "0.094", "0.125", "0.188", "0.25", "0.38", "0.50", "0.75", "1.00", "1.25", "1.50"];
const motorDirection = ["Normal", "Reversed", "Forward/Reverse (3D)", "Forward/Reverse (3D) Rev"];
const commutationTiming = ["Low", "Medium Low", "Medium", "Medium High", "High"];
const demagCompensation = ["Off", "Low", "High"];
const beaconDelay = ["1 minute", "2 minutes", "5 minutes", "10 minutes", "Infinite"];
const temperatureProtection = ["Disabled", "80C", "90C", "100C", "110C", "120C", "130C", "140C"];

const reservedFields = [];
for (let i = 0x29; i <= 0x3f; i++) {
    reservedFields.push({ key: `reserved_${i.toString(16)}`, type: "U8" });
}

const fields = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    { key: "main_revision", type: "U8" },
    { key: "sub_revision", type: "U8" },
    { key: "layout_revision", type: "U8" },
    { key: "p_gain", type: "U8" },
    { key: "i_gain", type: "U8" },
    { key: "governor_mode", type: "U8" },
    { key: "low_voltage_limit", type: "U8" },
    { key: "motor_gain", type: "U8" },
    { key: "motor_idle", type: "U8" },
    { key: "startup_power", type: "U8", enum: startupPowerEnum },
    { key: "pwm_frequency", type: "U8" },
    { key: "motor_direction", type: "U8", enum: motorDirection },
    { key: "input_pwm_polarity", type: "U8" },
    { key: "mode_raw", type: "U16" },
    { key: "programming_by_tx", type: "U8", enum: onOff },
    { key: "rearm_at_start", type: "U8" },
    { key: "governor_setup_target", type: "U8" },
    { key: "startup_rpm", type: "U8" },
    { key: "startup_acceleration", type: "U8" },
    { key: "volt_comp", type: "U8" },
    { key: "commutation_timing", type: "U8", enum: commutationTiming },
    { key: "damping_force", type: "U8" },
    { key: "governor_range", type: "U8" },
    { key: "startup_method", type: "U8" },
    { key: "ppm_min_throttle", type: "U8", min: 1000, max: 1500, uiStep: 4, unit: "us" }, // custom: raw*4+1000
    { key: "ppm_max_throttle", type: "U8", min: 1504, max: 2020, uiStep: 4, unit: "us" }, // custom: raw*4+1000
    { key: "beep_strength", type: "U8", min: 1, max: 255 },
    { key: "beacon_strength", type: "U8", min: 1, max: 255 },
    { key: "beacon_delay", type: "U8", enum: beaconDelay },
    { key: "throttle_rate", type: "U8" },
    { key: "demag_compensation", type: "U8", enum: demagCompensation },
    { key: "bec_voltage", type: "U8" },
    { key: "ppm_center_throttle", type: "U8", min: 1000, max: 2020, uiStep: 4, unit: "us" }, // custom: raw*4+1000
    { key: "spoolup_time", type: "U8" },
    { key: "temperature_protection", type: "U8", enum: temperatureProtection },
    { key: "low_rpm_power_protection", type: "U8", enum: onOff },
    { key: "pwm_input", type: "U8" },
    { key: "pwm_dither", type: "U8" },
    { key: "brake_on_stop", type: "U8", enum: onOff },
    { key: "led_control", type: "U8" },
    ...reservedFields,
];

const pages = [
    {
        title: "Basic",
        fields: [
            { apikey: "motor_direction", label: "Motor Direction" },
            { apikey: "startup_power", label: "Startup Power" },
            { apikey: "commutation_timing", label: "Motor Timing" },
            { apikey: "demag_compensation", label: "Demag Compensation" },
            { apikey: "brake_on_stop", label: "Brake on Stop" },
        ],
    },
    {
        title: "Advanced",
        fields: [
            { apikey: "temperature_protection", label: "Temperature Protection" },
            { apikey: "low_rpm_power_protection", label: "Low RPM Power Protection" },
            { apikey: "beep_strength", label: "Beep Strength" },
            { apikey: "beacon_strength", label: "Beacon Strength" },
            { apikey: "beacon_delay", label: "Beacon Delay" },
            { apikey: "programming_by_tx", label: "Programming by TX" },
        ],
    },
    {
        title: "Input",
        fields: [
            { apikey: "ppm_min_throttle", label: "PPM Min Throttle" },
            { apikey: "ppm_max_throttle", label: "PPM Max Throttle" },
            { apikey: "ppm_center_throttle", label: "PPM Center Throttle" },
        ],
    },
];

const PPM_FIELDS = ["ppm_min_throttle", "ppm_max_throttle", "ppm_center_throttle"];

function normalizePpm(raw) {
    return raw == null ? undefined : raw * 4 + 1000;
}

function encodePpm(display) {
    return Math.min(Math.max(Math.round((display - 1000) / 4), 0), 255);
}

function parseRead(parsed) {
    const { values, display } = parsed;
    for (const key of PPM_FIELDS) {
        if (values[key] != null) display[key] = normalizePpm(values[key]);
    }
    return parsed;
}

function buildWritePayload(displayValues, previousRawBytes) {
    const generic = { ...displayValues };
    for (const key of PPM_FIELDS) Reflect.deleteProperty(generic, key);

    const payload = buildPayload(fields, generic, previousRawBytes);

    const { fields: laidOut } = computeLayout(fields);
    for (const key of PPM_FIELDS) {
        if (!(key in displayValues)) continue;
        const field = laidOut.find((f) => f.key === key);
        writeRawField(payload, field.byteOffset, field, encodePpm(displayValues[key]));
    }

    return payload;
}

// Verbatim from ESC_PARAMETERS_BLHELI_S.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    193, 0, 16, 7, 33, 255, 255, 255, 255, 255, 255, 9, 255, 1, 255, 85, 170, 1, 255, 255, 255,
    255, 255, 3, 255, 255, 255, 37, 208, 40, 80, 4, 255, 2, 255, 122, 255, 7, 1, 255, 255, 0, 0,
    255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    255, 255, 255, 255,
];

function disambiguate(bytes) {
    return bytes[2] === 16; // main_revision at byte offset 2 (after esc_signature, esc_command)
}

// Ported from escmfg/blheli_s/init.lua's getEscVersion/getEscFirmware.
function describeEsc(values) {
    const parts = ["BLHeli_S"];
    if (values.layout_revision != null) parts.push(`Revision ${values.layout_revision}`);
    if (values.main_revision != null && values.sub_revision != null) {
        parts.push(`FW${values.main_revision}.${values.sub_revision}`);
    }
    return parts.join(" ");
}

const blheliS = {
    id: "blheli_s",
    name: "BLHeli_S",
    group: "bridged",
    signature: 0xC1,
    disambiguate,
    escSensorProtocolIds: [1],
    fields,
    pages,
    parseRead,
    buildWritePayload,
    simResponse,
    describeEsc,
    handshake: {
        preSwitchDelayMs: 800,
        switchReadDelayMs: 5000,
        pollIntervalMs: 600,
        retryIntervalMs: 1200,
        detectTimeoutMs: 20000,
        readSwitchRetryCount: 3,
        readSwitchRetryDelayMs: 1500,
        postSaveSwitchCycle: true,
        postSaveSettleDelayMs: 1000,
        postSaveSwitchRetryCount: 1,
        postSaveSwitchRetryDelayMs: 750,
        postSaveReturnTargetDelayMs: 1000,
        postSaveFlushRead: false,
        postSaveFlushReadDelayMs: 350,
    },
};

registerManufacturer(blheliS);

export default blheliS;

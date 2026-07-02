// Ported verbatim from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_BLUEJAY.lua
// and escmfg/bluejay/{init.lua,pages/*.lua}. Group A (bootloader-bridged, shares esc_signature
// 0xC1 with BLHeli_S -- disambiguated by main_revision === 0).
//
// The most dynamically-typed of the 10: rpm_power_slope/startup_beep/braking_strength/
// pwm_frequency change their enum (or numeric-vs-enum shape entirely) based on the ESC's
// layout_revision byte, resolved per-parse rather than statically -- see resolveFieldMeta()
// and parseRead() below. pwm_frequency additionally remaps raw byte 192 to display value 0
// ("Dynamic") before the enum lookup, which isn't expressible as a table at all.
//
// Simplification: the Lua source also conditionally hides led_control based on an ASCII
// layout-name-prefix byte read from a fixed offset (escmfg/bluejay/init.lua:supportsLedControl);
// not replicated here -- led_control is always shown.

import { buildPayload, computeLayout, writeRawField, resolveEnumLabel } from "../engine.js";
import { registerManufacturer } from "./registry.js";

const motorDirection = ["Normal", "Reversed", "Forward/Reverse (3D)", "Forward/Reverse (3D) Rev"];
const commutationTiming = ["0 deg (Low)", "7.5 deg (Medium Low)", "15 deg (Medium)", "22.5 deg (Medium High)", "30 deg (High)"];
const demagCompensation = ["Off", "Low", "High"];
const beaconDelay = ["1 minute", "2 minutes", "5 minutes", "10 minutes", "Infinite"];
const temperatureProtection = ["Disabled", "80C", "90C", "100C", "110C", "120C", "130C", "140C"];
const powerRating = ["1S", "2S+"];
const offOn = ["Off", "On"];

const rampupStartPowerEthos = [
    [1, "0.5% (0.031)"], [7, "5% (0.25)"], [8, "7% (0.38)"], [9, "10% (0.50)"],
    [10, "15% (0.75)"], [11, "20% (1.00)"], [12, "24% (1.25)"], [13, "29% (1.50)"],
];
const rampupPowerEthos = [
    [1, "1x (More protection)"], [2, "2x"], [3, "3x"], [4, "4x"], [5, "5x"], [6, "6x"],
    [7, "7x"], [8, "8x"], [9, "9x"], [10, "10x"], [11, "11x"], [12, "12x"],
    [13, "13x (Less protection)"], [0, "Off"],
];
const startupBeepModeEthos = ["Off", "Normal", "Custom"];
const brakingModeEthos = ["Off", "Not during startup", "On"];
const pwmFrequencyEthos = [[24, "24kHz"], [48, "48kHz"], [96, "96kHz"]];
const pwmFrequencyDynamicEthos = [[24, "24kHz"], [48, "48kHz"], [96, "96kHz"], [0, "Dynamic"]];
const ledControlEthos = [
    [0x00, "Off"], [0x03, "Blue"], [0x0C, "Green"], [0x30, "Red"],
    [0x0F, "Cyan"], [0x33, "Magenta"], [0x3C, "Yellow"], [0x3F, "White"],
];

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
    { key: "reserved_03", type: "U8" },
    { key: "startup_power_min", type: "U8", min: 1000, max: 1125, uiStep: 5, unit: "" }, // custom
    { key: "startup_beep", type: "U8" }, // dynamic, see resolveFieldMeta
    { key: "dithering", type: "U8", enum: offOn },
    { key: "startup_power_max", type: "U8", min: 1004, max: 1300, uiStep: 4, unit: "" }, // custom
    { key: "reserved_08", type: "U8" },
    { key: "rpm_power_slope", type: "U8" }, // dynamic, see resolveFieldMeta
    { key: "pwm_frequency", type: "U8" }, // dynamic + raw192->0 remap, see parseRead/buildWritePayload
    { key: "motor_direction", type: "U8", enum: motorDirection },
    { key: "reserved_0c", type: "U8" },
    { key: "mode_raw", type: "U16" },
    { key: "reserved_0f", type: "U8" },
    { key: "braking_strength", type: "U8", min: 0, max: 255 }, // dynamic, see resolveFieldMeta
    { key: "reserved_11", type: "U8" },
    { key: "reserved_12", type: "U8" },
    { key: "reserved_13", type: "U8" },
    { key: "reserved_14", type: "U8" },
    { key: "commutation_timing", type: "U8", enum: commutationTiming },
    { key: "reserved_16", type: "U8" },
    { key: "reserved_17", type: "U8" },
    { key: "reserved_18", type: "U8" },
    { key: "reserved_19", type: "U8" },
    { key: "reserved_1a", type: "U8" },
    { key: "beep_strength", type: "U8", min: 0, max: 255 },
    { key: "beacon_strength", type: "U8", min: 0, max: 255 },
    { key: "beacon_delay", type: "U8", enum: beaconDelay },
    { key: "reserved_1e", type: "U8" },
    { key: "demag_compensation", type: "U8", enum: demagCompensation },
    { key: "reserved_20", type: "U8" },
    { key: "reserved_21", type: "U8" },
    { key: "reserved_22", type: "U8" },
    { key: "temperature_protection", type: "U8", enum: temperatureProtection },
    { key: "low_rpm_power_protection", type: "U8", enum: offOn },
    { key: "reserved_25", type: "U8" },
    { key: "reserved_26", type: "U8" },
    { key: "brake_on_stop", type: "U8", enum: offOn },
    { key: "led_control", type: "U8", enumMap: ledControlEthos },
    { key: "power_rating", type: "U8", enum: powerRating },
    { key: "force_edt_arm", type: "U8", enum: offOn },
    { key: "threshold_48to24", type: "U8", min: 0, max: 100, unit: "%" }, // custom
    { key: "threshold_96to48", type: "U8", min: 0, max: 100, unit: "%" }, // custom
    ...reservedFields,
];

const pages = [
    {
        title: "General",
        fields: [
            { apikey: "motor_direction", label: "Motor Direction" },
            { apikey: "rpm_power_slope", label: "Rampup Start Power", maxLayout: 200 },
            { apikey: "rpm_power_slope", label: "Rampup Power", minLayout: 201 },
            { apikey: "startup_power_min", label: "Min Startup Power" },
            { apikey: "startup_power_max", label: "Max Startup Power", minLayout: 201 },
            { apikey: "pwm_frequency", label: "PWM Frequency", visible: (lr) => lr === 205 || lr >= 209 },
        ],
    },
    {
        title: "Brake",
        fields: [
            { apikey: "commutation_timing", label: "Motor Timing" },
            { apikey: "demag_compensation", label: "Demag Compensation" },
            { apikey: "brake_on_stop", label: "Brake on Stop" },
            { apikey: "braking_strength", label: "Braking Mode", onlyLayout: 202 },
            { apikey: "braking_strength", label: "Braking Strength", minLayout: 204 },
            { apikey: "led_control", label: "LED Control" },
        ],
    },
    {
        title: "Beacon",
        fields: [
            { apikey: "beep_strength", label: "Beep Strength" },
            { apikey: "beacon_strength", label: "Beacon Strength" },
            { apikey: "beacon_delay", label: "Beacon Delay" },
            { apikey: "startup_beep", label: "Startup Beep", visible: (lr) => lr <= 202 || lr === 205 },
        ],
    },
    {
        title: "Other",
        fields: [
            { apikey: "temperature_protection", label: "Temperature Protection" },
            { apikey: "low_rpm_power_protection", label: "Low RPM Power Protection", maxLayout: 200 },
            { apikey: "power_rating", label: "Power Rating", minLayout: 206 },
            { apikey: "force_edt_arm", label: "Force EDT Arm", minLayout: 207 },
            { apikey: "dithering", label: "Dithering", maxLayout: 207 },
            { apikey: "threshold_96to48", label: "96kHz -> 48kHz Threshold", minLayout: 209 },
            { apikey: "threshold_48to24", label: "48kHz -> 24kHz Threshold", minLayout: 209 },
        ],
    },
];

const DYNAMIC_KEYS = new Set(["rpm_power_slope", "startup_beep", "braking_strength", "pwm_frequency"]);

function resolveDynamicMeta(key, layoutRevision) {
    switch (key) {
        case "rpm_power_slope":
            return layoutRevision === 200 ? { enumMap: rampupStartPowerEthos } : { enumMap: rampupPowerEthos };
        case "startup_beep":
            return layoutRevision === 205 ? { enum: startupBeepModeEthos } : { enum: offOn };
        case "braking_strength":
            return layoutRevision === 202 ? { enum: brakingModeEthos } : { min: 0, max: 255 };
        case "pwm_frequency":
            return layoutRevision >= 209 ? { enumMap: pwmFrequencyDynamicEthos } : { enumMap: pwmFrequencyEthos };
        default:
            return {};
    }
}

function resolveFieldMeta(field, values) {
    if (!DYNAMIC_KEYS.has(field.key)) return field;
    const layoutRevision = values?.layout_revision ?? 0;
    return {
        ...field,
        enum: undefined,
        enumMap: undefined,
        min: undefined,
        max: undefined,
        ...resolveDynamicMeta(field.key, layoutRevision),
    };
}

function labelToRaw(meta, label) {
    if (meta.enumMap) return meta.enumMap.find(([, text]) => text === label)?.[0];
    if (meta.enum) return meta.enum.indexOf(label);
    return label;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

const NUMERIC_CUSTOM_KEYS = ["startup_power_min", "startup_power_max", "threshold_48to24", "threshold_96to48"];

function normalizeNumeric(key, raw) {
    switch (key) {
        case "startup_power_min": return Math.round((raw * 1000) / 2047) + 1000;
        case "startup_power_max": return Math.round((raw * 1000) / 250) + 1000;
        case "threshold_48to24":
        case "threshold_96to48": return clamp(Math.round((raw * 100) / 255), 0, 100);
        default: return raw;
    }
}

function encodeNumeric(key, display) {
    switch (key) {
        case "startup_power_min": return clamp(Math.round(((display - 1000) * 2047) / 1000), 0, 255);
        case "startup_power_max": return clamp(Math.round(((display - 1000) * 250) / 1000), 0, 255);
        case "threshold_48to24":
        case "threshold_96to48": return clamp(Math.round((display * 255) / 100), 0, 255);
        default: return display;
    }
}

function parseRead(parsed) {
    const { values, display } = parsed;
    const layoutRevision = values.layout_revision ?? 0;

    for (const key of NUMERIC_CUSTOM_KEYS) {
        if (values[key] != null) display[key] = normalizeNumeric(key, values[key]);
    }

    if (values.pwm_frequency != null) {
        const intermediate = values.pwm_frequency === 192 ? 0 : values.pwm_frequency;
        const meta = resolveDynamicMeta("pwm_frequency", layoutRevision);
        display.pwm_frequency = resolveEnumLabel(meta, intermediate);
    }

    for (const key of ["rpm_power_slope", "startup_beep", "braking_strength"]) {
        if (values[key] == null) continue;
        const meta = resolveDynamicMeta(key, layoutRevision);
        display[key] = meta.enum || meta.enumMap ? resolveEnumLabel(meta, values[key]) : values[key];
    }

    return parsed;
}

function buildWritePayload(displayValues, previousRawBytes) {
    const layoutRevision = displayValues.layout_revision ?? 0;
    const customKeys = [...NUMERIC_CUSTOM_KEYS, "pwm_frequency", "rpm_power_slope", "startup_beep", "braking_strength"];

    const generic = { ...displayValues };
    for (const key of customKeys) Reflect.deleteProperty(generic, key);

    const payload = buildPayload(fields, generic, previousRawBytes);
    const { fields: laidOut } = computeLayout(fields);
    const fieldByKey = (key) => laidOut.find((f) => f.key === key);

    for (const key of NUMERIC_CUSTOM_KEYS) {
        if (!(key in displayValues)) continue;
        writeRawField(payload, fieldByKey(key).byteOffset, fieldByKey(key), encodeNumeric(key, displayValues[key]));
    }

    if ("pwm_frequency" in displayValues) {
        const meta = resolveDynamicMeta("pwm_frequency", layoutRevision);
        const intermediate = labelToRaw(meta, displayValues.pwm_frequency) ?? 0;
        const raw = intermediate === 0 ? 192 : intermediate;
        writeRawField(payload, fieldByKey("pwm_frequency").byteOffset, fieldByKey("pwm_frequency"), raw);
    }

    for (const key of ["rpm_power_slope", "startup_beep", "braking_strength"]) {
        if (!(key in displayValues)) continue;
        const meta = resolveDynamicMeta(key, layoutRevision);
        const raw = meta.enum || meta.enumMap ? labelToRaw(meta, displayValues[key]) : displayValues[key];
        writeRawField(payload, fieldByKey(key).byteOffset, fieldByKey(key), raw);
    }

    return payload;
}

// Verbatim from ESC_PARAMETERS_BLUEJAY.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    193, 0, 0, 22, 209, 255, 51, 0, 0, 5, 255, 9, 24, 1, 255, 85, 170, 255, 255, 255, 255, 255,
    255, 4, 255, 255, 255, 255, 255, 255, 40, 80, 4, 255, 2, 255, 255, 255, 0, 1, 255, 255, 0, 0,
    2, 0, 170, 85, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

function disambiguate(bytes) {
    return bytes[2] === 0; // main_revision at byte offset 2 (after esc_signature, esc_command)
}

// Ported from escmfg/bluejay/init.lua's getEscVersion/getEscFirmware.
function describeEsc(values) {
    const parts = ["Bluejay"];
    if (values.layout_revision != null) parts.push(`Revision ${values.layout_revision}`);
    if (values.main_revision != null && values.sub_revision != null) {
        parts.push(`FW${values.main_revision}.${values.sub_revision}`);
    }
    return parts.join(" ");
}

const bluejay = {
    id: "bluejay",
    name: "Bluejay",
    group: "bridged",
    signature: 0xC1,
    disambiguate,
    escSensorProtocolIds: [1],
    fields,
    pages,
    parseRead,
    buildWritePayload,
    resolveFieldMeta,
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

registerManufacturer(bluejay);

export default bluejay;

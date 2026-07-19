// Ported verbatim from C:\GitHub\wingflight-lua-ethos-suite\src\wfsuite\tasks\scheduler\msp\api\ESC_PARAMETERS_SCORPION.lua
// and escmfg/scorp/{init.lua,pages/*.lua}. Group B (native MSP, no target-switch handshake).
// powerCycleRequired: Scorpion has no soft target-switch/reset path -- the Lua tool requires
// the user to manually power-cycle the ESC as part of the workflow (init.lua: powerCycle=true).

import { buildPayload } from "../engine.js";
import { registerManufacturer } from "./registry.js";

const escMode = ["Heli Governor", "Heli Governor (stored)", "VBar Governor", "External Governor", "Airplane mode", "Boat mode", "Quad mode"];
const rotation = ["CCW", "CW"];
const becVoltage = ["5.1 V", "6.1 V", "7.3 V", "8.3 V", "Disabled"];
const teleProtocol = ["Standard", "VBar", "Jeti Exbus", "Unsolicited", "Futaba SBUS"];
const onOff = ["On", "Off"];

const escInfoFields = Array.from({ length: 32 }, (_, i) => ({ key: `escinfo_${i + 1}`, type: "U8" }));

const fields = [
    { key: "esc_signature", type: "U8" },
    { key: "esc_command", type: "U8" },
    ...escInfoFields,
    { key: "esc_mode", type: "U16", enum: escMode },
    { key: "bec_voltage", type: "U16", enum: becVoltage },
    { key: "rotation", type: "U16", enum: rotation },
    { key: "telemetry_protocol", type: "U16", enum: teleProtocol },
    { key: "protection_delay", type: "U16", min: 0, max: 5000, unit: "s", scale: 1000 },
    { key: "min_voltage", type: "U16", min: 0, max: 7000, unit: "v", scale: 100 },
    { key: "max_temperature", type: "U16", min: 0, max: 40000, unit: "°", scale: 100 },
    { key: "max_current", type: "U16", min: 0, max: 30000, unit: "A", scale: 100 },
    { key: "cutoff_handling", type: "U16", min: 0, max: 10000, unit: "%", scale: 100 },
    { key: "max_used", type: "U16", min: 0, max: 6000, unit: "Ah", scale: 100 },
    { key: "motor_startup_sound", type: "U16", enum: onOff },
    { key: "padding_1", type: "U16" },
    { key: "padding_2", type: "U16" },
    { key: "padding_3", type: "U16" },
    { key: "soft_start_time", type: "U16", min: 0, max: 60000, unit: "s", scale: 1000 },
    { key: "runup_time", type: "U16", min: 0, max: 60000, unit: "s", scale: 1000 },
    { key: "bailout", type: "U16", min: 0, max: 100000, unit: "s", scale: 1000 },
    { key: "gov_proportional", type: "U32", min: 30, max: 180, scale: 100 },
    { key: "gov_integral", type: "U32", min: 150, max: 250, scale: 100 },
];

const pages = [
    {
        title: "Basic",
        fields: [
            { apikey: "esc_mode", label: "ESC Mode" },
            { apikey: "rotation", label: "Rotation" },
            { apikey: "bec_voltage", label: "BEC Voltage" },
            { apikey: "telemetry_protocol", label: "Telemetry Protocol" },
        ],
    },
    {
        title: "Advanced",
        fields: [
            { apikey: "soft_start_time", label: "Soft Start Time" },
            { apikey: "runup_time", label: "Runup Time" },
            { apikey: "bailout", label: "Bailout" },
            { apikey: "gov_proportional", label: "Gov Proportional" },
            { apikey: "gov_integral", label: "Gov Integral" },
            { apikey: "motor_startup_sound", label: "Motor Startup Sound" },
        ],
    },
    {
        title: "Limits",
        fields: [
            { apikey: "protection_delay", label: "Protection Delay" },
            { apikey: "cutoff_handling", label: "Cutoff Handling" },
            { apikey: "max_temperature", label: "Max Temperature" },
            { apikey: "max_current", label: "Max Current" },
            { apikey: "min_voltage", label: "Min Voltage" },
            { apikey: "max_used", label: "Max Used" },
        ],
    },
];

// The Lua pages always zero esc_command (byte offset 1) before writing (preSavePayload:
// `payload[2] = 0` in Lua's 1-based indexing) -- replicate via a buildWritePayload override.
function buildWritePayload(displayValues, previousRawBytes) {
    const payload = buildPayload(fields, displayValues, previousRawBytes);
    payload[1] = 0;
    return payload;
}

// Ported from escmfg/scorp/init.lua's getEscModel: a null-terminated ASCII string packed
// across the 32 escinfo_N fields. (getEscVersion/getEscFirmware in the Lua source read through
// a `page.value` table that a plain response buffer never has, so they always evaluate to 0 --
// dead code upstream -- and are not replicated here.)
function describeEsc(values) {
    let model = "";
    for (let i = 1; i <= 32; i++) {
        const byte = values[`escinfo_${i}`];
        if (!byte) break;
        model += String.fromCharCode(byte);
    }
    return model || "Scorpion";
}

// Verbatim from ESC_PARAMETERS_SCORPION.lua's SIM_RESPONSE, used by virtual_fc.js for dev/testing.
const simResponse = [
    83, 128,
    84, 114, 105, 98, 117, 110, 117, 115, 32, 69, 83, 67, 45, 54, 83, 45, 56, 48, 65,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0,
    3, 0, // esc_mode
    3, 0, // bec_voltage
    1, 0, // rotation
    3, 0, // telemetry_protocol
    136, 19, // protection_delay
    22, 3, // min_voltage
    16, 39, // max_temperature
    64, 31, // max_current
    136, 19, // cutoff_handling
    0, 0, // max_used
    1, 0, // motor_startup_sound
    7, 2, // padding_1
    0, 6, // padding_2
    63, 0, // padding_3
    160, 15, // soft_start_time
    64, 31, // runup_time
    208, 7, // bailout
    100, 0, 0, 0, // gov_proportional
    200, 0, 0, 0, // gov_integral
];

const scorpion = {
    id: "scorp",
    name: "Scorpion",
    group: "native",
    signature: 0x53,
    escSensorProtocolIds: [4],
    powerCycleRequired: true,
    fields,
    pages,
    buildWritePayload,
    simResponse,
    describeEsc,
};

registerManufacturer(scorpion);

export default scorpion;

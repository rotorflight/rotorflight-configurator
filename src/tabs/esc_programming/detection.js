// Shared MSP polling helper used by both the Group B (native) direct poll and the tail end
// of the Group A (bridged) target-switch handshake once a target has been selected.

import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import { parseManufacturerBuffer, matchesManufacturer, isUsableBuffer } from "./engine.js";

// A reply that never arrives (CRC error, lost link) leaves the promise pending forever, so
// the save paths race it against a timer. A late reply then settles an already-decided
// promise and is ignored.
export const SAVE_READ_TIMEOUT_MS = 5000;
export const SAVE_WRITE_TIMEOUT_MS = 8000;

export function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function bufferFromResponse(resp) {
    if (!resp?.data) return new Uint8Array(0);
    const { data } = resp;
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

export function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}

export async function readEscParametersOnce() {
    const resp = await MSP.promise(MSPCodes.MSP_ESC_PARAMETERS);
    return bufferFromResponse(resp);
}

// For the save paths: rejects on a timeout instead of hanging.
export function readEscParametersForSave() {
    return withTimeout(readEscParametersOnce(), SAVE_READ_TIMEOUT_MS, "esc_programming: ESC read timed out");
}

// The block the ESC holds now, or null when the read timed out, came back empty, or is not
// this manufacturer's block. A null result must stop a save: nothing may be written from it.
export async function readUsableEscParameters(manufacturer) {
    try {
        const buf = await readEscParametersForSave();
        return isUsableBuffer(manufacturer, buf) ? buf : null;
    } catch {
        return null;
    }
}

// For the save paths: resolves with the reply to MSP_SET_ESC_PARAMETERS, rejects on a timeout.
export function writeEscParametersForSave(payload) {
    return withTimeout(
        MSP.promise(MSPCodes.MSP_SET_ESC_PARAMETERS, Array.from(payload)),
        SAVE_WRITE_TIMEOUT_MS,
        "esc_programming: ESC write timed out",
    );
}

// Polls MSP_ESC_PARAMETERS until the response matches `manufacturer`'s signature (+
// disambiguation), or `timeoutMs` elapses. Mirrors the Lua tool's escDetailsPollInterval
// (matched signature -> short poll) vs escDetailsRetryInterval (mismatch -> longer retry).
export async function pollForEsc(
    manufacturer,
    { signal, pollIntervalMs = 600, retryIntervalMs = 1000, timeoutMs = 15000 } = {},
) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

        const raw = await readEscParametersOnce();
        const matched = matchesManufacturer(raw, manufacturer);
        if (matched) {
            const parsed = parseManufacturerBuffer(manufacturer, raw);
            return { raw, parsed };
        }
        await delay(matched === false ? retryIntervalMs : pollIntervalMs, signal);
    }
    throw new Error("esc_programming: ESC detection timed out");
}

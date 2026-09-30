// Shared MSP polling helper used by both the Group B (native) direct poll and the tail end
// of the Group A (bridged) target-switch handshake once a target has been selected.

import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import { parseManufacturerBuffer, matchesManufacturer } from "./engine.js";

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

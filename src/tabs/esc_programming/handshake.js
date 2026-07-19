// Group A (bootloader-bridged: AM32/BLHeli_S/Bluejay) target-select handshake, modeled as a
// linear async function with awaited delays/retries rather than a transliteration of
// esc_tool_4way.lua's callback-driven polling state machine -- this codebase already has
// `await MSP.promise(...)`, so "write, wait, write, wait, poll" reads far more clearly as a
// single async function. Timing/retry constants come from each manufacturer's `handshake`
// config (see manufacturers/am32.js etc), ported verbatim from esc_tool_4way.lua.

import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import { delay, pollForEsc, readEscParametersOnce } from "./detection.js";

export const HandshakeStatus = {
    IDLE: "idle",
    GUARDING: "guarding",
    SWITCHING: "switching",
    WAITING: "waiting",
    POLLING: "polling",
    POWER_CYCLE: "power_cycle",
    READY: "ready",
    FAILED: "failed",
};

// Out-of-range sentinel firmware treats as "deselect" (see esc_sensor.c:escSelect4WIfById --
// any id >= MAX_SUPPORTED_MOTORS deselects). The Lua tool always uses 100; kept for parity.
export const RESET_TARGET = 100;

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("esc_programming: MSP write timed out")), ms)),
    ]);
}

// escSelect4WIfById() in firmware (sensors/esc_sensor.c) blocks for ~2.5s (ESC_INIT_DELAY)
// entering bootloader mode *before* it acks the MSP write -- a short client timeout here loses
// that race almost every time, making the write look like it failed when it was just slow, and
// sends the whole handshake into a retry loop that keeps hitting the same wall ("stuck on
// Selecting ESC, then times out"). Give it generous headroom above the known firmware delay.
async function writeTarget(target, { signal, retries = 0, retryDelayMs = 800, timeoutMs = 8000 } = {}) {
    for (let attempt = 0; ; attempt++) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        try {
            await withTimeout(MSP.promise(MSPCodes.MSP_SET_4WIF_ESC_FWD_PROG, [target & 0xFF]), timeoutMs);
            return;
        } catch (err) {
            if (attempt >= retries) throw err;
            await delay(retryDelayMs, signal);
        }
    }
}

// Best-effort deselect fired on tab teardown/navigate-away so the FC's 4-way bridge isn't
// left parked on one ESC. Caller does not await this on tab close.
export function deselectTarget() {
    return MSP.promise(MSPCodes.MSP_SET_4WIF_ESC_FWD_PROG, [RESET_TARGET]).catch(() => {});
}

// Runs the full switch-then-detect sequence once. Throws on failure/abort.
async function switchAndDetect(manufacturer, target, { signal, onStatus }) {
    const cfg = manufacturer.handshake;
    onStatus?.(HandshakeStatus.SWITCHING);
    await writeTarget(RESET_TARGET, { signal });
    await delay(cfg.preSwitchDelayMs, signal);
    await writeTarget(target, { signal });

    onStatus?.(HandshakeStatus.WAITING);
    await delay(cfg.switchReadDelayMs, signal);

    onStatus?.(HandshakeStatus.POLLING);
    return pollForEsc(manufacturer, {
        signal,
        pollIntervalMs: cfg.pollIntervalMs,
        retryIntervalMs: cfg.retryIntervalMs,
        timeoutMs: cfg.detectTimeoutMs,
    });
}

// Runs the switch sequence, re-arming up to `readSwitchRetryCount` times on detection failure
// (mirrors esc_tool_4way.lua's scheduleEscReadRecovery/processEscReadRecovery).
export async function runEscSwitch(manufacturer, target, { signal, onStatus } = {}) {
    const cfg = manufacturer.handshake;
    let lastError;
    for (let attempt = 0; attempt <= cfg.readSwitchRetryCount; attempt++) {
        try {
            const result = await switchAndDetect(manufacturer, target, { signal, onStatus });
            onStatus?.(HandshakeStatus.READY);
            return result;
        } catch (err) {
            lastError = err;
            if (signal?.aborted || attempt === cfg.readSwitchRetryCount) break;
            await delay(cfg.readSwitchRetryDelayMs, signal);
        }
    }
    onStatus?.(HandshakeStatus.FAILED);
    throw lastError ?? new Error("esc_programming: target switch failed");
}

// Runs after a successful MSP_SET_ESC_PARAMETERS write for Group A manufacturers: the
// bootloader-bridge link is left indeterminate right after an EEPROM write, so the target
// must be reset and re-selected (and, per manufacturer config, flush-read) before further
// reads are trusted. Ported from esc_tools_page.lua's createEsc4WayPostSaveHandler.
export async function runPostSaveCycle(manufacturer, target, { signal } = {}) {
    const cfg = manufacturer.handshake;
    if (!cfg.postSaveSwitchCycle) return;

    await delay(cfg.postSaveSettleDelayMs, signal);
    await writeTarget(RESET_TARGET, {
        signal,
        retries: cfg.postSaveSwitchRetryCount,
        retryDelayMs: cfg.postSaveSwitchRetryDelayMs,
    });
    await delay(cfg.postSaveReturnTargetDelayMs, signal);
    await writeTarget(target, {
        signal,
        retries: cfg.postSaveSwitchRetryCount,
        retryDelayMs: cfg.postSaveSwitchRetryDelayMs,
    });

    if (cfg.postSaveFlushRead) {
        await delay(cfg.postSaveFlushReadDelayMs, signal);
        await readEscParametersOnce();
    }
}

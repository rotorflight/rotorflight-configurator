import diff from "microdiff";

import { FC } from "@/js/fc.svelte.js";
import { bit_check } from "@/js/serial_backend.js";

import { listManufacturers } from "./manufacturers/index.js";
import {
    buildManufacturerPayload,
    changedKeys,
    mergeEditedValues,
    mismatchedKeys,
    parseManufacturerBuffer,
} from "./engine.js";
import {
    delay,
    pollForEsc,
    readUsableEscParameters,
    writeEscParametersForSave,
} from "./detection.js";
import { runEscSwitch, runPostSaveCycle, deselectTarget, HandshakeStatus } from "./handshake.js";

export const View = {
    PICKER: "picker",
    SELECTOR: "selector",
    DETECTING: "detecting",
    FORM: "form",
};

class State {
    view = $state(View.PICKER);
    acknowledgedWarning = $state(false);
    manufacturer = $state(null);
    escTarget = $state(0);
    status = $state(HandshakeStatus.IDLE);
    error = $state(null);
    saveMessage = $state(null);
    values = $state({});

    // initialValues must be reactive ($state): it's read inside the `changes` derived below,
    // and Svelte only reruns a derived when one of its *tracked* dependencies changes -- a
    // plain field reassignment (e.g. in onSave()) wouldn't invalidate `changes` at all, leaving
    // isDirty()/the Save toolbar stuck showing "dirty" even right after a successful save.
    initialValues = $state(null);

    // Model/version/firmware string identifying the connected ESC, ported from esc_tool.lua's
    // setModelHeaderText -- shown in the page header once detection succeeds, matching the Lua
    // tool's persistent "which ESC am I talking to" header line.
    escLabel = $state("");

    rawBuffer = null;
    abortController = null;

    manufacturers = $derived(listManufacturers());
    escTwoAvailable = $derived(FC.MOTOR_CONFIG.motor_count_blheli >= 2);
    armed = $derived(bit_check(FC.CONFIG.mode, FC.AUX_CONFIG.indexOf("ARM")));

    changes = $derived.by(() => {
        if (!this.initialValues) return [];
        return diff(this.initialValues, $state.snapshot(this.values));
    });

    isDirty() {
        return this.changes.length > 0;
    }

    reset() {
        this.abortController?.abort();
        this.abortController = null;
        this.view = View.PICKER;
        this.manufacturer = null;
        this.escTarget = 0;
        this.status = HandshakeStatus.IDLE;
        this.error = null;
        this.rawBuffer = null;
        this.values = {};
        this.initialValues = null;
        this.escLabel = "";
        this.saveMessage = null;
    }

    // The name a pilot sees for a field: its label on the manufacturer's page, else the key.
    fieldLabel(key) {
        for (const page of this.manufacturer?.pages ?? []) {
            const hit = page.fields.find((f) => f.apikey === key);
            if (hit) return hit.label;
        }
        return key;
    }

    selectManufacturer(manufacturer) {
        this.manufacturer = manufacturer;
        this.error = null;
        if (manufacturer.group === "bridged") {
            this.view = View.SELECTOR;
        } else {
            this.escTarget = 0;
            this.detect();
        }
    }

    selectEsc(target) {
        this.escTarget = target;
        this.detect();
    }

    async detect() {
        this.view = View.DETECTING;
        this.error = null;
        this.status = HandshakeStatus.POLLING;
        this.abortController = new AbortController();
        const { signal } = this.abortController;

        try {
            let result;
            if (this.manufacturer.group === "bridged") {
                result = await runEscSwitch(this.manufacturer, this.escTarget, {
                    signal,
                    onStatus: (status) => {
                        this.status = status;
                    },
                });
            } else {
                result = await this.pollNative(signal);
                this.status = HandshakeStatus.READY;
            }
            this.applyDetectionResult(result);
        } catch (err) {
            if (err?.name === "AbortError") return;
            this.status = HandshakeStatus.FAILED;
            this.error = err?.message ?? String(err);
        }
    }

    // Scorpion (the only manufacturer with powerCycleRequired: true) has no soft target-switch
    // path -- its bootloader only listens for MSP_ESC_PARAMETERS right after power-on, so the
    // user must physically power-cycle it before detection can succeed. Tell them immediately
    // rather than making them wait through a silent poll first -- they can't act on a prompt
    // they haven't seen yet, and every second spent not-yet-power-cycled is a second wasted
    // against the detection timeout.
    async pollNative(signal) {
        if (!this.manufacturer.powerCycleRequired) {
            return pollForEsc(this.manufacturer, { signal, timeoutMs: 15000 });
        }
        this.status = HandshakeStatus.POWER_CYCLE;
        return pollForEsc(this.manufacturer, { signal, timeoutMs: 45000 });
    }

    applyDetectionResult({ raw, parsed }) {
        this.rawBuffer = raw;
        this.values = { ...parsed.display };
        this.initialValues = $state.snapshot(this.values);
        this.escLabel = this.describeConnectedEsc(parsed.values);
        this.view = View.FORM;
    }

    // Mirrors esc_tool.lua/esc_tool_4way.lua's header text: model/version/firmware from the
    // manufacturer's describeEsc(), prefixed with "ESC1 -"/"ESC2 -" only for Group A (bridged)
    // manufacturers, which is where the target actually matters (Group B has one ESC per bus).
    describeConnectedEsc(values) {
        const label = this.manufacturer.describeEsc ? this.manufacturer.describeEsc(values) : this.manufacturer.name;
        if (this.manufacturer.group !== "bridged") return label;
        return `${this.escTarget === 1 ? "ESC2" : "ESC1"} - ${label}`;
    }

    retryDetection() {
        this.error = null;
        return this.detect();
    }

    cancelDetection() {
        this.abortController?.abort();
        this.view = this.manufacturer?.group === "bridged" ? View.SELECTOR : View.PICKER;
    }

    // Writes what the pilot changed. The ESC is read again first, so a change made to it
    // since the load is kept rather than overwritten; the write is read back, and counts
    // only when the ESC holds the changed values (#530). A refused write says so (#532).
    async onSave() {
        this.saveMessage = null;
        try {
            await this.saveValues();
        } catch (err) {
            // A block the module refuses to write is reported with its reason. Nothing was sent.
            if (!err?.refusal) throw err;
            this.saveMessage = { kind: "error", key: err.key, params: err.params, keys: [] };
        }
    }

    async saveValues() {
        const manufacturer = this.manufacturer;
        const edited = changedKeys(this.initialValues, this.values);
        if (edited.length === 0) return;

        try {
            // Nothing is written unless the block the ESC holds now can be read and is this
            // manufacturer's block: a write built from an empty reply would zero the ESC.
            const before = await readUsableEscParameters(manufacturer);
            if (!before) {
                this.saveMessage = { kind: "error", key: "escProgrammingSaveNoRead", keys: [] };
                return;
            }
            const beforeDisplay = parseManufacturerBuffer(manufacturer, before).display;
            const kept = changedKeys(this.initialValues, beforeDisplay).filter((k) => !edited.includes(k));
            const display = mergeEditedValues(beforeDisplay, this.values, edited);
            const payload = buildManufacturerPayload(manufacturer, display, before);

            // Firmware commits ESC EEPROM synchronously in the MSP_SET_ESC_PARAMETERS handler --
            // never call MSP_EEPROM_WRITE/reboot here, that subsystem is unrelated to ESC params
            // and would drop the bridge/serial link mid-write for no benefit.
            const reply = await writeEscParametersForSave(payload);
            if (reply?.unsupported) {
                this.saveMessage = { kind: "error", key: "escProgrammingSaveRefused", keys: [] };
                return;
            }

            if (manufacturer.group === "bridged") {
                await runPostSaveCycle(manufacturer, this.escTarget, {});
            }

            // The ESC may still be committing: read back a few times, a short wait apart. Only a
            // usable read counts; the last one is what the ESC holds now.
            let confirmed = null;
            let mismatch = edited;
            for (let attempt = 0; attempt < 3 && mismatch.length > 0; attempt++) {
                await delay(attempt === 0 ? 300 : 600);
                const buf = await readUsableEscParameters(manufacturer);
                if (!buf) continue;
                confirmed = { buf, display: parseManufacturerBuffer(manufacturer, buf).display };
                mismatch = mismatchedKeys(this.values, confirmed.display, edited);
            }

            if (!confirmed) {
                // Nothing usable came back: the form keeps the pilot's values, unconfirmed.
                this.saveMessage = { kind: "error", key: "escProgrammingSaveUnconfirmed", keys: [] };
                return;
            }

            // The screen shows what the ESC holds. A value the ESC did not keep stays in the
            // form as the pilot typed it, marked as changed, so it can be saved again.
            const shown = { ...confirmed.display };
            for (const k of mismatch) shown[k] = this.values[k];
            this.rawBuffer = confirmed.buf;
            this.initialValues = $state.snapshot(confirmed.display);
            this.values = shown;

            if (mismatch.length > 0) {
                this.saveMessage = {
                    kind: "error",
                    key: "escProgrammingSaveMismatch",
                    keys: mismatch,
                    params: { 1: mismatch.map((k) => this.fieldLabel(k)).join(", ") },
                };
            } else if (kept.length > 0) {
                this.saveMessage = {
                    kind: "info",
                    key: "escProgrammingSaveKept",
                    keys: kept,
                    params: { 1: kept.map((k) => this.fieldLabel(k)).join(", ") },
                };
            } else {
                this.saveMessage = { kind: "ok", key: "escProgrammingSaveDone", keys: [] };
            }
        } catch (err) {
            if (err?.refusal) throw err;
            // A write that timed out may or may not have reached the ESC; say so.
            console.error("esc_programming: save failed", err);
            this.saveMessage = { kind: "error", key: "escProgrammingSaveNoAnswer", keys: [] };
        }
    }

    onRevert() {
        this.values = { ...this.initialValues };
    }

    async leaveTab() {
        this.abortController?.abort();
        if (this.manufacturer?.group === "bridged" && this.view !== View.PICKER) {
            await deselectTarget();
        }
    }
}

export default new State();

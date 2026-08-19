import diff from "microdiff";

import { FC } from "@/js/fc.svelte.js";
import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import { bit_check } from "@/js/serial_backend.js";

import { listManufacturers } from "./manufacturers/index.js";
import { buildManufacturerPayload } from "./engine.js";
import { pollForEsc } from "./detection.js";
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

    async onSave() {
        const payload = buildManufacturerPayload(this.manufacturer, this.values, this.rawBuffer);
        // Firmware commits ESC EEPROM synchronously in the MSP_SET_ESC_PARAMETERS handler --
        // never call MSP_EEPROM_WRITE/reboot here, that subsystem is unrelated to ESC params
        // and would drop the bridge/serial link mid-write for no benefit.
        await MSP.promise(MSPCodes.MSP_SET_ESC_PARAMETERS, Array.from(payload));

        if (this.manufacturer.group === "bridged") {
            await runPostSaveCycle(this.manufacturer, this.escTarget, {});
        }

        // Matches the Lua source: it never reads the ESC back after a save (every bridged
        // manufacturer's postSaveFlushRead defaults to false, and the native/Group B pages
        // don't re-read at all either). Reading immediately races the ESC's own commit and can
        // show stale pre-write values -- trusting what was just written matches the reference
        // tool exactly and sidesteps the race entirely.
        this.rawBuffer = payload;
        this.initialValues = $state.snapshot(this.values);
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

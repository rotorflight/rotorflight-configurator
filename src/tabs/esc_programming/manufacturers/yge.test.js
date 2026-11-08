import { describe, expect, it, vi } from "vitest";

import {
    buildManufacturerPayload,
    buildPayload,
    computeLayout,
    isPageRowVisible,
    parseManufacturerBuffer,
    resolveManufacturerField,
} from "../engine.js";
import yge from "./yge.js";

// The configurator's runtime module pulls in the whole app; the YGE rules need only this constant.
vi.mock("@/js/configurator.svelte.js", () => ({ API_VERSION_12_7: "12.7.0" }));

const offsetOf = (key) => computeLayout(yge.fields).fields.find((field) => field.key === key).byteOffset;

// The simulator's block: 66 bytes for 32 parameters.
const simBlock = () => Uint8Array.from(yge.simResponse);

// A block with one 16-bit word set (little endian, as the ESC sends it).
function withWord(bytes, key, value) {
    const copy = Uint8Array.from(bytes);
    const at = offsetOf(key);
    copy[at] = value & 0xff;
    copy[at + 1] = (value >> 8) & 0xff;
    return copy;
}

// A block that claims `count` parameters, with `tail` bytes after the named fields.
function blockOf(count, tail = []) {
    const named = simBlock().slice(0, 58);
    named[2] = count & 0xff;
    named[3] = (count >> 8) & 0xff;
    return Uint8Array.from([...named, ...tail]);
}

const bytesOf = (payload) => Array.from(payload);

function refusalOf(fn) {
    try {
        fn();
    } catch (err) {
        return err;
    }
    throw new Error("expected a refusal");
}

describe("YGE motor timing", () => {
    it("shows the ESC's automatic and fixed words by their labels", () => {
        expect(parseManufacturerBuffer(yge, withWord(simBlock(), "timing", 17)).display.timing).toBe("Auto Efficient");
        expect(parseManufacturerBuffer(yge, withWord(simBlock(), "timing", 1)).display.timing).toBe("0°");
    });

    it("shows word 0 as Auto Normal", () => {
        expect(parseManufacturerBuffer(yge, simBlock()).display.timing).toBe("Auto Normal");
    });

    it("shows a word the ESC does not define with no label", () => {
        expect(parseManufacturerBuffer(yge, withWord(simBlock(), "timing", 9)).display.timing).toBeUndefined();
    });

    it("writes an untouched word 0 back as word 0", () => {
        const block = simBlock();
        const parsed = parseManufacturerBuffer(yge, block);
        expect(bytesOf(buildManufacturerPayload(yge, parsed.display, block))).toEqual(bytesOf(block));
    });

    it("writes a picked mode as its word", () => {
        const block = simBlock();
        const display = { ...parseManufacturerBuffer(yge, block).display, timing: "Auto Power" };
        expect(bytesOf(buildManufacturerPayload(yge, display, block)).slice(offsetOf("timing"), offsetOf("timing") + 2)).toEqual([18, 0]);
    });

    it("keeps a word the ESC does not define as the ESC holds it", () => {
        const block = withWord(simBlock(), "timing", 9);
        const parsed = parseManufacturerBuffer(yge, block);
        const payload = buildManufacturerPayload(yge, { ...parsed.display, governor: "Heli Governor" }, block);
        expect(bytesOf(payload).slice(offsetOf("timing"), offsetOf("timing") + 2)).toEqual([9, 0]);
    });
});

describe("YGE BEC voltage and the 12 V flag", () => {
    const flagBit = 8; // bit 3 of the flags byte
    const hvtBec = 8273; // 205 HVT BEC, a 12 V model

    it("sets the flag when the pilot moves the voltage to 12.0 V", () => {
        const block = withWord(withWord(simBlock(), "esc_type", hvtBec), "lv_bec_voltage", 55);
        const parsed = parseManufacturerBuffer(yge, block);
        const payload = buildManufacturerPayload(yge, { ...parsed.display, lv_bec_voltage: 12 }, block);
        expect(payload[offsetOf("flags")] & flagBit).toBe(flagBit);
    });

    it("clears the flag when the pilot moves the voltage off 12.0 V", () => {
        const block = withWord(withWord(simBlock(), "esc_type", hvtBec), "lv_bec_voltage", 120);
        const flagged = withWord(block, "flags", flagBit);
        const parsed = parseManufacturerBuffer(yge, flagged);
        const payload = buildManufacturerPayload(yge, { ...parsed.display, lv_bec_voltage: 8 }, flagged);
        expect(payload[offsetOf("flags")] & flagBit).toBe(0);
    });

    it("keeps the flag as the ESC holds it when the voltage is untouched", () => {
        const block = withWord(simBlock(), "flags", flagBit);
        const parsed = parseManufacturerBuffer(yge, block);
        const payload = buildManufacturerPayload(yge, { ...parsed.display, governor: "Heli Governor" }, block);
        expect(payload[offsetOf("flags")] & flagBit).toBe(flagBit);
    });

    it("offers 12.0 V only for a 12 V model", () => {
        const lvt = parseManufacturerBuffer(yge, simBlock()).display;
        const hvt = parseManufacturerBuffer(yge, withWord(simBlock(), "esc_type", hvtBec)).display;
        const field = yge.fields.find((f) => f.key === "lv_bec_voltage");
        expect(resolveManufacturerField(yge, field, lvt).max).toBe(84);
        expect(resolveManufacturerField(yge, field, hvt).max).toBe(120);
    });

    it("hides the BEC row for an Opto and shows it otherwise", () => {
        expect(isPageRowVisible(yge, "lv_bec_voltage", { esc_type: 4928 })).toBe(false);
        expect(isPageRowVisible(yge, "lv_bec_voltage", { esc_type: 848 })).toBe(true);
        expect(isPageRowVisible(yge, "lv_bec_voltage", { esc_type: 1234 })).toBe(true);
    });
});

describe("YGE block length", () => {
    it("reads a block of any count, keeping the fields it carries", () => {
        const block = blockOf(33, [1, 2, 3, 4, 5, 6]);
        expect(() => parseManufacturerBuffer(yge, block)).not.toThrow();
        expect(parseManufacturerBuffer(yge, block).display.governor).toBe("Heli Governor Store");
    });

    it("writes a 28-parameter block at its own length, with no tail", () => {
        const block = blockOf(28);
        const payload = buildManufacturerPayload(yge, parseManufacturerBuffer(yge, block).display, block);
        expect(bytesOf(payload)).toEqual(bytesOf(block));
    });

    it("writes the ESC's own tail back unchanged", () => {
        const block = blockOf(30, [9, 8, 7, 6]);
        const payload = buildManufacturerPayload(yge, parseManufacturerBuffer(yge, block).display, block);
        expect(bytesOf(payload)).toEqual(bytesOf(block));
    });

    it("refuses a block shorter than its count asks, before anything is sent", () => {
        const block = blockOf(32).slice(0, 58);
        const err = refusalOf(() => buildManufacturerPayload(yge, parseManufacturerBuffer(yge, block).display, block));
        expect(err.refusal).toBe(true);
        expect(err.key).toBe("escProgrammingBlockLength");
        expect(err.params).toEqual({ 1: 58, 2: 32, 3: 66 });
    });

    it("refuses a count below the named fields", () => {
        const block = blockOf(20, new Array(2).fill(0));
        const err = refusalOf(() => buildManufacturerPayload(yge, parseManufacturerBuffer(yge, block).display, block));
        expect(err.key).toBe("escProgrammingBlockCount");
    });

    it.each([0, 65])("refuses a count of %i", (count) => {
        const block = blockOf(count);
        const err = refusalOf(() => buildManufacturerPayload(yge, parseManufacturerBuffer(yge, block).display, block));
        expect(err.key).toBe("escProgrammingBlockCount");
    });

    it("refuses a write without a block read", () => {
        const err = refusalOf(() => buildManufacturerPayload(yge, parseManufacturerBuffer(yge, simBlock()).display, undefined));
        expect(err.key).toBe("escProgrammingBlockUnread");
    });
});

describe("engine: words the table does not name", () => {
    it("keeps an enum word the table does not name, rather than writing all ones", () => {
        const block = simBlock();
        const payload = buildPayload(yge.fields, { governor: "not a mode" }, block);
        expect(bytesOf(payload).slice(offsetOf("governor"), offsetOf("governor") + 2)).toEqual(
            bytesOf(block).slice(offsetOf("governor"), offsetOf("governor") + 2),
        );
    });
});

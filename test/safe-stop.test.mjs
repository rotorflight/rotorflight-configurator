import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeRequest, safeStopGroups } from '../src/js/msp/safe_stop.js';

const hex = (bytes) => Buffer.from(bytes).toString('hex');

// Expected frames computed independently (MSP v1 XOR checksum, v2 CRC8
// DVB-S2).
test('encodes MSP v1 and v2 requests', () => {
    assert.equal(hex(encodeRequest(195, [0, 0, 0])), '244d3c03c3000000c0');
    assert.equal(hex(encodeRequest(196, [0xd1, 0x07])), '244d3c02c4d10710');
    assert.equal(hex(encodeRequest(191, [35, 0xc5, 0x09])), '244d3c03bf23c50953');
    assert.equal(hex(encodeRequest(99, [1])), '244d3c01630163');
    assert.equal(hex(encodeRequest(0x5f1b, [0, 0, 0])), '24583c001b5f030000000081');
    assert.equal(hex(encodeRequest(0x5f1c, [7, 0, 0, 0, 0])), '24583c001c5f050007000000005f');
    assert.equal(hex(encodeRequest(0x5f24, [0, 0])), '24583c00245f020000009b');
});

function frames(groups) {
    // Splits the concatenated groups back into frames.
    const out = [];
    for (const group of groups) {
        let i = 0;
        while (i < group.length) {
            const v2 = group[i + 1] === 0x58;
            const size = v2 ? group[i + 6] | (group[i + 7] << 8) : group[i + 3];
            const length = v2 ? 9 + size : 6 + size;
            out.push(hex(group.subarray(i, i + length)));
            i += length;
        }
    }
    return out;
}

test('stops motors and releases every override', () => {
    const all = frames(safeStopGroups());
    for (let i = 0; i < 4; i++) {
        assert.ok(all.includes(hex(encodeRequest(195, [i, 0, 0]))), `motor ${i} off`);
    }
    assert.ok(all.includes('244d3c02c4d10710'), 'all servo overrides off');
    for (let i = 0; i < 26; i++) {
        assert.ok(all.includes(hex(encodeRequest(193, [i, 0xd1, 0x07]))), `servo ${i} off`);
    }
    for (let i = 1; i < 29; i++) {
        assert.ok(all.includes(hex(encodeRequest(191, [i, 0xc5, 0x09]))), `mixer input ${i} off`);
    }
    // Only commands upstream Rotorflight firmware has, nothing else.
    const codes = new Set(all.map((f) => parseInt(f.slice(8, 10), 16)));
    assert.deepEqual([...codes].sort((a, b) => a - b), [191, 193, 195, 196]);
    assert.ok(!all.some((f) => f.startsWith('244d3c0163')), 'no arming change by default');
});

test('disarms first and lifts the block last', () => {
    const all = frames(safeStopGroups({ disarm: true }));
    assert.equal(all[0], hex(encodeRequest(99, [1])));
    assert.equal(all.at(-1), hex(encodeRequest(99, [0])));
});

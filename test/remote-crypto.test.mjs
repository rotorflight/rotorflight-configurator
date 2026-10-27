import assert from 'node:assert/strict';
import test from 'node:test';
import {
    Channel,
    Handshake,
    SIDE,
    Spake2,
    formatCode,
    newPin,
    parseCode,
    passwordToScalar,
} from '../src/js/protocols/RemoteCrypto.js';

// Known answers from the Rust `spake2` crate's own tests (src/lib.rs), which
// match python-spake2. The remote support tool uses that crate, so matching
// these means the configurator and the tool can talk to each other.
const hex = (bytes) => Buffer.from(bytes).toString('hex');
const text = (s) => new TextEncoder().encode(s);

test('password scalar matches the spake2 crate', () => {
    assert.equal(
        passwordToScalar(text('password')),
        3515301705789368674385125653994241092664323519848410154015274772661223168839n,
    );
});

test('asymmetric exchange matches the spake2 crate', () => {
    const scalarA = 2611694063369306139794446498317402240796898290761098242657700742213257926693n;
    const scalarB = 7002393159576182977806091886122272758628412261510164356026361256515836884383n;
    const a = new Spake2(SIDE.SHARE, text('password'), text('idA'), text('idB'), scalarA);
    const b = new Spake2(SIDE.JOIN, text('password'), text('idA'), text('idB'), scalarB);
    assert.equal(hex(a.message), '416fc960df73c9cf8ed7198b0c9534e2e96a5984bfc5edc023fd24dacf371f2af9');
    assert.equal(hex(b.message), '42354e97b88406922b1df4bea1d7870f17aed3dba7c720b313edae315b00959309');
    const expected = '712295de7219c675ddd31942184aa26e0a957cf216bc230d165b215047b520c1';
    assert.equal(hex(a.finish(b.message)), expected);
    assert.equal(hex(b.finish(a.message)), expected);
});

test('a reflected message is rejected', () => {
    const a = new Spake2(SIDE.SHARE, text('pw'));
    assert.throws(() => a.finish(a.message), /Invalid handshake/);
});

// The same scenarios as crypto.rs's tests.
function connect(sharePin, joinPin) {
    const share = new Handshake(SIDE.SHARE, '123456789', sharePin);
    const join = new Handshake(SIDE.JOIN, '123456789', joinPin);
    const shareChannel = share.finish(join.frame);
    const joinChannel = join.finish(share.frame);
    const shareConfirm = shareChannel.confirm();
    const joinConfirm = joinChannel.confirm();
    return {
        share: shareChannel,
        join: joinChannel,
        shareOk: shareChannel.checkConfirm(joinConfirm),
        joinOk: joinChannel.checkConfirm(shareConfirm),
    };
}

test('same PIN connects both ways', () => {
    const { share, join, shareOk, joinOk } = connect('0427', '0427');
    assert.ok(shareOk && joinOk);
    for (let i = 0; i < 3; i++) {
        const message = new Uint8Array(100).fill(i);
        const toJoin = share.seal(message);
        assert.notDeepEqual(toJoin.subarray(0, 100), message);
        assert.deepEqual(join.open(toJoin), message);
        assert.deepEqual(share.open(join.seal(Uint8Array.of(i))), Uint8Array.of(i));
    }
});

test('wrong PIN fails confirmation', () => {
    const { shareOk, joinOk } = connect('0427', '0428');
    assert.ok(!shareOk && !joinOk);
});

test('tampered, replayed or dropped frames fail', () => {
    let { share, join } = connect('1111', '1111');
    const tampered = share.seal(text('hello'));
    tampered[0] ^= 1;
    assert.throws(() => join.open(tampered));

    ({ share, join } = connect('1111', '1111'));
    const first = share.seal(text('one'));
    join.open(first);
    assert.throws(() => join.open(first), 'replay must fail');

    ({ share, join } = connect('1111', '1111'));
    share.seal(text('one'));
    assert.throws(() => join.open(share.seal(text('two'))), 'skipping a frame must fail');
});

test('incompatible version is reported', () => {
    const share = new Handshake(SIDE.SHARE, '123456789', '0000');
    assert.throws(() => share.finish(Uint8Array.of(1, 99, 1, 2, 3)), /incompatible/);
});

test('nonce is a little-endian counter', () => {
    assert.equal(hex(Channel.nonce(1)), '010000000000000000000000');
    assert.equal(hex(Channel.nonce(0x0102)), '020100000000000000000000');
});

test('session codes', () => {
    assert.deepEqual(parseCode('123 456 789 - 0427'), { sessionId: '123456789', pin: '0427' });
    assert.throws(() => parseCode('123 456 789'));
    assert.equal(formatCode('123456789', '0427'), '123 456 789 - 0427');
    assert.equal(newPin().length, 4);
});

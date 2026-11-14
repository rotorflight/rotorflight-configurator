import assert from 'node:assert/strict';
import test from 'node:test';
import { Handshake, SIDE } from '../src/js/protocols/RemoteCrypto.js';
import { RemoteSession } from '../src/js/protocols/RemoteSession.js';

// The pilot's side of a session, driven through a stand-in for the relay's
// WebSocket. Checks that a supporter can't test PIN guesses for free.

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SESSION_ID = '123456789';

class FakeWebSocket {
    static last = null;

    constructor(url) {
        this.url = url;
        this.readyState = 0;
        this.sent = [];
        FakeWebSocket.last = this;
        setTimeout(() => {
            this.readyState = 1;
            this.onopen?.();
        }, 0);
    }

    send(data) {
        this.sent.push(data);
    }

    close() {
        this.readyState = 3;
    }

    /** A frame from the relay. */
    text(value) {
        this.onmessage({ data: JSON.stringify(value) });
    }

    binary(bytes) {
        this.onmessage({ data: Uint8Array.from(bytes).buffer });
    }

    /** Binary frames sent (not the keepalive). */
    get frames() {
        return this.sent.filter((data) => typeof data !== 'string');
    }
}

async function startShare() {
    let status = null;
    const session = new RemoteSession({
        relayUrl: 'wss://relay.test',
        role: SIDE.SHARE,
        onStatus: (s) => {
            status = s;
        },
        WebSocketImpl: FakeWebSocket,
    });
    const done = session.run();
    await delay(5);
    const ws = FakeWebSocket.last;
    ws.text({ type: 'session', id: SESSION_ID });
    await delay(5);
    return { session, done, ws, pin: () => status.pin, status: () => status };
}

/** A supporter joins with `pin` and answers the pilot's handshake frame. */
async function join(ws, pin) {
    const before = ws.frames.length;
    ws.text({ type: 'peer_joined' });
    await delay(5);
    const shareFrame = ws.frames[before];
    const handshake = new Handshake(SIDE.JOIN, SESSION_ID, pin);
    ws.binary(handshake.frame);
    await delay(5);
    return handshake.finish(shareFrame);
}

test('sends no confirm before the supporter has proven the PIN', async () => {
    const { ws, pin, session, done } = await startShare();
    const wrong = pin() === '0000' ? '1111' : '0000';

    const before = ws.frames.length;
    await join(ws, wrong);
    // Only the pilot's handshake frame went out.
    assert.equal(ws.frames.length, before + 1);

    session.stop();
    await done;
});

test('a supporter who leaves mid-handshake counts as a failed attempt', async () => {
    const { ws, pin, done } = await startShare();
    const wrong = pin() === '0000' ? '1111' : '0000';

    for (let i = 0; i < 3; i++) {
        await join(ws, wrong);
        ws.text({ type: 'peer_left' });
        await delay(5);
    }
    const { message, error } = await done;
    assert.ok(error);
    assert.match(message, /wrong session code 3 times/);
});

test('a new supporter replacing one mid-handshake counts as a failed attempt', async () => {
    const { ws, pin, done } = await startShare();
    const wrong = pin() === '0000' ? '1111' : '0000';

    for (let i = 0; i < 3; i++) {
        await join(ws, wrong);
    }
    ws.text({ type: 'peer_joined' });
    const { message, error } = await done;
    assert.ok(error);
    assert.match(message, /wrong session code 3 times/);
});

test('the right PIN gets the pilot\'s confirm back', async () => {
    const { ws, pin, session, done, status } = await startShare();

    const channel = await join(ws, pin());
    ws.binary(channel.confirm());
    await delay(5);

    assert.ok(channel.checkConfirm(ws.frames.at(-1)));
    assert.ok(status().peerConnected);

    session.stop();
    await done;
});

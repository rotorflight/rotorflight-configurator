import { Handshake, SIDE, formatCode, newPin, parseCode } from './RemoteCrypto.js';

/*
    One remote support session, run inside the configurator: the relay
    connection, the encrypted handshake and the message channel. This is a
    port of session.rs in the Wingflight remote support tool
    (https://github.com/WingFlight/wingflight-remote-support).

    - share: the pilot's side. Gets a session ID from the relay, makes up the
      PIN, and waits for a supporter. A supporter who fails the handshake is
      ignored; after MAX_FAILED_ATTEMPTS the session ends so the PIN can't be
      guessed. Nothing is sent before the supporter's confirm checks out.
      The session ends when the supporter leaves, so a session code can be
      used by one supporter only; sharing again gets a new ID and PIN.
    - join: the supporter's side. Connects with the session code.

    Messages are the ones in that tool's PROTOCOL.md; this class only moves them. It
    reports through the callbacks given to the constructor:
      onStatus(status)  whenever `status` changes
      onMessage(bytes)  a message from the other side
      onPeerJoined() / onPeerLeft()  share only: a supporter came or went
    run() resolves with { message, error } when the session is over.

    It needs nothing but WebSocket, so it also runs under Node for tests.
*/

const HANDSHAKE_TIMEOUT = 15000;
// Browsers can't send WebSocket pings. The relay ignores text frames from
// peers but counts them as activity, so one of these keeps it from dropping
// us after 60 s of silence.
const KEEPALIVE_INTERVAL = 15000;
const KEEPALIVE = JSON.stringify({ type: 'ping' });
const MAX_FAILED_ATTEMPTS = 3;

const LOST_RELAY = 'Lost the connection to the relay server';

class SessionEnd extends Error {
    constructor(message, isError = true) {
        super(message);
        this.isError = isError;
    }
}

/** Events from the WebSocket (and kill), consumed one at a time. */
class Inbox {
    constructor() {
        this.events = [];
        this.waiter = null;
    }

    push(event) {
        if (this.waiter) {
            const waiter = this.waiter;
            this.waiter = null;
            waiter(event);
        } else {
            this.events.push(event);
        }
    }

    /** The next event, or { kind: 'timeout' } after `timeout` ms. */
    next(timeout = 0) {
        if (this.events.length) {
            return Promise.resolve(this.events.shift());
        }
        return new Promise((resolve) => {
            let timer = null;
            this.waiter = (event) => {
                clearTimeout(timer);
                resolve(event);
            };
            if (timeout) {
                timer = setTimeout(() => {
                    this.waiter = null;
                    resolve({ kind: 'timeout' });
                }, timeout);
            }
        });
    }
}

function control(text) {
    try {
        return JSON.parse(text) ?? {};
    } catch {
        return {};
    }
}

export class RemoteSession {
    /**
     * @param {object} options
     * @param {string} options.relayUrl e.g. wss://remote.wingflight.org
     * @param {'share'|'join'} options.role
     * @param {string} [options.code] join only: the session code
     */
    constructor({ relayUrl, role, code, onStatus, onMessage, onPeerJoined, onPeerLeft, WebSocketImpl }) {
        this.relayUrl = relayUrl.replace(/\/+$/, '');
        this.role = role;
        this.code = code;
        this.onStatus = onStatus;
        this.onMessage = onMessage;
        this.onPeerJoined = onPeerJoined;
        this.onPeerLeft = onPeerLeft;
        this.WebSocketImpl = WebSocketImpl ?? globalThis.WebSocket;
        this.inbox = new Inbox();
        this.ws = null;
        this.channel = null;
        this.keepalive = null;
        this.status = { role, sessionId: null, pin: null, code: null, peerConnected: false };
    }

    setStatus(changes) {
        Object.assign(this.status, changes);
        if (this.status.sessionId) {
            this.status.code = formatCode(this.status.sessionId, this.status.pin);
        }
        this.onStatus?.({ ...this.status });
    }

    /** True once messages can be sent. */
    get ready() {
        return this.channel !== null && this.status.peerConnected;
    }

    /** Sends one message to the other side; dropped while not ready. */
    send(message) {
        if (this.ready) {
            this.ws.send(this.channel.seal(message));
        }
    }

    /** Ends the session ("Kill connection"). */
    stop() {
        this.inbox.push({ kind: 'kill' });
    }

    async run() {
        try {
            if (this.role === SIDE.SHARE) {
                await this.runShare();
            } else {
                await this.runJoin();
            }
            return { message: 'Session ended', error: false };
        } catch (err) {
            if (err instanceof SessionEnd) {
                return { message: err.message, error: err.isError };
            }
            console.error('Remote support: session failed', err);
            return { message: err.message || String(err), error: true };
        } finally {
            clearInterval(this.keepalive);
            this.channel = null;
            if (this.ws && this.ws.readyState <= 1) {
                this.ws.close(1000);
            }
            this.setStatus({ peerConnected: false });
        }
    }

    // ---- relay connection -------------------------------------------------

    async connect(path) {
        const ws = new this.WebSocketImpl(`${this.relayUrl}${path}`);
        ws.binaryType = 'arraybuffer';
        this.ws = ws;
        ws.onopen = () => this.inbox.push({ kind: 'open' });
        ws.onmessage = (event) => {
            if (typeof event.data === 'string') {
                this.inbox.push({ kind: 'text', value: control(event.data) });
            } else {
                this.inbox.push({ kind: 'binary', data: new Uint8Array(event.data) });
            }
        };
        ws.onclose = () => this.inbox.push({ kind: 'closed' });
        // An error is always followed by a close event.
        ws.onerror = () => {};

        const event = await this.inbox.next(HANDSHAKE_TIMEOUT);
        switch (event.kind) {
            case 'open':
                break;
            case 'kill':
                throw new SessionEnd('Cancelled', false);
            case 'timeout':
                throw new SessionEnd('Could not reach the relay server: timed out');
            default:
                throw new SessionEnd('Could not reach the relay server');
        }
        this.keepalive = setInterval(() => {
            if (ws.readyState === 1) {
                ws.send(KEEPALIVE);
            }
        }, KEEPALIVE_INTERVAL);
    }

    /** Ends the session for the events every phase handles the same way. */
    handleCommon(event, closedMessage = LOST_RELAY) {
        switch (event.kind) {
            case 'kill':
                throw new SessionEnd(
                    this.role === SIDE.SHARE ? 'Connection killed. The session code is no longer valid.' : 'Connection killed',
                    false,
                );
            case 'closed':
                throw new SessionEnd(closedMessage);
            case 'text':
                if (event.value.type === 'error') {
                    throw new SessionEnd(event.value.message || 'Relay error');
                }
                if (event.value.type === 'session_closed') {
                    throw new SessionEnd('The session was ended on the device side', false);
                }
                break;
        }
    }

    /** Waits for a relay control message of `type` (during setup). */
    async expectControl(type, timeoutMessage = 'The relay server did not answer') {
        const deadline = Date.now() + HANDSHAKE_TIMEOUT;
        for (;;) {
            const event = await this.inbox.next(Math.max(1, deadline - Date.now()));
            if (event.kind === 'timeout') {
                throw new SessionEnd(timeoutMessage);
            }
            if (event.kind === 'text' && event.value.type === type) {
                return event.value;
            }
            this.handleCommon(event, 'The relay server closed the connection');
        }
    }

    /** Waits for the other side's next binary frame (during the handshake). */
    async expectBinary() {
        const deadline = Date.now() + HANDSHAKE_TIMEOUT;
        for (;;) {
            const event = await this.inbox.next(Math.max(1, deadline - Date.now()));
            if (event.kind === 'timeout') {
                throw new SessionEnd('The other side did not answer');
            }
            if (event.kind === 'binary') {
                return event.data;
            }
            this.handleCommon(event);
        }
    }

    // ---- share (the pilot's side) ----------------------------------------

    async runShare() {
        await this.connect('/v1/host');
        const session = await this.expectControl('session');
        // The PIN never leaves this computer except by the pilot reading it out.
        this.setStatus({ sessionId: String(session.id ?? ''), pin: newPin() });

        // The current supporter: idle, handshake, confirm or ready.
        let link = { state: 'idle' };
        let failedAttempts = 0;

        for (;;) {
            const event = await this.inbox.next();
            if (event.kind === 'binary') {
                const data = event.data;
                switch (link.state) {
                    case 'handshake':
                        try {
                            const channel = link.handshake.finish(data);
                            this.ws.send(channel.confirm());
                            link = { state: 'confirm', channel };
                        } catch {
                            failedAttempts++;
                            link = { state: 'idle' };
                        }
                        break;
                    case 'confirm':
                        if (link.channel.checkConfirm(data)) {
                            this.channel = link.channel;
                            link = { state: 'ready' };
                            this.setStatus({ peerConnected: true });
                            this.onPeerJoined?.();
                        } else {
                            failedAttempts++;
                            link = { state: 'idle' };
                        }
                        break;
                    case 'ready': {
                        let message;
                        try {
                            message = this.channel.open(data);
                        } catch {
                            throw new SessionEnd(
                                'A message from the supporter was altered on the way, so the session was ended to be safe',
                            );
                        }
                        this.onMessage?.(message);
                        break;
                    }
                    // idle: a supporter whose code was wrong; ignore them.
                }
                if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                    throw new SessionEnd(
                        `Someone tried to join with a wrong session code ${MAX_FAILED_ATTEMPTS} times, ` +
                            'so the session was ended. Share again to get a new code.',
                    );
                }
            } else if (event.kind === 'text' && event.value.type === 'peer_joined') {
                const handshake = new Handshake(SIDE.SHARE, this.status.sessionId, this.status.pin);
                link = { state: 'handshake', handshake };
                this.ws.send(handshake.frame);
            } else if (event.kind === 'text' && event.value.type === 'peer_left') {
                if (link.state === 'ready') {
                    // A session code is good for one supporter only: once
                    // they leave, nobody may join with it again.
                    this.onPeerLeft?.();
                    throw new SessionEnd(
                        'The supporter left. The session code is no longer valid; share again to get a new one.',
                        false,
                    );
                }
                // Someone who never got past the handshake.
                link = { state: 'idle' };
            } else {
                this.handleCommon(event);
            }
        }
    }

    // ---- join (the supporter's side) -------------------------------------

    async runJoin() {
        let parsed;
        try {
            parsed = parseCode(this.code);
        } catch (err) {
            throw new SessionEnd(err.message);
        }
        const { sessionId, pin } = parsed;

        await this.connect(`/v1/join/${sessionId}`);
        await this.expectControl('joined');

        const handshake = new Handshake(SIDE.JOIN, sessionId, pin);
        this.ws.send(handshake.frame);
        let channel;
        try {
            channel = handshake.finish(await this.expectBinary());
        } catch (err) {
            if (err instanceof SessionEnd) {
                throw err;
            }
            throw new SessionEnd(err.message);
        }
        this.ws.send(channel.confirm());
        if (!channel.checkConfirm(await this.expectBinary())) {
            throw new SessionEnd('Wrong session code. Check the last 4 digits with the pilot.');
        }

        this.channel = channel;
        this.setStatus({ sessionId, pin, peerConnected: true });

        for (;;) {
            const event = await this.inbox.next();
            if (event.kind === 'binary') {
                let message;
                try {
                    message = this.channel.open(event.data);
                } catch {
                    throw new SessionEnd(
                        'A message from the device side was altered on the way, so the session was ended to be safe',
                    );
                }
                this.onMessage?.(message);
            } else {
                this.handleCommon(event);
            }
        }
    }
}

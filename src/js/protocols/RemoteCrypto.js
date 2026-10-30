import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

/*
    End-to-end encryption between the two ends of a remote support session,
    so the relay can neither read nor change what passes through it. This is
    a port of crypto.rs in the Wingflight remote support tool
    (https://github.com/WingFlight/wingflight-remote-support), whose
    PROTOCOL.md describes the protocol. Rotorflight has its own relay domain
    and its own protocol labels (below), so it never pairs with Wingflight.

    The pilot's side makes up a 4-digit PIN that is shown next to the session
    ID but never sent anywhere. Both sides run SPAKE2 (as the Rust `spake2`
    crate does it, on Ed25519) on "<id>-<pin>", so the relay learns nothing
    it could test PINs against offline. The SPAKE2 key is expanded with HKDF
    into one ChaCha20-Poly1305 key per direction; nonces are per-direction
    counters, so a frame the relay drops, replays, reorders or alters fails
    to decrypt.

    On the wire (binary WebSocket frames):
      1. HANDSHAKE  01 version:u8 spake2_message   (both directions)
      2. CONFIRM    seal(CONFIRM_PLAINTEXT)         (both directions)
      3. then every protocol message as seal(message)
    A CONFIRM that doesn't decrypt means the PIN was wrong.
*/

export const PIN_DIGITS = 4;
const HANDSHAKE = 0x01;
const VERSION = 1;

const encoder = new TextEncoder();
// Labels that go into the key exchange and key derivation: both ends must
// use exactly these bytes. Wingflight uses `wingflight-remote …` instead, so
// a Rotorflight and a Wingflight end derive different keys and fail CONFIRM.
const CONFIRM_PLAINTEXT = encoder.encode('rotorflight-remote confirm v1');
const ID_SHARE = encoder.encode('rotorflight-remote share');
const ID_JOIN = encoder.encode('rotorflight-remote join');
const INFO_SHARE_TO_JOIN = encoder.encode('rotorflight-remote v1 share->join');
const INFO_JOIN_TO_SHARE = encoder.encode('rotorflight-remote v1 join->share');

export const SIDE = { SHARE: 'share', JOIN: 'join' };

// ---- SPAKE2, as in the `spake2` crate (Ed25519Group) ----------------------

const Point = ed25519.Point;
const ORDER = Point.Fn.ORDER;
// The crate's blinding constants (the same as python-spake2's).
const M = Point.fromHex('15cfd18e385952982b6a8f8c7854963b58e34388c8e6dae891db756481a02312');
const N = Point.fromHex('f04f2e7eb734b2a8f8b472eaf9c3c632576ac64aea650b496a8a20ff00e583c3');
const SIDE_A = 0x41;
const SIDE_B = 0x42;

function bytesToBigInt(bytes, littleEndian) {
    let value = 0n;
    for (let i = 0; i < bytes.length; i++) {
        const byte = littleEndian ? bytes[bytes.length - 1 - i] : bytes[i];
        value = (value << 8n) | BigInt(byte);
    }
    return value;
}

function concat(...parts) {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function equalBytes(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}

/** The password scalar: HKDF-SHA256(salt "", info "SPAKE2 pw"), 48 bytes big-endian, mod L. */
export function passwordToScalar(password) {
    const okm = hkdf(sha256, password, new Uint8Array(0), encoder.encode('SPAKE2 pw'), 48);
    return bytesToBigInt(okm, false) % ORDER;
}

function randomScalar() {
    // 64 random bytes reduced mod L, like curve25519-dalek's Scalar::random.
    let scalar = 0n;
    while (scalar === 0n) {
        scalar = bytesToBigInt(crypto.getRandomValues(new Uint8Array(64)), true) % ORDER;
    }
    return scalar;
}

function multiply(point, scalar) {
    // noble refuses 0; X * 0 is the identity.
    return scalar === 0n ? Point.ZERO : point.multiply(scalar);
}

/**
 * One side of an asymmetric SPAKE2 exchange: A is the sharing side, B the
 * joining one. Exported for the tests, which pass the crate's known-answer
 * identities and scalars.
 */
export class Spake2 {
    constructor(side, password, idA = ID_SHARE, idB = ID_JOIN, xyScalar = randomScalar()) {
        this.isA = side === SIDE.SHARE;
        this.password = password;
        this.idA = idA;
        this.idB = idB;
        this.xyScalar = xyScalar;
        this.passwordScalar = passwordToScalar(password);
        const blinding = this.isA ? M : N;
        const element = Point.BASE.multiply(xyScalar).add(multiply(blinding, this.passwordScalar));
        this.msg1 = element.toBytes();
        this.message = concat(Uint8Array.of(this.isA ? SIDE_A : SIDE_B), this.msg1);
    }

    finish(message) {
        if (message.length !== 33 || message[0] !== (this.isA ? SIDE_B : SIDE_A)) {
            throw new Error('Invalid handshake');
        }
        const theirs = message.subarray(1);
        let theirElement;
        try {
            theirElement = Point.fromBytes(theirs, true);
        } catch {
            throw new Error('Invalid handshake');
        }
        const unblinding = this.isA ? N : M;
        const negPassword = (ORDER - this.passwordScalar) % ORDER;
        const keyElement = multiply(theirElement.add(multiply(unblinding, negPassword)), this.xyScalar);
        const keyBytes = keyElement.toBytes();
        const [msgA, msgB] = this.isA ? [this.msg1, theirs] : [theirs, this.msg1];
        return sha256(
            concat(sha256(this.password), sha256(this.idA), sha256(this.idB), msgA, msgB, keyBytes),
        );
    }
}

// ---- session code, handshake, channel -------------------------------------

/** A fresh random PIN, e.g. "0427". */
export function newPin() {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] % 10 ** PIN_DIGITS;
    return String(value).padStart(PIN_DIGITS, '0');
}

/** Splits what the supporter typed ("123 456 789 - 0427") into session ID and PIN. */
export function parseCode(code) {
    const digits = String(code).replace(/\D/g, '');
    if (digits.length !== 9 + PIN_DIGITS) {
        throw new Error(`A session code has ${9 + PIN_DIGITS} digits, e.g. 123 456 789 - 0427`);
    }
    return { sessionId: digits.slice(0, 9), pin: digits.slice(9) };
}

/** "123 456 789 - 0427": what the pilot reads out to the supporter. */
export function formatCode(sessionId, pin) {
    const id = sessionId.replace(/(\d{3})(?=\d)/g, '$1 ');
    return pin ? `${id} - ${pin}` : id;
}

export class Handshake {
    /** Starts a key exchange; `frame` goes to the other side. */
    constructor(side, sessionId, pin) {
        this.side = side;
        this.spake = new Spake2(side, encoder.encode(`${sessionId}-${pin}`));
        this.frame = concat(Uint8Array.of(HANDSHAKE, VERSION), this.spake.message);
    }

    /**
     * Finishes with the other side's HANDSHAKE frame. The channel's first
     * frame each way must be confirm() / checkConfirm().
     */
    finish(frame) {
        if (frame.length >= 2 && frame[0] === HANDSHAKE && frame[1] !== VERSION) {
            throw new Error('The other side runs an incompatible version of remote support');
        }
        if (frame.length < 2 || frame[0] !== HANDSHAKE) {
            throw new Error('Invalid handshake');
        }
        return new Channel(this.side, this.spake.finish(frame.subarray(2)));
    }
}

export class Channel {
    constructor(side, sharedKey) {
        const key = (info) => hkdf(sha256, sharedKey, undefined, info, 32);
        const shareToJoin = key(INFO_SHARE_TO_JOIN);
        const joinToShare = key(INFO_JOIN_TO_SHARE);
        this.sealKey = side === SIDE.SHARE ? shareToJoin : joinToShare;
        this.openKey = side === SIDE.SHARE ? joinToShare : shareToJoin;
        this.sealCounter = 0;
        this.openCounter = 0;
    }

    static nonce(counter) {
        const nonce = new Uint8Array(12);
        new DataView(nonce.buffer).setBigUint64(0, BigInt(counter), true);
        return nonce;
    }

    seal(plaintext) {
        const nonce = Channel.nonce(this.sealCounter++);
        return chacha20poly1305(this.sealKey, nonce).encrypt(plaintext);
    }

    /** Throws if the frame was altered, replayed, reordered or one was dropped. */
    open(ciphertext) {
        const nonce = Channel.nonce(this.openCounter++);
        try {
            return chacha20poly1305(this.openKey, nonce).decrypt(ciphertext);
        } catch {
            throw new Error('A message from the other side failed to decrypt');
        }
    }

    confirm() {
        return this.seal(CONFIRM_PLAINTEXT);
    }

    /** False means the other side used a different PIN (or session ID). */
    checkConfirm(frame) {
        try {
            return equalBytes(this.open(frame), CONFIRM_PLAINTEXT);
        } catch {
            return false;
        }
    }
}

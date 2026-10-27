/*
    The messages the pilot's side of a remote support session answers, as
    described in PROTOCOL.md of the Wingflight remote support tool
    (https://github.com/WingFlight/wingflight-remote-support). Shared
    by the two device hosts (RemoteDeviceHost.js in the desktop app and
    WebRemoteDeviceHost.js in the browser). Free of platform APIs, so it also
    runs under Node for tests.
*/

export const MSG = {
    LIST_DEVICES:  0x10,
    DEVICE_LIST:   0x11,
    SERIAL_OPEN:   0x20,
    SERIAL_CLOSE:  0x21,
    SERIAL_WRITE:  0x22,
    SERIAL_DATA:   0x23,
    SERIAL_CLOSED: 0x24,
    USB_OPEN:      0x30,
    USB_CLOSE:     0x31,
    USB_CLAIM:     0x32,
    USB_RELEASE:   0x33,
    USB_RESET:     0x34,
    USB_CTRL_IN:   0x35,
    USB_CTRL_OUT:  0x36,
    RESULT:        0x40,
};

export const RESULT_OK = 0;
export const RESULT_STALL = 1;
export const RESULT_ERROR = 2;

const REQUEST_TYPES = ['standard', 'class', 'vendor', 'reserved'];
const RECIPIENTS = ['device', 'interface', 'endpoint', 'other'];

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function concat(...parts) {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

export function withReq(type, req, payload = new Uint8Array(0)) {
    const head = new Uint8Array(5);
    head[0] = type;
    new DataView(head.buffer).setUint32(1, req, true);
    return concat(head, payload);
}

export function result(req, status, payload = new Uint8Array(0)) {
    return withReq(MSG.RESULT, req, concat(Uint8Array.of(status), payload));
}

export function error(req, err) {
    return result(req, RESULT_ERROR, textEncoder.encode(err?.message || String(err)));
}

export function toArrayBuffer(bytes) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Reads a request the way that tool's protocol.rs parse_request() does. */
export function parseRequest(message) {
    const view = new DataView(message.buffer, message.byteOffset, message.byteLength);
    let offset = 1;
    const need = (n) => {
        if (offset + n > message.length) {
            throw new Error('message too short');
        }
    };
    const u8 = () => (need(1), message[offset++]);
    const u16 = () => (need(2), (offset += 2), view.getUint16(offset - 2, true));
    const u32 = () => (need(4), (offset += 4), view.getUint32(offset - 4, true));
    const rest = () => message.subarray(offset);
    const setup = () => {
        const requestType = u8();
        return {
            direction: requestType & 0x80 ? 'in' : 'out',
            requestType: REQUEST_TYPES[(requestType >> 5) & 0x03],
            recipient: RECIPIENTS[requestType & 0x1f] ?? 'other',
            request: u8(),
            value: u16(),
            index: u16(),
        };
    };

    const type = message[0];
    switch (type) {
        case MSG.LIST_DEVICES:
        case MSG.SERIAL_CLOSE:
        case MSG.USB_CLOSE:
        case MSG.USB_RESET:
            return { type, req: u32() };
        case MSG.SERIAL_OPEN: {
            const req = u32();
            const baud = u32();
            const parity = ['no', 'odd', 'even'][u8()];
            if (!parity) {
                throw new Error('invalid parity');
            }
            const stopBits = u8() === 2 ? 'two' : 'one';
            const dataBits = u8() === 7 ? 'seven' : 'eight';
            return { type, req, baud, parity, stopBits, dataBits, path: textDecoder.decode(rest()) };
        }
        case MSG.SERIAL_WRITE:
            return { type, data: rest().slice() };
        case MSG.USB_OPEN:
            return { type, req: u32(), id: textDecoder.decode(rest()) };
        case MSG.USB_CLAIM:
        case MSG.USB_RELEASE:
            return { type, req: u32(), interfaceNumber: u8() };
        case MSG.USB_CTRL_IN:
            return { type, req: u32(), setup: setup(), length: u16() };
        case MSG.USB_CTRL_OUT:
            return { type, req: u32(), setup: setup(), data: rest().slice() };
        default:
            throw new Error(`unknown message type 0x${type.toString(16).padStart(2, '0')}`);
    }
}

/** The request id of a message that carries one, for an error reply. */
export function requestIdOf(message) {
    if (message.length < 5 || message[0] === MSG.SERIAL_WRITE) {
        return null;
    }
    return new DataView(message.buffer, message.byteOffset).getUint32(1, true);
}

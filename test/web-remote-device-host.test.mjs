import assert from 'node:assert/strict';
import test from 'node:test';
import { WebRemoteDeviceHost } from '../src/js/protocols/WebRemoteDeviceHost.js';
import {
    MSG,
    RESULT_ERROR,
    RESULT_OK,
    RESULT_STALL,
    concat,
    textDecoder,
    textEncoder,
    withReq,
} from '../src/js/protocols/RemoteDeviceProtocol.js';
import { safeStopGroups } from '../src/js/msp/safe_stop.js';

// The browser side of sharing a flight controller, driven with stand-ins
// for a Web Serial port and a WebUSB device. Checks the messages that go
// back to the supporter and what reaches the "board".

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hex = (bytes) => Buffer.from(bytes).toString('hex');

class FakePort {
    constructor(info) {
        this.info = info;
        this.opened = false;
        this.closed = 0;
        this.openOptions = null;
        this.written = [];
        this.readable = null;
        this.writable = null;
    }

    getInfo() {
        return this.info;
    }

    async open(options) {
        this.opened = true;
        this.openOptions = options;
        this.readable = new ReadableStream({
            start: (controller) => {
                this.controller = controller;
            },
        });
        this.writable = new WritableStream({
            write: (chunk) => {
                this.written.push(Uint8Array.from(chunk));
            },
        });
    }

    /** What the board sends. */
    feed(bytes) {
        this.controller.enqueue(Uint8Array.from(bytes));
    }

    /** A recoverable error: Web Serial errors the stream and puts a new one in its place. */
    overrun() {
        this.controller.error(new DOMException('Buffer overrun', 'BufferOverrunError'));
        this.readable = new ReadableStream({
            start: (controller) => {
                this.controller = controller;
            },
        });
    }

    /** The board goes away (reboot, cable pulled). */
    lose() {
        this.controller.error(new DOMException('The device has been lost.', 'NetworkError'));
    }

    async close() {
        this.opened = false;
        this.closed++;
    }
}

class FakeUsbDevice {
    constructor() {
        this.vendorId = 0x0483;
        this.productId = 0xdf11;
        this.productName = 'STM32 BOOTLOADER';
        this.serialNumber = 'ABC123';
        this.configuration = null;
        this.opened = false;
        this.claimed = [];
        this.transfers = [];
    }

    async open() {
        this.opened = true;
    }

    async selectConfiguration(value) {
        this.configuration = { configurationValue: value };
    }

    async claimInterface(number) {
        this.claimed.push(number);
    }

    async releaseInterface(number) {
        this.claimed = this.claimed.filter((n) => n !== number);
    }

    async reset() {}

    async controlTransferIn(setup, length) {
        this.transfers.push({ setup, length });
        if (setup.request === 0x03) {
            return { status: 'stall' };
        }
        return { status: 'ok', data: new DataView(Uint8Array.from([1, 2, 3]).buffer) };
    }

    async controlTransferOut(setup, data) {
        this.transfers.push({ setup, data: new Uint8Array(data) });
        return { status: 'ok', bytesWritten: data.byteLength };
    }

    async close() {
        this.opened = false;
    }
}

function makeHost({ port = null, device = null } = {}) {
    const sent = [];
    const devices = [];
    const host = new WebRemoteDeviceHost({
        send: (message) => sent.push(Uint8Array.from(message)),
        onDevice: (name) => devices.push(name),
        dfuFilters: [{ vendorId: 0x0483, productId: 0xdf11 }],
        serial: { getPorts: async () => (port ? [port] : []) },
        usb: { getDevices: async () => (device ? [device] : []) },
    });
    return { host, sent, devices };
}

const PORT_PATH = 'webserial_1155_22336_0';

function serialOpen(req, path, baud = 115200) {
    const settings = new Uint8Array(7);
    new DataView(settings.buffer).setUint32(0, baud, true);
    settings[4] = 0; // no parity
    settings[5] = 1;
    settings[6] = 8;
    return withReq(MSG.SERIAL_OPEN, req, concat(settings, textEncoder.encode(path)));
}

function controlTransfer(type, req, requestType, request, value, index, tail) {
    const setup = new Uint8Array(6);
    const view = new DataView(setup.buffer);
    setup[0] = requestType;
    setup[1] = request;
    view.setUint16(2, value, true);
    view.setUint16(4, index, true);
    return withReq(type, req, concat(setup, tail));
}

function reply(message) {
    const view = new DataView(message.buffer, message.byteOffset);
    return {
        type: message[0],
        req: message.length >= 5 ? view.getUint32(1, true) : null,
        status: message[5],
        payload: message.subarray(6),
    };
}

/** The last RESULT sent, which must answer `req`. */
function resultFor(sent, req) {
    const results = sent.map(reply).filter((r) => r.type === MSG.RESULT && r.req === req);
    assert.equal(results.length, 1, `one result for request ${req}`);
    return results[0];
}

test('lists the granted ports and DFU devices', async () => {
    const port = new FakePort({ usbVendorId: 1155, usbProductId: 22336 });
    const { host, sent } = makeHost({ port, device: new FakeUsbDevice() });

    host.handle(withReq(MSG.LIST_DEVICES, 1));
    await host.queue;

    const message = reply(sent[0]);
    assert.equal(message.type, MSG.DEVICE_LIST);
    assert.equal(message.req, 1);
    const list = JSON.parse(textDecoder.decode(sent[0].subarray(5)));
    assert.deepEqual(list.serial, [
        { path: PORT_PATH, displayName: 'STM Electronics (VID:1155 PID:22336)', vid: 1155, pid: 22336 },
    ]);
    assert.deepEqual(list.dfu, [
        { id: 'webusb_1155_57105_0', vid: 1155, pid: 57105, product: 'STM32 BOOTLOADER', serial: 'ABC123' },
    ]);
});

test('opens a port, forwards both ways and makes the board safe on close', async () => {
    const port = new FakePort({ usbVendorId: 1155, usbProductId: 22336 });
    const { host, sent, devices } = makeHost({ port });

    host.handle(serialOpen(2, PORT_PATH));
    await host.queue;
    assert.equal(resultFor(sent, 2).status, RESULT_OK);
    assert.equal(port.openOptions.baudRate, 115200);
    assert.equal(port.openOptions.parity, 'none');
    assert.equal(port.openOptions.bufferSize, 16384);
    assert.equal(devices.at(-1), 'Serial port STM Electronics (VID:1155 PID:22336) (115200 baud)');

    // Supporter -> board
    const request = Uint8Array.from([0x24, 0x4d, 0x3c, 0x00, 0x64, 0x64]);
    host.handle(concat(Uint8Array.of(MSG.SERIAL_WRITE), request));
    await delay(10);
    assert.deepEqual(port.written, [request]);

    // Board -> supporter
    port.feed([0x24, 0x4d, 0x3e]);
    await delay(10);
    assert.equal(hex(sent.at(-1)), hex(concat(Uint8Array.of(MSG.SERIAL_DATA), Uint8Array.from([0x24, 0x4d, 0x3e]))));

    host.handle(withReq(MSG.SERIAL_CLOSE, 3));
    await host.queue;
    assert.equal(resultFor(sent, 3).status, RESULT_OK);
    // The stop sequence went out, in order, before the port closed.
    assert.deepEqual(port.written.slice(1).map(hex), safeStopGroups({ disarm: true }).map(hex));
    assert.equal(port.closed, 1);
    assert.equal(devices.at(-1), null);
});

test('leaves the CLI before stopping the board', async () => {
    const port = new FakePort({ usbVendorId: 1155, usbProductId: 22336 });
    const { host } = makeHost({ port });

    host.handle(serialOpen(4, PORT_PATH));
    await host.queue;
    host.handle(Uint8Array.of(MSG.SERIAL_WRITE, 0x23)); // '#'
    await delay(10);
    host.handle(withReq(MSG.SERIAL_CLOSE, 5));
    await host.queue;

    assert.equal(textDecoder.decode(port.written[1]), '\r\nexit\r\n');
    assert.equal(port.written.length, 2 + safeStopGroups({ disarm: true }).length);
});

test('tells the supporter when the port is lost, with nothing to make safe', async () => {
    const port = new FakePort({ usbVendorId: 1155, usbProductId: 22336 });
    const { host, sent, devices } = makeHost({ port });

    host.handle(serialOpen(6, PORT_PATH));
    await host.queue;
    port.lose();
    await delay(20);
    await host.queue;

    const closed = sent.find((m) => m[0] === MSG.SERIAL_CLOSED);
    assert.ok(closed, 'SERIAL_CLOSED sent');
    assert.equal(textDecoder.decode(closed.subarray(1)), 'NetworkError');
    assert.deepEqual(port.written, []);
    assert.equal(port.closed, 1);
    assert.equal(devices.at(-1), null);
});

test('keeps reading after a recoverable error, and still stops the board on close', async () => {
    const port = new FakePort({ usbVendorId: 1155, usbProductId: 22336 });
    const { host, sent } = makeHost({ port });

    host.handle(serialOpen(7, PORT_PATH));
    await host.queue;
    port.overrun();
    await delay(20);
    port.feed([1, 2, 3]);
    await delay(20);

    assert.ok(!sent.some((m) => m[0] === MSG.SERIAL_CLOSED), 'no SERIAL_CLOSED');
    assert.ok(sent.some((m) => m[0] === MSG.SERIAL_DATA && hex(m.subarray(1)) === '010203'));

    host.handle(withReq(MSG.SERIAL_CLOSE, 8));
    await host.queue;
    assert.equal(port.written.length, safeStopGroups({ disarm: true }).length);
    assert.equal(port.closed, 1);
});

test('drives a DFU device like the desktop host', async () => {
    const device = new FakeUsbDevice();
    const { host, sent, devices } = makeHost({ device });

    host.handle(withReq(MSG.USB_OPEN, 10, textEncoder.encode('webusb_1155_57105_0')));
    await host.queue;
    assert.equal(resultFor(sent, 10).status, RESULT_OK);
    assert.ok(device.opened);
    assert.equal(device.configuration.configurationValue, 1);
    assert.equal(devices.at(-1), 'DFU device STM32 BOOTLOADER');

    host.handle(withReq(MSG.USB_CLAIM, 11, Uint8Array.of(0)));
    await host.queue;
    assert.equal(resultFor(sent, 11).status, RESULT_OK);
    assert.deepEqual(device.claimed, [0]);

    // A stalled IN transfer (DFU_GETSTATUS here answered with a stall)
    host.handle(controlTransfer(MSG.USB_CTRL_IN, 12, 0x80 | 0x20 | 0x01, 0x03, 0, 0, Uint8Array.of(6, 0)));
    await host.queue;
    assert.equal(resultFor(sent, 12).status, RESULT_STALL);

    host.handle(controlTransfer(MSG.USB_CTRL_IN, 13, 0x80 | 0x20 | 0x01, 0x05, 0, 0, Uint8Array.of(3, 0)));
    await host.queue;
    const inResult = resultFor(sent, 13);
    assert.equal(inResult.status, RESULT_OK);
    assert.deepEqual([...inResult.payload], [1, 2, 3]);
    assert.deepEqual(device.transfers.at(-1).setup, {
        direction: 'in',
        requestType: 'class',
        recipient: 'interface',
        request: 0x05,
        value: 0,
        index: 0,
    });

    host.handle(controlTransfer(MSG.USB_CTRL_OUT, 14, 0x20 | 0x01, 0x01, 2, 0, Uint8Array.from([9, 8, 7, 6])));
    await host.queue;
    const outResult = resultFor(sent, 14);
    assert.equal(outResult.status, RESULT_OK);
    assert.equal(new DataView(outResult.payload.buffer, outResult.payload.byteOffset).getUint32(0, true), 4);
    assert.deepEqual([...device.transfers.at(-1).data], [9, 8, 7, 6]);

    host.handle(withReq(MSG.USB_CLOSE, 15));
    await host.queue;
    assert.equal(resultFor(sent, 15).status, RESULT_OK);
    assert.deepEqual(device.claimed, []);
    assert.ok(!device.opened);
    assert.equal(devices.at(-1), null);
});

test('answers a request it cannot carry out with an error', async () => {
    const { host, sent } = makeHost();

    host.handle(withReq(0x7f, 20));
    host.handle(serialOpen(21, 'webserial_0_0_0'));
    host.handle(withReq(MSG.USB_CLAIM, 22, Uint8Array.of(0)));
    await host.queue;

    assert.equal(resultFor(sent, 20).status, RESULT_ERROR);
    assert.equal(textDecoder.decode(resultFor(sent, 20).payload), 'unknown message type 0x7f');
    assert.equal(resultFor(sent, 21).status, RESULT_ERROR);
    assert.equal(textDecoder.decode(resultFor(sent, 21).payload), 'Port webserial_0_0_0 not found');
    assert.equal(resultFor(sent, 22).status, RESULT_ERROR);
    assert.equal(textDecoder.decode(resultFor(sent, 22).payload), 'No USB device is open');
});

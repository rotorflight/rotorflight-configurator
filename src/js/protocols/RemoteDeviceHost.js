import { safeStopGroups } from '@/js/msp/safe_stop.js';
import {
    MSG,
    RESULT_OK,
    RESULT_STALL,
    concat,
    delay,
    error,
    parseRequest,
    requestIdOf,
    result,
    textEncoder,
    toArrayBuffer,
    withReq,
} from '@/js/protocols/RemoteDeviceProtocol.js';

/*
    The pilot's side of a remote support session run inside the desktop
    configurator: carries out the supporter's requests on this computer's
    serial ports and DFU devices through chrome.serial and chrome.usb. A port
    of device_host.rs in the Wingflight remote support tool; the messages
    are the ones in its PROTOCOL.md (RemoteDeviceProtocol.js). WebRemoteDeviceHost.js is
    the same thing for the browser.

    Requests are handled one at a time, in the order they arrive, which keeps
    the request/reply semantics simple. Only one serial port or USB device is
    open at a time: opening one closes whatever was open before.

    Safety: every way the supporter's serial port is let go of -- they close
    it or open another device, or the session ends, is killed or is lost --
    goes through closeSerial(), which first disarms the board, stops the
    motors and releases every override (safe_stop.js). If the supporter
    switched the board into CLI mode, `exit` goes first; it reboots the
    board, which clears everything.

    The configurator's own connection is closed while sharing (see
    RemoteSupportOverlay.svelte), so it never sees this traffic.
*/

const POLL_INTERVAL = 500;
const USB_TIMEOUT = 10000;
// Between the groups of the stop sequence, so a slow link can't overrun the
// board's receive buffer.
const STOP_GROUP_PAUSE = 20;
// The board answers every frame of the stop sequence, one MSP task cycle at a
// time. Closing the port before it is through leaves it mid-frame, so it
// swallows the next opener's first request, and leaves answers under way that
// greet them first. So close only once the board has gone quiet, and on
// opening drop whatever arrives first.
const QUIET_TIME = 300;
const MAX_DRAIN_TIME = 3000;
const SETTLE_TIME = 100;
const CLI_EXIT = textEncoder.encode('\r\nexit\r\n');

// Receive errors after which the port is gone (board rebooted, unplugged).
const FATAL_SERIAL_ERRORS = new Set(['disconnected', 'device_lost', 'system_error']);

/** Calls a callback-style chrome.* API; rejects on chrome.runtime.lastError. */
function call(fn, ...args) {
    return new Promise((resolve, reject) => {
        fn(...args, (result) => {
            const error = chrome.runtime.lastError;
            if (error) {
                reject(new Error(error.message || String(error)));
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * chrome.serial connections belong to the app, not the page: a reload or a
 * crash of the page leaves them open. At start-up none can be in use, so any
 * that is open was abandoned -- possibly a board shared in a remote support
 * session. Makes each one safe (safe_stop.js) and closes it.
 */
export async function releaseAbandonedSerialConnections() {
    const connections = await call(chrome.serial.getConnections).catch(() => []);
    for (const connection of connections) {
        console.log(`Remote support: releasing abandoned serial connection ${connection.connectionId}`);
        for (const group of safeStopGroups({ disarm: true })) {
            await call(chrome.serial.send, connection.connectionId, toArrayBuffer(group)).catch(() => {});
            await delay(STOP_GROUP_PAUSE);
        }
        await call(chrome.serial.disconnect, connection.connectionId).catch(() => {});
    }
}

export class RemoteDeviceHost {
    /**
     * @param {object} options
     * @param {(message: Uint8Array) => void} options.send to the supporter
     * @param {(name: string|null) => void} [options.onDevice] the device in use changed
     * @param {object[]} options.dfuFilters chrome.usb filters for DFU devices
     */
    constructor({ send, onDevice, dfuFilters }) {
        this.send = send;
        this.onDevice = onDevice;
        this.dfuFilters = dfuFilters;
        this.peer = false;
        this.serial = null; // { id, path, cli, stopped, settling }
        this.closing = null; // the link being closed, while it drains
        this.usb = null; // { handle, claimed: [] }
        this.lastList = '';
        this.queue = Promise.resolve();
        this.pollTimer = null;
        this.onSerialReceive = (info) => {
            if (this.closing && info.connectionId === this.closing.id) {
                this.closing.lastReceive = Date.now();
            }
            if (this.serial && info.connectionId === this.serial.id && !this.serial.settling) {
                this.send(concat(Uint8Array.of(MSG.SERIAL_DATA), new Uint8Array(info.data)));
            }
        };
        this.onSerialReceiveError = (info) => this.serialError(info);
    }

    start() {
        chrome.serial.onReceive.addListener(this.onSerialReceive);
        chrome.serial.onReceiveError.addListener(this.onSerialReceiveError);
        this.pollTimer = setInterval(() => this.enqueue(() => this.poll()), POLL_INTERVAL);
    }

    /** Makes the board safe, closes everything and stops listening. */
    async shutdown() {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
        await this.enqueue(() => this.closeAll());
        chrome.serial.onReceive.removeListener(this.onSerialReceive);
        chrome.serial.onReceiveError.removeListener(this.onSerialReceiveError);
    }

    /** A supporter has joined: start from a clean slate and tell them what's here. */
    peerJoined() {
        this.enqueue(async () => {
            await this.closeAll();
            this.peer = true;
            this.lastList = await this.listDevices();
            this.send(withReq(MSG.DEVICE_LIST, 0, textEncoder.encode(this.lastList)));
        });
    }

    /** A request from the supporter. */
    handle(message) {
        if (message[0] === MSG.SERIAL_WRITE) {
            // Not queued behind slow requests, but still in order with the
            // other writes.
            this.write(message.subarray(1));
            return;
        }
        this.enqueue(() => this.process(message));
    }

    enqueue(task) {
        this.queue = this.queue.then(task).catch((err) => console.warn('Remote support: device host', err));
        return this.queue;
    }

    setDevice(name) {
        this.onDevice?.(name);
    }

    // ---- device list ------------------------------------------------------

    async listDevices() {
        const serialPorts = await call(chrome.serial.getDevices).catch(() => []);
        const usbDevices = await call(chrome.usb.getDevices, { filters: this.dfuFilters }).catch(() => []);
        return JSON.stringify({
            // USB ports only: the configurator talks to flight controllers
            // over USB, and Windows adds one port per service of every paired
            // Bluetooth device (listed with vendor ID 0 and a MAC address
            // as the path).
            serial: serialPorts
                .filter((port, i) => port.vendorId && serialPorts.findIndex((p) => p.path === port.path) === i)
                .map((port) => ({
                    path: port.path,
                    displayName: port.displayName ?? port.path,
                    vid: port.vendorId,
                    pid: port.productId,
                })),
            dfu: usbDevices.map((device) => ({
                id: String(device.device),
                vid: device.vendorId,
                pid: device.productId,
                product: device.productName || null,
                serial: device.serialNumber || null,
            })),
        });
    }

    async poll() {
        const list = await this.listDevices();
        if (list !== this.lastList) {
            this.lastList = list;
            if (this.peer) {
                this.send(withReq(MSG.DEVICE_LIST, 0, textEncoder.encode(list)));
            }
        }
    }

    // ---- requests ---------------------------------------------------------

    async process(message) {
        let request;
        try {
            request = parseRequest(message);
        } catch (err) {
            const req = requestIdOf(message);
            if (req !== null) {
                this.send(error(req, err));
            }
            return;
        }
        const { req } = request;
        try {
            switch (request.type) {
                case MSG.LIST_DEVICES:
                    this.lastList = await this.listDevices();
                    this.send(withReq(MSG.DEVICE_LIST, req, textEncoder.encode(this.lastList)));
                    return;
                case MSG.SERIAL_OPEN:
                    await this.closeAll();
                    await this.openSerial(request);
                    break;
                case MSG.SERIAL_CLOSE:
                    await this.closeSerial();
                    break;
                case MSG.USB_OPEN:
                    await this.closeAll();
                    await this.openUsb(request.id);
                    break;
                case MSG.USB_CLOSE:
                    await this.closeUsb();
                    break;
                case MSG.USB_CLAIM:
                    await call(chrome.usb.claimInterface, this.usbHandle(), request.interfaceNumber);
                    this.usb.claimed.push(request.interfaceNumber);
                    break;
                case MSG.USB_RELEASE:
                    await call(chrome.usb.releaseInterface, this.usbHandle(), request.interfaceNumber);
                    this.usb.claimed = this.usb.claimed.filter((i) => i !== request.interfaceNumber);
                    break;
                case MSG.USB_RESET:
                    await call(chrome.usb.resetDevice, this.usbHandle());
                    break;
                case MSG.USB_CTRL_IN:
                case MSG.USB_CTRL_OUT: {
                    const transfer = { ...request.setup, timeout: USB_TIMEOUT };
                    if (request.type === MSG.USB_CTRL_IN) {
                        transfer.length = request.length;
                    } else {
                        transfer.data = toArrayBuffer(request.data);
                    }
                    const info = await call(chrome.usb.controlTransfer, this.usbHandle(), transfer);
                    if (info.resultCode !== 0) {
                        this.send(result(req, RESULT_STALL));
                    } else if (request.type === MSG.USB_CTRL_IN) {
                        this.send(result(req, RESULT_OK, new Uint8Array(info.data ?? new ArrayBuffer(0))));
                    } else {
                        const written = new Uint8Array(4);
                        new DataView(written.buffer).setUint32(0, request.data.length, true);
                        this.send(result(req, RESULT_OK, written));
                    }
                    return;
                }
            }
            this.send(result(req, RESULT_OK));
        } catch (err) {
            this.send(error(req, err));
        }
    }

    // ---- serial -----------------------------------------------------------

    async openSerial({ path, baud, parity, stopBits, dataBits }) {
        const info = await call(chrome.serial.connect, path, {
            bitrate: baud,
            parityBit: parity,
            stopBits,
            dataBits,
        });
        if (!info) {
            throw new Error(`Could not open ${path}`);
        }
        // Not ready (and the open not confirmed) until stale input is gone.
        this.serial = { id: info.connectionId, path, cli: false, stopped: false, settling: true };
        await call(chrome.serial.setPaused, info.connectionId, false).catch(() => {});
        await delay(SETTLE_TIME);
        await call(chrome.serial.flush, info.connectionId).catch(() => {});
        this.serial.settling = false;
        this.setDevice(`Serial port ${path} (${baud} baud)`);
    }

    write(data) {
        const link = this.serial;
        if (!link || link.stopped) {
            return;
        }
        if (data.length === 1 && data[0] === 0x23) {
            // A lone '#' switches the board into CLI mode.
            link.cli = true;
        }
        chrome.serial.send(link.id, toArrayBuffer(data), () => void chrome.runtime.lastError);
    }

    async sendAndWait(link, data) {
        await call(chrome.serial.send, link.id, toArrayBuffer(data)).catch(() => {});
    }

    /** Every way the supporter's port is let go of ends here, so this is where the board is made safe. */
    async closeSerial() {
        const link = this.serial;
        if (!link) {
            return;
        }
        this.serial = null;
        this.closing = link;
        if (!link.stopped) {
            if (link.cli) {
                await this.sendAndWait(link, CLI_EXIT);
                await delay(STOP_GROUP_PAUSE);
            }
            for (const group of safeStopGroups({ disarm: true })) {
                await this.sendAndWait(link, group);
                await delay(STOP_GROUP_PAUSE);
            }
            // Wait until the board has answered everything.
            const start = Date.now();
            link.lastReceive = Date.now();
            while (Date.now() - link.lastReceive < QUIET_TIME && Date.now() - start < MAX_DRAIN_TIME) {
                await delay(50);
            }
            await call(chrome.serial.flush, link.id).catch(() => {});
        }
        await call(chrome.serial.disconnect, link.id).catch(() => {});
        this.closing = null;
        this.setDevice(null);
    }

    serialError(info) {
        const link = this.serial;
        if (!link || info.connectionId !== link.id) {
            return;
        }
        if (FATAL_SERIAL_ERRORS.has(info.error)) {
            // Gone on its own (board rebooted, cable pulled): tell the
            // supporter and release it; there's nothing left to make safe.
            link.stopped = true;
            this.send(concat(Uint8Array.of(MSG.SERIAL_CLOSED), textEncoder.encode(info.error)));
            this.enqueue(async () => {
                if (this.serial === link) {
                    await this.closeSerial();
                }
            });
        } else {
            // chrome.serial pauses the connection on any receive error.
            chrome.serial.setPaused(link.id, false, () => void chrome.runtime.lastError);
        }
    }

    // ---- USB DFU ----------------------------------------------------------

    usbHandle() {
        if (!this.usb) {
            throw new Error('No USB device is open');
        }
        return this.usb.handle;
    }

    async openUsb(id) {
        const devices = await call(chrome.usb.getDevices, { filters: this.dfuFilters });
        const device = devices.find((d) => String(d.device) === id);
        if (!device) {
            throw new Error('The DFU device is no longer there');
        }
        const handle = await call(chrome.usb.openDevice, device);
        this.usb = { handle, claimed: [] };
        this.setDevice(`DFU device ${device.productName || id}`);
    }

    async closeUsb() {
        const link = this.usb;
        if (!link) {
            return;
        }
        this.usb = null;
        for (const interfaceNumber of link.claimed) {
            await call(chrome.usb.releaseInterface, link.handle, interfaceNumber).catch(() => {});
        }
        await call(chrome.usb.closeDevice, link.handle).catch(() => {});
        this.setDevice(null);
    }

    async closeAll() {
        await this.closeSerial();
        await this.closeUsb();
    }
}

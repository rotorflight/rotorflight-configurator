import { safeStopGroups } from '../msp/safe_stop.js';
import { createWebSerialPortEntries, getSerialProvider } from './WebSerial.js';
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
} from './RemoteDeviceProtocol.js';

/*
    The pilot's side of a remote support session in the browser: carries out
    the supporter's requests on this computer's flight controller through Web
    Serial and WebUSB. The browser counterpart of RemoteDeviceHost.js (the
    desktop app), answering the same messages (RemoteDeviceProtocol.js) with
    the same rules: requests are handled one at a time, only one serial port
    or USB device is open at a time, and every way the supporter's serial
    port is let go of goes through closeSerial(), which first disarms the
    board, stops the motors and releases every override (safe_stop.js). If
    the supporter switched the board into CLI mode, `exit` goes first.

    Browsers only hand out devices the person has granted access to, so the
    list sent to the supporter holds the granted ones (navigator.serial's
    getPorts() and navigator.usb's getDevices()); the remote support panel
    offers to grant more. Web Serial gives no device path, so ports are named
    by WebSerial.js's stable ids (VID/PID plus index), which the supporter
    sends back to open one. On Android, where Web Serial has no backend, the
    WebUSB polyfill stands in for it, as in the configurator's own connection.
*/

const POLL_INTERVAL = 500;
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
// As the configurator's own Web Serial connection: Chrome's default receive
// buffer is 255 bytes, which a busy page overruns.
const READ_BUFFER_SIZE = 16384;
const CLI_EXIT = textEncoder.encode('\r\nexit\r\n');

const WEBUSB_PARITY = { no: 'none', odd: 'odd', even: 'even' };

export class WebRemoteDeviceHost {
    /**
     * @param {object} options
     * @param {(message: Uint8Array) => void} options.send to the supporter
     * @param {(name: string|null) => void} [options.onDevice] the device in use changed
     * @param {object[]} options.dfuFilters WebUSB filters ({ vendorId, productId }) for DFU devices
     * @param {object|null} [options.serial] a navigator.serial-like provider (getPorts()); defaults to the browser's
     * @param {object|null} [options.usb] navigator.usb or a stand-in (getDevices()); defaults to the browser's
     */
    constructor({ send, onDevice, dfuFilters, serial = getSerialProvider(), usb = globalThis.navigator?.usb ?? null }) {
        this.send = send;
        this.onDevice = onDevice;
        this.dfuFilters = dfuFilters;
        this.serialProvider = serial;
        this.usbProvider = usb;
        this.peer = false;
        this.serial = null; // { port, path, writer, reader, reading, writes, cli, stopped, settling, closed, lastReceive }
        this.usb = null; // { device, id, claimed: [] }
        // From the last device list: what the supporter's names refer to.
        this.serialPorts = [];
        this.usbDevices = new Map();
        this.lastList = '';
        this.queue = Promise.resolve();
        this.pollTimer = null;
    }

    start() {
        this.pollTimer = setInterval(() => this.enqueue(() => this.poll()), POLL_INTERVAL);
    }

    /** Makes the board safe and closes everything. */
    async shutdown() {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
        await this.enqueue(() => this.closeAll());
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
        let ports = [];
        if (this.serialProvider) {
            ports = await this.serialProvider.getPorts().catch(() => []);
        }
        this.serialPorts = createWebSerialPortEntries(ports);

        let devices = [];
        if (this.usbProvider) {
            devices = await this.usbProvider.getDevices().catch(() => []);
        }
        this.usbDevices = new Map();
        const seen = new Map();
        const dfu = devices
            .filter((device) => this.dfuFilters.some((f) => f.vendorId === device.vendorId && f.productId === device.productId))
            .map((device) => {
                // WebUSB has no device number; name them as WebSerial.js does
                // its ports, so the same board keeps its name across polls.
                const key = `${device.vendorId}_${device.productId}`;
                const index = seen.get(key) ?? 0;
                seen.set(key, index + 1);
                const id = `webusb_${key}_${index}`;
                this.usbDevices.set(id, device);
                return {
                    id,
                    vid: device.vendorId,
                    pid: device.productId,
                    product: device.productName || null,
                    serial: device.serialNumber || null,
                };
            });

        return JSON.stringify({
            serial: this.serialPorts.map((entry) => {
                const info = entry.port.getInfo?.() ?? {};
                return {
                    path: entry.path,
                    displayName: entry.displayName,
                    vid: info.usbVendorId ?? 0,
                    pid: info.usbProductId ?? 0,
                };
            }),
            dfu,
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
                    await this.usbDevice().claimInterface(request.interfaceNumber);
                    this.usb.claimed.push(request.interfaceNumber);
                    break;
                case MSG.USB_RELEASE:
                    await this.usbDevice().releaseInterface(request.interfaceNumber);
                    this.usb.claimed = this.usb.claimed.filter((i) => i !== request.interfaceNumber);
                    break;
                case MSG.USB_RESET:
                    await this.usbDevice().reset();
                    break;
                case MSG.USB_CTRL_IN: {
                    const transfer = await this.usbDevice().controlTransferIn(request.setup, request.length);
                    if (transfer.status === 'stall') {
                        this.send(result(req, RESULT_STALL));
                    } else if (transfer.status !== 'ok') {
                        throw new Error(`USB transfer ${transfer.status}`);
                    } else {
                        const data = transfer.data;
                        this.send(result(req, RESULT_OK, new Uint8Array(data.buffer, data.byteOffset, data.byteLength)));
                    }
                    return;
                }
                case MSG.USB_CTRL_OUT: {
                    const transfer = await this.usbDevice().controlTransferOut(request.setup, toArrayBuffer(request.data));
                    if (transfer.status === 'stall') {
                        this.send(result(req, RESULT_STALL));
                    } else if (transfer.status !== 'ok') {
                        throw new Error(`USB transfer ${transfer.status}`);
                    } else {
                        const written = new Uint8Array(4);
                        new DataView(written.buffer).setUint32(0, transfer.bytesWritten, true);
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
        let entry = this.serialPorts.find((p) => p.path === path);
        if (!entry) {
            // The supporter may be quicker than the poll (e.g. right after a
            // reboot).
            await this.listDevices();
            entry = this.serialPorts.find((p) => p.path === path);
        }
        if (!entry) {
            throw new Error(`Port ${path} not found`);
        }
        const { port } = entry;
        await port.open({
            baudRate: baud,
            dataBits: dataBits === 'seven' ? 7 : 8,
            stopBits: stopBits === 'two' ? 2 : 1,
            parity: WEBUSB_PARITY[parity],
            bufferSize: READ_BUFFER_SIZE,
        });
        // Not ready (and the open not confirmed) until stale input is gone.
        const link = {
            port,
            path,
            writer: port.writable.getWriter(),
            reader: null,
            writes: Promise.resolve(),
            cli: false,
            stopped: false,
            settling: true,
            closed: false,
            lastReceive: Date.now(),
        };
        this.serial = link;
        link.reading = this.readLoop(link);
        await delay(SETTLE_TIME);
        link.settling = false;
        this.setDevice(`Serial port ${entry.displayName} (${baud} baud)`);
    }

    /** Forwards what the board sends until the port is closed or lost. */
    async readLoop(link) {
        while (link.port.readable && !link.closed) {
            const reader = link.port.readable.getReader();
            link.reader = reader;
            try {
                for (;;) {
                    const { value, done } = await reader.read();
                    if (done) {
                        break;
                    }
                    link.lastReceive = Date.now();
                    // Once closing has begun, the board's answers only
                    // serve to tell when it has gone quiet.
                    if (value?.length && !link.settling && this.serial === link) {
                        this.send(concat(Uint8Array.of(MSG.SERIAL_DATA), value));
                    }
                }
            } catch (err) {
                // Overrun, break, framing and parity errors leave a new
                // port.readable behind: keep reading. Only a lost port ends
                // the link.
                if (!link.closed && (err?.name === 'NetworkError' || !link.port.readable)) {
                    this.serialError(link, err);
                    return;
                }
            } finally {
                reader.releaseLock();
                link.reader = null;
            }
        }
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
        // Not awaited, but the writes stay in order.
        this.sendAndWait(link, data.slice()).catch(() => {});
    }

    sendAndWait(link, data) {
        link.writes = link.writes.then(() => link.writer.write(data)).catch(() => {});
        return link.writes;
    }

    /** Every way the supporter's port is let go of ends here, so this is where the board is made safe. */
    async closeSerial() {
        const link = this.serial;
        if (!link) {
            return;
        }
        this.serial = null;
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
        }
        link.closed = true;
        await link.reader?.cancel().catch(() => {});
        // The read loop releases its lock on the way out; the port can't
        // close before.
        await link.reading;
        await link.writes;
        try {
            link.writer.releaseLock();
        } catch {
            // Already released by a failed write.
        }
        await link.port.close().catch(() => {});
        this.setDevice(null);
    }

    /** The port is gone on its own (board rebooted, cable pulled). */
    serialError(link, err) {
        if (this.serial !== link) {
            return;
        }
        // Tell the supporter and release it; there's nothing left to make
        // safe.
        link.stopped = true;
        this.send(concat(Uint8Array.of(MSG.SERIAL_CLOSED), textEncoder.encode(err?.name || 'device_lost')));
        this.enqueue(async () => {
            if (this.serial === link) {
                await this.closeSerial();
            }
        });
    }

    // ---- USB DFU ----------------------------------------------------------

    usbDevice() {
        if (!this.usb) {
            throw new Error('No USB device is open');
        }
        return this.usb.device;
    }

    async openUsb(id) {
        let device = this.usbDevices.get(id);
        if (!device) {
            await this.listDevices();
            device = this.usbDevices.get(id);
        }
        if (!device) {
            throw new Error('The DFU device is no longer there');
        }
        await device.open();
        // The supporter's side (RemoteUsbDevice) takes configuration 1 as
        // selected, like the tool does.
        if (device.configuration === null) {
            await device.selectConfiguration(1);
        }
        this.usb = { device, id, claimed: [] };
        this.setDevice(`DFU device ${device.productName || id}`);
    }

    async closeUsb() {
        const link = this.usb;
        if (!link) {
            return;
        }
        this.usb = null;
        for (const interfaceNumber of link.claimed) {
            await link.device.releaseInterface(interfaceNumber).catch(() => {});
        }
        await link.device.close().catch(() => {});
        this.setDevice(null);
    }

    async closeAll() {
        await this.closeSerial();
        await this.closeUsb();
    }
}

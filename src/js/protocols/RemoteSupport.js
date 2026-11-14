import { i18n } from '@/js/localization.js';
import { SIDE } from '@/js/protocols/RemoteCrypto.js';
import { RemoteDeviceHost, releaseAbandonedSerialConnections } from '@/js/protocols/RemoteDeviceHost.js';
import {
    CONTROL,
    MSG,
    RESULT_OK,
    RESULT_STALL,
    concat,
    textDecoder,
    textEncoder,
} from '@/js/protocols/RemoteDeviceProtocol.js';
import { WebRemoteDeviceHost } from '@/js/protocols/WebRemoteDeviceHost.js';
import { RemoteSession } from '@/js/protocols/RemoteSession.js';
import { getSerialProvider } from '@/js/protocols/WebSerial.js';

/*
    Remote support: a supporter works on the flight controller plugged into
    the pilot's computer, from their own configurator, through a relay. This
    module makes the pilot's serial ports and DFU devices usable like local
    ones on the supporter's side:

    - serial.js connects to ports whose path starts with REMOTE_PORT_PREFIX
      through openSerial()/writeSerial()/closeSerial().
    - stm32usbdfu.js drives remote DFU devices through RemoteUsbDevice, which
      implements the part of the WebUSB USBDevice interface it uses.

    Sessions run inside the configurator (RemoteSession.js), in the desktop
    app and in the browser. Everything is encrypted end to end between the
    two configurators; the relay only passes it on. The pilot's side is a
    device host: RemoteDeviceHost.js (chrome.serial and chrome.usb) in the
    desktop app, WebRemoteDeviceHost.js (Web Serial and WebUSB) in the
    browser. Joining needs no device access, so a supporter can use any
    browser; sharing needs Web Serial or WebUSB, which Chrome and Edge have
    and Firefox and Safari don't (see canShareDevices()).

    The same session also carries the screen mirroring messages used by
    RemoteView.svelte.js, and the CONTROL messages that hand the flight
    controller back and forth:

    - The supporter has control when a session starts.
    - The pilot takes control (takeControl(), or when the supporter hands it
      over): the device host makes the board safe, lets go of it and lists
      no devices, so the pilot's own configurator can connect, e.g. to
      calibrate something on the bench.
    - The pilot gives control back (giveControl()) once their configurator
      has let go of the board: the supporter sees the ports again.

    The pilot's side decides; the supporter can hand control over or ask for
    it back, but never takes it.

    In the browser, the pilot's side can only share the ports and DFU devices
    the pilot has allowed, which takes a click of theirs. Its device list says
    so (`allow`), and the supporter can ask for one (CONTROL.ALLOW_PORT,
    ALLOW_DFU; the flasher asks by itself when the board reboots into DFU
    mode). The pilot's side shows these requests until what was asked for is
    shared, or the pilot dismisses them.
*/

export const REMOTE_PORT_PREFIX = 'remote:';
export const { VIEW_DATA, VIEW_REQUEST } = MSG;

// Where remote support runs: the desktop app and the browser.
export const REMOTE_SUPPORT_AVAILABLE = __BACKEND__ === 'nwjs' || __BACKEND__ === 'web';

/**
 * Whether this configurator can share a flight controller: the desktop app
 * always can; a browser needs Web Serial or WebUSB.
 */
export function canShareDevices() {
    if (__BACKEND__ === 'nwjs') {
        return true;
    }
    return __BACKEND__ === 'web' && getSerialProvider() !== null;
}

// Only passes on encrypted messages between the two ends of a session. Runs
// on the same server as Wingflight's relay, but sessions are kept apart by
// domain: a Wingflight session ID is unknown here.
const RELAY_URL = 'wss://remote.rotorflight.org';
// Longer than a device host's own 10 s USB transfer timeout, so a slow
// transfer reports its real error instead of this one.
const REQUEST_TIMEOUT = 15000;
// Keeps a large write (e.g. a CLI paste) to messages of a sensible size.
const SERIAL_WRITE_CHUNK = 8192;

const REQUEST_TYPES = { standard: 0x00, class: 0x20, vendor: 0x40 };
const RECIPIENTS = { device: 0x00, interface: 0x01, endpoint: 0x02, other: 0x03 };

function header(type, req, extraLength = 0) {
    const bytes = new Uint8Array(5 + extraLength);
    bytes[0] = type;
    new DataView(bytes.buffer).setUint32(1, req, true);
    return bytes;
}

function toBytes(data) {
    if (!data) {
        return new Uint8Array(0);
    }
    if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    return Uint8Array.from(data);
}

function setupBytes(direction, setup) {
    const bytes = new Uint8Array(6);
    const view = new DataView(bytes.buffer);
    bytes[0] = (direction === 'in' ? 0x80 : 0x00) | (REQUEST_TYPES[setup.requestType] ?? 0) | (RECIPIENTS[setup.recipient] ?? 0);
    bytes[1] = setup.request;
    view.setUint16(2, setup.value, true);
    view.setUint16(4, setup.index, true);
    return bytes;
}

function failure(result) {
    return new Error(textDecoder.decode(result.payload) || 'Remote request failed');
}

/**
 * A remote DFU device, shaped like WebUSB's USBDevice as far as
 * stm32usbdfu.js's WebUSB code path uses it.
 */
export class RemoteUsbDevice {
    constructor(client, entry) {
        this.client = client;
        this.id = entry.id;
        this.vendorId = entry.vid;
        this.productId = entry.pid;
        this.productName = entry.product ?? '';
        this.serialNumber = entry.serial ?? '';
        // The pilot's device host selects configuration 1 when opening, so
        // there is always one active.
        this.configuration = { configurationValue: 1 };
    }

    async simple(type, extra = new Uint8Array(0)) {
        const result = await this.client.request((req) => concat(header(type, req), extra));
        if (result.status !== RESULT_OK) {
            throw failure(result);
        }
    }

    open() {
        return this.simple(MSG.USB_OPEN, textEncoder.encode(this.id));
    }

    async selectConfiguration() {}

    close() {
        return this.simple(MSG.USB_CLOSE);
    }

    claimInterface(interfaceNumber) {
        return this.simple(MSG.USB_CLAIM, Uint8Array.of(interfaceNumber));
    }

    releaseInterface(interfaceNumber) {
        return this.simple(MSG.USB_RELEASE, Uint8Array.of(interfaceNumber));
    }

    reset() {
        return this.simple(MSG.USB_RESET);
    }

    async controlTransferIn(setup, length) {
        const lengthBytes = new Uint8Array(2);
        new DataView(lengthBytes.buffer).setUint16(0, length, true);
        const result = await this.client.request((req) =>
            concat(header(MSG.USB_CTRL_IN, req), setupBytes('in', setup), lengthBytes),
        );
        if (result.status === RESULT_STALL) {
            return { status: 'stall', data: new DataView(new ArrayBuffer(0)) };
        }
        if (result.status !== RESULT_OK) {
            throw failure(result);
        }
        const data = result.payload.slice();
        return { status: 'ok', data: new DataView(data.buffer) };
    }

    async controlTransferOut(setup, data) {
        const bytes = toBytes(data);
        const result = await this.client.request((req) =>
            concat(header(MSG.USB_CTRL_OUT, req), setupBytes('out', setup), bytes),
        );
        if (result.status === RESULT_STALL) {
            return { status: 'stall', bytesWritten: 0 };
        }
        if (result.status !== RESULT_OK) {
            throw failure(result);
        }
        return { status: 'ok', bytesWritten: bytes.length };
    }
}

class RemoteSupportClient {
    constructor() {
        this.hostConnected = false;
        this.relayConnected = false;
        this.peerConnected = false;
        // The running session, if any, and what settles once it is over and
        // the board has been made safe.
        this.embedded = null;
        this.embeddedDone = Promise.resolve();
        // chrome.usb / WebUSB filters for the DFU devices a shared board may
        // show up as.
        this.dfuFilters = [];
        // The current session: { role, code, device, message, error }, role
        // being 'share', 'join' or null.
        this.session = { role: null };
        // Who works on the flight controller: 'supporter' or 'pilot'. The
        // pilot's side decides, and tells the supporter's side.
        this.control = 'supporter';
        this.resetControlState();
        // Pilot: set by RemoteView.svelte.js, called when the supporter
        // hands control over.
        this.onHandOver = null;
        // Pilot: the device host of the running session.
        this.host = null;
        // Pilot: control is being handed over right now.
        this.switching = false;
        // Called when the status above changes, and with each screen
        // mirroring message.
        this.onChange = null;
        this.onView = null;
        this.serialPorts = [];
        this.dfuDevices = [];
        this.pending = new Map();
        this.nextReq = 1;
        // Set by serial.js while a remote port is open.
        this.onSerialData = null;
        this.onSerialClosed = null;
    }

    /** True while this configurator is joined to a pilot's flight controller. */
    get available() {
        return this.hostConnected && this.session.role === 'join' && this.embedded !== null;
    }

    /** `dfuFilters`: DFU device filters (port_handler.js's usbDevices). */
    start({ dfuFilters = [] } = {}) {
        this.dfuFilters = dfuFilters;
        if (__BACKEND__ === 'nwjs' && globalThis.chrome?.serial) {
            releaseAbandonedSerialConnections();
        }
    }

    /** Sends a message to the other side of the session. */
    send(bytes) {
        this.embedded?.send(bytes);
    }

    linkDown() {
        this.hostConnected = false;
        this.serialPorts = [];
        this.dfuDevices = [];
        for (const { reject, timer } of this.pending.values()) {
            clearTimeout(timer);
            reject(new Error('Remote support connection lost'));
        }
        this.pending.clear();
        this.onSerialClosed?.('Remote support connection lost');
    }

    /** Takes over the session's status. */
    applyStatus(relayConnected, hostConnected, session) {
        this.relayConnected = relayConnected;
        const previous = JSON.stringify(this.session) + this.peerConnected;
        this.session = session;
        const isJoin = session.role === 'join';
        if (hostConnected && isJoin && !this.hostConnected) {
            console.log('Remote support: connected to remote device host');
            this.hostConnected = true;
            this.refreshDevices().catch(() => {});
        } else if (!(hostConnected && isJoin) && this.hostConnected) {
            console.log('Remote support: remote device host disconnected');
            this.linkDown();
        }
        this.peerConnected = hostConnected;
        if (previous !== JSON.stringify(this.session) + this.peerConnected) {
            this.onChange?.();
        }
    }

    resetControlState() {
        this.control = 'supporter';
        // Pilot: the supporter has asked for control back.
        this.controlAsked = false;
        // Pilot: the supporter asked to allow a port / DFU device, and how
        // many were shared then: the request is done once there are more.
        this.allowRequests = { serial: false, dfu: false };
        this.allowBaseline = { serial: 0, dfu: 0 };
        // Pilot: how many ports / DFU devices the supporter can see.
        this.shared = { serial: 0, dfu: 0 };
        this.sharedKnown = false;
        // Supporter: whether the pilot can allow more of them (browser).
        this.peerCanAllow = { serial: false, dfu: false };
        // Supporter: the pilot answered "not now" to asking for control.
        this.controlDeclined = false;
    }

    /** A CONTROL message from the other side of the session. */
    handleControl(code) {
        if (this.session.role === 'share') {
            if (code === CONTROL.HAND_OVER) {
                this.onHandOver?.();
            } else if (code === CONTROL.ASK && this.control === 'pilot') {
                this.controlAsked = true;
                this.onChange?.();
            } else if (code === CONTROL.ALLOW_PORT || code === CONTROL.ALLOW_DFU) {
                const kind = code === CONTROL.ALLOW_DFU ? 'dfu' : 'serial';
                if (!this.allowRequests[kind]) {
                    this.allowRequests = { ...this.allowRequests, [kind]: true };
                    this.allowBaseline = { ...this.allowBaseline, [kind]: this.shared[kind] };
                    this.onChange?.();
                }
            }
        } else if (this.session.role === 'join') {
            const control = { [CONTROL.PILOT]: 'pilot', [CONTROL.SUPPORTER]: 'supporter' }[code];
            if (control && control !== this.control) {
                this.control = control;
                this.controlDeclined = false;
                this.onChange?.();
            } else if (code === CONTROL.NOT_NOW && this.control === 'pilot') {
                this.controlDeclined = true;
                this.onChange?.();
            }
        }
    }

    /** Pilot: what the device host just told the supporter it shares. */
    noteSharedDevices(message) {
        if (message[0] !== MSG.DEVICE_LIST || message.length < 5) {
            return;
        }
        let list;
        try {
            list = JSON.parse(textDecoder.decode(message.subarray(5)));
        } catch {
            return;
        }
        const shared = { serial: list.serial?.length ?? 0, dfu: list.dfu?.length ?? 0 };
        const requests = {
            // Done once one more of that kind is shared.
            serial: this.allowRequests.serial && shared.serial <= this.allowBaseline.serial,
            dfu: this.allowRequests.dfu && shared.dfu <= this.allowBaseline.dfu,
        };
        if (!this.sharedKnown
            || JSON.stringify([shared, requests]) !== JSON.stringify([this.shared, this.allowRequests])) {
            this.sharedKnown = true;
            this.shared = shared;
            this.allowRequests = requests;
            this.onChange?.();
        }
    }

    /** Pilot: not ready to give control back yet. */
    declineControl() {
        if (this.session.role === 'share' && this.controlAsked) {
            this.controlAsked = false;
            this.sendControl(CONTROL.NOT_NOW);
            this.onChange?.();
        }
    }

    /** Pilot: closes a request to allow a port (`kind` 'serial') or DFU device ('dfu'). */
    dismissAllowRequest(kind) {
        if (this.allowRequests[kind]) {
            this.allowRequests = { ...this.allowRequests, [kind]: false };
            this.onChange?.();
        }
    }

    /** Supporter: asks the pilot to allow a port (`kind` 'serial') or DFU device ('dfu'). */
    askToAllow(kind) {
        if (this.session.role === 'join' && this.control === 'supporter' && this.peerCanAllow[kind]) {
            this.sendControl(kind === 'dfu' ? CONTROL.ALLOW_DFU : CONTROL.ALLOW_PORT);
        }
    }

    sendControl(code) {
        this.send(Uint8Array.of(MSG.CONTROL, code));
    }

    /**
     * Pilot: takes control of the flight controller. Resolves once the
     * board has been made safe and let go of, so this configurator can open
     * it. Throws while the supporter may be flashing firmware: letting go of
     * the board then would leave it half flashed.
     */
    async takeControl() {
        if (this.session.role !== 'share' || !this.host || this.control === 'pilot' || this.switching) {
            return;
        }
        if (this.host.usbInUse) {
            throw new Error(i18n.getMessage('remoteSupportControlFlashing'));
        }
        this.switching = true;
        try {
            // Tell the supporter first, so they know why the port goes away.
            this.sendControl(CONTROL.PILOT);
            await this.host.pause();
            this.control = 'pilot';
            this.controlAsked = false;
            this.onChange?.();
        } finally {
            this.switching = false;
        }
    }

    /**
     * Pilot: gives control back to the supporter. This configurator must
     * have let go of the flight controller already.
     */
    async giveControl() {
        if (this.session.role !== 'share' || !this.host || this.control !== 'pilot' || this.switching) {
            return;
        }
        this.switching = true;
        try {
            this.control = 'supporter';
            this.controlAsked = false;
            this.sendControl(CONTROL.SUPPORTER);
            this.onChange?.();
            await this.host.resume();
        } finally {
            this.switching = false;
        }
    }

    /** Supporter: hands control to the pilot. Disconnect from their board first. */
    handOver() {
        if (this.session.role === 'join' && this.control === 'supporter') {
            this.sendControl(CONTROL.HAND_OVER);
        }
    }

    /** Supporter: asks the pilot for control back. */
    askForControl() {
        if (this.session.role === 'join' && this.control === 'pilot') {
            this.controlDeclined = false;
            this.sendControl(CONTROL.ASK);
            this.onChange?.();
        }
    }

    /** A message from the other side of the session (supporter's side). */
    handleMessage(data) {
        if (!data.length) {
            return;
        }
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        switch (data[0]) {
            case MSG.DEVICE_LIST: {
                if (data.length < 5) {
                    break;
                }
                const req = view.getUint32(1, true);
                try {
                    const list = JSON.parse(textDecoder.decode(data.subarray(5)));
                    const previous = JSON.stringify([this.serialPorts, this.dfuDevices, this.peerCanAllow]);
                    this.serialPorts = list.serial ?? [];
                    this.dfuDevices = list.dfu ?? [];
                    this.peerCanAllow = { serial: Boolean(list.allow?.serial), dfu: Boolean(list.allow?.dfu) };
                    if (previous !== JSON.stringify([this.serialPorts, this.dfuDevices, this.peerCanAllow])) {
                        this.onChange?.();
                    }
                } catch (err) {
                    console.warn('Remote support: bad device list', err);
                }
                this.resolve(req, { status: RESULT_OK, payload: new Uint8Array(0) });
                break;
            }
            case MSG.SERIAL_DATA:
                this.onSerialData?.(data.slice(1).buffer);
                break;
            case MSG.SERIAL_CLOSED:
                this.onSerialClosed?.(textDecoder.decode(data.subarray(1)));
                break;
            case MSG.RESULT:
                if (data.length >= 6) {
                    this.resolve(view.getUint32(1, true), { status: data[5], payload: data.subarray(6) });
                }
                break;
        }
    }

    joinSession(code) {
        this.startSession(SIDE.JOIN, code);
    }

    shareSession() {
        this.startSession(SIDE.SHARE);
    }

    stopSession() {
        this.embedded?.stop();
    }

    /** Starts a session, unless one is already running. */
    startSession(role, code) {
        if (!REMOTE_SUPPORT_AVAILABLE || this.embedded || this.session.role !== null) {
            return;
        }
        if (role === SIDE.SHARE && !canShareDevices()) {
            return;
        }
        let lastStatus = { sessionId: null, peerConnected: false, code: null };
        let device = null;
        const report = () => {
            this.applyStatus(lastStatus.sessionId !== null, lastStatus.peerConnected, {
                role,
                code: lastStatus.code,
                device,
                message: null,
                error: false,
            });
        };
        const session = new RemoteSession({
            relayUrl: RELAY_URL,
            role,
            code,
            onStatus: (status) => {
                lastStatus = status;
                report();
            },
            onMessage: (message) => {
                if (message[0] === MSG.VIEW_DATA || message[0] === MSG.VIEW_REQUEST) {
                    this.onView?.(message[0], message.subarray(1));
                } else if (message[0] === MSG.CONTROL) {
                    if (message.length >= 2) {
                        this.handleControl(message[1]);
                    }
                } else if (host) {
                    host.handle(message);
                } else {
                    this.handleMessage(message);
                }
            },
            onPeerJoined: () => host?.peerJoined(),
        });
        // Sharing: this computer's serial ports and DFU devices, for the supporter.
        const hostOptions = {
            send: (message) => {
                this.noteSharedDevices(message);
                session.send(message);
            },
            onDevice: (name) => {
                device = name;
                report();
            },
            dfuFilters: this.dfuFilters,
        };
        let host = null;
        if (role === SIDE.SHARE) {
            host = __BACKEND__ === 'web' ? new WebRemoteDeviceHost(hostOptions) : new RemoteDeviceHost(hostOptions);
        }
        host?.start();

        this.host = host;
        this.resetControlState();
        this.embedded = session;
        this.applyStatus(false, false, { role, code: null, device: null, message: null, error: false });
        this.embeddedDone = session.run().then(async ({ message, error }) => {
            // Make the board safe and let go of it before saying the session is over.
            await host?.shutdown();
            this.embedded = null;
            this.host = null;
            this.resetControlState();
            this.applyStatus(false, false, { role: null, code: null, device: null, message, error });
        });
    }

    /**
     * Ends the session and waits until it is over (and a shared board has
     * been made safe), e.g. before the app closes.
     */
    shutdown() {
        this.embedded?.stop();
        return this.embeddedDone;
    }

    /** Sends a screen mirroring message (`type` is VIEW_DATA or VIEW_REQUEST). */
    sendView(type, bytes) {
        this.send(concat(Uint8Array.of(type), bytes));
    }

    resolve(req, result) {
        const pending = this.pending.get(req);
        if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(req);
            pending.resolve(result);
        }
    }

    /** Sends `build(req)` and resolves with the matching RESULT/DEVICE_LIST. */
    request(build) {
        if (!this.available) {
            return Promise.reject(new Error('Remote support is not connected'));
        }
        const req = this.nextReq;
        this.nextReq = this.nextReq >= 0xffffffff ? 1 : this.nextReq + 1;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(req);
                reject(new Error('Remote support request timed out'));
            }, REQUEST_TIMEOUT);
            this.pending.set(req, { resolve, reject, timer });
            this.send(build(req));
        });
    }

    refreshDevices() {
        return this.request((req) => header(MSG.LIST_DEVICES, req));
    }

    /** Remote serial ports, shaped like serial.getDevices() entries. */
    getSerialPorts() {
        if (!this.available) {
            return [];
        }
        return this.serialPorts.map((port) => ({
            path: REMOTE_PORT_PREFIX + port.path,
            displayName: i18n.getMessage('portsRemoteDevice', [port.displayName]),
        }));
    }

    /** The first remote DFU device matching a chrome.usb-style filter list, or null. */
    findDfuDevice(filters) {
        if (!this.available) {
            return null;
        }
        const entry = this.dfuDevices.find((d) => filters.some((f) => f.vendorId === d.vid && f.productId === d.pid));
        return entry ? new RemoteUsbDevice(this, entry) : null;
    }

    /** `options` are chrome.serial connect options. */
    async openSerial(path, options = {}) {
        const settings = new Uint8Array(7);
        const view = new DataView(settings.buffer);
        view.setUint32(0, options.bitrate || 115200, true);
        settings[4] = { odd: 1, even: 2 }[options.parityBit] ?? 0;
        settings[5] = options.stopBits === 'two' ? 2 : 1;
        settings[6] = options.dataBits === 'seven' ? 7 : 8;
        const result = await this.request((req) => concat(header(MSG.SERIAL_OPEN, req), settings, textEncoder.encode(path)));
        if (result.status !== RESULT_OK) {
            throw failure(result);
        }
    }

    writeSerial(data) {
        const bytes = toBytes(data);
        for (let offset = 0; offset < bytes.length; offset += SERIAL_WRITE_CHUNK) {
            this.send(concat(Uint8Array.of(MSG.SERIAL_WRITE), bytes.subarray(offset, offset + SERIAL_WRITE_CHUNK)));
        }
    }

    async closeSerial() {
        const result = await this.request((req) => header(MSG.SERIAL_CLOSE, req));
        if (result.status !== RESULT_OK) {
            throw failure(result);
        }
    }
}

export const RemoteSupport = new RemoteSupportClient();

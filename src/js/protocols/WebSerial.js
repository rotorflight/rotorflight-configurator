import { webUsbSerialPolyfill } from './webUsbSerialPolyfill.js';

// Chrome for Android exposes `navigator.serial` as an object, but there is no
// OS-level serial backend behind it there -- getPorts()/requestPort() always
// resolve with nothing, even for FCs that are genuinely connected and
// enumerable over WebUSB (confirmed: device shows in chrome://device-log but
// never appears in navigator.serial's own picker). So 'serial' in navigator
// alone isn't reliable proof of a working backend on Android, and we skip
// straight to the WebUSB-backed polyfill (see webUsbSerialPolyfill.js) there.
function isAndroid() {
    if (navigator.userAgentData?.platform) {
        return navigator.userAgentData.platform === 'Android';
    }
    return /Android/.test(navigator.userAgent);
}

function getSerialProvider() {
    if (!isAndroid() && 'serial' in navigator) {
        return navigator.serial;
    }
    if ('usb' in navigator) {
        return webUsbSerialPolyfill;
    }
    return null;
}

// Flight-controller-adjacent USB-serial VID/PIDs, mirroring the filter set
// Betaflight Configurator passes to navigator.serial.requestPort() -- without
// filters Chrome's device picker lists every serial port on the system,
// including ones that can never be a flight controller.
// NOTE: the Web Serial API's SerialPortFilter uses usbVendorId/usbProductId
// (not vendorId/productId, which is WebUSB's USBDeviceFilter naming) --
// requestPort() throws "A filter must provide a property to filter by" if a
// filter object has neither.
const webSerialDeviceFilters = [
    { usbVendorId: 1027, usbProductId: 24577 }, // FTDI FT232R USB UART
    { usbVendorId: 1155, usbProductId: 12886 }, // STM32 in HID mode
    { usbVendorId: 1155, usbProductId: 14158 }, // STM Electronics STLink Virtual COM Port (NUCLEO boards)
    { usbVendorId: 1155, usbProductId: 22336 }, // STM Electronics Virtual COM Port
    { usbVendorId: 4292, usbProductId: 60000 }, // Silicon Labs CP210x
    { usbVendorId: 4292, usbProductId: 60001 }, // Silicon Labs CP210x
    { usbVendorId: 4292, usbProductId: 60002 }, // Silicon Labs CP210x
    { usbVendorId: 10473, usbProductId: 394 }, // GD32 VCP
    { usbVendorId: 11836, usbProductId: 22336 }, // AT32 VCP
    { usbVendorId: 12619, usbProductId: 22336 }, // APM32 VCP
    { usbVendorId: 11914, usbProductId: 9 }, // Raspberry Pi Pico VCP
    { usbVendorId: 6790, usbProductId: 29986 }, // CH340 USB-to-Serial (variant)
    { usbVendorId: 6790, usbProductId: 29987 }, // CH340 USB-to-Serial
    { usbVendorId: 6790, usbProductId: 21795 }, // CH341 USB-to-Serial
    { usbVendorId: 6790, usbProductId: 30084 }, // CH340S USB-to-Serial
    { usbVendorId: 14743, usbProductId: 22336 }, // X32 VCP
];

// Names deliberately embed the substrings PortHandler.portRecognized() (in
// port_handler.js) matches on ("STM", "CP210") so auto-select-on-detect keeps
// working the same way it does for the nwjs/chrome.serial device list.
const webSerialVendorNames = {
    1027: 'FTDI',
    1155: 'STM Electronics',
    4292: 'Silicon Labs CP210x',
    6790: 'WCH CH340',
    11836: 'AT32',
    12619: 'Geehy APM32',
    11914: 'Raspberry Pi Pico',
    14743: 'X-CORE LABS',
};

// Stable id per physical device. This used to key ids off SerialPort
// *object* identity (a WeakMap), on the assumption that Chrome hands back
// the same object for an already-authorized device on every getPorts() --
// confirmed false in practice: after a real USB detach/reattach (e.g. an
// FC's MCU resetting on `save`/`exit`, as happens on every restore), Chrome
// returns a *new* SerialPort object for the same authorized physical
// device. A WeakMap keyed on that object then never finds the id assigned
// before the reset, so restoreOverSerial()'s reconnect permanently fails
// with "WebSerial port not found" even though the browser still has (and
// silently reuses) permission for the device -- this cost a lot of
// debugging to pin down, since it looks identical to a real permission
// loss from the caller's side.
//
// Web Serial's getInfo() only ever exposes usbVendorId/usbProductId -- no
// serial number, no stable device path (deliberately, to limit
// fingerprinting) -- so that's the only identity available to correlate a
// device across a reconnect. Ids are built from VID/PID plus this device's
// index among ports sharing that VID/PID in the *current* list, so two
// simultaneously-connected boards that happen to share a VID/PID (e.g. two
// of the same USB-serial chip) still get distinct ids, while a single
// board's id survives its own reboot.
const webSerialFallbackIds = new WeakMap();
let webSerialNextFallbackId = 0;

function getStableWebSerialId(info, port, indexAmongSameVidPid) {
    if (info.usbVendorId != null && info.usbProductId != null) {
        return `webserial_${info.usbVendorId}_${info.usbProductId}_${indexAmongSameVidPid}`;
    }
    // Some backends may not expose a VID/PID at all -- fall back to a
    // per-object id. It won't survive a reconnect, but that's no worse than
    // the old behavior, and there's nothing else to key it on.
    let id = webSerialFallbackIds.get(port);
    if (id === undefined) {
        id = `webserial_obj_${webSerialNextFallbackId++}`;
        webSerialFallbackIds.set(port, id);
    }
    return id;
}

function createWebSerialPortEntries(ports) {
    const vidPidSeen = new Map();
    return ports.map((port) => {
        const info = port.getInfo?.() || {};
        const vendorName = webSerialVendorNames[info.usbVendorId];
        const displayName = vendorName
            ? `${vendorName} (VID:${info.usbVendorId} PID:${info.usbProductId})`
            : 'Web Serial device';
        const vidPidKey = `${info.usbVendorId}_${info.usbProductId}`;
        const index = vidPidSeen.get(vidPidKey) ?? 0;
        vidPidSeen.set(vidPidKey, index + 1);
        return {
            path: getStableWebSerialId(info, port, index),
            displayName,
            port,
        };
    });
}

export async function loadWebSerialPorts(self) {
    const provider = getSerialProvider();
    const ports = provider ? await provider.getPorts() : [];
    self.webSerialPorts = createWebSerialPortEntries(ports);
    return self.webSerialPorts;
}

export async function requestWebSerialPort(self) {
    const provider = getSerialProvider();
    if (!provider) {
        throw new Error('Neither Web Serial nor WebUSB is available in this browser');
    }
    const userPort = await provider.requestPort({ filters: webSerialDeviceFilters });
    // Re-derive the whole list (rather than just appending userPort) so its
    // same-VID/PID index accounts for every port already tracked, instead
    // of guessing 0 and risking a clash with one already present.
    self.webSerialPorts = createWebSerialPortEntries(await provider.getPorts());
    return self.webSerialPorts.find((p) => p.port === userPort);
}

// path is either the stable id of an already-authorized SerialPort (from
// prior requestWebSerialPort() grant, listed directly in the port picker
// by getDevices() below) or the fixed "requestserial" picker-trigger value
// -- in which case no matching entry exists yet, and requestWebSerialPort()
// is what actually shows the browser's native device chooser. This mirrors
// Betaflight's separation between silently reusing a granted device and
// explicitly requesting a new one, so a device the user already paired
// never re-prompts on subsequent connects.
export async function connectWebSerial(self, path, options, callback) {
    if (!getSerialProvider()) {
        console.warn('Neither Web Serial nor WebUSB is available in this browser');
        callback?.(false);
        return;
    }

    self.connectionType = 'serial';

    try {
        let entry = self.webSerialPorts.find((p) => p.path === path);
        if (!entry) {
            // Cache miss (e.g. reconnecting to a device whose port list
            // hasn't been refreshed since it reappeared) -- refresh from
            // the browser before giving up.
            await loadWebSerialPorts(self);
            entry = self.webSerialPorts.find((p) => p.path === path);
        }

        if (!entry) {
            // Deliberately not falling back to requestWebSerialPort() here:
            // that shows Chrome's native device chooser, which would pop
            // up unattended during auto-reconnect. Fail quietly instead
            // and let the user retry/select manually.
            console.warn(`WebSerial port not found: ${path}`);
            self.lastOpenError = 'notFound';
            callback?.(false);
            return;
        }

        const port = entry.port;
        // Chrome's default receive buffer is only 255 bytes. On a fast
        // desktop that's fine -- reader.read() gets serviced long before
        // it fills -- but on a phone's slower CPU, a heavier tab (Servos
        // polling servo configs at 4Hz, Profiles polling PID gains at
        // 4Hz, each triggering a full diff()/table re-render) can stall
        // the JS main thread just long enough between reads for incoming
        // data to overrun that tiny buffer. Chrome then throws a
        // BufferOverrunError, which errorHandler() treats like any other
        // fatal receive error and force-disconnects -- the "logged out,
        // reconnect to the FC" symptom seen only on mobile. A much larger
        // buffer gives the browser enough slack to absorb a brief stall
        // without losing the connection.
        await port.open({ baudRate: options?.bitrate || 115200, bufferSize: 16384 });

        self.webSerialPort = port;
        self.webSerialWriter = port.writable.getWriter();
        self.connected = true;
        self.connectionId = entry.path;
        self.bitrate = options?.bitrate || 115200;
        self.bytesReceived = 0;
        self.bytesSent = 0;
        self.failed = 0;

        // Web Serial has no "onReceiveError"-style callback of its own --
        // readWebSerialLoop() synthesizes one by dispatching onReceiveError
        // when reader.read() throws (e.g. the device vanishing after a DFU
        // reboot). Without a listener here that error is dropped silently:
        // self.connected stays true and the UI never notices the port died.
        self.onReceiveError.addListener(function watch_for_on_receive_errors(info) {
            self.errorHandler(info.error, 'receive');
        });

        self.webSerialReadableClosed = readWebSerialLoop(self, port);

        console.log(`${self.connectionType}: web serial connection opened, Baud: ${self.bitrate}`);
        callback?.({ connectionId: self.connectionId, bitrate: self.bitrate });
    } catch (error) {
        console.warn('Web Serial connection failed', error);
        // port.open() rejects with a bare NetworkError ("Failed to open
        // serial port") when the OS refuses the port -- which is what
        // another program or tab already holding it looks like -- or
        // InvalidStateError if it's somehow already open. Neither says
        // "busy" outright, but that's the practical cause of both.
        self.lastOpenError = 'openFailed';
        callback?.(false);
    }
}

export function writeWebSerial(self, data) {
    return self.webSerialWriter.write(new Uint8Array(data)).then(() => data.byteLength);
}

export function disconnectWebSerial(self, callback) {
    const port = self.webSerialPort;
    const reader = self.webSerialReader;
    const writer = self.webSerialWriter;
    const readableClosed = self.webSerialReadableClosed;

    self.webSerialPort = false;
    self.webSerialReader = false;
    self.webSerialWriter = false;

    Promise.resolve()
        .then(() => reader?.cancel())
        .catch(() => {})
        // Wait for readWebSerialLoop's own finally block to actually
        // release the reader lock before closing -- cancel() only
        // unblocks the pending read(), it doesn't itself guarantee
        // the lock is released by the time this chain continues.
        .then(() => readableClosed)
        .catch(() => {})
        .then(() => writer?.releaseLock())
        .then(() => port.close())
        .then(() => {
            console.log(`${self.connectionType}: closed web serial connection, Sent: ${self.bytesSent} bytes, Received: ${self.bytesReceived} bytes`);
            self.connectionId = false;
            self.bitrate = 0;
            callback?.(true);
        })
        .catch((error) => {
            console.warn('Web Serial disconnect failed', error);
            callback?.(false);
        });
}

export async function readWebSerialLoop(self, port) {
    try {
        while (port.readable && self.connected) {
            const reader = port.readable.getReader();
            self.webSerialReader = reader;

            try {
                while (self.connected) {
                    const { value, done } = await reader.read();
                    if (done) {
                        break;
                    }
                    if (value) {
                        self.onReceive.dispatch({
                            connectionId: self.connectionId,
                            data: value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
                        });
                    }
                }
            } finally {
                reader.releaseLock();
                self.webSerialReader = false;
            }
        }
    } catch (error) {
        if (self.connected) {
            self.onReceiveError.dispatch({ connectionId: self.connectionId, error: error.name || 'system_error' });
        }
    }
}

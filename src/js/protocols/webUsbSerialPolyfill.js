// Minimal Web Serial polyfill built on WebUSB, trimmed from Google's official
// web-serial-polyfill (Apache-2.0): https://github.com/google/web-serial-polyfill
//
// Chrome for Android supports WebUSB but not Web Serial itself; Chrome's own
// docs point at this polyfill approach as the way to reach USB-serial devices
// from the browser on Android. This only works for the standard USB CDC-ACM
// class (the virtual-COM-port class most flight controller MCUs -- STM32,
// GD32, AT32, APM32, RP2040 -- expose natively) and only for devices not
// already claimed by a built-in OS driver. It cannot reach discrete
// USB-to-serial bridge chips (FTDI/CP210x/CH340) since those use a
// proprietary, non-CDC-ACM protocol.
const CDC_CONTROL_INTERFACE_CLASS = 2;
const CDC_DATA_INTERFACE_CLASS = 10;

const SET_LINE_CODING = 0x20;
const SET_CONTROL_LINE_STATE = 0x22;

const DEFAULT_BUFFER_SIZE = 255;

function findInterface(device, classCode) {
    const configuration = device.configurations[0];
    for (const iface of configuration.interfaces) {
        if (iface.alternates[0].interfaceClass === classCode) {
            return iface;
        }
    }
    throw new TypeError(`Unable to find interface with class ${classCode}`);
}

function findEndpoint(iface, direction) {
    for (const endpoint of iface.alternates[0].endpoints) {
        if (endpoint.direction === direction) {
            return endpoint;
        }
    }
    throw new TypeError(`Interface ${iface.interfaceNumber} has no ${direction} endpoint`);
}

class UsbEndpointUnderlyingSource {
    constructor(device, endpoint, onError) {
        this.type = 'bytes';
        this.device = device;
        this.endpoint = endpoint;
        this.onError = onError;
    }

    // Must be a real async function (returning its promise) rather than an
    // unawaited fire-and-forget IIFE: the ReadableStream spec doesn't call
    // pull() again until the previously returned promise settles, which is
    // what prevents overlapping transferIn() calls on the same endpoint --
    // submitting a second bulk IN transfer before the first completes is
    // what was triggering USB protocol errors and a forced device removal
    // after a few seconds on Android.
    async pull(controller) {
        try {
            const result = await this.device.transferIn(this.endpoint.endpointNumber, this.endpoint.packetSize);
            if (result.status !== 'ok') {
                controller.error(`USB error: ${result.status}`);
                this.onError();
                return;
            }
            if (result.data?.buffer) {
                controller.enqueue(new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength));
            }
        } catch (error) {
            controller.error(error.toString());
            this.onError();
        }
    }
}

class UsbEndpointUnderlyingSink {
    constructor(device, endpoint, onError) {
        this.device = device;
        this.endpoint = endpoint;
        this.onError = onError;
    }

    async write(chunk, controller) {
        try {
            const result = await this.device.transferOut(this.endpoint.endpointNumber, chunk);
            if (result.status !== 'ok') {
                controller.error(result.status);
                this.onError();
            }
        } catch (error) {
            controller.error(error.toString());
            this.onError();
        }
    }
}

// Implements the subset of the real Web Serial SerialPort interface that
// WebSerial.js relies on (getInfo/open/close/readable/writable), backed by a
// WebUSB CDC-ACM device instead of navigator.serial.
class WebUsbSerialPort {
    constructor(device) {
        this.device = device;
        this.controlInterface = findInterface(device, CDC_CONTROL_INTERFACE_CLASS);
        this.transferInterface = findInterface(device, CDC_DATA_INTERFACE_CLASS);
        this.inEndpoint = findEndpoint(this.transferInterface, 'in');
        this.outEndpoint = findEndpoint(this.transferInterface, 'out');
        this.baudRate = 115200;
        this._readable = null;
        this._writable = null;
    }

    get readable() {
        if (!this._readable && this.device.opened) {
            this._readable = new ReadableStream(
                new UsbEndpointUnderlyingSource(this.device, this.inEndpoint, () => { this._readable = null; }),
                { highWaterMark: DEFAULT_BUFFER_SIZE },
            );
        }
        return this._readable;
    }

    get writable() {
        if (!this._writable && this.device.opened) {
            this._writable = new WritableStream(
                new UsbEndpointUnderlyingSink(this.device, this.outEndpoint, () => { this._writable = null; }),
                new ByteLengthQueuingStrategy({ highWaterMark: DEFAULT_BUFFER_SIZE }),
            );
        }
        return this._writable;
    }

    async open(options) {
        this.baudRate = options?.baudRate || 115200;
        await this.device.open();
        if (this.device.configuration === null) {
            await this.device.selectConfiguration(1);
        }
        await this.device.claimInterface(this.controlInterface.interfaceNumber);
        if (this.controlInterface !== this.transferInterface) {
            await this.device.claimInterface(this.transferInterface.interfaceNumber);
        }
        await this._setLineCoding();
        await this._setControlLineState(true);
    }

    async close() {
        if (this._readable) {
            await this._readable.cancel().catch(() => {});
        }
        if (this._writable) {
            await this._writable.abort().catch(() => {});
        }
        this._readable = null;
        this._writable = null;
        if (this.device.opened) {
            await this._setControlLineState(false).catch(() => {});
            await this.device.close();
        }
    }

    getInfo() {
        return { usbVendorId: this.device.vendorId, usbProductId: this.device.productId };
    }

    async _setControlLineState(active) {
        await this.device.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: SET_CONTROL_LINE_STATE,
            value: active ? 0x03 : 0x00, // bit0 = DTR, bit1 = RTS
            index: this.controlInterface.interfaceNumber,
        });
    }

    async _setLineCoding() {
        const buffer = new ArrayBuffer(7);
        const view = new DataView(buffer);
        view.setUint32(0, this.baudRate, true);
        view.setUint8(4, 0); // 1 stop bit
        view.setUint8(5, 0); // no parity
        view.setUint8(6, 8); // 8 data bits
        const result = await this.device.controlTransferOut({
            requestType: 'class',
            recipient: 'interface',
            request: SET_LINE_CODING,
            value: 0x00,
            index: this.controlInterface.interfaceNumber,
        }, buffer);
        if (result.status !== 'ok') {
            throw new DOMException('Failed to set line coding', 'NetworkError');
        }
    }
}

// Keyed by the underlying USBDevice so repeated getPorts()/requestPort()
// calls for the same physical device return the same wrapper instance --
// a fresh wrapper every poll would look like a new device each time.
// (Unlike WebSerial.js's own id scheme, which had to stop relying on this
// kind of object-identity stability: a SerialPort object doesn't survive a
// real USB detach/reattach the way a USBDevice from navigator.usb does, so
// its ids are now derived from VID/PID instead -- see getStableWebSerialId()
// there. If WebUSB device identity turns out not to survive an FC's reboot
// either, this cache would need the same treatment.)
const wrappedPorts = new WeakMap();

function wrapDevice(device) {
    let port = wrappedPorts.get(device);
    if (port) {
        return port;
    }
    try {
        port = new WebUsbSerialPort(device);
        wrappedPorts.set(device, port);
        return port;
    } catch {
        // Device has no CDC-ACM interface (e.g. a DFU-mode bootloader device
        // also authorized on this origin) -- not something we can drive as a
        // serial port, so it's silently excluded, matching upstream's behavior.
        return null;
    }
}

// Mimics the subset of navigator.serial's Serial interface that WebSerial.js
// uses, so it can be swapped in as a drop-in port provider.
export const webUsbSerialPolyfill = {
    async requestPort(options) {
        // Deliberately not also filtering on classCode here: Chrome's own
        // matching already checks it against every interface (not just the
        // device descriptor), so in theory it's redundant given
        // vendorId/productId already narrow the list to known FC chips --
        // but it's an extra variable devices with an Interface Association
        // Descriptor (composite STM32 VCP boards report bDeviceClass 0xEF at
        // the device level) don't need, and on Android it was observed to
        // make the picker report "No compatible devices found" for boards
        // that work fine over desktop Web Serial. CDC-ACM is still enforced
        // afterwards via wrapDevice() below.
        const filters = (options?.filters || [])
            .map((filter) => ({
                ...(filter.usbVendorId !== undefined && { vendorId: filter.usbVendorId }),
                ...(filter.usbProductId !== undefined && { productId: filter.usbProductId }),
            }))
            .filter((filter) => Object.keys(filter).length > 0);
        const device = await navigator.usb.requestDevice({ filters });
        const port = wrapDevice(device);
        if (!port) {
            throw new TypeError('Selected USB device does not expose a CDC-ACM serial interface');
        }
        return port;
    },

    async getPorts() {
        const devices = await navigator.usb.getDevices();
        return devices.map(wrapDevice).filter(Boolean);
    },
};

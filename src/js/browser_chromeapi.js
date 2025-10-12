export const usb = (function() {
    let zdevice;
    let wudev;

    const uheader = "SERIAL (adapted from WebSerial):";
    function ulog(message, ...values) {
        console.log(uheader+message, ...values);
    }

    function uwarn(message, ...values) {
        console.warn(uheader+message, ...values);
    }

    function uerror(message, ...values) {
        console.error(uheader+message, ...values);
    }

    function chromeErrCB(error, cb, param) {
        chrome.runtime.lastError = error;
        try {
            cb?.(param);
        } catch (error) {
            uerror("error calling chrome callback", error);
        } finally {
            chrome.runtime.lastError = null;
        }
    }

    function createDevice(device) {
        return {
            path: `usb_${device.serialNumber}`,
            productName: device.productName,
            vendorId: device.manufacturerName,
            productId: device.productName,
            device: new Date() / 1000,
        };
    }

    function getDevices(_filterList, callback) {
        callback?.(zdevice ? [zdevice] : []);
    }

    async function openDevice(device, callback) {
        try {
            await wudev.open();
            callback?.({
                handle: device.device,
                productId: device.productId,
                vendorId: device.vendorId
            });
        } catch (error) {
            chromeErrCB(error, callback);
        }
    }

    async function closeDevice(_handle, callback) {
        try {
            await wudev.close();
            callback?.();
        } catch (error) {
            chromeErrCB(error, callback);
        }
    }

    async function resetDevice(_handle, callback) {
        try {
            await wudev.reset();
            callback?.();
        } catch (error) {
            chromeErrCB(error, callback);
        }
    }

    async function claimInterface(_handle, ifaceNum, callback) {
        try {
            await wudev.claimInterface(ifaceNum);
            callback?.();
        } catch (error) {
            chromeErrCB(error, callback);
        }
    }

    async function releaseInterface(_handle, ifaceNum, callback) {
        try {
            await wudev.releaseInterface(ifaceNum);
            callback?.();
        } catch (error) {
            chromeErrCB(error, callback);
        }
    }

    async function getConfiguration(_handle, callback) {
        try {
            if (wudev.configuration === null) {
                await wudev.getConfiguration(1);
            }
            callback?.(wudev.configuration);
        } catch (error) {
            chromeErrCB(error, callback);
        }
    }

    async function controlTransfer(_handle, xferinfo, callback) {
        try {
            const setup = (({ requestType, recipient, request, value, index }) =>
                ({ requestType, recipient, request, value, index })) (xferinfo);

            if (xferinfo.direction === "out") {
                const data = xferinfo.data ? xferinfo.data : new ArrayBuffer(0);
                const result = await wudev.controlTransferOut(setup, data);
                callback?.({ data: undefined, resultCode: result.resultCode });
            } else {
                const result = await wudev.controlTransferIn(setup, xferinfo.length);
                if (result.status === "ok") {
                    callback?.({ data: result.data.buffer, resultCode: result.resultCode });
                } else {
                    uwarn("Error status from control transfer in", result);
                    chromeErrCB(new Error(result.status), callback, { resultCode: 1 });
                }
            }
        } catch (error) {
            uerror("Controltransfer error", error);
            chromeErrCB(error, callback, { resultCode: 1 });
        }
    }

    async function requestPermission(filterList) {
        try {
            const userSelectedPort = await navigator.usb.requestDevice(filterList);
            ulog("User selected USB device from permissions:", userSelectedPort);
            ulog(
                `WebUSB Version: ${userSelectedPort.deviceVersionMajor}.${userSelectedPort.deviceVersionMinor}.${userSelectedPort.deviceVersionSubminor}`,
            );

            wudev = userSelectedPort;
            zdevice = createDevice(wudev);
            return zdevice;
        } catch (error) {
            uerror("User didn't select any USB device when requesting permission:", error);
        }
    };

    navigator.usb.addEventListener("connect", (e) => {
        if (!zdevice) {
            wudev = e.device;
            zdevice = createDevice(wudev);
        };
    });

    navigator.usb.addEventListener("disconnect", () => {
        loadDevice();
    });

    async function loadDevice() {
        wudev = zdevice = null;
        const devices = await navigator.usb.getDevices();
        if (devices.length > 0) {
            wudev = devices[0];
            zdevice = createDevice(wudev);
        }
    }

    loadDevice();

    return {
        requestPermission,
        getDevices,
        openDevice,
        closeDevice,
        resetDevice,
        claimInterface,
        releaseInterface,
        getConfiguration,
        controlTransfer,
    };
}());

export const serial = (function() {
    let reading = false, // Read cancel flag
        openedPort,      // Currently opened device
        reader,          // Reader for current device
        writer;          // Writer to current device

    const ports = [];    // Available port list

    // EventEmitter-like event sources used by chrome.serial
    const onReceive = Eventer("receive");
    const onReceiveError = Eventer("recieve errors");

    // Current connection properties
    let connprops = {
        connectionId: 1, // Only one connection possible
        paused: false,
        persistent: false,
        name,
        bufferSize: 4096,
        receiveTimeout: 0,
        sendTimeout: 0,
        bitrate: 9600,
        dataBits: 'eight',
        parityBit: 'no',
        stopBits: 'one',
        ctsFlowControl: false,
    };

    const sheader = "SERIAL (adapted from WebSerial):";
    
    function slog(message, ...values) {
        console.log(sheader+message, ...values);
    }

    function swarn(message, ...values) {
        console.warn(sheader+message, ...values);
    }

    function serror(message, ...values) {
        console.error(sheader+message, ...values);
    }

    function Eventer(name) {
        const listeners = [];

        return {
            addListener: function(functionReference) {
                listeners.push(functionReference);
            },
            removeListener: function(functionReference) {
                const listener = listeners.indexOf(functionReference);
                if (listener >= 0)
                    listeners.splice(listener, 1);
                else
                    serror(`Asked to remove an unknown listener for ${name}`, functionReference);
            },
            raiseEvent: function(data) {
                if (data.byteLength === 0) {
                    return;
                }

                for (const listener of listeners) {
                    listener({ data });
                }
            },
        };
    }

    async function* streamAsyncIterable(reader, keepReadingFlag) {
        try {
            while (keepReadingFlag()) {
                try {
                    const { done, value } = await reader.read();
                    if (done) {
                        return;
                    }
                    yield value;
                } catch (error) {
                    swarn("Read error in streamAsyncIterable:", error);
                    break;
                }
            }
        } finally {
            // Only release the lock if we still have the reader and it hasn't been released
            try {
                // Always attempt once; spec allows releasing even if the stream
                // is already closed.  `locked` is the boolean we can trust.
                if (reader?.locked) {
                    reader.releaseLock();
                }
            } catch (error) {
                swarn("Error releasing reader lock:", error);
            }
        }
    }

    const serialDevices = [
        { usbVendorId: 1027, usbProductId: 24577 }, // FT232R USB UART
        { usbVendorId: 1155, usbProductId: 12886 }, // STM32 in HID mode
        { usbVendorId: 1155, usbProductId: 14158 }, // 0483:374e STM Electronics STLink Virtual COM Port (NUCLEO boards)
        { usbVendorId: 1155, usbProductId: 22336 }, // STM Electronics Virtual COM Port
        { usbVendorId: 4292, usbProductId: 60000 }, // CP210x
        { usbVendorId: 4292, usbProductId: 60001 }, // CP210x
        { usbVendorId: 4292, usbProductId: 60002 }, // CP210x
        { usbVendorId: 10473, usbProductId: 394 }, // GD32 VCP
        { usbVendorId: 11836, usbProductId: 22336 }, // AT32 VCP
        { usbVendorId: 12619, usbProductId: 22336 }, // APM32 VCP
        { usbVendorId: 11914, usbProductId: 9 }, // Raspberry Pi Pico VCP
    ];

    const vendorIdNames = {
        1027: "FTDI",
        1155: "STM Electronics",
        4292: "Silicon Labs",
        11836: "AT32",
        12619: "Geehy Semiconductor",
        11914: "Raspberry Pi Pico",
    };

    function createPort(port) {
        const portInfo = port.getInfo();
        const displayName = 
            vendorIdNames[portInfo.usbVendorId] || 
            `VID:${portInfo.usbVendorId} PID:${portInfo.usbProductId}`;

        slog("creating port desc", portInfo);

        return {
            path: `${portInfo.usbVendorId}/${portInfo.usbProductId}`,
            displayName: `Rotorflight ${displayName}`,
            vendorId: portInfo.usbVendorId,
            productId: portInfo.usbProductId,
            port: port,
        };
    };

    /**
     * Translates chrome.serial connection options to webserial
     */
    function translateSerialConnectionOptions() {
        const dataBits = connprops.dataBits === 'seven' ? 7 : 8;
        const stopBits = connprops.stopBits === 'two' ? 2 : 1;
        const parityBit = connprops.parityBit === 'no' ? 'none' : connprops.parityBit;
        return {
            baudRate: connprops.bitrate,
            dataBits: dataBits,
            stopBits: stopBits,
            parity: parityBit,
            bufferSize: connprops.bufferSize,
        };
    };

    function getDriver(vid, pid) {
        if (vid === 4292 && pid === 60000) {
            return 'Cp21xxSerialDriver'; //for Silabs CP2102 and all other CP210x
        }  else {
            return 'CdcAcmSerialDriver';
        }
    }

    async function requestPermission(showAll = false) {
        let newPermissionPort = null;

        try {
            const options = showAll ? {} : { filters: serialDevices };
            const userSelectedPort = await navigator.serial.requestPort(options);

            newPermissionPort = ports.find((port) => port.port === userSelectedPort);

            if (!newPermissionPort) {
                newPermissionPort = createPort(userSelectedPort);
                ports.push(newPermissionPort);
            }
            slog(`User selected SERIAL device from permissions:`, newPermissionPort.path);
        } catch (error) {
            serror(`User didn't select any SERIAL device when requesting permission:`, error);
        }

        return newPermissionPort;
    }

    function getDevices(callback) {
        try {
            callback?.(ports);
        } catch (error) {
            swarn(`getDevices callback error ${error}`);
        }
    }

    async function readLoop() {
        try {
            for await (let value of streamAsyncIterable(reader, () => reading)) {
                onReceive.raiseEvent(value);
            }
        } catch (error) {
            serror("receive listener errored in read loop, disconnecting:", error);
            disconnect();
            onReceiveError.raiseEvent({ error: "device_lost" });
        }
    }

    async function connect(path, options, callback) {
        connprops = { ...connprops, ...options };

        const { port } = ports.find(p => p.path === path);
        if (port) {
            try {
                const wsoptions = translateSerialConnectionOptions();
                slog("opening port with options", port, wsoptions);

                await port.open(wsoptions);
                openedPort = port;

                reader = port.readable.getReader();
                writer = port.writable.getWriter();
                reading = true;
                readLoop();
                
                callback?.({...connprops});
            } catch (error) {
                serror(error.message, error);
            }
        } else {
            serror("could not find port by path", path);
            callback();
        }
    }

    async function send(connectionId, data, callback) {
        try {
            await writer.write(data);
            callback?.({ bytesSent: data.byteLength });
        } catch (error) {
            serror("error writing", error);
            callback?.({ bytesSent: 0, error });
        }
    }

    async function disconnect(connectionId, callback) {
        if (!openedPort) {
            callback?.(true);
            return;
        }

        const port = openedPort;
        reading = false;

        // Cancel reader first if it exists - this doesn't release the lock
        if (reader) {
            try {
                await reader.cancel();
            } catch (e) {
                swarn("Reader cancel error (can be ignored):", e);
            }
        }

        // Don't try to release the reader lock - streamAsyncIterable will handle it
        reader = null;

        // Release writer lock if it exists
        if (writer) {
            try {
                writer.releaseLock();
            } catch (e) {
                swarn("Writer release error (can be ignored):", e);
            }
            writer = null;
        }

        try {
            openedPort = null;
            await port.close();
        } catch (error) {
            serror("error during close", error);
        }

        callback?.(true);
    }

    // Cache the initial set of devices and then maintain it with events
    // The "connect" and "disconnect" terms here refer to USB device attachment
    // and not opening/closing communication with the device.
    navigator.serial.addEventListener('connect', event => {
        slog(`webserial port connected: ${event.target}`);
        ports.push(createPort(event.target));
    });

    navigator.serial.addEventListener('disconnect', event => {
        slog(`webserial port disconnected: ${event.target}`);
        ports.splice(ports.indexOf(event.target), 1);

        // If the port is open, notify listeners and clear the connection state
        onReceiveError.raiseEvent({ error: "device_lost" });
        reading = false;
        reader = null;
        writer = null;
        openedPort = null;
    });

    (async function loadDevices() {
        const gotports = await navigator.serial.getPorts();
        ports.push(...gotports.map((port) => createPort(port)));
    }());
    
    return {
        getDriver,
        requestPermission,

        // Chrome serial API methods
        getDevices,
        connect,
        send,
        disconnect,
        onReceive,
        onReceiveError,

        setPaused: function(connectionId, paused, callback) {
            connprops.paused = paused; // Change connectionInfo but don't pause the connection
            callback?.();
        },

        getInfo: function(callback) {
            callback?.({...connprops});
        },
        // update: function() { },
        // getConnections: function() { },
        // flush: function() { },
        // setBreak: function() { },
        // clearBreak: function() { },
    };
}());
export const runtime = {
    lastError: undefined,
};

// Adapted from https://github.com/MrOttimista/browser-storage-polyfill
export const storage = {
    local: {
        set: async function (items, cb) {
            if (
                arguments.length < 1 ||
                arguments.length > 2 ||
                !items ||
                items.constructor !== Object ||
                (cb && typeof cb !== "function")
            ) {
                throw new TypeError(
                  "Error in invocation of storage.set(object items, optional function callback): No matching signature."
                );
            }

            Object.keys(items).forEach((k) => {
                localStorage.setItem(k, items[k] ? JSON.stringify(items[k]) : items[k]);
            });

            cb?.();
        },

        remove: async function (key, cb) {
            let keysToBeDeleted = key;
            if (
                arguments.length > 2 ||
                (keysToBeDeleted &&
                    typeof keysToBeDeleted !== "string" &&
                    !Array.isArray(keysToBeDeleted)) ||
                (cb && typeof cb !== "function")
            ) {
                throw new TypeError(
                    "Error in invocation of storage.remove([string|array] keys, optional function callback): No matching signature."
                );
            }
            if (
                Array.isArray(keysToBeDeleted) &&
                keysToBeDeleted.find((z) => typeof z !== "string")
            ) {
                throw new TypeError(
                    " Error in invocation of storage.remove([string|array] keys, optional function callback): Error at parameter 'keys': Value did not match any choice."
                );
            }

            if (typeof key === "string") {
                localStorage.removeItem(key);
            } else {
                key.forEach((k) => {
                    localStorage.removeItem(k);
                });
            }

            cb?.();
        },
        
        get: async function (items, cb) {
            if (
                items &&
                items.constructor === Array &&
                items.find((z) => typeof z !== "string")
            ) {
                throw new TypeError(
                    "Error in invocation of storage.get(optional [string|array|object] keys, function callback): Error at parameter 'keys': Value did not match any choice"
                );
            }
            if (
                arguments.length > 2 ||
                typeof items === "number" ||
                (items &&
                    !(
                        typeof items !== "string" ||
                        items.constructor !== Object ||
                        items.constructor !== Array
                    )) ||
                (cb !== undefined && typeof cb !== "function")
            ) {
                throw new TypeError(
                  "Error in invocation of storage.get(optional [string|array|object] keys, function callback): No matching signature."
                );
            }

            let result = {};

            // in case of undefined or null, chrome storage return all keys
            let keys;
            if (!items) keys = Object.keys(localStorage);
            if (items?.constructor === Object) keys = Object.keys(items);
            if (items?.constructor === Array) keys = items;
            if (typeof items === "string") keys = [items];

            keys?.forEach((k) => {
                const val = localStorage.getItem(k);
                if (val) result[k] = JSON.parse(val);
            });

            cb?.(result);

            return { ...result };
        },
    }
};

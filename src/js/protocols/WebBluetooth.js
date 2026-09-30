// Common BLE UART-bridge profiles (serviceUuid + read/write characteristic
// UUIDs), mirroring Betaflight Configurator's device list -- these are the
// GATT services flight-controller Bluetooth/BLE modules typically expose.
const bleDeviceProfiles = [
    {
        name: 'CC2541',
        serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000ffe1-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '0000ffe2-0000-1000-8000-00805f9b34fb',
    },
    {
        name: 'HC-05',
        serviceUuid: '00001101-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '00001101-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '00001101-0000-1000-8000-00805f9b34fb',
    },
    {
        name: 'HM-10',
        serviceUuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000ffe1-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '0000ffe1-0000-1000-8000-00805f9b34fb',
    },
    {
        name: 'HM-11',
        serviceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        writeCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
        readCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    },
    {
        name: 'Nordic NRF',
        serviceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        writeCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
        readCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    },
    {
        name: 'SpeedyBee V1',
        serviceUuid: '00001000-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '00001001-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '00001002-0000-1000-8000-00805f9b34fb',
    },
    {
        name: 'SpeedyBee V2',
        serviceUuid: '0000abf0-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000abf1-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '0000abf2-0000-1000-8000-00805f9b34fb',
    },
    {
        name: 'DroneBridge',
        serviceUuid: '0000db32-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000db33-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '0000db34-0000-1000-8000-00805f9b34fb',
    },
];

function createBluetoothPortEntry(device) {
    return {
        path: `bluetooth_${device.id}`,
        displayName: device.name || 'Bluetooth device',
        port: device,
    };
}

// Web Bluetooth has no reliable equivalent of getPorts()/getDevices() on a
// normal Chrome install -- navigator.bluetooth.getDevices() only returns
// anything under an experimental "persistent permissions" flag most users
// won't have enabled, so unlike WebSerial/WebUSB this can't silently
// rediscover a previously-granted device across a page reload. Feature-
// detected here so it transparently starts working if/when that lands as
// a shipped feature; until then bluetoothPorts only grows via
// requestBluetoothPort() for the lifetime of the page.
export async function loadBluetoothPorts(self) {
    if (typeof navigator.bluetooth?.getDevices !== 'function') {
        return self.bluetoothPorts;
    }
    try {
        const devices = await navigator.bluetooth.getDevices();
        self.bluetoothPorts = devices.map(createBluetoothPortEntry);
    } catch (error) {
        console.warn('Failed to load previously-granted Bluetooth devices', error);
    }
    return self.bluetoothPorts;
}

export async function requestBluetoothPort(self) {
    const optionalServices = bleDeviceProfiles.map((profile) => profile.serviceUuid);
    const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices });
    let entry = self.bluetoothPorts.find((p) => p.port === device);
    if (!entry) {
        entry = createBluetoothPortEntry(device);
        self.bluetoothPorts.push(entry);
    }
    return entry;
}

export function writeWebBluetooth(self, data) {
    return self.bleWriteCharacteristic.writeValue(new Uint8Array(data)).then(() => data.byteLength);
}

export async function disconnectWebBluetooth(self, callback) {
    const device = self.bleDevice;
    const readCharacteristic = self.bleReadCharacteristic;

    self.bleDevice = false;
    self.bleServer = false;
    self.bleService = false;
    self.bleDeviceProfile = false;
    self.bleWriteCharacteristic = false;
    self.bleReadCharacteristic = false;

    try {
        device.removeEventListener('gattserverdisconnected', self.handleBluetoothDisconnect);
        if (readCharacteristic) {
            readCharacteristic.removeEventListener('characteristicvaluechanged', self.handleBluetoothNotification);
            if (device.gatt?.connected) {
                await readCharacteristic.stopNotifications().catch(() => {});
            }
        }
        if (device.gatt?.connected) {
            device.gatt.disconnect();
        }
        console.log(`${self.connectionType}: closed Bluetooth connection, Sent: ${self.bytesSent} bytes, Received: ${self.bytesReceived} bytes`);
        self.connectionId = false;
        self.bitrate = 0;
        callback?.(true);
    } catch (error) {
        console.warn('Web Bluetooth disconnect failed', error);
        callback?.(false);
    }
}

export async function connectWebBluetooth(self, path, callback) {
    if (!('bluetooth' in navigator)) {
        console.warn('Web Bluetooth API is not available in this browser');
        callback?.(false);
        return;
    }

    self.connectionType = 'bluetooth';

    try {
        let entry = self.bluetoothPorts.find((p) => p.path === path);
        if (!entry) {
            // Deliberately not falling back to requestBluetoothPort() here:
            // that shows the browser's native Bluetooth device chooser,
            // which would pop up unattended during auto-reconnect. Fail
            // quietly instead -- pairing a new device is only ever
            // initiated by a genuine user selection of "Add bluetooth
            // device" in the picker.
            console.warn(`WebBluetooth port not found: ${path}`);
            callback?.(false);
            return;
        }

        const device = entry.port;
        device.addEventListener('gattserverdisconnected', self.handleBluetoothDisconnect);

        const server = await device.gatt.connect();
        const services = await server.getPrimaryServices();
        const service = services.find((s) => bleDeviceProfiles.some((p) => p.serviceUuid === s.uuid));
        const deviceProfile = bleDeviceProfiles.find((p) => p.serviceUuid === service?.uuid);

        if (!service || !deviceProfile) {
            throw new Error('No recognized BLE UART service found on this device');
        }

        const characteristics = await service.getCharacteristics();
        const writeCharacteristic = characteristics.find((c) => c.uuid === deviceProfile.writeCharacteristic);
        const readCharacteristic = characteristics.find((c) => c.uuid === deviceProfile.readCharacteristic);

        if (!writeCharacteristic || !readCharacteristic) {
            throw new Error('Expected read/write characteristics not found');
        }

        readCharacteristic.addEventListener('characteristicvaluechanged', self.handleBluetoothNotification);
        await readCharacteristic.startNotifications();

        self.bleDevice = device;
        self.bleServer = server;
        self.bleService = service;
        self.bleDeviceProfile = deviceProfile;
        self.bleWriteCharacteristic = writeCharacteristic;
        self.bleReadCharacteristic = readCharacteristic;

        self.connected = true;
        self.connectionId = entry.path;
        self.bitrate = 115200;
        self.bytesReceived = 0;
        self.bytesSent = 0;
        self.failed = 0;

        console.log(`${self.connectionType}: Bluetooth connection opened with ID: ${self.connectionId} (${deviceProfile.name})`);
        callback?.({ connectionId: self.connectionId, bitrate: self.bitrate });
    } catch (error) {
        console.warn('Web Bluetooth connection failed', error);
        callback?.(false);
    }
}

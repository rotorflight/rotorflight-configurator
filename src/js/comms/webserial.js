import { DeviceType } from "./shared";

const serialFilters = [
  { usbVendorId: 1027, usbProductId: 24577 },  // FT232R USB UART
  { usbVendorId: 1155, usbProductId: 12886 },  // STM32 HID
  { usbVendorId: 1155, usbProductId: 14158 },  // STM32 STLink VCP (NUCLEO)
  { usbVendorId: 1155, usbProductId: 22336 },  // STM Electronics VCP
  { usbVendorId: 4292, usbProductId: 60000 },  // CP210x
  { usbVendorId: 4292, usbProductId: 60001 },  // CP210x
  { usbVendorId: 4292, usbProductId: 60002 },  // CP210x
  { usbVendorId: 10473, usbProductId: 394 },   // GD32 VCP
  { usbVendorId: 11836, usbProductId: 22336 }, // AT32 VCP
  { usbVendorId: 12619, usbProductId: 22336 }, // APM32 VCP
  { usbVendorId: 11914, usbProductId: 9 },     // Raspberry Pi Pico VCP
];

const vendorNames = {
  1027: "FTDI",
  1155: "STM Electronics",
  4292: "Silicon Labs",
  10473: "GD32",
  11836: "AT32",
  12619: "Geehy",
  11914: "Raspberry Pi Pico",
};

function Eventer() {
  const listeners = [];
  return {
    addListener(fn) { listeners.push(fn); },
    removeListener(fn) {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    raiseEvent(data) {
      for (const fn of listeners) fn(data);
    },
    get listeners() { return listeners; },
  };
}

export class WebSerialDevice {
  #reader = null;
  #writer = null;
  #reading = false;

  constructor(port) {
    const info = port.getInfo();
    this.description = vendorNames[info.usbVendorId]
      || `VID:${info.usbVendorId} PID:${info.usbProductId}`;
    this.type = DeviceType.Standard;
    this.port = port;
    this.onReceive = Eventer();
    this.onReceiveError = Eventer();
  }

  description;
  type;
  port;
  onReceive;
  onReceiveError;

  async open(options = {}) {
    const baudRate = options.bitrate || 115200;
    const dataBits = options.dataBits === 'seven' ? 7 : 8;
    const stopBits = options.stopBits === 'two' ? 2 : 1;
    const parity = options.parityBit === 'no' || !options.parityBit ? 'none' : options.parityBit;

    await this.port.open({ baudRate, dataBits, stopBits, parity, bufferSize: options.bufferSize || 4096 });

    this.#reader = this.port.readable.getReader();
    this.#writer = this.port.writable.getWriter();
    this.#reading = true;
    this.#readLoop();
  }

  async send(data) {
    if (!this.#writer) throw new Error('Port not open');
    await this.#writer.write(data);
    return { bytesSent: data.byteLength };
  }

  async close() {
    this.#reading = false;

    if (this.#reader) {
      try { await this.#reader.cancel(); } catch { /* ignore */ }
      this.#reader = null;
    }

    if (this.#writer) {
      try { this.#writer.releaseLock(); } catch { /* ignore */ }
      this.#writer = null;
    }

    try { await this.port.close(); } catch { /* ignore */ }
  }

  async #readLoop() {
    try {
      while (this.#reading) {
        const { done, value } = await this.#reader.read();
        if (done) break;
        this.onReceive.raiseEvent(value);
      }
    } catch {
      if (this.#reading) {
        this.onReceiveError.raiseEvent({ error: 'device_lost' });
      }
    } finally {
      try { this.#reader?.releaseLock(); } catch { /* ignore */ }
    }
  }
}

export class WebSerialInterface {
  #devices = [];
  #changeCallbacks = [];

  constructor() {
    this.requiresPermission = true;

    navigator.serial.addEventListener('connect', (e) => {
      this.#devices.push(new WebSerialDevice(e.target));
      this.#notifyChanged();
    });

    navigator.serial.addEventListener('disconnect', (e) => {
      const idx = this.#devices.findIndex(d => d.port === e.target);
      if (idx >= 0) this.#devices.splice(idx, 1);
      this.#notifyChanged();
    });

    // Load already-permitted devices
    navigator.serial.getPorts().then(ports => {
      this.#devices = ports.map(p => new WebSerialDevice(p));
      this.#notifyChanged();
    });
  }

  async getDevices(_unfiltered) {
    return this.#devices;
  }

  requiresPermission;

  async requestPermission(showAll = false) {
    try {
      const options = showAll ? {} : { filters: serialFilters };
      const port = await navigator.serial.requestPort(options);

      let device = this.#devices.find(d => d.port === port);
      if (!device) {
        device = new WebSerialDevice(port);
        this.#devices.push(device);
      }

      this.#notifyChanged();
      return device;
    } catch {
      return null;
    }
  }

  devicesChanged(callback) {
    this.#changeCallbacks.push(callback);
  }

  #notifyChanged() {
    for (const cb of this.#changeCallbacks) {
      cb(this.#devices);
    }
  }
}

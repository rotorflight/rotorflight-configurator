import { DeviceType, usbDevices } from "./shared";

export class ChromeUsbDfuDevice {
  #handle = null;
  #raw;

  constructor(raw) {
    this.#raw = raw;
    this.description = raw.productName ? `DFU - ${raw.productName}` : "DFU";
    this.type = DeviceType.DFU;
    console.log(`chromeDfu: device created: ${this.description} (device=${raw.device})`);
  }

  description;
  type;

  get handle() {
    return this.#handle;
  }

  openDevice(callback) {
    chrome.usb.openDevice(this.#raw, (handle) => {
      if (chrome.runtime.lastError || !handle) {
        console.error("chromeDfu: openDevice failed:", chrome.runtime.lastError?.message);
        callback(null);
        return;
      }
      this.#handle = handle;
      console.log(`chromeDfu: opened, handle=${handle.handle}`);
      callback(handle);
    });
  }

  closeDevice(callback) {
    if (!this.#handle) {
      callback?.();
      return;
    }
    chrome.usb.closeDevice(this.#handle, () => {
      if (chrome.runtime.lastError) {
        console.error("chromeDfu: closeDevice failed:", chrome.runtime.lastError.message);
      }
      console.log(`chromeDfu: closed handle=${this.#handle.handle}`);
      this.#handle = null;
      callback?.();
    });
  }

  claimInterface(interfaceNumber, callback) {
    chrome.usb.claimInterface(this.#handle, interfaceNumber, () => {
      if (chrome.runtime.lastError && GUI.operating_system !== "MacOS") {
        console.error("chromeDfu: claimInterface failed:", chrome.runtime.lastError.message);
      }
      callback?.();
    });
  }

  releaseInterface(interfaceNumber, callback) {
    chrome.usb.releaseInterface(this.#handle, interfaceNumber, () => {
      callback?.();
    });
  }

  resetDevice(callback) {
    chrome.usb.resetDevice(this.#handle, (result) => {
      callback?.(result);
    });
  }

  controlTransfer(setup, callback) {
    chrome.usb.controlTransfer(this.#handle, setup, (result) => {
      callback?.(result);
    });
  }

  getConfiguration(callback) {
    chrome.usb.getConfiguration(this.#handle, (config) => {
      if (!config) {
        callback?.(config);
        return;
      }

      // Normalize chrome.usb configuration to match WebUSB shape:
      // chrome.usb reports each DFU alternate setting as a separate interface entry,
      // but WebUSB correctly nests them under interface.alternates[].
      // Group flat interfaces by interfaceNumber into a single interface with alternates.
      const grouped = new Map();
      for (const iface of config.interfaces) {
        const num = iface.interfaceNumber ?? 0;
        if (!grouped.has(num)) {
          grouped.set(num, { interfaceNumber: num, alternates: [] });
        }
        const alts = iface.alternates || [iface];
        grouped.get(num).alternates.push(...alts);
      }

      callback?.({ interfaces: [...grouped.values()] });
    });
  }
}

export class ChromeUsbDfuInterface {
  #callbacks = [];
  #knownIds = new Set();
  #pollTimer = null;

  constructor() {
    this.requiresPermission = false;
  }

  requiresPermission;

  async getDevices() {
    return new Promise((resolve) => {
      chrome.usb.getDevices(usbDevices, (result) => {
        console.log(`chromeDfu: getDevices found ${result?.length ?? 0} DFU device(s)`);
        const devices = (result || []).map((d) => new ChromeUsbDfuDevice(d));
        this.#knownIds = new Set(devices.map((d) => d.handle ?? d.description));
        resolve(devices);
      });
    });
  }

  requestPermission() {}

  devicesChanged(callback) {
    this.#callbacks.push(callback);

    if (!this.#pollTimer) {
      console.log("chromeDfu: starting 1s device poll");
      this.#pollTimer = setInterval(() => this.#poll(), 1000);
    }
  }

  #poll() {
    chrome.usb.getDevices(usbDevices, (result) => {
      const devices = (result || []).map((d) => new ChromeUsbDfuDevice(d));
      const currentIds = new Set(devices.map((d) => d.description));

      if (
        currentIds.size !== this.#knownIds.size ||
        [...currentIds].some((id) => !this.#knownIds.has(id))
      ) {
        console.log(
          `chromeDfu: devices changed — ${devices.length} device(s)`,
        );
        this.#knownIds = currentIds;
        for (const cb of this.#callbacks) {
          cb(devices);
        }
      }
    });
  }
}

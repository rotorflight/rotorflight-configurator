import { DeviceType, usbDevices } from "./shared";

// WebUSB filter format uses the same keys as our usbDevices
const webUsbFilters = usbDevices.filters;

export class WebUsbDfuDevice {
  #usbDevice;

  constructor(usbDevice) {
    this.#usbDevice = usbDevice;
    this.description = usbDevice.productName
      ? `DFU - ${usbDevice.productName}`
      : "DFU";
    this.type = DeviceType.DFU;
    console.log(`webDfu: device created: ${this.description}`);
  }

  description;
  type;

  get handle() {
    // Synthetic handle for protocol compatibility — the protocol reads handle.handle for logging
    return this.#usbDevice ? { handle: 1 } : null;
  }

  openDevice(callback) {
    this.#usbDevice
      .open()
      .then(() => {
        console.log("webDfu: device opened");
        // Select configuration if needed
        if (this.#usbDevice.configuration === null) {
          return this.#usbDevice.selectConfiguration(1);
        }
      })
      .then(() => {
        callback({ handle: 1 });
      })
      .catch((error) => {
        console.error("webDfu: openDevice failed:", error);
        chrome.runtime.lastError = { message: error.message };
        callback(null);
        chrome.runtime.lastError = null;
      });
  }

  closeDevice(callback) {
    this.#usbDevice
      .close()
      .then(() => {
        console.log("webDfu: device closed");
        callback?.();
      })
      .catch((error) => {
        console.error("webDfu: closeDevice failed:", error);
        callback?.();
      });
  }

  claimInterface(interfaceNumber, callback) {
    this.#usbDevice
      .claimInterface(interfaceNumber)
      .then(() => {
        console.log(`webDfu: claimed interface ${interfaceNumber}`);
        callback?.();
      })
      .catch((error) => {
        console.error("webDfu: claimInterface failed:", error);
        chrome.runtime.lastError = { message: error.message };
        callback?.();
        chrome.runtime.lastError = null;
      });
  }

  releaseInterface(interfaceNumber, callback) {
    this.#usbDevice
      .releaseInterface(interfaceNumber)
      .then(() => {
        console.log(`webDfu: released interface ${interfaceNumber}`);
        callback?.();
      })
      .catch((error) => {
        console.error("webDfu: releaseInterface failed:", error);
        callback?.();
      });
  }

  resetDevice(callback) {
    this.#usbDevice
      .reset()
      .then(() => {
        callback?.(true);
      })
      .catch((error) => {
        console.error("webDfu: resetDevice failed:", error);
        callback?.(false);
      });
  }

  controlTransfer(setup, callback) {
    const { requestType, recipient, request, value, index } = setup;
    const transferSetup = { requestType, recipient, request, value, index };

    if (setup.direction === "in") {
      this.#usbDevice
        .controlTransferIn(transferSetup, setup.length)
        .then((result) => {
          if (result.status === "ok") {
            callback({
              data: result.data.buffer,
              resultCode: 0,
            });
          } else {
            console.warn("webDfu: controlTransferIn status:", result.status);
            chrome.runtime.lastError = {
              message: `Transfer status: ${result.status}`,
            };
            callback({ data: undefined, resultCode: 1 });
            chrome.runtime.lastError = null;
          }
        })
        .catch((error) => {
          console.error("webDfu: controlTransferIn error:", error);
          chrome.runtime.lastError = { message: error.message };
          callback({ data: undefined, resultCode: 1 });
          chrome.runtime.lastError = null;
        });
    } else {
      const data = setup.data || new ArrayBuffer(0);
      this.#usbDevice
        .controlTransferOut(transferSetup, data)
        .then((result) => {
          callback({ resultCode: result.status === "ok" ? 0 : 1 });
        })
        .catch((error) => {
          console.error("webDfu: controlTransferOut error:", error);
          chrome.runtime.lastError = { message: error.message };
          callback({ resultCode: 1 });
          chrome.runtime.lastError = null;
        });
    }
  }

  getConfiguration(callback) {
    // WebUSB provides configuration directly on the device object
    const config = this.#usbDevice.configuration;
    if (config) {
      callback(config);
    } else {
      chrome.runtime.lastError = { message: "No configuration available" };
      callback(null);
      chrome.runtime.lastError = null;
    }
  }
}

export class WebUsbDfuInterface {
  #devices = [];
  #changeCallbacks = [];

  constructor() {
    this.requiresPermission = true;

    navigator.usb.addEventListener("connect", (e) => {
      if (this.#matchesFilter(e.device)) {
        this.#devices.push(new WebUsbDfuDevice(e.device));
        this.#notifyChanged();
      }
    });

    navigator.usb.addEventListener("disconnect", (e) => {
      const idx = this.#devices.findIndex(
        (d) => d.description === `DFU - ${e.device.productName}`,
      );
      if (idx >= 0) {
        this.#devices.splice(idx, 1);
        this.#notifyChanged();
      }
    });

    // Load already-permitted DFU devices
    navigator.usb.getDevices().then((devices) => {
      this.#devices = devices
        .filter((d) => this.#matchesFilter(d))
        .map((d) => new WebUsbDfuDevice(d));
      if (this.#devices.length > 0) {
        console.log(
          `webDfu: loaded ${this.#devices.length} previously-permitted device(s)`,
        );
        this.#notifyChanged();
      }
    });
  }

  requiresPermission;

  async getDevices() {
    return this.#devices;
  }

  async requestPermission() {
    try {
      const usbDevice = await navigator.usb.requestDevice({
        filters: webUsbFilters,
      });
      console.log("webDfu: user selected device:", usbDevice.productName);

      let device = this.#devices.find(
        (d) => d.description === `DFU - ${usbDevice.productName}`,
      );
      if (!device) {
        device = new WebUsbDfuDevice(usbDevice);
        this.#devices.push(device);
      }

      this.#notifyChanged();
      return device;
    } catch {
      console.log("webDfu: user cancelled device selection");
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

  #matchesFilter(usbDevice) {
    return webUsbFilters.some(
      (f) =>
        f.vendorId === usbDevice.vendorId &&
        f.productId === usbDevice.productId,
    );
  }
}

import { DeviceType } from "./shared";

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

export class ChromeSerialDevice {
  #connectionId = null;
  #chromeReceiveListener = null;
  #chromeErrorListener = null;

  constructor(device) {
    this.description = device.displayName || device.path;
    this.path = device.path;
    this.type = DeviceType.Standard;
    this.onReceive = Eventer();
    this.onReceiveError = Eventer();
    console.log(`chromeSerial: device created: ${this.description} (${this.path})`);
  }

  description;
  path;
  type;
  onReceive;
  onReceiveError;

  async open(options = {}) {
    console.log(`chromeSerial: opening ${this.path}`, options);
    return new Promise((resolve, reject) => {
      chrome.serial.connect(this.path, options, (connectionInfo) => {
        if (chrome.runtime.lastError || !connectionInfo) {
          const msg = chrome.runtime.lastError?.message || 'Failed to open serial port';
          console.error(`chromeSerial: open failed: ${msg}`);
          reject(new Error(msg));
          return;
        }

        console.log(`chromeSerial: opened ${this.path}, connectionId=${connectionInfo.connectionId}`);
        this.#connectionId = connectionInfo.connectionId;

        this.#chromeReceiveListener = (info) => {
          if (info.connectionId === this.#connectionId) {
            this.onReceive.raiseEvent(info.data);
          }
        };
        this.#chromeErrorListener = (info) => {
          if (info.connectionId === this.#connectionId) {
            this.onReceiveError.raiseEvent({ error: info.error });
          }
        };

        chrome.serial.onReceive.addListener(this.#chromeReceiveListener);
        chrome.serial.onReceiveError.addListener(this.#chromeErrorListener);

        resolve(connectionInfo);
      });
    });
  }

  async send(data) {
    if (!this.#connectionId) throw new Error('Port not open');
    return new Promise((resolve, reject) => {
      chrome.serial.send(this.#connectionId, data, (sendInfo) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(sendInfo);
        }
      });
    });
  }

  async close() {
    console.log(`chromeSerial: closing ${this.path} (connectionId=${this.#connectionId})`);
    if (this.#chromeReceiveListener) {
      chrome.serial.onReceive.removeListener(this.#chromeReceiveListener);
      this.#chromeReceiveListener = null;
    }
    if (this.#chromeErrorListener) {
      chrome.serial.onReceiveError.removeListener(this.#chromeErrorListener);
      this.#chromeErrorListener = null;
    }

    if (this.#connectionId) {
      return new Promise((resolve) => {
        chrome.serial.disconnect(this.#connectionId, (result) => {
          this.#connectionId = null;
          resolve(result);
        });
      });
    }
  }
}

function portRecognized({ displayName, path }) {
  if (displayName) {
    const isWindows = (GUI.operating_system === 'Windows');
    const isTty = path.includes('tty');
    const deviceRecognized = displayName.includes('STM') || displayName.includes('CP210');
    const legacyDeviceRecognized = displayName.includes('usb');
    if (isWindows && deviceRecognized || isTty && (deviceRecognized || legacyDeviceRecognized)) {
      return true;
    }
  }
  return false;
}

export class ChromeSerialInterface {
  #callbacks = [];
  #knownPaths = new Set();
  #unfiltered = false;
  #pollTimer = null;

  constructor() {
    this.requiresPermission = false;
  }

  async getDevices(unfiltered) {
    this.#unfiltered = unfiltered;
    return new Promise((resolve, _reject) => {
      chrome.serial.getDevices(devices => {
        console.log(`chromeSerial: getDevices found ${devices.length} raw device(s):`, devices.map(d => `${d.displayName || '?'} (${d.path})`));
        const filtered = devices.filter(d => unfiltered || portRecognized(d));
        console.log(`chromeSerial: ${filtered.length} device(s) after filtering (unfiltered=${unfiltered})`);
        const result = filtered.map(d => new ChromeSerialDevice(d));
        this.#knownPaths = new Set(result.map(d => d.path));
        resolve(result);
      });
    });
  }

  requiresPermission;

  requestPermission() {
  }

  devicesChanged(callback) {
    this.#callbacks.push(callback);

    // Start polling on first subscriber
    if (!this.#pollTimer) {
      console.log("chromeSerial: starting 1s device poll");
      this.#pollTimer = setInterval(() => this.#poll(), 1000);
    }
  }

  #poll() {
    chrome.serial.getDevices(devices => {
      const filtered = devices.filter(d => this.#unfiltered || portRecognized(d));
      const currentPaths = new Set(filtered.map(d => d.path));

      // Check if the set of paths changed
      if (currentPaths.size !== this.#knownPaths.size ||
          [...currentPaths].some(p => !this.#knownPaths.has(p))) {
        const added = [...currentPaths].filter(p => !this.#knownPaths.has(p));
        const removed = [...this.#knownPaths].filter(p => !currentPaths.has(p));
        console.log(`chromeSerial: devices changed — added: [${added}], removed: [${removed}]`);

        this.#knownPaths = currentPaths;
        const newDevices = filtered.map(d => new ChromeSerialDevice(d));
        for (const cb of this.#callbacks) {
          cb(newDevices);
        }
      }
    });
  }
}

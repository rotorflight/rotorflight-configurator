import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChromeUsbDfuDevice } from "../chromedfu";

beforeEach(() => {
  globalThis.GUI = { operating_system: "Linux" };
  globalThis.chrome = {
    runtime: { lastError: null },
    usb: {
      openDevice: vi.fn(),
      closeDevice: vi.fn(),
      claimInterface: vi.fn(),
      releaseInterface: vi.fn(),
      resetDevice: vi.fn(),
      controlTransfer: vi.fn(),
      getConfiguration: vi.fn(),
    },
  };
});

describe("ChromeUsbDfuDevice", () => {
  const raw = { device: 42, productName: "STM32 BOOTLOADER" };

  it("has correct description and type", () => {
    const device = new ChromeUsbDfuDevice(raw);
    expect(device.description).toBe("DFU - STM32 BOOTLOADER");
    expect(device.type).toBe("dfu");
  });

  it("falls back to 'DFU' when no productName", () => {
    const device = new ChromeUsbDfuDevice({ device: 1 });
    expect(device.description).toBe("DFU");
  });

  describe("openDevice", () => {
    it("calls chrome.usb.openDevice and returns handle", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));

      const device = new ChromeUsbDfuDevice(raw);
      const callback = vi.fn();
      device.openDevice(callback);

      expect(chrome.usb.openDevice).toHaveBeenCalledWith(
        raw,
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalledWith(handle);
      expect(device.handle).toBe(handle);
    });

    it("calls callback with null on error", () => {
      chrome.usb.openDevice.mockImplementation((_dev, cb) => {
        chrome.runtime.lastError = { message: "Access denied" };
        cb(null);
        chrome.runtime.lastError = null;
      });

      const device = new ChromeUsbDfuDevice(raw);
      const callback = vi.fn();
      device.openDevice(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe("closeDevice", () => {
    it("calls chrome.usb.closeDevice with handle", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));
      chrome.usb.closeDevice.mockImplementation((_handle, cb) => cb());

      const device = new ChromeUsbDfuDevice(raw);
      device.openDevice(vi.fn());

      const callback = vi.fn();
      device.closeDevice(callback);

      expect(chrome.usb.closeDevice).toHaveBeenCalledWith(
        handle,
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalled();
      expect(device.handle).toBeNull();
    });

    it("calls callback immediately if no handle", () => {
      const device = new ChromeUsbDfuDevice(raw);
      const callback = vi.fn();
      device.closeDevice(callback);
      expect(callback).toHaveBeenCalled();
      expect(chrome.usb.closeDevice).not.toHaveBeenCalled();
    });
  });

  describe("claimInterface", () => {
    it("calls chrome.usb.claimInterface", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));
      chrome.usb.claimInterface.mockImplementation((_h, _n, cb) => cb());

      const device = new ChromeUsbDfuDevice(raw);
      device.openDevice(vi.fn());

      const callback = vi.fn();
      device.claimInterface(0, callback);

      expect(chrome.usb.claimInterface).toHaveBeenCalledWith(
        handle,
        0,
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("releaseInterface", () => {
    it("calls chrome.usb.releaseInterface", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));
      chrome.usb.releaseInterface.mockImplementation((_h, _n, cb) => cb());

      const device = new ChromeUsbDfuDevice(raw);
      device.openDevice(vi.fn());

      const callback = vi.fn();
      device.releaseInterface(0, callback);

      expect(chrome.usb.releaseInterface).toHaveBeenCalledWith(
        handle,
        0,
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("controlTransfer", () => {
    it("passes setup to chrome.usb.controlTransfer", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));
      chrome.usb.controlTransfer.mockImplementation((_h, _setup, cb) =>
        cb({ data: new ArrayBuffer(6), resultCode: 0 }),
      );

      const device = new ChromeUsbDfuDevice(raw);
      device.openDevice(vi.fn());

      const setup = {
        direction: "in",
        recipient: "interface",
        requestType: "class",
        request: 3,
        value: 0,
        index: 0,
        length: 6,
      };
      const callback = vi.fn();
      device.controlTransfer(setup, callback);

      expect(chrome.usb.controlTransfer).toHaveBeenCalledWith(
        handle,
        setup,
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalledWith({
        data: expect.any(ArrayBuffer),
        resultCode: 0,
      });
    });
  });

  describe("getConfiguration", () => {
    it("normalizes flat chrome.usb interfaces into WebUSB alternates shape", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));

      // chrome.usb reports DFU alternates as separate interface entries
      const chromeConfig = {
        interfaces: [
          { interfaceNumber: 0, alternates: [{ interfaceClass: 0xfe, alternateSetting: 0 }] },
          { interfaceNumber: 0, alternates: [{ interfaceClass: 0xfe, alternateSetting: 1 }] },
          { interfaceNumber: 0, alternates: [{ interfaceClass: 0xfe, alternateSetting: 2 }] },
        ],
      };
      chrome.usb.getConfiguration.mockImplementation((_h, cb) => cb(chromeConfig));

      const device = new ChromeUsbDfuDevice(raw);
      device.openDevice(vi.fn());

      const callback = vi.fn();
      device.getConfiguration(callback);

      // Should be normalized to WebUSB shape: one interface with all alternates nested
      const result = callback.mock.calls[0][0];
      expect(result.interfaces).toHaveLength(1);
      expect(result.interfaces[0].interfaceNumber).toBe(0);
      expect(result.interfaces[0].alternates).toHaveLength(3);
    });

    it("passes null config through", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));
      chrome.usb.getConfiguration.mockImplementation((_h, cb) => cb(null));

      const device = new ChromeUsbDfuDevice(raw);
      device.openDevice(vi.fn());

      const callback = vi.fn();
      device.getConfiguration(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe("resetDevice", () => {
    it("calls chrome.usb.resetDevice", () => {
      const handle = { handle: 7 };
      chrome.usb.openDevice.mockImplementation((_dev, cb) => cb(handle));
      chrome.usb.resetDevice.mockImplementation((_h, cb) => cb(true));

      const device = new ChromeUsbDfuDevice(raw);
      device.openDevice(vi.fn());

      const callback = vi.fn();
      device.resetDevice(callback);

      expect(chrome.usb.resetDevice).toHaveBeenCalledWith(
        handle,
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalledWith(true);
    });
  });
});

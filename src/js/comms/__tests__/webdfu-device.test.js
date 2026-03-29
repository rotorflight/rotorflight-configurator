import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebUsbDfuDevice } from "../webdfu";

let usbDevice;

beforeEach(() => {
  globalThis.chrome = {
    runtime: { lastError: null },
  };

  usbDevice = {
    productName: "STM32 BOOTLOADER",
    vendorId: 0x0483,
    productId: 0xdf11,
    configuration: {
      interfaces: [{ alternates: [{ interfaceClass: 0xfe }] }],
    },
    open: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    selectConfiguration: vi.fn(async () => {}),
    claimInterface: vi.fn(async () => {}),
    releaseInterface: vi.fn(async () => {}),
    reset: vi.fn(async () => {}),
    controlTransferIn: vi.fn(),
    controlTransferOut: vi.fn(),
  };
});

describe("WebUsbDfuDevice", () => {
  it("has correct description and type", () => {
    const device = new WebUsbDfuDevice(usbDevice);
    expect(device.description).toBe("DFU - STM32 BOOTLOADER");
    expect(device.type).toBe("dfu");
  });

  it("falls back to 'DFU' when no productName", () => {
    usbDevice.productName = "";
    const device = new WebUsbDfuDevice(usbDevice);
    expect(device.description).toBe("DFU");
  });

  it("provides a synthetic handle", () => {
    const device = new WebUsbDfuDevice(usbDevice);
    expect(device.handle).toEqual({ handle: 1 });
  });

  describe("openDevice", () => {
    it("opens the WebUSB device and calls callback with handle", () => {
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.openDevice(callback);

      return vi.waitFor(() => {
        expect(usbDevice.open).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith({ handle: 1 });
      });
    });

    it("selects configuration if null", () => {
      usbDevice.configuration = null;
      const device = new WebUsbDfuDevice(usbDevice);

      device.openDevice(vi.fn());

      return vi.waitFor(() => {
        expect(usbDevice.selectConfiguration).toHaveBeenCalledWith(1);
      });
    });

    it("sets lastError and calls callback with null on failure", () => {
      usbDevice.open.mockRejectedValue(new Error("Access denied"));
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.openDevice(callback);

      return vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith(null);
      });
    });
  });

  describe("closeDevice", () => {
    it("closes the WebUSB device", () => {
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.closeDevice(callback);

      return vi.waitFor(() => {
        expect(usbDevice.close).toHaveBeenCalled();
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe("claimInterface", () => {
    it("claims the interface", () => {
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.claimInterface(0, callback);

      return vi.waitFor(() => {
        expect(usbDevice.claimInterface).toHaveBeenCalledWith(0);
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe("releaseInterface", () => {
    it("releases the interface", () => {
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.releaseInterface(0, callback);

      return vi.waitFor(() => {
        expect(usbDevice.releaseInterface).toHaveBeenCalledWith(0);
        expect(callback).toHaveBeenCalled();
      });
    });
  });

  describe("resetDevice", () => {
    it("resets the device", () => {
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.resetDevice(callback);

      return vi.waitFor(() => {
        expect(usbDevice.reset).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(true);
      });
    });
  });

  describe("controlTransfer", () => {
    it("handles IN transfer", () => {
      const responseData = new DataView(new ArrayBuffer(6));
      usbDevice.controlTransferIn.mockResolvedValue({
        status: "ok",
        data: responseData,
      });

      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.controlTransfer(
        {
          direction: "in",
          recipient: "interface",
          requestType: "class",
          request: 3,
          value: 0,
          index: 0,
          length: 6,
        },
        callback,
      );

      return vi.waitFor(() => {
        expect(usbDevice.controlTransferIn).toHaveBeenCalledWith(
          {
            requestType: "class",
            recipient: "interface",
            request: 3,
            value: 0,
            index: 0,
          },
          6,
        );
        expect(callback).toHaveBeenCalledWith({
          data: responseData.buffer,
          resultCode: 0,
        });
      });
    });

    it("handles OUT transfer", () => {
      usbDevice.controlTransferOut.mockResolvedValue({ status: "ok" });

      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();
      const data = new ArrayBuffer(5);

      device.controlTransfer(
        {
          direction: "out",
          recipient: "interface",
          requestType: "class",
          request: 1,
          value: 0,
          index: 0,
          data: data,
        },
        callback,
      );

      return vi.waitFor(() => {
        expect(usbDevice.controlTransferOut).toHaveBeenCalledWith(
          {
            requestType: "class",
            recipient: "interface",
            request: 1,
            value: 0,
            index: 0,
          },
          data,
        );
        expect(callback).toHaveBeenCalledWith({ resultCode: 0 });
      });
    });

    it("handles IN transfer error status", () => {
      usbDevice.controlTransferIn.mockResolvedValue({ status: "stall" });

      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.controlTransfer(
        {
          direction: "in",
          recipient: "interface",
          requestType: "class",
          request: 3,
          value: 0,
          index: 0,
          length: 6,
        },
        callback,
      );

      return vi.waitFor(() => {
        expect(callback).toHaveBeenCalledWith({
          data: undefined,
          resultCode: 1,
        });
      });
    });

    it("handles OUT transfer with no data", () => {
      usbDevice.controlTransferOut.mockResolvedValue({ status: "ok" });

      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.controlTransfer(
        {
          direction: "out",
          recipient: "interface",
          requestType: "class",
          request: 4,
          value: 0,
          index: 0,
        },
        callback,
      );

      return vi.waitFor(() => {
        expect(usbDevice.controlTransferOut).toHaveBeenCalledWith(
          expect.any(Object),
          new ArrayBuffer(0),
        );
        expect(callback).toHaveBeenCalledWith({ resultCode: 0 });
      });
    });
  });

  describe("getConfiguration", () => {
    it("returns the device configuration", () => {
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.getConfiguration(callback);

      expect(callback).toHaveBeenCalledWith(usbDevice.configuration);
    });

    it("sets lastError when no configuration", () => {
      usbDevice.configuration = null;
      const device = new WebUsbDfuDevice(usbDevice);
      const callback = vi.fn();

      device.getConfiguration(callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });
});

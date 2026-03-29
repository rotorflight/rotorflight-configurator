import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebUsbDfuInterface } from "../webdfu";
import { DeviceType } from "../shared";

function mockUsbDevice(
  opts = { vendorId: 0x0483, productId: 0xdf11, productName: "STM32 BOOTLOADER" },
) {
  return {
    vendorId: opts.vendorId,
    productId: opts.productId,
    productName: opts.productName,
    configuration: { interfaces: [] },
    open: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    claimInterface: vi.fn(async () => {}),
    releaseInterface: vi.fn(async () => {}),
    reset: vi.fn(async () => {}),
    controlTransferIn: vi.fn(),
    controlTransferOut: vi.fn(),
  };
}

function setupNavigatorUsb(devices = []) {
  const listeners = {};

  navigator.usb = {
    getDevices: vi.fn().mockResolvedValue(devices),
    requestDevice: vi.fn(),
    addEventListener: vi.fn((event, cb) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
  };

  return {
    emit(event, device) {
      for (const cb of listeners[event] || []) {
        cb({ device });
      }
    },
  };
}

describe("WebUsbDfuInterface", () => {
  let events;

  beforeEach(() => {
    globalThis.chrome = { runtime: { lastError: null } };
    events = setupNavigatorUsb();
  });

  it("requires permission", () => {
    const iface = new WebUsbDfuInterface();
    expect(iface.requiresPermission).toBe(true);
  });

  it("loads already-permitted DFU devices on construction", async () => {
    const dev = mockUsbDevice();
    events = setupNavigatorUsb([dev]);

    const iface = new WebUsbDfuInterface();

    await vi.waitFor(async () => {
      const devices = await iface.getDevices();
      expect(devices).toHaveLength(1);
    });

    const devices = await iface.getDevices();
    expect(devices[0].type).toBe(DeviceType.DFU);
    expect(devices[0].description).toBe("DFU - STM32 BOOTLOADER");
  });

  it("ignores non-DFU devices from getDevices", async () => {
    const nonDfu = mockUsbDevice({
      vendorId: 9999,
      productId: 1234,
      productName: "Random USB",
    });
    events = setupNavigatorUsb([nonDfu]);

    const iface = new WebUsbDfuInterface();

    // Wait for constructor async to settle
    await new Promise((r) => setTimeout(r, 10));

    const devices = await iface.getDevices();
    expect(devices).toHaveLength(0);
  });

  it("adds device on USB connect event", async () => {
    const iface = new WebUsbDfuInterface();
    const dev = mockUsbDevice();

    events.emit("connect", dev);

    const devices = await iface.getDevices();
    expect(devices).toHaveLength(1);
  });

  it("ignores connect events for non-DFU devices", async () => {
    const iface = new WebUsbDfuInterface();
    const dev = mockUsbDevice({
      vendorId: 9999,
      productId: 1234,
      productName: "Random",
    });

    events.emit("connect", dev);

    const devices = await iface.getDevices();
    expect(devices).toHaveLength(0);
  });

  it("removes device on USB disconnect event", async () => {
    const dev = mockUsbDevice();
    events = setupNavigatorUsb([dev]);

    const iface = new WebUsbDfuInterface();
    await vi.waitFor(async () => {
      expect(await iface.getDevices()).toHaveLength(1);
    });

    events.emit("disconnect", dev);

    const devices = await iface.getDevices();
    expect(devices).toHaveLength(0);
  });

  it("notifies change callbacks on connect/disconnect", async () => {
    const iface = new WebUsbDfuInterface();
    const onChange = vi.fn();
    iface.devicesChanged(onChange);

    const dev = mockUsbDevice();
    events.emit("connect", dev);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ type: DeviceType.DFU }),
    ]);

    events.emit("disconnect", dev);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("requestPermission adds and returns new device", async () => {
    const usbDev = mockUsbDevice();
    navigator.usb.requestDevice.mockResolvedValue(usbDev);

    const iface = new WebUsbDfuInterface();
    const device = await iface.requestPermission();

    expect(device).not.toBeNull();
    expect(device.type).toBe(DeviceType.DFU);
    expect(device.description).toBe("DFU - STM32 BOOTLOADER");

    const devices = await iface.getDevices();
    expect(devices).toContain(device);
  });

  it("requestPermission returns null when user cancels", async () => {
    navigator.usb.requestDevice.mockRejectedValue(
      new DOMException("User cancelled"),
    );

    const iface = new WebUsbDfuInterface();
    const device = await iface.requestPermission();

    expect(device).toBeNull();
  });

  it("requestPermission passes DFU filters", async () => {
    const usbDev = mockUsbDevice();
    navigator.usb.requestDevice.mockResolvedValue(usbDev);

    const iface = new WebUsbDfuInterface();
    await iface.requestPermission();

    expect(navigator.usb.requestDevice).toHaveBeenCalledWith({
      filters: expect.arrayContaining([
        expect.objectContaining({ vendorId: 1155, productId: 57105 }),
      ]),
    });
  });

  it("supports GD32 DFU devices", async () => {
    const dev = mockUsbDevice({
      vendorId: 10473,
      productId: 393,
      productName: "GD32 DFU",
    });
    events = setupNavigatorUsb([dev]);

    const iface = new WebUsbDfuInterface();

    await vi.waitFor(async () => {
      const devices = await iface.getDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].description).toBe("DFU - GD32 DFU");
    });
  });
});

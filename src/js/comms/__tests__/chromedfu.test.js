import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChromeUsbDfuInterface } from "../chromedfu";

beforeEach(() => {
  globalThis.GUI = { operating_system: "Linux" };
  globalThis.chrome = {
    runtime: { lastError: null },
    usb: {
      getDevices: vi.fn(),
    },
  };
});

describe("ChromeUsbDfuInterface", () => {
  it("does not require permission", () => {
    const iface = new ChromeUsbDfuInterface();
    expect(iface.requiresPermission).toBe(false);
  });

  it("getDevices returns DFU devices from chrome.usb", async () => {
    chrome.usb.getDevices.mockImplementation((_filters, cb) =>
      cb([{ device: 1, productName: "STM32 BOOTLOADER" }]),
    );

    const iface = new ChromeUsbDfuInterface();
    const devices = await iface.getDevices();

    expect(devices).toHaveLength(1);
    expect(devices[0].description).toBe("DFU - STM32 BOOTLOADER");
    expect(devices[0].type).toBe("dfu");
  });

  it("getDevices returns empty when no DFU devices", async () => {
    chrome.usb.getDevices.mockImplementation((_filters, cb) => cb([]));

    const iface = new ChromeUsbDfuInterface();
    const devices = await iface.getDevices();

    expect(devices).toHaveLength(0);
  });

  it("getDevices handles null result", async () => {
    chrome.usb.getDevices.mockImplementation((_filters, cb) => cb(null));

    const iface = new ChromeUsbDfuInterface();
    const devices = await iface.getDevices();

    expect(devices).toHaveLength(0);
  });

  it("devicesChanged starts polling and notifies on change", async () => {
    vi.useFakeTimers();

    // First poll: no devices
    chrome.usb.getDevices.mockImplementationOnce((_filters, cb) => cb([]));
    // Second poll: one device appears
    chrome.usb.getDevices.mockImplementationOnce((_filters, cb) =>
      cb([{ device: 1, productName: "STM32 BOOTLOADER" }]),
    );

    const iface = new ChromeUsbDfuInterface();
    // Initialize known state
    await iface.getDevices();

    const callback = vi.fn();
    iface.devicesChanged(callback);

    // Advance past one poll interval
    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ description: "DFU - STM32 BOOTLOADER" }),
      ]),
    );

    vi.useRealTimers();
  });

  it("devicesChanged does not notify when devices unchanged", async () => {
    vi.useFakeTimers();

    const devices = [{ device: 1, productName: "STM32 BOOTLOADER" }];
    chrome.usb.getDevices.mockImplementation((_filters, cb) => cb(devices));

    const iface = new ChromeUsbDfuInterface();
    await iface.getDevices();

    const callback = vi.fn();
    iface.devicesChanged(callback);

    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

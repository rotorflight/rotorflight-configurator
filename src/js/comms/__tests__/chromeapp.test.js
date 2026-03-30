import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChromeSerialInterface } from '../chromeapp';
import { DeviceType } from '../shared';

// Mock chrome.serial
beforeEach(() => {
  globalThis.GUI = { operating_system: 'Linux' };
  globalThis.chrome = {
    serial: {
      getDevices: vi.fn(),
    },
  };
});

describe('ChromeSerialInterface', () => {
  it('does not require permission', () => {
    const iface = new ChromeSerialInterface();
    expect(iface.requiresPermission).toBe(false);
  });

  it('getDevices returns mapped devices from chrome.serial', async () => {
    chrome.serial.getDevices.mockImplementation(cb =>
      cb([
        { path: '/dev/ttyACM0', displayName: 'STM32 Virtual COM Port' },
        { path: '/dev/ttyUSB0', displayName: 'CP210x UART Bridge' },
      ]),
    );

    const iface = new ChromeSerialInterface();
    const devices = await iface.getDevices(true);

    expect(devices).toHaveLength(2);
    expect(devices[0].description).toBe('STM32 Virtual COM Port');
    expect(devices[0].type).toBe(DeviceType.Standard);
    expect(devices[1].description).toBe('CP210x UART Bridge');
  });

  it('getDevices uses path as fallback when no displayName', async () => {
    chrome.serial.getDevices.mockImplementation(cb =>
      cb([{ path: '/dev/ttyACM0' }]),
    );

    const iface = new ChromeSerialInterface();
    const devices = await iface.getDevices(true);

    expect(devices[0].description).toBe('/dev/ttyACM0');
  });

  it('filters unrecognized ports when not unfiltered', async () => {
    chrome.serial.getDevices.mockImplementation(cb =>
      cb([
        { path: '/dev/ttyACM0', displayName: 'STM32 Virtual COM Port' },
        { path: '/dev/ttyS0', displayName: 'Some Random Device' },
      ]),
    );

    const iface = new ChromeSerialInterface();
    const devices = await iface.getDevices(false);

    expect(devices).toHaveLength(1);
    expect(devices[0].description).toBe('STM32 Virtual COM Port');
  });

  it('recognizes STM devices on tty paths', async () => {
    chrome.serial.getDevices.mockImplementation(cb =>
      cb([{ path: '/dev/ttyACM0', displayName: 'STM32 Bootloader' }]),
    );

    const iface = new ChromeSerialInterface();
    const devices = await iface.getDevices(false);

    expect(devices).toHaveLength(1);
  });

  it('recognizes CP210x devices on tty paths', async () => {
    chrome.serial.getDevices.mockImplementation(cb =>
      cb([{ path: '/dev/ttyUSB0', displayName: 'CP210x UART Bridge' }]),
    );

    const iface = new ChromeSerialInterface();
    const devices = await iface.getDevices(false);

    expect(devices).toHaveLength(1);
  });

  it('recognizes STM devices on Windows', async () => {
    GUI.operating_system = 'Windows';
    chrome.serial.getDevices.mockImplementation(cb =>
      cb([{ path: 'COM3', displayName: 'STM32 Virtual COM Port' }]),
    );

    const iface = new ChromeSerialInterface();
    const devices = await iface.getDevices(false);

    expect(devices).toHaveLength(1);
  });

  it('returns all devices when unfiltered', async () => {
    chrome.serial.getDevices.mockImplementation(cb =>
      cb([
        { path: '/dev/ttyS0', displayName: 'Unknown Device' },
        { path: '/dev/ttyACM0', displayName: 'STM32' },
      ]),
    );

    const iface = new ChromeSerialInterface();
    const devices = await iface.getDevices(true);

    expect(devices).toHaveLength(2);
  });
});

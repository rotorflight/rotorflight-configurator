import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSerialInterface } from '../webserial';
import { DeviceType } from '../shared';

// Mock navigator.serial
function mockSerialPort(info = { usbVendorId: 1155, usbProductId: 22336 }) {
  return {
    getInfo: () => info,
    open: vi.fn(),
    close: vi.fn(),
    readable: null,
    writable: null,
  };
}

function setupNavigatorSerial(ports = []) {
  const listeners = {};

  navigator.serial = {
    getPorts: vi.fn().mockResolvedValue(ports),
    requestPort: vi.fn(),
    addEventListener: vi.fn((event, cb) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
  };

  return {
    emit(event, port) {
      for (const cb of listeners[event] || []) {
        cb({ target: port });
      }
    },
  };
}

describe('WebSerialInterface', () => {
  let events;

  beforeEach(() => {
    events = setupNavigatorSerial();
  });

  it('loads already-permitted devices on construction', async () => {
    const port = mockSerialPort();
    events = setupNavigatorSerial([port]);

    const iface = new WebSerialInterface();

    // Wait for the async getPorts() in constructor
    await vi.waitFor(async () => {
      const devices = await iface.getDevices();
      expect(devices).toHaveLength(1);
    });

    const devices = await iface.getDevices();
    expect(devices[0].type).toBe(DeviceType.Standard);
    expect(devices[0].description).toBe('STM Electronics');
    expect(devices[0].port).toBe(port);
  });

  it('requires permission', () => {
    const iface = new WebSerialInterface();
    expect(iface.requiresPermission).toBe(true);
  });

  it('adds device on serial connect event', async () => {
    const iface = new WebSerialInterface();
    const port = mockSerialPort();

    events.emit('connect', port);

    const devices = await iface.getDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].port).toBe(port);
  });

  it('removes device on serial disconnect event', async () => {
    const port = mockSerialPort();
    events = setupNavigatorSerial([port]);

    const iface = new WebSerialInterface();
    await vi.waitFor(async () => {
      expect(await iface.getDevices()).toHaveLength(1);
    });

    events.emit('disconnect', port);

    const devices = await iface.getDevices();
    expect(devices).toHaveLength(0);
  });

  it('notifies change callbacks on connect/disconnect', async () => {
    const iface = new WebSerialInterface();
    const onChange = vi.fn();
    iface.devicesChanged(onChange);

    const port = mockSerialPort();
    events.emit('connect', port);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ port })]);

    events.emit('disconnect', port);

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('requestPermission adds and returns new device', async () => {
    const port = mockSerialPort();
    navigator.serial.requestPort.mockResolvedValue(port);

    const iface = new WebSerialInterface();
    const device = await iface.requestPermission();

    expect(device).not.toBeNull();
    expect(device.port).toBe(port);
    expect(device.type).toBe(DeviceType.Standard);

    const devices = await iface.getDevices();
    expect(devices).toContain(device);
  });

  it('requestPermission returns existing device if already known', async () => {
    const port = mockSerialPort();
    events = setupNavigatorSerial([port]);

    const iface = new WebSerialInterface();
    await vi.waitFor(async () => {
      expect(await iface.getDevices()).toHaveLength(1);
    });

    navigator.serial.requestPort.mockResolvedValue(port);
    const device = await iface.requestPermission();

    // Should not duplicate
    const devices = await iface.getDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0]).toBe(device);
  });

  it('requestPermission returns null when user cancels', async () => {
    navigator.serial.requestPort.mockRejectedValue(new DOMException('User cancelled'));

    const iface = new WebSerialInterface();
    const device = await iface.requestPermission();

    expect(device).toBeNull();
  });

  it('requestPermission passes filters when not showAll', async () => {
    const port = mockSerialPort();
    navigator.serial.requestPort.mockResolvedValue(port);

    const iface = new WebSerialInterface();
    await iface.requestPermission(false);

    expect(navigator.serial.requestPort).toHaveBeenCalledWith(
      expect.objectContaining({ filters: expect.any(Array) }),
    );
  });

  it('requestPermission passes no filters when showAll', async () => {
    const port = mockSerialPort();
    navigator.serial.requestPort.mockResolvedValue(port);

    const iface = new WebSerialInterface();
    await iface.requestPermission(true);

    expect(navigator.serial.requestPort).toHaveBeenCalledWith({});
  });

  it('uses vendor name for known vendors', async () => {
    const iface = new WebSerialInterface();

    const knownVendors = [
      [1027, 'FTDI'],
      [1155, 'STM Electronics'],
      [4292, 'Silicon Labs'],
      [10473, 'GD32'],
      [11836, 'AT32'],
      [12619, 'Geehy'],
      [11914, 'Raspberry Pi Pico'],
    ];

    for (const [vendorId, expectedName] of knownVendors) {
      const port = mockSerialPort({ usbVendorId: vendorId, usbProductId: 1 });
      events.emit('connect', port);

      const devices = await iface.getDevices();
      const latest = devices[devices.length - 1];
      expect(latest.description).toBe(expectedName);
    }
  });

  it('falls back to VID:PID for unknown vendors', async () => {
    const iface = new WebSerialInterface();
    const port = mockSerialPort({ usbVendorId: 9999, usbProductId: 1234 });
    events.emit('connect', port);

    const devices = await iface.getDevices();
    expect(devices[0].description).toBe('VID:9999 PID:1234');
  });
});

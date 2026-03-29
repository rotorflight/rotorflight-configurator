import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChromeSerialDevice } from '../chromeapp';

beforeEach(() => {
  globalThis.chrome = {
    runtime: { lastError: null },
    serial: {
      connect: vi.fn(),
      send: vi.fn(),
      disconnect: vi.fn(),
      onReceive: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      onReceiveError: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  };
});

describe('ChromeSerialDevice', () => {
  it('has correct description and type', () => {
    const device = new ChromeSerialDevice({ path: '/dev/ttyACM0', displayName: 'STM32' });
    expect(device.description).toBe('STM32');
    expect(device.path).toBe('/dev/ttyACM0');
    expect(device.type).toBe('standard');
  });

  it('falls back to path when no displayName', () => {
    const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
    expect(device.description).toBe('/dev/ttyACM0');
  });

  it('has onReceive and onReceiveError event emitters', () => {
    const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
    expect(device.onReceive.addListener).toBeInstanceOf(Function);
    expect(device.onReceiveError.addListener).toBeInstanceOf(Function);
  });

  describe('open', () => {
    it('calls chrome.serial.connect with path and options', async () => {
      chrome.serial.connect.mockImplementation((_path, _opts, cb) => {
        cb({ connectionId: 42, bitrate: 115200 });
      });

      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      const result = await device.open({ bitrate: 115200 });

      expect(chrome.serial.connect).toHaveBeenCalledWith(
        '/dev/ttyACM0',
        { bitrate: 115200 },
        expect.any(Function),
      );
      expect(result.connectionId).toBe(42);
    });

    it('registers chrome receive listeners', async () => {
      chrome.serial.connect.mockImplementation((_path, _opts, cb) => {
        cb({ connectionId: 1 });
      });

      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      await device.open();

      expect(chrome.serial.onReceive.addListener).toHaveBeenCalled();
      expect(chrome.serial.onReceiveError.addListener).toHaveBeenCalled();
    });

    it('rejects on chrome runtime error', async () => {
      chrome.serial.connect.mockImplementation((_path, _opts, cb) => {
        chrome.runtime.lastError = { message: 'Failed to connect' };
        cb(null);
        chrome.runtime.lastError = null;
      });

      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      await expect(device.open()).rejects.toThrow('Failed to connect');
    });

    it('forwards matching receive events to device listeners', async () => {
      let chromeListener;
      chrome.serial.onReceive.addListener.mockImplementation(fn => { chromeListener = fn; });
      chrome.serial.connect.mockImplementation((_path, _opts, cb) => {
        cb({ connectionId: 7 });
      });

      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      const received = [];
      device.onReceive.addListener(data => received.push(data));

      await device.open();

      // Matching connectionId
      chromeListener({ connectionId: 7, data: new ArrayBuffer(3) });
      expect(received).toHaveLength(1);

      // Non-matching connectionId (different device)
      chromeListener({ connectionId: 99, data: new ArrayBuffer(1) });
      expect(received).toHaveLength(1);
    });

    it('forwards matching error events to device listeners', async () => {
      let chromeErrorListener;
      chrome.serial.onReceiveError.addListener.mockImplementation(fn => { chromeErrorListener = fn; });
      chrome.serial.connect.mockImplementation((_path, _opts, cb) => {
        cb({ connectionId: 7 });
      });

      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      const errors = [];
      device.onReceiveError.addListener(e => errors.push(e));

      await device.open();

      chromeErrorListener({ connectionId: 7, error: 'device_lost' });
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('device_lost');

      // Non-matching
      chromeErrorListener({ connectionId: 99, error: 'device_lost' });
      expect(errors).toHaveLength(1);
    });
  });

  describe('send', () => {
    it('sends data via chrome.serial.send', async () => {
      chrome.serial.connect.mockImplementation((_path, _opts, cb) => {
        cb({ connectionId: 5 });
      });
      chrome.serial.send.mockImplementation((_id, _data, cb) => {
        cb({ bytesSent: 4 });
      });

      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      await device.open();

      const data = new ArrayBuffer(4);
      const result = await device.send(data);

      expect(chrome.serial.send).toHaveBeenCalledWith(5, data, expect.any(Function));
      expect(result.bytesSent).toBe(4);
    });

    it('throws when port not open', async () => {
      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      await expect(device.send(new ArrayBuffer(1))).rejects.toThrow('Port not open');
    });
  });

  describe('close', () => {
    it('removes chrome listeners and disconnects', async () => {
      chrome.serial.connect.mockImplementation((_path, _opts, cb) => {
        cb({ connectionId: 5 });
      });
      chrome.serial.disconnect.mockImplementation((_id, cb) => cb(true));

      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      await device.open();
      await device.close();

      expect(chrome.serial.onReceive.removeListener).toHaveBeenCalled();
      expect(chrome.serial.onReceiveError.removeListener).toHaveBeenCalled();
      expect(chrome.serial.disconnect).toHaveBeenCalledWith(5, expect.any(Function));
    });

    it('can close without opening', async () => {
      const device = new ChromeSerialDevice({ path: '/dev/ttyACM0' });
      // Should not throw
      await device.close();
    });
  });
});

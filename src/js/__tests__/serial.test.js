import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serial } from '../serial';

// Mock device
function mockDevice() {
  const onReceive = { addListener: vi.fn(), removeListener: vi.fn() };
  const onReceiveError = { addListener: vi.fn(), removeListener: vi.fn() };

  return {
    open: vi.fn().mockResolvedValue({ connectionId: 'dev-1' }),
    close: vi.fn().mockResolvedValue(),
    send: vi.fn().mockResolvedValue({ bytesSent: 4 }),
    onReceive,
    onReceiveError,
    description: 'Test Device',
    type: 'standard',
  };
}

beforeEach(() => {
  // Reset serial state
  serial.connected = false;
  serial.connectionId = false;
  serial.openCanceled = false;
  serial.bitrate = 0;
  serial.bytesReceived = 0;
  serial.bytesSent = 0;
  serial.failed = 0;
  serial.transmitting = false;
  serial.outputBuffer = [];
  serial._device = null;
  serial.onReceive.removeAll();
  serial.onReceiveError.removeAll();

  // Mock globals
  globalThis.GUI = { connected_to: false, connecting_to: false, log: vi.fn() };
  globalThis.FC = { CONFIG: { armingDisabled: false } };
  globalThis.CONFIGURATOR = { virtualMode: false };
});

describe('serial', () => {
  describe('connectDevice', () => {
    it('opens device and sets connected state', async () => {
      const device = mockDevice();
      await new Promise(resolve => {
        serial.connect(device, { bitrate: 115200 }, resolve);
      });

      expect(device.open).toHaveBeenCalledWith({ bitrate: 115200 });
      expect(serial.connected).toBe(true);
      expect(serial.bitrate).toBe(115200);
      expect(serial._device).toBe(device);
    });

    it('calls callback with connection info', async () => {
      const device = mockDevice();
      const info = await new Promise(resolve => {
        serial.connect(device, { bitrate: 115200 }, resolve);
      });

      expect(info).toEqual({ connectionId: 'dev-1', bitrate: 115200 });
    });

    it('hooks up device onReceive to serial onReceive', async () => {
      const device = mockDevice();
      await new Promise(resolve => {
        serial.connect(device, { bitrate: 115200 }, resolve);
      });

      expect(device.onReceive.addListener).toHaveBeenCalled();

      // Simulate device receiving data
      const listener = device.onReceive.addListener.mock.calls[0][0];
      const received = [];
      serial.onReceive.addListener(info => received.push(info));

      const data = new Uint8Array([1, 2, 3]);
      listener(data);

      expect(received).toHaveLength(1);
      expect(received[0].data).toBe(data);
      expect(serial.bytesReceived).toBe(3);
    });

    it('calls callback with false on open failure', async () => {
      const device = mockDevice();
      device.open.mockRejectedValue(new Error('Permission denied'));

      const result = await new Promise(resolve => {
        serial.connect(device, {}, resolve);
      });

      expect(result).toBe(false);
      expect(serial.connected).toBe(false);
      expect(serial._device).toBeNull();
    });

    it('handles openCanceled during connect', async () => {
      const device = mockDevice();
      serial.openCanceled = true;

      const result = await new Promise(resolve => {
        serial.connect(device, {}, resolve);
      });

      expect(result).toBe(false);
      expect(device.close).toHaveBeenCalled();
      expect(serial._device).toBeNull();
    });
  });

  describe('send with device', () => {
    it('delegates to device.send', async () => {
      const device = mockDevice();
      await new Promise(resolve => {
        serial.connect(device, { bitrate: 115200 }, resolve);
      });

      const data = new ArrayBuffer(4);
      const result = await new Promise(resolve => {
        serial.send(data, resolve);
      });

      expect(device.send).toHaveBeenCalledWith(data);
      expect(result.bytesSent).toBe(4);
      expect(serial.bytesSent).toBe(4);
    });

    it('processes output buffer sequentially', async () => {
      const device = mockDevice();
      await new Promise(resolve => {
        serial.connect(device, { bitrate: 115200 }, resolve);
      });

      const results = [];
      serial.send(new ArrayBuffer(2), (info) => results.push(info));
      serial.send(new ArrayBuffer(3), (info) => results.push(info));

      // Wait for both to process
      await vi.waitFor(() => {
        expect(results).toHaveLength(2);
      });

      expect(device.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('disconnect with device', () => {
    it('closes device and resets state', async () => {
      const device = mockDevice();
      await new Promise(resolve => {
        serial.connect(device, { bitrate: 115200 }, resolve);
      });

      const result = await new Promise(resolve => {
        serial.disconnect(resolve);
      });

      expect(result).toBe(true);
      expect(device.close).toHaveBeenCalled();
      expect(serial.connected).toBe(false);
      expect(serial._device).toBeNull();
      expect(serial.connectionId).toBe(false);
    });

    it('clears output buffer on disconnect', async () => {
      const device = mockDevice();
      await new Promise(resolve => {
        serial.connect(device, { bitrate: 115200 }, resolve);
      });

      serial.outputBuffer.push({ data: new ArrayBuffer(1), callback: null });
      serial.disconnect();

      expect(serial.outputBuffer).toHaveLength(0);
      expect(serial.transmitting).toBe(false);
    });
  });

  describe('connect with string path', () => {
    it('routes virtual to connectVirtual', () => {
      const cb = vi.fn();
      serial.connect('virtual', {}, cb);

      expect(serial.connected).toBe(true);
      expect(serial.connectionId).toBe('virtual');
      expect(serial.connectionType).toBe('virtual');
      expect(cb).toHaveBeenCalled();
    });
  });
});

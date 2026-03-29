import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSerialDevice } from '../webserial';

function mockReadableStream(chunks = []) {
  let index = 0;
  const reader = {
    read: vi.fn(async () => {
      if (index < chunks.length) {
        return { done: false, value: chunks[index++] };
      }
      return { done: true, value: undefined };
    }),
    cancel: vi.fn(async () => {
      // Simulate cancel causing next read to return done
      reader.read.mockResolvedValue({ done: true, value: undefined });
    }),
    releaseLock: vi.fn(),
    get locked() { return true; },
  };
  return {
    getReader: vi.fn(() => reader),
    _reader: reader,
  };
}

function mockWritableStream() {
  const writer = {
    write: vi.fn(async () => {}),
    releaseLock: vi.fn(),
  };
  return {
    getWriter: vi.fn(() => writer),
    _writer: writer,
  };
}

function mockSerialPort(readable, writable) {
  return {
    getInfo: () => ({ usbVendorId: 1155, usbProductId: 22336 }),
    open: vi.fn(async () => {
      port.readable = readable;
      port.writable = writable;
    }),
    close: vi.fn(async () => {}),
    readable: null,
    writable: null,
  };
}

let port, readable, writable;

beforeEach(() => {
  readable = mockReadableStream();
  writable = mockWritableStream();
  port = mockSerialPort(readable, writable);
});

describe('WebSerialDevice', () => {
  it('has correct description and type', () => {
    const device = new WebSerialDevice(port);
    expect(device.description).toBe('STM Electronics');
    expect(device.type).toBe('standard');
    expect(device.port).toBe(port);
  });

  it('has onReceive and onReceiveError event emitters', () => {
    const device = new WebSerialDevice(port);
    expect(device.onReceive).toBeDefined();
    expect(device.onReceive.addListener).toBeInstanceOf(Function);
    expect(device.onReceiveError).toBeDefined();
  });

  describe('open', () => {
    it('opens port with translated options', async () => {
      const device = new WebSerialDevice(port);
      await device.open({ bitrate: 115200, dataBits: 'eight', stopBits: 'one', parityBit: 'no' });

      expect(port.open).toHaveBeenCalledWith({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 4096,
      });
    });

    it('uses defaults for missing options', async () => {
      const device = new WebSerialDevice(port);
      await device.open();

      expect(port.open).toHaveBeenCalledWith(
        expect.objectContaining({
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        }),
      );
    });

    it('translates seven data bits', async () => {
      const device = new WebSerialDevice(port);
      await device.open({ dataBits: 'seven' });

      expect(port.open).toHaveBeenCalledWith(
        expect.objectContaining({ dataBits: 7 }),
      );
    });

    it('translates two stop bits', async () => {
      const device = new WebSerialDevice(port);
      await device.open({ stopBits: 'two' });

      expect(port.open).toHaveBeenCalledWith(
        expect.objectContaining({ stopBits: 2 }),
      );
    });

    it('translates even parity', async () => {
      const device = new WebSerialDevice(port);
      await device.open({ parityBit: 'even' });

      expect(port.open).toHaveBeenCalledWith(
        expect.objectContaining({ parity: 'even' }),
      );
    });

    it('starts read loop and fires onReceive', async () => {
      const chunk = new Uint8Array([1, 2, 3]);
      readable = mockReadableStream([chunk]);
      port = mockSerialPort(readable, writable);

      const device = new WebSerialDevice(port);
      const received = [];
      device.onReceive.addListener(data => received.push(data));

      await device.open();

      // Wait for read loop to process
      await vi.waitFor(() => {
        expect(received).toHaveLength(1);
      });

      expect(received[0]).toBe(chunk);
    });
  });

  describe('send', () => {
    it('writes data to writer', async () => {
      const device = new WebSerialDevice(port);
      await device.open();

      const data = new Uint8Array([0x01, 0x02]);
      const result = await device.send(data);

      expect(writable._writer.write).toHaveBeenCalledWith(data);
      expect(result.bytesSent).toBe(2);
    });

    it('throws when port not open', async () => {
      const device = new WebSerialDevice(port);
      await expect(device.send(new Uint8Array([1]))).rejects.toThrow('Port not open');
    });
  });

  describe('close', () => {
    it('cancels reader and closes port', async () => {
      const device = new WebSerialDevice(port);
      await device.open();
      await device.close();

      expect(readable._reader.cancel).toHaveBeenCalled();
      expect(writable._writer.releaseLock).toHaveBeenCalled();
      expect(port.close).toHaveBeenCalled();
    });

    it('can close without opening', async () => {
      const device = new WebSerialDevice(port);
      // Should not throw
      await device.close();
    });
  });

  describe('error handling', () => {
    it('fires onReceiveError when read loop errors', async () => {
      const failReader = {
        read: vi.fn().mockRejectedValue(new Error('USB device disconnected')),
        cancel: vi.fn(),
        releaseLock: vi.fn(),
      };
      readable = { getReader: () => failReader, _reader: failReader };
      port = mockSerialPort(readable, writable);

      const device = new WebSerialDevice(port);
      const errors = [];
      device.onReceiveError.addListener(e => errors.push(e));

      await device.open();

      await vi.waitFor(() => {
        expect(errors).toHaveLength(1);
      });

      expect(errors[0].error).toBe('device_lost');
    });
  });
});

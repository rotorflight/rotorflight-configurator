import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  // Clean up navigator.serial between tests
  delete navigator.serial;
});

describe('getInterfaces', () => {
  it('includes WebSerialInterface when navigator.serial exists', async () => {
    navigator.serial = {
      getPorts: vi.fn().mockResolvedValue([]),
      addEventListener: vi.fn(),
    };

    const { getInterfaces } = await import('../index');
    const ifaces = await getInterfaces();

    const webserial = ifaces.find(i => i.iface.constructor.name === 'WebSerialInterface');
    expect(webserial).toBeDefined();
    expect(webserial.kind).toBe('serial');
    expect(webserial.iface.requiresPermission).toBe(true);
  });

  it('always includes ManualSerialInterface', async () => {
    const { getInterfaces } = await import('../index');
    const ifaces = await getInterfaces();

    const manual = ifaces.find(i => i.iface.constructor.name === 'ManualSerialInterface');
    expect(manual).toBeDefined();
    expect(manual.kind).toBe('serial');
    expect(manual.iface.requiresPermission).toBe(false);
  });

  it('includes VirtualSerialInterface in dev mode', async () => {
    const { getInterfaces } = await import('../index');
    const ifaces = await getInterfaces();

    const virtual = ifaces.find(i => i.iface.constructor.name === 'VirtualSerialInterface');
    // Vitest runs with import.meta.env.DEV = true
    expect(virtual).toBeDefined();
    expect(virtual.kind).toBe('serial');
  });

  it('puts ManualSerialInterface last', async () => {
    const { getInterfaces } = await import('../index');
    const ifaces = await getInterfaces();

    const last = ifaces[ifaces.length - 1];
    expect(last.iface.constructor.name).toBe('ManualSerialInterface');
  });

  it('tags serial and dfu interfaces with kind', async () => {
    const { getInterfaces } = await import('../index');
    const ifaces = await getInterfaces();

    for (const entry of ifaces) {
      expect(['serial', 'dfu']).toContain(entry.kind);
      expect(entry.iface).toBeDefined();
    }
  });
});

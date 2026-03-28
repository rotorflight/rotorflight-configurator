import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  // Clean up navigator.serial between tests
  delete navigator.serial;
});

describe('getSerialInterfaces', () => {
  it('includes WebSerialInterface when navigator.serial exists', async () => {
    navigator.serial = {
      getPorts: vi.fn().mockResolvedValue([]),
      addEventListener: vi.fn(),
    };

    const { getSerialInterfaces } = await import('../index');
    const ifaces = await getSerialInterfaces();

    const webserial = ifaces.find(i => i.constructor.name === 'WebSerialInterface');
    expect(webserial).toBeDefined();
    expect(webserial.requiresPermission).toBe(true);
  });

  it('always includes ManualSerialInterface', async () => {
    const { getSerialInterfaces } = await import('../index');
    const ifaces = await getSerialInterfaces();

    const manual = ifaces.find(i => i.constructor.name === 'ManualSerialInterface');
    expect(manual).toBeDefined();
    expect(manual.requiresPermission).toBe(false);
  });

  it('includes VirtualSerialInterface in dev mode', async () => {
    const { getSerialInterfaces } = await import('../index');
    const ifaces = await getSerialInterfaces();

    const virtual = ifaces.find(i => i.constructor.name === 'VirtualSerialInterface');
    // Vitest runs with import.meta.env.DEV = true
    expect(virtual).toBeDefined();
  });

  it('puts ManualSerialInterface last', async () => {
    const { getSerialInterfaces } = await import('../index');
    const ifaces = await getSerialInterfaces();

    const last = ifaces[ifaces.length - 1];
    expect(last.constructor.name).toBe('ManualSerialInterface');
  });
});

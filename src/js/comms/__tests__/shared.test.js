import { describe, it, expect } from 'vitest';
import { DeviceType, usbDevices } from '../shared';

describe('DeviceType', () => {
  it('has expected values', () => {
    expect(DeviceType.Standard).toBe('standard');
    expect(DeviceType.DFU).toBe('dfu');
    expect(DeviceType.Manual).toBe('manual');
    expect(DeviceType.Virtual).toBe('virtual');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DeviceType)).toBe(true);
  });
});

describe('usbDevices', () => {
  it('has filters array with vendorId and productId', () => {
    expect(usbDevices.filters).toBeInstanceOf(Array);
    expect(usbDevices.filters.length).toBeGreaterThan(0);

    for (const filter of usbDevices.filters) {
      expect(filter).toHaveProperty('vendorId');
      expect(filter).toHaveProperty('productId');
      expect(typeof filter.vendorId).toBe('number');
      expect(typeof filter.productId).toBe('number');
    }
  });
});

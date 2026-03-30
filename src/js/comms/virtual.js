import i18next from 'i18next';
import { DeviceType } from './shared';

class VirtualSerialDevice {
  constructor() {
    this.description = i18next.t('portsSelectVirtual');
    this.type = DeviceType.Virtual;
  }

  description;
  type;

  async open(_options) {
  }

  async close() { }
}

export class VirtualSerialInterface {
  constructor() {
    this.requiresPermission = false;
  }

  async getDevices(_unfiltered) {
    return [new VirtualSerialDevice()];
  };

  requiresPermission;

  requestPermission() {
  }

  devicesChanged(_callback) {
  }
};

import i18next from 'i18next';
import { DeviceType } from './shared';

class ManualSerialDevice {
  constructor() {
    this.description = i18next.t('portsSelectManual');
    this.type = DeviceType.Manual;
  }

  description;
  type;

  async open(_options) {
  }

  async close() { }
}

export class ManualSerialInterface {
  constructor() {
    this.requiresPermission = false;
  }

  async getDevices(_unfiltered) {
    return [new ManualSerialDevice()];
  };

  requiresPermission;

  requestPermission() {
  }

  devicesChanged(_callback) {
  }
};

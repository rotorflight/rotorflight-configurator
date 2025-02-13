export class Features {
  static FLAGS = {
    RX_PPM: 0,
    RX_SERIAL: 3,
    SOFTSERIAL: 6,
    GPS: 7,
    SONAR: 9,
    TELEMETRY: 10,
    RX_PARALLEL_PWM: 13,
    RX_MSP: 14,
    RSSI_ADC: 15,
    LED_STRIP: 16,
    DISPLAY: 17,
    OSD: 18,
    CMS: 19,
    RX_SPI: 25,
    GOVERNOR: 26,
    ESC_SENSOR: 27,
    FREQ_SENSOR: 28,
    DYN_NOTCH: 29,
    RPM_FILTER: 30,
  };

  static GROUPS = {
    RX_PROTO: ["RX_PPM", "RX_SERIAL", "RX_PARALLEL_PWM", "RX_MSP", "RX_SPI"],
    OTHER: ["GPS", "LED_STRIP", "CMS"],
    RSSI: ["RSSI_ADC"],
  };

  bitfield = $state(0);

  constructor() {
    // allow each flag in the bitfield to be accessed as a regular property
    for (const feature of Object.keys(Features.FLAGS)) {
      Object.defineProperty(this, feature, {
        get() {
          return this.isEnabled(feature);
        },
        set(v) {
          this.setFeature(feature, v);
        },
      });
    }
  }

  isEnabled(featureName) {
    return bit_check(this.bitfield, Features.FLAGS[featureName]);
  }

  setFeature(featureName, enabled) {
    this.bitfield = enabled
      ? bit_set(this.bitfield, Features.FLAGS[featureName])
      : bit_clear(this.bitfield, Features.FLAGS[featureName]);
  }

  setGroup(groupName, enabled) {
    for (const featureName of Features.GROUPS[groupName]) {
      this.setFeature(featureName, enabled);
    }
  }
}

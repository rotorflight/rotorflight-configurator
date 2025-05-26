import { FC } from "@/js/fc.svelte.js";

export function applyVirtualConfig() {
  FC.resetState();

  FC.CONFIG.flightControllerVersion = "4.5.0";
  FC.CONFIG.apiVersion = CONFIGURATOR.virtualApiVersion;
  FC.CONFIG.motorCount = 1;

  FC.BEEPER_CONFIG.beepers = new Beepers(FC.CONFIG);
  FC.BEEPER_CONFIG.dshotBeaconConditions = new Beepers(FC.CONFIG, [
    "RX_LOST",
    "RX_SET",
  ]);

  FC.MIXER_CONFIG.mixer = 3;

  FC.MOTOR_DATA = new Array(8);
  FC.MOTOR_CONFIG = {
    mincommand: 0,
    minthrottle: 0,
    maxthrottle: 0,
    motor_pwm_protocol: 0,
    motor_pwm_rate: 250,
    motor_poles: [8, 8, 8, 8],
    motor_rpm_lpf: [0, 0, 0, 0],
    use_dshot_telemetry: false,
    use_unsynced_pwm: false,
    main_rotor_gear_ratio: [1, 1],
    tail_rotor_gear_ratio: [1, 1],
  };

  FC.SERVO_CONFIG = new Array(8);
  for (let i = 0; i < FC.SERVO_CONFIG.length; i++) {
    FC.SERVO_CONFIG[i] = {
      mid: 1500,
      min: -700,
      max: 700,
      rneg: 500,
      rpos: 500,
      rate: 333,
      speed: 0,
      flags: 0,
    };
  }

  FC.ADJUSTMENT_RANGES = new Array(42);
  for (let i = 0; i < FC.ADJUSTMENT_RANGES.length; i++) {
    FC.ADJUSTMENT_RANGES[i] = {
      adjFunction: 0,
      enaChannel: 0,
      enaRange: {
        start: 1500,
        end: 1500,
      },
      adjChannel: 0,
      adjRange1: {
        start: 1500,
        end: 1500,
      },
      adjRange2: {
        start: 1500,
        end: 1500,
      },
      adjMin: 0,
      adjMax: 100,
      adjStep: 1,
    };
  }

  FC.SERIAL_CONFIG.ports = new Array(6);
  FC.SERIAL_CONFIG.ports[0] = {
    identifier: 20,
    auxChannelIndex: 0,
    functions: ["MSP"],
    msp_baudrate: 115200,
    gps_baudrate: 57600,
    telemetry_baudrate: "AUTO",
    blackbox_baudrate: 115200,
  };

  for (let i = 1; i < FC.SERIAL_CONFIG.ports.length; i++) {
    FC.SERIAL_CONFIG.ports[i] = {
      identifier: i - 1,
      auxChannelIndex: 0,
      functions: [],
      msp_baudrate: 115200,
      gps_baudrate: 57600,
      telemetry_baudrate: "AUTO",
      blackbox_baudrate: 115200,
    };
  }

  FC.LED_STRIP = new Array(256);
  for (let i = 0; i < FC.LED_STRIP.length; i++) {
    FC.LED_STRIP[i] = {
      x: 0,
      y: 0,
      functions: ["c"],
      color: 0,
      directions: [],
      parameters: 0,
    };
  }

  FC.ANALOG = {
    voltage: 12,
    mAhdrawn: 1200,
    rssi: 100,
    amperage: 3,
  };

  FC.CONFIG.sampleRateHz = 12000;
  FC.ADVANCED_CONFIG.pid_process_denom = 2;

  FC.BLACKBOX.supported = true;

  FC.BATTERY_CONFIG = {
    vbatmincellvoltage: 1,
    vbatmaxcellvoltage: 4,
    vbatwarningcellvoltage: 3,
    capacity: 10000,
    voltageMeterSource: 1,
    currentMeterSource: 1,
  };

  FC.BATTERY_STATE = {
    cellCount: 10,
    voltage: 20,
    mAhDrawn: 1000,
    amperage: 3,
  };

  FC.DATAFLASH = {
    ready: true,
    supported: true,
    sectors: 1024,
    totalSize: 40000,
    usedSize: 10000,
  };

  FC.SDCARD = {
    supported: true,
    state: 1,
    freeSizeKB: 1024,
    totalSizeKB: 2048,
  };

  FC.SENSOR_CONFIG = {
    acc_hardware: 1,
    baro_hardware: 1,
    mag_hardware: 1,
  };

  FC.RC = {
    channels: new Array(16),
    active_channels: 16,
  };
  for (let i = 0; i < FC.RC.channels.length; i++) {
    FC.RC.channels[i] = 1500;
  }

  FC.AUX_CONFIG = [
    // ARM flag
    "ARM",

    // Flight modes
    "ANGLE",
    "HORIZON",
    "TRAINER",
    "ALTHOLD",
    "RESCUE",
    "GPSRESCUE",
    "FAILSAFE",

    // RC modes
    "PREARM",
    "PARALYZE",
    "BEEPERON",
    "BEEPERMUTE",
    "LEDLOW",
    "CALIB",
    "OSD",
    "TELEMETRY",
    "BEEPGPSCOUNT",
    "BLACKBOX",
    "BLACKBOXERASE",
    "CAMERA1",
    "CAMERA2",
    "CAMERA3",
    "VTXPITMODE",
    "VTXCONTROLDISABLE",
    "STICKCOMMANDDISABLE",
    "USER1",
    "USER2",
    "USER3",
    "USER4",
  ];
  FC.AUX_CONFIG_IDS = [
    0, 1, 2, 4, 5, 6, 7, 8, 12, 13, 15, 17, 19, 20, 23, 24, 25, 26, 27, 28, 29,
    30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  ];

  for (let i = 0; i < 16; i++) {
    FC.RXFAIL_CONFIG[i] = {
      mode: 1,
      value: 1500,
    };
  }

  // 11 1111 (pass bitchecks)
  FC.CONFIG.activeSensors = 63;

  FC.MIXER_INPUTS = [
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
  ];

  FC.PID_PROFILE.pid_mode = 3;
  FC.RC_TUNING.rates_type = 4;
  FC.CONFIG.servoCount = 4;
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (CONFIGURATOR.virtualMode) {
      newModule?.applyVirtualConfig();
    }
  });
}

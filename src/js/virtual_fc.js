import { FC } from "@/js/fc.svelte.js";

export function applyVirtualConfig() {
  FC.resetState();

  Object.assign(FC.CONFIG, {
    targetName: "VirtualFC",
    name: "VirtualFC",
    buildVersion: CONFIGURATOR.virtualFwVersion,
    flightControllerVersion: CONFIGURATOR.virtualFwVersion,
    flightControllerIdentifier: "RTFL",
    apiVersion: CONFIGURATOR.virtualApiVersion,
    motorCount: 1,
    servoCount: 4,
    sampleRateHz: 4000,
    activeSensors: 63, // activate all sensors
  });

  Object.assign(FC.ADVANCED_CONFIG, {
    pid_process_denom: 2,
  });

  // Configuration
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

  FC.SERIAL_CONFIG.ports[1].functionMask = 64; // RX_SERIAL
  FC.SERIAL_CONFIG.ports[2].functionMask = 1024; // ESC_SENSOR
  FC.SERIAL_CONFIG.ports[3].functionMask = 2; // GPS

  // Receiver
  FC.FEATURE_CONFIG.features.RX_SERIAL = true;
  FC.FEATURE_CONFIG.features.TELEMETRY = true;
  Object.assign(FC.RX_CONFIG, {
    serialrx_provider: 9, // CRSF
  });

  Object.assign(FC.RC_CONFIG, {
    rc_center: 1500,
    rc_deflection: 510,
    rc_min_throttle: 0,
    rc_max_throttle: 0,
    rc_deadband: 5,
    rc_yaw_deadband: 5,
  });

  Object.assign(FC.ANALOG, {
    rssi: 700,
  });

  FC.RC_MAP = [0, 1, 3, 2, 5, 4, 6, 7];

  Object.assign(FC.TELEMETRY_CONFIG, {
    crsf_telemetry_mode: 1,
    crsf_telemetry_rate: 500,
    crsf_telemetry_ratio: 8,
    telemetry_sensors_list: [4, 5, 6, 7, 8],
  });

  FC.RC = {
    channels: new Array(16).fill(1500),
    active_channels: 16,
  };

  FC.RX_CHANNELS = new Array(16).fill(1500);
  FC.RC_COMMAND = new Array(16).fill(0);

  // Failsafe
  Object.assign(FC.RX_CONFIG, {
    rx_pulse_min: 885,
    rx_pulse_max: 2115,
  });

  for (let i = 0; i < 16; i++) {
    FC.RXFAIL_CONFIG[i] = {
      mode: i < 5 ? 0 : 1,
      value: 1500,
    };
  }

  // Gyro
  FC.FEATURE_CONFIG.features.DYN_NOTCH = true;
  FC.FEATURE_CONFIG.features.RPM_FILTER = true;

  Object.assign(FC.FILTER_CONFIG, {
    dyn_notch_count: 6,
    dyn_notch_q: 20,
    dyn_notch_min_hz: 50,
    dyn_notch_max_hz: 200,

    rpm_preset: 2,
    rpm_min_hz: 20,
  });

  // Motors
  FC.MOTOR_DATA = new Array(8);
  Object.assign(FC.MOTOR_CONFIG, {
    mincommand: 1000,
    minthrottle: 1070,
    maxthrottle: 2000,
    motor_pwm_protocol: 0,
    motor_pwm_rate: 250,
    motor_poles: [8, 8, 8, 8],
    motor_rpm_lpf: [0, 0, 0, 0],
    use_dshot_telemetry: false,
    use_unsynced_pwm: false,
    main_rotor_gear_ratio: [1, 9],
    tail_rotor_gear_ratio: [1, 5],
  });

  FC.FEATURE_CONFIG.features.ESC_SENSOR = true;
  FC.FEATURE_CONFIG.features.FREQ_SENSOR = true;
  FC.FEATURE_CONFIG.features.GOVERNOR = true;
  Object.assign(FC.ESC_SENSOR_CONFIG, {
    protocol: 1,
  });

  Object.assign(FC.GOVERNOR, {
    gov_mode: 3,
    gov_handover_throttle: 20,
    gov_spoolup_min_throttle: 5,
    gov_zero_throttle_timeout: 30,
    gov_lost_headspeed_timeout: 10,
    gov_startup_time: 200,
    gov_spoolup_time: 100,
    gov_tracking_time: 20,
    gov_recovery_time: 20,
    gov_autorotation_timeout: 0,
    gov_autorotation_bailout_time: 0,
    gov_autorotation_min_entry_time: 50,
    gov_rpm_filter: 10,
    gov_pwr_filter: 5,
    gov_tta_filter: 0,
    gov_ff_filter: 10,
    gov_throttle_hold_timeout: 50,
    gov_d_filter: 50,
    gov_spooldown_time: 30,
    gov_idle_collective: -95,
    gov_wot_collective: -10,
  });

  Object.assign(FC.MOTOR_TELEMETRY_DATA, {
    rpm: [10_000],
    voltage: [11_000],
    current: [15_000],
    temperature: [250],
    temperature2: [250],
    invalidPercent: [500],
  });

  // Blackbox
  Object.assign(FC.BLACKBOX, {
    blackboxDevice: 1,
    blackboxMode: 2,
    supported: true,
    blackboxGracePeriod: 5,
    blackboxDenom: 2,
    blackboxRollingErase: 1,
  });

  Object.assign(FC.DATAFLASH, {
    ready: true,
    supported: true,
    sectors: 1024,
    totalSize: 128 * 1024 * 1024,
    usedSize: 64 * 1024 * 1024,
  });

  Object.assign(FC.SDCARD, {
    supported: false,
    state: 1,
    freeSizeKB: 1024,
    totalSizeKB: 2048,
  });

  Object.assign(FC.DEBUG_CONFIG, {
    debugMode: 0,
    debugAxis: 0,
    debugModeCount: 83,
  });

  FC.BEEPER_CONFIG.beepers = new Beepers(FC.CONFIG);
  FC.BEEPER_CONFIG.dshotBeaconConditions = new Beepers(FC.CONFIG, [
    "RX_LOST",
    "RX_SET",
  ]);

  FC.MIXER_CONFIG.mixer = 3;

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

  Object.assign(FC.ANALOG, {
    voltage: 12,
    mAhdrawn: 1200,
    amperage: 3,
  });

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

  FC.SENSOR_CONFIG = {
    acc_hardware: 1,
    baro_hardware: 1,
    mag_hardware: 1,
  };

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

  FC.MIXER_INPUTS = [
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
    { rate: 0, min: 0, max: 0 },
  ];

  FC.PID_PROFILE.pid_mode = 3;
  FC.RC_TUNING.rates_type = 4;
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (CONFIGURATOR.virtualMode) {
      newModule?.applyVirtualConfig();
    }
  });
}

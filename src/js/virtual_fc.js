import semver from "semver";

import { Beepers } from "@/js/Beepers.js";
import {
  API_VERSION_12_9,
  API_VERSION_12_10,
  CONFIGURATOR,
} from "@/js/configurator.svelte.js";
import { FC } from "@/js/fc.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import {
  BUS_SERVO_OFFSET,
  clampServoConfig,
  firmwareLimitsTravel,
} from "@/js/servoLimits.js";
import { getManufacturer } from "@/tabs/esc_programming/manufacturers/index.js";

// Sizes and defaults below mirror rotorflight-firmware (src/main/pg/*.c and
// src/main/msp/msp.c) so the virtual FC holds the same shape of data a real
// FC would report over MSP.

const PID_PROFILE_COUNT = 6;
const CONTROL_RATE_PROFILE_COUNT = 6;
const BATTERY_PROFILE_COUNT = 6;
const MAX_SUPPORTED_MOTORS = 4;
const MAX_SUPPORTED_PWM_SERVOS = 8;
const BUS_SERVO_CHANNELS = 18;
const MAX_SUPPORTED_SERVOS = MAX_SUPPORTED_PWM_SERVOS + BUS_SERVO_CHANNELS;
const MIXER_INPUT_COUNT = 29;
const MIXER_RULE_COUNT = 32;
const MAX_MODE_ACTIVATION_CONDITION_COUNT = 20;
const MAX_ADJUSTMENT_RANGE_COUNT = 42;
const LED_MAX_STRIP_LENGTH = 32;
const LED_CONFIGURABLE_COLOR_COUNT = 16;
const LED_MODE_COUNT = 4;
const LED_DIRECTION_COUNT = 6;
const LED_SPECIAL_COLOR_COUNT = 11;
const RPM_FILTER_AXIS_COUNT = 3;
const RPM_FILTER_NOTCH_COUNT = 16;
const RPM_FILTER_BANK_COUNT = 16; // API < 12.8
const CONTROL_CHANNEL_COUNT = 5;
const RC_CHANNEL_COUNT = 16; // CRSF
const TELEM_SENSOR_SLOT_COUNT = 40;
const ARMING_DISABLE_FLAGS_COUNT = 27;
const ARMING_DISABLED_MSP = 1 << 16;
const DEBUG_COUNT = 82;
const DEBUG_VALUE_COUNT = 8;
const RATE_PROFILE_MASK = 1 << 7;

const MIXER_OVERRIDE_OFF = 2501;
const SERVO_OVERRIDE_OFF = 2001;

// src/main/msp/msp_box.c: name, permanent id, active when
const BOXES = [
  ["ARM", 0, () => true],
  ["ANGLE", 1, hasAcc],
  ["HORIZON", 2, hasAcc],
  ["ALTHOLD", 3, () => false],
  ["BEEPER", 13, () => true],
  ["LEDLOW", 15, () => FC.FEATURE_CONFIG.features.LED_STRIP],
  ["CALIB", 17, () => false],
  ["OSD DISABLE", 19, () => true],
  ["TELEMETRY", 20, () => FC.FEATURE_CONFIG.features.TELEMETRY],
  ["BLACKBOX", 26, () => true],
  ["FAILSAFE", 27, () => true],
  ["BLACKBOX ERASE", 31, () => true],
  ["CAMERA CONTROL 1", 32, () => true],
  ["CAMERA CONTROL 2", 33, () => true],
  ["CAMERA CONTROL 3", 34, () => true],
  ["PREARM", 36, () => true],
  ["GPS BEEP SATELLITE COUNT", 37, () => FC.FEATURE_CONFIG.features.GPS],
  ["VTX PIT MODE", 39, () => true],
  ["USER1", 40, () => false],
  ["USER2", 41, () => false],
  ["USER3", 42, () => false],
  ["USER4", 43, () => false],
  ["PARALYZE", 45, () => true],
  ["GPS RESCUE", 46, () => FC.FEATURE_CONFIG.features.GPS],
  ["TRAINER", 47, hasAcc],
  ["VTX CONTROL DISABLE", 48, () => true],
  ["STICK COMMANDS DISABLE", 51, () => true],
  ["BEEPER MUTE", 52, () => true],
  ["RESCUE", 53, hasAcc],
  ["GOVERNOR FALLBACK", 55, () => true],
  ["GOVERNOR SUSPEND", 56, () => true],
  ["GOVERNOR BYPASS", 57, () => true],
];

// src/main/io/ledstrip.c: hsv[]
const LED_DEFAULT_COLORS = [
  { h: 0, s: 0, v: 0 },
  { h: 0, s: 255, v: 255 },
  { h: 0, s: 0, v: 255 },
  { h: 30, s: 0, v: 255 },
  { h: 60, s: 0, v: 255 },
  { h: 90, s: 0, v: 255 },
  { h: 120, s: 0, v: 255 },
  { h: 150, s: 0, v: 255 },
  { h: 180, s: 0, v: 255 },
  { h: 210, s: 0, v: 255 },
  { h: 240, s: 0, v: 255 },
  { h: 270, s: 0, v: 255 },
  { h: 300, s: 0, v: 255 },
  { h: 330, s: 0, v: 255 },
];

// src/main/io/ledstrip.c: defaultModeColors[], defaultSpecialColors[]
const LED_DEFAULT_MODE_COLORS = [
  [1, 11, 2, 13, 10, 3],
  [10, 11, 4, 13, 10, 3],
  [8, 11, 4, 13, 10, 3],
  [7, 11, 3, 13, 10, 3],
];
const LED_DEFAULT_SPECIAL_COLORS = [6, 10, 1, 0, 0, 2, 3, 6, 0, 0, 0];

// Per-profile storage, the virtual equivalent of the FC's PG arrays
let currentPidProfile = 0;
let currentRateProfile = 0;
let pidProfiles = [];
let rateProfiles = [];

let virtualEscManufacturerId = null;

// Per-manufacturer "EEPROM" for the simulated ESC: seeded from simResponse, then updated by
// MSP_SET_ESC_PARAMETERS writes so a save is actually reflected on the next read. Without this,
// every read always echoed the pristine simResponse, making saves look like they silently
// reverted to the values the form first loaded.
const virtualEscBuffers = new Map();

export function setVirtualEscManufacturer(id) {
  virtualEscManufacturerId = id;
}

function currentVirtualEscBuffer() {
  if (!virtualEscManufacturerId) return undefined;
  if (!virtualEscBuffers.has(virtualEscManufacturerId)) {
    const manufacturer = getManufacturer(virtualEscManufacturerId);
    if (!manufacturer?.simResponse) return undefined;
    virtualEscBuffers.set(
      virtualEscManufacturerId,
      Uint8Array.from(manufacturer.simResponse),
    );
  }
  return virtualEscBuffers.get(virtualEscManufacturerId);
}

function hasAcc() {
  return (FC.CONFIG.activeSensors & 1) !== 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultPids() {
  // src/main/pg/pid.c: resetPidProfile(), P, I, D, F, B, O
  return [
    [50, 100, 0, 100, 0, 50, 0, 0],
    [50, 100, 40, 100, 0, 50, 0, 0],
    [80, 120, 10, 0, 0, 0, 0, 0],
  ];
}

function defaultPidProfile() {
  // src/main/pg/pid.c: resetPidProfile(), in MSP_PID_PROFILE/MSP_RESCUE_PROFILE units
  return {
    pid_mode: 3,
    error_decay_time_ground: 25,
    error_decay_time_cyclic: 250,
    error_decay_time_yaw: 0,
    error_decay_limit_cyclic: 12,
    error_decay_limit_yaw: 0,
    error_rotation: 1,
    errorLimitRoll: 45,
    errorLimitPitch: 45,
    errorLimitYaw: 60,
    gyroCutoffRoll: 50,
    gyroCutoffPitch: 50,
    gyroCutoffYaw: 100,
    dtermCutoffRoll: 15,
    dtermCutoffPitch: 15,
    dtermCutoffYaw: 20,
    itermRelaxType: 2,
    itermRelaxCutoffRoll: 10,
    itermRelaxCutoffPitch: 10,
    itermRelaxCutoffYaw: 10,
    yawStopGainCW: 120,
    yawStopGainCCW: 80,
    yawPrecompCutoff: 5,
    yawFFCyclicGain: 10,
    yawFFCollectiveGain: 60,
    yawFFImpulseGain: 0,
    yawFFImpulseDecay: 0,
    pitchFFCollectiveGain: 0,
    levelAngleStrength: 40,
    levelAngleLimit: 55,
    horizonLevelStrength: 40,
    acroTrainerGain: 75,
    acroTrainerLimit: 20,
    cyclicCrossCouplingGain: 50,
    cyclicCrossCouplingRatio: 0,
    cyclicCrossCouplingCutoff: 25,
    offsetLimitRoll: 90,
    offsetLimitPitch: 90,
    btermCutoffRoll: 15,
    btermCutoffPitch: 15,
    btermCutoffYaw: 20,
    yaw_inertia_precomp_gain: 0,
    yaw_inertia_precomp_cutoff: 25,

    rescueMode: 0,
    rescueFlipMode: 1,
    rescueFlipGain: 200,
    rescueLevelGain: 100,
    rescuePullupTime: 3,
    rescueClimbTime: 10,
    rescueFlipTime: 20,
    rescueExitTime: 5,
    rescuePullupCollective: 650,
    rescueClimbCollective: 450,
    rescueHoverCollective: 350,
    rescueHoverAltitude: 500,
    rescueAltitudePGain: 20,
    rescueAltitudeIGain: 20,
    rescueAltitudeDGain: 10,
    rescueMaxCollective: 500,
    rescueMaxRate: 300,
    rescueMaxAccel: 3000,
  };
}

function defaultGovernorProfile() {
  // src/main/pg/pid.c: resetPidProfile(), governor.*
  return {
    gov_headspeed: 1000,
    gov_gain: 40,
    gov_p_gain: 40,
    gov_i_gain: 50,
    gov_d_gain: 0,
    gov_f_gain: 10,
    gov_tta_gain: 0,
    gov_tta_limit: 20,
    gov_yaw_ff_weight: 10,
    gov_cyclic_ff_weight: 10,
    gov_collective_ff_weight: 50,
    gov_max_throttle: 100,
    gov_min_throttle: 10,
    gov_fallback_drop: 10,
    gov_flags: 0,
  };
}

function defaultRateProfile() {
  // src/main/pg/rates.c, in MSP_RC_TUNING units
  return {
    rates_type: 6, // RATES_TYPE_ROTORFLIGHT
    roll_rc_rate: 0.5,
    roll_rc_expo: 0.4,
    roll_srate: 0.12,
    roll_response_time: 0,
    roll_accel_limit: 0,
    pitch_rc_rate: 0.5,
    pitch_rc_expo: 0.4,
    pitch_srate: 0.12,
    pitch_response_time: 0,
    pitch_accel_limit: 0,
    yaw_rc_rate: 0.8,
    yaw_rc_expo: 0.5,
    yaw_srate: 0.12,
    yaw_response_time: 0,
    yaw_accel_limit: 0,
    collective_rc_rate: 1,
    collective_rc_expo: 0,
    collective_srate: 0.12,
    collective_response_time: 0,
    collective_accel_limit: 0,
    roll_setpoint_boost_gain: 0,
    roll_setpoint_boost_cutoff: 15,
    pitch_setpoint_boost_gain: 0,
    pitch_setpoint_boost_cutoff: 15,
    yaw_setpoint_boost_gain: 0,
    yaw_setpoint_boost_cutoff: 90,
    collective_setpoint_boost_gain: 0,
    collective_setpoint_boost_cutoff: 15,
    yaw_dynamic_ceiling_gain: 0,
    yaw_dynamic_deadband_gain: 10,
    yaw_dynamic_deadband_filter: 60,
    cyclic_ring: 150,
    cyclic_polar: false,
  };
}

function defaultPidProfileBank() {
  return {
    pids: defaultPids(),
    pidProfile: defaultPidProfile(),
    governor: defaultGovernorProfile(),
  };
}

function storePidProfile() {
  pidProfiles[currentPidProfile] = {
    pids: clone(FC.PIDS),
    pidProfile: clone(FC.PID_PROFILE),
    governor: Object.fromEntries(
      Object.keys(defaultGovernorProfile()).map((key) => [
        key,
        clone(FC.GOVERNOR[key]),
      ]),
    ),
  };
}

function loadPidProfile(index) {
  const bank = clone(pidProfiles[index]);
  FC.PIDS = bank.pids;
  FC.PIDS_ACTIVE = clone(bank.pids);
  Object.assign(FC.PID_PROFILE, bank.pidProfile);
  Object.assign(FC.GOVERNOR, bank.governor);
  currentPidProfile = index;
  FC.CONFIG.profile = index;
}

function storeRateProfile() {
  rateProfiles[currentRateProfile] = Object.fromEntries(
    Object.keys(defaultRateProfile()).map((key) => [
      key,
      clone(FC.RC_TUNING[key]),
    ]),
  );
}

function loadRateProfile(index) {
  Object.assign(FC.RC_TUNING, clone(rateProfiles[index]));
  currentRateProfile = index;
  FC.CONFIG.rateProfile = index;
}

// Like the firmware, the legacy battery fields report the active profile
function storeBatteryProfile() {
  const config = FC.BATTERY_CONFIG;
  const index = FC.BATTERY_STATE.batteryProfile;
  config.capacity = config.capacities[index];
  if (config.hasProfileCells) {
    config.cellCount = config.cellCounts[index];
    config.vbatmincellvoltage = config.vbatmincellvoltages[index];
    config.vbatmaxcellvoltage = config.vbatmaxcellvoltages[index];
    config.vbatfullcellvoltage = config.vbatfullcellvoltages[index];
    config.vbatwarningcellvoltage = config.vbatwarningcellvoltages[index];
  }
}

function updateBoxes() {
  const active = BOXES.filter(([, , isActive]) => isActive());
  FC.AUX_CONFIG = active.map(([name]) => name);
  FC.AUX_CONFIG_IDS = active.map(([, id]) => id);
}

function dataflashReadReply(address, blockSize) {
  // New format reply without compression: address, length, compression, data
  const available = Math.max(0, FC.DATAFLASH.totalSize - address);
  const length = Math.min(blockSize, available);
  const buffer = new ArrayBuffer(7 + length);
  const view = new DataView(buffer);
  view.setUint32(0, address, true);
  view.setUint16(4, length, true);
  view.setUint8(6, 0);
  return buffer;
}

function reply(code, buffer = new ArrayBuffer(0)) {
  const data = new DataView(buffer);
  return {
    command: code,
    data: data,
    length: data.byteLength,
    crcError: false,
  };
}

/**
 * Apply the side effects the firmware has for an MSP request, and return the
 * reply as MSP.send_message callbacks receive it. Replies carry no payload
 * unless a caller parses one; FC state is otherwise kept up to date directly.
 */
export function handleVirtualMessage(code, data) {
  const bytes = data ? Array.from(data) : [];

  switch (code) {
    case MSPCodes.MSP_BOXNAMES:
    case MSPCodes.MSP_BOXIDS:
      updateBoxes();
      break;

    case MSPCodes.MSP_SELECT_SETTING: {
      const value = bytes[0] ?? 0;
      if (value & RATE_PROFILE_MASK) {
        const index = value & ~RATE_PROFILE_MASK;
        loadRateProfile(index < CONTROL_RATE_PROFILE_COUNT ? index : 0);
      } else {
        loadPidProfile(value < PID_PROFILE_COUNT ? value : 0);
      }
      break;
    }

    case MSPCodes.MSP_COPY_PROFILE: {
      const [type, dst, src] = bytes;
      if (type === 0 && dst < PID_PROFILE_COUNT && src < PID_PROFILE_COUNT) {
        pidProfiles[dst] = clone(pidProfiles[src]);
        if (dst === currentPidProfile) {
          loadPidProfile(dst);
        }
      } else if (
        type === 1 &&
        dst < CONTROL_RATE_PROFILE_COUNT &&
        src < CONTROL_RATE_PROFILE_COUNT
      ) {
        rateProfiles[dst] = clone(rateProfiles[src]);
        if (dst === currentRateProfile) {
          loadRateProfile(dst);
        }
      }
      break;
    }

    // Like the FC (4.6.0 on), cut center + min/max back into the signal
    // range. The tab sees the result on its next MSP_SERVO_CONFIGURATIONS poll.
    case MSPCodes.MSP_SET_SERVO_CONFIGURATION: {
      const index = bytes[0];
      const config = FC.SERVO_CONFIG[index];
      if (config && firmwareLimitsTravel(FC.CONFIG.apiVersion)) {
        clampServoConfig(config, index >= BUS_SERVO_OFFSET);
      }
      break;
    }

    case MSPCodes.MSP_SET_RESET_CURR_PID:
      pidProfiles[currentPidProfile] = defaultPidProfileBank();
      loadPidProfile(currentPidProfile);
      break;

    case MSPCodes.MSP_SET_PID_TUNING:
      FC.PIDS_ACTIVE = clone(FC.PIDS);
      storePidProfile();
      break;

    case MSPCodes.MSP_SET_PID_PROFILE:
    case MSPCodes.MSP_SET_RESCUE_PROFILE:
    case MSPCodes.MSP_SET_GOVERNOR_PROFILE:
      storePidProfile();
      break;

    case MSPCodes.MSP_SET_RC_TUNING:
      storeRateProfile();
      break;

    case MSPCodes.MSP_SET_BATTERY_PROFILE: {
      const index = bytes[0];
      if (index < BATTERY_PROFILE_COUNT) {
        FC.BATTERY_STATE.batteryProfile = index;
        storeBatteryProfile();
      }
      break;
    }

    case MSPCodes.MSP_SET_BATTERY_CONFIG:
      if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)) {
        storeBatteryProfile();
      }
      break;

    case MSPCodes.MSP_ARMING_DISABLE:
      if (bytes[0]) {
        FC.CONFIG.armingDisableFlags |= ARMING_DISABLED_MSP;
      } else {
        FC.CONFIG.armingDisableFlags &= ~ARMING_DISABLED_MSP;
      }
      break;

    case MSPCodes.MSP_DATAFLASH_ERASE:
      FC.DATAFLASH.usedSize = 0;
      break;

    case MSPCodes.MSP_DATAFLASH_READ: {
      const view = new DataView(new Uint8Array(bytes).buffer);
      const address = view.getUint32(0, true);
      const blockSize = view.byteLength >= 6 ? view.getUint16(4, true) : 128;
      return reply(code, dataflashReadReply(address, blockSize));
    }

    case MSPCodes.MSP_RESET_CONF:
      applyVirtualConfig();
      break;

    // Lets the ESC Programming tab be developed/tested without hardware
    case MSPCodes.MSP_ESC_PARAMETERS: {
      const buffer = currentVirtualEscBuffer();
      if (buffer) {
        return reply(code, Uint8Array.from(buffer).buffer);
      }
      break;
    }

    case MSPCodes.MSP_SET_ESC_PARAMETERS:
      if (virtualEscManufacturerId && data) {
        virtualEscBuffers.set(virtualEscManufacturerId, Uint8Array.from(bytes));
      }
      break;
  }

  return reply(code);
}

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
    profile: 0,
    numProfiles: PID_PROFILE_COUNT,
    rateProfile: 0,
    numRateProfiles: CONTROL_RATE_PROFILE_COUNT,
    armingDisableCount: ARMING_DISABLE_FLAGS_COUNT,
  });

  const api12_9 = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9);
  const api12_10 = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_10);

  Object.assign(FC.ADVANCED_CONFIG, {
    gyro_sync_denom: 1,
    pid_process_denom: 2,
  });

  // Status
  Object.assign(FC.FLIGHT_STATS, {
    stats_total_flights: 7,
    stats_total_time_s: 6000,
    stats_min_armed_time_s: 30,
  });

  Object.assign(FC.ARMING_CONFIG, {
    auto_disarm_delay: 5,
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
    rx_pulse_min: 885,
    rx_pulse_max: 2115,
  });

  Object.assign(FC.RC_CONFIG, {
    rc_center: 1500,
    rc_deflection: 510,
    rc_arm_throttle: 0,
    rc_min_throttle: 0,
    rc_max_throttle: 0,
    rc_deadband: 5,
    rc_yaw_deadband: 5,
  });

  Object.assign(FC.RSSI_CONFIG, {
    channel: 0,
    scale: 100,
    invert: 0,
    offset: 0,
  });

  // "AETRC123", indexed by ROLL, PITCH, YAW, COLLECTIVE, THROTTLE, AUX1-3
  FC.RC_MAP = [0, 1, 3, 4, 2, 5, 6, 7];

  Object.assign(FC.TELEMETRY_CONFIG, {
    telemetry_halfduplex: true,
    crsf_telemetry_mode: 1,
    crsf_telemetry_rate: 500,
    crsf_telemetry_ratio: 8,
    telemetry_sensors_list: [4, 5, 6, 7, 8].concat(
      new Array(TELEM_SENSOR_SLOT_COUNT - 5).fill(0),
    ),
  });

  FC.RC = {
    channels: new Array(RC_CHANNEL_COUNT).fill(1500),
    active_channels: RC_CHANNEL_COUNT,
  };

  FC.RX_CHANNELS = new Array(RC_CHANNEL_COUNT).fill(1500);
  FC.RC_COMMAND = new Array(CONTROL_CHANNEL_COUNT).fill(0);

  // Failsafe
  Object.assign(FC.FAILSAFE_CONFIG, {
    failsafe_delay: 15,
    failsafe_off_delay: 10,
    failsafe_throttle: 1000,
    failsafe_switch_mode: 0,
    failsafe_throttle_low_delay: 100,
    failsafe_procedure: 0,
  });

  // src/main/rx/rx.c: pgResetFn_rxFailsafeChannelConfigs()
  FC.RXFAIL_CONFIG = [];
  for (let i = 0; i < RC_CHANNEL_COUNT; i++) {
    FC.RXFAIL_CONFIG[i] = {
      mode: i < CONTROL_CHANNEL_COUNT ? 0 : 1,
      value: i === 4 ? 885 : 1500,
    };
  }

  // Power
  Object.assign(FC.BATTERY_CONFIG, {
    capacity: 10000,
    capacities: [10000, 0, 0, 0, 0, 0],
    cellCount: 0,
    voltageMeterSource: 1,
    currentMeterSource: 1,
    vbatmincellvoltage: 3.3,
    vbatmaxcellvoltage: 4.3,
    vbatfullcellvoltage: 4.1,
    vbatwarningcellvoltage: 3.5,
    lvcPercentage: 100,
    mahWarningPercentage: 35,
    // Per-profile cell count and cell voltages (firmware 2.4+)
    hasProfileCells: api12_10,
    cellCounts: [0, 0, 0, 0, 0, 0],
    vbatmincellvoltages: Array(BATTERY_PROFILE_COUNT).fill(3.3),
    vbatmaxcellvoltages: Array(BATTERY_PROFILE_COUNT).fill(4.3),
    vbatfullcellvoltages: Array(BATTERY_PROFILE_COUNT).fill(4.1),
    vbatwarningcellvoltages: Array(BATTERY_PROFILE_COUNT).fill(3.5),
  });

  Object.assign(FC.SMARTFUEL_CONFIG, {
    mode: 0,
    voltageDropRate: 10,
    chargeDropRate: 50,
    sagGain: 40,
  });

  Object.assign(FC.BATTERY_STATE, {
    cellCount: 10,
    capacity: 10000,
    voltage: 20,
    mAhDrawn: 1000,
    amperage: 3,
    chargeLevel: 80,
    batteryProfile: 0,
  });

  Object.assign(FC.ANALOG, {
    voltage: 20,
    mAhdrawn: 1000,
    rssi: 700,
    amperage: 3,
  });

  // src/main/sensors/voltage.c: voltageSensorToMeterMap[]
  FC.VOLTAGE_METER_CONFIGS = [10, 20, 30, 40].map((id) => ({
    id,
    sensorType: 1, // VOLTAGE_SENSOR_TYPE_ADC
    vbatscale: 110,
    vbatresdivval: 10,
    vbatresdivmultiplier: 1,
  }));

  FC.VOLTAGE_METERS = [
    { id: 10, voltage: 20 },
    { id: 20, voltage: 8.4 },
    { id: 30, voltage: 5 },
    { id: 40, voltage: 0 },
  ];

  // src/main/sensors/current.c: currentSensorToMeterMap[]
  FC.CURRENT_METER_CONFIGS = [
    {
      id: 10,
      sensorType: 1, // CURRENT_SENSOR_TYPE_ADC
      scale: 400,
      offset: 0,
    },
  ];

  FC.CURRENT_METERS = [{ id: 10, amperage: 3, mAhDrawn: 1000 }];

  // Gyro
  FC.FEATURE_CONFIG.features.DYN_NOTCH = true;
  FC.FEATURE_CONFIG.features.RPM_FILTER = true;

  Object.assign(FC.FILTER_CONFIG, {
    gyro_hardware_lpf: 0,
    gyro_lowpass_type: 1,
    gyro_lowpass_hz: 100,
    gyro_lowpass2_type: 1,
    gyro_lowpass2_hz: 0,
    gyro_notch_hz: 0,
    gyro_notch_cutoff: 0,
    gyro_notch2_hz: 0,
    gyro_notch2_cutoff: 0,
    gyro_lowpass_dyn_min_hz: 0,
    gyro_lowpass_dyn_max_hz: 0,

    dyn_notch_count: 6,
    dyn_notch_q: 20,
    dyn_notch_min_hz: 50,
    dyn_notch_max_hz: 200,

    rpm_preset: 2,
    rpm_min_hz: 20,
  });

  FC.RPM_FILTER_CONFIG = Array.from({ length: RPM_FILTER_BANK_COUNT }, () => ({
    rpm_source: 0,
    rpm_ratio: 0,
    rpm_limit: 0,
    notch_q: 0,
  }));

  FC.RPM_FILTER_CONFIG_V2 = Array.from({ length: RPM_FILTER_AXIS_COUNT }, () =>
    Array.from({ length: RPM_FILTER_NOTCH_COUNT }, () => ({
      rpm_source: 0,
      notch_center: 0,
      notch_q: 0,
    })),
  );

  Object.assign(FC.SENSOR_CONFIG, {
    acc_hardware: 1,
    baro_hardware: 1,
    mag_hardware: 1,
    gyro_to_use: 0,
    gyroHighFsr: 0,
    gyroMovementCalibThreshold: 48,
    gyroCalibDuration: 125,
    gyroOffsetYaw: 0,
    gyroCheckOverflow: 1,
  });

  // Motors
  FC.MOTOR_DATA = [1000, 0, 0, 0, 0, 0, 0, 0];
  FC.MOTOR_OVERRIDE = new Array(MAX_SUPPORTED_MOTORS).fill(0);
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
    half_duplex: false,
    update_hz: 200,
    current_offset: 0,
  });

  // src/main/pg/governor.c; API 12.9+ reports the retired fields as zero
  Object.assign(FC.GOVERNOR, {
    gov_mode: 3,
    gov_throttle_type: 0,
    gov_startup_time: 200,
    gov_spoolup_time: 100,
    gov_tracking_time: 50,
    gov_recovery_time: 30,
    gov_spooldown_time: 30,
    gov_throttle_hold_timeout: 50,
    gov_zero_throttle_timeout: 30,
    gov_lost_headspeed_timeout: api12_9 ? 0 : 10,
    gov_autorotation_timeout: 15,
    gov_autorotation_bailout_time: 0,
    gov_autorotation_min_entry_time: api12_9 ? 0 : 50,
    gov_spoolup_min_throttle: api12_9 ? 0 : 5,
    gov_idle_throttle: 0,
    gov_auto_throttle: 0,
    gov_handover_throttle: 25,
    gov_pwr_filter: 5,
    gov_rpm_filter: 10,
    gov_tta_filter: 0,
    gov_ff_filter: 5,
    gov_d_filter: 50,
    gov_bypass_throttle: [0, 25, 50, 75, 100, 125, 150, 175, 200],
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
    supported: true,
    blackboxDevice: 1,
    blackboxMode: 1,
    blackboxDenom: 8,
    blackboxFields: 4714111, // src/main/pg/blackbox.c
    blackboxInitialEraseKiB: 0,
    blackboxRollingErase: 1,
    blackboxGracePeriod: 5,
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
    state: 0,
    filesystemLastError: 0,
    freeSizeKB: 0,
    totalSizeKB: 0,
  });

  Object.assign(FC.DEBUG_CONFIG, {
    debugMode: 0,
    debugAxis: 0,
    debugModeCount: DEBUG_COUNT,
    debugValueCount: DEBUG_VALUE_COUNT,
  });

  FC.SENSOR_DATA.debug = new Array(DEBUG_VALUE_COUNT).fill(0);

  FC.BEEPER_CONFIG.beepers = new Beepers(FC.CONFIG);
  FC.BEEPER_CONFIG.dshotBeaconConditions = new Beepers(FC.CONFIG, [
    "RX_LOST",
    "RX_SET",
  ]);

  // Mixer, src/main/pg/mixer.c
  Object.assign(FC.MIXER_CONFIG, {
    main_rotor_dir: 0,
    tail_rotor_mode: 0,
    tail_motor_idle: 0,
    tail_center_trim: 0,
    swash_type: 2, // SWASH_TYPE_120
    swash_ring: 100,
    swash_phase: 0,
    blade_pitch_limit: 0,
    swash_trim: [0, 0, 0],
    coll_rpm_correction: 0,
    coll_geo_correction: 0,
    coll_tilt_correction_pos: 0,
    coll_tilt_correction_neg: 10,
  });

  FC.MIXER_INPUTS = [];
  for (let i = 0; i < MIXER_INPUT_COUNT; i++) {
    if (i === 0) {
      FC.MIXER_INPUTS.push({ rate: 0, min: 0, max: 0 });
    } else if (i <= 4) {
      FC.MIXER_INPUTS.push({ rate: 250, min: -1250, max: 1250 });
    } else if (i === 5) {
      FC.MIXER_INPUTS.push({ rate: 1000, min: 0, max: 1000 });
    } else {
      FC.MIXER_INPUTS.push({ rate: 1000, min: -1000, max: 1000 });
    }
  }

  FC.MIXER_RULES = Array.from({ length: MIXER_RULE_COUNT }, () => ({
    oper: 0,
    src: 0,
    dst: 0,
    offset: 0,
    weight: 0,
  }));

  FC.MIXER_OVERRIDE = new Array(MIXER_INPUT_COUNT).fill(MIXER_OVERRIDE_OFF);

  // Servos, src/main/pg/servos.c
  FC.SERVO_CONFIG = [];
  for (let i = 0; i < MAX_SUPPORTED_SERVOS; i++) {
    const bus = i >= MAX_SUPPORTED_PWM_SERVOS;
    FC.SERVO_CONFIG.push({
      mid: 1500,
      min: bus ? -500 : -700,
      max: bus ? 500 : 700,
      rneg: 500,
      rpos: 500,
      rate: 333,
      speed: 0,
      flags: 0,
    });
  }

  FC.SERVO_DATA = new Array(MAX_SUPPORTED_SERVOS).fill(1500);
  FC.SERVO_OVERRIDE = new Array(MAX_SUPPORTED_SERVOS).fill(SERVO_OVERRIDE_OFF);

  FC.BUS_SERVO_CONFIG = new Array(BUS_SERVO_CHANNELS).fill(0); // BUS_SERVO_SOURCE_MIXER

  // Modes, src/main/msp/msp.c: unused slots report ARM on channel 0
  FC.MODE_RANGES = Array.from(
    { length: MAX_MODE_ACTIVATION_CONDITION_COUNT },
    () => ({
      id: 0,
      auxChannelIndex: 0,
      range: { start: 1500, end: 1500 },
    }),
  );

  FC.MODE_RANGES_EXTRA = Array.from(
    { length: MAX_MODE_ACTIVATION_CONDITION_COUNT },
    () => ({ id: 0, modeLogic: 0, linkedTo: 0 }),
  );

  FC.ADJUSTMENT_RANGES = Array.from(
    { length: MAX_ADJUSTMENT_RANGE_COUNT },
    () => ({
      adjFunction: 0,
      enaChannel: 0,
      enaRange: { start: 1500, end: 1500 },
      adjChannel: 0,
      adjRange1: { start: 1500, end: 1500 },
      adjRange2: { start: 1500, end: 1500 },
      adjMin: 0,
      adjMax: 0,
      adjStep: 0,
    }),
  );

  // LED strip, src/main/io/ledstrip.c
  FC.LED_STRIP = Array.from({ length: LED_MAX_STRIP_LENGTH }, () => ({
    x: 0,
    y: 0,
    functions: ["c"],
    color: 0,
    directions: [],
    parameters: 0,
    blinkPattern: 0,
    blinkPause: 0,
    altColor: 0,
  }));

  FC.LED_COLORS = [];
  for (let i = 0; i < LED_CONFIGURABLE_COLOR_COUNT; i++) {
    FC.LED_COLORS.push({ ...(LED_DEFAULT_COLORS[i] ?? { h: 0, s: 0, v: 0 }) });
  }

  FC.LED_MODE_COLORS = [];
  for (let mode = 0; mode < LED_MODE_COUNT; mode++) {
    for (let direction = 0; direction < LED_DIRECTION_COUNT; direction++) {
      FC.LED_MODE_COLORS.push({
        mode,
        direction,
        color: LED_DEFAULT_MODE_COLORS[mode][direction],
      });
    }
  }
  for (let i = 0; i < LED_SPECIAL_COLOR_COUNT; i++) {
    FC.LED_MODE_COLORS.push({
      mode: LED_MODE_COUNT,
      direction: i,
      color: LED_DEFAULT_SPECIAL_COLORS[i],
    });
  }
  // LED_AUX_CHANNEL, defaults to THROTTLE
  FC.LED_MODE_COLORS.push({ mode: LED_MODE_COUNT + 1, direction: 0, color: 4 });

  Object.assign(FC.LED_STRIP_CONFIG, {
    ledstrip_beacon_armed_only: 0,
    ledstrip_beacon_color: 1,
    ledstrip_beacon_percent: 50,
    ledstrip_beacon_period_ms: 500,
    ledstrip_blink_period_ms: 100,
    ledstrip_brightness: 100,
    ledstrip_fade_rate: 50,
    ledstrip_flicker_rate: 50,
    ledstrip_grb_rgb: 0,
    ledstrip_profile: 2, // LED_PROFILE_STATUS
    ledstrip_race_color: 3,
    ledstrip_visual_beeper: 0,
    ledstrip_visual_beeper_color: 1,
  });

  updateBoxes();

  // Profiles
  pidProfiles = Array.from(
    { length: PID_PROFILE_COUNT },
    defaultPidProfileBank,
  );
  rateProfiles = Array.from(
    { length: CONTROL_RATE_PROFILE_COUNT },
    defaultRateProfile,
  );
  loadPidProfile(0);
  loadRateProfile(0);
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (CONFIGURATOR.virtualMode) {
      newModule?.applyVirtualConfig();
    }
  });
}

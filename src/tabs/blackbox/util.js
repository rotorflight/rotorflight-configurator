import semver from "semver";

import {
  API_VERSION_12_7,
  API_VERSION_12_9,
} from "@/js/configurator.svelte.js";

export const DEBUG_AXIS = [
  "0 / ROLL",
  "1 / PITCH",
  "2 / YAW",
  "3 / THROTTLE",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
];

export const LOG_RATES = {
  8000: [8, 16, 32, 80, 160, 320, 800],
  4000: [4, 8, 16, 40, 80, 160, 400],
  2000: [2, 4, 8, 20, 40, 80, 200],
  1000: [1, 2, 4, 10, 20, 40, 100],
  3200: [3, 6, 12, 32, 64, 128, 320],
  1600: [2, 4, 8, 16, 32, 64, 160],
  1067: [1, 2, 4, 10, 21, 42, 106],
  800: [1, 2, 4, 8, 16, 32, 80],
  0: [1, 2, 4, 8, 16, 32, 64, 128, 256],
};

export function getDebugModes(apiVersion) {
  return [
    "NONE",
    "CYCLETIME",
    "BATTERY",
    "GYRO_FILTERED",
    "ACCELEROMETER",
    "PIDLOOP",
    "GYRO_SCALED",
    "RC_COMMAND",
    "RC_SETPOINT",
    "ESC_SENSOR",
    "SCHEDULER",
    "STACK",
    "ESC_SENSOR_DATA",
    "ESC_SENSOR_FRAME",
    "ALTITUDE",
    "DYN_NOTCH",
    "DYN_NOTCH_TIME",
    "DYN_NOTCH_FREQ",
    "RX_FRSKY_SPI",
    "RX_SFHSS_SPI",
    "GYRO_RAW",
    "DUAL_GYRO_RAW",
    "DUAL_GYRO_DIFF",
    "MAX7456_SIGNAL",
    "MAX7456_SPICLOCK",
    "SBUS",
    "FPORT",
    "RANGEFINDER",
    "RANGEFINDER_QUALITY",
    "LIDAR_TF",
    "ADC_INTERNAL",
    "GOVERNOR",
    "SDIO",
    "CURRENT_SENSOR",
    "USB",
    "SMARTAUDIO",
    "RTH",
    "ITERM_RELAX",
    "ACRO_TRAINER",
    "SETPOINT",
    "RX_SIGNAL_LOSS",
    "RC_RAW",
    "RC_DATA",
    "DYN_LPF",
    "RX_SPEKTRUM_SPI",
    "DSHOT_RPM_TELEMETRY",
    "RPM_FILTER",
    "RPM_SOURCE",
    "TTA",
    "AIRBORNE",
    "DUAL_GYRO_SCALED",
    "DSHOT_RPM_ERRORS",
    "CRSF_LINK_STATISTICS_UPLINK",
    "CRSF_LINK_STATISTICS_PWR",
    "CRSF_LINK_STATISTICS_DOWN",
    "BARO",
    "GPS_RESCUE_THROTTLE_PID",
    "FREQ_SENSOR",
    "FEEDFORWARD_LIMIT",
    "FEEDFORWARD",
    "BLACKBOX_OUTPUT",
    "GYRO_SAMPLE",
    "RX_TIMING",
    "D_LPF",
    "VTX_TRAMP",
    "GHST",
    "SCHEDULER_DETERMINISM",
    "TIMING_ACCURACY",
    "RX_EXPRESSLRS_SPI",
    "RX_EXPRESSLRS_PHASELOCK",
    "RX_STATE_TIME",
    "PITCH_PRECOMP",
    "YAW_PRECOMP",
    "RESCUE",
    "RESCUE_ALTHOLD",
    "CROSS_COUPLING",
    "ERROR_DECAY",
    "HS_OFFSET",
    "HS_BLEED",
    ...(semver.gte(apiVersion, API_VERSION_12_9) ? ["GOV_MOTOR"] : []),
    "USER1",
    "USER2",
    "USER3",
    "USER4",
  ];
}

export function getLogFields(apiVersion) {
  const fields = [
    "command",
    "setpoint",
    "mixer",
    "pid",
    "attitude",
    "gyroraw",
    "gyro",
    "acc",
    "mag",
    "alt",
    "battery",
    "rssi",
    "gps",
    "rpm",
    "motors",
    "servos",
    "vbec",
    "vbus",
    "temps",
  ];

  if (semver.gte(apiVersion, API_VERSION_12_7)) {
    fields.push("esc", "bec", "esc2");
  }

  if (semver.gte(apiVersion, API_VERSION_12_9)) {
    fields.push("governor");
  }

  return fields;
}

export function formatFilesizeKilobytes(kilobytes) {
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)}kB`;
  }

  const megabytes = kilobytes / 1024;
  if (megabytes < 900) {
    return `${megabytes.toFixed(1)}MB`;
  }

  return `${(megabytes / 1024).toFixed(1)}GB`;
}

export function formatFilesizeBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  return formatFilesizeKilobytes(bytes / 1024);
}

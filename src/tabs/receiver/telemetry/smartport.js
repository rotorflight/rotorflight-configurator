export const SMARTPORT_SENSORS = [
  {
    title: "BATTERY",
    sensors: [
      { name: "BATTERY_VOLTAGE" },
      { name: "BATTERY_CURRENT" },
      { name: "BATTERY_CONSUMPTION" },
      { name: "BATTERY_CHARGE_LEVEL" },
      { name: "BATTERY_CELL_COUNT" },
      { name: "BATTERY_CELL_VOLTAGE" },
      { name: "BATTERY_CELL_VOLTAGES" },
    ],
  },
  {
    title: "VOLTAGE",
    sensors: [
      { name: "ESC_VOLTAGE" },
      { name: "BEC_VOLTAGE" },
      { name: "BUS_VOLTAGE" },
      { name: "MCU_VOLTAGE" },
    ],
  },
  {
    title: "CURRENT",
    sensors: [{ name: "ESC_CURRENT" }, { name: "BEC_CURRENT" }],
  },
  {
    title: "TEMPERATURE",
    sensors: [{ name: "ESC_TEMP" }, { name: "BEC_TEMP" }, { name: "MCU_TEMP" }],
  },
  {
    title: "ESC1",
    sensors: [
      { name: "ESC1_VOLTAGE" },
      { name: "ESC1_CURRENT" },
      { name: "ESC1_CAPACITY" },
      { name: "ESC1_ERPM" },
      { name: "ESC1_POWER" },
      { name: "ESC1_THROTTLE" },
      { name: "ESC1_TEMP1" },
      { name: "ESC1_TEMP2" },
      { name: "ESC1_BEC_VOLTAGE" },
      { name: "ESC1_BEC_CURRENT" },
    ],
  },
  {
    title: "ESC2",
    sensors: [
      { name: "ESC2_VOLTAGE" },
      { name: "ESC2_CURRENT" },
      { name: "ESC2_CAPACITY" },
      { name: "ESC2_ERPM" },
      { name: "ESC2_TEMP1" },
    ],
  },
  {
    title: "RPM",
    sensors: [{ name: "HEADSPEED" }, { name: "TAILSPEED" }],
  },
  {
    title: "BARO",
    sensors: [{ name: "ALTITUDE" }, { name: "VARIOMETER" }],
  },
  {
    title: "GYRO",
    sensors: [
      { name: "HEADING" },
      { name: "ATTITUDE" },
      { name: "ACCEL_X" },
      { name: "ACCEL_Y" },
      { name: "ACCEL_Z" },
    ],
  },
  {
    title: "GPS",
    sensors: [
      { name: "GPS_SATS" },
      { name: "GPS_COORD" },
      { name: "GPS_ALTITUDE" },
      { name: "GPS_HEADING" },
      { name: "GPS_GROUNDSPEED" },
    ],
  },
  {
    title: "STATUS",
    sensors: [
      { name: "MODEL_ID" },
      { name: "FLIGHT_MODE" },
      { name: "ARMING_FLAGS" },
      { name: "ARMING_DISABLE_FLAGS" },
      { name: "RESCUE_STATE" },
      { name: "GOVERNOR_STATE" },
      { name: "ADJFUNC" },
    ],
  },
  {
    title: "PROFILE",
    sensors: [{ name: "PID_PROFILE" }, { name: "RATES_PROFILE" }],
  },
  {
    title: "CONTROL",
    sensors: [
      { name: "PITCH_CONTROL" },
      { name: "ROLL_CONTROL" },
      { name: "YAW_CONTROL" },
      { name: "COLLECTIVE_CONTROL" },
      { name: "THROTTLE_CONTROL" },
    ],
  },
  {
    title: "SYSTEM",
    sensors: [
      { name: "HEARTBEAT" },
      { name: "CPU_LOAD" },
      { name: "SYS_LOAD" },
      { name: "RT_LOAD" },
    ],
  },
  {
    title: "DEBUG",
    sensors: [
      { name: "DEBUG_0" },
      { name: "DEBUG_1" },
      { name: "DEBUG_2" },
      { name: "DEBUG_3" },
      { name: "DEBUG_4" },
      { name: "DEBUG_5" },
      { name: "DEBUG_6" },
      { name: "DEBUG_7" },
    ],
  },
];

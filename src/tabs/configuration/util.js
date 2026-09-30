export const UART_NAMES = {
  0: "UART1",
  1: "UART2",
  2: "UART3",
  3: "UART4",
  4: "UART5",
  5: "UART6",
  6: "UART7",
  7: "UART8",
  8: "UART9",
  9: "UART10",
  20: "USB VCP",
  30: "SOFTSERIAL1",
  31: "SOFTSERIAL2",
};

export const PORT_NAMES_RF2 = {
  F7A1: { 0: "DSM Ⓓ", 1: "S.BUS", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "Port Ⓔ", 5: "Port Ⓑ" },
  F7A2: { 0: "DSM Ⓓ", 1: "S.BUS", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "Port Ⓔ", 5: "Port Ⓖ" },
  F7A3: { 0: "DSM Ⓓ", 1: "S.BUS", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "Int.Rx", 5: "Port Ⓑ" },
  F7A4: { 0: "DSM Ⓓ", 1: "S.BUS", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "Int.Rx", 5: "Port Ⓖ" },
  F7B1: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "DSM Ⓓ", 5: "Port Ⓑ" },
  F7B2: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "DSM Ⓓ", 5: "Port Ⓖ" },
  F7B3: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "Port Ⓔ", 5: "Port Ⓑ" },
  F7B4: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "Port Ⓔ", 5: "Port Ⓖ" },
  F7B5: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "Int.Rx", 5: "Port Ⓑ" },
  F7B6: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "Int.Rx", 5: "Port Ⓖ" },
  F7C1: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "DSM Ⓓ", 5: "Port Ⓑ" },
  F7C2: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "DSM Ⓓ", 5: "Port Ⓖ" },
  F7C3: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "Port Ⓔ", 5: "Port Ⓑ" },
  F7C4: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "Port Ⓔ", 5: "Port Ⓖ" },
  F7C5: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓒ", 3: "Port Ⓐ", 4: "Int.Rx", 5: "Port Ⓑ" },
  F7C6: { 0: "S.BUS", 1: "TELEM", 2: "Port Ⓖ", 3: "Port Ⓐ", 4: "Int.Rx", 5: "Port Ⓖ" },
};

export const PORT_TYPES = {
  DISABLED: 0,
  MSP: 1,
  GPS: 2,
  TELEM: 3,
  MAVLINK: 4,
  BLACKBOX: 5,
  CUSTOM: 6,
  AUTO: 7,
};

export const BAUD_RATE_OPTIONS = {
  [PORT_TYPES.DISABLED]: ["DISABLED"],
  [PORT_TYPES.MSP]: [
    "9600", "19200", "38400", "57600", "115200", "230400", "250000", "460800", "500000", "921600", "1000000",
  ],
  [PORT_TYPES.GPS]: ["AUTO", "9600", "19200", "38400", "57600", "115200", "230400", "460800"],
  [PORT_TYPES.MAVLINK]: ["AUTO", "9600", "19200", "38400", "57600", "115200", "230400", "460800"],
  [PORT_TYPES.TELEM]: ["AUTO"],
  [PORT_TYPES.BLACKBOX]: [
    "AUTO", "19200", "38400", "57600", "115200", "230400", "250000", "460800", "500000", "921600", "1000000",
    "1500000", "2000000", "2470000",
  ],
  [PORT_TYPES.CUSTOM]: ["CUSTOM"],
  [PORT_TYPES.AUTO]: ["AUTO"],
};

export const PORT_FUNCTIONS = [
  { id: 0, excl: 0, name: "DISABLED", type: PORT_TYPES.DISABLED },
  { id: 1, excl: 1, name: "MSP", type: PORT_TYPES.MSP },
  { id: 2, excl: 2, name: "GPS", type: PORT_TYPES.GPS },
  { id: 64, excl: 64, name: "RX_SERIAL", type: PORT_TYPES.AUTO },
  { id: 1024, excl: 1024, name: "ESC_SENSOR", type: PORT_TYPES.AUTO },
  { id: 128, excl: 128, name: "BLACKBOX", type: PORT_TYPES.BLACKBOX },
  { id: 262144, excl: 262144, name: "SBUS_OUT", type: PORT_TYPES.AUTO },
  { id: 524288, excl: 524288, name: "FBUS_OUT", type: PORT_TYPES.AUTO },
  { id: 1048576, excl: 1048576, name: "SPORT_MASTER", type: PORT_TYPES.AUTO },
  { id: 2097152, excl: 2097152, name: "SRXL2_ESC", type: PORT_TYPES.AUTO },
  { id: 4194304, excl: 4194304, name: "CRSF_SENSORS", type: PORT_TYPES.AUTO },
  { id: 4, excl: 4668, name: "TELEMETRY_FRSKY", type: PORT_TYPES.TELEM },
  { id: 32, excl: 4668, name: "TELEMETRY_SMARTPORT", type: PORT_TYPES.TELEM },
  { id: 4096, excl: 4668, name: "TELEMETRY_IBUS", type: PORT_TYPES.TELEM },
  { id: 8, excl: 4668, name: "TELEMETRY_HOTT", type: PORT_TYPES.TELEM },
  { id: 512, excl: 4668, name: "TELEMETRY_MAVLINK", type: PORT_TYPES.MAVLINK },
  { id: 16, excl: 4668, name: "TELEMETRY_LTM", type: PORT_TYPES.TELEM },
];

export const VCP_PORT_IDENTIFIER = 20;

export function getPortFunc(funcId) {
  return PORT_FUNCTIONS.find((f) => f.id == funcId);
}

export function getPortType(funcId) {
  return getPortFunc(funcId)?.type ?? PORT_TYPES.CUSTOM;
}

export function getPortExcl(funcId) {
  return getPortFunc(funcId)?.excl ?? funcId;
}

export function getPortBaudrate(serialPort, portType) {
  switch (portType) {
    case PORT_TYPES.MSP:
      return serialPort.msp_baudrate;
    case PORT_TYPES.GPS:
      return serialPort.gps_baudrate;
    case PORT_TYPES.MAVLINK:
      return serialPort.telemetry_baudrate;
    case PORT_TYPES.BLACKBOX:
      return serialPort.blackbox_baudrate;
    case PORT_TYPES.AUTO:
    case PORT_TYPES.TELEM:
      return "AUTO";
    case PORT_TYPES.CUSTOM:
      return "CUSTOM";
    default:
      return "DISABLED";
  }
}

export function setPortBaudrate(serialPort, portType, value) {
  switch (portType) {
    case PORT_TYPES.MSP:
      serialPort.msp_baudrate = value;
      break;
    case PORT_TYPES.GPS:
      serialPort.gps_baudrate = value;
      break;
    case PORT_TYPES.MAVLINK:
      serialPort.telemetry_baudrate = value;
      break;
    case PORT_TYPES.BLACKBOX:
      serialPort.blackbox_baudrate = value;
      break;
    default:
      break;
  }
}

export const SENSOR_ALIGNMENTS = [
  "CW 0°",
  "CW 90°",
  "CW 180°",
  "CW 270°",
  "CW 0° flip",
  "CW 90° flip",
  "CW 180° flip",
  "CW 270° flip",
  "Custom",
];

export function pidDenomOptions(pidBaseFreq, t) {
  const options = [];
  for (let denom = 1; denom <= 16; denom++) {
    if (pidBaseFreq / denom < 1000) continue;

    const label =
      pidBaseFreq === 0
        ? t("configurationSpeedPidNoGyro", { value: denom })
        : t("configurationKHzUnitLabel", { value: (pidBaseFreq / denom / 1000).toFixed(2) });
    options.push({ value: denom, label });
  }
  return options;
}

export function gyroFrequencyLabel(gyroFrequency, t) {
  return gyroFrequency === 0
    ? t("configurationSpeedGyroNoGyro")
    : t("configurationKHzUnitLabel", { value: (gyroFrequency / 1000).toFixed(2) });
}

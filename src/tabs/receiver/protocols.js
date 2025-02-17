import semver from "semver";
import { API_VERSION_12_7, API_VERSION_12_8 } from "@/js/data_storage.js";
import { FC } from "@/js/fc.svelte";
import { createEnum } from "@/js/utils/common.js";
import { CUSTOM_CRSF_SENSORS, NATIVE_CRSF_SENSORS } from "./telemetry/crsf.js";
import { SMARTPORT_SENSORS } from "./telemetry/smartport.js";
import { GHOST_SENSORS } from "./telemetry/ghost.js";
import { HUB_SENSORS } from "./telemetry/frsky_hub.js";

export const TelemetryType = createEnum(
  "TOGGLE",
  "BITFIELD",
  "ORDERED_LIST",
  "UNORDERED_LIST",
);

function getCrsfTelemetry() {
  if (FC.TELEMETRY_CONFIG.crsf_telemetry_mode) {
    return {
      proto: "crsf",
      type: TelemetryType.ORDERED_LIST,
      sensors: CUSTOM_CRSF_SENSORS,
    };
  }

  if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
    return {
      proto: "crsf",
      type: TelemetryType.UNORDERED_LIST,
      sensors: NATIVE_CRSF_SENSORS,
    };
  }

  return {
    proto: "crsf",
    type: TelemetryType.BITFIELD,
    mask: 0x0010378f,
  };
}

function getSmartportTelemetry() {
  if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
    return {
      proto: "smartport",
      type: TelemetryType.ORDERED_LIST,
      sensors: SMARTPORT_SENSORS,
    };
  }

  if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)) {
    return {
      proto: "smartport",
      type: TelemetryType.BITFIELD,
      mask: 0xffffffff,
    };
  }

  return {
    proto: "smartport",
    type: TelemetryType.BITFIELD,
    mask: 0x007fffff,
  };
}

export const RX_PROTOCOLS = [
  { name: "None", id: 0 },
  {
    name: "PWM",
    id: 0,
    feature: "RX_PARALLEL_PWM",
    hide: true,
  },
  {
    name: "CUSTOM",
    id: 11,
    feature: "RX_SERIAL",
    telemetry: { type: TelemetryType.TOGGLE },
    hide: true,
  },
  {
    name: "TBS CRSF",
    id: 9,
    feature: "RX_SERIAL",
    get telemetry() {
      return getCrsfTelemetry();
    },
  },
  {
    name: "Futaba S.BUS",
    id: 2,
    feature: "RX_SERIAL",
  },
  {
    name: "Futaba S.BUS2",
    id: 15,
    feature: "RX_SERIAL",
    telemetry: { type: TelemetryType.TOGGLE },
    get hide() {
      return semver.lt(FC.CONFIG.apiVersion, API_VERSION_12_7);
    },
  },
  {
    name: "FrSky F.PORT",
    id: 12,
    feature: "RX_SERIAL",
    get telemetry() {
      return getSmartportTelemetry();
    },
  },
  {
    name: "FrSky F.PORT2",
    id: 16,
    feature: "RX_SERIAL",
    get telemetry() {
      return getSmartportTelemetry();
    },
    get hide() {
      return semver.lt(FC.CONFIG.apiVersion, API_VERSION_12_7);
    },
  },
  {
    name: "FrSky FBUS",
    id: 17,
    feature: "RX_SERIAL",
    get telemetry() {
      return getSmartportTelemetry();
    },
    get hide() {
      return semver.lt(FC.CONFIG.apiVersion, API_VERSION_12_7);
    },
  },
  {
    name: "Spektrum DSM/1024",
    id: 0,
    feature: "RX_SERIAL",
  },
  {
    name: "Spektrum DSM/2048",
    id: 1,
    feature: "RX_SERIAL",
  },
  {
    name: "Spektrum DSM/SRXL",
    id: 10,
    feature: "RX_SERIAL",
    telemetry: { type: TelemetryType.TOGGLE },
  },
  {
    name: "Spektrum DSM/SRXL2",
    id: 13,
    feature: "RX_SERIAL",
    telemetry: { type: TelemetryType.TOGGLE },
  },
  {
    name: "ImmersionRC GHOST",
    id: 14,
    feature: "RX_SERIAL",
    get telemetry() {
      if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
        return {
          proto: "ghst",
          type: TelemetryType.UNORDERED_LIST,
          sensors: GHOST_SENSORS,
        };
      }

      return {
        proto: "ghst",
        type: TelemetryType.BITFIELD,
        mask: 0x00003607,
      };
    },
  },
  {
    name: "Graupner SUMD",
    id: 3,
    feature: "RX_SERIAL",
  },
  {
    name: "Graupner SUMH",
    id: 4,
    feature: "RX_SERIAL",
  },
  {
    name: "Flysky IBUS",
    id: 7,
    feature: "RX_SERIAL",
    telemetry: { type: TelemetryType.TOGGLE },
  },
  {
    name: "JR XBUS Mode A",
    id: 18,
    feature: "RX_SERIAL",
    get hide() {
      return semver.lt(FC.CONFIG.apiVersion, API_VERSION_12_8);
    },
  },
  {
    name: "JR XBUS Mode B",
    id: 5,
    feature: "RX_SERIAL",
  },
  {
    name: "JR XBUS/RJ01",
    id: 6,
    feature: "RX_SERIAL",
  },
  {
    name: "Jeti EXBUS",
    id: 8,
    feature: "RX_SERIAL",
    telemetry: { type: TelemetryType.TOGGLE },
  },
  { name: "CPPM", id: 0, feature: "RX_PPM" },
  { name: "MSP", id: 0, feature: "RX_MSP" },

  { name: "SPI/CX10", id: 4, feature: "RX_SPI", hide: true },
  { name: "SPI/CX10A", id: 5, feature: "RX_SPI", hide: true },
  {
    name: "SPI/ELRS",
    id: 19,
    feature: "RX_SPI",
    get telemetry() {
      return getCrsfTelemetry();
    },
    hide: true,
  },
  {
    name: "SPI/FRSKY D",
    id: 8,
    feature: "RX_SPI",
    get telemetry() {
      return getSmartportTelemetry();
    },
    hide: true,
  },
  {
    name: "SPI/FRSKY X",
    id: 9,
    feature: "RX_SPI",
    get telemetry() {
      return getSmartportTelemetry();
    },
    hide: true,
  },
  {
    name: "SPI/FRSKY X LBT",
    id: 15,
    feature: "RX_SPI",
    get telemetry() {
      return getSmartportTelemetry();
    },
    hide: true,
  },
  {
    name: "SPI/FRSKY X V2",
    id: 17,
    feature: "RX_SPI",
    get telemetry() {
      return getSmartportTelemetry();
    },
    hide: true,
  },
  {
    name: "SPI/FRSKY X LBT V2",
    id: 18,
    feature: "RX_SPI",
    get telemetry() {
      return getSmartportTelemetry();
    },
    hide: true,
  },
  { name: "SPI/FLYSKY", id: 10, feature: "RX_SPI", hide: true },
  { name: "SPI/FLYSKY 2A", id: 11, feature: "RX_SPI", hide: true },
  { name: "SPI/H8_3D", id: 6, feature: "RX_SPI", hide: true },
  { name: "SPI/INAV", id: 7, feature: "RX_SPI", hide: true },
  { name: "SPI/KN", id: 12, feature: "RX_SPI", hide: true },
  { name: "SPI/REDPINE", id: 16, feature: "RX_SPI", hide: true },
  { name: "SPI/SFHSS", id: 13, feature: "RX_SPI", hide: true },
  { name: "SPI/SYMA X", id: 2, feature: "RX_SPI", hide: true },
  { name: "SPI/SYMA X5C", id: 3, feature: "RX_SPI", hide: true },
  { name: "SPI/SPEKTRUM", id: 14, feature: "RX_SPI", hide: true },
  { name: "SPI/V202 250k", id: 0, feature: "RX_SPI", hide: true },
  { name: "SPI/V202 1M", id: 1, feature: "RX_SPI", hide: true },
];

export const EXTERNAL_TELEMETRY_PROTOCOLS = [
  {
    name: "FrSky Hub",
    id: 4,
    get telemetry() {
      if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
        return {
          type: TelemetryType.UNORDERED_LIST,
          sensors: HUB_SENSORS,
        };
      }

      return {
        type: TelemetryType.BITFIELD,
        mask: 0x00003e77,
      };
    },
  },
  {
    name: "FrSky S.Port",
    id: 32,
    get telemetry() {
      return { ...getSmartportTelemetry(), external: true };
    },
  },
  {
    name: "FlySky iBUS",
    id: 4096,
    telemetry: { type: TelemetryType.TOGGLE, external: true },
  },
  {
    name: "Graupner HoTT",
    id: 8,
    telemetry: { type: TelemetryType.TOGGLE, external: true },
  },
  {
    name: "MAVLink",
    id: 512,
    telemetry: { type: TelemetryType.TOGGLE, external: true },
  },
  {
    name: "LTM",
    id: 16,
    telemetry: { type: TelemetryType.TOGGLE, external: true },
  },
];

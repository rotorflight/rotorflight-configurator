/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */

// Increment when making incompatible config schema changes
// e.g. changing the type of a field
const CONFIG_VERSION = 1;

function isKeyOf<T extends Record<string, unknown>>(
  obj: T,
  key: any,
): key is keyof T {
  return key in obj;
}

function get(prop: string) {
  try {
    const value = globalThis.localStorage.getItem(prop);
    if (value) {
      return JSON.parse(value);
    }
  } catch {
    //
  }
}

function set(prop: string, value: any) {
  globalThis.localStorage.setItem(prop, JSON.stringify(value));
}

export type Config = {
  configVersion: number | null;
  autoConnect: boolean;
  checkForConfiguratorUnstableVersions: boolean;
  cliAutoComplete: boolean;
  connectionTimeout: number;
  cordovaForceComputerUi: boolean;
  darkTheme: number;
  eraseChip: boolean;
  expertMode: boolean;
  graphsEnabled: boolean[] | null;
  hideUnusedModes: boolean;
  lastTab: string | null;
  lastUsedPort: string | null;
  locale: string;
  logOpen: boolean;
  portOverride: string | null;
  presetsSourcesMetadata: unknown[];
  rememberLastSelectedBoard: boolean;
  rememberLastTab: boolean;
  selectedBoard: string | null;
  sensorSettings: unknown;
  showAdvancedFirmwareOpts: boolean;
  showAllPorts: boolean;
  showLegacyTargets: boolean;
  showPresetsWarningBackup: boolean;
  trackedPresets: unknown[];
  zoomLevel: number;
};

const _config: Config = $state({
  configVersion: null,

  // Default Values
  autoConnect: true,
  checkForConfiguratorUnstableVersions: true,
  cliAutoComplete: true,
  connectionTimeout: 100,
  cordovaForceComputerUi: false,
  darkTheme: 2,
  eraseChip: true,
  expertMode: false,
  graphsEnabled: null,
  hideUnusedModes: false,
  lastTab: null,
  lastUsedPort: null,
  locale: "DEFAULT",
  logOpen: false,
  portOverride: null,
  presetsSourcesMetadata: [],
  rememberLastSelectedBoard: false,
  rememberLastTab: true,
  selectedBoard: null,
  sensorSettings: null,
  showAdvancedFirmwareOpts: false,
  showAllPorts: false,
  showLegacyTargets: false,
  showPresetsWarningBackup: true,
  trackedPresets: [],
  zoomLevel: 100,
});

// get and set values through localstorage, falling back to defaults
const handler: ProxyHandler<Config> = {
  get(obj, prop) {
    if (isKeyOf(obj, prop)) {
      return get(prop) ?? obj[prop];
    }

    throw new Error(`Unknown config property: ${String(prop)}`);
  },
  set(obj, prop, value) {
    if (isKeyOf(obj, prop)) {
      set(prop, value);
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      (obj as any)[prop] = value;
      return true;
    }

    throw new Error(`Unknown config property: ${String(prop)}`);
  },
};

export const config = new Proxy(_config, handler);

/*
 * Reset configuration to defaults when on an unknown version
 */
if (config.configVersion !== CONFIG_VERSION) {
  globalThis.localStorage.clear();
  config.configVersion = CONFIG_VERSION;
}

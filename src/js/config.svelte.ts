/* eslint-disable @typescript-eslint/no-explicit-any */

// Increment when making incompatible config schema changes
// e.g. changing the type of a field
const CONFIG_VERSION = 1;

function isKeyOf<T extends Record<string, unknown>>(
  obj: T,
  key: any,
): key is keyof T {
  return key in obj;
}

// The web builds of every version share one origin, and so one
// localStorage. 2.x saves each setting as { [prop]: value }; read those as the
// bare value so a setting changed there doesn't come back here as an object.
function unwrapLegacy(prop: string, value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapped = value as Record<string, unknown>;
    const keys = Object.keys(wrapped);
    if (keys.length === 1 && keys[0] === prop) {
      return wrapped[prop];
    }
  }
  return value;
}

function isLegacyWrapped(prop: string) {
  try {
    const value = JSON.parse(
      globalThis.localStorage.getItem(prop) ?? "null",
    ) as unknown;
    return unwrapLegacy(prop, value) !== value;
  } catch {
    return false;
  }
}

function get(prop: string) {
  try {
    const value = globalThis.localStorage.getItem(prop);
    if (value) {
      return unwrapLegacy(prop, JSON.parse(value) as unknown);
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
  // Adjustments tab: FUNCTION_GROUPS labels of the collapsed card groups
  adjustmentsCollapsedGroups: string[];
  // Modes tab: MODE_GROUPS keys of the collapsed card groups
  modesCollapsedGroups: string[];
  autoConnect: boolean;
  // Firmware Flasher: "none", "diff" or "dump" (BACKUP_TYPES in cli_backup.js)
  backupBeforeFlashingMode: string;
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
  adjustmentsCollapsedGroups: [],
  modesCollapsedGroups: [],
  autoConnect: true,
  // `dump all` rather than `diff all`: a diff opens with `defaults nosave`,
  // which can leave a spurious CLI error that blocks the restore's `save`.
  backupBeforeFlashingMode: "dump",
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
  if (__BACKEND__ === "web") {
    // Only this version's settings: the other versions deployed to the same
    // origin keep their own settings and caches in this localStorage too.
    // A setting in the 2.x format belongs to 2.x, so leave it (and read it).
    for (const prop of Object.keys(_config)) {
      if (!isLegacyWrapped(prop)) {
        globalThis.localStorage.removeItem(prop);
      }
    }
  } else {
    globalThis.localStorage.clear();
  }
  config.configVersion = CONFIG_VERSION;
}

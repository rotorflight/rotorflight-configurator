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
  config_version: number | null;
  auto_connect: boolean;
  check_for_configurator_unstable_versions: boolean;
  cli_auto_complete: boolean;
  connection_timeout: number;
  cordova_force_computer_ui: boolean;
  dark_theme: number;
  erase_chip: boolean;
  expert_mode: boolean;
  graphs_enabled: boolean[] | null;
  hide_unused_modes: boolean;
  last_tab: string | null;
  last_used_port: string | null;
  log_open: boolean;
  port_override: string | null;
  presets_sources_metadata: unknown[];
  remember_last_selected_board: boolean;
  remember_last_tab: boolean;
  selected_board: string | null;
  /* eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents */
  sensor_settings: unknown | null;
  show_advanced_firmware_opts: boolean;
  show_all_ports: boolean;
  show_legacy_targets: boolean;
  show_presets_warning_backup: boolean;
  tracked_presets: unknown[];
  user_language_select: string;
  zoom_level: number;
};

const _config: Config = $state({
  config_version: null,

  // Default Values
  auto_connect: true,
  check_for_configurator_unstable_versions: true,
  cli_auto_complete: true,
  connection_timeout: 100,
  cordova_force_computer_ui: false,
  dark_theme: 2,
  erase_chip: true,
  expert_mode: false,
  graphs_enabled: null,
  hide_unused_modes: false,
  last_tab: null,
  last_used_port: null,
  log_open: false,
  port_override: null,
  presets_sources_metadata: [],
  remember_last_selected_board: false,
  remember_last_tab: true,
  selected_board: null,
  sensor_settings: null,
  show_advanced_firmware_opts: false,
  show_all_ports: false,
  show_legacy_targets: false,
  show_presets_warning_backup: true,
  tracked_presets: [],
  user_language_select: "DEFAULT",
  zoom_level: 100,
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
if (config.config_version !== CONFIG_VERSION) {
  globalThis.localStorage.clear();
  config.config_version = CONFIG_VERSION;
}

// Each release line (2.2, 2.3, dev) keeps its own settings, so that changing
// one in 2.3 doesn't change 2.2, which may be installed for an older model.
// See release-channel.mjs. When a line starts for the first time, it picks up
// the settings of the line before it, so a pilot doesn't start from scratch:
//
// - web: every line shares one origin and one localStorage, and keeps its
//   settings under "settings:<line>:". Builds from before the lines saved
//   theirs without a prefix; those are the fallback.
// - desktop: every line has its own NW.js profile, which another line can't
//   read. Each one also mirrors its settings to <line>.json in a shared
//   directory, which the next line reads.

type Settings = Record<string, unknown>;

export const SETTINGS_NAMESPACE =
  __BACKEND__ === "web" ? `settings:${__APP_CHANNEL__}:` : "";

const WEB_KEY = /^settings:([^:]+):configVersion$/;

function compareLines(a: string, b: string) {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}

// The newest release line older than this one, or else the newest one at
// all (e.g. for dev), or else dev.
export function pickSourceLine(own: string, lines: string[]) {
  const others = lines.filter((line) => line !== own);
  const releases = others
    .filter((line) => /^\d+\.\d+$/.test(line))
    .sort(compareLines);
  if (/^\d+\.\d+$/.test(own)) {
    const older = releases.filter((line) => compareLines(line, own) < 0);
    if (older.length) return older.at(-1);
  }
  return releases.at(-1) ?? others.find((line) => line === "dev");
}

function readWebLine(line: string, props: string[], configVersion: number) {
  const prefix = `settings:${line}:`;
  const read = (prop: string) => {
    const value = globalThis.localStorage.getItem(prefix + prop);
    return value === null ? undefined : (JSON.parse(value) as unknown);
  };
  if (read("configVersion") !== configVersion) return null;
  return Object.fromEntries(props.map((prop) => [prop, read(prop)]));
}

function listWebLines() {
  const lines = [];
  for (let i = 0; i < globalThis.localStorage.length; i++) {
    const match = WEB_KEY.exec(globalThis.localStorage.key(i) ?? "");
    if (match) lines.push(match[1]);
  }
  return lines;
}

// Settings saved before the lines existed. 2.x wrapped each one as
// { [prop]: value }; those are always good. Anything else only if it was
// saved in this schema.
function readUnprefixedWeb(
  props: string[],
  configVersion: number,
  unwrap: (prop: string, value: unknown) => unknown,
) {
  const read = (prop: string) => {
    const value = globalThis.localStorage.getItem(prop);
    return value === null ? undefined : (JSON.parse(value) as unknown);
  };
  const sameSchema = read("configVersion") === configVersion;
  const settings: Settings = {};
  for (const prop of props) {
    const value = read(prop);
    const unwrapped = unwrap(prop, value);
    if (unwrapped !== value || sameSchema) {
      settings[prop] = unwrapped;
    }
  }
  return settings;
}

// NW.js gives the window Node's require().
function node() {
  const { require } = globalThis as unknown as {
    require: (id: string) => unknown;
  };
  return {
    fs: require("node:fs") as typeof import("node:fs"),
    os: require("node:os") as typeof import("node:os"),
    path: require("node:path") as typeof import("node:path"),
    process: require("node:process") as typeof import("node:process"),
  };
}

function desktopDir() {
  const { os, path, process } = node();
  const base =
    process.platform === "win32"
      ? process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming")
      : process.platform === "darwin"
        ? path.join(os.homedir(), "Library", "Application Support")
        : process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "Rotorflight", "Configurator", "settings");
}

function readDesktopLine(line: string, configVersion: number) {
  const { fs, path } = node();
  const file = path.join(desktopDir(), `${line}.json`);
  // Tolerate a byte order mark from a hand-edited file.
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const settings = JSON.parse(text) as Settings;
  return settings.configVersion === configVersion ? settings : null;
}

function listDesktopLines() {
  const { fs } = node();
  return fs
    .readdirSync(desktopDir())
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length));
}

// The settings to start a new line with, or null.
export function findSettingsToImport(
  props: string[],
  configVersion: number,
  unwrap: (prop: string, value: unknown) => unknown,
): Settings | null {
  try {
    if (__BACKEND__ === "web") {
      const source = pickSourceLine(__APP_CHANNEL__, listWebLines());
      return source
        ? readWebLine(source, props, configVersion)
        : readUnprefixedWeb(props, configVersion, unwrap);
    }
    if (__BACKEND__ === "nwjs") {
      const source = pickSourceLine(__APP_CHANNEL__, listDesktopLines());
      return source ? readDesktopLine(source, configVersion) : null;
    }
  } catch (error) {
    console.warn("Could not import settings from another version", error);
  }
  return null;
}

let mirrorTimer: ReturnType<typeof setTimeout> | undefined;

// Desktop only: keep <line>.json up to date for the lines that come later.
export function mirrorSettings(read: () => Settings) {
  if (__BACKEND__ !== "nwjs") return;
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => {
    try {
      const { fs, path } = node();
      const dir = desktopDir();
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${__APP_CHANNEL__}.json`),
        JSON.stringify(read(), undefined, 2),
      );
    } catch (error) {
      console.warn("Could not save settings for other versions", error);
    }
  }, 1000);
}

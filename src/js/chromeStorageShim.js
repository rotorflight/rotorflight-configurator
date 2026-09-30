// The firmware flasher (FirmwareFlasher.svelte, FirmwareCache.js,
// release_checker.js) persists its caches via the chrome.storage.local
// extension API, which only exists under the nwjs/cordova backends -- a
// plain browser tab (the "web" backend) has no chrome.storage at all, so
// every one of those calls throws as soon as the Firmware Flasher tab
// mounts. Rather than rewrite each call site to a differently-shaped API,
// this installs a localStorage-backed shim matching chrome.storage.local's
// exact get/set/remove signatures, only when the real API isn't present.
function readKey(key) {
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (raw == null) return undefined;
    return JSON.parse(raw)[key];
  } catch {
    return undefined;
  }
}

function writeKey(key, value) {
  globalThis.localStorage.setItem(key, JSON.stringify({ [key]: value }));
}

function resolveKeys(keys) {
  if (typeof keys === "string") return [keys];
  if (Array.isArray(keys)) return keys;
  if (keys && typeof keys === "object") return Object.keys(keys);
  return [];
}

function get(keys, callback) {
  const defaults = keys && typeof keys === "object" && !Array.isArray(keys) ? keys : {};
  const result = {};
  for (const key of resolveKeys(keys)) {
    const value = readKey(key);
    if (value !== undefined) {
      result[key] = value;
    } else if (Object.hasOwn(defaults, key)) {
      result[key] = defaults[key];
    }
  }
  Promise.resolve().then(() => callback(result));
}

function set(items, callback) {
  for (const [key, value] of Object.entries(items)) {
    writeKey(key, value);
  }
  if (callback) Promise.resolve().then(() => callback());
}

function remove(keys, callback) {
  for (const key of resolveKeys(keys)) {
    globalThis.localStorage.removeItem(key);
  }
  if (callback) Promise.resolve().then(() => callback());
}

export function installChromeStorageShimIfMissing() {
  if (globalThis.chrome?.storage?.local) return;

  globalThis.chrome ??= {};
  globalThis.chrome.storage ??= {};
  globalThis.chrome.storage.local = { get, set, remove };
}

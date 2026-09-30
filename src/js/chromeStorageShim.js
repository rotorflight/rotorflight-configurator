// The firmware flasher (FirmwareFlasher.svelte, FirmwareCache.js,
// release_checker.js) persists its caches via the chrome.storage.local
// extension API, which only exists under the nwjs/cordova backends -- a
// plain browser tab (the "web" backend) has no chrome.storage at all, so
// every one of those calls throws as soon as the Firmware Flasher tab
// mounts. Rather than rewrite each call site to a differently-shaped API,
// this installs a localStorage-backed shim matching chrome.storage.local's
// exact get/set/remove signatures, only when the real API isn't present.
//
// Every web build (master, each release, each feature branch) is served from
// one origin, so they all share one localStorage. These are caches, and their
// format can change between versions, so on the web each deployed build keeps
// its own under "build:<base path>:". Settings (config.js) are not stored
// here and stay shared.
const NAMESPACE =
  __BACKEND__ === "web" ? `build:${import.meta.env?.BASE_URL ?? "/"}:` : "";

// Caches written before they were namespaced. Safe to drop to make room.
const UNNAMESPACED_CACHE_KEYS = [
  "configuratorReleaseData",
  "configuratorReleaseLastUpdate",
  "firmwareReleaseData",
  "firmwareReleaseLastUpdate",
  "firmware-cache-journal",
  "selected_build_type",
  "unifiedConfigLast",
  "unifiedSourceCache",
];

function isOtherBuildsCache(storageKey) {
  if (storageKey.startsWith("build:")) {
    return !storageKey.startsWith(NAMESPACE);
  }
  return (
    storageKey.startsWith("cache:") ||
    UNNAMESPACED_CACHE_KEYS.includes(storageKey)
  );
}

// Other builds' caches can always be fetched again, so drop them when this
// build runs out of room.
function evictOtherBuildsCaches() {
  const storage = globalThis.localStorage;
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    keys.push(storage.key(i));
  }
  const evicted = keys.filter((k) => k !== null && isOtherBuildsCache(k));
  evicted.forEach((k) => storage.removeItem(k));
  return evicted.length;
}

function readKey(key) {
  try {
    const raw = globalThis.localStorage.getItem(NAMESPACE + key);
    if (raw == null) return undefined;
    return JSON.parse(raw)[key];
  } catch {
    return undefined;
  }
}

// Returns an error message, or null. Like the real chrome.storage.local,
// the shim reports a failed write through chrome.runtime.lastError rather
// than throwing, so a full cache can't break the caller's own flow.
function writeKey(key, value) {
  const raw = JSON.stringify({ [key]: value });
  try {
    globalThis.localStorage.setItem(NAMESPACE + key, raw);
    return null;
  } catch (e) {
    if (NAMESPACE && evictOtherBuildsCaches() > 0) {
      try {
        globalThis.localStorage.setItem(NAMESPACE + key, raw);
        return null;
      } catch (retryError) {
        return retryError.message;
      }
    }
    return e.message;
  }
}

function callbackWithError(message, callback) {
  if (!callback) {
    console.warn(`chrome.storage.local shim: ${message}`);
    return;
  }
  globalThis.chrome.runtime ??= {};
  try {
    globalThis.chrome.runtime.lastError = { message };
    callback();
  } finally {
    delete globalThis.chrome.runtime.lastError;
  }
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
  let error = null;
  for (const [key, value] of Object.entries(items)) {
    error ??= writeKey(key, value);
  }
  Promise.resolve().then(() => {
    if (error) callbackWithError(error, callback);
    else callback?.();
  });
}

function remove(keys, callback) {
  for (const key of resolveKeys(keys)) {
    globalThis.localStorage.removeItem(NAMESPACE + key);
  }
  if (callback) Promise.resolve().then(() => callback());
}

export function installChromeStorageShimIfMissing() {
  if (globalThis.chrome?.storage?.local) return;

  globalThis.chrome ??= {};
  globalThis.chrome.storage ??= {};
  globalThis.chrome.storage.local = { get, set, remove };
}

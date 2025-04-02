/**
 * @param {string} key
 */
export function get(key) {
  try {
    return JSON.parse(globalThis.localStorage.getItem(key))[key];
  } catch {
    //
  }
}

/**
 * @param {Object<string, any>} obj key value entries to set
 */
export function set(obj) {
  for (const [key, value] of Object.entries(obj)) {
    globalThis.localStorage.setItem(key, JSON.stringify({ [key]: value }));
  }
}

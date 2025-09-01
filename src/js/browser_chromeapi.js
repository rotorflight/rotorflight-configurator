
// Adapted from https://github.com/MrOttimista/browser-storage-polyfill
export const storage = {
    local: {
        set: async function (items, cb) {
            if (
                arguments.length < 1 ||
                arguments.length > 2 ||
                !items ||
                items.constructor !== Object ||
                (cb && typeof cb !== "function")
            ) {
                throw new TypeError(
                  "Error in invocation of storage.set(object items, optional function callback): No matching signature."
                );
            }

            Object.keys(items).forEach((k) => {
                localStorage.setItem(k, items[k] ? JSON.stringify(items[k]) : items[k]);
            });

            cb?.();
        },

        remove: async function (key, cb) {
            let keysToBeDeleted = key;
            if (
                arguments.length > 2 ||
                (keysToBeDeleted &&
                    typeof keysToBeDeleted !== "string" &&
                    !Array.isArray(keysToBeDeleted)) ||
                (cb && typeof cb !== "function")
            ) {
                throw new TypeError(
                    "Error in invocation of storage.remove([string|array] keys, optional function callback): No matching signature."
                );
            }
            if (
                Array.isArray(keysToBeDeleted) &&
                keysToBeDeleted.find((z) => typeof z !== "string")
            ) {
                throw new TypeError(
                    " Error in invocation of storage.remove([string|array] keys, optional function callback): Error at parameter 'keys': Value did not match any choice."
                );
            }

            if (typeof key === "string") {
                localStorage.removeItem(key);
            } else {
                key.forEach((k) => {
                    localStorage.removeItem(k);
                });
            }

            cb?.();
        },
        
        get: async function (items, cb) {
            if (
                items &&
                items.constructor === Array &&
                items.find((z) => typeof z !== "string")
            ) {
                throw new TypeError(
                    "Error in invocation of storage.get(optional [string|array|object] keys, function callback): Error at parameter 'keys': Value did not match any choice"
                );
            }
            if (
                arguments.length > 2 ||
                typeof items === "number" ||
                (items &&
                    !(
                        typeof items !== "string" ||
                        items.constructor !== Object ||
                        items.constructor !== Array
                    )) ||
                (cb !== undefined && typeof cb !== "function")
            ) {
                throw new TypeError(
                  "Error in invocation of storage.get(optional [string|array|object] keys, function callback): No matching signature."
                );
            }

            let result = {};

            // in case of undefined or null, chrome storage return all keys
            let keys;
            if (!items) keys = Object.keys(localStorage);
            if (items?.constructor === Object) keys = Object.keys(items);
            if (items?.constructor === Array) keys = items;
            if (typeof items === "string") keys = [items];

            keys?.forEach((k) => {
                const val = localStorage.getItem(k);
                if (val) result[k] = JSON.parse(val);
            });

            cb?.(result);

            return { ...result };
        },
    }
};

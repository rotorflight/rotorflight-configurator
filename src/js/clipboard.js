/** @type {(text: string) => Promise} */
export let writeText;

/** @type {() => Promise<string>} */
export let readText;

if (__BACKEND__ === "nwjs") {
  writeText = function (text) {
    try {
      globalThis.nw.Clipboard.get().set(text, "text");
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  };

  readText = function () {
    try {
      return Promise.resolve(globalThis.nw.Clipboard.get().get("text"));
    } catch (err) {
      return Promise.reject(err);
    }
  };
}

if (__BACKEND__ === "cordova") {
  writeText = function (text) {
    return new Promise((resolve, reject) => {
      cordova.plugins.clipboard.copy(text, resolve, reject);
    });
  };

  readText = function () {
    return new Promise((resolve, reject) => {
      cordova.plugins.clipboard.paste(resolve, reject);
    });
  };
}

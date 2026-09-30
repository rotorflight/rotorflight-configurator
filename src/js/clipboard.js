/** @type {(text: string) => Promise} */
export let writeText;

/** @type {() => Promise<string>} */
export let readText;

if (__BACKEND__ === "nwjs") {
  writeText = function (text) {
    try {
      nw.Clipboard.get().set(text, "text");
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  };

  readText = function () {
    try {
      return Promise.resolve(nw.Clipboard.get().get("text"));
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

if (__BACKEND__ === "web") {
  // The async Clipboard API. Chromium only allows it on a secure origin
  // (https or localhost), and reading asks the user for permission.
  writeText = function (text) {
    return navigator.clipboard.writeText(text);
  };

  readText = function () {
    return navigator.clipboard.readText();
  };
}

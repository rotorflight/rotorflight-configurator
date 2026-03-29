export function microtime() {
    return new Date().getTime() / 1000;
}

export function millitime() {
    return new Date().getTime();
}

const DEGREE_TO_RADIAN_RATIO = Math.PI / 180;

export function degToRad(degrees) {
    return degrees * DEGREE_TO_RADIAN_RATIO;
}

export function bytesToSize(bytes) {

    let outputBytes;

    if (bytes < 1024) {
        outputBytes = `${bytes} Bytes`;
    } else if (bytes < 1048576) {
        outputBytes = `${(bytes / 1024).toFixed(3)} KB`;
    } else if (bytes < 1073741824) {
        outputBytes = `${(bytes / 1048576).toFixed(3)} MB`;
    } else {
        outputBytes = `${(bytes / 1073741824).toFixed(3)} GB`;
    }

    return outputBytes;
}

/*
 *  checkChromeRuntimeError() has to be called after each chrome API call
 */

export function checkChromeRuntimeError() {
    if (chrome.runtime.lastError) {
        console.error(`Chrome API Error: ${chrome.runtime.lastError.message}.\n Traced ${(new Error).stack}`);
        return true;
    }
    return false;
}

export function getTextWidth(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    context.font = getComputedStyle(document.body).font;

    return Math.ceil(context.measureText(text).width);
}

/**
  * @template {string} T
  * @param {...T} values
  * @returns {{ [K in T]: Symbol }}
  */
export function createEnum(...values) {
  const obj = Object.create(null);
  for (const value of values) {
    obj[value] = Symbol(value);
  }
  return Object.freeze(obj);
}

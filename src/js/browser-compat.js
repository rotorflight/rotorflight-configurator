/**
 * Browser compatibility check for web deployment
 * This module checks for required APIs and notifies user of incompatibilities.
 *
 * Compatibility is transport-based (mirrors Betaflight Configurator's
 * checkCompatibility.js): the app is usable as long as at least one of
 * Web Serial, Web Bluetooth, or WebUSB is available, rather than requiring
 * a specific browser family. Users on an unsupported browser are pointed at
 * the desktop app instead.
 */

const DESKTOP_DOWNLOADS_URL = 'https://github.com/rotorflight/rotorflight-configurator/releases';

export const BrowserCompat = {
  /**
   * Check for WebSerial API support
   */
  hasWebSerial() {
    return 'serial' in navigator;
  },

  /**
   * Check for Web Bluetooth API support
   */
  hasWebBluetooth() {
    return 'bluetooth' in navigator;
  },

  /**
   * Check for WebUSB API support
   */
  hasWebUSB() {
    return 'usb' in navigator;
  },

  /**
   * Check for Web Storage API support
   */
  hasWebStorage() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get browser name
   */
  getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'Microsoft Edge';
    if (ua.includes('Chrome/')) return 'Google Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('Firefox/')) return 'Mozilla Firefox';
    if (ua.includes('OPR/')) return 'Opera';
    if (ua.includes('Brave/')) return 'Brave';
    return 'Unknown Browser';
  },

  /**
   * Check all required features
   * @returns {Object} Object with feature checks and overall compatibility status
   */
  checkAll() {
    const hasWebSerial = this.hasWebSerial();
    const hasWebBluetooth = this.hasWebBluetooth();
    const hasWebUSB = this.hasWebUSB();
    const hasWebStorage = this.hasWebStorage();

    return {
      hasWebSerial,
      hasWebBluetooth,
      hasWebUSB,
      hasWebStorage,
      browserName: this.getBrowserName(),
      // At least one transport is enough to reach a flight controller (e.g.
      // Firefox on Android has none, Chrome on Android has WebUSB and Web Bluetooth).
      isCompatible: (hasWebSerial || hasWebBluetooth || hasWebUSB) && hasWebStorage,
    };
  },

  /**
   * Display compatibility warning in the console
   * @param {Object} compat - Result from checkAll()
   * @returns {boolean} true if compatible, false if not
   */
  displayWarning(compat) {
    if (compat.isCompatible) {
      return true;
    }

    const missing = [];
    if (!compat.hasWebSerial) missing.push('Web Serial');
    if (!compat.hasWebBluetooth) missing.push('Web Bluetooth');
    if (!compat.hasWebUSB) missing.push('WebUSB');

    const message = `
⚠️ Unsupported Browser: ${compat.browserName}

Rotorflight Configurator Web needs at least one of the following APIs to
talk to a flight controller, and your browser has none of them:
${missing.map(f => `  • ${f}`).join('\n')}

Please use a Chromium-based browser (Chrome, Edge, Brave, or Opera), or the
desktop app: ${DESKTOP_DOWNLOADS_URL}
    `.trim();
    console.warn(message);
    return false;
  },

  /**
   * Create and inject a compatibility banner into the DOM
   * @param {Object} compat - Result from checkAll()
   * @param {string} containerId - ID of container to inject banner
   */
  injectBanner(compat, containerId = 'app') {
    if (compat.isCompatible) {
      return; // No need to show banner
    }

    // Fixed to the top of the page rather than inserted into the layout: the
    // app shell is a full-height flex layout that has no room for an extra
    // row, and a missing container must not silently hide the warning.
    const container = document.getElementById(containerId) || document.body;

    const banner = document.createElement('div');
    banner.id = 'browser-compat-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100000;
      background-color: #fff3cd;
      border-bottom: 1px solid #ffc107;
      padding: 10px 44px 10px 16px;
      color: #856404;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    `;

    const missing = [];
    if (!compat.hasWebSerial) missing.push('Web Serial');
    if (!compat.hasWebBluetooth) missing.push('Web Bluetooth');
    if (!compat.hasWebUSB) missing.push('WebUSB');

    banner.innerHTML =
      `⚠️ <strong>Unsupported Browser</strong><br/>` +
      `Your browser (${compat.browserName}) doesn't support ${missing.join(', ')}. ` +
      `Device communication needs at least one of Web Serial, Web Bluetooth, or WebUSB. ` +
      `Please use a Chromium-based browser (Chrome, Edge, Brave, or Opera), or ` +
      `<a href="${DESKTOP_DOWNLOADS_URL}" target="_blank" rel="noopener">download the desktop app</a>.`;

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.style.cssText = `
      position: absolute;
      top: 6px;
      right: 10px;
      border: 0;
      background: none;
      color: inherit;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    `;
    close.addEventListener('click', () => banner.remove());
    banner.appendChild(close);

    container.insertBefore(banner, container.firstChild);
  },
};

/**
 * Initialize browser compatibility check on page load
 */
export function initBrowserCompat(options = {}) {
  const {
    showBanner = true,
    containerId = 'app',
    onIncompatible = null,
  } = options;

  if (typeof window === 'undefined') {
    return null; // SSR environment
  }

  const compat = BrowserCompat.checkAll();

  // Log to console
  BrowserCompat.displayWarning(compat);

  // Show banner in UI
  if (showBanner && !compat.isCompatible) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        BrowserCompat.injectBanner(compat, containerId);
      });
    } else {
      BrowserCompat.injectBanner(compat, containerId);
    }
  }

  // Call callback if incompatible
  if (!compat.isCompatible && typeof onIncompatible === 'function') {
    onIncompatible(compat);
  }

  return compat;
}

import "nouislider/dist/nouislider.css";
import { mount } from "svelte";

import BatteryLegend from "@/components/BatteryLegend.svelte";
import Logo from "@/components/Logo.svelte";
import StatusBar from "@/components/StatusBar.svelte";

import "@/css/app.css";
import "@/css/slider.css";
import "@/css/svelte.scss";
import { installChromeStorageShimIfMissing } from "@/js/chromeStorageShim.js";
import "@/js/injected_methods.js";
import { serial } from "@/js/serial.js";
import "@/js/tabs/index.js";

// FirmwareCache, release_checker and the Firmware Flasher persist through
// chrome.storage.local, which a plain browser tab doesn't have. Install a
// localStorage-backed stand-in before anything can use it.
installChromeStorageShimIfMissing();

mount(BatteryLegend, { target: document.querySelector("#battery-legend") });
mount(StatusBar, { target: document.querySelector("#status-bar") });
mount(Logo, { target: document.querySelector("#logo-desktop") });
mount(Logo, { target: document.querySelector("#logo-mobile") });

if (__BACKEND__ === "web") {
  const { initBrowserCompat } = await import("@/js/browser-compat.js");
  initBrowserCompat({ showBanner: true });

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
    });
  }
}

if (__BACKEND__ === "cordova") {
  (async () => {
    const cordovaStartup = await import("@/js/cordova_startup.js");
    Object.assign(globalThis, {
      ...cordovaStartup,
    });

    globalThis.cordovaApp.initialize();
  })();
}

if (import.meta.hot) {
  import.meta.hot.on("vite:beforeFullReload", (event) => {
    if (
      (event.path?.endsWith(".html") && event.path !== "/index.html") ||
      event.path === "/"
    ) {
      return;
    }

    console.log("vite disconnecting serial");
    serial.disconnect();
  });
}

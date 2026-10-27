import "nouislider/dist/nouislider.css";
import { mount } from "svelte";

import BatteryLegend from "@/components/BatteryLegend.svelte";
import Logo from "@/components/Logo.svelte";
import RemoteSupportOverlay from "@/components/RemoteSupportOverlay.svelte";
import StatusBar from "@/components/StatusBar.svelte";

import "@/css/app.css";
import "@/css/slider.css";
import "@/css/svelte.scss";
import { installChromeStorageShimIfMissing } from "@/js/chromeStorageShim.js";
import "@/js/injected_methods.js";
import { REMOTE_SUPPORT_AVAILABLE } from "@/js/protocols/RemoteSupport.js";
import { remote } from "@/js/protocols/RemoteView.svelte.js";
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

// What a remote support session shows on every tab. The menu entry of the
// Remote Support tab stays lit while a session runs.
if (REMOTE_SUPPORT_AVAILABLE) {
  mount(RemoteSupportOverlay, { target: document.body });
  $effect.root(() => {
    $effect(() => {
      document
        .querySelector("#tabs li.tab_remote_support a")
        ?.classList.toggle("remote-support-active", remote.role !== null);
    });
  });
}

// Names the browser tab (and on desktop the window) after the release line.
document.title ||= __APP_PRODUCT_NAME__;

if (__BACKEND__ === "web") {
  const { initBrowserCompat } = await import("@/js/browser-compat.js");
  initBrowserCompat({ showBanner: true });

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    const register = () =>
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
    // The await above usually lets the page finish loading first, and a load
    // listener added after that never fires.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
    }
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

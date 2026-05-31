import "multiple-select";
import { mount } from "svelte";

import { serial } from "@/js/serial.js";

import "@/js/injected_methods.js";
import "@/js/tabs/index.js";

import "multiple-select/dist/multiple-select.css";
import "nouislider/dist/nouislider.css";
import "@/css/slider.css";
import "@/css/app.css";

import BatteryLegend from "@/components/BatteryLegend.svelte";
import Logo from "@/components/Logo.svelte";
import StatusBar from "@/components/StatusBar.svelte";

mount(BatteryLegend, { target: document.querySelector("#battery-legend") });
mount(StatusBar, { target: document.querySelector("#status-bar") });
mount(Logo, { target: document.querySelector("#logo-desktop") });
mount(Logo, { target: document.querySelector("#logo-mobile") });

if (__BACKEND__ === "cordova") {
  (async () => {
    const chromeapi = await import("@/js/cordova_chromeapi.js");
    const { cordovaApp } = await import("@/js/cordova_startup.js");
    Object.assign(globalThis, {
      ...chromeapi,
    });

    cordovaApp.initialize();
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

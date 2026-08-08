import { mount, unmount } from "svelte";

import { GUI } from "@/js/gui.js";
import FbusSensors from "@/tabs/fbus_sensors/FbusSensors.svelte";

import { TABS } from "./tabs.js";

const tab = {
  tabName: "fbus_sensors",
  svelteComponent: null,

  initialize(callback) {
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(FbusSensors, { target });

    GUI.content_ready(callback);
  },

  cleanup(callback) {
    if (this.svelteComponent) {
      unmount(this.svelteComponent);
      this.svelteComponent = null;
    }
    callback?.();
  },
};

TABS[tab.tabName] = tab;

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && GUI.active_tab === tab.tabName) {
      TABS[tab.tabName].initialize();
    }
  });

  import.meta.hot.dispose(() => {
    tab.cleanup();
  });
}

import { mount, unmount } from "svelte";

import { GUI } from "@/js/gui.js";
import Presets from "@/tabs/presets/Presets.svelte";

import { TABS } from "./tabs.js";

const tab = {
  tabName: "presets",
  svelteComponent: null,

  initialize(callback) {
    if (GUI.active_tab !== "presets") {
      GUI.active_tab = "presets";
    }
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(Presets, { target });

    GUI.content_ready(callback);
  },

  // serial_backend passes serial data here while the presets CLI is active
  read(readInfo) {
    this.svelteComponent?.read(readInfo);
  },

  cleanup(callback) {
    const component = this.svelteComponent;
    this.svelteComponent = null;
    if (!component) {
      callback?.();
      return;
    }
    component.close(() => {
      unmount(component);
      callback?.();
    });
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

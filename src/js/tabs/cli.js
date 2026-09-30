import { mount, unmount } from "svelte";

import { GUI } from "@/js/gui.js";
import Cli from "@/tabs/cli/Cli.svelte";

import { TABS } from "./tabs.js";

const tab = {
  tabName: "cli",
  svelteComponent: null,

  initialize(callback) {
    if (GUI.active_tab !== "cli") {
      GUI.active_tab = "cli";
    }
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(Cli, { target });

    GUI.content_ready(callback);
  },

  // serial_backend passes serial data here while the CLI is active
  read(readInfo) {
    this.svelteComponent?.read(readInfo);
  },

  // asked by GUI.tab_switch_allowed before leaving the tab
  exit(callback) {
    if (this.svelteComponent) {
      this.svelteComponent.exit(callback);
    } else {
      callback?.();
    }
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

import { mount, unmount } from "svelte";

import { GUI } from "@/js/gui.js";
import RemoteSupport from "@/tabs/remote_support/RemoteSupport.svelte";

import { TABS } from "./tabs.js";

// Usable connected or not: it sits in the menu's mode-always list.
const tab = {
  tabName: "remote_support",
  svelteComponent: null,

  initialize(callback) {
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(RemoteSupport, { target });

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

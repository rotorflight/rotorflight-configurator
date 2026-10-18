import { mount, unmount } from "svelte";

import { GUI } from "@/js/gui.js";
import SetupWizard from "@/tabs/setup_wizard/SetupWizard.svelte";

import { TABS } from "./tabs.js";

const tab = {
  tabName: "setup_wizard",
  svelteComponent: null,

  get isDirty() {
    return this.svelteComponent?.isDirty?.();
  },

  initialize(callback) {
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(SetupWizard, { target });

    GUI.content_ready(callback);
  },

  cleanup(callback) {
    if (this.svelteComponent) {
      unmount(this.svelteComponent);
      this.svelteComponent = null;
    }
    callback?.();
  },

  // A failed save or revert (a step's commit throwing, the EEPROM write
  // failing) is logged rather than left as an unhandled rejection; the
  // tab switch still goes on, as on the other tabs.
  save(callback) {
    if (this.svelteComponent?.onSave) {
      this.svelteComponent
        .onSave()
        .catch((err) => console.error("Setup Wizard save failed", err))
        .finally(() => callback?.());
    } else {
      callback?.();
    }
  },

  revert(callback) {
    if (this.svelteComponent?.onRevert) {
      this.svelteComponent
        .onRevert()
        .catch((err) => console.error("Setup Wizard revert failed", err))
        .finally(() => callback?.());
    } else {
      callback?.();
    }
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

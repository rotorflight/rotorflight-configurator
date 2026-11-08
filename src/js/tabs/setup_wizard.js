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

  // The tab switch goes on only when the save went through. A refused save
  // (the FC refuses the EEPROM write while armed, or a step's commit reports
  // a failure) keeps the pilot on the wizard, so the unsaved changes are not
  // lost. The error itself is shown by the wizard; a thrown error is logged
  // rather than left as an unhandled rejection.
  save(callback) {
    if (this.svelteComponent?.onSave) {
      this.svelteComponent.onSave().then(
        (saved) => {
          if (saved) callback?.();
        },
        (err) => console.error("Setup Wizard save failed", err),
      );
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

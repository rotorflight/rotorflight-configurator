import { mount, unmount } from "svelte";

import Motors from "@/tabs/motors/Motors.svelte";
import motorState from "@/tabs/motors/state.svelte.js";

const tab = {
  tabName: "motors",
  svelteComponent: null,

  get isDirty() {
    return this.svelteComponent?.isDirty();
  },

  initialize(callback) {
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(Motors, { target });

    GUI.content_ready(callback);
  },

  cleanup(callback) {
    (async () => {
      try {
        if (motorState.overrideEnabled) {
          motorState.overrideEnabled = false;
          await mspHelper.resetMotorOverrides();
        }
      } finally {
        if (this.svelteComponent) {
          unmount(this.svelteComponent);
          this.svelteComponent = null;
        }
        callback?.();
      }
    })();
  },

  save(callback) {
    if (this.svelteComponent) {
      this.svelteComponent.onSave().finally(callback);
    } else {
      callback?.();
    }
  },

  revert(callback) {
    if (this.svelteComponent) {
      this.svelteComponent.onRevert().finally(callback);
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

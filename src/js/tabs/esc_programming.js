import { mount, unmount } from "svelte";

import { GUI } from "@/js/gui.js";
import EscProgramming from "@/tabs/esc_programming/EscProgramming.svelte";
import escState from "@/tabs/esc_programming/state.svelte.js";

import { TABS } from "./tabs.js";

const tab = {
  tabName: "esc_programming",
  svelteComponent: null,

  get isDirty() {
    return this.svelteComponent?.isDirty();
  },

  initialize(callback) {
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(EscProgramming, { target });

    GUI.content_ready(callback);
  },

  cleanup(callback) {
    (async () => {
      try {
        await escState.leaveTab();
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
      // Only leave the tab after a successful save: on a refused write the edits stay
      // in the form and the error note stays visible, as if the dialog was cancelled.
      this.svelteComponent.onSave().then(
        (saved) => {
          if (saved) callback?.();
        },
        (err) => console.error("ESC programming save failed", err),
      );
    } else {
      callback?.();
    }
  },

  revert(callback) {
    this.svelteComponent?.onRevert();
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

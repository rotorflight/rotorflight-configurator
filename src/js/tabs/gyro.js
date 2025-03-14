import { mount, unmount } from "svelte";

import Gyro from "@/tabs/gyro/Gyro.svelte";

const tab = {
  tabName: "gyro",
  svelteComponent: null,

  get isDirty() {
    return this.svelteComponent?.isDirty();
  },

  initialize(callback) {
    const target = document.querySelector("#content");
    target.innerHTML = "";
    this.svelteComponent = mount(Gyro, { target });

    GUI.content_ready(callback);
  },

  cleanup(callback) {
    if (this.svelteComponent) {
      unmount(this.svelteComponent);
      this.svelteComponent = null;
    }

    callback?.();
  },

  save(callback) {
    if (this.svelteComponent) {
      this.svelteComponent.onSave().finally(callback);
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

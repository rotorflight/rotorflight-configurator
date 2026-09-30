// Entry point of the virtual (MSP) receiver window opened from the
// Receiver tab.
import { mount } from "svelte";

import "@/css/app.css";
import "@/css/svelte.scss";
import ReceiverMsp from "@/tabs/receiver_msp/ReceiverMsp.svelte";
import { popup } from "@/tabs/receiver_msp/popup.svelte.js";
import { windowWatcherUtil } from "@/js/utils/window_watchers.js";

windowWatcherUtil.bindWatchers(window, {
  darkTheme: (dark) =>
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    ),
  translate: (fn) => (popup.translate = fn),
});

// Web build: this is a plain popup, so pick up what the Receiver tab left for
// it on its own window (see showVirtualTx() in Receiver.svelte).
const bridge = __BACKEND__ === "web" ? window.opener?.receiverMspBridge : null;
if (bridge) {
  window.setRawRx = bridge.setRawRx;
  windowWatcherUtil.passValue(window, "translate", bridge.translate);
  if (bridge.darkTheme !== undefined) {
    windowWatcherUtil.passValue(window, "darkTheme", bridge.darkTheme);
  }
}

mount(ReceiverMsp, { target: document.getElementById("app") });

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

mount(ReceiverMsp, { target: document.getElementById("app") });

// Entry point of the GPS map page, loaded in a webview by the GPS tab.
import { mount } from "svelte";

import MapView from "@/tabs/map/MapView.svelte";

mount(MapView, { target: document.getElementById("app") });

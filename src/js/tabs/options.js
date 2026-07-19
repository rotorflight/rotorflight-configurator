import { config } from "@/js/config.svelte.ts";
import { GUI } from "@/js/gui.js";
import { i18n } from "@/js/localization.js";
import { checkForConfiguratorUpdates, setDarkTheme } from "@/js/main.js";

import { TABS } from "./tabs.js";

const tab = {
  tabName: "options",

  initialize(callback) {
    $("#content").load("/src/tabs/options.html", () => {
      i18n.localizePage();

      this.initRememberLastTab();
      this.initCheckForConfiguratorUnstableVersions();
      this.initAutoConnectConnectionTimeout();
      this.initCordovaForceComputerUI();
      this.initDarkTheme();
      this.rememberLastSelectedBoard();
      this.showAdvancedFirmwareOpts();

      GUI.content_ready(callback);
    });
  },

  cleanup(callback) {
    callback?.();
  },

  initRememberLastTab() {
    $("#opt-remember-last-tab")
      .prop("checked", config.rememberLastTab)
      .on("change", function () {
        config.rememberLastTab = $(this).is(":checked");
      });
  },

  rememberLastSelectedBoard() {
    $("#opt-remember-last-board")
      .prop("checked", config.rememberLastSelectedBoard)
      .on("change", function () {
        config.rememberLastSelectedBoard = $(this).is(":checked");
      });
  },

  showAdvancedFirmwareOpts() {
    $("#opt-show-advanced-firmware-opts")
      .prop("checked", config.showAdvancedFirmwareOpts)
      .on("change", function () {
        config.showAdvancedFirmwareOpts = $(this).is(":checked");
      });
  },

  initCheckForConfiguratorUnstableVersions() {
    $("#opt-check-unstable-versions")
      .prop("checked", config.checkForConfiguratorUnstableVersions)
      .on("change", function () {
        config.checkForConfiguratorUnstableVersions = $(this).is(":checked");
        checkForConfiguratorUpdates();
      });
  },

  initAutoConnectConnectionTimeout() {
    $("#opt-connection-timeout")
      .val(config.connectionTimeout)
      .on("change", function () {
        config.connectionTimeout = parseInt($(this).val());
      });
  },

  initCordovaForceComputerUI() {
    $("#opt-cordova-force-computer-ui")
      .prop("checked", config.cordovaForceComputerUi)
      .on("change", function () {
        const checked = $(this).is(":checked");
        config.cordovaForceComputerUi = checked;
        globalThis.cordovaUI?.set?.();
      })
      .closest(".field")
      .toggle(GUI.isCordova() && globalThis.cordovaUI.canChangeUI);
  },

  initDarkTheme() {
    $("#opt-dark-theme")
      .val(config.darkTheme)
      .on("change", function () {
        const value = parseInt($(this).val());
        config.darkTheme = value;
        setDarkTheme(value);
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

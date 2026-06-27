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
      .prop("checked", config.remember_last_tab)
      .on("change", function () {
        config.remember_last_tab = $(this).is(":checked");
      });
  },

  rememberLastSelectedBoard() {
    $("#opt-remember-last-board")
      .prop("checked", config.remember_last_selected_board)
      .on("change", function () {
        config.remember_last_selected_board = $(this).is(":checked");
      });
  },

  showAdvancedFirmwareOpts() {
    $("#opt-show-advanced-firmware-opts")
      .prop("checked", config.show_advanced_firmware_opts)
      .on("change", function () {
        config.show_advanced_firmware_opts = $(this).is(":checked");
      });
  },

  initCheckForConfiguratorUnstableVersions() {
    $("#opt-check-unstable-versions")
      .prop("checked", config.check_for_configurator_unstable_versions)
      .on("change", function () {
        config.check_for_configurator_unstable_versions =
          $(this).is(":checked");
        checkForConfiguratorUpdates();
      });
  },

  initAutoConnectConnectionTimeout() {
    $("#opt-connection-timeout")
      .val(config.connection_timeout)
      .on("change", function () {
        config.connection_timeout = parseInt($(this).val());
      });
  },

  initCordovaForceComputerUI() {
    $("#opt-cordova-force-computer-ui")
      .prop("checked", config.cordova_force_computer_ui)
      .on("change", function () {
        const checked = $(this).is(":checked");
        config.cordova_force_computer_ui = checked;
        globalThis.cordovaUI?.set?.();
      })
      .closest(".field")
      .toggle(GUI.isCordova() && globalThis.cordovaUI.canChangeUI);
  },

  initDarkTheme() {
    $("#opt-dark-theme")
      .val(config.dark_theme)
      .on("change", function () {
        const value = parseInt($(this).val());
        config.dark_theme = value;
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

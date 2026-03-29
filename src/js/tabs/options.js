import * as config from "@/js/config.js";
import { DarkTheme } from "@/js/DarkTheme.js";
import { i18n } from "@/js/localization.js";
import { setDarkTheme } from "@/js/main.js";

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
      .prop("checked", config.get("rememberLastTab") ?? true)
      .on("change", function () {
        config.set({ rememberLastTab: $(this).is(":checked") });
      })
      .trigger("change");
  },

  rememberLastSelectedBoard() {
    $("#opt-remember-last-board")
      .prop("checked", config.get("rememberLastSelectedBoard") ?? false)
      .on("change", function () {
        config.set({ rememberLastSelectedBoard: $(this).is(":checked") });
      });
  },

  showAdvancedFirmwareOpts() {
    $("#opt-show-advanced-firmware-opts")
      .prop("checked", config.get("showAdvancedFirmwareOpts") ?? false)
      .on("change", function () {
        config.set({ showAdvancedFirmwareOpts: $(this).is(":checked") });
      });
  },

  initCheckForConfiguratorUnstableVersions() {
    $("#opt-check-unstable-versions")
      .prop(
        "checked",
        config.get("checkForConfiguratorUnstableVersions") ?? true,
      )
      .on("change", function () {
        config.set({
          checkForConfiguratorUnstableVersions: $(this).is(":checked"),
        });
        checkForConfiguratorUpdates();
      });
  },

  initAutoConnectConnectionTimeout() {
    $("#opt-connection-timeout")
      .val(config.get("connectionTimeout") ?? 100)
      .on("change", function () {
        config.set({ connectionTimeout: parseInt($(this).val()) });
      });
  },

  initCordovaForceComputerUI() {
    $("#opt-cordova-force-computer-ui")
      .prop("checked", config.get("cordovaForceComputerUI") ?? false)
      .on("change", function () {
        const checked = $(this).is(":checked");
        config.set({ cordovaForceComputerUI: checked });
        cordovaUI?.set?.();
      })
      .closest(".field")
      .toggle(GUI.isCordova() && cordovaUI.canChangeUI);
  },

  initDarkTheme() {
    $("#opt-dark-theme")
      .val(DarkTheme.configEnabled)
      .on("change", function () {
        const value = parseInt($(this).val());

        config.set({ darkTheme: value });
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

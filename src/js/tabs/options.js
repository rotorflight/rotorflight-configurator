import * as config from "@/js/config.js";

const tab = {
    tabName: 'options',
};
tab.initialize = function (callback) {
    $('#content').load("/src/tabs/options.html", function () {
        i18n.localizePage();

        //tab.initPermanentExpertMode();
        tab.initRememberLastTab();
        tab.initCheckForConfiguratorUnstableVersions();
        tab.initCliAutoComplete();
        tab.initAutoConnectConnectionTimeout();
        tab.initCordovaForceComputerUI();
        tab.initDarkTheme();

        GUI.content_ready(callback);
    });
};

tab.cleanup = function (callback) {
    callback?.();
};

/**
tab.initPermanentExpertMode = function () {
    ConfigStorage.get('permanentExpertMode', function (result) {
        if (result.permanentExpertMode) {
            $('div.permanentExpertMode input').prop('checked', true);
        }

        $('div.permanentExpertMode input').change(function () {
            const checked = $(this).is(':checked');

            config.set({'permanentExpertMode': checked});

            $('input[name="expertModeCheckbox"]').prop('checked', checked).change();
        }).change();
    });
};
**/

tab.initRememberLastTab = function () {
    $('div.rememberLastTab input')
        .prop('checked', !!config.get('rememberLastTab'))
        .change(function() { config.set({rememberLastTab: $(this).is(':checked')}); })
        .change();
};

tab.rememberLastSelectedBoard = function () {
    $('div.rememberLastSelectedBoard input')
        .prop('checked', !!config.get('rememberLastSelectedBoard'))
        .change(function() { config.set({rememberLastSelectedBoard: $(this).is(':checked')}); })
        .change();
};

tab.initCheckForConfiguratorUnstableVersions = function () {
    if (config.get('checkForConfiguratorUnstableVersions')) {
        $('div.checkForConfiguratorUnstableVersions input').prop('checked', true);
    }

    $('div.checkForConfiguratorUnstableVersions input').change(function () {
        const checked = $(this).is(':checked');

        config.set({'checkForConfiguratorUnstableVersions': checked});

        checkForConfiguratorUpdates();
    });
};

tab.initCliAutoComplete = function () {
    $('div.cliAutoComplete input')
        .prop('checked', CliAutoComplete.configEnabled)
        .change(function () {
            const checked = $(this).is(':checked');

            config.set({'cliAutoComplete': checked});
            CliAutoComplete.setEnabled(checked);
        }).change();
};

tab.initAutoConnectConnectionTimeout = function () {
    const connectionTimeout = config.get('connectionTimeout');
    if (connectionTimeout) {
        $('#connectionTimeoutSelect').val(connectionTimeout);
    }

    $('#connectionTimeoutSelect').on('change', function () {
        const value = parseInt($(this).val());
        config.set({'connectionTimeout': value});
    });
};

tab.initCordovaForceComputerUI = function () {
    if (GUI.isCordova() && cordovaUI.canChangeUI) {
        if (config.get('cordovaForceComputerUI')) {
            $('div.cordovaForceComputerUI input').prop('checked', true);
        }

        $('div.cordovaForceComputerUI input').change(function () {
            const checked = $(this).is(':checked');

            config.set({'cordovaForceComputerUI': checked});

            if (typeof cordovaUI.set === 'function') {
                cordovaUI.set();
            }
        });
    } else {
        $('div.cordovaForceComputerUI').hide();
    }
};

tab.initDarkTheme = function () {
    $('#darkThemeSelect')
        .val(DarkTheme.configEnabled)
        .change(function () {
            const value = parseInt($(this).val());

            config.set({'darkTheme': value});
            setDarkTheme(value);
        }).change();
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

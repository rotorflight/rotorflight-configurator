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

            ConfigStorage.set({'permanentExpertMode': checked});

            $('input[name="expertModeCheckbox"]').prop('checked', checked).change();
        }).change();
    });
};
**/

tab.initRememberLastTab = function () {
    ConfigStorage.get('rememberLastTab', function (result) {
        $('div.rememberLastTab input')
            .prop('checked', !!result.rememberLastTab)
            .change(function() { ConfigStorage.set({rememberLastTab: $(this).is(':checked')}); })
            .change();
    });
};

tab.rememberLastSelectedBoard = function () {
    ConfigStorage.get('rememberLastSelectedBoard', function (result) {
        $('div.rememberLastSelectedBoard input')
            .prop('checked', !!result.rememberLastSelectedBoard)
            .change(function() { ConfigStorage.set({rememberLastSelectedBoard: $(this).is(':checked')}); })
            .change();
    });
};

tab.initCheckForConfiguratorUnstableVersions = function () {
    ConfigStorage.get('checkForConfiguratorUnstableVersions', function (result) {
        if (result.checkForConfiguratorUnstableVersions) {
            $('div.checkForConfiguratorUnstableVersions input').prop('checked', true);
        }

        $('div.checkForConfiguratorUnstableVersions input').change(function () {
            const checked = $(this).is(':checked');

            ConfigStorage.set({'checkForConfiguratorUnstableVersions': checked});

            checkForConfiguratorUpdates();
        });
    });
};

tab.initCliAutoComplete = function () {
    $('div.cliAutoComplete input')
        .prop('checked', CliAutoComplete.configEnabled)
        .change(function () {
            const checked = $(this).is(':checked');

            ConfigStorage.set({'cliAutoComplete': checked});
            CliAutoComplete.setEnabled(checked);
        }).change();
};

tab.initAutoConnectConnectionTimeout = function () {
    ConfigStorage.get('connectionTimeout', function (result) {
        if (result.connectionTimeout) {
            $('#connectionTimeoutSelect').val(result.connectionTimeout);
        }
        $('#connectionTimeoutSelect').on('change', function () {
            const value = parseInt($(this).val());
            ConfigStorage.set({'connectionTimeout': value});
        });
    });
};

tab.initCordovaForceComputerUI = function () {
    if (GUI.isCordova() && cordovaUI.canChangeUI) {
        ConfigStorage.get('cordovaForceComputerUI', function (result) {
            if (result.cordovaForceComputerUI) {
                $('div.cordovaForceComputerUI input').prop('checked', true);
            }

            $('div.cordovaForceComputerUI input').change(function () {
                const checked = $(this).is(':checked');

                ConfigStorage.set({'cordovaForceComputerUI': checked});

                if (typeof cordovaUI.set === 'function') {
                    cordovaUI.set();
                }
            });
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

            ConfigStorage.set({'darkTheme': value});
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

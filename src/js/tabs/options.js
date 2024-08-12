TABS.options = {};
TABS.options.initialize = function (callback) {
    $('#content').load("/src/tabs/options.html", function () {
        i18n.localizePage();

        //TABS.options.initPermanentExpertMode();
        TABS.options.initRememberLastTab();
        TABS.options.initCheckForConfiguratorUnstableVersions();
        TABS.options.initCliAutoComplete();
        TABS.options.initAutoConnectConnectionTimeout();
        TABS.options.initCordovaForceComputerUI();
        TABS.options.initDarkTheme();

        GUI.content_ready(callback);
    });
};

TABS.options.cleanup = function (callback) {
    callback?.();
};

/**
TABS.options.initPermanentExpertMode = function () {
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

TABS.options.initRememberLastTab = function () {
    ConfigStorage.get('rememberLastTab', function (result) {
        $('div.rememberLastTab input')
            .prop('checked', !!result.rememberLastTab)
            .change(function() { ConfigStorage.set({rememberLastTab: $(this).is(':checked')}); })
            .change();
    });
};

TABS.options.rememberLastSelectedBoard = function () {
    ConfigStorage.get('rememberLastSelectedBoard', function (result) {
        $('div.rememberLastSelectedBoard input')
            .prop('checked', !!result.rememberLastSelectedBoard)
            .change(function() { ConfigStorage.set({rememberLastSelectedBoard: $(this).is(':checked')}); })
            .change();
    });
};

TABS.options.initCheckForConfiguratorUnstableVersions = function () {
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

TABS.options.initCliAutoComplete = function () {
    $('div.cliAutoComplete input')
        .prop('checked', CliAutoComplete.configEnabled)
        .change(function () {
            const checked = $(this).is(':checked');

            ConfigStorage.set({'cliAutoComplete': checked});
            CliAutoComplete.setEnabled(checked);
        }).change();
};

TABS.options.initAutoConnectConnectionTimeout = function () {
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

TABS.options.initCordovaForceComputerUI = function () {
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

TABS.options.initDarkTheme = function () {
    $('#darkThemeSelect')
        .val(DarkTheme.configEnabled)
        .change(function () {
            const value = parseInt($(this).val());

            ConfigStorage.set({'darkTheme': value});
            setDarkTheme(value);
        }).change();
};

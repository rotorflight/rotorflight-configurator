'use strict';

const css_dark = [
    './css/dark-theme.css',
];

const DarkTheme = {
    configEnabled: undefined,
};

DarkTheme.isDarkThemeEnabled = function (callback) {
    if (this.configEnabled === 0) {
        callback(true);
    } else if (this.configEnabled === 2) {
        if (GUI.isCordova()) {
            cordova.plugins.ThemeDetection.isDarkModeEnabled(function(success) {
                callback(success.value);
            }, function(error) {
                console.log(`cordova-plugin-theme-detection: ${error}`);
                callback(false);
            });
        } else {
            const isEnabled = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            callback(isEnabled);
        }
    } else {
        callback(false);
    }
};

DarkTheme.apply = function() {
    const self = this;
    this.isDarkThemeEnabled(async function(isEnabled) {
        if (isEnabled) {
            self.applyDark();
        } else {
            self.applyNormal();
        }

        if (nw) {
            const windows = await new Promise(resolve => nw.Window.getAll(resolve));
            for (const win of windows) {
                windowWatcherUtil.passValue(win.window, 'darkTheme', isEnabled);
            }
        }
    });
};

DarkTheme.autoSet = function() {
    if (this.configEnabled === 2) {
        this.apply();
    }
};

DarkTheme.setConfig = function (result) {
    if (this.configEnabled !== result) {
        this.configEnabled = result;
        this.apply();
    }
};

DarkTheme.applyDark = function () {
    css_dark.forEach((el) => $('link[href="' + el + '"]').prop('disabled', false));
};

DarkTheme.applyNormal = function () {
    css_dark.forEach((el) => $('link[href="' + el + '"]').prop('disabled', true));
};

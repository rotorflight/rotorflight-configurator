'use strict';

TABS.changelog = {};

TABS.changelog.initialize = function (callback) {
    const tabFile = `./tabs/changelog.html`;

    $('#content').html('<div id="tab-static"><div id="tab-static-contents"></div>');

    $('#tab-static-contents').load(tabFile, function () {
        i18n.localizePage();
        GUI.content_ready(callback);
    });

};

TABS.changelog.cleanup = function (callback) {
    callback?.();
};



TABS.privacy_policy = {};

TABS.privacy_policy.initialize = function (callback) {
    const tabFile = `./tabs/privacy_policy.html`;

    $('#content').html('<div id="tab-static"><div id="tab-static-contents"></div>');

    $('#tab-static-contents').load(tabFile, function () {
        i18n.localizePage();
        GUI.content_ready(callback);
    });

};

TABS.privacy_policy.cleanup = function (callback) {
    callback?.();
};

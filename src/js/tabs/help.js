TABS.help = {};
TABS.help.initialize = function (callback) {
    $('#content').load("/src/tabs/help.html", function () {
        i18n.localizePage();
        GUI.content_ready(callback);
    });
};

TABS.help.cleanup = function (callback) {
    callback?.();
};

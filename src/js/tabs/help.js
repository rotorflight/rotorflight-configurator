const tab = {
    tabName: 'help',
};
tab.initialize = function (callback) {
    $('#content').load("/src/tabs/help.html", function () {
        i18n.localizePage();
        GUI.content_ready(callback);
    });
};

tab.cleanup = function (callback) {
    callback?.();
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

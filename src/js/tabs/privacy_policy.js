const tab = {
    tabName: 'privacy_policy',
};

tab.initialize = function (callback) {
    const tabFile = `/src/tabs/privacy_policy.html`;

    $('#content').html('<div id="tab-static"><div id="tab-static-contents"></div>');

    $('#tab-static-contents').load(tabFile, function () {
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

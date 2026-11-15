import { GUI } from "@/js/gui.js";
import { i18n } from "@/js/localization.js";

export const ReleaseChecker = function (releaseName, releaseUrl) {
    var self = this;

    self._releaseName = releaseName;
    self._releaseDataTag = `${self._releaseName}ReleaseData`;
    self._releaseLastUpdateTag = `${self._releaseName}ReleaseLastUpdate`;
    self._releaseUrl = releaseUrl;
};

// `force` skips the hourly cache (the flasher's refresh button).
ReleaseChecker.prototype.loadReleaseData = function (processFunction, force) {
    const self = this;
    chrome.storage.local.get([self._releaseLastUpdateTag, self._releaseDataTag], function (result) {
        const releaseDataTimestamp = $.now();
        const cacheReleaseData = result[self._releaseDataTag];
        const cachedReleaseLastUpdate = result[self._releaseLastUpdateTag];
        // An empty array is truthy, so treat a cached-but-empty release list the same as no cache at all.
        const hasCachedData = Array.isArray(cacheReleaseData) ? cacheReleaseData.length > 0 : !!cacheReleaseData;
        if (force || !hasCachedData || !cachedReleaseLastUpdate || releaseDataTimestamp - cachedReleaseLastUpdate > 3600 * 1000) {
            $.get(self._releaseUrl, function (releaseData) {
                GUI.log(i18n.getMessage('releaseCheckLoaded',[self._releaseName]));

                // The full API response is large (uploader/author objects,
                // asset metadata) and is cached in localStorage on the web.
                // Keep only what the flasher and update check read.
                if (Array.isArray(releaseData)) {
                    releaseData = releaseData.map((release) => ({
                        tag_name: release.tag_name,
                        name: release.name,
                        prerelease: release.prerelease,
                        html_url: release.html_url,
                        published_at: release.published_at,
                        body: release.body,
                        assets: (release.assets ?? []).map((asset) => ({
                            name: asset.name,
                            browser_download_url: asset.browser_download_url,
                        })),
                    }));
                }

                const data = {};
                data[self._releaseDataTag] = releaseData;
                data[self._releaseLastUpdateTag] = releaseDataTimestamp;
                chrome.storage.local.set(data, function () {});

                self._processReleaseData(releaseData, processFunction);
            }).fail(function (data) {
                let message = '';
                if (data['responseJSON']) {
                    message = data['responseJSON'].message;
                }
                GUI.log(i18n.getMessage('releaseCheckFailed',[self._releaseName,message]));

                self._processReleaseData(cacheReleaseData, processFunction);
            });
        } else {
            if (cacheReleaseData) {
                GUI.log(i18n.getMessage('releaseCheckCached',[self._releaseName]));
            }

            self._processReleaseData(cacheReleaseData, processFunction);
        }
    });
};


ReleaseChecker.prototype._processReleaseData = function (releaseData, processFunction) {
    if (releaseData) {
        processFunction(releaseData);
    } else {
        GUI.log(i18n.getMessage('releaseCheckNoInfo',[self._releaseName]));

        processFunction();
    }
};

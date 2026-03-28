import * as marked from 'marked';
import semver from "semver";

import * as config from '@/js/config.js';
import { readTextFile, writeTextFile } from '@/js/filesystem.js';
import * as github from '@/js/GitHubApi.js';
import { ReleaseChecker } from '@/js/release_checker.js';
import { manufacturers } from "@/js/manufacturers.js";

async function getCachedUnifiedTargets() {
  const { unifiedSourceCache } = await new Promise((resolve) => chrome.storage.local.get("unifiedSourceCache", resolve));

  if (!unifiedSourceCache?.supportedTargets && !unifiedSourceCache?.legacyTargets) {
    // ignore old data format
    return;
  }

  return unifiedSourceCache;
}

const tab = {
    tabName: 'firmware_flasher',
    releases: null,
    releaseChecker: new ReleaseChecker('firmware', 'https://api.github.com/repos/rotorflight/rotorflight-firmware/releases'),
    localFirmwareLoaded: false,
    selectedBoard: undefined,
    intel_hex: undefined, // standard intel hex in string format
    parsed_hex: undefined, // parsed raw hex in array format
    unifiedTarget: {}, // the Unified Target configuration to be spliced into the configuration
    isConfigLocal: false, // Set to true if the user loads one locally
    boardDetectionInProgress: false,
};

tab.initialize = function (callback) {
    var self = this;

    self.selectedBoard = undefined;
    self.localFirmwareLoaded = false;
    self.isConfigLocal = false;
    self.intel_hex = undefined;
    self.parsed_hex = undefined;


    function onFirmwareCacheUpdate(release) {
        $('select[name="firmware_version"] option').each(function () {
            const option_e = $(this);
            const optionRelease = option_e.data("summary");
            if (optionRelease && optionRelease.file === release.file) {
                option_e.toggleClass("cached", FirmwareCache.has(release));
            }
        });
    }

    function onDocumentLoad() {
        FirmwareCache.load();
        FirmwareCache.onPutToCache(onFirmwareCacheUpdate);
        FirmwareCache.onRemoveFromCache(onFirmwareCacheUpdate);

        function parse_hex(str) {
            return new Promise(r => {
                // parsing hex in different thread
                var worker = new Worker(new URL('@/js/workers/hex_parser.js', import.meta.url));

                // "callback"
                worker.onmessage = function (event) {
                    r(event.data);
                };

                // send data/string over for processing
                worker.postMessage(str);
            });
        }

        function show_loaded_hex(summary) {
            self.flashingMessage('<a class="save_firmware" href="#" title="Save Firmware">' + i18n.getMessage('firmwareFlasherFirmwareOnlineLoaded', self.parsed_hex.bytes_total) + '</a>', self.FLASH_MESSAGE_TYPES.NEUTRAL);

            self.enableFlashing(true);

            if (self.unifiedTarget.manufacturerId) {
                $('div.release_info #manufacturer').text(self.unifiedTarget.manufacturerId);
                $('div.release_info #manufacturerInfo').show();
            } else {
                $('div.release_info #manufacturerInfo').hide();
            }
            $('div.release_info .target').text(tab.selectedBoard);
            $('div.release_info .name').text(summary.version).prop('href', summary.releaseUrl);
            $('div.release_info .date').text(summary.date);
            $('div.release_info .file').text(summary.file).prop('href', summary.url);

            if (Object.keys(self.unifiedTarget).length > 0) {
                $('div.release_info #unifiedTargetInfo').show();
                $('div.release_info #unifiedTargetFile').text(self.unifiedTarget.fileName).prop('href', self.unifiedTarget.fileUrl);
                $('div.release_info #unifiedTargetDate').text(self.unifiedTarget.date);
            } else {
                $('div.release_info #unifiedTargetInfo').hide();
            }

            var formattedNotes = summary.notes; //.replace(/#(\d+)/g, '[#$1](https://github.com/rotorflight/rotorflight-firmware/pull/$1)');
            formattedNotes = marked.parse(formattedNotes);
            $('div.release_info .notes').html(formattedNotes);
            $('div.release_info .notes').find('a').each(function() {
                $(this).attr('target', '_blank');
            });

            $('div.release_info').slideDown();

            $('.tab-firmware_flasher .content_wrapper').animate({ scrollTop: $('div.release_info').position().top }, 1000);
        }

        function process_hex(data, summary) {
            self.intel_hex = data;

            parse_hex(self.intel_hex).then(data => {
                self.parsed_hex = data;

                if (self.parsed_hex) {
                    if (!FirmwareCache.has(summary)) {
                        FirmwareCache.put(summary, self.intel_hex);
                    }
                    show_loaded_hex(summary);

                } else {
                    self.flashingMessage(i18n.getMessage('firmwareFlasherHexCorrupted'), self.FLASH_MESSAGE_TYPES.INVALID);
                }
            });
        }

        function onLoadSuccess(data, summary) {
            self.localFirmwareLoaded = false;
            // The path from getting a firmware doesn't fill in summary.
            summary = typeof summary === "object"
                ? summary
                : $('select[name="firmware_version"] option:selected').data('summary');
            process_hex(data, summary);
            $("a.load_remote_file").removeClass('disabled');
            $("a.load_remote_file").text(i18n.getMessage('firmwareFlasherButtonLoadOnline'));
        };

        function populateBoardOptions(builds) {
            if (!builds) {
                $('select[name="board"]').empty().append('<option value="0">Offline</option>');
                $('select[name="firmware_version"]').empty().append('<option value="0">Offline</option>');

                return;
            }

            var boards_e = $('select[name="board"]');
            boards_e.empty();
            boards_e.append($(`<option value='0'>${i18n.getMessage("firmwareFlasherOptionLabelSelectBoard")}</option>`));

            var versions_e = $('select[name="firmware_version"]');
            versions_e.empty();
            versions_e.append($(`<option value='0'>${i18n.getMessage("firmwareFlasherOptionLabelSelectFirmwareVersion")}</option>`));


            var selectTargets = [];
            Object.keys(builds)
                .sort()
                .forEach(function(target) {
                    var descriptors = builds[target];
                    descriptors.forEach(function(descriptor){
                        if($.inArray(target, selectTargets) == -1) {
                            selectTargets.push(target);
                            var select_e = $(
                                `<option value='${descriptor.target}'>${descriptor.target}</option>`,
                            );
                            boards_e.append(select_e);
                        }
                    });
                });

            tab.releases = builds;

            if (config.get('rememberLastSelectedBoard')) {
                const selected_board = config.get('selected_board');
                console.log("selected_board foo", selected_board);
                const boardBuilds = builds[selected_board];
                $('select[name="board"]').val(boardBuilds ? selected_board : 0).trigger('change');
            }
        }

        function processBoardOptions(releaseData, buildLevel) {
            var releases = {};
            const filenameExpression = /^rotorflight_([\d]+[.][\d]+[.][\d]+((-[A-Za-z][\w]*)|(-[\d]+))?)_([A-Za-z][\w]*)[.]hex$/;
            releaseData.forEach(function(release) {
                if (release.prerelease && buildLevel < 2)
                    return;
                release.assets.forEach(function(asset) {
                    var match = filenameExpression.exec(asset.name);
                    if (!match)
                        return;
                    if (match[2] && buildLevel < 1)
                        return;
                    if (semver.lt(match[1], CONFIGURATOR.FW_VERSION_MIN_SUPPORTED) ||
                        semver.gt(match[1], CONFIGURATOR.FW_VERSION_MAX_SUPPORTED))
                        return;
                    const version = match[1];
                    const target = match[5];
                    const date = new Date(release.published_at);
                    const formattedDate = ("0" + date.getDate()).slice(-2) + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + date.getFullYear() + " " + ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2);
                    const descriptor = {
                        "releaseUrl": release.html_url,
                        "name"      : version,
                        "version"   : version,
                        "url"       : asset.browser_download_url,
                        "file"      : asset.name,
                        "target"    : target,
                        "date"      : formattedDate,
                        "notes"     : release.body
                    };
                    if (releases[target] === undefined)
                        releases[target] = [];
                    releases[target].push(descriptor);
                });
            });
            loadUnifiedBuilds(releases);
        };

        function supportsUnifiedTargets(version) {
            return semver.gte(version, '4.2.0');
        }

        function hasUnifiedTargetBuild(builds) {
            return Object.keys(builds).some(function (key) {
                return builds[key].some(function(target) {
                    return supportsUnifiedTargets(target.version);
                });
            });
        }

        async function loadUnifiedBuilds(builds) {
            if (builds && hasUnifiedTargetBuild(builds)) {
                // track cache expiration with seconds
                const expirationPeriod = 3600 * 2;
                const now = Math.floor(Date.now() / 1000);

                const cache = await getCachedUnifiedTargets();
                const cacheAge = now - (cache?.lastUpdate ?? 0);
                if (cache) {
                    console.log(`Loaded cached unified targets: ${Math.floor(cacheAge / 60)} minutes old`);
                }

                let supportedTargets = cache?.supportedTargets;
                let legacyTargets = cache?.legacyTargets;

                if (cacheAge > expirationPeriod) {
                    console.log("Fetching unified targets");
                    try {
                        supportedTargets = await github.getContents("rotorflight/rotorflight-targets", "rotorflight", "configs");
                        legacyTargets = await github.getContents("rotorflight/rotorflight-targets", "rotorflight", "legacy");

                        await new Promise((resolve) => chrome.storage.local.set(
                            { unifiedSourceCache: { lastUpdate: now, supportedTargets, legacyTargets } },
                            resolve,
                        ));
                    } catch (err) {
                        console.log("Fetching unified targets failed", err);
                    }
                }

                if (!supportedTargets || !legacyTargets) {
                    console.log(`Failed to load unified targets`);
                    return;
                }

                const targets = [
                    ...supportedTargets.map((x) => {
                        x.supported = true;
                        return x;
                    }),
                    ...legacyTargets.map((x) => {
                        x.supported = false;
                        return x;
                    }),
                ];

                parseUnifiedTargets(targets, builds);
            } else {
                populateBoardOptions(builds);
            }
        }

        function parseUnifiedTargets(targets, builds) {
            const releases = {};
            const unifiedConfigs = {};

             // Get the legacy builds
             Object.keys(builds).forEach(function (targetName) {
                 releases[targetName] = builds[targetName];
             });

            for (const target of targets) {
                const TARGET_REGEXP = /^([^-]{1,4})-(.*).config$/;
                const targetParts = target.name.match(TARGET_REGEXP);
                if (!targetParts) {
                    continue;
                }

                target.board = targetParts[2];
                target.manufacturer = targetParts[1];
                target.target = `${target.manufacturer}-${target.board}`;

                unifiedConfigs[target.target] = target;
            }

            tab.releases = releases;
            tab.unifiedConfigs = unifiedConfigs;

            const versions_e = $('select[name="firmware_version"]');
            versions_e.empty()
                .append($(`<option value='0'>${i18n.getMessage("firmwareFlasherOptionLabelSelectFirmwareVersion")}</option>`));

            let selectedBoard = undefined;
            if (config.get('rememberLastSelectedBoard')) {
                selectedBoard = config.get('selected_board');
            }

            updateBoardSelect(selectedBoard);
        }

        function updateBoardSelect(selected) {
            const showLegacy = config.get("showLegacyTargets") ?? false;

            const boards_e = $('select[name="board"]');
            boards_e.empty()
                .append($(`<option value='0'>${i18n.getMessage("firmwareFlasherOptionLabelSelectBoard")}</option>`));

            const targetsByManufacturer = Object.values(tab.unifiedConfigs).reduce((acc, target) => {
                if (!acc[target.manufacturer]) {
                    acc[target.manufacturer] = [];
                }

                acc[target.manufacturer].push(target);
                return acc;
            }, {});

            const manufacturerIds = Object.keys(targetsByManufacturer).sort();
            for (const manufacturer of manufacturerIds) {
                const boards = targetsByManufacturer[manufacturer]
                    .filter((x) => x.supported || showLegacy || (x.target === selected))
                    .sort((a, b) => {
                        if (a.board < b.board) return -1;
                        if (a.board > b.board) return 1;
                        return 0;
                    });
                if (boards.length === 0) {
                    continue;
                }
                const optgroup_e = $(`<optgroup label="${manufacturers[manufacturer]?.name ?? manufacturer}"></optgroup>`);
                for (const board of boards) {
                      const option_e = $(`<option value='${board.target}'>${board.board}</option>"`);
                      optgroup_e.append(option_e);
                }
                boards_e.append(optgroup_e);
            }

            const current = boards_e.val();
            if (selected && current !== selected) {
                const exists = boards_e.find(`option[value="${selected}"]`).length > 0;
                boards_e.val(exists ? selected : 0).trigger("change");
            }
        }

        var buildTypes = [
            {
                tag: 'firmwareFlasherOptionLabelBuildTypeRelease',
                loader: () => self.releaseChecker.loadReleaseData(releaseData => processBoardOptions(releaseData, 0))
            },
            {
                tag: 'firmwareFlasherOptionLabelBuildTypePreRelease',
                loader: () => self.releaseChecker.loadReleaseData(releaseData => processBoardOptions(releaseData, 1))
            },
            {
                tag: 'firmwareFlasherOptionLabelBuildTypeDevelopment',
                loader: () => self.releaseChecker.loadReleaseData(releaseData => processBoardOptions(releaseData, 2))
            },
        ];

        var buildType_e = $('select[name="build_type"]');

        function buildBuildTypeOptionsList() {
            buildType_e.empty();
            buildTypes.forEach(({tag,title}, index) => {
                buildType_e.append(
                    $(`<option value='${index}'>${tag ? i18n.getMessage(tag) : title}</option>`)
                );
            });
            buildType_e.val($('select[name="build_type"] option:first').val());
        }

        buildBuildTypeOptionsList();


        // translate to user-selected language
        i18n.localizePage();

        buildType_e.change(function() {
            $("a.load_remote_file").addClass('disabled');
            var build_type = $(this).val();

            $('select[name="board"]').empty()
            .append($(`<option value='0'>${i18n.getMessage("firmwareFlasherOptionLoading")}</option>`));

            $('select[name="firmware_version"]').empty()
            .append($(`<option value='0'>${i18n.getMessage("firmwareFlasherOptionLoading")}</option>`));

            if (!GUI.connect_lock) {
                tab.unifiedConfigs = {};
                buildTypes[build_type].loader();
            }

            chrome.storage.local.set({'selected_build_type': build_type});
        });

        function populateBuilds(builds, manufacturerId, targetVersions) {
            if (targetVersions) {
                targetVersions.forEach(function(descriptor) {
                    let version = descriptor.version;
                    const build = { descriptor };
                    if (manufacturerId) {
                        if (!supportsUnifiedTargets(descriptor.version)) {
                            return;
                        }
                        build.manufacturerId = manufacturerId;
                    } else {
                        version = `${version}-legacy`;
                        build.isLegacy = true;
                    }
                    builds[version] = build;
                });
            }
        }

        function populateVersions(versions_element, builds, target) {
            const sortVersions = function (a, b) {
                return -semver.compareBuild(a, b);
            };

            versions_element.empty();
            const targetVersions = Object.keys(builds);
            if (targetVersions.length > 0) {
                versions_element.append(
                    $(
                        `<option value='0'>${i18n.getMessage(
                            "firmwareFlasherOptionLabelSelectFirmwareVersionFor"
                        )} ${target}</option>`
                    )
                );
                targetVersions
                    .sort(sortVersions)
                    .forEach(function(versionName) {
                        const version = builds[versionName];
                        if (!version.isLegacy && !supportsUnifiedTargets(version.descriptor.version)) {
                            return;
                        }

                        let versionLabel;
                        if (version.isLegacy && Object.values(builds).some(function (build) {
                                return build.descriptor.version === version.descriptor.version && !build.isLegacy;
                            })) {
                            versionLabel = i18n.getMessage("firmwareFlasherLegacyLabel", { target: version.descriptor.version });
                        } else if (!version.isLegacy && Object.values(builds).some(function (build) {
                                return build.descriptor.version === version.descriptor.version && build.manufacturerId !== version.manufacturerId && !build.isLegacy;
                            })) {
                            versionLabel = `${version.descriptor.version} (${version.manufacturerId})`;
                        } else {
                            versionLabel = version.descriptor.version;
                        }


                        var select_e = $(
                            `<option value='${versionName}'>${version.descriptor.date} - ${versionLabel}</option>`
                        );
                        if (FirmwareCache.has(version.descriptor)) {
                            select_e.addClass("cached");
                        }
                        select_e.data('summary', version.descriptor);
                        versions_element.append(select_e);
                    });
                    // Assume flashing latest, so default to it.
                versions_element.prop("selectedIndex", 1).change();
            }
        }

        function grabBuildNameFromConfig(config) {
            let bareBoard;
            try {
                const pattern = /.+\/ (STM32[^ ]*)/;
                const matches = config.match(pattern);
                bareBoard = matches[1];
            } catch (e) {
                bareBoard = undefined;
                console.log('grabBuildNameFromConfig failed: ', e.message);
            }
            return bareBoard;
        }

        function grabKeywordFromConfig(config, keyword, fallback) {
            let match = fallback || '';
            try {
                const res = config.match(`${keyword} (.*)\n`);
                if (res)
                    match = res[1];
            } catch (e) {
                console.log('grabKeywordFromConfig failed: ', e.message);
            }
            return match;
        }

        function setUnifiedConfig(target, bareBoard, targetConfig, manufacturerId, fileName, fileUrl, date) {
            // a target might request a firmware with the same name, remove configuration in this case.
            if (bareBoard === target) {
                self.unifiedTarget = {};
            } else {
                self.unifiedTarget.config = targetConfig;
                self.unifiedTarget.manufacturerId = manufacturerId;
                self.unifiedTarget.fileName = fileName;
                self.unifiedTarget.fileUrl = fileUrl;
                self.unifiedTarget.date = date;
                self.isConfigLocal = false;
            }
        }

        function clearBufferedFirmware() {
            self.isConfigLocal = false;
            self.unifiedTarget = {};
            self.intel_hex = undefined;
            self.parsed_hex = undefined;
            self.localFirmwareLoaded = false;
        }

        $('select[name="board"]').select2();

        $('select[name="board"]').on("change", async function() {
            $("a.load_remote_file").addClass('disabled');
            var target = $(this).val();

            if (!GUI.connect_lock || self.boardDetectionInProgress) {
                if (tab.selectedBoard != target) {
                    // We're sure the board actually changed
                    if (self.isConfigLocal) {
                        console.log('Board changed, unloading local config');
                        self.isConfigLocal = false;
                        self.unifiedTarget = {};
                    }
                }
                if (config.get('rememberLastSelectedBoard')) {
                    config.set({'selected_board': target});
                }
                tab.selectedBoard = target;
                tab.bareBoard = undefined;
                console.log('board changed to', target);

                self.flashingMessage(i18n.getMessage('firmwareFlasherLoadFirmwareFile'), self.FLASH_MESSAGE_TYPES.NEUTRAL)
                    .flashProgress(0);

                $('div.git_info').slideUp();
                $('div.release_info').slideUp();

                if (!self.localFirmwareLoaded) {
                    self.enableFlashing(false);
                }

                var versions_e = $('select[name="firmware_version"]');
                if (target == 0) {
                    // target == 0 is the "Choose a Board" option. Throw out anything loaded
                    clearBufferedFirmware();

                    versions_e.empty();
                    versions_e.append(
                        $(
                            `<option value='0'>${i18n.getMessage(
                                "firmwareFlasherOptionLabelSelectFirmwareVersion"
                            )}</option>`
                        )
                    );
                } else {
                    // Show a loading message as there is a delay in loading a configuration
                    versions_e.empty();
                    versions_e.append(
                        $(
                            `<option value='0'>${i18n.getMessage(
                                "firmwareFlasherOptionLoading"
                            )}</option>`
                        )
                    );

                    const builds = [];

                    const finishPopulatingBuilds = function () {
                        if (tab.releases[target]) {
                            tab.bareBoard = target;
                            populateBuilds(builds, undefined, tab.releases[target]);
                        }

                        populateVersions(versions_e, builds, target);
                    };

                    if (tab.unifiedConfigs[target]) {
                        const targetSpec = tab.unifiedConfigs[target];

                        // track cache expiration with seconds
                        const expirationPeriod = 3600 * 2;
                        const now = Math.floor(Date.now() / 1000);

                        let { unifiedConfigLast } = await new Promise((resolve) => chrome.storage.local.get("unifiedConfigLast", resolve));
                        const cacheAge = now - (unifiedConfigLast?.lastUpdate ?? 0);

                        if (unifiedConfigLast.targetId !== targetSpec.target || cacheAge > expirationPeriod) {
                            try {
                                console.log(`Fetching ${targetSpec.download_url}`);
                                const res = await fetch(targetSpec.download_url);
                                if (!res.ok) {
                                  throw new Error(`HTTP ${r.status}`);
                                }
                                let config = await res.text();

                                config = cleanUnifiedConfigFile(config);
                                if (!config) {
                                  throw new Error("Invalid config");
                                }

                                const bareBoard = grabBuildNameFromConfig(config);
                                tab.bareBoard = bareBoard;

                                const commit = await github.getFileLastCommitInfo("rotorflight/rotorflight-targets", "rotorflight", targetSpec.path);
                                config = self.injectDefaultDesign(config, "BTFL");
                                config = self.injectTargetInfo(config, targetSpec.name, target, targetSpec.manufacturer, commit);

                                setUnifiedConfig(target, bareBoard, config, targetSpec.manufacturer, targetSpec.name, targetSpec.download_url, commit.date);
                                await new Promise((resolve) => chrome.storage.local.set(
                                    { unifiedConfigLast: { unifiedTarget: self.unifiedTarget, targetId: targetSpec.target, lastUpdate: now } },
                                    resolve,
                                ));
                            } catch (err) {
                                console.log("Failed to fetch target config", err);
                                failLoading(targetSpec.download_url);
                            }
                        } else {
                            console.log(`Using cached target config for ${targetSpec.target}: ${Math.floor(cacheAge / 60)} minutes old`);
                            const unifiedTarget = unifiedConfigLast.unifiedTarget;

                            const bareBoard = grabBuildNameFromConfig(unifiedTarget.config);
                            tab.bareBoard = bareBoard;

                            if (target === bareBoard) {
                                self.unifiedTarget = {};
                            } else {
                                self.unifiedTarget = unifiedTarget;
                            }
                        }

                        populateBuilds(builds, targetSpec.manufacturer, tab.releases[tab.bareBoard]);
                    } else {
                        self.unifiedTarget = {};
                    }

                    finishPopulatingBuilds();
                }
            }
        });

        function failLoading(downloadUrl) {
            //TODO error, populate nothing?
            self.unifiedTarget = {};
            self.isConfigLocal = false;

            GUI.log(i18n.getMessage('firmwareFlasherFailedToLoadUnifiedConfig', { remote_file: downloadUrl }));
        }

        function flashingMessageLocal() {
            // used by the a.load_file hook, evaluate the loaded information, and enable flashing if suitable
            if (self.isConfigLocal && !self.parsed_hex) {
                self.flashingMessage(i18n.getMessage('firmwareFlasherLoadedConfig'), self.FLASH_MESSAGE_TYPES.NEUTRAL);
            }
            if (self.isConfigLocal && self.parsed_hex && !self.localFirmwareLoaded) {
                self.enableFlashing(true);
                self.flashingMessage(i18n.getMessage('firmwareFlasherFirmwareLocalLoaded', self.parsed_hex.bytes_total), self.FLASH_MESSAGE_TYPES.NEUTRAL);
            }
            if (self.localFirmwareLoaded) {
                self.enableFlashing(true);
                self.flashingMessage(i18n.getMessage('firmwareFlasherFirmwareLocalLoaded', self.parsed_hex.bytes_total), self.FLASH_MESSAGE_TYPES.NEUTRAL);
            }
        }

        const ignoreRegExp = [
            /^feature [-]?AIRMODE/i,
            /^feature [-]?ANTI/i,
            /^feature [-]?DISPLAY/i,
            /^feature [-]?DYNAMIC/i,
            /^feature [-]?ESC_SENSOR/i,
            /^feature [-]?GPS/i,
            /^feature [-]?LED_STRIP/i,
            /^feature [-]?MOTOR_STOP/i,
            /^feature [-]?OSD/i,
            /^feature [-]?RSSI/i,
            /^feature [-]?RX_PARALLEL/i,
            /^feature [-]?RX_SERIAL/i,
            /^feature [-]?RX_SPI/i,
            /^feature [-]?SOFTSERIAL/i,
            /^feature [-]?TELEMETRY/i,
            /^resource PWM/i,
            /^resource MOTOR [5-8]/i,
            /^serial [0-9]/i,
            /^set serialrx/i,
        ];

        function cleanUnifiedConfigFile(input) {
            let output = '';
            let fork = 'BF';
            console.log('Clean up Unified Config file:');
            input.split(/[\r\n]+/).forEach(function(line,index) {
                if (index == 0 && line.match(/^# [A-Za-z]*flight/)) {
                    if (line.match(/^# Rotorflight/)) {
                        fork = 'RF';
                    }
                } else {
                    line = line.replace(/#.*$/, '')
                               .replace(/[ \t]+$/, '')
                               .replace(/[ \t]+/, ' ')
                               .replace(/^[ ]*$/, '');
                    if (line.length == 0)
                        return;
                    if (fork != 'RF' && ignoreRegExp.some( (regexp) => line.match(regexp) )) {
                        console.log(' ---' + line);
                        return;
                    }
                }
                output += line + '\n';
            });
            return output;
        }

        const portPickerElement = $('div#port-picker #port');
        function flashFirmware(firmware) {
            const options = {
                no_reboot: false,
                erase_chip: $('input.erase_chip').is(':checked'),
                baud: getIntegerValue('select#baud') ?? 115200,
            };

            if (!$('option:selected', portPickerElement).data().isDFU) {
                if (String(portPickerElement.val()) !== '0') {
                    const port = String(portPickerElement.val());
                    STM32.connect(port, options.baud, firmware, options);
                } else {
                    console.log('Please select valid serial port');
                    GUI.log(i18n.getMessage('firmwareFlasherNoValidPort'));
                }
            } else {
                STM32DFU.connect(usbDevices, firmware, options);
            }
        }

        const showAdvancedOpts = config.get('showAdvancedFirmwareOpts') ?? false;

        $('input.erase_chip')
            .prop('checked', showAdvancedOpts ? config.get('erase_chip') ?? true : true)
            .on('change', function () {
                config.set({ 'erase_chip': $(this).is(':checked') });
            })
            .closest('.field')
            .toggle(showAdvancedOpts);

        $('#show-legacy-targets')
            .prop('checked', showAdvancedOpts ? config.get('showLegacyTargets') ?? false : false)
            .on('change', function () {
                  config.set({ showLegacyTargets: $(this).is(':checked') });
                  updateBoardSelect($('select[name="board"]').val());
            })
            .closest('.field')
            .toggle(showAdvancedOpts);

        chrome.storage.local.get('selected_build_type', function (result) {
            // ensure default build type is selected
            buildType_e.val(result.selected_build_type || 0).trigger('change');
        });

        // UI Hooks
        $('a.load_file').on('click', async function () {
            self.enableFlashing(false);

            const file = await readTextFile({
                description: "Firmware/Target",
                extensions: [".hex", ".config"],
            });
            if (!file) return;

            $('div.git_info').slideUp();

            if (file.name.endsWith(".hex")) {
                self.intel_hex = file.content;
                self.parsed_hex = await parse_hex(self.intel_hex);

                if (self.parsed_hex) {
                    self.localFirmwareLoaded = true;

                    flashingMessageLocal();
                } else {
                    self.flashingMessage(i18n.getMessage('firmwareFlasherHexCorrupted'), self.FLASH_MESSAGE_TYPES.INVALID);
                }
            } else {
                clearBufferedFirmware();

                let config = cleanUnifiedConfigFile(file.content);
                if (config !== null) {
                    const manufac = grabKeywordFromConfig(config, 'manufacturer_id', 'NONE');
                    const target = grabKeywordFromConfig(config, 'board_name', 'NONE');
                    config = self.injectDefaultDesign(config, 'BTFL');
                    config = self.injectTargetInfo(
                        config,
                        file.name,
                        target,
                        manufac,
                        {
                            commitHash: 'unknown',
                            date: file.lastModified?.toISOString() ?? new Date().toISOString(),
                        },
                    );
                    self.unifiedTarget.config = config;
                    self.unifiedTarget.fileName = file.name;
                    self.isConfigLocal = true;
                    flashingMessageLocal();
                }
            }
        });

        /**
         * Lock / Unlock the firmware download button according to the firmware selection dropdown.
         */
        $('select[name="firmware_version"]').change(function(evt){
            $('div.release_info').slideUp();

            if (!self.localFirmwareLoaded) {
                self.enableFlashing(false);
                self.flashingMessage(i18n.getMessage('firmwareFlasherLoadFirmwareFile'), self.FLASH_MESSAGE_TYPES.NEUTRAL);
                if(self.parsed_hex && self.parsed_hex.bytes_total) {
                    // Changing the board triggers a version change, so we need only dump it here.
                    console.log('throw out loaded hex');
                    self.intel_hex = undefined;
                    self.parsed_hex = undefined;
                }
            }

            let release = $("option:selected", evt.target).data("summary");
            let isCached = FirmwareCache.has(release);
            if (evt.target.value === "0" || isCached) {
                if (isCached) {
                    FirmwareCache.get(release, cached => {
                        console.info("Release found in cache: " + release.file);
                        onLoadSuccess(cached.hexdata, release);
                    });
                }
                $("a.load_remote_file").addClass('disabled');
            }
            else {
                $("a.load_remote_file").removeClass('disabled');
            }
        });

        $('a.load_remote_file').click(function () {
            self.enableFlashing(false);
            self.localFirmwareLoaded = false;

            if ($('select[name="firmware_version"]').val() == "0") {
                GUI.log(i18n.getMessage('firmwareFlasherNoFirmwareSelected'));
                return;
            }

            function failed_to_load() {
                $('span.progressLabel').attr('i18n','firmwareFlasherFailedToLoadOnlineFirmware').removeClass('i18n-replaced');
                $("a.load_remote_file").removeClass('disabled');
                $("a.load_remote_file").text(i18n.getMessage('firmwareFlasherButtonLoadOnline'));
                i18n.localizePage();
            }

            var summary = $('select[name="firmware_version"] option:selected').data('summary');
            if (summary) { // undefined while list is loading or while running offline
                if (self.isConfigLocal && FirmwareCache.has(summary)) {
                    // Load the .hex from Cache if available when the user is providing their own config.
                    FirmwareCache.get(summary, cached => {
                        console.info("Release found in cache: " + summary.file);
                        onLoadSuccess(cached.hexdata, summary);
                    });
                    return;
                }
                $("a.load_remote_file").text(i18n.getMessage('firmwareFlasherButtonDownloading'));
                $("a.load_remote_file").addClass('disabled');
                $.get(summary.url, onLoadSuccess).fail(failed_to_load);
            } else {
                $('span.progressLabel').attr('i18n','firmwareFlasherFailedToLoadOnlineFirmware').removeClass('i18n-replaced');
                i18n.localizePage();
            }
        });

        const exitDfuElement = $('a.exit_dfu');
        exitDfuElement.click(function () {
            if (!$(this).hasClass('disabled')) {
                if (!GUI.connect_lock) { // button disabled while flashing is in progress
                    try {
                        STM32DFU.connect(usbDevices, self.parsed_hex, { exitDfu: true });
                    } catch (e) {
                        console.log(`Exiting DFU failed: ${e.message}`);
                    }
                }
            }
        });

        const detectBoardElement = $('a.detect-board');

        // Notably, the portPickerElement "change" will be triggered repeatedly as it is setup on a timer in the port_handler
        portPickerElement.on("change", function () {
            if (!GUI.connect_lock) {
                if ($('option:selected', this).data().isDFU) {
                    exitDfuElement.removeClass('disabled');
                    detectBoardElement.toggleClass('disabled', true); // can't detect board in DFU mode.
                } else {
                    $("a.load_remote_file").removeClass('disabled');
                    $("a.load_file").removeClass('disabled');
                    detectBoardElement.toggleClass('disabled', false);
                    exitDfuElement.addClass('disabled');
                }
            }
        });

        let board_auto_detect = (function() {
            let targetAvailable = false;
            let mspHelper = null;
            let detectTimer = null;

            function detect(port, baud) {
                const isLoaded = tab.releases ? Object.keys(tab.releases).length > 0 : false;

                if (!isLoaded) {
                    GUI.log(i18n.getMessage('firmwareFlasherNoBoardsLoaded'));
                    return;
                }

                if (serial.connected || serial.connectionId) {
                    console.warn('Attempting to connect while there still is a connection', serial.connected, serial.connectionId, serial.openCanceled);
                    serial.disconnect();
                    return;
                }

                tab.enableFlashing(false);
                GUI.connect_lock = true;
                self.boardDetectionInProgress = true;

                GUI.log(i18n.getMessage('firmwareFlasherBoardDetectionInProgress'));
                detectTimer = setTimeout(function() {
                    GUI.log(i18n.getMessage('firmwareFlasherBoardDetectionFail'));
                    disconnect();
                }, 5000); // Disconnect after 5 seconds, as board detection should happen by then.
                serial.connect(port, {bitrate: baud}, onConnect);
            }

            async function getBoardInfo() {
                await MSP.promise(MSPCodes.MSP_BOARD_INFO);
                handleMSPResponse();
            }

            function disconnect() {
                serial.disconnect(onClose);
                MSP.disconnect_cleanup();
                tab.enableFlashing(true);
                self.boardDetectionInProgress = false;
                GUI.connect_lock = false;
            }

            function handleMSPResponse() {
                let board = FC.CONFIG.boardName;
                if (board) {
                    clearTimeout(detectTimer);

                    if (board.includes(".")) {
                        const newBoardName = board.replace('.', '_');
                        GUI.log(i18n.getMessage('dialogBoardDetectionMessageInvalidBoardNameContent', [ board, newBoardName ] ));
                        dialogBoardDetectionMessage(i18n.getMessage('dialogBoardDetectionMessageInvalidBoardNameTitle'), i18n.getMessage('dialogBoardDetectionMessageInvalidBoardNameContent', [ board, newBoardName ]).concat("<br />", i18n.getMessage('dialogBoardDetectionMessageInvalidBoardNameRecommendation')));
                        board = newBoardName;
                    }

                    updateBoardSelect(`${FC.CONFIG.manufacturerId}-${board}`);

                    GUI.log(i18n.getMessage(targetAvailable ? 'firmwareFlasherBoardDetectionSucceeded' : 'firmwareFlasherBoardDetectionBoardNotFound', { boardName: board }));
                    disconnect();
                }
            }

            function onConnect(openInfo) {
                if (openInfo) {
                    GUI.log(i18n.getMessage('serialPortOpened', serial.connectionType === 'serial' ? [serial.connectionId] : [openInfo.socketId]));

                    serial.onReceive.addListener(function (info) { MSP.read(info); });

                    mspHelper = new MspHelper();
                    MSP.listen(mspHelper.process_data.bind(mspHelper));

                    getBoardInfo();
                } else {
                    clearTimeout(detectTimer);
                    GUI.log(i18n.getMessage('firmwareFlasherBoardDetectionFail') + ": " + i18n.getMessage('serialPortOpenFail'));
                    disconnect();
                }
            }

            function onClose(result) {
                GUI.log(i18n.getMessage(result ? 'serialPortClosedOk' : 'serialPortClosedFail'));

                if (!targetAvailable) {
                    GUI.log(i18n.getMessage('firmwareFlasherBoardDetectionFail'));
                }

                MSP.clearListeners();
            }

            function dialogBoardDetectionMessage(title, message) {
                const dialog = $('#dialogBoardDetectionMessage')[0];

                function close() {
                    $('#dialogBoardDetectionMessageAcknowledge').off('click');
                    dialog.close();
                    $('#dialogBoardDetectionMessageTitle').html("");
                    $('#dialogBoardDetectionMessageContent').html("");
                }

                $('#dialogBoardDetectionMessageAcknowledge').on("click", function() {
                    close();
                });

                $('#dialogBoardDetectionMessageTitle').html(title);
                $('#dialogBoardDetectionMessageContent').html(message);
                dialog.showModal();
            };

            return {
                detect: detect,
            };
        })();

        detectBoardElement.on('click', () => {
            detectBoardElement.toggleClass('disabled', true);
            if (!GUI.connect_lock) {
                if (!$('option:selected', portPickerElement).data().isDFU) {
                    if (String(portPickerElement.val()) !== '0') {
                        const port = String(portPickerElement.val());
                        const baud = getIntegerValue('select#baud') ?? 115200;
                        board_auto_detect.detect(port, baud);
                    } else {
                        GUI.log(i18n.getMessage('firmwareFlasher'));
                    }
                }
            }
        });

        $('a.flash_firmware').click(function () {
            if (!$(this).hasClass('disabled')) {
                startFlashing();
            }
        });

        function startFlashing() {
            exitDfuElement.addClass('disabled');
            $("a.load_remote_file").addClass('disabled');
            $("a.load_file").addClass('disabled');
            detectBoardElement.toggleClass('disabled', true);
            if (!GUI.connect_lock) { // button disabled while flashing is in progress
                if (self.parsed_hex) {
                    try {
                        if (self.unifiedTarget.config && !self.parsed_hex.configInserted) {
                            var configInserter = new ConfigInserter();

                            if (configInserter.insertConfig(self.parsed_hex, self.unifiedTarget.config)) {
                                self.parsed_hex.configInserted = true;
                            } else {
                                console.log('Firmware does not support custom defaults.');

                                self.unifiedTarget = {};
                            }
                        }

                        flashFirmware(self.parsed_hex);

                        GUI.saveDefaultTab('status');

                    } catch (e) {
                        console.log(`Flashing failed: ${e.message}`);
                    }
                } else {
                    $('span.progressLabel').attr('i18n','firmwareFlasherFirmwareNotLoaded').removeClass('i18n-replaced');
                    i18n.localizePage();
                }
            }
        }

        $(document).keypress(function (e) {
            if (e.which == 13) { // enter
                // Trigger regular Flashing sequence
                $('a.flash_firmware').click();
            }
        });

        self.flashingMessage(i18n.getMessage('firmwareFlasherLoadFirmwareFile'), self.FLASH_MESSAGE_TYPES.NEUTRAL);

        // Update Firmware button at top
        $('div#flashbutton a.flash_state').addClass('active');
        $('div#flashbutton a.flash').addClass('active');
        GUI.content_ready(callback);
    }

    $('#content').load("/src/tabs/firmware_flasher.html", onDocumentLoad);
};

tab.cleanup = function (callback) {
    PortHandler.flush_callbacks();
    FirmwareCache.unload();

    // unbind "global" events
    $(document).unbind('keypress');
    $(document).off('click', 'span.progressLabel a');

    // Update Firmware button at top
    $('div#flashbutton a.flash_state').removeClass('active');
    $('div#flashbutton a.flash').removeClass('active');

    callback?.();
};

tab.enableFlashing = function (enabled) {
    if (enabled) {
        $('a.flash_firmware').removeClass('disabled');
    } else {
        $('a.flash_firmware').addClass('disabled');
    }
};

tab.FLASH_MESSAGE_TYPES = {NEUTRAL : 'NEUTRAL',
                           VALID   : 'VALID',
                           INVALID : 'INVALID',
                           ACTION  : 'ACTION'};

tab.flashingMessage = function(message, type) {
    let self = this;

    let progressLabel_e = $('span.progressLabel');
    switch (type) {
        case self.FLASH_MESSAGE_TYPES.VALID:
            progressLabel_e.removeClass('invalid actionRequired')
                           .addClass('valid');
            break;
        case self.FLASH_MESSAGE_TYPES.INVALID:
            progressLabel_e.removeClass('valid actionRequired')
                           .addClass('invalid');
            break;
        case self.FLASH_MESSAGE_TYPES.ACTION:
            progressLabel_e.removeClass('valid invalid')
                           .addClass('actionRequired');
            break;
        case self.FLASH_MESSAGE_TYPES.NEUTRAL:
        default:
            progressLabel_e.removeClass('valid invalid actionRequired');
            break;
    }
    if (message != null) {
        progressLabel_e.html(message);
        $('span.progressLabel a.save_firmware').on('click', async function () {
            var summary = $('select[name="firmware_version"] option:selected').data('summary');

            try {
                await writeTextFile(self.intel_hex, {
                    suggestedName: summary.file,
                    description: 'Rotorflight Firmware (.hex)',
                });
            } catch (err) {
                console.log('Error saving firmware file', err);
            }
        });
    }

    return self;
};

tab.flashProgress = function(value) {
    $('.progress').val(value);

    return this;
};

tab.injectDefaultDesign = function (targetConfig, boardDesign) {
    const designLineRegex = /board_design [A-Za-z0-9_+-]+\n/gm;
    const nameLineRegex = /board_name [A-Za-z0-9_+-]+\n/gm;

    const newLine = `board_design ${boardDesign}\n`;

    // No design speficied, inject the default
    if (!targetConfig.match(designLineRegex)) {
        let match = targetConfig.match(nameLineRegex);
        if (match) {
            targetConfig = targetConfig.replace(nameLineRegex, match[0] + newLine);
        }
    }

    return targetConfig;
};

tab.injectTargetInfo = function (targetConfig, configName, targetName, manufacturerId, commitInfo) {
    const configLineRegex = /# config: manufacturer_id: .*\n/gm;

    targetConfig = targetConfig.replace(configLineRegex, '');

    const newConfig =
        '## Rotorflight Custom Defaults\n' +
        `# config: ${configName}\n` +
        `# board: ${targetName}\n` +
        `# make: ${manufacturerId}\n` +
        `# hash: ${commitInfo.commitHash}\n` +
        `# date: ${commitInfo.date}\n` +
        '##\n' +
        targetConfig;

    console.log('Unified Config:\n' + newConfig);

    return newConfig;
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

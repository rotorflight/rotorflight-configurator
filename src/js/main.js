'use strict';

$(document).ready(function () {

    useGlobalNodeFunctions();

    if (typeof cordovaApp === 'undefined') {
        appReady();
    }
});

function useGlobalNodeFunctions() {
    // The global functions of Node continue working on background. This is good to continue flashing,
    // for example, when the window is minimized
    if (GUI.isNWJS()) {
        console.log("Replacing timeout/interval functions with Node versions");
        window.setTimeout = global.setTimeout;
        window.clearTimeout = global.clearTimeout;
        window.setInterval = global.setInterval;
        window.clearInterval = global.clearInterval;
    }
}

function appReady() {
    $.getJSON('version.json', function(data) {
        CONFIGURATOR.version = data.version;
        CONFIGURATOR.gitChangesetId = data.gitChangesetId;

        $('.connect_b a.connect').removeClass('disabled');
        $('.firmware_b a.flash').removeClass('disabled');

        i18n.init(function() {
            startProcess();
            initializeSerialBackend();
        });
    });
}

function closeSerial() {
    // automatically close the port when application closes
    const connectionId = serial.connectionId;

    if (connectionId && CONFIGURATOR.connectionValid && !CONFIGURATOR.virtualMode) {
        // code below is handmade MSP message (without pretty JS wrapper), it behaves exactly like MSP.send_message
        // sending exit command just in case the cli tab was open.
        // reset motors to default (mincommand)

        let bufferOut = new ArrayBuffer(5),
        bufView = new Uint8Array(bufferOut);

        bufView[0] = 0x65; // e
        bufView[1] = 0x78; // x
        bufView[2] = 0x69; // i
        bufView[3] = 0x74; // t
        bufView[4] = 0x0D; // enter

        const sendFn = (serial.connectionType === 'serial' ? chrome.serial.send : chrome.sockets.tcp.send);
        sendFn(connectionId, bufferOut, function () {
            console.log('Send exit');
        });

        setTimeout(function() {
            bufferOut = new ArrayBuffer(22);
            bufView = new Uint8Array(bufferOut);
            let checksum = 0;

            bufView[0] = 36; // $
            bufView[1] = 77; // M
            bufView[2] = 60; // <
            bufView[3] = 16; // data length
            bufView[4] = 214; // MSP_SET_MOTOR

            checksum = bufView[3] ^ bufView[4];

            for (let i = 0; i < 16; i += 2) {
                bufView[i + 5] = FC.MOTOR_CONFIG.mincommand & 0x00FF;
                bufView[i + 6] = FC.MOTOR_CONFIG.mincommand >> 8;

                checksum ^= bufView[i + 5];
                checksum ^= bufView[i + 6];
            }

            bufView[5 + 16] = checksum;

            sendFn(connectionId, bufferOut, function () {
                serial.disconnect();
            });
        }, 100);
    } else if (connectionId) {
        serial.disconnect();
    }
}

function closeHandler() {
    if (!GUI.isCordova()) {
        this.hide();
    }

    closeSerial();

    if (!GUI.isCordova()) {
        this.close(true);
    }
}

//Process to execute to real start the app
function startProcess() {
    // translate to user-selected language
    i18n.localizePage();

    GUI.log(i18n.getMessage('infoVersions', {
        operatingSystem: GUI.operating_system,
        configuratorVersion: `${CONFIGURATOR.version} (${CONFIGURATOR.gitChangesetId})` }));

    if (GUI.isNWJS()) {
        let nwWindow = GUI.nwGui.Window.get();
        nwWindow.on('new-win-policy', function(frame, url, policy) {
            // do not open the window
            policy.ignore();
            // and open it in external browser
            GUI.nwGui.Shell.openExternal(url);
        });
        nwWindow.on('close', closeHandler);
        // TODO: Remove visibilitychange Listener when upgrading to NW2
        // capture Command H on MacOS and change it to minimize
        document.addEventListener("visibilitychange", function() {
            if (GUI.operating_system === "MacOS" && document.visibilityState === "hidden") {
                nwWindow.minimize();
            }
        }, false);
    } else if (GUI.isCordova()) {
        window.addEventListener('beforeunload', closeHandler);
        document.addEventListener('backbutton', function(e) {
            e.preventDefault();
            navigator.notification.confirm(
                i18n.getMessage('cordovaExitAppMessage'),
                function(stat) {
                    if (stat === 1) {
                        navigator.app.exitApp();
                    }
                },
                i18n.getMessage('cordovaExitAppTitle'),
                [i18n.getMessage('yes'),i18n.getMessage('no')]
            );
        });
    }

    $('.connect_b a.connect').removeClass('disabled');
    // with Vue reactive system we don't need to call these,
    // our view is reactive to model changes
    // updateTopBarVersion();

    if (!GUI.isOther()) {
        checkForConfiguratorUpdates();
    }

    // log webgl capability
    // it would seem the webgl "enabling" through advanced settings will be ignored in the future
    // and webgl will be supported if gpu supports it by default (canary 40.0.2175.0), keep an eye on this one
    document.createElement('canvas');

    // log library versions in console to make version tracking easier
    console.log(`Libraries: jQuery - ${$.fn.jquery}, d3 - ${d3.version}, three.js - ${THREE.REVISION}`);

    if (GUI.isCordova()) {
        UI_PHONES.init();
    }

    const ui_tabs = $('#tabs > ul');
    $('a', ui_tabs).click(function () {
        if ($(this).parent().hasClass('active') === false && !GUI.tab_switch_in_progress) { // only initialize when the tab isn't already active
            const self = this;

            const tabClass = $(self).parent().prop('class');
            const tabRequiresConnection = $(self).parent().hasClass('mode-connected');

            var tabName = tabClass.substring(4);
            var tabText = $(self).text();

            if (GUI.connect_lock) { // tab switching disabled while operation is in progress
                GUI.log(i18n.getMessage('tabSwitchWaitForOperation'));
                return;
            }

            if (tabRequiresConnection && !CONFIGURATOR.connectionValid) {
                GUI.log(i18n.getMessage('tabSwitchConnectionRequired'));
                return;
            }

            GUI.tab_switch_allowed(function () {

                if (GUI.allowedTabs.indexOf(tabName) < 0 && tabText === "Firmware Flasher") {
                    if (GUI.connected_to || GUI.connecting_to) {
                        $('a.connect').click();
                    } else {
                        self.disconnect();
                    }
                    $('div.open_firmware_flasher a.flash').click();
                }

                if (GUI.defaultAllowedFCTabsWhenConnected.indexOf(tabName) != -1) {
                    GUI.saveDefaultTab(tabName);
                }

                GUI.tab_switch_cleanup(function () {
                    // disable active firmware flasher if it was active
                    if ($('div#flashbutton a.flash_state').hasClass('active') && $('div#flashbutton a.flash').hasClass('active')) {
                        $('div#flashbutton a.flash_state').removeClass('active');
                        $('div#flashbutton a.flash').removeClass('active');
                    }
                    // disable previously active tab highlight
                    $('li', ui_tabs).removeClass('active');

                    // detach listeners and remove element data
                    const content = $('#content');
                    content.empty();

                    // display loading screen
                    $('#cache .data-loading').clone().appendTo(content);

                    // Highlight selected tab
                    $(self).parent().addClass('active');

                    if (TABS[tabName] && !GUI.reboot_in_progress) {
                        const tabObj = TABS[tabName];
                        tabObj.tabName = tabName;
                        GUI.active_tab = tabName;
                        GUI.current_tab = tabObj;
                        GUI.tab_switch_in_progress = true;

                        function tabInitialize() {
                            tabObj.initialize(function () {
                                GUI.tab_switch_in_progress = false;
                            });
                        }

                        if (GUI.connected_to) {
                            mspHelper.setArmingEnabled(tabObj.armingEnabled === true && FC.CONFIG.enableArmingFlag === true, tabInitialize);
                        }
                        else {
                            tabInitialize();
                        }
                    }
                    else {
                        GUI.active_tab = null;
                        GUI.current_tab = null;
                        GUI.tab_switch_in_progress = false;
                    }
                });
            });
        }
    });

    $('#tabs ul.mode-disconnected li a:first').click();

    ConfigStorage.get('zoomLevel', function (result) {
        if (result.zoomLevel) {
            GUI.set_zoom(result.zoomLevel, false);
        }
    });

    $(document).on('wheel', function (ev) {
        const zoomMin = 50;
        const zoomMax = 200;
        const zoomStep = 10;

        let zoom_level = GUI.zoom_level;

        if (ev.ctrlKey) {
            if (ev.originalEvent.deltaY > 0)
                zoom_level = Math.min(zoom_level - zoomStep, zoomMax);
            else
                zoom_level = Math.max(zoom_level + zoomStep, zoomMin);

            GUI.set_zoom(zoom_level, true);
        }
    });

    $("#content").on('keydown', 'input[type="number"]', function (e) {
        // whitelist all that we need for numeric control
        const whitelist = [
            96, 97, 98, 99, 100, 101, 102, 103, 104, 105,       // numpad
            48, 49, 50, 51, 52, 53, 54, 55, 56, 57,             // number keys
            109, 189,                                           // minus on numpad and in standard keyboard
            190, 110,                                           // decimal point
            37, 38, 39, 40,                                     // arrows
            8, 46, 9, 13                                        // backspace, delete, tab, enter
        ];

        if (whitelist.indexOf(e.keyCode) === -1) {
            e.preventDefault();
        }
    });

    // listen to all input change events and adjust the value within limits if necessary
    $("#content").on('focus', 'input[type="number"]', function () {
        const element = $(this);
        const value = element.val();
        if (!isNaN(value)) {
            element.data('previousValue', parseFloat(value));
        }
    });

    $("#content").on('change', 'input[type="number"]', function () {
        const element = $(this);
        const value = getNumberInput(element);
        element.val(value);
    });

    $("#showlog").on('click', function () {
        let state = $(this).data('state');
        if (state) {
            setTimeout(function() {
                const command_log = $('div#log');
                command_log.scrollTop($('div.wrapper', command_log).height());
            }, 200);
            $("#log").removeClass('active');
            $("#tab-content-container").removeClass('logopen');
            $("#scrollicon").removeClass('active');
            ConfigStorage.set({'logopen': false});

            state = false;
        } else {
            $("#log").addClass('active');
            $("#tab-content-container").addClass('logopen');
            $("#scrollicon").addClass('active');
            ConfigStorage.set({'logopen': true});

            state = true;
        }
        $(this).text(state ? i18n.getMessage('logActionHide') : i18n.getMessage('logActionShow'));
        $(this).data('state', state);
    });

    ConfigStorage.get('logopen', function (result) {
        if (result.logopen) {
            $("#showlog").trigger('click');
        }
    });

/**
    ConfigStorage.get('permanentExpertMode', function (result) {
        const expertModeCheckbox = 'input[name="expertModeCheckbox"]';
        if (result.permanentExpertMode) {
            $(expertModeCheckbox).prop('checked', true);
        }

        $(expertModeCheckbox).change(function () {
            const checked = $(this).is(':checked');

            if (FC.FEATURE_CONFIG && FC.FEATURE_CONFIG.features !== 0) {
                updateTabList(FC.FEATURE_CONFIG.features);
            }

        }).change();
    });
**/

    ConfigStorage.get('cliAutoComplete', function (result) {
        CliAutoComplete.setEnabled(typeof result.cliAutoComplete == 'undefined' || result.cliAutoComplete); // On by default
    });

    ConfigStorage.get('darkTheme', function (result) {
        if (result.darkTheme === undefined || typeof result.darkTheme !== "number") {
            // sets dark theme to auto if not manually changed
            setDarkTheme(2);
        } else {
            setDarkTheme(result.darkTheme);
        }
    });
    if (GUI.isCordova()) {
        let darkMode = false;
        const checkDarkMode = function() {
            cordova.plugins.ThemeDetection.isDarkModeEnabled(function(success) {
                if (success.value !== darkMode) {
                    darkMode = success.value;
                    DarkTheme.autoSet();
                }
            });
        };
        setInterval(checkDarkMode, 500);
    } else {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function() {
            DarkTheme.autoSet();
        });
    }
}

function setDarkTheme(enabled) {
    DarkTheme.setConfig(enabled);
}

function checkForConfiguratorUpdates() {
    const releaseChecker = new ReleaseChecker('configurator', 'https://api.github.com/repos/rotorflight/rotorflight-configurator/releases');

    releaseChecker.loadReleaseData(notifyOutdatedVersion);
}

function notifyOutdatedVersion(releaseData) {
    ConfigStorage.get('checkForConfiguratorUnstableVersions', function (result) {
        let showUnstableReleases = false;
        if (result.checkForConfiguratorUnstableVersions) {
            showUnstableReleases = true;
        }

        const versions = releaseData.filter(function (version) {
            var versionFromTagExpression = /release\/(.*)/;
            var match = versionFromTagExpression.exec(version.tag_name);
            if (match) {
                version.release = semver.valid(match[1]);
                if (version.release && (!semver.prerelease(version.release) || showUnstableReleases)) {
                    return version;
                }
            }
            return null;
        }).sort(function (v1, v2) {
            return semver.compare(v2.release, v1.release);
        });

        if (versions.length > 0) {
            CONFIGURATOR.latestVersion = versions[0].release;
            CONFIGURATOR.latestVersionReleaseUrl = versions[0].html_url;
            console.log(`Latest Configurator version is ${CONFIGURATOR.latestVersion}`);
        }

        function configuratorVersionDialog(message, releaseUrl)
        {
            const dialog = $('.dialogConfiguratorUpdate')[0];

            $('.dialogConfiguratorUpdate-content').html(message);

            $('.dialogConfiguratorUpdate-closebtn').click(function() {
                dialog.close();
            });

            $('.dialogConfiguratorUpdate-websitebtn').click(function() {
                dialog.close();
                window.open(releaseUrl, '_blank');
            });

            dialog.showModal();
        }

        if (CONFIGURATOR.version.startsWith("0.0.0")) {
            const message = i18n.getMessage('configuratorDevelopmentNotice');
            configuratorVersionDialog(message, CONFIGURATOR.allReleasesUrl);
        }
        else if (semver.lt(CONFIGURATOR.version, CONFIGURATOR.latestVersion)) {
            const message = i18n.getMessage('configuratorUpdateNotice', [CONFIGURATOR.latestVersion, CONFIGURATOR.latestVersionReleaseUrl]);
            configuratorVersionDialog(message, CONFIGURATOR.latestVersionReleaseUrl);
        }
    });
}

/**
function isExpertModeEnabled() {
    return $('input[name="expertModeCheckbox"]').is(':checked');
}
**/

function updateTabList(features) {
    $('#tabs ul.mode-connected li.tab_gps').toggle(features.isEnabled('GPS'));
    $('#tabs ul.mode-connected li.tab_led_strip').toggle(features.isEnabled('LED_STRIP'));
}

function zeroPad(value, width) {

    let valuePadded = String(value);

    while (valuePadded.length < width) {
        valuePadded = `0${value}`;
    }

    return valuePadded;
}

function getNumberInput(query) {
    const elem = $(query);
    const step = parseFloat(elem.prop('step')) || 1;
    const min = parseFloat(elem.prop('min'));
    const max = parseFloat(elem.prop('max'));

    let val = parseFloat(elem.val());

    // if entered value is illegal use previous value instead
    if (isNaN(val)) {
        val = elem.data('previousValue') || 0;
    }

    // only adjust minimal end if bound is set
    if (elem.prop('min') && val < min) {
        val = min;
    }

    // only adjust maximal end if bound is set
    if (elem.prop('max') && val > max) {
        val = max;
    }

    // Round to steps
    const decimals = (step % 1 === 0) ? 0 : String(step).split('.')[1].length;
    const value = Math.round(val / step) * step;
    val = value.toFixed(decimals);

    return val;
}

function getIntegerValue(query, scale=1) {
    return Math.round(getNumberInput(query) * scale);
}

function getFloatValue(query, scale=1) {
    return getNumberInput(query) * scale;
}

function deep_copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function generateFilename(prefix, suffix) {
    const date = new Date();
    let filename = prefix;

    if (FC.CONFIG) {
        if (FC.CONFIG.flightControllerIdentifier) {
            filename = `${FC.CONFIG.flightControllerIdentifier}_${filename}`;
        }
        if(FC.CONFIG.name && FC.CONFIG.name.trim() !== '') {
            filename = `${filename}_${FC.CONFIG.name.trim().replace(' ', '_')}`;
        }
    }

    const yyyymmdd = `${date.getFullYear()}${zeroPad(date.getMonth() + 1, 2)}${zeroPad(date.getDate(), 2)}`;
    const hhmmss = `${zeroPad(date.getHours(), 2)}${zeroPad(date.getMinutes(), 2)}${zeroPad(date.getSeconds(), 2)}`;
    filename = `${filename}_${yyyymmdd}_${hhmmss}`;

    return `${filename}.${suffix}`;
}

function showErrorDialog(message) {
   const dialog = $('.dialogError')[0];

    $('.dialogError-content').html(message);

    $('.dialogError-closebtn').click(function() {
        dialog.close();
    });

    dialog.showModal();
}

function showDialogDynFiltersChange() {
    const dialogDynFiltersChange = $('.dialogDynFiltersChange')[0];

    if (!dialogDynFiltersChange.hasAttribute('open')) {
        dialogDynFiltersChange.showModal();

        $('.dialogDynFiltersChange-confirmbtn').click(function() {
            dialogDynFiltersChange.close();
        });
    }
}

function showTabExitDialog(tab, callback) {
    const dialog = $('.dialogTabExit')[0];

    function close() {
        $('.tabExitSaveBtn').off('click');
        $('.tabExitRevertBtn').off('click');
        $('.tabExitCancelBtn').off('click');
        dialog.close();
    }

    $('.tabExitSaveBtn').click(function() {
        close();
        tab.save(callback);
    });
    $('.tabExitRevertBtn').click(function() {
        close();
        tab.revert(callback);
    });
    $('.tabExitCancelBtn').click(function() {
        close();
    });

    dialog.showModal();
};

import semver from "semver";

import { portUsage } from "@/js/port_usage.svelte.js";

export function initializeSerialBackend() {
    GUI.updateManualPortVisibility = function(){
        const selected_port = $('div#port-picker #port option:selected');
        if (selected_port.data().isManual) {
            $('#port-override-option').show();
        }
        else {
            $('#port-override-option').hide();
        }
        if (selected_port.data().isVirtual) {
            $('#firmware-virtual-option').show();
        }
        else {
            $('#firmware-virtual-option').hide();
        }
        if (selected_port.data().isDFU) {
            $('select#baud').hide();
        }
        else {
            $('select#baud').show();
        }
    };

    GUI.updateManualPortVisibility();

    $('#port-override').on("change", function() {
        ConfigStorage.set({'portOverride': $('#port-override').val()});
    });

    ConfigStorage.get('portOverride', function (data) {
        $('#port-override').val(data.portOverride);
    });

    $('div#port-picker #port').on("change", function() {
        GUI.updateManualPortVisibility();
    });

    $('div.connect_controls a.connect').on("click", function() {
        if (GUI.connect_lock != true) { // GUI control overrides the user control

            const thisElement = $(this);
            const clicks = thisElement.data('clicks');

            const toggleStatus = function() {
                thisElement.data("clicks", !clicks);
            };

            GUI.configuration_loaded = false;

            const selected_baud = parseInt($('div#port-picker #baud').val());
            const selectedPort = $('div#port-picker #port option:selected');

            let portName;
            if (selectedPort.data().isManual) {
                portName = $('#port-override').val();
            } else {
                portName = String($('div#port-picker #port').val());
            }

            if (selectedPort.data().isDFU) {
                $('select#baud').hide();
            } else if (portName !== '0') {
                if (!clicks) {
                    console.log(`${serial.connectionType}: connecting to: ${portName}`);
                    GUI.connecting_to = portName;

                    // lock port select & baud while we are connecting / connected
                    $('div#port-picker #port, div#port-picker #baud, div#port-picker #delay').prop('disabled', true);
                    $('div.connect_controls div.connect_state').text(i18n.getMessage('connecting'));

                    if (selectedPort.data().isVirtual) {
                        CONFIGURATOR.virtualMode = true;
                        CONFIGURATOR.virtualApiVersion = $('#firmware-version-dropdown :selected').val();

                        serial.connect('virtual', {}, onOpenVirtual);
                    } else {
                        serial.connect(portName, {bitrate: selected_baud}, onOpen);
                    }
                    toggleStatus();
                } else {
                    if ($('div#flashbutton a.flash_state').hasClass('active') && $('div#flashbutton a.flash').hasClass('active')) {
                        $('div#flashbutton a.flash_state').removeClass('active');
                        $('div#flashbutton a.flash').removeClass('active');
                    }
                    GUI.timeout_kill_all();
                    GUI.interval_kill_all();
                    GUI.tab_switch_cleanup();
                    GUI.tab_switch_in_progress = false;

                    function onFinishCallback() {
                        finishClose(toggleStatus);
                    }

                    globalThis.mspHelper.setArmingEnabled(true, onFinishCallback);
                }
            }
       }
    });

    $('div.open_firmware_flasher a.flash').on("click", function() {
        if ($('div#flashbutton a.flash_state').hasClass('active') && $('div#flashbutton a.flash').hasClass('active')) {
            $('div#flashbutton a.flash_state').removeClass('active');
            $('div#flashbutton a.flash').removeClass('active');
            $('#tabs ul.mode-disconnected .tab_landing a').trigger("click");
        } else {
            $('#tabs ul.mode-disconnected .tab_firmware_flasher a').trigger("click");
            $('div#flashbutton a.flash_state').addClass('active');
            $('div#flashbutton a.flash').addClass('active');
        }
    });

    // auto-connect
    ConfigStorage.get('auto_connect', function (result) {
        if (result.auto_connect === undefined || result.auto_connect) {
            // default or enabled by user
            GUI.auto_connect = true;

            $('input.auto_connect').prop('checked', true);
            $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectEnabled'));

            $('select#baud').val(115200).prop('disabled', true);
        } else {
            // disabled by user
            GUI.auto_connect = false;

            $('input.auto_connect').prop('checked', false);
            $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectDisabled'));
        }

        // bind UI hook to auto-connect checkbos
        $('input.auto_connect').change(function () {
            GUI.auto_connect = $(this).is(':checked');

            // update title/tooltip
            if (GUI.auto_connect) {
                $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectEnabled'));

                $('select#baud').val(115200).prop('disabled', true);
            } else {
                $('input.auto_connect, span.auto_connect').prop('title', i18n.getMessage('autoConnectDisabled'));

                if (!GUI.connected_to && !GUI.connecting_to) $('select#baud').prop('disabled', false);
            }

            ConfigStorage.set({'auto_connect': GUI.auto_connect});
        });
    });

    // Show all ports
    if (GUI.operating_system === 'Android') {
        // port filtering does not work on Android as port names do not get populated on Android
        GUI.show_all_ports = true;
        $('div #show-all-ports-switch').hide();
    } else {
        ConfigStorage.get('show_all_ports', function (result) {
            if (result.show_all_ports === undefined || !result.show_all_ports) {
                GUI.show_all_ports = false;
                $('input.show_all_ports, span.show_all_ports').prop('title', i18n.getMessage('showAllPortsDisabled'));
                $('input.show_all_ports').prop('checked', false);
            } else {
                GUI.show_all_ports = true;
                $('input.show_all_ports, span.show_all_ports').prop('title', i18n.getMessage('showAllPortsEnabled'));
                $('input.show_all_ports').prop('checked', true);
            }

            // bind UI hook to show all ports checkbox
            $('input.show_all_ports').on("change", function () {
                GUI.show_all_ports = $(this).is(':checked');

                // update title/tooltip
                if (GUI.show_all_ports) {
                    $('input.show_all_ports, span.show_all_ports').prop('title', i18n.getMessage('showAllPortsEnabled'));
                } else {
                    $('input.show_all_ports, span.show_all_ports').prop('title', i18n.getMessage('showAllPortsDisabled'));
                }

                ConfigStorage.set({ 'show_all_ports': GUI.show_all_ports });
                PortHandler.showAllPorts(GUI.show_all_ports);
            });
        });
    }

    PortHandler.initialize(GUI.show_all_ports);
}

function finishClose(finishedCallback) {
    if (GUI.isCordova()) {
        UI_PHONES.reset();
    }

    const wasConnected = CONFIGURATOR.connectionValid;

    // close reset to custom defaults dialog
    $('#dialogResetToCustomDefaults')[0].close();

    serial.disconnect(onClosed);

    MSP.disconnect_cleanup();
    portUsage.reset();
    // To trigger the UI updates by Vue reset the state.
    FC.resetState();

    GUI.reboot_in_progress = false;
    GUI.connected_to = false;
    GUI.allowedTabs = GUI.defaultAllowedTabsWhenDisconnected.slice();

    // close problems dialog
    $('#dialogReportProblems-closebtn').trigger("click");

    // unlock port select & baud
    $('div#port-picker #port').prop('disabled', false);
    if (!GUI.auto_connect) $('div#port-picker #baud').prop('disabled', false);

    // reset connect / disconnect button
    $('div.connect_controls a.connect').removeClass('active');
    $('div.connect_controls div.connect_state').text(i18n.getMessage('connect'));

    // reset active sensor indicators
    sensor_status(0);

    if (wasConnected) {
        // detach listeners and remove element data
        $('#content').empty();
    }

    $('#tabs .tab_landing a').trigger("click");

    finishedCallback();
}

function setConnectionTimeout() {
    // disconnect after 10 seconds with error if we don't get IDENT data
    GUI.timeout_add('connecting', function () {
        if (!CONFIGURATOR.connectionValid) {
            GUI.log(i18n.getMessage('noConfigurationReceived'));
            $('div.connect_controls a.connect').trigger("click"); // disconnect
        }
    }, 10000);
}

function resetConnectionTimeout() {
    GUI.timeout_remove('connecting');
}

async function onOpen(openInfo) {
    if (openInfo) {
        CONFIGURATOR.virtualMode = false;

        // update connected_to
        GUI.connected_to = GUI.connecting_to;

        // reset connecting_to
        GUI.connecting_to = false;
        GUI.log(i18n.getMessage('serialPortOpened', serial.connectionType === 'serial' ? [serial.connectionId] : [openInfo.socketId]));

        // save selected port with chrome.storage if the port differs
        ConfigStorage.get('last_used_port', function (result) {
            if (result.last_used_port) {
                if (result.last_used_port !== GUI.connected_to) {
                    // last used port doesn't match the one found in local db, we will store the new one
                    ConfigStorage.set({'last_used_port': GUI.connected_to});
                }
            } else {
                // variable isn't stored yet, saving
                ConfigStorage.set({'last_used_port': GUI.connected_to});
            }
        });

        serial.onReceive.addListener(read_serial);
        setConnectionTimeout();
        FC.resetState();

        globalThis.mspHelper = new MspHelper();
        MSP.listen(globalThis.mspHelper.process_data.bind(globalThis.mspHelper));
        console.log(`Requesting configuration data`);

        // Gather version data and validate to ensure compatibility
        try {
            await MSP.promise(MSPCodes.MSP_API_VERSION, false);
            const { API_VERSION_MIN_SUPPORTED, API_VERSION_MAX_SUPPORTED } = CONFIGURATOR;
            const { apiVersion } = FC.CONFIG;

            GUI.log(i18n.getMessage('apiVersionReceived', [apiVersion]));

            if (!semver.valid(apiVersion)) {
                throw showConnectWarningDialogAndDisconnect('apiVersionInvalid', apiVersion);
            } else if (!semver.gte(apiVersion, API_VERSION_MIN_SUPPORTED) || !semver.lte(apiVersion, API_VERSION_MAX_SUPPORTED)) {
                throw showConnectWarningDialogAndConnectCli('firmwareVersionNotSupported');
            }
            await MSP.promise(MSPCodes.MSP_FC_VARIANT, false);

            const { flightControllerIdentifier } = FC.CONFIG;
            if (flightControllerIdentifier !== 'RTFL') {
                throw showConnectWarningDialogAndConnectCli('firmwareTypeNotSupported');
            }
            await MSP.promise(MSPCodes.MSP_FC_VERSION, false);

            await MSP.promise(MSPCodes.MSP_BUILD_INFO, false);
            const { FW_VERSION_MIN_SUPPORTED, FW_VERSION_MAX_SUPPORTED } = CONFIGURATOR;
            const { buildVersion, buildRevision, buildInfo } = FC.CONFIG;

            GUI.log(i18n.getMessage('firmwareInfoReceived', [flightControllerIdentifier, buildVersion]));
            GUI.log(i18n.getMessage('buildInfoReceived', [buildRevision, buildInfo]));
            if (!semver.valid(buildVersion)) {
                throw showConnectWarningDialogAndDisconnect('firmwareVersionInvalid', buildVersion);
            } else if (!semver.gte(buildVersion, FW_VERSION_MIN_SUPPORTED) || !semver.lte(buildVersion, FW_VERSION_MAX_SUPPORTED)) {
                throw showConnectWarningDialogAndConnectCli('firmwareVersionNotSupported');
            }

            await MSP.promise(MSPCodes.MSP_BOARD_INFO, false);
            processBoardInfo();
        } catch (error) {
            console.error("Error during connection:", error);
            GUI.log(error);
        }
    }
    else {
        GUI.log(i18n.getMessage('serialPortOpenFail'));
        console.log('Failed to open serial port');
        abortConnect();
    }
}

function showConnectWarningDialogAndConnectCli(messageKey, ...params) {
    const msg = showConnectWarningDialog(messageKey, params);
    connectCli();
    return msg;
}

function showConnectWarningDialogAndDisconnect(messageKey, ...params) {
    const msg = showConnectWarningDialog(messageKey, params);
    $('div.connect_controls a.connect').trigger("click"); // trigger disconnect
    return msg;
}

function showConnectWarningDialog(messageKey, ...params) {
    const msg = i18n.getMessage(messageKey, params);
    const dialog = $('.dialogConnectWarning')[0];
    $('.dialogConnectWarning-content').html(msg);
    $('.dialogConnectWarning-closebtn').on("click", function() { dialog.close(); });
    dialog.showModal();
    return msg;
}

function onOpenVirtual() {
    GUI.connected_to = GUI.connecting_to;
    GUI.connecting_to = false;

    CONFIGURATOR.connectionValid = true;

    globalThis.mspHelper = new MspHelper();

    VirtualFC.setVirtualConfig();

    processBoardInfo();

    update_dataflash_global();
    sensor_status(FC.CONFIG.activeSensors);
    updateTabList(FC.FEATURE_CONFIG.features);
}

function abortConnect() {
    $('div#connectbutton div.connect_state').text(i18n.getMessage('connect'));
    $('div#connectbutton a.connect').removeClass('active');

    // unlock port select & baud
    $('div#port-picker #port, div#port-picker #baud, div#port-picker #delay').prop('disabled', false);

    // reset data
    $('div#connectbutton a.connect').data("clicks", false);
}

function processBoardInfo() {
    GUI.log(i18n.getMessage('boardInfoReceived', [FC.getHardwareName(), FC.CONFIG.boardVersion]));

    if (FC.CONFIG.configurationState == FC.CONFIGURATION_STATES.DEFAULTS_BARE &&
        bit_check(FC.CONFIG.targetCapabilities, FC.TARGET_CAPABILITIES_FLAGS.SUPPORTS_CUSTOM_DEFAULTS) &&
        bit_check(FC.CONFIG.targetCapabilities, FC.TARGET_CAPABILITIES_FLAGS.HAS_CUSTOM_DEFAULTS)) {
        const dialog = $('#dialogResetToCustomDefaults')[0];

        $('#dialogResetToCustomDefaults-acceptbtn').off("click").on("click", async () => {
            $('#dialogResetToCustomDefaults-acceptbtn').off("click");
            $('#dialogResetToCustomDefaults-cancelbtn').off("click");
            dialog.close();
            await MSP.promise(MSPCodes.MSP_RESET_CONF, [globalThis.mspHelper.RESET_TYPES.CUSTOM_DEFAULTS]);
            GUI.timeout_add('disconnect', function () {
                $('div.connect_controls a.connect').trigger("click");
            }, 0);
        });

        $('#dialogResetToCustomDefaults-cancelbtn').off("click").on("click", () => {
            $('#dialogResetToCustomDefaults-acceptbtn').off("click");
            $('#dialogResetToCustomDefaults-cancelbtn').off("click");
            dialog.close();
            setConnectionTimeout();
            checkReportProblems();
        });
        resetConnectionTimeout();
        dialog.showModal();
        return;
    }
    checkReportProblems();
}

async function checkReportProblems() {
    const problemItemTemplate = $('#dialogReportProblems-listItemTemplate');

    function checkReportProblem(problemName, problemDialogList) {
        if (bit_check(FC.CONFIG.configurationProblems, FC.CONFIGURATION_PROBLEM_FLAGS[problemName])) {
            problemItemTemplate.clone().html(i18n.getMessage(`reportProblemsDialog${problemName}`)).appendTo(problemDialogList);
            return true;
        }
        return false;
    }

    await MSP.promise(MSPCodes.MSP_STATUS, false);

    let needsProblemReportingDialog = false;
    const problemDialogList = $('#dialogReportProblems-list');
    problemDialogList.empty();

    if (semver.gt(FC.CONFIG.apiVersion, CONFIGURATOR.API_VERSION_MAX_SUPPORTED)) {
        const problemName = 'API_VERSION_MAX_SUPPORTED';
        problemItemTemplate.clone().html(i18n.getMessage(`reportProblemsDialog${problemName}`,
            [CONFIGURATOR.latestVersion, CONFIGURATOR.latestVersionReleaseUrl, CONFIGURATOR.version, FC.CONFIG.buildVersion])).appendTo(problemDialogList);
        needsProblemReportingDialog = true;
    }

    if (FC.CONFIG.configurationState == FC.CONFIGURATION_STATES.DEFAULTS_BARE &&
        bit_check(FC.CONFIG.targetCapabilities, FC.TARGET_CAPABILITIES_FLAGS.SUPPORTS_CUSTOM_DEFAULTS) &&
        !bit_check(FC.CONFIG.targetCapabilities, FC.TARGET_CAPABILITIES_FLAGS.HAS_CUSTOM_DEFAULTS)) {
        const problemName = 'UNIFIED_FIRMWARE_WITHOUT_DEFAULTS';
        problemItemTemplate.clone().html(i18n.getMessage(`reportProblemsDialog${problemName}`)).appendTo(problemDialogList);
        needsProblemReportingDialog = true;
    }

    //needsProblemReportingDialog = checkReportProblem('MOTOR_PROTOCOL_DISABLED', problemDialogList) || needsProblemReportingDialog;

    if (have_sensor(FC.CONFIG.activeSensors, 'acc')) {
        needsProblemReportingDialog = checkReportProblem('ACC_NEEDS_CALIBRATION', problemDialogList) || needsProblemReportingDialog;
    }

    if (needsProblemReportingDialog) {
        const problemDialog = $('#dialogReportProblems')[0];
        $('#dialogReportProblems-closebtn').off("click").on("click", () => {
            $('#dialogReportProblems-closebtn').off("click");
            problemDialog.close();
        });
        problemDialog.showModal();
        $('#dialogReportProblems').scrollTop(0);
        $('#dialogReportProblems-closebtn').trigger("focus");
    }

    processUid();
}

async function processUid() {
    await MSP.promise(MSPCodes.MSP_UID, false);

    const UID = FC.CONFIG.uid[0].toString(16) + FC.CONFIG.uid[1].toString(16) + FC.CONFIG.uid[2].toString(16);
    GUI.log(i18n.getMessage('uniqueDeviceIdReceived', [UID]));
    processName();
}

async function processName() {
    await MSP.promise(MSPCodes.MSP_NAME, false);
    GUI.log(i18n.getMessage('craftNameReceived', [FC.CONFIG.name]));
    setRtc();
}

async function setRtc() {
    await MSP.promise(MSPCodes.MSP_SET_RTC, globalThis.mspHelper.crunch(MSPCodes.MSP_SET_RTC));
    GUI.log(i18n.getMessage('realTimeClockSet'));
    finishOpen();
}

function finishOpen() {
    CONFIGURATOR.connectionValid = true;
    GUI.reboot_in_progress = false;
    GUI.allowedTabs = GUI.defaultAllowedFCTabsWhenConnected.slice();

    if (GUI.isCordova()) {
        UI_PHONES.reset();
    }

    onConnect();

    GUI.selectDefaultTabWhenConnected();
}

function connectCli() {
    CONFIGURATOR.connectionValid = true; // making it possible to open the CLI tab
    GUI.allowedTabs = ['cli'];
    onConnect();
    $('#tabs .tab_cli a').trigger("click");
}

function onConnect() {
    console.log("On connnection");
    if ($('div#flashbutton a.flash_state').hasClass('active') && $('div#flashbutton a.flash').hasClass('active')) {
        $('div#flashbutton a.flash_state').removeClass('active');
        $('div#flashbutton a.flash').removeClass('active');
    }
    resetConnectionTimeout();
    $('div#connectbutton div.connect_state').text(i18n.getMessage('disconnect')).addClass('active');
    $('div#connectbutton a.connect').addClass('active');

    $('#tabs ul.mode-disconnected').hide();
    $('#tabs ul.mode-connected-cli').show();

    // show only appropriate tabs
    $('#tabs ul.mode-connected li').hide();
    $('#tabs ul.mode-connected li').filter(function () {
        const classes = $(this).attr("class").split(/\s+/);
        let found = false;
        $.each(GUI.allowedTabs, (_index, value) => {
                const tabName = `tab_${value}`;
                if ($.inArray(tabName, classes) >= 0) {
                    found = true;
                }
            });

        if (FC.CONFIG.boardType == 0) {
            if (classes.indexOf("osd-required") >= 0) {
                found = false;
            }
        }

        return found;
    }).show();

    if (FC.CONFIG.flightControllerVersion !== '') {
        FC.BEEPER_CONFIG.beepers = new Beepers(FC.CONFIG);
        FC.BEEPER_CONFIG.dshotBeaconConditions = new Beepers(FC.CONFIG, [ "RX_LOST", "RX_SET" ]);

        $('#tabs ul.mode-connected').show();

        MSP.promise(MSPCodes.MSP_FEATURE_CONFIG, false)
            .then(() => MSP.promise(MSPCodes.MSP_BATTERY_CONFIG, false))
            .then(() => MSP.promise(MSPCodes.MSP_STATUS, false))
            .then(() => MSP.promise(MSPCodes.MSP_DATAFLASH_SUMMARY, false));

        if (FC.CONFIG.boardType == 0 || FC.CONFIG.boardType == 2) {
            startLiveDataRefreshTimer();
        }
    }

    const sensorState = $('#sensor-status');
    sensorState.show();

    const portPicker = $('#portsinput');
    portPicker.hide();

    const dataflash = $('#dataflash_wrapper_global');
    dataflash.show();
}

function onClosed(result) {
    if (result) { // All went as expected
        GUI.log(i18n.getMessage('serialPortClosedOk'));
    } else { // Something went wrong
        GUI.log(i18n.getMessage('serialPortClosedFail'));
    }

    $('#tabs ul.mode-connected').hide();
    $('#tabs ul.mode-connected-cli').hide();
    $('#tabs ul.mode-disconnected').show();

    const sensorState = $('#sensor-status');
    sensorState.hide();

    const portPicker = $('#portsinput');
    portPicker.show();

    const dataflash = $('#dataflash_wrapper_global');
    dataflash.hide();

    const battery = $('#quad-status_wrapper');
    battery.hide();

    MSP.clearListeners();

    CONFIGURATOR.connectionValid = false;
    CONFIGURATOR.cliEngineValid = false;
    CONFIGURATOR.cliEngineActive = false;
    CONFIGURATOR.cliTab = "";
}

export function read_serial(info) {
    if (!CONFIGURATOR.cliEngineActive) {
        MSP.read(info);
    } else {
        switch(CONFIGURATOR.cliTab) {
            case 'cli':
                TABS.cli.read(info);
                break;
            case 'presets':
                TABS.presets.read(info);
                break;
        }
    }
}

export function sensor_status(sensors_detected) {
    // initialize variable (if it wasn't)
    if (!sensor_status.previous_sensors_detected) {
        sensor_status.previous_sensors_detected = -1; // Otherwise first iteration will not be run if sensors_detected == 0
    }

    // update UI (if necessary)
    if (sensor_status.previous_sensors_detected == sensors_detected) {
        return;
    }

    // set current value
    sensor_status.previous_sensors_detected = sensors_detected;

    const eSensorStatus = $('div#sensor-status');

    if (have_sensor(sensors_detected, 'acc')) {
        $('.accel', eSensorStatus).addClass('on');
        $('.accicon', eSensorStatus).addClass('active');

    } else {
        $('.accel', eSensorStatus).removeClass('on');
        $('.accicon', eSensorStatus).removeClass('active');
    }

    if ((FC.CONFIG.boardType == 0 || FC.CONFIG.boardType == 2) && have_sensor(sensors_detected, 'gyro')) {
        $('.gyro', eSensorStatus).addClass('on');
        $('.gyroicon', eSensorStatus).addClass('active');
    } else {
        $('.gyro', eSensorStatus).removeClass('on');
        $('.gyroicon', eSensorStatus).removeClass('active');
    }

    if (have_sensor(sensors_detected, 'baro')) {
        $('.baro', eSensorStatus).addClass('on');
        $('.baroicon', eSensorStatus).addClass('active');
    } else {
        $('.baro', eSensorStatus).removeClass('on');
        $('.baroicon', eSensorStatus).removeClass('active');
    }

    if (have_sensor(sensors_detected, 'mag')) {
        $('.mag', eSensorStatus).addClass('on');
        $('.magicon', eSensorStatus).addClass('active');
    } else {
        $('.mag', eSensorStatus).removeClass('on');
        $('.magicon', eSensorStatus).removeClass('active');
    }

    if (have_sensor(sensors_detected, 'gps')) {
        $('.gps', eSensorStatus).addClass('on');
    $('.gpsicon', eSensorStatus).addClass('active');
    } else {
        $('.gps', eSensorStatus).removeClass('on');
        $('.gpsicon', eSensorStatus).removeClass('active');
    }

    if (have_sensor(sensors_detected, 'sonar')) {
        $('.sonar', eSensorStatus).addClass('on');
        $('.sonaricon', eSensorStatus).addClass('active');
    } else {
        $('.sonar', eSensorStatus).removeClass('on');
        $('.sonaricon', eSensorStatus).removeClass('active');
    }
}

export function have_sensor(sensors_detected, sensor_code) {
    switch(sensor_code) {
        case 'acc':
            return bit_check(sensors_detected, 0);
        case 'baro':
            return bit_check(sensors_detected, 1);
        case 'mag':
            return bit_check(sensors_detected, 2);
        case 'gps':
            return bit_check(sensors_detected, 3);
        case 'sonar':
            return bit_check(sensors_detected, 4);
        case 'gyro':
            return bit_check(sensors_detected, 5);
    }
    return false;
}

function startLiveDataRefreshTimer() {
    // live data refresh
    GUI.timeout_add('data_refresh', function () { update_live_status(); }, 100);
}

function update_live_status() {

    const statuswrapper = $('#quad-status_wrapper');

    $(".quad-status-contents").css({
       display: 'inline-block'
    });

    if (GUI.active_tab != 'cli' && GUI.active_tab != 'presets') {
        MSP.promise(MSPCodes.MSP_BOXNAMES, false).then(() => {
            return MSP.promise(MSPCodes.MSP_STATUS, false);
        }).then(() => {
            return MSP.promise(MSPCodes.MSP_BATTERY_STATE, false);
        });
    }

    for (let i = 0; i < FC.AUX_CONFIG.length; i++) {
        if (FC.AUX_CONFIG[i] === 'ARM') {
            if (bit_check(FC.CONFIG.mode, i)) {
                $(".armedicon").addClass('active');
            } else {
                $(".armedicon").removeClass('active');
            }
        }
        if (FC.AUX_CONFIG[i] === 'FAILSAFE') {
            if (bit_check(FC.CONFIG.mode, i)) {
                $(".failsafeicon").addClass('active');
            } else {
                $(".failsafeicon").removeClass('active');
            }
        }
    }

    const cells = FC.BATTERY_STATE.cellCount;
    const min = FC.BATTERY_CONFIG.vbatmincellvoltage * cells;
    const max = FC.BATTERY_CONFIG.vbatmaxcellvoltage * cells;
    const warn = FC.BATTERY_CONFIG.vbatwarningcellvoltage * cells;

    const NO_BATTERY_VOLTAGE_MAXIMUM = 1.8;

    if (FC.BATTERY_STATE.voltage < NO_BATTERY_VOLTAGE_MAXIMUM) {
        $(".battery-status").removeClass('state-empty').addClass('state-ok').removeClass('state-warning');
        $(".battery-status").css({ width: "0%", });
    }
    else if (FC.BATTERY_STATE.voltage < min) {
        $(".battery-status").addClass('state-empty').removeClass('state-ok').removeClass('state-warning');
        $(".battery-status").css({ width: "100%", });
    } else {
        $(".battery-status").css({ width: `${((FC.BATTERY_STATE.voltage - min) / (max - min) * 100)}%`, });
        if (FC.BATTERY_STATE.voltage < warn) {
            $(".battery-status").addClass('state-warning').removeClass('state-empty').removeClass('state-ok');
        } else  {
            $(".battery-status").addClass('state-ok').removeClass('state-warning').removeClass('state-empty');
        }
    }

    const last_received = Date.now() - MSP.last_received_timestamp;

    if (last_received < 300) {
        $(".linkicon").addClass('active');
    } else {
        $(".linkicon").removeClass('active');
    }

    statuswrapper.show();
    GUI.timeout_remove('data_refresh');
    startLiveDataRefreshTimer();
}

export function specificByte(num, pos) {
    return 0x000000FF & (num >> (8 * pos));
}

export function bit_check(num, bit) {
    return ((num >> bit) % 2 != 0);
}

export function bit_set(num, bit) {
    return num | 1 << bit;
}

export function bit_clear(num, bit) {
    return num & ~(1 << bit);
}

export function update_dataflash_global() {
    function formatFilesize(bytes) {
        if (bytes < 1024) {
            return bytes + "B";
        }
        const kilobytes = bytes / 1024;

        if (kilobytes < 1024) {
            return Math.round(kilobytes) + "kB";
        }

        const megabytes = kilobytes / 1024;

        return megabytes.toFixed(1) + "MB";
    }

    const supportsDataflash = FC.DATAFLASH.totalSize > 0;

    if (supportsDataflash){
        $(".noflash_global").css({
           display: 'none'
        });

        $(".dataflash-contents_global").css({
           display: 'block'
        });

        $(".dataflash-free_global").css({
           width: (100-(FC.DATAFLASH.totalSize - FC.DATAFLASH.usedSize) / FC.DATAFLASH.totalSize * 100) + "%",
           display: 'block'
        });
        $(".dataflash-free_global div").text('Dataflash: free ' + formatFilesize(FC.DATAFLASH.totalSize - FC.DATAFLASH.usedSize));
     } else {
        $(".noflash_global").css({
           display: 'block'
        });

        $(".dataflash-contents_global").css({
           display: 'none'
        });
     }
}

export function reinitialiseConnection(callback) {
    GUI.reboot_in_progress = true;

    callback?.();
}

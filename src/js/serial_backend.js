import semver from "semver";

import { Beepers } from "@/js/Beepers.js";
import { config } from "@/js/config.svelte.ts";
import { API_VERSION_12_10, CONFIGURATOR } from "@/js/configurator.svelte.js";
import { FC } from "@/js/fc.svelte.js";
import { GUI } from "@/js/gui.js";
import { i18n } from "@/js/localization.js";
import { updateTabList } from "@/js/main.js";
import { MSP } from "@/js/msp.svelte.js";
import { MSPCodes } from "@/js/msp/MSPCodes.js";
import { mspHelper, resetMspHelper } from "@/js/msp/MSPHelper.js";
import { UI_PHONES } from "@/js/phones_ui.js";
import { PortHandler, usbDevices } from "@/js/port_handler.js";
import { portUsage } from "@/js/port_usage.svelte.js";
import { serial } from "@/js/serial.js";
import { TABS } from "@/js/tabs/tabs.js";
import { applyVirtualConfig } from "@/js/virtual_fc.js";

// Web only: the picker's "add device" entries (see
// PortHandler.appendWebRequestOptions). Choosing one asks the browser for
// access to a new device; it is never a device itself.
const WEB_PICKER_REQUEST_VALUES = ['requestserial', 'requestbluetooth', 'DFU'];

function isWebPickerRequestValue(value) {
    return WEB_PICKER_REQUEST_VALUES.includes(String(value));
}

// After a request (granted or not) the picker should not be left on the
// request entry: go back to the last real port, else the first one, else "0".
function lastRealPortValue(el) {
    const previous = el.data('lastRealPortValue');
    if (previous && el.find('option').filter((_, option) => option.value === previous).length) {
        return previous;
    }

    const firstRealPort = el.find('option').filter((_, option) =>
        option.value !== '0' && !isWebPickerRequestValue(option.value),
    ).first().val();

    return firstRealPort || '0';
}

function selectPort(el, value) {
    el.val(value || '0').trigger('change');
}

// List a newly granted device and select it.
function adoptRequestedPort(el, ports, entry, fallbackValue) {
    const updatedPorts = ports.some((port) => port.path === entry.path)
        ? ports
        : [...ports, { path: entry.path, displayName: entry.displayName }];

    PortHandler.updatePortSelect(updatedPorts);
    PortHandler.initialPorts = updatedPorts;
    el.val(entry.path);

    if (el.val() !== entry.path) {
        selectPort(el, fallbackValue);
        return;
    }

    el.trigger('change');
}

async function requestWebDevice(request) {
    const el = $('div#port-picker #port');
    const fallbackValue = lastRealPortValue(el);

    try {
        const entry = await request();
        if (!entry) {
            selectPort(el, fallbackValue);
            return;
        }
        const ports = await new Promise((resolve) => serial.getDevices(resolve));
        adoptRequestedPort(el, ports, entry, fallbackValue);
    } catch (error) {
        // Includes the user closing the chooser without picking anything.
        console.warn('Device access request failed or was cancelled', error);
        selectPort(el, fallbackValue);
    }
}

/**
 * Web only: show the browser's serial device chooser and select the granted
 * port. Must run from a user gesture (a click or a picker selection).
 */
export function requestWebSerialDeviceFromPicker() {
    return requestWebDevice(() => serial.requestWebSerialPort());
}

/**
 * Web only: show the browser's Bluetooth device chooser and select the
 * granted device. Must run from a user gesture.
 */
export function requestWebBluetoothDeviceFromPicker() {
    return requestWebDevice(() => serial.requestBluetoothPort());
}

/**
 * Web only: make sure the site has WebUSB access to a board in DFU mode,
 * showing the browser's chooser if it doesn't yet. Silent when a matching
 * device is already granted. Resolves to the device, or null. Must run from
 * a user gesture if it may need to show the chooser.
 */
export async function requestWebUsbDeviceFromPicker() {
    if (!('usb' in navigator)) {
        GUI.log(i18n.getMessage('dfuWebUsbUnsupported'));
        return null;
    }

    try {
        const isMatch = (d) => usbDevices.filters.some((f) => d.vendorId === f.vendorId && d.productId === f.productId);
        let device = (await navigator.usb.getDevices()).find(isMatch);
        if (!device) {
            device = await navigator.usb.requestDevice({ filters: usbDevices.filters });
        }
        console.log(`USB DFU device authorized: ${device.productName}`);

        // An already-granted device resolves without any browser prompt, so
        // relabel the entry to show the board was found.
        GUI.log(i18n.getMessage('usbDeviceOpened', [device.productName || device.serialNumber || 'DFU']));
        $('div#port-picker #port option[value="DFU"]')
            .text(device.productName ? `DFU - ${device.productName}` : 'DFU')
            .removeAttr('data-dfu-pending');
        PortHandler.dfu_available = true;
        return device;
    } catch (error) {
        console.warn('WebUSB DFU access request failed or was cancelled', error);
        return null;
    }
}

/**
 * Select the picker's DFU entry and make sure the site has WebUSB access to
 * the board, as picking DFU in the picker itself does. Used by the Firmware
 * Flasher's "Select DFU device" button. (A programmatic change event doesn't
 * trigger the picker's own request, which needs event.originalEvent.)
 */
export async function selectDfuFromPicker() {
    $('div#port-picker #port').val('DFU').trigger('change');
    if (__BACKEND__ === "web") {
        await requestWebUsbDeviceFromPicker();
    }
}

// Resolves once fn calls its callback, or after timeoutMs, whichever is first.
function callbackOrTimeout(fn, timeoutMs) {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        fn(() => {
            clearTimeout(timer);
            resolve();
        });
    });
}

// Resolves true once the given tab is active and fully initialized, false on
// timeout.
function waitForActiveTab(tabName, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const started = Date.now();
        const check = () => {
            if (GUI.active_tab === tabName && !GUI.tab_switch_in_progress) {
                resolve(true);
            } else if (Date.now() - started > timeoutMs) {
                resolve(false);
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

// openLanding: false skips finishClose()'s jump to the landing tab, for a
// caller that switches to another tab itself right after disconnecting.
export async function handleConnectClick({ openLanding = true } = {}) {
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

        if (__BACKEND__ === "web" && !clicks && (selectedPort.data().isRequestSerial || selectedPort.data().isRequestBluetooth)) {
            if (selectedPort.data().isRequestSerial) {
                await requestWebSerialDeviceFromPicker();
            } else {
                await requestWebBluetoothDeviceFromPicker();
            }
            return;
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
                    CONFIGURATOR.virtualFwVersion = $('#firmware-version-dropdown :selected').data('fw');

                    serial.connect('virtual', {}, onOpenVirtual);
                } else {
                    serial.connect(portName, {bitrate: selected_baud}, onOpen);
                }
            } else {
                // Leaving the CLI sends `exit`, which reboots the FC, and the
                // resulting device_lost (serial.js errorHandler) or port removal
                // (PortHandler.removePort) clicks Connect again while this
                // disconnect is still running. A second disconnect would jump to
                // the landing tab regardless of openLanding, and its MSP cleanup
                // drops the callback the first one is awaiting below, leaving it
                // hung, so let the one already in flight finish instead.
                if (GUI.disconnect_in_progress) {
                    return;
                }
                if ($('div#flashbutton a.flash_state').hasClass('active') && $('div#flashbutton a.flash').hasClass('active')) {
                    $('div#flashbutton a.flash_state').removeClass('active');
                    $('div#flashbutton a.flash').removeClass('active');
                }
                GUI.disconnect_in_progress = true;
                try {
                    // tab_switch_cleanup() kills timeouts/intervals itself, only
                    // once the current tab's own cleanup() has finished — doing
                    // it here first would kill any GUI timer that cleanup()
                    // is still relying on (e.g. a CLI session polling for idle
                    // before exiting).

                    // Both steps talk to an FC that may have just rebooted out
                    // from under us (CLI `exit`), so neither is guaranteed to
                    // call back; don't let that stall the disconnect.
                    await callbackOrTimeout((done) => GUI.tab_switch_cleanup(done), 2000);
                    GUI.tab_switch_in_progress = false;

                    await callbackOrTimeout((done) => mspHelper.setArmingEnabled(true, done), 1000);

                    // Wait for the port to actually finish closing before letting the
                    // caller (e.g. the firmware flasher tab switch) proceed.
                    await finishClose({ openLanding });
                } finally {
                    GUI.disconnect_in_progress = false;
                }
            }

            toggleStatus();
        }
   }
}

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
        config.portOverride = $('#port-override').val();
    });

    $('#port-override').val(config.portOverride ?? '');

    $('div#port-picker #port').on("change", function(event) {
        GUI.updateManualPortVisibility();

        if (__BACKEND__ === "web") {
            // Only a real selection by the user (event.originalEvent) may open
            // a browser device chooser: PortHandler re-triggers 'change' on
            // every poll, and the picker can land on an "add device" entry by
            // itself when the device list empties (e.g. while the FC reboots).
            if (event.originalEvent) {
                const selectedData = $(this).find(':selected').data();
                if (selectedData.isRequestSerial) {
                    requestWebSerialDeviceFromPicker();
                } else if (selectedData.isRequestBluetooth) {
                    requestWebBluetoothDeviceFromPicker();
                } else if (selectedData.isDFU) {
                    requestWebUsbDeviceFromPicker();
                }
            }

            if (!isWebPickerRequestValue(this.value) && this.value !== '0') {
                $(this).data('lastRealPortValue', this.value);
            }
        }
    });

    $('div.connect_controls a.connect').on("click", function () {
      handleConnectClick.call(this);
    });

    $('div.open_firmware_flasher a.flash').on("click", async function() {
        if ($('div#flashbutton a.flash_state').hasClass('active') && $('div#flashbutton a.flash').hasClass('active')) {
            // The tab switch clears these indicators after its exit guard allows it.
            $('#tabs ul.mode-disconnected .tab_landing a').trigger("click");
            return;
        }

        if (GUI.opening_firmware_flasher) {
            return;
        }

        // Still connected (e.g. CLI fallback mode for unsupported firmware):
        // disconnect as the Disconnect button does, minus its jump to the
        // landing tab, then go straight to the flasher. The flag keeps
        // auto-connect from grabbing the FC back as it reboots from the CLI's
        // `exit` in the meantime.
        GUI.opening_firmware_flasher = true;
        try {
            if (GUI.connected_to || GUI.connecting_to) {
                await handleConnectClick.call($('div#connectbutton a.connect')[0], { openLanding: false });
                if (GUI.connected_to || GUI.connecting_to) {
                    return;
                }
            }

            // The Virtual FC is not listed while the flasher owns the port
            PortHandler.syncVirtualOption();

            // A click can still be dropped if it lands mid-switch, so retry
            // until the flasher is actually the active tab.
            for (let attempt = 0; attempt < 3 && GUI.active_tab !== 'firmware_flasher'; attempt++) {
                $('#tabs ul.mode-disconnected .tab_firmware_flasher a').trigger("click");
                await waitForActiveTab('firmware_flasher', 2000);
            }

            if (GUI.active_tab === 'firmware_flasher') {
                $('div#flashbutton a.flash_state').addClass('active');
                $('div#flashbutton a.flash').addClass('active');
            }
        } finally {
            GUI.opening_firmware_flasher = false;
        }
    });

    // auto-connect
    if (config.autoConnect) {
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

        config.autoConnect = GUI.auto_connect;
    });

    // Show all ports
    if (GUI.operating_system === 'Android' || __BACKEND__ === "web") {
        // port filtering does not work on Android as port names do not get populated on Android;
        // on the web every listed port is one the user granted, so there is nothing to filter
        GUI.show_all_ports = true;
        $('div #show-all-ports-switch').hide();
    } else {
        if (!config.showAllPorts) {
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

            config.showAllPorts = GUI.show_all_ports;
            PortHandler.showAllPorts(GUI.show_all_ports);
        });
    }

    PortHandler.initialize(GUI.show_all_ports);
}

function finishClose({ openLanding = true } = {}) {
    if (GUI.isCordova()) {
        UI_PHONES.reset();
    }

    const wasConnected = CONFIGURATOR.connectionValid;

    // close reset to custom defaults dialog
    $('#dialogResetToCustomDefaults')[0].close();

    // Resolves once the port has actually finished closing, so callers that
    // need the port free again can await it instead of racing the teardown.
    const disconnected = new Promise((resolve) => {
        serial.disconnect((result) => {
            onClosed(result);
            resolve();
        });
    });

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

    if (openLanding) {
        $('#tabs .tab_landing a').trigger("click");
    }

    return disconnected;
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

        // save selected port if the port differs
        config.lastUsedPort = GUI.connected_to;

        serial.onReceive.addListener(read_serial);
        setConnectionTimeout();
        FC.resetState();

        resetMspHelper();
        MSP.listen(mspHelper.process_data.bind(mspHelper));
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

    resetMspHelper();

    applyVirtualConfig();

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

    await processUid();
    await processName();
    await setRtc();
    finishOpen();
}

async function processUid() {
    await MSP.promise(MSPCodes.MSP_UID, false);

    const UID = FC.CONFIG.uid[0].toString(16) + FC.CONFIG.uid[1].toString(16) + FC.CONFIG.uid[2].toString(16);
    GUI.log(i18n.getMessage('uniqueDeviceIdReceived', [UID]));
}

async function processName() {
    await MSP.promise(MSPCodes.MSP_NAME, false);
    GUI.log(i18n.getMessage('craftNameReceived', [FC.CONFIG.name]));
}

async function setRtc() {
    await MSP.promise(MSPCodes.MSP_SET_RTC, mspHelper.crunch(MSPCodes.MSP_SET_RTC));
    GUI.log(i18n.getMessage('realTimeClockSet'));
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

async function onConnect() {
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
    $('#tabs ul.mode-connected li:not(.tab-group-header)').hide();
    $('#tabs ul.mode-connected li:not(.tab-group-header)').filter(function () {
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

        await new Promise((resolve) => setTimeout(resolve, 100));
        await MSP.promise(MSPCodes.MSP_BOXNAMES, false);
        await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG, false);
        await MSP.promise(MSPCodes.MSP_BATTERY_CONFIG, false);
        await MSP.promise(MSPCodes.MSP_STATUS, false);
        await MSP.promise(MSPCodes.MSP_DATAFLASH_SUMMARY, false);
        // Needed here (rather than left to each tab's own fetch) so updateTabList can
        // decide whether to show the XACT servo tab, which is gated on FBUS receiver
        // mode or the FBUS_OUT serial port function.
        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_10)) {
            await MSP.promise(MSPCodes.MSP_SERIAL_CONFIG, false);
            await MSP.promise(MSPCodes.MSP_RX_CONFIG, false);
            updateTabList(FC.FEATURE_CONFIG.features);
        }

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
            case 'remap_fc':
                TABS.remap_fc.read(info);
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

    if (GUI.active_tab != 'cli' && GUI.active_tab != 'presets' && GUI.active_tab != 'remap_fc') {
        MSP.promise(MSPCodes.MSP_BATTERY_STATE, false);
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
    if (!CONFIGURATOR.virtualMode) {
        GUI.reboot_in_progress = true;
    }

    callback?.();
}

import { config } from "@/js/config.svelte.ts";
import { FC } from "@/js/fc.svelte.js";
import { GUI } from "@/js/gui.js";
import { i18n } from "@/js/localization.js";
import { serial } from "@/js/serial.js";
import { generateVirtualApiVersions, getTextWidth } from "@/js/utils/common.js";

const TIMEOUT_CHECK = 500 ; // With 250 it seems that it produces a memory leak and slowdown in some versions, reason unknown

// The Virtual FC is a developer tool on desktop; on the web it doubles as a
// no-hardware demo of every tab.
const SHOW_VIRTUAL_PORT = import.meta.env.DEV || __BACKEND__ === "web";

// The flasher owns the port while it's open, or being opened (it reboots the FC
// into the bootloader itself).
function flasherOwnsPort() {
    return GUI.active_tab === 'firmware_flasher' || GUI.opening_firmware_flasher;
}

export const usbDevices = { filters: [
    {'vendorId': 1155, 'productId': 57105},
    {'vendorId': 10473, 'productId': 393},
] };

export const PortHandler = new function () {
    this.initialPorts = false;
    this.port_detected_callbacks = [];
    this.port_removed_callbacks = [];
    this.dfu_available = false;
    this.showingAllPorts = false;
};

PortHandler.initialize = function (showAllPorts) {
    const portPickerElementSelector = "div#port-picker #port";
    this.portPickerElement = $(portPickerElementSelector);
    this.selectList = document.querySelector(portPickerElementSelector);
    this.initialWidth = this.selectList.offsetWidth + 12;
    this.showingAllPorts = showAllPorts;

    // fill dropdown with version numbers
    generateVirtualApiVersions();

    // start listening, check after TIMEOUT_CHECK ms
    this.check();
};

PortHandler.check = function () {
    const self = this;

    self.check_usb_devices();
    self.check_serial_devices();

    // Opening or leaving the flasher changes whether the Virtual FC is listed
    self.syncVirtualOption();

    GUI.updateManualPortVisibility();

    setTimeout(function () {
        self.check();
    }, TIMEOUT_CHECK);
};

function portRecognized(portName, pathSelect) {
    if (portName) {
            const isWindows = (GUI.operating_system === 'Windows');
            const isTty = pathSelect.includes('tty');
            const deviceRecognized = portName.includes('STM') || portName.includes('CP210');
            const legacyDeviceRecognized = portName.includes('usb');
            if (isWindows && deviceRecognized || isTty && (deviceRecognized || legacyDeviceRecognized)) {
                return true;
            }
    }
    return false;
}

PortHandler.showAllPorts = function(showAllPorts) {
    if (this.showingAllPorts != showAllPorts) {
        /**
         * trigger an update of the serial devices that specifically updates the port selector and resets the initialPorts simultaneously,
         * so as to not trigger an auto-connect when toggling
         */
        this.initialPorts = false;
        this.showingAllPorts = showAllPorts;
    }
};

PortHandler.check_serial_devices = function () {
    const self = this;

    serial.getDevices(function(currentPorts) {
        // Web: every listed port is one the user explicitly granted, so
        // there is nothing to filter out.
        if (__BACKEND__ !== "web" && !self.showingAllPorts) {
            currentPorts = currentPorts.filter((p) => portRecognized(p.displayName, p.path));
        }
        // on initialization of the port selector (i.e. app startup or toggling whether to show all ports), only select a detected port, don't auto-connect
        if (!self.initialPorts) {
            currentPorts = self.updatePortSelect(currentPorts);
            self.selectPort(currentPorts);
            self.initialPorts = currentPorts;
        } else {
            self.removePort(currentPorts);
            self.detectPort(currentPorts);
        }
    });
};

PortHandler.check_usb_devices = function (callback) {
    const self = this;

    if (__BACKEND__ === "web") {
        self.check_web_usb_devices(callback);
        return;
    }

    chrome.usb.getDevices(usbDevices, function (result) {

        const dfuElement = self.portPickerElement.children("[value='DFU']");
        if (result?.length) {
            if (!dfuElement.length) {
                self.portPickerElement.empty();
                let usbText;
                if (result[0].productName) {
                    usbText = (`DFU - ${result[0].productName}`);
                } else {
                    usbText = "DFU";
                }

                self.portPickerElement.append($('<option/>', {
                    value: "DFU",
                    text: usbText,
                    data: {isDFU: true},
                    // also expose as a real HTML attribute so non-jQuery consumers
                    // (e.g. the Svelte firmware flasher) can read it via .dataset
                    'data-is-dfu': 'true',
                }));

                self.portPickerElement.append($('<option/>', {
                    value: 'manual',
                    text: i18n.getMessage('portsSelectManual'),
                    i18n: 'portsSelectManual',
                    data: {isManual: true},
                }));
                self.syncVirtualOption();
                self.portPickerElement.val('DFU').change();
                self.setPortsInputWidth();
            }
            self.dfu_available = true;
        } else {
            if (dfuElement.length) {
               dfuElement.remove();
               self.setPortsInputWidth();
            }
            self.dfu_available = false;
        }
        self.finishUsbDeviceCheck(callback);
    });
};

/**
 * WebUSB can only see devices the user has already granted access to (with
 * navigator.usb.requestDevice(), from the picker's "DFU" entry or the
 * flasher). Unlike the chrome.usb path above this leaves the picker alone:
 * on the web "DFU" is a permanent entry added by updatePortSelect, so a
 * rebuild here can't race check_serial_devices rebuilding the same <select>.
 * dfu_available still reflects real detection, which STM32.connect() relies
 * on after rebooting a board into DFU.
 */
PortHandler.check_web_usb_devices = async function (callback) {
    const self = this;

    let matched = [];
    if ('usb' in navigator) {
        try {
            const devices = await navigator.usb.getDevices();
            matched = devices.filter((d) =>
                usbDevices.filters.some((f) => f.vendorId === d.vendorId && f.productId === d.productId),
            );
        } catch {
            matched = [];
        }
    }

    self.dfu_available = matched.length > 0;
    self.finishUsbDeviceCheck(callback);
};

PortHandler.finishUsbDeviceCheck = function (callback) {
    const self = this;

    if (callback) {
        callback(self.dfu_available);
    }
    if (!$('option:selected', self.portPickerElement).data()?.isDFU) {
        if (!(GUI.connected_to || GUI.connect_lock)) {
            FC.resetState();
        }
        self.portPickerElement.trigger('change');
    }
};

/**
 * removePort removes ports if they disappear from the port list, and fires the disconnect through the connect button.
 * It will also fire any registered port removal callbacks, then finally update the port selector.
 */
PortHandler.removePort = function(currentPorts) {
    const self = this;
    const removePorts = self.array_difference(self.initialPorts, currentPorts);

    if (removePorts.length) {
        console.log(`PortHandler - Removed: ${JSON.stringify(removePorts)}`);
        // disconnect "UI" - routine can't fire during atmega32u4 reboot procedure !!!
        if (GUI.connected_to) {
            for (let i = 0; i < removePorts.length; i++) {
                if (removePorts[i] === GUI.connected_to) {
                    $('div#header_btns a.connect').click();
                }
            }
        }
        // trigger callbacks (only after initialization)
        for (let i = (self.port_removed_callbacks.length - 1); i >= 0; i--) {
            const obj = self.port_removed_callbacks[i];

            // remove timeout
            clearTimeout(obj.timer);

            // trigger callback
            obj.code(removePorts);

            // remove object from array
            const index = self.port_removed_callbacks.indexOf(obj);
            if (index > -1) {
                self.port_removed_callbacks.splice(index, 1);
            }
        }
        for (let i = 0; i < removePorts.length; i++) {
            self.initialPorts.splice(self.initialPorts.indexOf(removePorts[i]), 1);
        }
        self.updatePortSelect(self.initialPorts);
    }
};

// detectPort accepts a port array and attempts to recognize a port and auto-connect to it (if enabled)
PortHandler.detectPort = function(currentPorts) {
    const self = this;
    const newPorts = self.array_difference(currentPorts, self.initialPorts);

    if (newPorts.length) {
        // pick lastUsedPort for manual tcp auto-connect or detect and select new port for serial
        currentPorts = self.updatePortSelect(currentPorts);
        console.log(`PortHandler - Found: ${JSON.stringify(newPorts)}`);

        const lastUsedPort = config.lastUsedPort;
        if (lastUsedPort) {
            if (lastUsedPort.includes('tcp')) {
                self.portPickerElement.val('manual');
            } else if (newPorts.length === 1) {
                self.portPickerElement.val(newPorts[0].path);
            } else if (newPorts.length > 1) {
                self.selectPort(currentPorts);
            }
        }

        // auto-connect if enabled, but never while the flasher owns the port
        if (GUI.auto_connect && !GUI.connecting_to && !GUI.connected_to && !flasherOwnsPort()) {
            GUI.timeout_add('auto-connect_timeout', function () {
                // A device appearing is never a reason to connect to the Virtual FC
                if (flasherOwnsPort() || self.virtualSelected()) {
                    return;
                }
                $('div#header_btns a.connect').click();
            }, config.connectionTimeout); // timeout so bus have time to initialize after being detected by the system
        }
        // trigger callbacks
        for (let i = (self.port_detected_callbacks.length - 1); i >= 0; i--) {
            const obj = self.port_detected_callbacks[i];

            // remove timeout
            clearTimeout(obj.timer);

            // trigger callback
            obj.code(newPorts);

            // remove object from array
            const index = self.port_detected_callbacks.indexOf(obj);
            if (index > -1) {
                self.port_detected_callbacks.splice(index, 1);
            }
        }
        self.initialPorts = currentPorts;
    }
};

PortHandler.sortPorts = function(ports) {
    return ports.sort(function(a, b) {
        return a.path.localeCompare(b.path, window.navigator.language, {
            numeric: true,
            sensitivity: 'base',
        });
    });
};

/**
 * updatePortSelect accepts an array of ports and updates the portPickerElement with the given ports
 */
PortHandler.updatePortSelect = function (ports) {
    ports = this.sortPorts(ports);
    this.portPickerElement.empty();

    for (let i = 0; i < ports.length; i++) {
        let portText;
        if (__BACKEND__ === "web") {
            // Web port paths are internal ids (webserial_<vid>_<pid>_<n>).
            portText = ports[i].displayName || ports[i].path;
        } else if (ports[i].displayName) {
            portText = (`${ports[i].path} - ${ports[i].displayName}`);
        } else {
            portText = ports[i].path;
        }

        this.portPickerElement.append($("<option/>", {
            value: ports[i].path,
            text: portText,
            data: {isManual: false},
        }));
    }

    if (__BACKEND__ === "web") {
        this.appendWebRequestOptions();
    } else {
        // Manual entry is a raw OS device path or tcp:// address, which only
        // chrome.serial/chrome.sockets.tcp can open.
        this.portPickerElement.append($("<option/>", {
            value: 'manual',
            text: i18n.getMessage('portsSelectManual'),
            i18n: 'portsSelectManual',
            data: {isManual: true},
        }));
    }

    this.syncVirtualOption();
    this.setPortsInputWidth();
    return ports;
};

/**
 * The Virtual FC is not a device. It is only ever a target the user picks by
 * hand to connect to, so it is not listed while the flasher owns the port, and
 * port detection, auto-select and auto-connect never choose it. It always goes
 * last, so a rebuilt picker never defaults to it.
 */
PortHandler.virtualPortListed = function () {
    return SHOW_VIRTUAL_PORT && !flasherOwnsPort();
};

PortHandler.virtualSelected = function () {
    return !!$('option:selected', this.portPickerElement).data()?.isVirtual;
};

PortHandler.syncVirtualOption = function () {
    const existing = this.portPickerElement.children("[value='virtual']");

    if (!this.virtualPortListed()) {
        if (existing.length) {
            const wasSelected = existing.is(':selected');
            existing.remove();
            if (wasSelected) {
                this.portPickerElement.val(this.portPickerElement.children().first().val()).trigger('change');
            }
            this.setPortsInputWidth();
        }
        return;
    }

    if (!existing.length) {
        this.portPickerElement.append($("<option/>", {
            value: 'virtual',
            text: i18n.getMessage('portsSelectVirtual'),
            i18n: 'portsSelectVirtual',
            data: {isVirtual: true},
        }));
        this.setPortsInputWidth();
    } else if (!existing.is(':last-child')) {
        // Keep it last; moving the node keeps its selection
        this.portPickerElement.append(existing);
    }
};

/**
 * Web only. Devices the user has already granted access to are listed above
 * as ordinary ports. These fixed entries ask for access to a new one:
 * picking one opens the browser's device chooser (serial_backend.js handles
 * the selection), the same way Betaflight's web configurator works.
 */
PortHandler.appendWebRequestOptions = function () {
    this.portPickerElement.append($("<option/>", {
        value: "0",
        text: i18n.getMessage('portsSelectPleaseSelect'),
        i18n: 'portsSelectPleaseSelect',
    }));

    if ('serial' in navigator || 'usb' in navigator) {
        this.portPickerElement.append($("<option/>", {
            value: "requestserial",
            text: i18n.getMessage('portsSelectAddSerialDevice'),
            i18n: 'portsSelectAddSerialDevice',
            data: {isRequestSerial: true},
        }));
    }

    if ('bluetooth' in navigator) {
        this.portPickerElement.append($("<option/>", {
            value: "requestbluetooth",
            text: i18n.getMessage('portsSelectAddBluetoothDevice'),
            i18n: 'portsSelectAddBluetoothDevice',
            data: {isRequestBluetooth: true},
        }));
    }

    // DFU flashing needs WebUSB; without it this entry could do nothing.
    if ('usb' in navigator) {
        this.portPickerElement.append($("<option/>", {
            value: "DFU",
            text: i18n.getMessage('portsSelectAddDfuDevice'),
            i18n: 'portsSelectAddDfuDevice',
            data: {isDFU: true},
            // Real attributes too, for non-jQuery readers (the Svelte
            // firmware flasher). data-dfu-pending marks it as still only the
            // "request access" entry; serial_backend.js clears it once a
            // device has been granted.
            'data-is-dfu': 'true',
            'data-dfu-pending': 'true',
        }));
    }
};

/**
 * selectPort accepts an array of ports and selects a recognized port if one is found
 */
PortHandler.selectPort = function(ports) {
    for (let i = 0; i < ports.length; i++) {
        const portName = ports[i].displayName;
        if (portName) {
            const pathSelect = ports[i].path;
            if (portRecognized(portName, pathSelect)) {
                this.portPickerElement.val(pathSelect);
                console.log(`Porthandler detected device ${portName} on port: ${pathSelect}`);
            }
        }
    }
};

PortHandler.setPortsInputWidth = function() {

    function findMaxLengthOption(selectEl) {
        let max = 0;

        $(selectEl.options).each(function () {
            const textSize = getTextWidth(this.textContent);
            if (textSize > max) {
                max = textSize;
            }
        });

        return max;
    }

    const correction = 24; // account for up/down button and spacing
    let width = findMaxLengthOption(this.selectList) + correction;

    width = (width > this.initialWidth) ? width : this.initialWidth;

    const portsInput = document.querySelector("div#port-picker #portsinput");
    portsInput.style.width = `${width}px`;
};

PortHandler.port_detected = function(name, code, timeout, ignore_timeout) {
    const self = this;
    const obj = {'name': name,
                 'code': code,
                 'timeout': (timeout) ? timeout : 10000,
                };

    if (!ignore_timeout) {
        obj.timer = setTimeout(function() {
            console.log(`PortHandler - timeout - ${obj.name}`);

            // trigger callback
            code(false);

            // remove object from array
            const index = self.port_detected_callbacks.indexOf(obj);
            if (index > -1) {
                self.port_detected_callbacks.splice(index, 1);
            }
        }, (timeout) ? timeout : 10000);
    } else {
        obj.timer = false;
        obj.timeout = false;
    }

    this.port_detected_callbacks.push(obj);

    return obj;
};

PortHandler.port_removed = function (name, code, timeout, ignore_timeout) {
    const self = this;
    const obj = {'name': name,
                 'code': code,
                 'timeout': (timeout) ? timeout : 10000,
                };

    if (!ignore_timeout) {
        obj.timer = setTimeout(function () {
            console.log(`PortHandler - timeout - ${obj.name}`);

            // trigger callback
            code(false);

            // remove object from array
            const index = self.port_removed_callbacks.indexOf(obj);
            if (index > -1) {
                self.port_removed_callbacks.splice(index, 1);
            }
        }, (timeout) ? timeout : 10000);
    } else {
        obj.timer = false;
        obj.timeout = false;
    }

    this.port_removed_callbacks.push(obj);

    return obj;
};

// accepting single level array with "value" as key
PortHandler.array_difference = function (firstArray, secondArray) {
    const cloneArray = [];

    // create hardcopy
    for (let i = 0; i < firstArray.length; i++) {
        cloneArray.push(firstArray[i]);
    }

    for (let i = 0; i < secondArray.length; i++) {
        const elementExists = cloneArray.findIndex(element => element.path === secondArray[i].path);
        if (elementExists !== -1) {
            cloneArray.splice(elementExists, 1);
        }
    }

    return cloneArray;
};

PortHandler.flush_callbacks = function () {
    let killed = 0;

    for (let i = this.port_detected_callbacks.length - 1; i >= 0; i--) {
        if (this.port_detected_callbacks[i].timer) {
            clearTimeout(this.port_detected_callbacks[i].timer);
        }
        this.port_detected_callbacks.splice(i, 1);

        killed++;
    }

    for (let i = this.port_removed_callbacks.length - 1; i >= 0; i--) {
        if (this.port_removed_callbacks[i].timer) {
            clearTimeout(this.port_removed_callbacks[i].timer);
        }
        this.port_removed_callbacks.splice(i, 1);

        killed++;
    }

    return killed;
};

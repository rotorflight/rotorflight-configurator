export const usbDevices = { filters: [
    {'vendorId': 1155, 'productId': 57105},
    {'vendorId': 10473, 'productId': 393},
] };

export const PortHandler = new function () {
    this.dfu_available = false;
};

// Check for DFU devices via chrome.usb and report availability via callback.
// Used by stm32.js during the serial→DFU reboot flow.
// TODO: Replace with comms layer DFU enumeration (see webusb-dfu branch)
PortHandler.check_usb_devices = function (callback) {
    const self = this;
    chrome.usb.getDevices(usbDevices, function (result) {
        self.dfu_available = result?.length > 0;
        callback?.(self.dfu_available);
    });
};

PortHandler.flush_callbacks = function () {
    // Legacy stub — callbacks removed, kept for firmware_flasher cleanup compatibility
};

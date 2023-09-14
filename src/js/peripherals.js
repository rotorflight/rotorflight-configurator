'use strict';

// return true if user has choose a special peripheral
function isPeripheralSelected(peripheralName) {
    for (let portIndex = 0; portIndex < FC.SERIAL_CONFIG.ports.length; portIndex++) {
        const serialPort = FC.SERIAL_CONFIG.ports[portIndex];
        if (serialPort.functions.indexOf(peripheralName) >= 0) {
            return true;
        }
    }

    return false;
}


import { checkChromeRuntimeError } from "@/js/utils/common.js";

function Eventer() {
    const listeners = [];

    return {
        addListener(fn) {
            listeners.push(fn);
        },
        removeListener(fn) {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
        },
        raiseEvent(data) {
            for (const fn of listeners) {
                fn(data);
            }
        },
        removeAll() {
            listeners.length = 0;
        },
        get listeners() { return listeners; },
    };
}

export const serial = {
    connected:      false,
    connectionId:   false,
    openCanceled:   false,
    bitrate:        0,
    bytesReceived:  0,
    bytesSent:      0,
    failed:         0,
    connectionType: 'serial',
    connectionIP:   '127.0.0.1',
    connectionPort: 5761,

    transmitting:   false,
    outputBuffer:   [],

    // Current device from comms layer (null when using legacy TCP path)
    _device: null,

    onReceive: Eventer('receive'),
    onReceiveError: Eventer('receiveError'),

    connect: function (pathOrDevice, options, callback) {
        const self = this;

        // Device object from comms layer
        if (pathOrDevice && typeof pathOrDevice === 'object' && typeof pathOrDevice.open === 'function') {
            console.log(`serial.connect: device object (${pathOrDevice.description}), delegating to connectDevice`);
            self.connectDevice(pathOrDevice, options, callback);
            return;
        }

        // Legacy string paths
        const path = pathOrDevice;
        console.log(`serial.connect: legacy path "${path}"`);
        const testUrl = path.match(/^tcp:\/\/([A-Za-z0-9.-]+)(?::(\d+))?$/);
        if (testUrl) {
            self.connectTcp(testUrl[1], testUrl[2], options, callback);
        } else if (path === 'virtual') {
            self.connectVirtual(callback);
        } else {
            // Legacy chrome.serial connect by path string
            self.connectSerial(path, options, callback);
        }
    },

    connectDevice: async function (device, options, callback) {
        const self = this;
        self._device = device;
        self.connectionType = 'serial';

        try {
            const info = await device.open(options);
            if (self.openCanceled) {
                self.openCanceled = false;
                await device.close();
                self._device = null;
                callback?.(false);
                return;
            }

            self.connected = true;
            self.connectionId = info?.connectionId || 'device';
            self.bitrate = options.bitrate || 115200;
            self.bytesReceived = 0;
            self.bytesSent = 0;
            self.failed = 0;

            // Bridge device events to serial events
            device.onReceive.addListener(function (data) {
                self.bytesReceived += data.byteLength;
                self.onReceive.raiseEvent({ data });
            });

            device.onReceiveError.addListener(function (info) {
                self.errorHandler(info.error, 'receive');
            });

            console.log(`serial: device connection opened, Baud: ${self.bitrate}`);
            callback?.({ connectionId: self.connectionId, bitrate: self.bitrate });
        } catch (error) {
            console.log(`serial: failed to open device: ${error.message}`);
            self._device = null;
            callback?.(false);
        }
    },

    connectSerial: function (path, options, callback) {
        const self = this;
        self.connectionType = 'serial';
        self._device = null;

        chrome.serial.connect(path, options, function (connectionInfo) {
            if (connectionInfo && !self.openCanceled && !checkChromeRuntimeError()) {
                self.connected = true;
                self.connectionId = connectionInfo.connectionId;
                self.bitrate = connectionInfo.bitrate;
                self.bytesReceived = 0;
                self.bytesSent = 0;
                self.failed = 0;

                self.onReceive.addListener(function log_bytesReceived(info) {
                    self.bytesReceived += info.data.byteLength;
                });

                self.onReceiveError.addListener(function watch_for_on_receive_errors(info) {
                    switch (info.error) {
                        case 'system_error':
                            if (!self.failed++) {
                                chrome.serial.setPaused(self.connectionId, false, function () {
                                    self.getInfo(function (getInfo) {
                                        if (getInfo) {
                                            if (!getInfo.paused) {
                                                console.log(`${self.connectionType}: connection recovered from last onReceiveError`);
                                                self.failed = 0;
                                            } else {
                                                console.log(`${self.connectionType}: connection did not recover from last onReceiveError, disconnecting`);
                                                GUI.log(i18n.getMessage('serialUnrecoverable'));
                                                self.errorHandler(getInfo.error, 'receive');
                                            }
                                        } else {
                                            checkChromeRuntimeError();
                                        }
                                    });
                                });
                            }
                            break;

                        case 'overrun':
                            self.error = info.error;
                            setTimeout(function() {
                                chrome.serial.setPaused(info.connectionId, false, function() {
                                    self.getInfo(function (_info) {
                                        if (_info) {
                                            if (_info.paused) {
                                                console.log(`${self.connectionType}: connection did not recover from ${self.error} condition, disconnecting`);
                                                GUI.log(i18n.getMessage('serialUnrecoverable'));
                                                self.errorHandler(_info.error, 'receive');
                                            }
                                            else {
                                                console.log(`${self.connectionType}: connection recovered from ${self.error} condition`);
                                            }
                                        }
                                    });
                                });
                            }, 50);
                            break;

                        case 'timeout':
                            break;

                        case 'frame_error':
                            GUI.log(i18n.getMessage('serialErrorFrameError'));
                            self.errorHandler(info.error, 'receive');
                            break;
                        case 'parity_error':
                            GUI.log(i18n.getMessage('serialErrorParityError'));
                            self.errorHandler(info.error, 'receive');
                            break;
                        case 'break':
                        case 'disconnected':
                        case 'device_lost':
                        default:
                            self.errorHandler(info.error, 'receive');
                            break;
                    }
                });

                // Register with chrome's global event system
                chrome.serial.onReceive.addListener(function (info) {
                    if (info.connectionId === self.connectionId) {
                        self.onReceive.raiseEvent(info);
                    }
                });
                chrome.serial.onReceiveError.addListener(function (info) {
                    if (info.connectionId === self.connectionId) {
                        self.onReceiveError.raiseEvent(info);
                    }
                });

                console.log(`${self.connectionType}: connection opened with ID: ${connectionInfo.connectionId} , Baud: ${connectionInfo.bitrate}`);

                callback?.(connectionInfo);
            } else {
                if (connectionInfo && self.openCanceled) {
                    self.connectionId = connectionInfo.connectionId;
                    console.log(`${self.connectionType}: connection opened with ID: ${connectionInfo.connectionId} , but request was canceled, disconnecting`);
                    setTimeout(function initialization() {
                        self.openCanceled = false;
                        self.disconnect(function resetUI() {
                            console.log(`${self.connectionType}: connect sequence was cancelled, disconnecting...`);
                        });
                    }, 150);
                } else if (self.openCanceled) {
                    console.log(`${self.connectionType}: connection didn't open and request was canceled`);
                    self.openCanceled = false;
                } else {
                    console.log(`${self.connectionType}: failed to open serial port`);
                }
                callback?.(false);
            }
        });
    },
    connectTcp: function (ip, port, options, callback) {
        const self = this;
        self.connectionIP = ip;
        self.connectionPort = port || 5761;
        self.connectionPort = parseInt(self.connectionPort);
        self.connectionType = 'tcp';
        self._device = null;

        chrome.sockets.tcp.create({
            persistent: false,
            name: 'Rotorflight',
            bufferSize: 65535,
        }, function(createInfo) {
            if (createInfo && !self.openCanceled || !checkChromeRuntimeError()) {
                self.connectionId = createInfo.socketId;
                self.bitrate = 115200;
                self.bytesReceived = 0;
                self.bytesSent = 0;
                self.failed = 0;

                chrome.sockets.tcp.connect(createInfo.socketId, self.connectionIP, self.connectionPort, function (result) {
                    if (result === 0 || !checkChromeRuntimeError()) {
                        chrome.sockets.tcp.setNoDelay(createInfo.socketId, true, function (noDelayResult) {
                            if (noDelayResult === 0 || !checkChromeRuntimeError()) {
                                self.onReceive.addListener(function log_bytesReceived(info) {
                                    self.bytesReceived += info.data.byteLength;
                                });
                                self.onReceiveError.addListener(function watch_for_on_receive_errors(info) {
                                    if (info.socketId !== self.connectionId) return;
                                    if (self.connectionType === 'tcp' && info.resultCode < 0) {
                                        self.errorHandler(info.resultCode, 'receive');
                                    }
                                });

                                chrome.sockets.tcp.onReceive.addListener(function (info) {
                                    if (info.socketId === self.connectionId) {
                                        self.onReceive.raiseEvent(info);
                                    }
                                });
                                chrome.sockets.tcp.onReceiveError.addListener(function (info) {
                                    if (info.socketId === self.connectionId) {
                                        self.onReceiveError.raiseEvent(info);
                                    }
                                });

                                self.connected = true;
                                console.log(`${self.connectionType}: connection opened with ID ${createInfo.socketId} , url: ${self.connectionIP}:${self.connectionPort}`);
                                callback?.(createInfo);
                            }
                        });
                    } else {
                        console.log(`${self.connectionType}: failed to connect with result ${result}`);
                        callback?.(false);
                    }
                });
            }
        });
    },
    connectVirtual: function (callback) {
        const self = this;
        self.connectionType = 'virtual';
        self._device = null;

        if (!self.openCanceled) {
            self.connected = true;
            self.connectionId = 'virtual';
            self.bitrate = 115200;
            self.bytesReceived = 0;
            self.bytesSent = 0;
            self.failed = 0;

            callback?.();
        }
    },
    disconnect: function (callback) {
        const self = this;
        self.connected = false;
        self.emptyOutputBuffer();

        // Clean up our own listeners
        self.onReceive.removeAll();
        self.onReceiveError.removeAll();

        if (self._device) {
            const device = self._device;
            self._device = null;
            self.connectionId = false;
            self.bitrate = 0;

            device.close().then(() => {
                console.log(`serial: device connection closed, Sent: ${self.bytesSent} bytes, Received: ${self.bytesReceived} bytes`);
                callback?.(true);
            }).catch((error) => {
                console.log(`serial: error closing device: ${error.message}`);
                callback?.(false);
            });
            return;
        }

        if (self.connectionId) {
            if (self.connectionType !== 'virtual') {
                if (self.connectionType === 'tcp') {
                    chrome.sockets.tcp.disconnect(self.connectionId, function () {
                        checkChromeRuntimeError();
                        console.log(`${self.connectionType}: disconnecting socket.`);
                    });
                }

                const disconnectFn = (self.connectionType === 'serial') ? chrome.serial.disconnect : chrome.sockets.tcp.close;
                disconnectFn(self.connectionId, function (result) {
                    checkChromeRuntimeError();

                    result = result || self.connectionType === 'tcp';
                    console.log(`${self.connectionType}: ${result ? 'closed' : 'failed to close'} connection with ID: ${self.connectionId}, Sent: ${self.bytesSent} bytes, Received: ${self.bytesReceived} bytes`);

                    self.connectionId = false;
                    self.bitrate = 0;

                    callback?.(result);
                });
            } else {
                self.connectionId = false;
                CONFIGURATOR.virtualMode = false;
                self.connectionType = false;
                callback?.(true);
            }
        } else {
            self.openCanceled = true;
        }
    },
    getDevices: function (callback) {
        chrome.serial.getDevices(function (devices_array) {
            const devices = [];
            devices_array.forEach(function (device) {
                devices.push({
                              path: device.path,
                              displayName: device.displayName,
                             });
            });

            callback(devices);
        });
    },
    getInfo: function (callback) {
        if (self._device) {
            // Device-based connections don't support getInfo
            callback?.(null);
            return;
        }
        const chromeType = (this.connectionType === 'serial') ? chrome.serial : chrome.sockets.tcp;
        chromeType.getInfo(this.connectionId, callback);
    },
    send: function (data, callback) {
        const self = this;
        self.outputBuffer.push({'data': data, 'callback': callback});

        function _send() {
            const _data = self.outputBuffer[0].data;
            const _callback = self.outputBuffer[0].callback;

            if (!self.connected) {
                console.log(`${self.connectionType}: attempting to send when disconnected`);
                _callback?.({
                    bytesSent: 0,
                    error: 'undefined',
                });
                return;
            }

            if (self._device) {
                // Device-based send
                self._device.send(_data).then(function (sendInfo) {
                    self.bytesSent += sendInfo.bytesSent;
                    _callback?.(sendInfo);

                    self.outputBuffer.shift();
                    if (self.outputBuffer.length) {
                        if (self.outputBuffer.length > 100) {
                            let counter = 0;
                            while (self.outputBuffer.length > 100) {
                                self.outputBuffer.pop();
                                counter++;
                            }
                            console.log(`${self.connectionType}: send buffer overflowing, dropped: ${counter} entries`);
                        }
                        _send();
                    } else {
                        self.transmitting = false;
                    }
                }).catch(function (error) {
                    console.log(`serial: send error: ${error.message}`);
                    _callback?.({ bytesSent: 0, error: error.message });
                });
                return;
            }

            // Legacy chrome API send
            const sendFn = (self.connectionType === 'serial') ? chrome.serial.send : chrome.sockets.tcp.send;
            sendFn(self.connectionId, _data, function (sendInfo) {
                checkChromeRuntimeError();

                if (sendInfo === undefined) {
                    console.log('undefined send error');
                    _callback?.({
                        bytesSent: 0,
                        error: 'undefined',
                    });
                    return;
                }

                if (self.connectionType === 'tcp' && sendInfo.resultCode < 0) {
                    self.errorHandler(sendInfo.resultCode, 'send');
                    return;
                }

                self.bytesSent += sendInfo.bytesSent;
                _callback?.(sendInfo);

                self.outputBuffer.shift();
                if (self.outputBuffer.length) {
                    if (self.outputBuffer.length > 100) {
                        let counter = 0;
                        while (self.outputBuffer.length > 100) {
                            self.outputBuffer.pop();
                            counter++;
                        }
                        console.log(`${self.connectionType}: send buffer overflowing, dropped: ${counter} entries`);
                    }
                    _send();
                } else {
                    self.transmitting = false;
                }
            });
        }

        if (!self.transmitting) {
            self.transmitting = true;
            _send();
        }
    },
    emptyOutputBuffer: function () {
        this.outputBuffer = [];
        this.transmitting = false;
    },
    errorHandler: function (result, direction) {
        const self = this;

        self.connected = false;
        FC.CONFIG.armingDisabled = false;

        let message = 'error: UNDEFINED';
        if (self.connectionType === 'tcp') {
            switch (result){
                case -15:
                    message = 'error: ERR_SOCKET_NOT_CONNECTED';
                    console.log(`${self.connectionType}: ${direction} ${message}: ${result}`);
                    self.connectionId = false;
                    return;
                case -21:
                    message = 'error: NETWORK_CHANGED';
                    break;
                case -100:
                    message = 'error: CONNECTION_CLOSED';
                    break;
                case -102:
                    message = 'error: CONNECTION_REFUSED';
                    break;
                case -105:
                    message = 'error: NAME_NOT_RESOLVED';
                    break;
                case -106:
                    message = 'error: INTERNET_DISCONNECTED';
                    break;
                case -109:
                    message = 'error: ADDRESS_UNREACHABLE';
                    break;
            }
        }
        console.log(`${self.connectionType}: ${direction} ${message}: ${result}`);

        if (GUI.connected_to || GUI.connecting_to) {
            $('a.connect').click();
        } else {
            self.disconnect();
        }
    },
};

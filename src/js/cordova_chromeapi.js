'use strict';

const chromeCallbackWithError = function(message, callback) {
    let err;
    if (typeof message === 'string') {
        err = { 'message' : message };
    } else {
        err = message;
    }
    if (typeof callback !== 'function') {
        console.error(err.message);
        return;
    }
    try {
        if (typeof chrome.runtime !== 'undefined') {
            chrome.runtime.lastError = err;
        } else {
            console.error(err.message);
        }
        callback.apply(null, Array.prototype.slice.call(arguments, 2));
    } finally {
        if (typeof chrome.runtime !== 'undefined') {
            delete chrome.runtime.lastError;
        }
    }
};
const chromeCallbackWithSuccess = function(argument, callback) {
    if (typeof callback === 'function') {
        if (typeof argument === 'undefined') {
            callback();
        } else {
            callback(argument);
        }
    }
};

const removeItemOfAnArray = async function (array, item) {
    for (let i = (array.length - 1); i >= 0; i--) {
        if (array[i] === item) {
            return array.splice(i, 1);
        }
    }
    return array;
};


const chromeapiSerial = {
    logHeader: 'SERIAL (adapted from Cordova): ',
    connection: {
        connectionId: 1, // Only one connection possible
        paused: false,
        persistent: false,
        name,
        bufferSize: 4096,
        receiveTimeout: 0,
        sendTimeout: 0,
        bitrate: 9600,
        dataBits: 'eight',
        parityBit: 'no',
        stopBits: 'one',
        ctsFlowControl: false,
    },
    getDriver: function(vid, pid) {
        if (vid === 4292 && pid === 60000) {
            return 'Cp21xxSerialDriver'; //for Silabs CP2102 and all other CP210x
        }  else {
            return 'CdcAcmSerialDriver';
        }
    },
    setConnectionOptions: function(ConnectionOptions) {
        if (ConnectionOptions.persistent) {
            this.connection.persistent = ConnectionOptions.persistent;
        }
        if (ConnectionOptions.name) {
            this.connection.name = ConnectionOptions.name;
        }
        if (ConnectionOptions.bufferSize) {
            this.connection.bufferSize = ConnectionOptions.bufferSize;
        }
        if (ConnectionOptions.receiveTimeout) {
            this.connection.receiveTimeout = ConnectionOptions.receiveTimeout;
        }
        if (ConnectionOptions.sendTimeout) {
            this.connection.sendTimeout = ConnectionOptions.sendTimeout;
        }
        if (ConnectionOptions.bitrate) {
            this.connection.bitrate = ConnectionOptions.bitrate;
        }
        if (ConnectionOptions.dataBits) {
            this.connection.dataBits = ConnectionOptions.dataBits;
        }
        if (ConnectionOptions.parityBit) {
            this.connection.parityBit = ConnectionOptions.parityBit;
        }
        if (ConnectionOptions.stopBits) {
            this.connection.stopBits = ConnectionOptions.stopBits;
        }
        if (ConnectionOptions.ctsFlowControl) {
            this.connection.ctsFlowControl = ConnectionOptions.ctsFlowControl;
        }
    },
    getCordovaSerialConnectionOptions: function() {
        let dataBits, stopBits, parityBit;
        if (this.connection.dataBits === 'seven') {
            dataBits = 7;
        } else {
            dataBits = 8;
        }
        if (this.connection.stopBits === 'two') {
            stopBits = 2;
        } else {
            stopBits = 1;
        }
        if (this.connection.parityBit === 'odd') {
            parityBit = 0;
        } else if (this.connection.parityBit === 'even') {
            parityBit = 1;
        }
        return {
            baudRate: this.connection.bitrate,
            dataBits: dataBits,
            stopBits: stopBits,
            parity: parityBit,
            sleepOnPause: false,
        };
    },

    // Chrome serial API methods
    getDevices: async function(callback) {
        const self = this;
        cordova.plugins.usbevent.listDevices(function(list) {
            const devices = [];
            if (list.devices !== undefined) {
                let count = 0;
                list.devices.forEach(device => {
                    count++;
                    devices.push({
                        path: `${device.vendorId}/${device.productId}`,
                        vendorId: device.vendorId,
                        productId: device.productId,
                        displayName: `${device.vendorId}/${device.productId}`,
                    });
                    if (count === list.devices.length) {
                        if (callback) {
                            callback(devices);
                        }
                    }
                });
            } else {
                if (callback) {
                    callback(devices);
                }
            }
        }, function(error) {
            chromeCallbackWithError(self.logHeader+error, callback);
        });
    },
    connect: function(path, ConnectionOptions, callback) {
        const self = this;
        if (typeof ConnectionOptions !== 'undefined') {
            self.setConnectionOptions(ConnectionOptions);
        }
        const pathSplit = path.split('/');
        if (pathSplit.length === 2) {
            const vid = parseInt(pathSplit[0]);
            const pid = parseInt(pathSplit[1]);
            console.log(`${self.logHeader}request permission (vid=${vid} / pid=${pid})`);
            cordova_serial.requestPermission({vid: vid, pid: pid, driver: self.getDriver(vid, pid)}, function() {
                const options = self.getCordovaSerialConnectionOptions();
                cordova_serial.open(options, function () {
                    cordova_serial.registerReadCallback(function (data) {
                        const info = {
                            connectionId: self.connection.connectionId,
                            data: data,
                        };
                        self.onReceive.receiveData(info);
                    }, function () {
                        console.warn(`${self.logHeader}failed to register read callback`);
                    });
                    chromeCallbackWithSuccess(self.connection, callback);
                }, function(error) {
                    chromeCallbackWithError(self.logHeader+error, callback);
                });
            }, function(error) {
                chromeCallbackWithError(self.logHeader+error, callback);
            });
        } else {
            chromeCallbackWithError(`${self.logHeader} invalid vendor id / product id`, callback);
        }
    },
    disconnect: function(connectionId, callback) {
        const self = this;
        cordova_serial.close(function () {
            chromeCallbackWithSuccess(true, callback);
        }, function(error) {
            chromeCallbackWithError(self.logHeader+error, callback(false));
        });
    },
    setPaused: function(connectionId, paused, callback) {
        this.connection.paused = paused; // Change connectionInfo but don't pause the connection
        chromeCallbackWithSuccess(undefined, callback);
    },
    getInfo: function(callback) {
        chromeCallbackWithSuccess(this.connection, callback);
    },
    send: function(connectionId, data, callback) {
        const string = Array.prototype.map.call(new Uint8Array(data), x => (`00${x.toString(16)}`).slice(-2)).join('');
        cordova_serial.writeHex(string, function () {
            chromeCallbackWithSuccess({
                bytesSent: string.length >> 1,
            }, callback);
        }, function(error) {
            const info = {
                bytesSent: 0,
                error: 'undefined',
            };
            chrome.serial.onReceiveError.receiveError(info);
            chromeCallbackWithError(`SERIAL (adapted from Cordova): ${error}`, callback(info));
        });
    },
    // update: function() { },
    // getConnections: function() { },
    // flush: function() { },
    // setBreak: function() { },
    // clearBreak: function() { },

    onReceive: {
        listeners: [],
        addListener: function(functionReference) {
            this.listeners.push(functionReference);
        },
        removeListener: async function(functionReference) {
            this.listeners = await removeItemOfAnArray(this.listeners, functionReference);
        },
        receiveData: function(data) {
            if (data.data.byteLength > 0) {
                for (let i = (this.listeners.length - 1); i >= 0; i--) {
                    this.listeners[i](data);
                }
            }
        },
    },
    onReceiveError: {
        listeners: [],
        addListener: function(functionReference) {
            this.listeners.push(functionReference);
        },
        removeListener: async function(functionReference) {
            this.listeners = await removeItemOfAnArray(this.listeners, functionReference);
        },
        receiveError: function(error) {
            for (let i = (this.listeners.length - 1); i >= 0; i--) {
                this.listeners[i](error);
            }
        },
    },
};

const cordovaChromeapi = {
    init: function(callback) {
        chrome.serial = chromeapiSerial;
        if (callback) {
            callback();
        }
    },
};

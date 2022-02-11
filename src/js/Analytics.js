'use strict';

const Analytics = function (trackingId, userId, appName, appVersion, changesetId, debugMode)
{
    const self = this;

    self.trackingId = trackingId;

    self.googleAnalytics = googleAnalytics;

    self.googleAnalytics.initialize(self.trackingId, {
        storage: 'none',
        clientId: userId,
        debug: !!debugMode
    });

    // Make it work for the Chrome App:
    self.googleAnalytics.set('forceSSL', true);
    self.googleAnalytics.set('transport', 'xhr');

    // Make it work for NW.js:
    self.googleAnalytics.set('checkProtocolTask', null);

    self.googleAnalytics.set('appName', appName);
    self.googleAnalytics.set('appVersion', debugMode ? appVersion + '-debug' : appVersion);

    self.EVENT_CATEGORIES = {
        APPLICATION: 'Application',
        FLIGHT_CONTROLLER: 'FlightController',
        FLASHING: 'Flashing',
    };

    self.EVENT_TYPES = {
        APP_START: 'AppStart',
        APP_CLOSE: 'AppClose',
        LANGUAGE: 'Language',
        PARAMETER: 'Parameter',
        FLASHING: 'Flashing',
        EXIT_DFU: 'ExitDfu',
        SET_DEFAULTS: 'SetDefaults',
        MASS_STORAGE: 'MassStorage',
        ENABLE_ARMING: 'EnableArming',
        MIXER_OVERRIDE: 'MixerOverride',
        SERVO_OVERRIDE: 'ServoOverride',
        MOTOR_OVERRIDE: 'MotorOverride',
        PROBLEM_FOUND: 'ProblemFound',
    };

    self.DATA = {
        API_VERSION: 'apiVersion',
        FIRMWARE_NAME: 'firmwareName',
        FIRMWARE_SOURCE: 'firmwareSource',
        FIRMWARE_CHANNEL: 'firmwareChannel',
        FIRMWARE_TARGET: 'firmwareTarget',
        FIRMWARE_VERSION: 'firmwareVersion',
        FIRMWARE_GIT_HASH: 'firmwareChangesetId',
        FIRMWARE_SIZE: 'firmwareSize',
        MANUFACTURER: 'manufacturerId',
        BOARD_NAME: 'boardName',
        BOARD_TYPE: 'boardType',
        MCU_TYPE: 'mcuType',
        SYSTEM_LOAD: 'systemLoad',
        CPU_LOAD: 'cpuLoad',
        LOG_SIZE: 'logSize',
        LOGGING_STATUS: 'loggingStatus',
    };

    self.DIMENSIONS = {
        CONFIGURATOR_VERSION: 1,
        CONFIGURATOR_GIT_HASH: 2,
        CONFIGURATOR_OS: 3,
        API_VERSION: 4,
        FIRMWARE_NAME: 5,
        FIRMWARE_SOURCE: 6,
        FIRMWARE_CHANNEL: 7,
        FIRMWARE_TARGET: 8,
        FIRMWARE_VERSION: 9,
        FIRMWARE_GIT_HASH: 10,
        MANUFACTURER: 11,
        BOARD_NAME: 12,
        BOARD_TYPE: 13,
        MCU_TYPE: 14,
        MCU_ID: 15,
    };

    self.METRICS = {
        FIRMWARE_SIZE: 1,
        SYSTEM_LOAD: 2,
        CPU_LOAD: 3,
        LOG_SIZE: 4,
    };

    self.resetFlightControllerData();
    self.resetFirmwareData();

    self.setDimension(self.DIMENSIONS.CONFIGURATOR_VERSION, appVersion);
    self.setDimension(self.DIMENSIONS.CONFIGURATOR_GIT_HASH, changesetId);
    self.setDimension(self.DIMENSIONS.CONFIGURATOR_OS, GUI.operating_system);
};

Analytics.prototype.sendEvent = function (category, action, options) {
    const self = this;
    self.googleAnalytics.event(category, action, options);
};

Analytics.prototype.setDimension = function (dimension, value) {
    const self = this;
    const dimensionName = `dimension${dimension}`;
    self.googleAnalytics.custom(dimensionName, value);
};

Analytics.prototype.setMetric = function (metric, value) {
    const self = this;
    const metricName = `metric${metric}`;
    self.googleAnalytics.custom(metricName, value);
};

Analytics.prototype.sendTabView = function (viewName) {
    const self = this;
    self.googleAnalytics.pageview(viewName, { title: 'Tab::' + viewName } );
};

Analytics.prototype.sendPageView = function (viewName) {
    const self = this;
    self.googleAnalytics.pageview(viewName, { title: viewName } );
};

Analytics.prototype.sendScreenView = function (viewName) {
    const self = this;
    self.googleAnalytics.screenview(viewName);
};

Analytics.prototype.sendTiming = function (category, timing, value) {
    const self = this;
    self.googleAnalytics.timing(category, timing, value);
};

Analytics.prototype.sendException = function (message) {
    const self = this;
    self.googleAnalytics.exception(message);
};

Analytics.prototype.rebuildFlightControllerEvent = function () {
    const self = this;
    self.setDimension(self.DIMENSIONS.API_VERSION, self.flightControllerData[self.DATA.API_VERSION]);
    self.setDimension(self.DIMENSIONS.FIRMWARE_TARGET, self.flightControllerData[self.DATA.FIRMWARE_TARGET]);
    self.setDimension(self.DIMENSIONS.FIRMWARE_VERSION, self.flightControllerData[self.DATA.FIRMWARE_VERSION]);
    self.setDimension(self.DIMENSIONS.FIRMWARE_GIT_HASH, self.flightControllerData[self.DATA.FIRMWARE_GIT_HASH]);
    self.setDimension(self.DIMENSIONS.MANUFACTURER, self.flightControllerData[self.DATA.MANUFACTURER]);
    self.setDimension(self.DIMENSIONS.BOARD_NAME, self.flightControllerData[self.DATA.BOARD_NAME]);
    self.setDimension(self.DIMENSIONS.BOARD_TYPE, self.flightControllerData[self.DATA.BOARD_TYPE]);
    self.setDimension(self.DIMENSIONS.MCU_TYPE, self.flightControllerData[self.DATA.MCU_TYPE]);
    self.setDimension(self.DIMENSIONS.MCU_ID, self.flightControllerData[self.DATA.MCU_ID]);
};

Analytics.prototype.setFlightControllerData = function (property, value) {
    const self = this;
    self.flightControllerData[property] = value;
    self.rebuildFlightControllerEvent();
};

Analytics.prototype.resetFlightControllerData = function () {
    const self = this;
    self.flightControllerData = {};
    self.rebuildFlightControllerEvent();
};

Analytics.prototype.rebuildFirmwareEvent = function () {
    const self = this;
    self.setDimension(self.DIMENSIONS.FIRMWARE_NAME, self.firmwareData[self.DATA.FIRMWARE_NAME]);
    self.setDimension(self.DIMENSIONS.FIRMWARE_SOURCE, self.firmwareData[self.DATA.FIRMWARE_SOURCE]);
    self.setDimension(self.DIMENSIONS.FIRMWARE_CHANNEL, self.firmwareData[self.DATA.FIRMWARE_CHANNEL]);
    self.setMetric(self.METRICS.FIRMWARE_SIZE, self.firmwareData[self.DATA.FIRMWARE_SIZE]);
};

Analytics.prototype.setFirmwareData = function (property, value) {
    const self = this;
    self.firmwareData[property] = value;
    self.rebuildFirmwareEvent();
};

Analytics.prototype.resetFirmwareData = function () {
    const self = this;
    self.firmwareData = {};
    self.rebuildFirmwareEvent();
};

Analytics.prototype.sendChangeEvents = function (category, changeList) {
    const self = this;
    setTimeout(function() {
        for (const actionName in changeList) {
            if (changeList.hasOwnProperty(actionName)) {
                const actionValue = changeList[actionName];
                if (actionValue !== undefined) {
                    self.sendEvent(category, self.EVENT_TYPES.PARAMETER, { eventLabel: actionName, eventValue: actionValue });
                }
            }
        }
    });
};

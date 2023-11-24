'use strict';

TABS.power = {
    isDirty: false,
    needReboot: false,
    voltageMeterCount: 0,
    currentMeterCount: 0,
    batteryMeterTypes: [
        'None',
        'Adc',
        'Esc',
    ],
    currentMeterTypes: [
        'None',
        'Adc',
        'Esc',
    ],
};

TABS.power.initialize = function (callback) {
    const self = this;

    if (GUI.calibrationManager) {
        GUI.calibrationManager.destroy();
    }
    if (GUI.calibrationManagerConfirmation) {
        GUI.calibrationManagerConfirmation.destroy();
    }

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/power.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_VOLTAGE_METERS))
            .then(() => MSP.promise(MSPCodes.MSP_CURRENT_METERS))
            .then(() => MSP.promise(MSPCodes.MSP_CURRENT_METER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_VOLTAGE_METER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_BATTERY_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_BATTERY_STATE))
            .then(callback);
    }

    function save_data(callback) {
        function save_battery_config() {
            MSP.send_message(MSPCodes.MSP_SET_BATTERY_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_BATTERY_CONFIG), false, save_voltage_config);
        }
        function save_voltage_config() {
            mspHelper.sendVoltageConfig(save_current_config);
        }
        function save_current_config() {
            mspHelper.sendCurrentConfig(save_to_eeprom);
        }
        function save_to_eeprom() {
            MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, save_completed);
        }
        function save_completed() {
            GUI.log(i18n.getMessage('eepromSaved'));
            if (self.needReboot) {
                MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                GUI.log(i18n.getMessage('deviceRebooting'));
                reinitialiseConnection(callback);
            } else {
                callback?.();
            }
        }

        save_battery_config();
    }

    function updateData() {
        for (let index = 0; index < FC.VOLTAGE_METER_CONFIGS.length; index++) {
            const meterId = FC.VOLTAGE_METER_CONFIGS[index].id;
            if (FC.VOLTAGE_METER_CONFIGS[index].sensorType == 1) {
                FC.VOLTAGE_METER_CONFIGS[index].vbatscale = parseInt($(`input[name="vbatscale-${meterId}"]`).val());
                FC.VOLTAGE_METER_CONFIGS[index].vbatresdivval = parseInt($(`input[name="vbatresdivval-${meterId}"]`).val());
                //FC.VOLTAGE_METER_CONFIGS[index].vbatresdivmultiplier = parseInt($(`input[name="vbatresdivmultiplier-${meterId}"]`).val());
            }
        }

        for (let index = 0; index < FC.CURRENT_METER_CONFIGS.length; index++) {
            const meterId = FC.CURRENT_METER_CONFIGS[index].id;
            if (FC.CURRENT_METER_CONFIGS[index].sensorType == 1) {
                FC.CURRENT_METER_CONFIGS[index].scale = parseInt($(`input[name="amperagescale-${meterId}"]`).val());
                FC.CURRENT_METER_CONFIGS[index].offset = parseInt($(`input[name="amperageoffset-${meterId}"]`).val());
            }
        }

        FC.BATTERY_CONFIG.vbatmincellvoltage = parseFloat($('input[name="mincellvoltage"]').val());
        FC.BATTERY_CONFIG.vbatmaxcellvoltage = parseFloat($('input[name="maxcellvoltage"]').val());
        FC.BATTERY_CONFIG.vbatwarningcellvoltage = parseFloat($('input[name="warningcellvoltage"]').val());

        FC.BATTERY_CONFIG.capacity = parseInt($('input[name="capacity"]').val());
    }

    function updateDisplay(voltageDataSource, currentDataSource) {

        // voltage meters
        if (!voltageDataSource) {
            voltageDataSource = [];
            for (let index = 0; index < FC.VOLTAGE_METER_CONFIGS.length; index++) {
                const meterId = FC.VOLTAGE_METER_CONFIGS[index].id;
                voltageDataSource[index] = {
                    id: meterId,
                    sensorType: 1,
                    vbatscale: parseInt($(`input[name="vbatscale-${meterId}"]`).val()),
                    vbatresdivval: parseInt($(`input[name="vbatresdivval-${meterId}"]`).val()),
                    //vbatresdivmultiplier: parseInt($(`input[name="vbatresdivmultiplier-${meterId}"]`).val())
                };
            }
        }

        $('.tab-power .boxVoltageConfiguration').toggle(FC.VOLTAGE_METERS.length > 0);

        const destinationVoltageMeter = $('.tab-power .voltage-meters');
        destinationVoltageMeter.empty();

        const templateVoltageMeter = $('#tab-power-templates .voltage-meters .voltage-meter');
        for (let index = 0; index < FC.VOLTAGE_METERS.length; index++) {
            const meterId = FC.VOLTAGE_METERS[index].id;

            const elementVoltageMeter = templateVoltageMeter.clone();
            elementVoltageMeter.attr('id', `voltage-meter-${meterId}`);

            const message = i18n.getMessage('powerVoltageId' + meterId);
            elementVoltageMeter.find('.label').text(message);

            destinationVoltageMeter.append(elementVoltageMeter);
        }

        const templateVoltageConfiguration = $('#tab-power-templates .voltage-configuration');
        for (let index = 0; index < FC.VOLTAGE_METER_CONFIGS.length; index++) {
            const meterId = FC.VOLTAGE_METER_CONFIGS[index].id;

            if (FC.VOLTAGE_METER_CONFIGS[index].sensorType == 1) {
                const destinationVoltageConfiguration = $(`#voltage-meter-${meterId} .configuration`);
                const elementVoltageConfiguration = templateVoltageConfiguration.clone();

                const attributeNames = [ "vbatscale", "vbatresdivval" ]; //, "vbatresdivmultiplier" ];
                for (let attribute of attributeNames) {
                    elementVoltageConfiguration.find(`input[name="${attribute}"]`).attr('name', `${attribute}-${meterId}`);
                }

                destinationVoltageConfiguration.append(elementVoltageConfiguration);

                $(`input[name="vbatscale-${meterId}"]`).val(voltageDataSource[index].vbatscale);
                $(`input[name="vbatresdivval-${meterId}"]`).val(voltageDataSource[index].vbatresdivval);
                //$(`input[name="vbatresdivmultiplier-${meterId}"]`).val(voltageDataSource[index].vbatresdivmultiplier);
            }
        }

        // amperage meters
        if (!currentDataSource) {
            currentDataSource = [];
            for (let index = 0; index < FC.CURRENT_METER_CONFIGS.length; index++) {
                const meterId = FC.CURRENT_METER_CONFIGS[index].id;
                currentDataSource[index] = {
                    id: meterId,
                    sensorType: 1,
                    scale: parseInt($(`input[name="amperagescale-${meterId}"]`).val()),
                    offset: parseInt($(`input[name="amperageoffset-${meterId}"]`).val()),
                };
            }
        }

        $('.tab-power .boxAmperageConfiguration').toggle(FC.CURRENT_METERS.length > 0);

        const destinationAmperageMeter = $('.tab-power .amperage-meters');
        destinationAmperageMeter.empty();

        const templateAmperageMeter = $('#tab-power-templates .amperage-meters .amperage-meter');
        for (let index = 0; index < FC.CURRENT_METERS.length; index++) {
            const meterId = FC.CURRENT_METERS[index].id;

            const elementAmperageMeter = templateAmperageMeter.clone();
            elementAmperageMeter.attr('id', `amperage-meter-${meterId}`);

            const message = i18n.getMessage('powerAmperageId' + meterId);
            elementAmperageMeter.find('.label').text(message);

            destinationAmperageMeter.append(elementAmperageMeter);
        }

        const templateAmperageConfiguration = $('#tab-power-templates .amperage-configuration');
        for (let index = 0; index < FC.CURRENT_METER_CONFIGS.length; index++) {
            const meterId = FC.CURRENT_METER_CONFIGS[index].id;

            if (FC.CURRENT_METER_CONFIGS[index].sensorType == 1) {
                const destinationAmperageConfiguration = $(`#amperage-meter-${meterId} .configuration`);
                const elementAmperageConfiguration = templateAmperageConfiguration.clone();

                const attributeNames = [ "amperagescale", "amperageoffset" ];
                for (let attributeName of attributeNames) {
                    elementAmperageConfiguration.find(`input[name="${attributeName}"]`).attr('name', `${attributeName}-${meterId}`);
                }
                destinationAmperageConfiguration.append(elementAmperageConfiguration);

                $(`input[name="amperagescale-${meterId}"]`).val(currentDataSource[index].scale);
                $(`input[name="amperageoffset-${meterId}"]`).val(currentDataSource[index].offset);
            }
        }

        $('.calibration').toggle(FC.BATTERY_CONFIG.voltageMeterSource == 1 || FC.BATTERY_CONFIG.currentMeterSource == 1);
    }

    function initDisplay() {

        $(".tab-power").addClass("supported");

        $("#calibrationmanagercontent").hide();
        $("#calibrationmanagerconfirmcontent").hide();

        const templateBatteryState = $('#tab-power-templates .battery-state .battery-state');
        const destinationBatteryState = $('.tab-power .battery-state');
        const elementBatteryState = templateBatteryState.clone();

        elementBatteryState.find('.connection-state').attr('id', 'battery-connection-state');
        elementBatteryState.find('.voltage').attr('id', 'battery-voltage');
        elementBatteryState.find('.amperage').attr('id', 'battery-amperage');
        elementBatteryState.find('.mah-drawn').attr('id', 'battery-mah-drawn');

        destinationBatteryState.append(elementBatteryState.children());

        const templateBatteryConfiguration = $('#tab-power-templates .battery-configuration');
        const destinationBatteryConfiguration = $('.tab-power .battery .configuration');
        const elementBatteryConfiguration = templateBatteryConfiguration.clone();

        destinationBatteryConfiguration.append(elementBatteryConfiguration);

        $('input[name="mincellvoltage"]').prop('step','0.01');
        $('input[name="maxcellvoltage"]').prop('step','0.01');
        $('input[name="warningcellvoltage"]').prop('step','0.01');

        $('input[name="mincellvoltage"]').val(FC.BATTERY_CONFIG.vbatmincellvoltage).change();
        $('input[name="maxcellvoltage"]').val(FC.BATTERY_CONFIG.vbatmaxcellvoltage).change();
        $('input[name="warningcellvoltage"]').val(FC.BATTERY_CONFIG.vbatwarningcellvoltage).change();
        $('input[name="capacity"]').val(FC.BATTERY_CONFIG.capacity).change();

        let batteryMeterType_e = $('select.batterymetersource');
        self.batteryMeterTypes.forEach((item, index) => {
            const text = i18n.getMessage('powerBatteryVoltageMeterType' + item);
            batteryMeterType_e.append(`<option value="${index}">${text}</option>`);
        });

        let currentMeterType_e = $('select.currentmetersource');
        self.currentMeterTypes.forEach((item, index) => {
            const text = i18n.getMessage('powerBatteryCurrentMeterType' + item);
            currentMeterType_e.append(`<option value="${index}">${text}</option>`);
        });

        updateDisplay(FC.VOLTAGE_METER_CONFIGS, FC.CURRENT_METER_CONFIGS);

        let sourceschanged = false;

        batteryMeterType_e = $('select.batterymetersource');
        batteryMeterType_e.val(FC.BATTERY_CONFIG.voltageMeterSource).change();
        batteryMeterType_e.change(function () {
            FC.BATTERY_CONFIG.voltageMeterSource = parseInt($(this).val());
            sourceschanged = true;
            setDirty(true);
        });

        currentMeterType_e = $('select.currentmetersource');
        currentMeterType_e.val(FC.BATTERY_CONFIG.currentMeterSource).change();
        currentMeterType_e.change(function () {
            FC.BATTERY_CONFIG.currentMeterSource = parseInt($(this).val());
            sourceschanged = true;
            setDirty(true);
        });

        function get_slow_data() {
            MSP.send_message(MSPCodes.MSP_VOLTAGE_METERS, false, false, function () {
                if (FC.VOLTAGE_METERS.length > self.voltageMeterCount) {
                    self.voltageMeterCount = FC.VOLTAGE_METERS.length;
                    updateDisplay();
                }
                for (let i = 0; i < FC.VOLTAGE_METERS.length; i++) {
                    const meterId = FC.VOLTAGE_METERS[i].id;
                    const voltage = FC.VOLTAGE_METERS[i].voltage;
                    const decimals = (voltage < 4) ? 3 : 2;
                    const elementVoltageMeters = $(`#voltage-meter-${meterId} .value`);
                    elementVoltageMeters.text(i18n.getMessage('powerVoltageValue', [voltage.toFixed(decimals)]));
                }
            });

            MSP.send_message(MSPCodes.MSP_CURRENT_METERS, false, false, function () {
                if (FC.CURRENT_METERS.length > self.currentMeterCount) {
                    self.currentMeterCount = FC.CURRENT_METERS.length;
                    updateDisplay();
                }
                for (let i = 0; i < FC.CURRENT_METERS.length; i++) {
                    const meterId = FC.CURRENT_METERS[i].id;
                    const amperage = FC.CURRENT_METERS[i].amperage;
                    const elementCurrentMeters = $(`#amperage-meter-${meterId} .value`);
                    elementCurrentMeters.text(i18n.getMessage('powerAmperageValue', [amperage.toFixed(2)]));
                }
            });

            MSP.send_message(MSPCodes.MSP_BATTERY_STATE, false, false, function () {
                let elementMspBatteryState;
                elementMspBatteryState = $(`#battery-connection-state .value`);
                elementMspBatteryState.text(FC.BATTERY_STATE.cellCount > 0
                    ? i18n.getMessage('powerBatteryConnectedValueYes', [FC.BATTERY_STATE.cellCount])
                    : i18n.getMessage('powerBatteryConnectedValueNo'));
                elementMspBatteryState = $(`#battery-voltage .value`);
                elementMspBatteryState.text(i18n.getMessage('powerVoltageValue', [FC.BATTERY_STATE.voltage]));
                elementMspBatteryState = $(`#battery-amperage .value`);
                elementMspBatteryState.text(i18n.getMessage('powerAmperageValue', [FC.BATTERY_STATE.amperage]));
                elementMspBatteryState = $(`#battery-mah-drawn .value`);
                elementMspBatteryState.text(i18n.getMessage('powerMahValue', [FC.BATTERY_STATE.mAhDrawn]));
            });
        }


    //// calibration manager

        GUI.calibrationManager = new jBox('Modal', {
            width: 400,
            height: 250,
            closeButton: 'title',
            animation: false,
            attach: $('#calibrationmanager'),
            title: i18n.getMessage('powerCalibrationManagerTitle'),
            content: $('#calibrationmanagercontent'),
            onCloseComplete: function() {
                GUI.calibrationManager.close();
            },
        });

        GUI.calibrationManagerConfirmation = new jBox('Modal', {
            width: 400,
            height: 250,
            closeButton: 'title',
            animation: false,
            attach: $('#calibrate'),
            title: i18n.getMessage('powerCalibrationManagerConfirmationTitle'),
            content: $('#calibrationmanagerconfirmcontent'),
            onCloseComplete: function() {
                GUI.calibrationManager.close();
            },
        });

        let vbatscalechanged = false;
        let amperagescalechanged = false;

        let vbatnewscale = 0;
        let amperagenewscale = 0;

        $('input[name="vbatcalibration"]').val(0);
        $('input[name="amperagecalibration"]').val(0);

        $('a.calibrationmanager').click(function() {
            vbatscalechanged = false;
            amperagescalechanged = false;
            if (FC.BATTERY_CONFIG.voltageMeterSource == 1 && FC.BATTERY_STATE.voltage > 0.1) {
                $('.vbatcalibration').show();
            } else {
                $('.vbatcalibration').hide();
            }
            if ((FC.BATTERY_CONFIG.currentMeterSource == 1) && FC.BATTERY_STATE.amperage > 0.1) {
                $('.amperagecalibration').show();
            } else {
                $('.amperagecalibration').hide();
            }
            if (FC.BATTERY_STATE.cellCount == 0) {
                $('.vbatcalibration').hide();
                $('.amperagecalibration').hide();
                $('.calibrate').hide();
                $('.nocalib').show();
            } else {
                $('.calibrate').show();
                $('.nocalib').hide();
            }
            if (sourceschanged) {
                $('.srcchange').show();
                $('.vbatcalibration').hide();
                $('.amperagecalibration').hide();
                $('.calibrate').hide();
                $('.nocalib').hide();
            } else {
                $('.srcchange').hide();
            }
        });

        $('a.calibrate').click(function() {
            if (FC.BATTERY_CONFIG.voltageMeterSource == 1) {
                const vbatcalibration = parseFloat($('input[name="vbatcalibration"]').val());
                if (vbatcalibration != 0) {
                    vbatnewscale = Math.round(FC.VOLTAGE_METER_CONFIGS[0].vbatscale * (vbatcalibration / FC.VOLTAGE_METERS[0].voltage));
                    if (vbatnewscale >= 1 && vbatnewscale <= 65535) {
                        vbatscalechanged = true;
                    }
                }
            }
            if (FC.BATTERY_CONFIG.currentMeterSource == 1) {
                const amperagecalibration = parseFloat($('input[name="amperagecalibration"]').val());
                const amperageoffset = FC.CURRENT_METER_CONFIGS[0].offset / 1000;
                if (amperagecalibration != 0) {
                    if (FC.CURRENT_METERS[0].amperage != amperageoffset && amperagecalibration != amperageoffset) {
                        amperagenewscale = Math.round(FC.CURRENT_METER_CONFIGS[0].scale *
                            ((FC.CURRENT_METERS[0].amperage -  amperageoffset) / (amperagecalibration - amperageoffset)));
                        if (amperagenewscale > -16000 && amperagenewscale < 16000 && amperagenewscale != 0) {
                            amperagescalechanged = true;
                        }
                    }
                }
            }
            if (vbatscalechanged || amperagescalechanged) {
                $('.vbatcalibration').toggle(vbatscalechanged);
                $('.amperagecalibration').toggle(amperagescalechanged);

                $('output[name="vbatnewscale"').val(vbatnewscale);
                $('output[name="amperagenewscale"').val(amperagenewscale);

                $('a.applycalibration').click(function() {
                    GUI.calibrationManagerConfirmation.close();
                    $('input[name="vbatscale-10').val(vbatnewscale).change();
                    $('input[name="amperagescale-10"').val(amperagenewscale).change();
                });

                $('a.discardcalibration').click(function() {
                    GUI.calibrationManagerConfirmation.close();
                });
            }
            else {
                GUI.calibrationManagerConfirmation.close();
            }
        });

    //// calibration manager end

        const saveButton = $('.content_toolbar .save_btn');
        const rebootButton = $('.content_toolbar .reboot_btn');
        const revertButton = $('.content_toolbar .revert_btn');

        self.isDirty = false;
        self.needReboot = false;

        function setDirty(reboot = false) {
            self.isDirty = true;
            self.needReboot |= reboot;
            if (self.needReboot) {
                saveButton.hide();
                rebootButton.show();
            } else {
                saveButton.show();
                rebootButton.hide();
            }
            revertButton.show();
        }

        saveButton.hide();
        rebootButton.hide();
        revertButton.hide();

        self.save = function (callback) {
            updateData();
            save_data(callback);
        };

        self.revert = function (callback) {
            callback();
        };

        $('a.save').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.reboot').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        $('.content_wrapper').change(function () {
            setDirty();
        });

        GUI.interval_add('data_pull_slow', get_slow_data, 200, true); // 5hz
    }

    function process_html() {
        initDisplay();

        // translate to user-selected language
        i18n.localizePage();

        GUI.content_ready(callback);
    }
};

TABS.power.cleanup = function (callback) {
    GUI.calibrationManager?.destroy();
    GUI.calibrationManagerConfirmation?.destroy();

    this.isDirty = false;

    if (callback) callback();
};

import { API_VERSION_12_10 } from "@/js/configurator.svelte.js";
import semver from "semver";

const tab = {
    tabName: 'power',
    isDirty: false,
    needReboot: false,
    voltageMeterCount: 0,
    currentMeterCount: 0,
    BATTER_CONFIG_COPY: null,
    VOLTAGE_METER_CONFIGS_COPY: null,
    CURRENT_METER_CONFIGS_COPY: null,
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

tab.initialize = function (callback) {
    const self = this;

    if (GUI.calibrationManager) {
        GUI.calibrationManager.destroy();
    }
    if (GUI.calibrationManagerConfirmation) {
        GUI.calibrationManagerConfirmation.destroy();
    }

    load_data(load_html);

    function load_html() {
        $('#content').load("/src/tabs/power.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_BATTERY_STATE))
            .then(() => MSP.promise(MSPCodes.MSP_VOLTAGE_METERS))
            .then(() => MSP.promise(MSPCodes.MSP_CURRENT_METERS))
            .then(() => MSP.promise(MSPCodes.MSP_BATTERY_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_VOLTAGE_METER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_CURRENT_METER_CONFIG))
            .then(callback);
    }

    function send_data(callback) {
        MSP.send_message(MSPCodes.MSP_SET_BATTERY_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_BATTERY_CONFIG), false, () => {
            mspHelper.sendVoltageConfig(() => {
                mspHelper.sendCurrentConfig(callback);
            });
        });
    }

    function save_data(callback) {
        send_data(() => {
            MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, () => {
                GUI.log(i18n.getMessage('eepromSaved'));
                if (self.needReboot) {
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                    GUI.log(i18n.getMessage('deviceRebooting'));
                    reinitialiseConnection(callback);
                } else {
                    callback?.();
                }
            });
        });
    }

    function revertData() {
        FC.BATTERY_CONFIG = self.BATTER_CONFIG_COPY;
        FC.VOLTAGE_METER_CONFIGS = self.VOLTAGE_METER_CONFIGS_COPY;
        FC.CURRENT_METER_CONFIGS = self.CURRENT_METER_CONFIGS_COPY;
    }

    function updateDisplay() {

        // Voltage Meters
        $('.tab-power .boxVoltageConfiguration').toggle(FC.VOLTAGE_METERS.length > 0);

        const destinationVoltageMeter = $('.tab-power .voltage-meters');

        destinationVoltageMeter.empty();

        const templateVoltageMeter = $('#tab-power-templates .voltage-meters .voltage-meter');
        const templateVoltageConfiguration = $('#tab-power-templates .voltage-configuration');

        for (let index = 0; index < FC.VOLTAGE_METERS.length; index++) {
            const meterId = FC.VOLTAGE_METERS[index].id;

            const elementVoltageMeter = templateVoltageMeter.clone();
            const destVoltageConfiguration = elementVoltageMeter.find('.configuration');

            elementVoltageMeter.attr('id', `voltage-meter-${meterId}`);
            elementVoltageMeter.find('.label').text(i18n.getMessage('powerVoltageId' + meterId));

            for (let jndex = 0; jndex < FC.VOLTAGE_METER_CONFIGS.length; jndex++) {
                if (FC.VOLTAGE_METER_CONFIGS[jndex].sensorType == 1) {
                    if (FC.VOLTAGE_METER_CONFIGS[jndex].id == meterId) {
                        const elementVoltageConfiguration = templateVoltageConfiguration.clone();

                        elementVoltageConfiguration.find('input[name="vbatscale"]')
                            .val(FC.VOLTAGE_METER_CONFIGS[jndex].vbatscale)
                            .change(function () {
                                FC.VOLTAGE_METER_CONFIGS[jndex].vbatscale = getIntegerValue(this);
                                mspHelper.sendVoltageMeterConfig(jndex);
                            });

                        elementVoltageConfiguration.find('input[name="vbatresdivval"]')
                            .val(FC.VOLTAGE_METER_CONFIGS[jndex].vbatresdivval)
                            .change(function () {
                                FC.VOLTAGE_METER_CONFIGS[jndex].vbatresdivval = getIntegerValue(this);
                                mspHelper.sendVoltageMeterConfig(jndex);
                            });

                        destVoltageConfiguration.append(elementVoltageConfiguration);
                    }
                }
            }

            destinationVoltageMeter.append(elementVoltageMeter);
        }

        // Current Meters
        $('.tab-power .boxAmperageConfiguration').toggle(FC.CURRENT_METERS.length > 0);

        const destinationAmperageMeter = $('.tab-power .amperage-meters');

        destinationAmperageMeter.empty();

        const templateAmperageMeter = $('#tab-power-templates .amperage-meters .amperage-meter');
        const templateAmperageConfiguration = $('#tab-power-templates .amperage-configuration');

        for (let index = 0; index < FC.CURRENT_METERS.length; index++) {
            const meterId = FC.CURRENT_METERS[index].id;

            const elementAmperageMeter = templateAmperageMeter.clone();
            const destAmperageConfiguration = elementAmperageMeter.find('.configuration');

            elementAmperageMeter.attr('id', `amperage-meter-${meterId}`);
            elementAmperageMeter.find('.label').text(i18n.getMessage('powerAmperageId' + meterId));

            for (let jndex = 0; jndex < FC.CURRENT_METER_CONFIGS.length; jndex++) {
                if (FC.CURRENT_METER_CONFIGS[jndex].sensorType == 1) {
                    if (FC.CURRENT_METER_CONFIGS[jndex].id == meterId) {
                        const elementAmperageConfiguration = templateAmperageConfiguration.clone();

                        elementAmperageConfiguration.find('input[name="amperagescale"]')
                            .val(FC.CURRENT_METER_CONFIGS[jndex].scale)
                            .change(function () {
                                FC.CURRENT_METER_CONFIGS[jndex].scale = getIntegerValue(this);
                                mspHelper.sendCurrentMeterConfig(jndex);
                            });

                        elementAmperageConfiguration.find('input[name="amperageoffset"]')
                            .val(FC.CURRENT_METER_CONFIGS[jndex].offset)
                            .change(function () {
                                FC.CURRENT_METER_CONFIGS[jndex].offset = getIntegerValue(this);
                                mspHelper.sendCurrentMeterConfig(jndex);
                            });

                        destAmperageConfiguration.append(elementAmperageConfiguration);
                    }
                }

                destinationAmperageMeter.append(elementAmperageMeter);
            }
        }

        $('.calibration').toggle(FC.BATTERY_CONFIG.voltageMeterSource == 1 || FC.BATTERY_CONFIG.currentMeterSource == 1);
    }

    function initDisplay() {

        $("#calibrationmanagercontent").hide();
        $("#calibrationmanagerconfirmcontent").hide();

        const templateBatteryState = $('#tab-power-templates .battery-state .battery-state');
        const destinationBatteryState = $('.tab-power .battery-state');
        const elementBatteryState = templateBatteryState.clone();

        destinationBatteryState.append(elementBatteryState.children());

        const templateBatteryConfiguration = $('#tab-power-templates .battery-configuration');
        const destinationBatteryConfiguration = $('.tab-power .battery .configuration');
        const elementBatteryConfiguration = templateBatteryConfiguration.clone();

        destinationBatteryConfiguration.append(elementBatteryConfiguration);

        elementBatteryConfiguration.find('input[name="mincellvoltage"]')
            .val(FC.BATTERY_CONFIG.vbatmincellvoltage).change()
            .change(function () {
                FC.BATTERY_CONFIG.vbatmincellvoltage = getFloatValue(this);
            });

            elementBatteryConfiguration.find('input[name="fullcellvoltage"]')
            .val(FC.BATTERY_CONFIG.vbatfullcellvoltage).change()
            .change(function () {
                FC.BATTERY_CONFIG.vbatfullcellvoltage = getFloatValue(this);
            });

        elementBatteryConfiguration.find('input[name="maxcellvoltage"]')
            .val(FC.BATTERY_CONFIG.vbatmaxcellvoltage).change()
            .change(function () {
                FC.BATTERY_CONFIG.vbatmaxcellvoltage = getFloatValue(this);
            });

        elementBatteryConfiguration.find('input[name="warningcellvoltage"]')
            .val(FC.BATTERY_CONFIG.vbatwarningcellvoltage).change()
            .change(function () {
                FC.BATTERY_CONFIG.vbatwarningcellvoltage = getFloatValue(this);
            });

        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_10)) {
            elementBatteryConfiguration.find('input[name="capacity"]').closest('.number').hide();

            const fieldset = $('<fieldset class="battery-capacities-fieldset"></fieldset>');
            const legend = $('<legend></legend>').text(i18n.getMessage('powerBatteryCapacity'));
            fieldset.append(legend);

            const capacityContainer = $('<div class="battery-capacities"></div>');
            for (let i = 0; i < 6; i++) {
                const wrapper = $('<div class="number"></div>');
                const label = $('<label></label>');
                const prefix = $('<span class="prefix"></span>').text((i + 1) + ':');
                const suffix = $('<span class="suffix"></span>').text('mAh');
                const input = $('<input type="number" name="capacity_' + i + '" step="50" min="0" max="20000" />');
                
                input.val(FC.BATTERY_CONFIG.capacity[i]);
                input.change(function () {
                    FC.BATTERY_CONFIG.capacity[i] = getIntegerValue(this);
                });

                label.append(prefix);
                label.append(input);
                label.append(suffix);
                wrapper.append(label);
                capacityContainer.append(wrapper);
            }
            fieldset.append(capacityContainer);
            elementBatteryConfiguration.find('input[name="capacity"]').closest('.number').after(fieldset);
        } else {
            elementBatteryConfiguration.find('input[name="capacity"]')
                .val(FC.BATTERY_CONFIG.capacity).change()
                .change(function () {
                    FC.BATTERY_CONFIG.capacity = getIntegerValue(this);
                });
        }

        elementBatteryConfiguration.find('input[name="cellcount"]')
            .val(FC.BATTERY_CONFIG.cellCount).change()
            .change(function () {
                FC.BATTERY_CONFIG.cellCount = getIntegerValue(this);
            });

        const batteryMeterType_e = elementBatteryConfiguration.find('select.batterymetersource');
        const currentMeterType_e = elementBatteryConfiguration.find('select.currentmetersource');

        self.batteryMeterTypes.forEach((item, index) => {
            const text = i18n.getMessage('powerBatteryVoltageMeterType' + item);
            batteryMeterType_e.append(`<option value="${index}">${text}</option>`);
        });

        self.currentMeterTypes.forEach((item, index) => {
            const text = i18n.getMessage('powerBatteryCurrentMeterType' + item);
            currentMeterType_e.append(`<option value="${index}">${text}</option>`);
        });

        updateDisplay();

        let sourceschanged = false;

        batteryMeterType_e
            .val(FC.BATTERY_CONFIG.voltageMeterSource).change()
            .change(function () {
                FC.BATTERY_CONFIG.voltageMeterSource = parseInt($(this).val());
                sourceschanged = true;
                setDirty(true);
            });

        currentMeterType_e
            .val(FC.BATTERY_CONFIG.currentMeterSource).change()
            .change(function () {
                FC.BATTERY_CONFIG.currentMeterSource = parseInt($(this).val());
                sourceschanged = true;
                setDirty(true);
            });

        function get_slow_data() {
            MSP.send_message(MSPCodes.MSP_VOLTAGE_METERS, false, false, function () {
                if (FC.VOLTAGE_METERS.length != self.voltageMeterCount) {
                    self.voltageMeterCount = FC.VOLTAGE_METERS.length;
                    updateDisplay();
                }
                for (let i = 0; i < FC.VOLTAGE_METERS.length; i++) {
                    const meterId = FC.VOLTAGE_METERS[i].id;
                    const voltage = FC.VOLTAGE_METERS[i].voltage;
                    const decimals = (voltage < 4) ? 3 : 2;
                    const message = i18n.getMessage('powerVoltageValue', [voltage.toFixed(decimals)]);
                    $(`#voltage-meter-${meterId} .value`).text(message);
                }
            });

            MSP.send_message(MSPCodes.MSP_CURRENT_METERS, false, false, function () {
                if (FC.CURRENT_METERS.length != self.currentMeterCount) {
                    self.currentMeterCount = FC.CURRENT_METERS.length;
                    updateDisplay();
                }
                for (let i = 0; i < FC.CURRENT_METERS.length; i++) {
                    const meterId = FC.CURRENT_METERS[i].id;
                    const amperage = FC.CURRENT_METERS[i].amperage;
                    const message = i18n.getMessage('powerAmperageValue', [amperage.toFixed(2)]);
                    $(`#amperage-meter-${meterId} .value`).text(message);
                }
            });

            MSP.send_message(MSPCodes.MSP_BATTERY_STATE, false, false, function () {
                $('#battery-connection-state .value').text(FC.BATTERY_STATE.cellCount > 0
                    ? i18n.getMessage('powerBatteryConnectedValueYes', [FC.BATTERY_STATE.cellCount])
                    : i18n.getMessage('powerBatteryConnectedValueNo'));
                $('#battery-voltage .value').text(i18n.getMessage('powerVoltageValue', [FC.BATTERY_STATE.voltage]));
                $('#battery-amperage .value').text(i18n.getMessage('powerAmperageValue', [FC.BATTERY_STATE.amperage]));
                $('#battery-mah-drawn .value').text(i18n.getMessage('powerMahValue', [FC.BATTERY_STATE.mAhDrawn]));
                $('#battery-charge-level .value').text(i18n.getMessage('powerChargeLevel', [FC.BATTERY_STATE.chargeLevel]));

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_10)) {
                    const activeType = FC.BATTERY_STATE.batteryType;
                    $('.battery-capacities .number').removeClass('active-capacity');
                    if (activeType >= 0 && activeType < 6) {
                        $('.battery-capacities .number').eq(activeType).addClass('active-capacity');
                    }
                }
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
            save_data(callback);
        };

        self.revert = function (callback) {
            revertData();
            send_data(callback);
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

        self.BATTER_CONFIG_COPY = deep_copy(FC.BATTERY_CONFIG);
        self.VOLTAGE_METER_CONFIGS_COPY = deep_copy(FC.VOLTAGE_METER_CONFIGS);
        self.CURRENT_METER_CONFIGS_COPY = deep_copy(FC.CURRENT_METER_CONFIGS);

        initDisplay();

        // translate to user-selected language
        i18n.localizePage();

        GUI.content_ready(callback);
    }
};

tab.cleanup = function (callback) {
    GUI.calibrationManager?.destroy();
    GUI.calibrationManagerConfirmation?.destroy();

    this.isDirty = false;

    callback?.();
};

TABS[tab.tabName] = tab;

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        if (newModule && GUI.active_tab === tab.tabName) {
          TABS[tab.tabName].initialize();
        }
    });

    import.meta.hot.dispose(() => {
        tab.cleanup();
    });
}

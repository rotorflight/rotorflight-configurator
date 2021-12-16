'use strict';

TABS.motors = {
    isDirty: false,
    isProtoEnabled: false,
    isEscSensorEnabled: false,
    isGovEnabled: false,
    isDshot: false,
    govModes: [
        "OFF",
        "PASSTHROUGH",
        "STANDARD",
        "MODE1",
        "MODE2",
    ],
 };

TABS.motors.initialize = function (callback) {

    const self = this;

    if (GUI.active_tab !== 'motors') {
        GUI.active_tab = 'motors';
    }

    load_data(load_html);

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => { return MSP.promise(MSPCodes.MSP_STATUS); })
            .then(() => { return MSP.promise(MSPCodes.MSP_ARMING_CONFIG); })
            .then(() => { return MSP.promise(MSPCodes.MSP_FEATURE_CONFIG); })
            .then(() => { return MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG); })
            .then(() => { return MSP.promise(MSPCodes.MSP_BATTERY_CONFIG); })
            .then(() => { return MSP.promise(MSPCodes.MSP_MOTOR_CONFIG); })
            .then(() => { return MSP.promise(MSPCodes.MSP_MOTOR_OVERRIDE); })
            .then(() => { return MSP.promise(MSPCodes.MSP_GOVERNOR); })
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => { return MSP.promise(MSPCodes.MSP_SET_GOVERNOR, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR)); })
            .then(() => { return MSP.promise(MSPCodes.MSP_SET_MOTOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_MOTOR_CONFIG)); })
            .then(() => { return MSP.promise(MSPCodes.MSP_SET_ADVANCED_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_ADVANCED_CONFIG)); })
            .then(() => { return MSP.promise(MSPCodes.MSP_EEPROM_WRITE); })
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                GUI.log(i18n.getMessage('deviceRebooting'));
                reinitialiseConnection(callback);
            });
    }

    function load_html() {
        $('#content').load("./tabs/motors.html", process_html);
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks

        // Hide the buttons toolbar
        $('.tab-motors').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-motors').removeClass('toolbar_hidden');
            }
        }

        const escProtocols = EscProtocols.GetAvailableProtocols(FC.CONFIG.apiVersion);
        const escProtocolSelect = $('select.escProtocol');

        for (let j = 0; j < escProtocols.length; j++) {
            escProtocolSelect.append(`<option value="${j}">${escProtocols[j]}</option>`);
        }

        const pwmFreqSwitch = $("input[id='pwmSwitch']");
        const pwmFreqInput = $("input[id='pwmFreq']");
        const pwmFreqElem = $('.inputPwmFreq');

        const pwmFreq = (FC.MOTOR_CONFIG.motor_pwm_rate > 0) ?
              FC.MOTOR_CONFIG.motor_pwm_rate : 250;

        pwmFreqSwitch.on("change", function () {
            pwmFreqElem.toggle($(this).is(':checked') && !self.isDshot && self.isProtoEnabled);
        });

        pwmFreqSwitch.prop('checked', FC.MOTOR_CONFIG.use_unsynced_pwm);
        pwmFreqInput.val(pwmFreq);

        const dshotBidirSwitch = $('input[id="dshotBidir"]');
        dshotBidirSwitch.prop('checked', FC.MOTOR_CONFIG.use_dshot_telemetry);

        $('input[id="mincommand"]').val(FC.MOTOR_CONFIG.mincommand);
        $('input[id="minthrottle"]').val(FC.MOTOR_CONFIG.minthrottle);
        $('input[id="maxthrottle"]').val(FC.MOTOR_CONFIG.maxthrottle);

        for (let i = 0; i < FC.CONFIG.motorCount; i++)
            $(`input[id="motorPoles${i+1}"]`).val(FC.MOTOR_CONFIG.motor_poles[i]);

        self.isGovEnabled = FC.FEATURE_CONFIG.features.isEnabled('GOVERNOR');
        self.isEscSensorEnabled = FC.FEATURE_CONFIG.features.isEnabled('ESC_SENSOR');

        const govModeSelect = $('select.govMode');

        for (let j = 0; j < self.govModes.length; j++) {
            govModeSelect.append(`<option value="${j}">${self.govModes[j]}</option>`);
        }

        govModeSelect.val(FC.GOVERNOR.gov_mode);

        if (FC.GOVERNOR.gov_mode > 0) {
            $('input[id="govGearRatio"]').val(FC.GOVERNOR.gov_gear_ratio);
            $('input[id="govSpoolupTime"]').val(FC.GOVERNOR.gov_spoolup_time);
            $('input[id="govTrackingTime"]').val(FC.GOVERNOR.gov_tracking_time);
            $('input[id="govRecoveryTime"]').val(FC.GOVERNOR.gov_recovery_time);
            $('input[id="govAutoBailoutTime"]').val(FC.GOVERNOR.gov_autorotation_bailout_time);
            $('input[id="govAutoTimeout"]').val(FC.GOVERNOR.gov_autorotation_timeout);

            $('.govConfig').show();
        }
        else {
            $('.govConfig').hide();
        }

        function updateVisibility() {

            const protocolNum = parseInt(escProtocolSelect.val());

            self.isProtoEnabled = !EscProtocols.IsProtocolDisabled(FC.CONFIG.apiVersion, protocolNum) && (FC.CONFIG.motorCount > 0);
            self.isDshot = EscProtocols.IsProtocolDshot(FC.CONFIG.apiVersion, protocolNum);

            $('.mincommand').toggle(self.isProtoEnabled && !self.isDshot);
            $('.minthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.maxthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.checkboxPwm').toggle(self.isProtoEnabled && !self.isDshot);
            $('.inputPwmFreq').toggle(self.isProtoEnabled && !self.isDshot);
            $('.checkboxDshotBidir').toggle(self.isProtoEnabled && self.isDshot);

            for (let i = 0; i < 4; i++) {
                $(`.motorPoles${i+1}`).toggle(self.isProtoEnabled && FC.CONFIG.motorCount > i);
                $(`.motorInfo${i}`).toggle(self.isProtoEnabled && FC.CONFIG.motorCount > i);
            }

            $('.mainGearRatio').toggle(self.isProtoEnabled);

            $('#escProtocolDisabled').toggle(!self.isProtoEnabled);

            $('.governor_features').toggle(self.isGovEnabled && self.isProtoEnabled);

            pwmFreqSwitch.trigger("change");

            $('.tab-motors .override').toggle(!FC.CONFIG.motorOverrideDisabled);

            $('.govConfig').toggle(govModeSelect.val() > 0);
        }

        escProtocolSelect.val(FC.MOTOR_CONFIG.motor_pwm_protocol);

        escProtocolSelect.change(updateVisibility);
        dshotBidirSwitch.change(updateVisibility);
        govModeSelect.change(updateVisibility);

        updateVisibility();


        let infoUpdateList = [];

        function process_motor_info(motorIndex) {

            const motorInfo = $('#tab-motors-templates .motorInfoTemplate').clone();

            let rpmMax = 10000;

            let voltMax = 5;
            let currMax = 10;
            let tempMax = 150;

            const thrBar = motorInfo.find('.Throttle');
            const rpmBar = motorInfo.find('.RPM');
            const voltBar = motorInfo.find('.Volt');
            const currBar = motorInfo.find('.Curr');
            const tempBar = motorInfo.find('.Temp');
            const errorBar = motorInfo.find('.Errors');

            motorInfo.attr('class', `motorInfo${motorIndex}`);

            motorInfo.find('.spacer_box_title').html(i18n.getMessage('motorInfo', [motorIndex+1]));

            rpmBar.toggle(self.isEscSensorEnabled || FC.MOTOR_CONFIG.use_dshot_telemetry);
            voltBar.toggle(self.isEscSensorEnabled);
            currBar.toggle(self.isEscSensorEnabled);
            tempBar.toggle(self.isEscSensorEnabled);
            errorBar.toggle(FC.MOTOR_CONFIG.use_dshot_telemetry);

            meterLabel(thrBar, '0%', '100%');
            meterLabel(rpmBar, 0, rpmMax);
            meterLabel(voltBar, '0V', voltMax.toFixed(0) + 'V');
            meterLabel(currBar, '0A', currMax.toFixed(0) + 'A');
            meterLabel(tempBar, '0&degC', '150&degC');
            meterLabel(errorBar, '0%', '100%');

            function roundTo(value, step) {
                return Math.round(value / step) * step + step;
            }

            function meterBar(meter, label, ratio) {

                const length = Math.max(Math.min(ratio*100, 100), 0);
                const margin = 100 - length;

                $('.meter-fill', meter).css({
                    'width'        : `${length}%`,
                    'margin-right' : `${margin}%`,
                });

                $('.meter-label', meter).html(label);
            }

            function meterLabel(meter, min, max) {
                $('.meter-left', meter).html(min);
                $('.meter-right', meter).html(max);
            }

            function updateInfo() {

                const throttle = FC.MOTOR_DATA[motorIndex] / 10;
                meterBar(thrBar, throttle + '%', throttle / 100);

                const rpm = FC.MOTOR_TELEMETRY_DATA.rpm[motorIndex];
                if (rpm > rpmMax) {
                    rpmMax = roundTo(rpm + 1000, 5000);
                    meterLabel(rpmBar, '0', rpmMax);
                }
                meterBar(rpmBar, rpm, rpm/rpmMax);

                const volt = FC.MOTOR_TELEMETRY_DATA.voltage[motorIndex] / 100;
                if (volt > voltMax) {
                    voltMax = Math.max(FC.BATTERY_STATE.cellCount * FC.BATTERY_CONFIG.vbatmaxcellvoltage, voltMax);
                    voltMax = Math.max(voltMax, roundTo(volt,1));
                    meterLabel(voltBar, '0V', voltMax.toFixed(1) + 'V');
                }
                meterBar(voltBar, volt.toFixed(2) + 'V', volt/voltMax);

                const curr = FC.MOTOR_TELEMETRY_DATA.current[motorIndex] / 100;
                if (curr > currMax) {
                    currMax = roundTo(curr, 10);
                    meterLabel(currBar, '0A', currMax.toFixed(0) + 'A');
                }
                meterBar(currBar, curr.toFixed(1) + 'A', curr/currMax);

                const temp = FC.MOTOR_TELEMETRY_DATA.temperature[motorIndex];
                meterBar(tempBar, temp + '&degC', temp/tempMax);

                const ratio = FC.MOTOR_TELEMETRY_DATA.invalidPercent[motorIndex] / 100;
                meterBar(errorBar, ratio + '%', ratio / 100);

                const active = (throttle > 0 || rpm > 0 || volt > 0 || temp > 0);
                if (active)
                    motorInfo.show();
            }

            $('.motorInfo').append(motorInfo);

            infoUpdateList.push(updateInfo);
        }

        function process_override(motorIndex) {

            const motorOverride = $('#tab-motors-templates .motorOverrideTemplate tr').clone();
            const motorSlider = motorOverride.find('.motorOverrideSlider');
            const motorEnable = motorOverride.find('.motorOverrideEnable input');
            const motorThrottle  = motorOverride.find('.motorOverrideThrottle input');

            motorOverride.attr('class', `motorOverride${motorIndex}`);
            motorOverride.find('.motorOverrideIndex').text(`#${motorIndex+1}`);

            motorSlider.noUiSlider({
                range: {
                    'min': 0,
                    'max': 100,
                },
                start: 0,
                step: 1,
                behaviour: 'none',
            });

            motorOverride.find('.pips-range').noUiSlider_pips({
                mode: 'values',
                values: [ 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, ],
                density: 1,
                stepped: true,
                format: wNumb({
                    decimals: 0,
                }),
            });

            motorSlider.on('slide', function () {
                motorThrottle.val(parseInt($(this).val()));
            });

            motorSlider.on('change', function () {
                motorThrottle.change();
            });

            motorThrottle.change(function () {
                const value = $(this).val();
                motorSlider.val(value);
                FC.MOTOR_OVERRIDE[motorIndex] = Math.round(value * 10);
                mspHelper.sendMotorOverride(motorIndex);
            });

            motorEnable.change(function () {
                const check = $(this).prop('checked');

                motorThrottle.val(0);
                motorSlider.val(0);
                motorThrottle.prop('disabled', !check);
                motorSlider.attr('disabled', !check);

                FC.MOTOR_OVERRIDE[motorIndex] = 0;
                mspHelper.sendMotorOverride(motorIndex);
            });

            const value = FC.MOTOR_OVERRIDE[motorIndex];
            const check = (value != 0);
            const angle = Math.round(value / 10);

            motorThrottle.val(angle);
            motorSlider.val(angle);

            motorThrottle.prop('disabled', !check);
            motorSlider.attr('disabled', !check);
            motorEnable.prop('checked', check);

            $('.motorOverride tbody').append(motorOverride);
        }

        for (let index = 0; index < FC.CONFIG.motorCount; index++) {
            process_motor_info(index);
            process_override(index);
        }

        function update_data() {
            FC.MOTOR_CONFIG.mincommand = parseInt($('input[id="mincommand"]').val());
            FC.MOTOR_CONFIG.minthrottle = parseInt($('input[id="minthrottle"]').val());
            FC.MOTOR_CONFIG.maxthrottle = parseInt($('input[id="maxthrottle"]').val());
            FC.MOTOR_CONFIG.use_dshot_telemetry = dshotBidirSwitch.is(':checked') ? 1 : 0;

            for (let i = 0; i < FC.CONFIG.motorCount; i++)
                FC.MOTOR_CONFIG.motor_poles[i] = parseInt($(`input[id="motorPoles${i+1}"]`).val());

            FC.MOTOR_CONFIG.motor_pwm_protocol = parseInt(escProtocolSelect.val());
            FC.MOTOR_CONFIG.use_unsynced_pwm = pwmFreqSwitch.is(':checked');
            FC.MOTOR_CONFIG.motor_pwm_rate = parseInt($('input[id="pwmFreq"]').val());

            if (self.isGovEnabled) {
                FC.GOVERNOR.gov_mode = govModeSelect.val();
                if (FC.GOVERNOR.gov_mode > 0) {
                    FC.GOVERNOR.gov_gear_ratio = parseInt($('input[id="govGearRatio"]').val());
                    FC.GOVERNOR.gov_spoolup_time = parseInt($('input[id="govSpoolupTime"]').val());
                    FC.GOVERNOR.gov_tracking_time = parseInt($('input[id="govTrackingTime"]').val());
                    FC.GOVERNOR.gov_recovery_time = parseInt($('input[id="govRecoveryTime"]').val());
                    FC.GOVERNOR.gov_autorotation_bailout_time = parseInt($('input[id="govAutoBailoutTime"]').val());
                    FC.GOVERNOR.gov_autorotation_timeout = parseInt($('input[id="govAutoTimeout"]').val());
                }
            }
        }

        function get_motor_info() {
            Promise.resolve(true)
                .then(() => { return MSP.promise(MSPCodes.MSP_MOTOR); })
                .then(() => { return MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY); })
                .then(() => { infoUpdateList.forEach(func => func()); });
        }

        function get_battery_info() {
            Promise.resolve(true)
                .then(() => { return MSP.promise(MSPCodes.MSP_BATTERY_STATE); })
                .then(() => { infoUpdateList.forEach(func => func()); });
        }

        self.save = function(callback) {
            update_data();
            save_data(callback);
        };

        self.revert = function (callback) {
            callback();
        };

        $('a.save').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        $('.configuration').change(function () {
            setDirty();
        });

        GUI.interval_add('motor_info_pull', get_motor_info, 100, true);
        GUI.interval_add('battery_info_pull', get_battery_info, 1000, true);

        GUI.content_ready(callback);
    }
};

TABS.motors.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};

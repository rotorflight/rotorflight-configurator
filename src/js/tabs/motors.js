'use strict';

TABS.motors = {
    isDirty: false,
    isProtoEnabled: false,
    isEscSensorEnabled: false,
    isFreqSensorEnabled: false,
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

    load_data(load_html);

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_ARMING_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_BATTERY_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MOTOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MOTOR_OVERRIDE))
            .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_MOTOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_MOTOR_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_ADVANCED_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_ADVANCED_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_GOVERNOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
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

        self.isGovEnabled = FC.FEATURE_CONFIG.features.isEnabled('GOVERNOR');
        self.isEscSensorEnabled = FC.FEATURE_CONFIG.features.isEnabled('ESC_SENSOR');
        self.isFreqSensorEnabled = FC.FEATURE_CONFIG.features.isEnabled('FREQ_SENSOR');

        let infoUpdateList = [];

        function roundTo(value, step) {
            return Math.round(value / step) * step + step;
        }

        function meterBar(meter, label, ratio) {

            const length = ratio.clamp(0,1) * 100;
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

        function process_rotor_speeds() {

            const headspeedBar = $('.motorMainRotorSpeed');
            const tailspeedBar = $('.motorTailRotorSpeed');

            let headSource = 0;
            let tailSource = 1;

            let headRatio = FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] / FC.MOTOR_CONFIG.main_rotor_gear_ratio[1];
            let tailRatio = FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] / FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1];

            if (FC.MIXER_CONFIG.tail_rotor_mode == 0) {
                tailRatio = headRatio / tailRatio;
                tailSource = 0;
            }

            const rpmAvailable = self.isFreqSensorEnabled || self.isEscSensorEnabled || FC.MOTOR_CONFIG.use_dshot_telemetry;

            headspeedBar.toggle(rpmAvailable && FC.CONFIG.motorCount > headSource);
            tailspeedBar.toggle(rpmAvailable && FC.CONFIG.motorCount > tailSource);

            let headspeedMax = 1000;
            let tailspeedMax = 5000;

            meterLabel(headspeedBar, '0', headspeedMax);
            meterLabel(tailspeedBar, '0', tailspeedMax);

            function updateInfo() {

                const headspeed = FC.MOTOR_TELEMETRY_DATA.rpm[headSource] * headRatio;
                if (headspeed > headspeedMax) {
                    headspeedMax = roundTo(headspeed + 1000, 1000);
                    meterLabel(headspeedBar, '0', headspeedMax);
                }
                meterBar(headspeedBar, headspeed.toFixed(0) + ' RPM', headspeed / headspeedMax);

                const tailspeed = FC.MOTOR_TELEMETRY_DATA.rpm[tailSource] * tailRatio;
                if (tailspeed > tailspeedMax) {
                    tailspeedMax = roundTo(tailspeed + 1000, 1000);
                    meterLabel(tailspeedBar, '0', tailspeedMax);
                }
                meterBar(tailspeedBar, tailspeed.toFixed(0) + ' RPM', tailspeed / tailspeedMax);
            }

            infoUpdateList.push(updateInfo);
        }

        function process_motor_info(motorIndex) {

            const motorInfo = $('#tab-motors-templates .motorInfoTemplate').clone();

            const thrBar = motorInfo.find('.Throttle');
            const rpmBar = motorInfo.find('.RPM');
            const voltBar = motorInfo.find('.Volt');
            const currBar = motorInfo.find('.Curr');
            const tempBar = motorInfo.find('.Temp');
            const errorBar = motorInfo.find('.Errors');

            const rpmAvailable = self.isFreqSensorEnabled || self.isEscSensorEnabled || FC.MOTOR_CONFIG.use_dshot_telemetry;

            let rpmMax  = 10000;
            let voltMax = 5;
            let currMax = 10;
            let tempMax = 150;

            motorInfo.attr('class', `motorInfo${motorIndex}`);
            motorInfo.find('.spacer_box_title').html(i18n.getMessage(`motorInfo${motorIndex+1}`));

            rpmBar.toggle(rpmAvailable);
            voltBar.toggle(self.isEscSensorEnabled);
            currBar.toggle(self.isEscSensorEnabled);
            tempBar.toggle(self.isEscSensorEnabled);
            errorBar.toggle(FC.MOTOR_CONFIG.use_dshot_telemetry);

            meterLabel(thrBar, '0%', '100%');
            meterLabel(rpmBar, '0', rpmMax);
            meterLabel(voltBar, '0V', voltMax.toFixed(0) + 'V');
            meterLabel(currBar, '0A', currMax.toFixed(0) + 'A');
            meterLabel(tempBar, '0&deg;C', '150&deg;C');
            meterLabel(errorBar, '0%', '100%');

            const motorSlider = motorInfo.find('.motorOverrideSlider');

            motorSlider.noUiSlider({
                range: {
                    'min': 0,
                    'max': 100,
                },
                start: 0,
                step: 1,
                behaviour: 'none',
            });

            motorInfo.find('.pips-range').noUiSlider_pips({
                mode: 'values',
                values: [ 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, ],
                density: 100 / ((0 + 100) / 5),
                stepped: true,
                format: wNumb({
                    decimals: 0,
                }),
            });

            motorSlider.on('change', function () {
                const value = $(this).val();
                FC.MOTOR_OVERRIDE[motorIndex] = Math.round(value * 10);
                mspHelper.sendMotorOverride(motorIndex);
            });

            const value = FC.MOTOR_OVERRIDE[motorIndex];
            const angle = Math.round(value / 10);

            motorSlider.val(angle);

            FC.CONFIG.motorOverrideEnabled |= (value != 0);

            function updateInfo() {

                const value = FC.MOTOR_DATA[motorIndex];
                let throttle = 0;

                if (value < 0)
                    throttle = (value + 1000) / 10;
                else if (value > 0)
                    throttle = (value - 1000) / 10;

                const thrStr = (value == 0) ? '' : throttle.toFixed(1) + '%';
                meterBar(thrBar, thrStr, Math.abs(throttle / 100));

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
                meterBar(tempBar, temp + '&deg;C', temp/tempMax);

                const ratio = FC.MOTOR_TELEMETRY_DATA.invalidPercent[motorIndex] / 100;
                meterBar(errorBar, ratio + '%', ratio / 100);

                const active = (throttle > 0 || rpm > 0 || volt > 0 || temp > 0);
                if (active)
                    motorInfo.show();
            }

            $('.motorInfo').append(motorInfo);

            infoUpdateList.push(updateInfo);
        }

        process_rotor_speeds();
        for (let index = 0; index < FC.CONFIG.motorCount; index++) {
            process_motor_info(index);
        }

        const enableMotorOverrideSwitch = $('input[id="motorEnableOverrideSwitch"]');

        enableMotorOverrideSwitch.change(function () {
            const checked = enableMotorOverrideSwitch.prop('checked');
            FC.CONFIG.motorOverrideEnabled = checked;
            $('.overridesEnabled').toggle(checked);
            $('.motorOverrideSlider').val(0).change();
        });

        enableMotorOverrideSwitch.prop('checked', FC.CONFIG.motorOverrideEnabled);
        $('.overridesEnabled').toggle(!!FC.CONFIG.motorOverrideEnabled);

        $('.tab-motors .mainGearRatio').change(function() {
            const ratioN = parseInt($('input[id="mainGearRatioN"]').val());
            const ratioD = parseInt($('input[id="mainGearRatioD"]').val());
            const issue = (ratioN > ratioD);
            $('.tab-motors .motorMainGearRatioIssueNote').toggle(issue);
        });

        $('.tab-motors .tailGearRatio').change(function() {
            const ratioN = parseInt($('input[id="tailGearRatioN"]').val());
            const ratioD = parseInt($('input[id="tailGearRatioD"]').val());
            const issue = (ratioN > ratioD);
            $('.tab-motors .motorTailGearRatioIssueNote').toggle(issue);
        });


        const escProtocols = EscProtocols.GetAvailableProtocols(FC.CONFIG.apiVersion);
        const escProtocolSelect = $('select[id="escProtocol"]');
        escProtocols.forEach(function(value,index) {
            escProtocolSelect.append(`<option value="${index}">${value}</option>`);
        });
        escProtocolSelect.val(FC.MOTOR_CONFIG.motor_pwm_protocol);

        const pwmFreq = (FC.MOTOR_CONFIG.motor_pwm_rate > 0) ?
              FC.MOTOR_CONFIG.motor_pwm_rate : 250;
        const pwmFreqInput = $('input[id="pwmFreq"]');
        pwmFreqInput.val(pwmFreq);

        const dshotBidirSwitch = $('input[id="dshotBidir"]');
        dshotBidirSwitch.prop('checked', FC.MOTOR_CONFIG.use_dshot_telemetry);

        $('input[id="mincommand"]').val(FC.MOTOR_CONFIG.mincommand);
        $('input[id="minthrottle"]').val(FC.MOTOR_CONFIG.minthrottle);
        $('input[id="maxthrottle"]').val(FC.MOTOR_CONFIG.maxthrottle);

        for (let i = 0; i < FC.CONFIG.motorCount; i++)
            $(`input[id="motorPoles${i+1}"]`).val(FC.MOTOR_CONFIG.motor_poles[i]);

        $('input[id="mainGearRatioN"]').val(FC.MOTOR_CONFIG.main_rotor_gear_ratio[0]);
        $('input[id="mainGearRatioD"]').val(FC.MOTOR_CONFIG.main_rotor_gear_ratio[1]).change();
        $('input[id="tailGearRatioN"]').val(FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0]);
        $('input[id="tailGearRatioD"]').val(FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1]).change();

        const govModeSelect = $('select[id="govMode"]');
        self.govModes.forEach(function(value,index) {
            govModeSelect.append(`<option value="${index}">${value}</option>`);
        });
        govModeSelect.val(FC.GOVERNOR.gov_mode);

        $('input[id="govStartupTime"]').val(FC.GOVERNOR.gov_startup_time / 10).change();
        $('input[id="govSpoolupTime"]').val(FC.GOVERNOR.gov_spoolup_time / 10).change();
        $('input[id="govTrackingTime"]').val(FC.GOVERNOR.gov_tracking_time / 10).change();
        $('input[id="govRecoveryTime"]').val(FC.GOVERNOR.gov_recovery_time / 10).change();
        $('input[id="govAutoBailoutTime"]').val(FC.GOVERNOR.gov_autorotation_bailout_time / 10).change();
        $('input[id="govAutoTimeout"]').val(FC.GOVERNOR.gov_autorotation_timeout / 10).change();
        $('input[id="govAutoMinEntryTime"]').val(FC.GOVERNOR.gov_autorotation_min_entry_time / 10).change();
        $('input[id="govZeroThrottleTimeout"]').val(FC.GOVERNOR.gov_zero_throttle_timeout / 10).change();
        $('input[id="govLostHeadspeedTimeout"]').val(FC.GOVERNOR.gov_lost_headspeed_timeout / 10).change();
        $('input[id="govVoltageFilterHz"]').val(FC.GOVERNOR.gov_pwr_filter).change();
        $('input[id="govHeadspeedFilterHz"]').val(FC.GOVERNOR.gov_rpm_filter).change();
        $('input[id="govTTAFilterHz"]').val(FC.GOVERNOR.gov_tta_filter).change();

        function updateVisibility() {

            const protocolNum = parseInt(escProtocolSelect.val());

            self.isProtoEnabled = !EscProtocols.IsProtocolDisabled(FC.CONFIG.apiVersion, protocolNum) && (FC.CONFIG.motorCount > 0);
            self.isDshot = EscProtocols.IsProtocolDshot(FC.CONFIG.apiVersion, protocolNum);

            $('.mincommand').toggle(self.isProtoEnabled && !self.isDshot);
            $('.minthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.maxthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.inputPwmFreq').toggle(self.isProtoEnabled && !self.isDshot);
            $('.checkboxDshotBidir').toggle(self.isProtoEnabled && self.isDshot);
            $('.mainGearRatio').toggle(self.isProtoEnabled);
            $('.tailGearRatio').toggle(self.isProtoEnabled);

            for (let i = 0; i < 4; i++) {
                $(`.motorPoles${i+1}`).toggle(self.isProtoEnabled && FC.CONFIG.motorCount > i);
                $(`.motorInfo${i}`).toggle(self.isProtoEnabled && FC.CONFIG.motorCount > i);
            }

            $('#escProtocolDisabled').toggle(!self.isProtoEnabled);

            $('.tab-motors .governor_features').toggle(self.isGovEnabled && self.isProtoEnabled);
            $('.tab-motors .overrides').toggle(self.isProtoEnabled);

            $('.govConfig').toggle(govModeSelect.val() > 0);
        }

        escProtocolSelect.change(updateVisibility);
        govModeSelect.change(updateVisibility);

        updateVisibility();

        function update_data() {
            FC.MOTOR_CONFIG.mincommand = parseInt($('input[id="mincommand"]').val());
            FC.MOTOR_CONFIG.minthrottle = parseInt($('input[id="minthrottle"]').val());
            FC.MOTOR_CONFIG.maxthrottle = parseInt($('input[id="maxthrottle"]').val());
            FC.MOTOR_CONFIG.use_dshot_telemetry = dshotBidirSwitch.is(':checked') ? 1 : 0;

            for (let i = 0; i < FC.CONFIG.motorCount; i++)
                FC.MOTOR_CONFIG.motor_poles[i] = parseInt($(`input[id="motorPoles${i+1}"]`).val());

            FC.MOTOR_CONFIG.motor_pwm_protocol = parseInt(escProtocolSelect.val());
            FC.MOTOR_CONFIG.motor_pwm_rate = parseInt($('input[id="pwmFreq"]').val());

            FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] = parseInt($('input[id="mainGearRatioN"]').val());
            FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] = parseInt($('input[id="mainGearRatioD"]').val());
            FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] = parseInt($('input[id="tailGearRatioN"]').val());
            FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] = parseInt($('input[id="tailGearRatioD"]').val());

            if (self.isGovEnabled) {
                FC.GOVERNOR.gov_mode = govModeSelect.val();
                if (FC.GOVERNOR.gov_mode > 0) {
                    FC.GOVERNOR.gov_startup_time = Math.round(parseFloat($('input[id="govStartupTime"]').val()) * 10);
                    FC.GOVERNOR.gov_spoolup_time = Math.round(parseFloat($('input[id="govSpoolupTime"]').val()) * 10);
                    FC.GOVERNOR.gov_tracking_time = Math.round(parseFloat($('input[id="govTrackingTime"]').val()) * 10);
                    FC.GOVERNOR.gov_recovery_time = Math.round(parseFloat($('input[id="govRecoveryTime"]').val()) * 10);
                    FC.GOVERNOR.gov_autorotation_bailout_time = Math.round(parseFloat($('input[id="govAutoBailoutTime"]').val()) * 10);
                    FC.GOVERNOR.gov_autorotation_timeout = Math.round(parseFloat($('input[id="govAutoTimeout"]').val()) * 10);
                    FC.GOVERNOR.gov_autorotation_min_entry_time = Math.round(parseFloat($('input[id="govAutoMinEntryTime"]').val()) * 10);
                    FC.GOVERNOR.gov_zero_throttle_timeout = Math.round(parseFloat($('input[id="govZeroThrottleTimeout"]').val()) * 10);
                    FC.GOVERNOR.gov_lost_headspeed_timeout = Math.round(parseFloat($('input[id="govLostHeadspeedTimeout"]').val()) * 10);
                    FC.GOVERNOR.gov_pwr_filter = parseInt($('input[id="govVoltageFilterHz"]').val());
                    FC.GOVERNOR.gov_rpm_filter = parseInt($('input[id="govHeadspeedFilterHz"]').val());
                    FC.GOVERNOR.gov_tta_filter = parseInt($('input[id="govTTAFilterHz"]').val());
                }
            }
        }

        function get_info() {
            Promise.resolve(true)
                .then(() => MSP.promise(MSPCodes.MSP_MOTOR))
                .then(() => MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY))
                .then(() => MSP.promise(MSPCodes.MSP_BATTERY_STATE))
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

        GUI.interval_add('info_pull', get_info, 100, true);

        GUI.content_ready(callback);
    }
};

TABS.motors.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};

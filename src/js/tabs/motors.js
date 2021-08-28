'use strict';

TABS.motors = {
    isProtoEnabled: false,
    isGovEnabled: false,
    isDshot: false,
    isDirty: false,
};

TABS.motors.initialize = function (callback) {
    const self = this;

    if (GUI.active_tab != 'motors') {
        GUI.active_tab = 'motors';
    }

    Promise.resolve(true)
        .then(() => { return MSP.promise(MSPCodes.MSP_STATUS); })
        .then(() => { return MSP.promise(MSPCodes.MSP_ARMING_CONFIG); })
        .then(() => { return MSP.promise(MSPCodes.MSP_FEATURE_CONFIG); })
        .then(() => { return MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG); })
        .then(() => { return MSP.promise(MSPCodes.MSP_BATTERY_CONFIG); })
        .then(() => { return MSP.promise(MSPCodes.MSP_MOTOR_CONFIG); })
        .then(() => { return MSP.promise(MSPCodes.MSP_GOVERNOR); })
        .then(() => { load_html(); });

    function load_html() {
        $('#content').load("./tabs/motors.html", process_html);
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        function setContentToolbarButtons() {
            if (self.isDirty) {
                $('.tool-buttons').hide();
                $('.save_btn').show();
            } else {
                $('.save_btn').hide();
            }
        }

        setContentToolbarButtons();

        function disableHandler(event) {
            if (event.target !== event.currentTarget) {
                self.isDirty = true;
                setContentToolbarButtons();
            }
            event.stopPropagation();
        }

        // Add EventListener for configuration changes
        document.querySelectorAll('.configuration').forEach(elem => elem.addEventListener('change', disableHandler));

        const escProtocols = EscProtocols.GetAvailableProtocols(FC.CONFIG.apiVersion);
        const escProtocolSelect = $('select.escProtocol');

        for (let j = 0; j < escProtocols.length; j++) {
            escProtocolSelect.append(`<option value="${j}">${escProtocols[j]}</option>`);
        }

        const pwmFreqSwitch = $("input[id='pwmSwitch']");
        const pwmFreqInput = $("input[id='pwmFreq']");
        const pwmFreqElem = $('.inputPwmFreq');

        const pwmFreq = (FC.PID_ADVANCED_CONFIG.motor_pwm_rate > 0) ?
              FC.PID_ADVANCED_CONFIG.motor_pwm_rate : 250;

        pwmFreqSwitch.on("change", function () {
            pwmFreqElem.toggle($(this).is(':checked') && !self.isDshot && self.isProtoEnabled);
        });

        pwmFreqSwitch.prop('checked', (FC.PID_ADVANCED_CONFIG.use_unsyncedPwm !== 0));
        pwmFreqInput.val(pwmFreq);

        const dshotBidirSwitch = $('input[id="dshotBidir"]');
        dshotBidirSwitch.prop('checked', FC.MOTOR_CONFIG.use_dshot_telemetry);

        $('input[id="minthrottle"]').val(FC.MOTOR_CONFIG.minthrottle);
        $('input[id="maxthrottle"]').val(FC.MOTOR_CONFIG.maxthrottle);
        $('input[id="mincommand"]').val(FC.MOTOR_CONFIG.mincommand);

        $('input[id="motorPoles"]').val(FC.MOTOR_CONFIG.motor_poles);
        //$('input[id="motor2Poles"]').val(FC.MOTOR_CONFIG.motor2_poles);

        self.isGovEnabled = FC.FEATURE_CONFIG.features.isEnabled('GOVERNOR');

        const govModes = [
            "OFF",
            "PASSTHROUGH",
            "STANDARD",
            "MODE1",
            "MODE2",
        ];
        const govModeSelect = $('select.govMode');

        for (let j = 0; j < govModes.length; j++) {
            govModeSelect.append(`<option value="${j}">${govModes[j]}</option>`);
        }

        govModeSelect.val(FC.GOVERNOR.gov_mode);

        $('input[id="govMaxHeadspeed"]').val(FC.GOVERNOR.gov_max_headspeed);
        $('input[id="govGearRatio"]').val(FC.GOVERNOR.gov_gear_ratio);
        $('input[id="govSpoolupTime"]').val(FC.GOVERNOR.gov_spoolup_time);
        $('input[id="govTrackingTime"]').val(FC.GOVERNOR.gov_tracking_time);
        $('input[id="govRecoveryTime"]').val(FC.GOVERNOR.gov_recovery_time);
        $('input[id="govAutoBailoutTime"]').val(FC.GOVERNOR.gov_autorotation_bailout_time);
        $('input[id="govAutoTimeout"]').val(FC.GOVERNOR.gov_autorotation_timeout);
        $('input[id="govMasterGain"]').val(FC.GOVERNOR.gov_gain);
        $('input[id="govCyclicPrecomp"]').val(FC.GOVERNOR.gov_cyclic_ff_weight);
        $('input[id="govCollectivePrecomp"]').val(FC.GOVERNOR.gov_collective_ff_weight);


        function updateVisibility() {

            const protocolNum = parseInt(escProtocolSelect.val());

            self.isProtoEnabled = !EscProtocols.IsProtocolDisabled(FC.CONFIG.apiVersion, protocolNum);
            self.isDshot = EscProtocols.IsProtocolDshot(FC.CONFIG.apiVersion, protocolNum);

            $('.minthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.maxthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.mincommand').toggle(self.isProtoEnabled && !self.isDshot);
            $('.checkboxPwm').toggle(self.isProtoEnabled && !self.isDshot);
            $('.inputPwmFreq').toggle(self.isProtoEnabled && !self.isDshot);
            $('.checkboxDshotBidir').toggle(self.isProtoEnabled && self.isDshot);

            $('.motorPoles').toggle(self.isProtoEnabled);
            //$('.motor2Poles').toggle(self.isProtoEnabled);

            $('#escProtocolDisabled').toggle(!self.isProtoEnabled);

            $('.governor_features').toggle(self.isGovEnabled && self.isProtoEnabled);

            pwmFreqSwitch.trigger("change");
        }

        escProtocolSelect.val(FC.PID_ADVANCED_CONFIG.fast_pwm_protocol);

        escProtocolSelect.change(updateVisibility);
        dshotBidirSwitch.change(updateVisibility);

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

            rpmBar.toggle(FC.MOTOR_CONFIG.use_esc_sensor || FC.MOTOR_CONFIG.use_dshot_telemetry);
            voltBar.toggle(FC.MOTOR_CONFIG.use_esc_sensor);
            currBar.toggle(FC.MOTOR_CONFIG.use_esc_sensor);
            tempBar.toggle(FC.MOTOR_CONFIG.use_esc_sensor);
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

        for (let index = 0; index < 4; index++) {
            process_motor_info(index);
        }

        function get_motor_info() {
            Promise.resolve(true)
                .then(() => { return MSP.promise(MSPCodes.MSP_MOTOR); })
                .then(() => { return MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY); })
                .then(() => { infoUpdateList.forEach(func => func()) });
        }

        GUI.interval_add('motor_info_pull', get_motor_info, 100, true);

        function get_battery_info() {
            Promise.resolve(true)
                .then(() => { return MSP.promise(MSPCodes.MSP_BATTERY_STATE); })
                .then(() => { infoUpdateList.forEach(func => func()) });
        }

        GUI.interval_add('battery_info_pull', get_battery_info, 1000, true);


        $('a.save').on('click', function() {

            FC.MOTOR_CONFIG.minthrottle = parseInt($('input[id="minthrottle"]').val());
            FC.MOTOR_CONFIG.maxthrottle = parseInt($('input[id="maxthrottle"]').val());
            FC.MOTOR_CONFIG.mincommand = parseInt($('input[id="mincommand"]').val());
            FC.MOTOR_CONFIG.motor_poles = parseInt($('input[id="motorPoles"]').val());
            FC.MOTOR_CONFIG.use_dshot_telemetry = dshotBidirSwitch.is(':checked') ? 1 : 0;

            FC.PID_ADVANCED_CONFIG.fast_pwm_protocol = parseInt(escProtocolSelect.val());
            FC.PID_ADVANCED_CONFIG.use_unsyncedPwm = pwmFreqSwitch.is(':checked') ? 1 : 0;
            FC.PID_ADVANCED_CONFIG.motor_pwm_rate = parseInt($('input[id="pwmFreq"]').val());

            if (self.isGovEnabled) {
                FC.GOVERNOR.gov_mode = govModeSelect.val();
                FC.GOVERNOR.gov_max_headspeed = parseInt($('input[id="govMaxHeadspeed"]').val());
                FC.GOVERNOR.gov_gear_ratio = parseInt($('input[id="govGearRatio"]').val());
                FC.GOVERNOR.gov_spoolup_time = parseInt($('input[id="govSpoolupTime"]').val());
                FC.GOVERNOR.gov_tracking_time = parseInt($('input[id="govTrackingTime"]').val());
                FC.GOVERNOR.gov_recovery_time = parseInt($('input[id="govRecoveryTime"]').val());
                FC.GOVERNOR.gov_autorotation_bailout_time = parseInt($('input[id="govAutoBailoutTime"]').val());
                FC.GOVERNOR.gov_autorotation_timeout = parseInt($('input[id="govAutoTimeout"]').val());
                FC.GOVERNOR.gov_gain = parseInt($('input[id="govMasterGain"]').val());
                FC.GOVERNOR.gov_cyclic_ff_weight = parseInt($('input[id="govCyclicPrecomp"]').val());
                FC.GOVERNOR.gov_collective_ff_weight = parseInt($('input[id="govCollectivePrecomp"]').val());
            }

            Promise.resolve(true)
                .then(() => { return MSP.promise(MSPCodes.MSP_SET_GOVERNOR, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR)); })
                .then(() => { return MSP.promise(MSPCodes.MSP_SET_MOTOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_MOTOR_CONFIG)); })
                .then(() => { return MSP.promise(MSPCodes.MSP_SET_ADVANCED_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_ADVANCED_CONFIG)); })
                .then(() => { return MSP.promise(MSPCodes.MSP_EEPROM_WRITE); })
                .then(() => {
                    GUI.log(i18n.getMessage('configurationEepromSaved'));
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT, false, false);
                    reinitialiseConnection(self);
                });

            self.isDirty = false;
        });

        GUI.content_ready(callback);
    }
};

TABS.motors.cleanup = function (callback) {
    if (callback) callback();
};

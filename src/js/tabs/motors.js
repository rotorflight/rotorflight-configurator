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

        // Motor telemetry
        const motorVoltage = $('.motors-bat-voltage');
        const motorMahDrawingElement = $('.motors-bat-mah-drawing');
        const motorMahDrawnElement = $('.motors-bat-mah-drawn');

        function power_data_pull() {
            motorVoltage.text(i18n.getMessage('motorsVoltageValue', [FC.ANALOG.voltage]));
            motorMahDrawingElement.text(i18n.getMessage('motorsADrawingValue', [FC.ANALOG.amperage.toFixed(2)]));
            motorMahDrawnElement.text(i18n.getMessage('motorsmAhDrawnValue', [FC.ANALOG.mAhdrawn]));
        }

        //GUI.interval_add('motors_power_data_pull_slow', power_data_pull, 250, true);

        function get_status() {
            MSP.send_message(MSPCodes.MSP_STATUS, false, false, get_motor_data);
        }

        function get_motor_data() {
            MSP.send_message(MSPCodes.MSP_MOTOR);
        }

        //GUI.interval_add('motor_and_status_pull', get_status, 50, true);

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

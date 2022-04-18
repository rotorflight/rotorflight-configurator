'use strict';

TABS.failsafe = {
    isDirty: false,
};

TABS.failsafe.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/failsafe.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_FAILSAFE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_GPS_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_GPS_RESCUE))
            .then(() => MSP.promise(MSPCodes.MSP_RX_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RXFAIL_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RSSI_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MOTOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MODE_RANGES))
            .then(() => MSP.promise(MSPCodes.MSP_BOXIDS))
            .then(() => MSP.promise(MSPCodes.MSP_BOXNAMES))
            .then(() => MSP.promise(MSPCodes.MSP_RC))
            .then(() => MSP.promise(MSPCodes.MSP2_COMMON_SERIAL_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        mspHelper.sendRxFailConfig(() => {
            Promise.resolve(true)
                .then(() => MSP.promise(MSPCodes.MSP_SET_FEATURE_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FEATURE_CONFIG)))
                .then(() => MSP.promise(MSPCodes.MSP_SET_FAILSAFE_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FAILSAFE_CONFIG)))
                .then(() => MSP.promise(MSPCodes.MSP_SET_GPS_RESCUE, mspHelper.crunch(MSPCodes.MSP_SET_GPS_RESCUE)))
                .then(() => MSP.promise(MSPCodes.MSP_SET_RX_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_RX_CONFIG)))
                .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
                .then(() => {
                    GUI.log(i18n.getMessage('eepromSaved'));
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                    GUI.log(i18n.getMessage('deviceRebooting'));
                    reinitialiseConnection(callback);
                });
        });
    }

    function update_data() {

        FC.FEATURE_CONFIG.features.updateData($('input[name="FAILSAFE"]'));

        FC.RX_CONFIG.rx_min_usec = parseInt($('input[name="rx_min_usec"]').val());
        FC.RX_CONFIG.rx_max_usec = parseInt($('input[name="rx_max_usec"]').val());

        FC.FAILSAFE_CONFIG.failsafe_throttle = parseInt($('input[name="failsafe_throttle"]').val());
        FC.FAILSAFE_CONFIG.failsafe_off_delay = parseFloat($('input[name="failsafe_off_delay"]').val()) * 10;
        FC.FAILSAFE_CONFIG.failsafe_throttle_low_delay = parseFloat($('input[name="failsafe_throttle_low_delay"]').val()) * 10;
        FC.FAILSAFE_CONFIG.failsafe_delay = parseFloat($('input[name="failsafe_delay"]').val()) * 10;

        if( $('input[id="land"]').is(':checked')) {
            FC.FAILSAFE_CONFIG.failsafe_procedure = 0;
        } else if( $('input[id="drop"]').is(':checked')) {
            FC.FAILSAFE_CONFIG.failsafe_procedure = 1;
        } else if( $('input[id="gps_rescue"]').is(':checked')) {
            FC.FAILSAFE_CONFIG.failsafe_procedure = 2;
        }

        FC.FAILSAFE_CONFIG.failsafe_switch_mode = $('select[name="failsafe_switch_mode"]').val();

        FC.GPS_RESCUE.angle             = $('input[name="gps_rescue_angle"]').val();
        FC.GPS_RESCUE.initialAltitudeM  = $('input[name="gps_rescue_initial_altitude"]').val();
        FC.GPS_RESCUE.descentDistanceM  = $('input[name="gps_rescue_descent_distance"]').val();
        FC.GPS_RESCUE.rescueGroundspeed = $('input[name="gps_rescue_ground_speed"]').val() * 100;
        FC.GPS_RESCUE.throttleMin       = $('input[name="gps_rescue_throttle_min"]').val();
        FC.GPS_RESCUE.throttleMax       = $('input[name="gps_rescue_throttle_max"]').val();
        FC.GPS_RESCUE.throttleHover     = $('input[name="gps_rescue_throttle_hover"]').val();
        FC.GPS_RESCUE.minSats           = $('input[name="gps_rescue_min_sats"]').val();
        FC.GPS_RESCUE.sanityChecks      = $('select[name="gps_rescue_sanity_checks"]').val();

        FC.GPS_RESCUE.ascendRate = $('input[name="gps_rescue_ascend_rate"]').val() * 100;
        FC.GPS_RESCUE.descendRate = $('input[name="gps_rescue_descend_rate"]').val() * 100;
        FC.GPS_RESCUE.allowArmingWithoutFix = $('input[name="gps_rescue_allow_arming_without_fix"]').prop('checked') ? 1 : 0;
        FC.GPS_RESCUE.altitudeMode = parseInt($('select[name="gps_rescue_altitude_mode"]').val());
    }

    function process_html() {

        // Hide the buttons toolbar
        $('.tab-failsafe').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-failsafe').removeClass('toolbar_hidden');
            }
        }

        // fill stage 2 fields
        function toggleStage2(doShow) {
            if (doShow) {
                $('div.stage2').show();
            } else {
                $('div.stage2').hide();
            }
        }

        // FIXME cleanup oldpane html and css
        const oldPane = $('div.oldpane');
        oldPane.prop("disabled", true);
        oldPane.hide();

        // generate labels for assigned aux modes
        const auxAssignment = [];

        let element;

        for (let channelIndex = 5; channelIndex < FC.RC.active_channels ; channelIndex++) {
            auxAssignment.push("");
        }

        if (typeof FC.RSSI_CONFIG.channel !== 'undefined')  {
            auxAssignment[FC.RSSI_CONFIG.channel - 6] += "<span class=\"modename\">" + "RSSI" + "</span>";         // Aux channels start at 6 in backend so we have to substract 6
        }

        for (let modeIndex = 0; modeIndex < FC.AUX_CONFIG.length; modeIndex++) {

            const modeId = FC.AUX_CONFIG_IDS[modeIndex];

            // scan mode ranges to find assignments
            for (let modeRangeIndex = 0; modeRangeIndex < FC.MODE_RANGES.length; modeRangeIndex++) {
                const modeRange = FC.MODE_RANGES[modeRangeIndex];

                if (modeRange.id != modeId) {
                    continue;
                }

                const range = modeRange.range;
                if (range.start >= range.end) {
                    continue; // invalid!
                }

                // Search for the real name if it belongs to a peripheral
                let modeName = FC.AUX_CONFIG[modeIndex];
                modeName = adjustBoxNameIfPeripheralWithModeID(modeId, modeName);

                auxAssignment[modeRange.auxChannelIndex] += "<span class=\"modename\">" + modeName + "</span>";
            }
        }

        // generate full channel list
        const channelNames = [
                i18n.getMessage('controlAxisRoll'),
                i18n.getMessage('controlAxisPitch'),
                i18n.getMessage('controlAxisYaw'),
                i18n.getMessage('controlAxisThrottle'),
                i18n.getMessage('controlAxisCollective'),
            ],
            fullChannels_e = $('div.activechannellist');
        let aux_index = 1,
            aux_assignment_index = 0;

        for (let i = 0; i < FC.RXFAIL_CONFIG.length; i++) {
            if (i < channelNames.length) {
                fullChannels_e.append('\
                    <div class="number">\
                        <div class="channelprimary">\
                            <span>' + channelNames[i] + '</span>\
                        </div>\
                        <div class="cf_tip channelsetting" title="' + i18n.getMessage("failsafeChannelFallbackSettingsAuto") + '">\
                            <select class="aux_set" id="' + i + '">\
                                <option value="0">Auto</option>\
                                <option value="1">Hold</option>\
                                <option value="2">Set</option>\
                            </select>\
                        </div>\
                        <div class="auxiliary"><input type="number" name="aux_value" min="750" max="2250" step="25" id="' + i + '"/></div>\
                    </div>\
                ');
            } else {
                fullChannels_e.append('\
                    <div class="number">\
                        <div class="channelauxiliary">\
                            <span class="channelname">' + i18n.getMessage("controlAxisAux" + (aux_index++)) + '</span>\
                            ' + auxAssignment[aux_assignment_index++] + '\
                        </div>\
                        <div class="cf_tip channelsetting" title="' + i18n.getMessage("failsafeChannelFallbackSettingsHold") + '">\
                            <select class="aux_set" id="' + i + '">\
                                <option value="1">Hold</option>\
                                <option value="2">Set</option>\
                            </select>\
                        </div>\
                        <div class="auxiliary"><input type="number" name="aux_value" min="750" max="2250" step="25" id="' + i + '"/></div>\
                    </div>\
                ');
            }
        }

        const channel_mode_array = [];
        $('.number', fullChannels_e).each(function () {
            channel_mode_array.push($('select.aux_set' , this));
        });

        const channel_value_array = [];
        $('.number', fullChannels_e).each(function () {
            channel_value_array.push($('input[name="aux_value"]' , this));
        });

        const channelMode = $('select.aux_set');
        const channelValue = $('input[name="aux_value"]');

        // UI hooks
        channelMode.change(function () {
            const currentMode = parseInt($(this).val());
            const i = parseInt($(this).prop("id"));
            FC.RXFAIL_CONFIG[i].mode = currentMode;
            if (currentMode == 2) {
                channel_value_array[i].prop("disabled", false);
                channel_value_array[i].show();
            } else {
                channel_value_array[i].prop("disabled", true);
                channel_value_array[i].hide();
            }
        });

        // UI hooks
        channelValue.change(function () {
            const i = parseInt($(this).prop("id"));
            FC.RXFAIL_CONFIG[i].value = parseInt($(this).val());
        });

        // fill stage 1 Valid Pulse Range Settings
        $('input[name="rx_min_usec"]').val(FC.RX_CONFIG.rx_min_usec);
        $('input[name="rx_max_usec"]').val(FC.RX_CONFIG.rx_max_usec);

        // fill fallback settings (mode and value) for all channels
        for (let i = 0; i < FC.RXFAIL_CONFIG.length; i++) {
            channel_value_array[i].val(FC.RXFAIL_CONFIG[i].value);
            channel_mode_array[i].val(FC.RXFAIL_CONFIG[i].mode);
            channel_mode_array[i].change();
        }

        FC.FEATURE_CONFIG.features.generateElements($('.tab-failsafe .featuresNew'));

        $('tbody.rxFailsafe').hide();
        toggleStage2(true);

        $('input[name="failsafe_throttle"]').val(FC.FAILSAFE_CONFIG.failsafe_throttle).change();
        $('input[name="failsafe_off_delay"]').val(FC.FAILSAFE_CONFIG.failsafe_off_delay / 10).change();
        $('input[name="failsafe_throttle_low_delay"]').val(FC.FAILSAFE_CONFIG.failsafe_throttle_low_delay / 10).change();
        $('input[name="failsafe_delay"]').val(FC.FAILSAFE_CONFIG.failsafe_delay / 10).change();

        // set stage 2 failsafe procedure
        $('input[type="radio"].procedure').change(function () {
            // Disable all the settings
            $('.proceduresettings :input').attr('disabled',true);
            // Enable only selected
            $(this).parent().parent().find(':input').attr('disabled',false);
        });

        switch(FC.FAILSAFE_CONFIG.failsafe_procedure) {
            case 0:
                element = $('input[id="land"]') ;
                element.prop('checked', true);
                element.change();
                break;
            case 1:
                element = $('input[id="drop"]');
                element.prop('checked', true);
                element.change();
                break;
            case 2:
                element = $('input[id="gps_rescue"]');
                element.prop('checked', true);
                element.change();
                break;
        }

        $('select[name="failsafe_switch_mode"]').val(FC.FAILSAFE_CONFIG.failsafe_switch_mode);
        $('div.kill_switch').hide();

        // Load GPS Rescue parameters
        $('input[name="gps_rescue_angle"]').val(FC.GPS_RESCUE.angle);
        $('input[name="gps_rescue_initial_altitude"]').val(FC.GPS_RESCUE.initialAltitudeM);
        $('input[name="gps_rescue_descent_distance"]').val(FC.GPS_RESCUE.descentDistanceM);
        $('input[name="gps_rescue_ground_speed"]').val((FC.GPS_RESCUE.rescueGroundspeed / 100).toFixed(2));
        $('input[name="gps_rescue_throttle_min"]').val(FC.GPS_RESCUE.throttleMin);
        $('input[name="gps_rescue_throttle_max"]').val(FC.GPS_RESCUE.throttleMax);
        $('input[name="gps_rescue_throttle_hover"]').val(FC.GPS_RESCUE.throttleHover);
        $('input[name="gps_rescue_min_sats"]').val(FC.GPS_RESCUE.minSats);
        $('select[name="gps_rescue_sanity_checks"]').val(FC.GPS_RESCUE.sanityChecks);
        $('input[name="gps_rescue_ascend_rate"]').val((FC.GPS_RESCUE.ascendRate / 100).toFixed(2));
        $('input[name="gps_rescue_descend_rate"]').val((FC.GPS_RESCUE.descendRate / 100).toFixed(2));
        $('input[name="gps_rescue_allow_arming_without_fix"]').prop('checked', FC.GPS_RESCUE.allowArmingWithoutFix > 0);
        $('select[name="gps_rescue_altitude_mode"]').val(FC.GPS_RESCUE.altitudeMode);

        self.save = function (callback) {
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

        $('.content_wrapper').change(function () {
            setDirty();
        });

        // translate to user-selected language
        i18n.localizePage();

        GUI.interval_add('status_pull', function status_pull() {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.failsafe.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};


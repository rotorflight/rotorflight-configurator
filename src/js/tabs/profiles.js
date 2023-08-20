'use strict';

TABS.profiles = {
    isDirty: false,
    activeSubtab: null,
    currentProfile: null,
    isGovEnabled: false,
    isTTAEnabled: false,
    isPIDDefault: false,
    tabNames: [
        'profile1',
        'profile2',
        'profile3',
        'profile4',
        'profile5',
        'profile6',
    ],
    axisNames: [
        'ROLL',
        'PITCH',
        'YAW',
    ],
    gainNames: [
        'P',
        'I',
        'D',
        'F',
    ],
    defaultGains: [
        [ 10, 50, 0, 50 ],
        [ 10, 50, 0, 50 ],
        [ 50, 50, 0,  0 ],
    ],
};

TABS.profiles.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/profiles.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_PID_TUNING))
            .then(() => MSP.promise(MSPCodes.MSP_PID_PROFILE))
            .then(() => MSP.promise(MSPCodes.MSP_RESCUE_PROFILE))
            .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE))
            .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_SENSOR_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_PID_TUNING, mspHelper.crunch(MSPCodes.MSP_SET_PID_TUNING)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_PID_PROFILE, mspHelper.crunch(MSPCodes.MSP_SET_PID_PROFILE)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_RESCUE_PROFILE, mspHelper.crunch(MSPCodes.MSP_SET_RESCUE_PROFILE)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_GOVERNOR_PROFILE, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR_PROFILE)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_GOVERNOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                if (callback) callback();
            });
    }

    function data_to_form() {

        self.currentProfile = FC.CONFIG.profile;

        self.activeSubtab = self.tabNames[self.currentProfile];

        $('.tab-profiles .tab-container .tab').removeClass('active');
        $('.tab-profiles .tab-container .' + self.activeSubtab).addClass('active');

        $('.tab-profiles .note').hide();

        self.isPIDDefault = true;
        self.axisNames.forEach(function(axis, indexAxis) {
            self.gainNames.forEach(function(gain, indexGain) {
                const input = $(`.tab-profiles .${axis} input[name="${gain}"]`);
                const value = FC.PIDS[indexAxis][indexGain];
                self.isPIDDefault &= (value == self.defaultGains[indexAxis][indexGain]);
                input.val(value);
            });
        });

        if (FC.PID_PROFILE.pid_mode == 0) {
            $('.tab-profiles .profilesPIDPassthroughWarning').show();
            $('.tab-profiles .pid_standard input').prop('disabled', true);
        }
        else if (FC.PID_PROFILE.pid_mode == 1) {
            $('.tab-profiles .profilesPIDCompatibilityWarning').show();
        }
        else if (FC.PID_PROFILE.pid_mode > 2) {
            $('.tab-profiles .profilesPIDCustomWarning').show();
            $('.tab-profiles .pid_standard input').prop('disabled', true);
        }

        $('.tab-profiles input[id="gyroCutoffRoll"]').val(FC.PID_PROFILE.gyroCutoffRoll).change();
        $('.tab-profiles input[id="gyroCutoffPitch"]').val(FC.PID_PROFILE.gyroCutoffPitch).change();
        $('.tab-profiles input[id="gyroCutoffYaw"]').val(FC.PID_PROFILE.gyroCutoffYaw).change();

        $('.tab-profiles input[id="dtermCutoffRoll"]').val(FC.PID_PROFILE.dtermCutoffRoll).change();
        $('.tab-profiles input[id="dtermCutoffPitch"]').val(FC.PID_PROFILE.dtermCutoffPitch).change();
        $('.tab-profiles input[id="dtermCutoffYaw"]').val(FC.PID_PROFILE.dtermCutoffYaw).change();

        // Cumulative Error limits
        $('.tab-profiles input[id="errorLimitRoll"]').val(FC.PID_PROFILE.errorLimitRoll).change();
        $('.tab-profiles input[id="errorLimitPitch"]').val(FC.PID_PROFILE.errorLimitPitch).change();
        $('.tab-profiles input[id="errorLimitYaw"]').val(FC.PID_PROFILE.errorLimitYaw).change();

        // Error rotation
        $('.tab-profiles input[id="errorRotation"]').prop('checked', FC.PID_PROFILE.error_rotation !== 0);

        // Error decay
        $('.tab-profiles input[id="errorDecayTime"]').val(FC.PID_PROFILE.error_decay_time_ground / 10);

        const errorDecayCheck = $('.tab-profiles input[id="errorDecay"]');
        errorDecayCheck.change(function() {
            const checked = $(this).is(':checked');
            $('.tab-profiles .errorDecay .suboption').toggle(checked);
        });
        errorDecayCheck.prop('checked', FC.PID_PROFILE.error_decay_time_ground > 0).change();

        // I-term relax
        $('.tab-profiles input[id="itermRelaxCutoffRoll"]').val(FC.PID_PROFILE.itermRelaxCutoffRoll);
        $('.tab-profiles input[id="itermRelaxCutoffPitch"]').val(FC.PID_PROFILE.itermRelaxCutoffPitch);
        $('.tab-profiles input[id="itermRelaxCutoffYaw"]').val(FC.PID_PROFILE.itermRelaxCutoffYaw);

        const itermRelaxCheck = $('.tab-profiles input[id="itermRelax"]');
        const itermRelaxType = $('.tab-profiles select[id="itermRelaxType"]');

        itermRelaxCheck.change(function() {
            const checked = itermRelaxCheck.is(':checked');
            $('.tab-profiles .itermRelax .suboption').toggle(checked);
            $('.tab-profiles .itermRelax .subhelp').toggle(checked);
            itermRelaxType.change();
        });
        itermRelaxCheck.prop('checked', FC.PID_PROFILE.itermRelaxType > 0).change();

        itermRelaxType.change(function() {
            const checked = itermRelaxCheck.is(':checked');
            const value = (checked) ? itermRelaxType.val() : 0;
            $('.tab-profiles .itermRelaxYawOption').toggle(value > 1);
        });
        itermRelaxType.val(FC.PID_PROFILE.itermRelaxType < 2 ? 1 : 2).change();

        // Yaw settings
        $('.tab-profiles input[id="yawStopGainCW"]').val(FC.PID_PROFILE.yawStopGainCW);
        $('.tab-profiles input[id="yawStopGainCCW"]').val(FC.PID_PROFILE.yawStopGainCCW);
        $('.tab-profiles input[id="yawFFCyclicGain"]').val(FC.PID_PROFILE.yawFFCyclicGain);
        $('.tab-profiles input[id="yawFFCollectiveGain"]').val(FC.PID_PROFILE.yawFFCollectiveGain);
        $('.tab-profiles input[id="yawFFImpulseGain"]').val(FC.PID_PROFILE.yawFFImpulseGain);
        $('.tab-profiles input[id="yawFFImpulseDecay"]').val(FC.PID_PROFILE.yawFFImpulseDecay);

        // Pitch settings
        $('.tab-profiles input[id="pitchFFCollectiveGain"]').val(FC.PID_PROFILE.pitchFFCollectiveGain);

        // Acro Trainer
        $('.tab-profiles input[id="acroTrainerGain"]').val(FC.PID_PROFILE.acroTrainerGain).trigger('input');
        $('.tab-profiles input[id="acroTrainerLimit"]').val(FC.PID_PROFILE.acroTrainerLimit).trigger('input');

        // Angle mode
        $('.tab-profiles input[id="angleModeGain"]').val(FC.PID_PROFILE.levelAngleStrength);
        $('.tab-profiles input[id="angleModeLimit"]').val(FC.PID_PROFILE.levelAngleLimit);

        // Horizon mode
        $('.tab-profiles input[id="horizonModeGain"]').val(FC.PID_PROFILE.horizonLevelStrength);

        // Rescue settings
        const rescueModeCheck = $('.tab-profiles input[id="rescueEnable"]');
        rescueModeCheck.change(function() {
            const checked = $(this).is(':checked');
            $('.tab-profiles .rescueMode .suboption').toggle(checked);
            $('.tab-profiles .rescueMode .subhelp').toggle(checked);
            $('.tab-profiles .rescueAltHold').toggle(checked);
        });
        rescueModeCheck.prop('checked', FC.PID_PROFILE.rescueMode > 0).change();

        const rescueAltHoldCheck = $('.tab-profiles input[id="rescueAltHold"]');
        rescueAltHoldCheck.change(function() {
            const checked = $(this).is(':checked');
            $('.tab-profiles .rescueAltHold .suboption').toggle(checked);
            $('.tab-profiles .rescueAltHold .subhelp').toggle(checked);
        });
        rescueAltHoldCheck.prop('checked', FC.PID_PROFILE.rescueMode > 1).change();

        $('.tab-profiles select[id="rescueFlipMode"]').val(FC.PID_PROFILE.rescueFlipMode);
        $('.tab-profiles input[id="rescuePullupCollective"]').val(FC.PID_PROFILE.rescuePullupCollective / 10).change();
        $('.tab-profiles input[id="rescueClimbCollective"]').val(FC.PID_PROFILE.rescueClimbCollective / 10).change();
        $('.tab-profiles input[id="rescueHoverCollective"]').val(FC.PID_PROFILE.rescueHoverCollective / 10).change();
        $('.tab-profiles input[id="rescuePullupTime"]').val(FC.PID_PROFILE.rescuePullupTime / 10).change();
        $('.tab-profiles input[id="rescueClimbTime"]').val(FC.PID_PROFILE.rescueClimbTime / 10).change();
        $('.tab-profiles input[id="rescueFlipTime"]').val(FC.PID_PROFILE.rescueFlipTime / 10).change();
        $('.tab-profiles input[id="rescueExitTime"]').val(FC.PID_PROFILE.rescueExitTime / 10).change();
        $('.tab-profiles input[id="rescueFlipGain"]').val(FC.PID_PROFILE.rescueFlipGain);
        $('.tab-profiles input[id="rescueLevelGain"]').val(FC.PID_PROFILE.rescueLevelGain);
        $('.tab-profiles input[id="rescueMaxRate"]').val(FC.PID_PROFILE.rescueMaxRate);
        $('.tab-profiles input[id="rescueMaxAccel"]').val(FC.PID_PROFILE.rescueMaxAccel);
        $('.tab-profiles input[id="rescueHoverAltitude"]').val(FC.PID_PROFILE.rescueHoverAltitude / 100).change();
        $('.tab-profiles input[id="rescueAltitudePGain"]').val(FC.PID_PROFILE.rescueAltitudePGain);
        $('.tab-profiles input[id="rescueAltitudeIGain"]').val(FC.PID_PROFILE.rescueAltitudeIGain);
        $('.tab-profiles input[id="rescueAltitudeDGain"]').val(FC.PID_PROFILE.rescueAltitudeDGain);
        $('.tab-profiles input[id="rescueMaxCollective"]').val(FC.PID_PROFILE.rescueMaxCollective / 10).change();

        // Governor settings
        self.isGovEnabled = FC.FEATURE_CONFIG.features.isEnabled('GOVERNOR') && (FC.GOVERNOR.gov_mode > 1);
        self.isTTAEnabled = FC.FEATURE_CONFIG.features.isEnabled('GOVERNOR') && (FC.GOVERNOR.gov_mode > 0);

        $('.tab-profiles input[id="govHeadspeed"]').val(FC.GOVERNOR.gov_headspeed);
        $('.tab-profiles input[id="govMasterGain"]').val(FC.GOVERNOR.gov_gain);
        $('.tab-profiles input[id="govPGain"]').val(FC.GOVERNOR.gov_p_gain);
        $('.tab-profiles input[id="govIGain"]').val(FC.GOVERNOR.gov_i_gain);
        $('.tab-profiles input[id="govDGain"]').val(FC.GOVERNOR.gov_d_gain);
        $('.tab-profiles input[id="govFGain"]').val(FC.GOVERNOR.gov_f_gain);
        $('.tab-profiles input[id="govTTAGain"]').val(FC.GOVERNOR.gov_tta_gain);
        $('.tab-profiles input[id="govTTALimit"]').val(FC.GOVERNOR.gov_tta_limit);
        $('.tab-profiles input[id="govYawPrecomp"]').val(FC.GOVERNOR.gov_yaw_ff_weight);
        $('.tab-profiles input[id="govCyclicPrecomp"]').val(FC.GOVERNOR.gov_cyclic_ff_weight);
        $('.tab-profiles input[id="govCollectivePrecomp"]').val(FC.GOVERNOR.gov_collective_ff_weight);

        $('.tab-profiles .govTTAGain').toggle(self.isTTAEnabled);
        $('.tab-profiles .govTTALimit').toggle(self.isTTAEnabled);
        $('.tab-profiles .gov_config').toggle(self.isGovEnabled);
    }

    function form_to_data() {

        self.axisNames.forEach(function(axis, indexAxis) {
            self.gainNames.forEach(function(gain, indexGain) {
                const input = $(`.tab-profiles .${axis} input[name="${gain}"]`);
                const value = parseInt(input.val());
                FC.PIDS[indexAxis][indexGain] = value;
            });
        });

        FC.PID_PROFILE.gyroCutoffRoll = $('.tab-profiles input[id="gyroCutoffRoll"]').val();
        FC.PID_PROFILE.gyroCutoffPitch = $('.tab-profiles input[id="gyroCutoffPitch"]').val();
        FC.PID_PROFILE.gyroCutoffYaw = $('.tab-profiles input[id="gyroCutoffYaw"]').val();

        FC.PID_PROFILE.dtermCutoffRoll = $('.tab-profiles input[id="dtermCutoffRoll"]').val();
        FC.PID_PROFILE.dtermCutoffPitch = $('.tab-profiles input[id="dtermCutoffPitch"]').val();
        FC.PID_PROFILE.dtermCutoffYaw = $('.tab-profiles input[id="dtermCutoffYaw"]').val();

        FC.PID_PROFILE.errorLimitRoll = $('.tab-profiles input[id="errorLimitRoll"]').val();
        FC.PID_PROFILE.errorLimitPitch = $('.tab-profiles input[id="errorLimitPitch"]').val();
        FC.PID_PROFILE.errorLimitYaw = $('.tab-profiles input[id="errorLimitYaw"]').val();

        FC.PID_PROFILE.error_decay_time_ground = $('.tab-profiles input[id="errorDecay"]').is(':checked') ?
            $('.tab-profiles input[id="errorDecayTime"]').val() * 10 : 0;
        FC.PID_PROFILE.error_rotation = $('.tab-profiles input[id="errorRotation"]').is(':checked') ? 1 : 0;
        FC.PID_PROFILE.itermRelaxType = $('.tab-profiles input[id="itermRelax"]').is(':checked') ?
            $('.tab-profiles select[id="itermRelaxType"]').val() : 0;
        FC.PID_PROFILE.itermRelaxCutoffRoll = parseInt($('.tab-profiles input[id="itermRelaxCutoffRoll"]').val());
        FC.PID_PROFILE.itermRelaxCutoffPitch = parseInt($('.tab-profiles input[id="itermRelaxCutoffPitch"]').val());
        FC.PID_PROFILE.itermRelaxCutoffYaw = parseInt($('.tab-profiles input[id="itermRelaxCutoffYaw"]').val());

        // Yaw settings
        FC.PID_PROFILE.yawStopGainCW = $('.tab-profiles input[id="yawStopGainCW"]').val();
        FC.PID_PROFILE.yawStopGainCCW = $('.tab-profiles input[id="yawStopGainCCW"]').val();
        FC.PID_PROFILE.yawFFCyclicGain = $('.tab-profiles input[id="yawFFCyclicGain"]').val();
        FC.PID_PROFILE.yawFFCollectiveGain = $('.tab-profiles input[id="yawFFCollectiveGain"]').val();
        FC.PID_PROFILE.yawFFImpulseGain = $('.tab-profiles input[id="yawFFImpulseGain"]').val();
        FC.PID_PROFILE.yawFFImpulseDecay = $('.tab-profiles input[id="yawFFImpulseDecay"]').val();
        // Pitch settings
        FC.PID_PROFILE.pitchFFCollectiveGain = parseInt($('.tab-profiles input[id="pitchFFCollectiveGain"]').val());

        // Leveling modes
        FC.PID_PROFILE.acroTrainerGain = parseInt($('.tab-profiles input[id="acroTrainerGain"]').val());
        FC.PID_PROFILE.acroTrainerLimit = parseInt($('.tab-profiles input[id="acroTrainerLimit"]').val());
        FC.PID_PROFILE.levelAngleStrength = parseInt($('.tab-profiles input[id="angleModeGain"]').val());
        FC.PID_PROFILE.levelAngleLimit = parseInt($('.tab-profiles input[id="angleModeLimit"]').val());
        FC.PID_PROFILE.horizonLevelStrength = parseInt($('.tab-profiles input[id="horizonModeGain"]').val());

        // Rescue settings
        const rescueEna = $('.tab-profiles input[id="rescueEnable"]').is(':checked');
        const rescueAlt = $('.tab-profiles input[id="rescueAltHold"]').is(':checked');
        FC.PID_PROFILE.rescueMode = rescueEna ? (rescueAlt ? 2 : 1) : 0;

        FC.PID_PROFILE.rescueFlipMode = $('.tab-profiles select[id="rescueFlipMode"]').val();
        FC.PID_PROFILE.rescuePullupCollective = $('.tab-profiles input[id="rescuePullupCollective"]').val() * 10;
        FC.PID_PROFILE.rescueClimbCollective = $('.tab-profiles input[id="rescueClimbCollective"]').val() * 10;
        FC.PID_PROFILE.rescueHoverCollective = $('.tab-profiles input[id="rescueHoverCollective"]').val() * 10;
        FC.PID_PROFILE.rescueMaxRate = $('.tab-profiles input[id="rescueMaxRate"]').val();
        FC.PID_PROFILE.rescueMaxAccel = $('.tab-profiles input[id="rescueMaxAccel"]').val();
        FC.PID_PROFILE.rescueFlipGain = $('.tab-profiles input[id="rescueFlipGain"]').val();
        FC.PID_PROFILE.rescueLevelGain = $('.tab-profiles input[id="rescueLevelGain"]').val();
        FC.PID_PROFILE.rescuePullupTime = $('.tab-profiles input[id="rescuePullupTime"]').val() * 10;
        FC.PID_PROFILE.rescueClimbTime = $('.tab-profiles input[id="rescueClimbTime"]').val() * 10;
        FC.PID_PROFILE.rescueFlipTime = $('.tab-profiles input[id="rescueFlipTime"]').val() * 10;
        FC.PID_PROFILE.rescueExitTime = $('.tab-profiles input[id="rescueExitTime"]').val() * 10;
        FC.PID_PROFILE.rescueHoverAltitude = $('.tab-profiles input[id="rescueHoverAltitude"]').val() * 100;
        FC.PID_PROFILE.rescueAltitudePGain = $('.tab-profiles input[id="rescueAltitudePGain"]').val();
        FC.PID_PROFILE.rescueAltitudeIGain = $('.tab-profiles input[id="rescueAltitudeIGain"]').val();
        FC.PID_PROFILE.rescueAltitudeDGain = $('.tab-profiles input[id="rescueAltitudeDGain"]').val();
        FC.PID_PROFILE.rescueMaxCollective = $('.tab-profiles input[id="rescueMaxCollective"]').val() * 10;

        // TTA settings
        if (self.isTTAEnabled) {
            FC.GOVERNOR.gov_tta_gain = parseInt($('.tab-profiles input[id="govTTAGain"]').val());
            FC.GOVERNOR.gov_tta_limit = parseInt($('.tab-profiles input[id="govTTALimit"]').val());
        }

        // Governor settings
        if (self.isGovEnabled) {
            FC.GOVERNOR.gov_headspeed = parseInt($('.tab-profiles input[id="govHeadspeed"]').val());
            FC.GOVERNOR.gov_gain = parseInt($('.tab-profiles input[id="govMasterGain"]').val());
            FC.GOVERNOR.gov_p_gain = parseInt($('.tab-profiles input[id="govPGain"]').val());
            FC.GOVERNOR.gov_i_gain = parseInt($('.tab-profiles input[id="govIGain"]').val());
            FC.GOVERNOR.gov_d_gain = parseInt($('.tab-profiles input[id="govDGain"]').val());
            FC.GOVERNOR.gov_f_gain = parseInt($('.tab-profiles input[id="govFGain"]').val());
            FC.GOVERNOR.gov_yaw_ff_weight = parseInt($('.tab-profiles input[id="govYawPrecomp"]').val());
            FC.GOVERNOR.gov_cyclic_ff_weight = parseInt($('.tab-profiles input[id="govCyclicPrecomp"]').val());
            FC.GOVERNOR.gov_collective_ff_weight = parseInt($('.tab-profiles input[id="govCollectivePrecomp"]').val());
        }
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks
        data_to_form();

        // Hide the buttons toolbar
        $('.tab-profiles').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-profiles').removeClass('toolbar_hidden');
                $('#copyProfile').addClass('disabled');
            }
        }

        function activateProfile(profile) {
            FC.CONFIG.profile = profile;
            MSP.promise(MSPCodes.MSP_SELECT_SETTING, [profile])
                .then(function () {
                    GUI.log(i18n.getMessage('profilesActivateProfile', [profile + 1]));
                    GUI.tab_switch_reload();
                });
        }

        self.tabNames.forEach(function(element, index) {
            $('.tab-profiles .tab-container .' + element).on('click', () => GUI.tab_switch_allowed(() => activateProfile(index)));
            $('.tab-profiles .tab-container .' + element).toggle(index < FC.CONFIG.numProfiles);
        });

        const dialogResetProfile = $('.dialogResetProfile')[0];

        $('#resetProfile').click(function() {
            dialogResetProfile.showModal();
        });

        $('.dialogResetProfile-cancelbtn').click(function() {
            dialogResetProfile.close();
        });

        $('.dialogResetProfile-confirmbtn').click(function() {
            MSP.send_message(MSPCodes.MSP_SET_RESET_CURR_PID, false, false, function () {
                GUI.log(i18n.getMessage('profilesResetProfile'));
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                    GUI.log(i18n.getMessage('eepromSaved'));
                    dialogResetProfile.close();
                    GUI.tab_switch_reload();
                });
            });
        });

        const dialogCopyProfile = $('.dialogCopyProfile')[0];
        const selectProfile = $('.selectProfile');

        $.each(self.tabNames, function(key, value) {
            if (key != FC.CONFIG.profile) {
                const tabIndex = key + 1;
                selectProfile.append(new Option(i18n.getMessage(`profilesSubTab${tabIndex}`), key));
            }
        });

        $('#copyProfile').click(function() {
            if (!self.isDirty) {
                dialogCopyProfile.showModal();
            }
        });

        $('.dialogCopyProfile-cancelbtn').click(function() {
            dialogCopyProfile.close();
        });

        $('.dialogCopyProfile-confirmbtn').click(function() {
            FC.COPY_PROFILE.type = 0;
            FC.COPY_PROFILE.dstProfile = parseInt(selectProfile.val());
            FC.COPY_PROFILE.srcProfile = FC.CONFIG.profile;

            MSP.send_message(MSPCodes.MSP_COPY_PROFILE, mspHelper.crunch(MSPCodes.MSP_COPY_PROFILE), false, function () {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                    GUI.log(i18n.getMessage('eepromSaved'));
                    dialogCopyProfile.close();
                });
            });
        });

        const dialogProfileChange = $('.dialogProfileChange')[0];

        $('.dialogProfileChangeConfirmBtn').click(function() {
            dialogProfileChange.close();
            GUI.tab_switch_reload();
            GUI.log(i18n.getMessage('profilesActivateProfile', [FC.CONFIG.profile + 1]));
        });

        self.save = function (callback) {
            form_to_data();
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

        $('.tab-area').change(function () {
            setDirty();
        });

        $('.tab-profiles input[id="govHeadspeed"]').change(function () {
            const value = parseInt($(this).val());
            if (!self.isPIDDefault && value != FC.GOVERNOR.gov_headspeed) {
                $('.tab-profiles .gov_config .note').show();
            }
        });

        function get_status() {
            MSP.send_message(MSPCodes.MSP_STATUS, false, false, function() {
                if (self.currentProfile != FC.CONFIG.profile && !dialogProfileChange.hasAttribute('open')) {
                    if (self.isDirty) {
                        dialogProfileChange.showModal();
                    } else {
                        GUI.tab_switch_reload();
                        GUI.log(i18n.getMessage('profilesActivateProfile', [FC.CONFIG.profile + 1]));
                    }
                }
            });
        }

        GUI.interval_add('status_pull', get_status, 250, true);

        GUI.content_ready(callback);
    }
};


TABS.profiles.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};

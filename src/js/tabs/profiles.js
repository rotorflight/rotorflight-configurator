'use strict';

TABS.profiles = {
    isDirty: false,
    activeSubtab: null,
    currentProfile: null,
    isGovEnabled: false,
    isTTAEnabled: false,
    tabNames: [
        'profile1',
        'profile2',
        'profile3',
        'profile4',
        'profile5',
        'profile6',
    ],
    pidNames: [
        'ROLL',
        'PITCH',
        'YAW',
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
            .then(() => MSP.promise(MSPCodes.MSP_PID))
            .then(() => MSP.promise(MSPCodes.MSP_PID_ADVANCED))
            .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_PID, mspHelper.crunch(MSPCodes.MSP_SET_PID)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_PID_ADVANCED, mspHelper.crunch(MSPCodes.MSP_SET_PID_ADVANCED)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_GOVERNOR, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR)))
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

        self.pidNames.forEach(function(elementPid, indexPid) {
            const searchRow = $('.tab-profiles .' + elementPid + ' .pid_data input');
            searchRow.each(function (indexInput) {
                $(this).val(FC.PIDS[indexPid][indexInput]);
            });
        });

        // I-term limits
        $('.tab-profiles input[id="itermLimitRoll"]').val(FC.PID_PROFILE.itermLimitRoll / 5).change();
        $('.tab-profiles input[id="itermLimitPitch"]').val(FC.PID_PROFILE.itermLimitPitch / 5).change();
        $('.tab-profiles input[id="itermLimitYaw"]').val(FC.PID_PROFILE.itermLimitYaw / 5).change();

        const itermLimitCheck = $('.tab-profiles input[id="itermLimit"]');

        itermLimitCheck.change(function() {
            const checked = $(this).is(':checked');
            $('.tab-profiles .itermlimit .suboption').toggle(checked);
        });

        itermLimitCheck.prop('checked', FC.PID_PROFILE.itermLimitRoll < 1000 || FC.PID_PROFILE.itermLimitPitch < 1000 || FC.PID_PROFILE.itermLimitYaw < 1000).change();

        // I-term decay
        $('.tab-profiles input[id="itermDecayTime"]').val(FC.PID_PROFILE.itermDecay / 10);

        const itermDecayCheck = $('.tab-profiles input[id="itermDecay"]');

        itermDecayCheck.change(function() {
            const checked = $(this).is(':checked');
            $('.tab-profiles .itermdecay .suboption').toggle(checked);
            $('.tab-profiles .itermdecay .subhelp').toggle(checked);
        });

        itermDecayCheck.prop('checked', FC.PID_PROFILE.itermDecay > 0).change();

        // I-term rotation
        $('.tab-profiles input[id="itermRotation"]').prop('checked', FC.PID_PROFILE.itermRotation !== 0);

        // I-term relax
        $('.tab-profiles select[id="itermRelaxAxes"]').val(FC.PID_PROFILE.itermRelax > 0 ? FC.PID_PROFILE.itermRelax : 1);
        $('.tab-profiles select[id="itermRelaxType"]').val(FC.PID_PROFILE.itermRelaxType);
        $('.tab-profiles input[id="itermRelaxCutoffRoll"]').val(FC.PID_PROFILE.itermRelaxCutoffRoll);
        $('.tab-profiles input[id="itermRelaxCutoffPitch"]').val(FC.PID_PROFILE.itermRelaxCutoffPitch);
        $('.tab-profiles input[id="itermRelaxCutoffYaw"]').val(FC.PID_PROFILE.itermRelaxCutoffYaw);

        const itermRelaxCheck = $('.tab-profiles input[id="itermRelax"]');

        itermRelaxCheck.change(function() {
            const checked = $(this).is(':checked');
            $('.tab-profiles .itermrelax .suboption').toggle(checked);
            $('.tab-profiles .itermrelax .subhelp').toggle(checked);
        });

        itermRelaxCheck.prop('checked', FC.PID_PROFILE.itermRelax !== 0).change();

        // Normalization
        $('.tab-profiles select[id="cyclicNormalization"]').val(FC.PID_PROFILE.cyclicNormalization);
        $('.tab-profiles select[id="collectiveNormalization"]').val(FC.PID_PROFILE.collectiveNormalization);

        // Yaw settings
        $('.tab-profiles input[id="yawCenterOffset"]').val(FC.PID_PROFILE.yawCenterOffset);
        $('.tab-profiles input[id="yawStopGainCW"]').val(FC.PID_PROFILE.yawStopGainCW);
        $('.tab-profiles input[id="yawStopGainCCW"]').val(FC.PID_PROFILE.yawStopGainCCW);
        $('.tab-profiles input[id="yawFFCyclicGain"]').val(FC.PID_PROFILE.yawFFCyclicGain);
        $('.tab-profiles input[id="yawFFCollectiveGain"]').val(FC.PID_PROFILE.yawFFCollectiveGain);
        $('.tab-profiles input[id="yawFFImpulseGain"]').val(FC.PID_PROFILE.yawFFImpulseGain);

        // Acro Trainer
        $('.tab-profiles input[id="acroTrainerGain"]').val(FC.PID_PROFILE.acroTrainerGain).trigger('input');
        $('.tab-profiles input[id="acroTrainerLimit"]').val(FC.PID_PROFILE.acroTrainerLimit).trigger('input');

        // Angle mode
        $('.tab-profiles input[id="angleModeGain"]').val(FC.PID_PROFILE.levelAngleStrength);
        $('.tab-profiles input[id="angleModeLimit"]').val(FC.PID_PROFILE.levelAngleLimit);

        // Horizon mode
        $('.tab-profiles input[id="horizonModeGain"]').val(FC.PID_PROFILE.horizonLevelStrength);

        // Rescue settings
        $('.tab-profiles input[id="rescueCollective"]').val(FC.PID_PROFILE.rescueCollective);
        $('.tab-profiles input[id="rescueBoost"]').val(FC.PID_PROFILE.rescueBoost);
        $('.tab-profiles input[id="rescueDelay"]').val(FC.PID_PROFILE.rescueDelay / 10).change();

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
        $('.tab-profiles input[id="govCyclicPrecomp"]').val(FC.GOVERNOR.gov_cyclic_ff_weight);
        $('.tab-profiles input[id="govCollectivePrecomp"]').val(FC.GOVERNOR.gov_collective_ff_weight);

        $('.tab-profiles .govTTAGain').toggle(self.isTTAEnabled);
        $('.tab-profiles .govTTALimit').toggle(self.isTTAEnabled);
        $('.tab-profiles .gov_config').toggle(self.isGovEnabled);
    }

    function form_to_data() {

        self.pidNames.forEach(function(elementPid, indexPid) {
            const searchRow = $('.tab-profiles .' + elementPid + ' input');
            searchRow.each(function (indexInput) {
                if ($(this).val()) {
                    FC.PIDS[indexPid][indexInput] = parseFloat($(this).val());
                }
            });
        });

        if ($('.tab-profiles input[id="itermLimit"]').is(':checked')) {
            FC.PID_PROFILE.itermLimitRoll = $('.tab-profiles input[id="itermLimitRoll"]').val() * 5;
            FC.PID_PROFILE.itermLimitPitch = $('.tab-profiles input[id="itermLimitPitch"]').val() * 5;
            FC.PID_PROFILE.itermLimitYaw = $('.tab-profiles input[id="itermLimitYaw"]').val() * 5;
        }
        else {
            FC.PID_PROFILE.itermLimitRoll = 1000;
            FC.PID_PROFILE.itermLimitPitch = 1000;
            FC.PID_PROFILE.itermLimitYaw = 1000;
        }

        FC.PID_PROFILE.itermDecay = $('.tab-profiles input[id="itermDecay"]').is(':checked') ? $('.tab-profiles input[id="itermDecayTime"]').val() * 10 : 0;
        FC.PID_PROFILE.itermRotation = $('.tab-profiles input[id="itermRotation"]').is(':checked') ? 1 : 0;
        FC.PID_PROFILE.itermRelax = $('.tab-profiles input[id="itermRelax"]').is(':checked') ? $('.tab-profiles select[id="itermRelaxAxes"]').val() : 0;
        FC.PID_PROFILE.itermRelaxType = $('.tab-profiles select[id="itermRelaxType"]').val();
        FC.PID_PROFILE.itermRelaxCutoffRoll = parseInt($('.tab-profiles input[id="itermRelaxCutoffRoll"]').val());
        FC.PID_PROFILE.itermRelaxCutoffPitch = parseInt($('.tab-profiles input[id="itermRelaxCutoffPitch"]').val());
        FC.PID_PROFILE.itermRelaxCutoffYaw = parseInt($('.tab-profiles input[id="itermRelaxCutoffYaw"]').val());

        FC.PID_PROFILE.cyclicNormalization = $('.tab-profiles select[id="cyclicNormalization"]').val();
        FC.PID_PROFILE.collectiveNormalization = $('.tab-profiles select[id="collectiveNormalization"]').val();

        FC.PID_PROFILE.acroTrainerGain = $('.tab-profiles input[id="acroTrainerGain"]').val();
        FC.PID_PROFILE.acroTrainerLimit = $('.tab-profiles input[id="acroTrainerLimit"]').val();

        FC.PID_PROFILE.levelAngleStrength = parseInt($('.tab-profiles input[id="angleModeGain"]').val());
        FC.PID_PROFILE.levelAngleLimit = parseInt($('.tab-profiles input[id="angleModeLimit"]').val());

        FC.PID_PROFILE.horizonLevelStrength = parseInt($('.tab-profiles input[id="horizonModeGain"]').val());

        FC.PID_PROFILE.rescueCollective = $('.tab-profiles input[id="rescueCollective"]').val();
        FC.PID_PROFILE.rescueBoost = $('.tab-profiles input[id="rescueBoost"]').val();
        FC.PID_PROFILE.rescueDelay = $('.tab-profiles input[id="rescueDelay"]').val() * 10;

        FC.PID_PROFILE.yawCenterOffset = $('.tab-profiles input[id="yawCenterOffset"]').val();
        FC.PID_PROFILE.yawStopGainCW = $('.tab-profiles input[id="yawStopGainCW"]').val();
        FC.PID_PROFILE.yawStopGainCCW = $('.tab-profiles input[id="yawStopGainCCW"]').val();
        FC.PID_PROFILE.yawFFCyclicGain = $('.tab-profiles input[id="yawFFCyclicGain"]').val();
        FC.PID_PROFILE.yawFFCollectiveGain = $('.tab-profiles input[id="yawFFCollectiveGain"]').val();
        FC.PID_PROFILE.yawFFImpulseGain = $('.tab-profiles input[id="yawFFImpulseGain"]').val();

        if (self.isTTAEnabled) {
            FC.GOVERNOR.gov_tta_gain = parseInt($('.tab-profiles input[id="govTTAGain"]').val());
            FC.GOVERNOR.gov_tta_limit = parseInt($('.tab-profiles input[id="govTTALimit"]').val());
        }

        if (self.isGovEnabled) {
            FC.GOVERNOR.gov_headspeed = parseInt($('.tab-profiles input[id="govHeadspeed"]').val());
            FC.GOVERNOR.gov_gain = parseInt($('.tab-profiles input[id="govMasterGain"]').val());
            FC.GOVERNOR.gov_p_gain = parseInt($('.tab-profiles input[id="govPGain"]').val());
            FC.GOVERNOR.gov_i_gain = parseInt($('.tab-profiles input[id="govIGain"]').val());
            FC.GOVERNOR.gov_d_gain = parseInt($('.tab-profiles input[id="govDGain"]').val());
            FC.GOVERNOR.gov_f_gain = parseInt($('.tab-profiles input[id="govFGain"]').val());
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

        function resetProfile() {
            MSP.promise(MSPCodes.MSP_SET_RESET_CURR_PID)
                .then(function () {
                    GUI.log(i18n.getMessage('profilesResetProfile'));
                    GUI.tab_switch_reload();
                });
        }

        self.tabNames.forEach(function(element, index) {
            $('.tab-profiles .tab-container .' + element).on('click', () => GUI.tab_switch_allowed(() => activateProfile(index)));
            $('.tab-profiles .tab-container .' + element).toggle(index < FC.CONFIG.numProfiles);
        });

        $('#resetProfile').on('click', resetProfile);

        const dialogCopyProfile = $('.dialogCopyProfile')[0];
        const selectProfile = $('.selectProfile');

        $.each(self.tabNames, function(key, value) {
            if (key != FC.CONFIG.profile)
                selectProfile.append(new Option(value, key));
        });

        $('.copyprofilebtn').click(function() {
            $('.dialogCopyProfile').find('.contentProfile').show();
            dialogCopyProfile.showModal();
        });

        $('.dialogCopyProfile-cancelbtn').click(function() {
            dialogCopyProfile.close();
        });

        $('.dialogCopyProfile-confirmbtn').click(function() {
            FC.COPY_PROFILE.type = 0;
            FC.COPY_PROFILE.dstProfile = parseInt(selectProfile.val());
            FC.COPY_PROFILE.srcProfile = FC.CONFIG.profile;

            MSP.send_message(MSPCodes.MSP_COPY_PROFILE, mspHelper.crunch(MSPCodes.MSP_COPY_PROFILE), false, function () {
                dialogCopyProfile.close();
            });
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

        const dialogProfileChange = $('.dialogProfileChange')[0];

        $('.dialogProfileChangeConfirmBtn').click(function() {
            dialogProfileChange.close();
            GUI.tab_switch_reload();
            GUI.log(i18n.getMessage('profilesActivateProfile', [FC.CONFIG.profile + 1]));
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

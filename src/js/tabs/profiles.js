'use strict';

TABS.profiles = {
    updating: true,
    currentProfile: null,
    activeSubtab: null,
    isGovEnabled: false,
    tabNames: [ 'profile1', 'profile2', 'profile3', 'profile4', 'profile5', 'profile6' ],
    pidNames: [ 'ROLL', 'PITCH', 'YAW' ],
};

TABS.profiles.initialize = function (callback) {

    const self = this;

    if (GUI.active_tab !== 'profiles') {
        GUI.active_tab = 'profiles';
    }

    MSP.promise(MSPCodes.MSP_STATUS)
        .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_PID))
        .then(() => MSP.promise(MSPCodes.MSP_PID_ADVANCED))
        .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR))
        .then(() => load_html());

    function load_html() {
        $('#content').load("./tabs/profiles.html", process_html);
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

        // Acro Trainer
        $('input[id="acroTrainerAngleLimit"]').val(FC.PID_PROFILE.acroTrainerAngleLimit).trigger('input');

        // Angle mode
        $('.tab-profiles input[id="levelAngleLimit"]').val(FC.PID_PROFILE.levelAngleLimit);

        // I-term rotation
        $('.tab-profiles input[id="itermRotation"]').prop('checked', FC.PID_PROFILE.itermRotation !== 0);

        // I-term relax
        $('.tab-profiles select[id="itermRelaxAxes"]').val(FC.PID_PROFILE.itermRelax > 0 ? FC.PID_PROFILE.itermRelax : 1);
        $('.tab-profiles select[id="itermRelaxType"]').val(FC.PID_PROFILE.itermRelaxType);
        $('.tab-profiles input[id="itermRelaxCutoff"]').val(FC.PID_PROFILE.itermRelaxCutoff);

        const itermRelaxCheck = $('.tab-profiles input[id="itermRelax"]');

        itermRelaxCheck.prop('checked', FC.PID_PROFILE.itermRelax !== 0);

        itermRelaxCheck.change(function() {
            const checked = $(this).is(':checked');
            if (checked) {
                $('.tab-profiles .itermrelax .suboption').show();
                $('.tab-profiles .itermrelaxcutoff').show();
            } else {
                $('.tab-profiles .itermrelax .suboption').hide();
            }
        });

        itermRelaxCheck.change();

        self.isGovEnabled = FC.FEATURE_CONFIG.features.isEnabled('GOVERNOR') && (FC.GOVERNOR.gov_mode > 1);

        if (self.isGovEnabled) {
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

            $('.tab-profiles .gov_config').show();
        }
        else {
            $('.tab-profiles .gov_config').hide();
        }

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

        FC.PID_PROFILE.acroTrainerAngleLimit = $('.tab-profiles input[id="acroTrainerAngleLimit"]').val();

        FC.PID_PROFILE.levelAngleLimit = parseInt($('.tab-profiles input[id="levelAngleLimit"]').val());

        FC.PID_PROFILE.itermRotation = $('.tab-profiles input[id="itermRotation"]').is(':checked') ? 1 : 0;
        FC.PID_PROFILE.itermRelax = $('.tab-profiles input[id="itermRelax"]').is(':checked') ? $('.tab-profiles select[id="itermRelaxAxes"]').val() : 0;
        FC.PID_PROFILE.itermRelaxType = $('.tab-profiles select[id="itermRelaxType"]').val();
        FC.PID_PROFILE.itermRelaxCutoff = parseInt($('.tab-profiles input[id="itermRelaxCutoff"]').val());

        if (self.isGovEnabled) {
            FC.GOVERNOR.gov_headspeed = parseInt($('.tab-profiles input[id="govHeadspeed"]').val());
            FC.GOVERNOR.gov_gain = parseInt($('.tab-profiles input[id="govMasterGain"]').val());
            FC.GOVERNOR.gov_p_gain = parseInt($('.tab-profiles input[id="govPGain"]').val());
            FC.GOVERNOR.gov_i_gain = parseInt($('.tab-profiles input[id="govIGain"]').val());
            FC.GOVERNOR.gov_d_gain = parseInt($('.tab-profiles input[id="govDGain"]').val());
            FC.GOVERNOR.gov_f_gain = parseInt($('.tab-profiles input[id="govFGain"]').val());
            FC.GOVERNOR.gov_tta_gain = parseInt($('.tab-profiles input[id="govTTAGain"]').val());
            FC.GOVERNOR.gov_tta_limit = parseInt($('.tab-profiles input[id="govTTALimit"]').val());
            FC.GOVERNOR.gov_cyclic_ff_weight = parseInt($('.tab-profiles input[id="govCyclicPrecomp"]').val());
            FC.GOVERNOR.gov_collective_ff_weight = parseInt($('.tab-profiles \input[id="govCollectivePrecomp"]').val());
        }
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        data_to_form();

        function activateProfile(profile) {
            FC.CONFIG.profile = profile;
            self.updating = true;
            MSP.promise(MSPCodes.MSP_SELECT_SETTING, [profile]).then(function () {
                self.refresh(function () {
                    self.updating = false;
                    GUI.log(i18n.getMessage('profilesActivateProfile', [profile + 1]));
                });
            });
        }

        function resetProfile() {
            self.updating = true;
            MSP.promise(MSPCodes.MSP_SET_RESET_CURR_PID).then(function () {
                self.refresh(function () {
                    self.updating = false;
                    GUI.log(i18n.getMessage('profilesResetProfile'));
                });
            });
        }


        // UI Hooks

        self.tabNames.forEach(function(element, index) {
            $('.tab-profiles .tab-container .' + element).on('click', () => activateProfile(index));
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

        $('a.refresh').click(function () {
            self.refresh(function () {
                GUI.log(i18n.getMessage('profilesDataRefreshed'));
            });
        });

        // update == save.
        $('a.update').click(function () {
            form_to_data();
            self.updating = true;
            Promise.resolve(true)
                .then(() => MSP.promise(MSPCodes.MSP_SET_PID, mspHelper.crunch(MSPCodes.MSP_SET_PID)))
                .then(() => MSP.promise(MSPCodes.MSP_SET_PID_ADVANCED, mspHelper.crunch(MSPCodes.MSP_SET_PID_ADVANCED)))
                .then(() => MSP.promise(MSPCodes.MSP_SET_GOVERNOR, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR)))
                .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
                .then(() => {
                    self.updating = false;
                    self.refresh(() => { GUI.log(i18n.getMessage('profilesEepromSaved')); });
                });
        });

        self.updating = false;

        GUI.content_ready(callback);
    }
};


TABS.profiles.cleanup = function (callback) {
    const self = this;

    if (callback) callback();
};

TABS.profiles.refresh = function (callback) {
    const self = this;

    GUI.tab_switch_cleanup(function () {
        self.initialize();
        if (callback) callback();
    });
};


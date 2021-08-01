'use strict';

TABS.profiles = {
    updating: true,
    currentProfile: null,
    activeSubtab: null,
    tabNames: [ 'profile1', 'profile2', 'profile3', 'profile4', 'profile5', 'profile6' ],
    pidNames: [ 'ROLL', 'PITCH', 'YAW' ],
};

TABS.profiles.initialize = function (callback) {

    const self = this;

    if (GUI.active_tab !== 'profiles') {
        GUI.active_tab = 'profiles';
    }

    MSP.promise(MSPCodes.MSP_STATUS).then(function() {
        return MSP.promise(MSPCodes.MSP_PID);
    }).then(function() {
        return MSP.promise(MSPCodes.MSP_PID_ADVANCED);
    }).then(function() {
        load_html();
    });

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
                if (FC.PIDS[indexPid][indexInput] !== undefined) {
                    $(this).val(FC.PIDS[indexPid][indexInput]);
                }
            });
        });

        // Feedforward
        $('.tab-profiles .ROLL .pid_data input[name="f"]').val(FC.ADVANCED_TUNING.feedforwardRoll);
        $('.tab-profiles .PITCH .pid_data input[name="f"]').val(FC.ADVANCED_TUNING.feedforwardPitch);
        $('.tab-profiles .YAW .pid_data input[name="f"]').val(FC.ADVANCED_TUNING.feedforwardYaw);

        // Angle mode
        $('.tab-profiles input[name="angleLimit"]').val(FC.ADVANCED_TUNING.levelAngleLimit);

        // I-term rotation
        $('input[id="itermrotation"]').prop('checked', FC.ADVANCED_TUNING.itermRotation !== 0);

        // I-term relax
        $('select[id="itermrelaxAxes"]').val(FC.ADVANCED_TUNING.itermRelax > 0 ? FC.ADVANCED_TUNING.itermRelax : 1);
        $('select[id="itermrelaxType"]').val(FC.ADVANCED_TUNING.itermRelaxType);
        $('.itermrelax input[name="itermRelaxCutoff"]').val(FC.ADVANCED_TUNING.itermRelaxCutoff);

        const itermRelaxCheck = $('input[id="itermrelax"]');

        itermRelaxCheck.prop('checked', FC.ADVANCED_TUNING.itermRelax !== 0);

        itermRelaxCheck.change(function() {
            const checked = $(this).is(':checked');
            if (checked) {
                $('.itermrelax .suboption').show();
                $('.itermRelaxCutoff').show();
            } else {
                $('.itermrelax .suboption').hide();
            }
        });

        itermRelaxCheck.change();

        // Absolute Control
        const absoluteControlGainNumberElement = $('input[name="absoluteControlGain-number"]');
        absoluteControlGainNumberElement.val(FC.ADVANCED_TUNING.absoluteControlGain).trigger('input');

        // Acro Trainer
        const acroTrainerAngleLimitNumberElement = $('input[name="acroTrainerAngleLimit-number"]');
        acroTrainerAngleLimitNumberElement.val(FC.ADVANCED_TUNING.acroTrainerAngleLimit).trigger('input');

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

        FC.ADVANCED_TUNING.levelAngleLimit = parseInt($('.tab-profiles input[name="angleLimit"]').val());

        FC.ADVANCED_TUNING.itermRotation = $('input[id="itermrotation"]').is(':checked') ? 1 : 0;
        FC.ADVANCED_TUNING.itermRelax = $('input[id="itermrelax"]').is(':checked') ? $('select[id="itermrelaxAxes"]').val() : 0;
        FC.ADVANCED_TUNING.itermRelaxType = $('select[id="itermrelaxType"]').val();
        FC.ADVANCED_TUNING.itermRelaxCutoff = parseInt($('input[name="itermRelaxCutoff"]').val());

        FC.ADVANCED_TUNING.absoluteControlGain = $('input[name="absoluteControlGain-number"]').val();

        FC.ADVANCED_TUNING.acroTrainerAngleLimit = $('input[name="acroTrainerAngleLimit-number"]').val();

        FC.ADVANCED_TUNING.feedforwardRoll  = parseInt($('.tab-profiles .ROLL .pid_data input[name="f"]').val());
        FC.ADVANCED_TUNING.feedforwardPitch = parseInt($('.tab-profiles .PITCH .pid_data input[name="f"]').val());
        FC.ADVANCED_TUNING.feedforwardYaw   = parseInt($('.tab-profiles .YAW .pid_data input[name="f"]').val());
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
            if (index < FC.CONFIG.numProfiles)
                $('.tab-profiles .tab-container .' + element).show();
            else
                $('.tab-profiles .tab-container .' + element).hide();
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
            .then(function () {
                return MSP.promise(MSPCodes.MSP_SET_PID, mspHelper.crunch(MSPCodes.MSP_SET_PID));
            }).then(function () {
              return MSP.promise(MSPCodes.MSP_SET_PID_ADVANCED, mspHelper.crunch(MSPCodes.MSP_SET_PID_ADVANCED));
            }).then(function () {
                return MSP.promise(MSPCodes.MSP_SET_RC_TUNING, mspHelper.crunch(MSPCodes.MSP_SET_RC_TUNING));
            }).then(function () {
                return MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
            }).then(function () {
                self.updating = false;
                self.refresh(function () {
                    GUI.log(i18n.getMessage('profilesEepromSaved'));
                });
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

        if (callback) {
            callback();
        }
    });
};


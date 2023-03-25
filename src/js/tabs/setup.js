'use strict';

TABS.setup = {};

TABS.setup.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_ARMING_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG))
            .then(callback);
    }

    function load_html() {
        $('#content').load("./tabs/setup.html", process_html);
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // saving and uploading an imaginary config to hardware is a bad idea
        if (CONFIGURATOR.virtualMode) {
            $('a.backupSettings').addClass('disabled');
        }

        // check if we have accelerometer and magnetometer
        if (!have_sensor(FC.CONFIG.activeSensors, 'acc')) {
            $('a.calibrateAccel').addClass('disabled');
            $('default_btn').addClass('disabled');
        }

        if (!have_sensor(FC.CONFIG.activeSensors, 'mag')) {
            $('a.calibrateMag').addClass('disabled');
            $('default_btn').addClass('disabled');
        }

        $('a.rebootBootloader').click(function () {
            MSP.send_message(MSPCodes.MSP_SET_REBOOT, [ mspHelper.REBOOT_TYPES.BOOTLOADER ], false);
        });

        // UI Hooks
        $('a.calibrateAccel').click(function () {
            const _self = $(this);

            if (!_self.hasClass('calibrating')) {
                _self.addClass('calibrating');

                // During this period MCU won't be able to process any serial commands because its locked in a for/while loop
                // until this operation finishes, sending more commands through data_poll() will result in serial buffer overflow
                GUI.interval_pause('setup_data_pull');

                MSP.send_message(MSPCodes.MSP_ACC_CALIBRATION, false, false, function () {
                    GUI.log(i18n.getMessage('initialSetupAccelCalibStarted'));
                    $('#accel_calib_running').show();
                    $('#accel_calib_rest').hide();
                });

                GUI.timeout_add('button_reset', function () {
                    GUI.interval_resume('setup_data_pull');
                    GUI.log(i18n.getMessage('initialSetupAccelCalibEnded'));
                    _self.removeClass('calibrating');
                    $('#accel_calib_running').hide();
                    $('#accel_calib_rest').show();
                }, 2000);
            }
        });

        $('a.calibrateMag').click(function () {
            const _self = $(this);

            if (!_self.hasClass('calibrating') && !_self.hasClass('disabled')) {
                _self.addClass('calibrating');

                MSP.send_message(MSPCodes.MSP_MAG_CALIBRATION, false, false, function () {
                    GUI.log(i18n.getMessage('initialSetupMagCalibStarted'));
                    $('#mag_calib_running').show();
                    $('#mag_calib_rest').hide();
                });

                GUI.timeout_add('button_reset', function () {
                    GUI.log(i18n.getMessage('initialSetupMagCalibEnded'));
                    _self.removeClass('calibrating');
                    $('#mag_calib_running').hide();
                    $('#mag_calib_rest').show();
                }, 30000);
            }
        });

        const dialogConfirmReset = $('.dialogConfirmReset')[0];

        $('a.resetSettings').click(function () {
            dialogConfirmReset.showModal();
        });

        $('.dialogConfirmReset-cancelbtn').click(function() {
            dialogConfirmReset.close();
        });

        $('.dialogConfirmReset-confirmbtn').click(function() {
            dialogConfirmReset.close();
            MSP.send_message(MSPCodes.MSP_RESET_CONF, false, false, function () {
                GUI.log(i18n.getMessage('initialSetupSettingsRestored'));
                GUI.tab_switch_reload();
            });
        });

        $('a.saveSettings').click(function () {
            MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                GUI.log(i18n.getMessage('initialSetupSettingsSaved'));
                GUI.tab_switch_reload();
            });
        });

        const dialogConfirmArming = $('.dialogConfirmArming')[0];
        const enableArmingSwitch = $('input[id="initialSetupEnableArming"]');

        enableArmingSwitch.prop('checked', !FC.CONFIG.armingDisabled);

        enableArmingSwitch.change(function () {
            if (enableArmingSwitch.prop('checked')) {
                dialogConfirmArming.showModal();
            }
            else {
                mspHelper.setArmingEnabled(false);
            }
        });

        $('.dialogConfirmArming-cancelbtn').click(function() {
            dialogConfirmArming.close();
            enableArmingSwitch.prop('checked', false).change();
        });

        $('.dialogConfirmArming-confirmbtn').click(function() {
            dialogConfirmArming.close();
            mspHelper.setArmingEnabled(true);
        });

        $('a.backupSettings').click(function () {
            if ($(this).hasClass('disabled')) {
                return;
            }

            configuration_backup(function () {
                GUI.log(i18n.getMessage('initialSetupBackupSuccess'));
            });
        });

        $('a.restoreSettings').click(function () {
            if ($(this).hasClass('disabled')) {
                return;
            }

            configuration_restore(function () {
                GUI.log(i18n.getMessage('initialSetupRestoreSuccess'));
                GUI.tab_switch_reload();
            });
        });

        $('a.rebootMsc').click(function () {
            // Reboot into MSC using UTC time offset instead of user timezone
            // Linux seems to expect that the FAT file system timestamps are UTC based
            const code = (GUI.operating_system === "Linux") ?
                mspHelper.REBOOT_TYPES.MSC_UTC :
                mspHelper.REBOOT_TYPES.MSC ;
                MSP.send_message(MSPCodes.MSP_SET_REBOOT, [ code ], false);
        });

        $('a.rebootFirmware').click(function () {
            GUI.log(i18n.getMessage('deviceRebooting'));
            MSP.send_message(MSPCodes.MSP_SET_REBOOT, [ mspHelper.REBOOT_TYPES.FIRMWARE ], false);
            reinitialiseConnection();
        });

        GUI.content_ready(callback);
    }
};

TABS.setup.cleanup = function (callback) {
    if (callback) callback();
};

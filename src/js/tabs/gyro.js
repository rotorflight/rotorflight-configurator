'use strict';

TABS.gyro = {
    isDirty: false,
    rpmFilterDirty: false,
    FILTER_TYPE_NAMES: [
        { id: 1, name: "1ˢᵗ order", visible: true },
        { id: 2, name: "2ⁿᵈ order", visible: true },
        { id: 3, name: "PT1", visible: false },
        { id: 4, name: "PT2", visible: false },
        { id: 5, name: "PT3", visible: false },
        { id: 6, name: "Order1", visible: false },
        { id: 7, name: "Butter", visible: false },
        { id: 8, name: "Bessel", visible: false },
        { id: 9, name: "Damped", visible: false },
    ],
    RPM_FILTER_TYPES: [
        { id: 1, name: "SINGLE", visible: true },
        { id: 2, name: "DOUBLE", visible: true },
    ],
};

TABS.gyro.initialize = function (callback) {
    const self = this;

    const FILTER_DEFAULT = FC.getFilterDefaults();

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/gyro.html", process_html);
    }

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_FILTER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MOTOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RPM_FILTER))
            .then(callback);
    }

    function save_data(callback) {
        function save_rpm_filter() {
            if (self.rpmFilterDirty)
                mspHelper.sendRPMFilters(save_gyro_filter);
            else
                save_gyro_filter();
        }
        function save_gyro_filter() {
            Promise.resolve(true)
                .then(() => MSP.promise(MSPCodes.MSP_SET_FILTER_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FILTER_CONFIG)))
                .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
                .then(() => {
                    GUI.log(i18n.getMessage('eepromSaved'));
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                    GUI.log(i18n.getMessage('deviceRebooting'));
                    reinitialiseConnection(callback);
                });
        }
        save_rpm_filter();
    };

    function data_to_form() {

        function populateSelectorClass(name, values) {
            $('select.' + name).each(function () {
                const select = $(this);
                values.forEach(function(iter) {
                    if (iter.visible)
                        select.append('<option value="' + iter.id + '">' + iter.name + '</option>');
                });
            });
        }

        function populateSelectorName(name, values, current) {
            const select = $(`select[name="${name}"]`);
            values.forEach(function(iter) {
                if (iter.visible || current == iter.id)
                    select.append('<option value="' + iter.id + '">' + iter.name + '</option>');
            });
            select.val(current);
        }

        populateSelectorName('gyroLowpassType', self.FILTER_TYPE_NAMES, FC.FILTER_CONFIG.gyro_lowpass_type);

        $('input[name="gyroLowpassFrequency"]').val(FC.FILTER_CONFIG.gyro_lowpass_hz);
        $('input[name="gyroLowpassDynMinFrequency"]').val(FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz);
        $('input[name="gyroLowpassDynMaxFrequency"]').val(FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz);

        populateSelectorName('gyroLowpass2Type', self.FILTER_TYPE_NAMES, FC.FILTER_CONFIG.gyro_lowpass2_type);
        $('input[name="gyroLowpass2Frequency"]').val(FC.FILTER_CONFIG.gyro_lowpass2_hz);

        $('input[name="gyroNotch1Frequency"]').val(FC.FILTER_CONFIG.gyro_notch_hz);
        $('input[name="gyroNotch1Cutoff"]').val(FC.FILTER_CONFIG.gyro_notch_cutoff);
        $('input[name="gyroNotch2Frequency"]').val(FC.FILTER_CONFIG.gyro_notch2_hz);
        $('input[name="gyroNotch2Cutoff"]').val(FC.FILTER_CONFIG.gyro_notch2_cutoff);

        $('input[name="dynamicNotchWidthPercent"]').val(FC.FILTER_CONFIG.dyn_notch_width_percent);
        $('input[name="dynamicNotchQ"]').val(FC.FILTER_CONFIG.dyn_notch_q);
        $('input[name="dynamicNotchMinHz"]').val(FC.FILTER_CONFIG.dyn_notch_min_hz);
        $('input[name="dynamicNotchMaxHz"]').val(FC.FILTER_CONFIG.dyn_notch_max_hz);

        $('.dynamicNotch').toggle( FC.FEATURE_CONFIG.features.isEnabled('DYNAMIC_FILTER') );

        $('input[id="gyroLowpassEnabled"]').change(function() {
            const checked = $(this).is(':checked');
            let type = 0, freq = 0;

            if (checked) {
                type = (FC.FILTER_CONFIG.gyro_lowpass_type) ?
                    FC.FILTER_CONFIG.gyro_lowpass_type:
                    FILTER_DEFAULT.gyro_lowpass_type;
                freq = (FC.FILTER_CONFIG.gyro_lowpass_hz > 0) ?
                    FC.FILTER_CONFIG.gyro_lowpass_hz:
                    FILTER_DEFAULT.gyro_lowpass_hz;
            }

            $('select[name="gyroLowpassType"]').val(type).attr('disabled', !checked);
            $('input[name="gyroLowpassFrequency"]').val(freq).attr('disabled', !checked);

            if (!checked) {
                $('input[id="gyroLowpassDynEnabled"]').prop('checked', false).change();
            }
        });

        $('input[id="gyroLowpassDynEnabled"]').change(function() {
            const checked = $(this).is(':checked');
            let minf = 0, maxf = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz > 0 &&
                    FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz < FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz) {
                    minf = FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz;
                    maxf = FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz;
                } else {
                    minf = FILTER_DEFAULT.gyro_lowpass_dyn_min_hz;
                    maxf = FILTER_DEFAULT.gyro_lowpass_dyn_max_hz;
                }
            }

            $('input[name="gyroLowpassDynMinFrequency"]').val(minf).attr('disabled', !checked);
            $('input[name="gyroLowpassDynMaxFrequency"]').val(maxf).attr('disabled', !checked);
        });

        $('input[id="gyroLowpass2Enabled"]').change(function() {
            const checked = $(this).is(':checked');
            let type = 0, freq = 0;

            if (checked) {
                type = (FC.FILTER_CONFIG.gyro_lowpass2_type) ?
                    FC.FILTER_CONFIG.gyro_lowpass2_type:
                    FILTER_DEFAULT.gyro_lowpass2_type;
                freq = (FC.FILTER_CONFIG.gyro_lowpass2_hz > 0) ?
                    FC.FILTER_CONFIG.gyro_lowpass2_hz:
                    FILTER_DEFAULT.gyro_lowpass2_hz;
            }

            $('select[name="gyroLowpass2Type"]').val(type).attr('disabled', !checked);
            $('input[name="gyroLowpass2Frequency"]').val(freq).attr('disabled', !checked);
        });

        $('input[id="gyroNotch1Enabled"]').change(function() {
            const checked = $(this).is(':checked');
            let freq = 0, cutf = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.gyro_notch_hz > 0) {
                    freq = FC.FILTER_CONFIG.gyro_notch_hz;
                    cutf = FC.FILTER_CONFIG.gyro_notch_cutoff;
                } else {
                    freq = FILTER_DEFAULT.gyro_notch_hz;
                    cutf = FILTER_DEFAULT.gyro_notch_cutoff;
                }
            }

            $('input[name="gyroNotch1Frequency"]').val(freq).attr('disabled', !checked).change();
            $('input[name="gyroNotch1Cutoff"]').val(cutf).attr('disabled', !checked).change();
        });

        $('input[id="gyroNotch2Enabled"]').change(function() {
            const checked = $(this).is(':checked');
            let freq = 0, cutf = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.gyro_notch2_hz > 0) {
                    freq = FC.FILTER_CONFIG.gyro_notch2_hz;
                    cutf = FC.FILTER_CONFIG.gyro_notch2_cutoff;
                } else {
                    freq = FILTER_DEFAULT.gyro_notch2_hz;
                    cutf = FILTER_DEFAULT.gyro_notch2_cutoff;
                }
            }

            $('input[name="gyroNotch2Frequency"]').val(freq).attr('disabled', !checked).change();
            $('input[name="gyroNotch2Cutoff"]').val(cutf).attr('disabled', !checked).change();
        });

        // The notch cutoff must be smaller than the notch frequency
        function adjustGyroNotch(fName) {
            const freq = parseInt($(`input[name='${fName}Frequency']`).val());
            const cutf = parseInt($(`input[name='${fName}Cutoff']`).val());
            const maxf = (freq > 0) ? freq - 1 : 0;
            if (cutf >= freq)
                $(`input[name='${fName}Cutoff']`).val(maxf);
            $(`input[name='${fName}Cutoff']`).attr("max", maxf);
        }

        $('input[name="gyroNotch1Frequency"]').change(function() {
            adjustGyroNotch("gyroNotch1");
        }).change();

        $('input[name="gyroNotch2Frequency"]').change(function() {
            adjustGyroNotch("gyroNotch2");
        }).change();

        $('input[id="gyroLowpassEnabled"]').prop('checked', FC.FILTER_CONFIG.gyro_lowpass_type != 0).change();
        $('input[id="gyroLowpassDynEnabled"]').prop('checked', FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz > 0 &&
            FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz < FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz).change();

        $('input[id="gyroLowpass2Enabled"]').prop('checked', FC.FILTER_CONFIG.gyro_lowpass2_type != 0).change();

        $('input[id="gyroNotch1Enabled"]').prop('checked', FC.FILTER_CONFIG.gyro_notch_hz != 0).change();
        $('input[id="gyroNotch2Enabled"]').prop('checked', FC.FILTER_CONFIG.gyro_notch2_hz != 0).change();

    //// RPM Filter Config

        populateSelectorClass('rpmFilterTypes', self.RPM_FILTER_TYPES);

        $('.gyro_rpm_filter_config').toggle( FC.FEATURE_CONFIG.features.isEnabled('RPM_FILTER') );

        $('.gyroRpmFilterCustomNoteRow').toggle(self.rpmFilter.custom);
        $('select[id="gyroRpmFilterSetupType"]').val(2);

        const enableElem = $('input[id="gyroRpmFilterEnable"]');

        let resetCustom = self.rpmFilter.custom;

        enableElem.change(function () {
            const enabled = enableElem.is(':checked');

            $('.rpm_filter_notches').toggle(enabled);
            $('.rpm_filter_settings').toggle(enabled);
            $('select[id="gyroRpmFilterSetupType"]').attr('disabled', !enabled);

            if (enabled && resetCustom)
                $('.dialogGyroReset')[0].showModal();
        });

        $('.dialogGyroReset-acceptbtn').click(function() {
            $('.dialogGyroReset')[0].close();
            $('.gyroRpmFilterCustomNoteRow').hide();
            resetCustom = false;
        });
        $('.dialogGyroReset-revertbtn').click(function() {
            $('.dialogGyroReset')[0].close();
            enableElem.prop('checked', false).change();
        });

        enableElem.prop('checked', self.rpmFilter.enable && !self.rpmFilter.custom).change();

        let mainMinRPM = (self.rpmFilter.mainRotor[0].rpm_limit > 50) ?
                         self.rpmFilter.mainRotor[0].rpm_limit : 500;

        let tailMinRPM = (self.rpmFilter.tailRotor[0].rpm_limit > 50) ?
                         self.rpmFilter.tailRotor[0].rpm_limit : 1000;

        $('input[id="gyroRpmFilterMainRotorMinRPM"]').val(mainMinRPM);
        $('input[id="gyroRpmFilterTailRotorMinRPM"]').val(tailMinRPM);

        const mainMotorGroupActive =
            (FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] != 1 || FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] != 1);
        const tailMotorGroupActive = (FC.MIXER_CONFIG.tail_rotor_mode > 0 &&
            (FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] != 1 || FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] != 1));

        $('.gyroRpmFilterMainMotorGroup').toggle(mainMotorGroupActive);
        $('.gyroRpmFilterTailMotorGroup').toggle(tailMotorGroupActive);

        function process_single_notch(rotor, harm, conf, active=true) {
            const switchy = $(`input[id="gyroRpmFilter${rotor}S${harm}"]`);
            const quality = $(`input[id="gyroRpmFilter${rotor}Q${harm}"]`);

            if (active) {
                switchy.change(function() {
                    const checked = $(this).is(':checked');
                    quality.attr('disabled', !checked);
                });
                quality.val(conf.notch_q).change();
                switchy.prop('checked', conf.count > 0).change();
            }
            else {
                switchy.prop('checked', false);
                quality.val(0);
            }
        }

        function process_double_notch(rotor, harm, conf, active=true) {
            const switchy = $(`input[id="gyroRpmFilter${rotor}S${harm}"]`);
            const quality = $(`input[id="gyroRpmFilter${rotor}Q${harm}"]`);
            const notschy = $(`select[id="gyroRpmFilter${rotor}N${harm}"]`);

            if (active) {
                switchy.change(function() {
                    const checked = $(this).is(':checked');
                    quality.attr('disabled', !checked);
                    notschy.attr('disabled', !checked);
                    if (!checked) {
                        notschy.val(0);
                    } else {
                        if (conf.count)
                            notschy.val(conf.count);
                        else
                            notschy.val(1);
                    }
                });
                quality.val(conf.notch_q).change();
                switchy.prop('checked', conf.count > 0).change();
            }
            else {
                switchy.prop('checked', false);
                notschy.val(0);
                quality.val(0);
            }
        }

        process_double_notch('MainRotor', 1, self.rpmFilter.mainRotor[0]);
        process_double_notch('MainRotor', 2, self.rpmFilter.mainRotor[1]);
        process_single_notch('MainRotor', 3, self.rpmFilter.mainRotor[2]);
        process_single_notch('MainRotor', 4, self.rpmFilter.mainRotor[3]);
        process_single_notch('MainRotor', 5, self.rpmFilter.mainRotor[4]);
        process_single_notch('MainRotor', 6, self.rpmFilter.mainRotor[5]);
        process_single_notch('MainRotor', 7, self.rpmFilter.mainRotor[6]);
        process_single_notch('MainRotor', 8, self.rpmFilter.mainRotor[7]);

        process_double_notch('TailRotor', 1, self.rpmFilter.tailRotor[0]);
        process_double_notch('TailRotor', 2, self.rpmFilter.tailRotor[1]);
        process_single_notch('TailRotor', 3, self.rpmFilter.tailRotor[2]);
        process_single_notch('TailRotor', 4, self.rpmFilter.tailRotor[3]);

        process_single_notch('MainMotor', 1, self.rpmFilter.mainMotor[0], mainMotorGroupActive);
        process_single_notch('TailMotor', 1, self.rpmFilter.tailMotor[0], tailMotorGroupActive);
    }

    function form_to_data() {

        if ($('input[id="gyroLowpassEnabled"]').is(':checked')) {
            FC.FILTER_CONFIG.gyro_lowpass_type = parseInt($('select[name="gyroLowpassType"]').val());
            FC.FILTER_CONFIG.gyro_lowpass_hz = parseInt($('input[name="gyroLowpassFrequency"]').val());
        } else {
            FC.FILTER_CONFIG.gyro_lowpass_type = 0;
            FC.FILTER_CONFIG.gyro_lowpass_hz = 0;
        }

        if ($('input[id="gyroLowpassDynEnabled"]').is(':checked')) {
            FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz = parseInt($('input[name="gyroLowpassDynMinFrequency"]').val());
            FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz = parseInt($('input[name="gyroLowpassDynMaxFrequency"]').val());
        } else {
            FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz = 0;
            FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz = 0;
        }

        if ($('input[id="gyroLowpass2Enabled"]').is(':checked')) {
            FC.FILTER_CONFIG.gyro_lowpass2_type = parseInt($('select[name="gyroLowpass2Type"]').val());
            FC.FILTER_CONFIG.gyro_lowpass2_hz = parseInt($('input[name="gyroLowpass2Frequency"]').val());
        } else {
            FC.FILTER_CONFIG.gyro_lowpass2_type = 0;
            FC.FILTER_CONFIG.gyro_lowpass2_hz = 0;
        }

        if ($('input[id="gyroNotch1Enabled"]').is(':checked')) {
            FC.FILTER_CONFIG.gyro_notch_hz = parseInt($('input[name="gyroNotch1Frequency"]').val());
            FC.FILTER_CONFIG.gyro_notch_cutoff = parseInt($('input[name="gyroNotch1Cutoff"]').val());
        } else {
            FC.FILTER_CONFIG.gyro_notch_hz = 0;
            FC.FILTER_CONFIG.gyro_notch_cutoff = 0;
        }

        if ($('input[id="gyroNotch2Enabled"]').is(':checked')) {
            FC.FILTER_CONFIG.gyro_notch2_hz = parseInt($('input[name="gyroNotch2Frequency"]').val());
            FC.FILTER_CONFIG.gyro_notch2_cutoff = parseInt($('input[name="gyroNotch2Cutoff"]').val());
        } else {
            FC.FILTER_CONFIG.gyro_notch2_hz = 0;
            FC.FILTER_CONFIG.gyro_notch2_cutoff = 0;
        }

        FC.FILTER_CONFIG.dyn_notch_width_percent = parseInt($('input[name="dynamicNotchWidthPercent"]').val());
        FC.FILTER_CONFIG.dyn_notch_q = parseInt($('input[name="dynamicNotchQ"]').val());
        FC.FILTER_CONFIG.dyn_notch_min_hz = parseInt($('input[name="dynamicNotchMinHz"]').val());
        FC.FILTER_CONFIG.dyn_notch_max_hz = parseInt($('input[name="dynamicNotchMaxHz"]').val());

    //// RPM Filter Config

        self.rpmFilter.enable = $('input[id="gyroRpmFilterEnable"]').is(':checked');
        self.rpmFilter.custom &= !self.rpmFilter.enable;

        if (self.rpmFilter.enable && !self.rpmFilter.custom) {

            const mainMotorGroupActive =
                (FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] != 1 || FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] != 1);
            const tailMotorGroupActive = (FC.MIXER_CONFIG.tail_rotor_mode > 0 &&
                (FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] != 1 || FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] != 1));

            const mainRotorMinRPM = parseInt($('input[id="gyroRpmFilterMainRotorMinRPM"]').val());
            for (let i=0; i<RPMFilter.MAIN_ROTOR_HARMONICS; i++) {
                self.rpmFilter.mainRotor[i].rpm_limit = mainRotorMinRPM;
            }
            self.rpmFilter.mainMotor[0].rpm_limit = mainRotorMinRPM;

            const tailRotorMinRPM = parseInt($('input[id="gyroRpmFilterTailRotorMinRPM"]').val());
            for (let i=0; i<RPMFilter.TAIL_ROTOR_HARMONICS; i++) {
                self.rpmFilter.tailRotor[i].rpm_limit = tailRotorMinRPM;
            }
            self.rpmFilter.tailMotor[0].rpm_limit = tailRotorMinRPM;

            function access_double_notch(rotor, harm, conf) {
                const switchy = $(`input[id="gyroRpmFilter${rotor}S${harm}"]`);
                const quality = $(`input[id="gyroRpmFilter${rotor}Q${harm}"]`);
                const notschy = $(`select[id="gyroRpmFilter${rotor}N${harm}"]`);
                if (switchy.is(':checked')) {
                    conf.notch_q = parseFloat(quality.val());
                    conf.count = parseInt(notschy.val());
                } else {
                    conf.count = 0;
                }
            }
            function access_single_notch(rotor, harm, conf) {
                const switchy = $(`input[id="gyroRpmFilter${rotor}S${harm}"]`);
                const quality = $(`input[id="gyroRpmFilter${rotor}Q${harm}"]`);
                if (switchy.is(':checked')) {
                    conf.notch_q = parseFloat(quality.val());
                    conf.count = 1;
                } else {
                    conf.count = 0;
                }
            }

            access_double_notch('MainRotor', 1, self.rpmFilter.mainRotor[0]);
            access_double_notch('MainRotor', 2, self.rpmFilter.mainRotor[1]);
            access_single_notch('MainRotor', 3, self.rpmFilter.mainRotor[2]);
            access_single_notch('MainRotor', 4, self.rpmFilter.mainRotor[3]);
            access_single_notch('MainRotor', 5, self.rpmFilter.mainRotor[4]);
            access_single_notch('MainRotor', 6, self.rpmFilter.mainRotor[5]);
            access_single_notch('MainRotor', 7, self.rpmFilter.mainRotor[6]);
            access_single_notch('MainRotor', 8, self.rpmFilter.mainRotor[7]);

            access_double_notch('TailRotor', 1, self.rpmFilter.tailRotor[0]);
            access_double_notch('TailRotor', 2, self.rpmFilter.tailRotor[1]);
            access_single_notch('TailRotor', 3, self.rpmFilter.tailRotor[2]);
            access_single_notch('TailRotor', 4, self.rpmFilter.tailRotor[3]);

            access_single_notch('MainMotor', 1, self.rpmFilter.mainMotor[0]);
            access_single_notch('TailMotor', 1, self.rpmFilter.tailMotor[0]);
        }

        if (!self.rpmFilter.custom) {
            FC.RPM_FILTER_CONFIG = RPMFilter.generateConfig(self.rpmFilter);
            self.rpmFilterDirty = true;
        }
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // Load RPM filter configuration
        self.rpmFilter = RPMFilter.parseConfig(FC.RPM_FILTER_CONFIG);
        self.rpmFilterDirty = false;

        // UI Hooks
        data_to_form();

        // Hide the buttons toolbar
        $('.tab-gyro').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-gyro').removeClass('toolbar_hidden');
            }
        }

        $('.gyro_filter_config').change(function () {
            setDirty();
        });
        $('.gyro_rpm_filter_config').change(function () {
            setDirty();
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

        GUI.content_ready(callback);
    }
};


TABS.gyro.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};

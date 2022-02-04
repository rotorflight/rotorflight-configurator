'use strict';

TABS.gyro = {
    isDirty: false,
    rpmFilterDirty: false,
    FILTER_TYPE_NAMES: [
        "PT1",
        "BIQUAD",
    ],
    RPM_FILTER_TYPES: [
        null,
        'SINGLE',
        'DOUBLE',
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

        function populateSelector(name, values) {
            $('select.' + name).each(function () {
                const select = $(this);
                values.forEach(function(value, key) {
                    if (value)
                       select.append('<option value="' + key + '">' + value + '</option>');
                });
            });
        }

        populateSelector('lowpassTypes', self.FILTER_TYPE_NAMES);

        $('select[name="gyroLowpassType"]').val(FC.FILTER_CONFIG.gyro_lowpass_type);
        $('input[name="gyroLowpassFrequency"]').val(FC.FILTER_CONFIG.gyro_lowpass_hz);
        $('input[name="gyroLowpassDynMinFrequency"]').val(FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz);
        $('input[name="gyroLowpassDynMaxFrequency"]').val(FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz);

        $('select[name="gyroLowpass2Type"]').val(FC.FILTER_CONFIG.gyro_lowpass2_type);
        $('input[name="gyroLowpass2Frequency"]').val(FC.FILTER_CONFIG.gyro_lowpass2_hz);

        $('input[name="gyroNotch1Frequency"]').val(FC.FILTER_CONFIG.gyro_notch_hz);
        $('input[name="gyroNotch1Cutoff"]').val(FC.FILTER_CONFIG.gyro_notch_cutoff);
        $('input[name="gyroNotch2Frequency"]').val(FC.FILTER_CONFIG.gyro_notch2_hz);
        $('input[name="gyroNotch2Cutoff"]').val(FC.FILTER_CONFIG.gyro_notch2_cutoff);

        $('select[name="dtermLowpassType"]').val(FC.FILTER_CONFIG.dterm_lowpass_type);
        $('input[name="dtermLowpassFrequency"]').val(FC.FILTER_CONFIG.dterm_lowpass_hz);
        $('input[name="dtermLowpassDynMinFrequency"]').val(FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz);
        $('input[name="dtermLowpassDynMaxFrequency"]').val(FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz);

        $('select[name="dtermLowpass2Type"]').val(FC.FILTER_CONFIG.dterm_lowpass2_type);
        $('input[name="dtermLowpass2Frequency"]').val(FC.FILTER_CONFIG.dterm_lowpass2_hz);

        $('input[name="dTermNotchFrequency"]').val(FC.FILTER_CONFIG.dterm_notch_hz);
        $('input[name="dTermNotchCutoff"]').val(FC.FILTER_CONFIG.dterm_notch_cutoff);

        $('input[name="dynamicNotchWidthPercent"]').val(FC.FILTER_CONFIG.dyn_notch_width_percent);
        $('input[name="dynamicNotchQ"]').val(FC.FILTER_CONFIG.dyn_notch_q);
        $('input[name="dynamicNotchMinHz"]').val(FC.FILTER_CONFIG.dyn_notch_min_hz);
        $('input[name="dynamicNotchMaxHz"]').val(FC.FILTER_CONFIG.dyn_notch_max_hz);

        $('.dynamicNotch').toggle( FC.FEATURE_CONFIG.features.isEnabled('DYNAMIC_FILTER') );

        $('input[id="gyroLowpassEnabled"]').change(function() {
            const checked = $(this).is(':checked');
            let type = 0, freq = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.gyro_lowpass_hz > 0) {
                    type = FC.FILTER_CONFIG.gyro_lowpass_type;
                    freq = FC.FILTER_CONFIG.gyro_lowpass_hz;
                } else {
                    type = FILTER_DEFAULT.gyro_lowpass_type;
                    freq = FILTER_DEFAULT.gyro_lowpass_hz;
                }
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
                if (FC.FILTER_CONFIG.gyro_lowpass2_hz > 0) {
                    type = FC.FILTER_CONFIG.gyro_lowpass2_type;
                    freq = FC.FILTER_CONFIG.gyro_lowpass2_hz;
                } else {
                    type = FILTER_DEFAULT.gyro_lowpass2_type;
                    freq = FILTER_DEFAULT.gyro_lowpass2_hz;
                }
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

        $('input[id="dtermLowpassEnabled"]').change(function() {
            const checked = $(this).is(':checked');
            let type = 0, freq = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.dterm_lowpass_hz > 0) {
                    type = FC.FILTER_CONFIG.dterm_lowpass_type;
                    freq = FC.FILTER_CONFIG.dterm_lowpass_hz;
                } else {
                    type = FILTER_DEFAULT.dterm_lowpass_type;
                    freq = FILTER_DEFAULT.dterm_lowpass_hz;
                }
            }

            $('select[name="dtermLowpassType"]').val(type).attr('disabled', !checked);
            $('input[name="dtermLowpassFrequency"]').val(freq).attr('disabled', !checked);

            if (!checked) {
                $('input[id="dtermLowpassDynEnabled"]').prop('checked', false).change();
            }
        });

        $('input[id="dtermLowpassDynEnabled"]').change(function() {
            const checked = $(this).is(':checked');
            let minf = 0, maxf = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz > 0 &&
                    FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz < FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz) {
                    minf = FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz;
                    maxf = FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz;
                } else {
                    minf = FILTER_DEFAULT.dterm_lowpass_dyn_min_hz;
                    maxf = FILTER_DEFAULT.dterm_lowpass_dyn_max_hz;
                }
            }

            $('input[name="dtermLowpassDynMinFrequency"]').val(minf).attr('disabled', !checked);
            $('input[name="dtermLowpassDynMaxFrequency"]').val(maxf).attr('disabled', !checked);
        });

        $('input[id="dtermLowpass2Enabled"]').change(function() {
            const checked = $(this).is(':checked');
            let type = 0, freq = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.dterm_lowpass2_hz > 0) {
                    type = FC.FILTER_CONFIG.dterm_lowpass2_type;
                    freq = FC.FILTER_CONFIG.dterm_lowpass2_hz;
                } else {
                    type = FILTER_DEFAULT.dterm_lowpass2_type;
                    freq = FILTER_DEFAULT.dterm_lowpass2_hz;
                }
            }

            $('select[name="dtermLowpass2Type"]').val(type).attr('disabled', !checked);
            $('input[name="dtermLowpass2Frequency"]').val(freq).attr('disabled', !checked);
        });

        $('input[id="dtermNotchEnabled"]').change(function() {
            const checked = $(this).is(':checked');
            let freq = 0, cutf = 0;

            if (checked) {
                if (FC.FILTER_CONFIG.dterm_notch_hz > 0 && FC.FILTER_CONFIG.dterm_notch_cutoff > 0) {
                    freq = FC.FILTER_CONFIG.dterm_notch_hz;
                    cutf = FC.FILTER_CONFIG.dterm_notch_cutoff;
                } else {
                    freq = FILTER_DEFAULT.dterm_notch_hz;
                    cutf = FILTER_DEFAULT.dterm_notch_cutoff;
                }
            }

            $('input[name="dTermNotchFrequency"]').val(freq);
            $('input[name="dTermNotchFrequency"]').attr('disabled', !checked).change();
            $('input[name="dTermNotchCutoff"]').val(cutf);
            $('input[name="dTermNotchCutoff"]').attr('disabled', !checked).change();
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

        $('input[name="dTermNotchFrequency"]').change(function() {
            adjustGyroNotch("dTermNotch");
        }).change();

        $('input[id="gyroLowpassEnabled"]').prop('checked', FC.FILTER_CONFIG.gyro_lowpass_hz != 0).change();
        $('input[id="gyroLowpassDynEnabled"]').prop('checked', FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz > 0 &&
                                                    FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz < FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz).change();

        $('input[id="gyroLowpass2Enabled"]').prop('checked', FC.FILTER_CONFIG.gyro_lowpass2_hz != 0).change();

        $('input[id="gyroNotch1Enabled"]').prop('checked', FC.FILTER_CONFIG.gyro_notch_hz != 0).change();
        $('input[id="gyroNotch2Enabled"]').prop('checked', FC.FILTER_CONFIG.gyro_notch2_hz != 0).change();

        $('input[id="dtermLowpassEnabled"]').prop('checked', FC.FILTER_CONFIG.dterm_lowpass_hz != 0).change();
        $('input[id="dtermLowpassDynEnabled"]').prop('checked', FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz > 0 &&
                                                     FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz < FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz).change();

        $('input[id="dtermLowpass2Enabled"]').prop('checked', FC.FILTER_CONFIG.dterm_lowpass2_hz != 0).change();

        $('input[id="dtermNotchEnabled"]').prop('checked', FC.FILTER_CONFIG.dterm_notch_hz != 0).change();

        //// RPM Filter Config

        populateSelector('rpmFilterTypes', self.RPM_FILTER_TYPES);

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

        let mainMinRPM = (self.rpmFilter.mainRotor[0].min_hz > 0) ?
                            self.rpmFilter.mainRotor[0].min_hz : 1000;

        let tailMinRPM = (self.rpmFilter.tailRotor[0].min_hz > 0) ?
                            self.rpmFilter.tailRotor[0].min_hz : 1000;

        $('input[id="gyroRpmFilterMainRotorMinRPM"]').val(mainMinRPM);
        $('input[id="gyroRpmFilterTailRotorMinRPM"]').val(tailMinRPM);

        $('input[id="gyroRpmFilterMainRotorSw1"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterMainRotorQ1"]').attr('disabled', !checked);
            $('select[id="gyroRpmFilterMainRotorNotch1"]').attr('disabled', !checked);
            if (!checked) {
                $('select[id="gyroRpmFilterMainRotorNotch1"]').val(0);
            } else {
                if (self.rpmFilter.mainRotor[0].count)
                    $('select[id="gyroRpmFilterMainRotorNotch1"]').val(self.rpmFilter.mainRotor[0].count);
                else
                    $('select[id="gyroRpmFilterMainRotorNotch1"]').val(1);
            }
        });
        $('input[id="gyroRpmFilterMainRotorQ1"]').val(self.rpmFilter.mainRotor[0].notch_q).change();
        $('input[id="gyroRpmFilterMainRotorSw1"]').prop('checked', self.rpmFilter.mainRotor[0].count > 0).change();

        $('input[id="gyroRpmFilterMainRotorSw2"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterMainRotorQ2"]').attr('disabled', !checked);
            $('select[id="gyroRpmFilterMainRotorNotch2"]').attr('disabled', !checked);
            if (!checked) {
                $('select[id="gyroRpmFilterMainRotorNotch2"]').val(0);
            } else {
                if (self.rpmFilter.mainRotor[1].count)
                    $('select[id="gyroRpmFilterMainRotorNotch2"]').val(self.rpmFilter.mainRotor[1].count);
                else
                    $('select[id="gyroRpmFilterMainRotorNotch2"]').val(1);
            }
        });
        $('input[id="gyroRpmFilterMainRotorQ2"]').val(self.rpmFilter.mainRotor[1].notch_q).change();
        $('input[id="gyroRpmFilterMainRotorSw2"]').prop('checked', self.rpmFilter.mainRotor[1].count > 0).change();

        $('input[id="gyroRpmFilterMainRotorSw3"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterMainRotorQ3"]').attr('disabled', !checked);
        });
        $('input[id="gyroRpmFilterMainRotorQ3"]').val(self.rpmFilter.mainRotor[2].notch_q).change();
        $('input[id="gyroRpmFilterMainRotorSw3"]').prop('checked', self.rpmFilter.mainRotor[2].count > 0).change();

        $('input[id="gyroRpmFilterMainRotorSw4"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterMainRotorQ4"]').attr('disabled', !checked);
        });
        $('input[id="gyroRpmFilterMainRotorQ4"]').val(self.rpmFilter.mainRotor[3].notch_q).change();
        $('input[id="gyroRpmFilterMainRotorSw4"]').prop('checked', self.rpmFilter.mainRotor[3].count > 0).change();

        $('input[id="gyroRpmFilterTailRotorSw1"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterTailRotorQ1"]').attr('disabled', !checked);
            $('select[id="gyroRpmFilterTailRotorNotch1"]').attr('disabled', !checked);
            if (!checked) {
                $('select[id="gyroRpmFilterTailRotorNotch1"]').val(0);
            } else {
                if (self.rpmFilter.tailRotor[0].count)
                    $('select[id="gyroRpmFilterTailRotorNotch1"]').val(self.rpmFilter.tailRotor[0].count);
                else
                    $('select[id="gyroRpmFilterTailRotorNotch1"]').val(1);
            }
        });
        $('input[id="gyroRpmFilterTailRotorQ1"]').val(self.rpmFilter.tailRotor[0].notch_q).change();
        $('input[id="gyroRpmFilterTailRotorSw1"]').prop('checked', self.rpmFilter.tailRotor[0].count > 0).change();

        $('input[id="gyroRpmFilterTailRotorSw2"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterTailRotorQ2"]').attr('disabled', !checked);
            $('select[id="gyroRpmFilterTailRotorNotch2"]').attr('disabled', !checked);
            if (!checked) {
                $('select[id="gyroRpmFilterTailRotorNotch2"]').val(0);
            } else {
                if (self.rpmFilter.tailRotor[1].count)
                    $('select[id="gyroRpmFilterTailRotorNotch2"]').val(self.rpmFilter.tailRotor[1].count);
                else
                    $('select[id="gyroRpmFilterTailRotorNotch2"]').val(1);
            }
        });
        $('input[id="gyroRpmFilterTailRotorQ2"]').val(self.rpmFilter.tailRotor[1].notch_q).change();
        $('input[id="gyroRpmFilterTailRotorSw2"]').prop('checked', self.rpmFilter.tailRotor[1].count > 0).change();

        $('input[id="gyroRpmFilterTailRotorSw3"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterTailRotorQ3"]').attr('disabled', !checked);
        });
        $('input[id="gyroRpmFilterTailRotorQ3"]').val(self.rpmFilter.tailRotor[2].notch_q).change();
        $('input[id="gyroRpmFilterTailRotorSw3"]').prop('checked', self.rpmFilter.tailRotor[2].count > 0).change();

        $('input[id="gyroRpmFilterTailRotorSw4"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterTailRotorQ4"]').attr('disabled', !checked);
        });
        $('input[id="gyroRpmFilterTailRotorQ4"]').val(self.rpmFilter.tailRotor[3].notch_q).change();
        $('input[id="gyroRpmFilterTailRotorSw4"]').prop('checked', self.rpmFilter.tailRotor[3].count > 0).change();

        $('input[id="gyroRpmFilterMainMotorSw1"]').change(function() {
            const checked = $(this).is(':checked');
            $('input[id="gyroRpmFilterMainMotorQ1"]').attr('disabled', !checked);
        });

        $('input[id="gyroRpmFilterMainMotorQ1"]').val(self.rpmFilter.mainMotor[0].notch_q).change();
        $('input[id="gyroRpmFilterMainMotorSw1"]').prop('checked', self.rpmFilter.mainMotor[0].count > 0).change();

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

        if ($('input[id="dtermLowpassEnabled"]').is(':checked')) {
            FC.FILTER_CONFIG.dterm_lowpass_type = $('select[name="dtermLowpassType"]').val();
            FC.FILTER_CONFIG.dterm_lowpass_hz = parseInt($('input[name="dtermLowpassFrequency"]').val());
        } else {
            FC.FILTER_CONFIG.dterm_lowpass_type = 0;
            FC.FILTER_CONFIG.dterm_lowpass_hz = 0;
        }

        if ($('input[id="dtermLowpassDynEnabled"]').is(':checked')) {
            FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz = parseInt($('input[name="dtermLowpassDynMinFrequency"]').val());
            FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz = parseInt($('input[name="dtermLowpassDynMaxFrequency"]').val());
        } else {
            FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz = 0;
            FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz = 0;
        }

        if ($('input[id="dtermLowpass2Enabled"]').is(':checked')) {
            FC.FILTER_CONFIG.dterm_lowpass2_type = $('select[name="dtermLowpass2Type"]').val();
            FC.FILTER_CONFIG.dterm_lowpass2_hz = parseInt($('input[name="dtermLowpass2Frequency"]').val());
        } else {
            FC.FILTER_CONFIG.dterm_lowpass2_type = 0;
            FC.FILTER_CONFIG.dterm_lowpass2_hz = 0;
        }

        if ($('input[id="dtermNotchEnabled"]').is(':checked')) {
            FC.FILTER_CONFIG.dterm_notch_hz = parseInt($('input[name="dTermNotchFrequency"]').val());
            FC.FILTER_CONFIG.dterm_notch_cutoff = parseInt($('input[name="dTermNotchCutoff"]').val());
        } else {
            FC.FILTER_CONFIG.dterm_notch_hz = 0;
            FC.FILTER_CONFIG.dterm_notch_cutoff = 0;
        }

        //// RPM Filter Config

        self.rpmFilter.enable = $('input[id="gyroRpmFilterEnable"]').is(':checked');
        self.rpmFilter.custom &= !self.rpmFilter.enable;

        if (self.rpmFilter.enable && !self.rpmFilter.custom) {

            const mainRotorMinRPM = $('input[id="gyroRpmFilterMainRotorMinRPM"]').val();
            for (let i=0; i<4; i++) {
                self.rpmFilter.mainRotor[i].min_hz = mainRotorMinRPM;
                self.rpmFilter.mainRotor[i].max_hz = 50000;
            }
            self.rpmFilter.mainMotor[0].min_hz = mainRotorMinRPM;
            self.rpmFilter.mainMotor[0].max_hz = 50000;

            const tailRotorMinRPM = $('input[id="gyroRpmFilterTailRotorMinRPM"]').val();
            for (let i=0; i<4; i++) {
                self.rpmFilter.tailRotor[i].min_hz = tailRotorMinRPM;
                self.rpmFilter.tailRotor[i].max_hz = 50000;
            }
            self.rpmFilter.tailMotor[0].min_hz = tailRotorMinRPM;
            self.rpmFilter.tailMotor[0].max_hz = 50000;

            if ($('input[id="gyroRpmFilterMainRotorSw1"]').is(':checked')) {
                self.rpmFilter.mainRotor[0].notch_q = $('input[id="gyroRpmFilterMainRotorQ1"]').val();
                self.rpmFilter.mainRotor[0].count = parseInt($('select[id="gyroRpmFilterMainRotorNotch1"]').val());
            } else {
                self.rpmFilter.mainRotor[0].count = 0;
            }

            if ($('input[id="gyroRpmFilterMainRotorSw2"]').is(':checked')) {
                self.rpmFilter.mainRotor[1].notch_q = $('input[id="gyroRpmFilterMainRotorQ2"]').val();
                self.rpmFilter.mainRotor[1].count = parseInt($('select[id="gyroRpmFilterMainRotorNotch2"]').val());
            } else {
                self.rpmFilter.mainRotor[1].count = 0;
            }

            if ($('input[id="gyroRpmFilterMainRotorSw3"]').is(':checked')) {
                self.rpmFilter.mainRotor[2].count = 1;
                self.rpmFilter.mainRotor[2].notch_q = $('input[id="gyroRpmFilterMainRotorQ3"]').val();
            } else {
                self.rpmFilter.mainRotor[2].count = 0;
            }

            if ($('input[id="gyroRpmFilterMainRotorSw4"]').is(':checked')) {
                self.rpmFilter.mainRotor[3].count = 1;
                self.rpmFilter.mainRotor[3].notch_q = $('input[id="gyroRpmFilterMainRotorQ4"]').val();
            } else {
                self.rpmFilter.mainRotor[3].count = 0;
            }

            if ($('input[id="gyroRpmFilterTailRotorSw1"]').is(':checked')) {
                self.rpmFilter.tailRotor[0].notch_q = $('input[id="gyroRpmFilterTailRotorQ1"]').val();
                self.rpmFilter.tailRotor[0].count = parseInt($('select[id="gyroRpmFilterTailRotorNotch1"]').val());
            } else {
                self.rpmFilter.tailRotor[0].count = 0;
            }

            if ($('input[id="gyroRpmFilterTailRotorSw2"]').is(':checked')) {
                self.rpmFilter.tailRotor[1].notch_q = $('input[id="gyroRpmFilterTailRotorQ2"]').val();
                self.rpmFilter.tailRotor[1].count = parseInt($('select[id="gyroRpmFilterTailRotorNotch2"]').val());
            } else {
                self.rpmFilter.tailRotor[1].count = 0;
            }

            if ($('input[id="gyroRpmFilterTailRotorSw3"]').is(':checked')) {
                self.rpmFilter.tailRotor[2].count = 1;
                self.rpmFilter.tailRotor[2].notch_q = $('input[id="gyroRpmFilterTailRotorQ3"]').val();
            } else {
                self.rpmFilter.tailRotor[2].count = 0;
            }

            if ($('input[id="gyroRpmFilterTailRotorSw4"]').is(':checked')) {
                self.rpmFilter.tailRotor[3].count = 1;
                self.rpmFilter.tailRotor[3].notch_q = $('input[id="gyroRpmFilterTailRotorQ4"]').val();
            } else {
                self.rpmFilter.tailRotor[3].count = 0;
            }

            if ($('input[id="gyroRpmFilterMainMotorSw1"]').is(':checked')) {
                self.rpmFilter.mainMotor[0].count = 1;
                self.rpmFilter.mainMotor[0].notch_q = $('input[id="gyroRpmFilterMainMotorQ1"]').val();
            } else {
                self.rpmFilter.mainMotor[0].count = 0;
            }

            if (self.rpmFilter.mainMotor[1]) {
                self.rpmFilter.mainMotor[1].count = 0;
            }
            if (self.rpmFilter.tailMotor[0]) {
                self.rpmFilter.tailMotor[0].count = 0;
            }
            if (self.rpmFilter.tailMotor[1]) {
                self.rpmFilter.tailMotor[1].count = 0;
            }
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

import semver from "semver";
import { mount } from "svelte";

import Gyro from "@/tabs/gyro/Gyro.svelte";

const tab = {
    tabName: 'gyro',
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
};

tab.initialize = function (callback) {
    const self = this;

    const FILTER_DEFAULT = FC.getFilterDefaults();

    load_data().then(load_html);

    function load_html() {
        $('#content').load("/src/tabs/gyro.html", process_html);
    }

    async function load_data() {
        await MSP.promise(MSPCodes.MSP_STATUS);
        await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
        await MSP.promise(MSPCodes.MSP_FILTER_CONFIG);
        await MSP.promise(MSPCodes.MSP_MOTOR_CONFIG);
        await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);

        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
            await mspHelper.requestRpmFilterBanks();
        } else {
            await MSP.promise(MSPCodes.MSP_RPM_FILTER);
        }
    }

    async function save_data() {
        await MSP.promise(MSPCodes.MSP_SET_FEATURE_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FEATURE_CONFIG));
        await MSP.promise(MSPCodes.MSP_SET_FILTER_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FILTER_CONFIG));
        if (self.rpmFilterDirty) {
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)) {
                await mspHelper.sendRPMFiltersV2();
            } else {
                await mspHelper.sendRPMFilters();
            }
        }

        await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
        GUI.log(i18n.getMessage('eepromSaved'));
        MSP.send_message(MSPCodes.MSP_SET_REBOOT);
        GUI.log(i18n.getMessage('deviceRebooting'));
        reinitialiseConnection(callback);
    };

    function data_to_form() {

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


    //// Dynamic Notch filter

        $('input[name="dynamicNotchCount"]').val(FC.FILTER_CONFIG.dyn_notch_count).change();
        $('input[name="dynamicNotchQ"]').val(FC.FILTER_CONFIG.dyn_notch_q / 10).change();
        $('input[name="dynamicNotchMinHz"]').val(FC.FILTER_CONFIG.dyn_notch_min_hz).change();
        $('input[name="dynamicNotchMaxHz"]').val(FC.FILTER_CONFIG.dyn_notch_max_hz).change();

        $('input[id="dynamicNotchEnabled"]').change(function() {
            const checked = $(this).is(':checked');
            $('.dynamicNotchParam').attr('disabled', !checked);
        })
        .prop('checked', FC.FEATURE_CONFIG.features.isEnabled('DYN_NOTCH'))
        .change();
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


    //// Dynamic Notch config

        FC.FILTER_CONFIG.dyn_notch_count = parseInt($('input[name="dynamicNotchCount"]').val());
        FC.FILTER_CONFIG.dyn_notch_q = parseFloat($('input[name="dynamicNotchQ"]').val()) * 10;
        FC.FILTER_CONFIG.dyn_notch_min_hz = parseInt($('input[name="dynamicNotchMinHz"]').val());
        FC.FILTER_CONFIG.dyn_notch_max_hz = parseInt($('input[name="dynamicNotchMaxHz"]').val());

        const dynNotchEnabled = $('input[id="dynamicNotchEnabled"]').is(':checked') &&
            FC.FILTER_CONFIG.dyn_notch_count > 0;
        FC.FEATURE_CONFIG.features.setFeature('DYN_NOTCH', dynNotchEnabled);
    }

    function process_html() {
        mount(Gyro, {
            target: document.querySelector("#rpm-filter"),
            props: {
                onRpmNotchUpdate: (dirty, valid) => {
                    self.rpmFilterDirty = dirty;
                    if (dirty) {
                        setDirty();

                        if (!valid) {
                            $('button.save').prop('disabled', true);
                            return;
                        }
                    }

                    $('button.save').prop('disabled', false);
                },
                onRpmSettingsUpdate: (changed) => {
                    if (changed) {
                        setDirty();
                    }
                },
            },
        });

        // translate to user-selected language
        i18n.localizePage();

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

        self.save = async function () {
            form_to_data();
            await save_data();
        };

        self.revert = function (callback) {
            callback?.();
        };

        $('button.save').click(function () {
            self.save().then(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        GUI.content_ready(callback);
    }
};


tab.cleanup = function (callback) {
    this.isDirty = false;
    this.rpmFilterDirty = false;

    callback?.();
};

TABS[tab.tabName] = tab;

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        if (newModule && GUI.active_tab === tab.tabName) {
          TABS[tab.tabName].initialize();
        }
    });

    import.meta.hot.dispose(() => {
        tab.cleanup();
    });
}

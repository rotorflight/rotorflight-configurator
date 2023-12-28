'use strict';

TABS.mixer = {
    isDirty: false,
    needSave: false,
    needReboot: false,
    customConfig: false,

    MIXER_CONFIG_dirty: false,
    MIXER_INPUT1_dirty: false,
    MIXER_INPUT2_dirty: false,
    MIXER_INPUT3_dirty: false,
    MIXER_INPUT4_dirty: false,
    MIXER_RULES_dirty: false,

    overrideMixer: [
        { class: 'mixerMainRotor',  axis: 1,  min:-18,   max:18,   step:0.1,  fixed:1,  scale:0.012,  pipstep: 1,  pipfix: 0,  pipval: [ -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, ], },
        { class: 'mixerMainRotor',  axis: 2,  min:-18,   max:18,   step:0.1,  fixed:1,  scale:0.012,  pipstep: 1,  pipfix: 0,  pipval: [ -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, ], },
        { class: 'mixerMainRotor',  axis: 4,  min:-18,   max:18,   step:0.1,  fixed:1,  scale:0.012,  pipstep: 1,  pipfix: 0,  pipval: [ -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, ], },
        { class: 'mixerTailRotor',  axis: 3,  min:-45,   max:45,   step:0.1,  fixed:0,  scale:0.024,  pipstep: 1,  pipfix: 0,  pipval: [ -40, -30, -20, -10, 0, 10, 20, 30, 40, ], },
        { class: 'mixerTailMotor',  axis: 3,  min:-125,  max:125,  step:1,    fixed:0,  scale:0.100,  pipstep: 5,  pipfix: 0,  pipval: [ -125, -100, -75, -50, -25, 0, 25, 50, 75, 100, 125, ], },
    ],
};

TABS.mixer.initialize = function (callback) {
    const self = this;

    function setDirty() {
        if (!self.isDirty) {
            self.isDirty = true;
            $('.tab-mixer').removeClass('toolbar_hidden');
        }

        $('.save_btn').toggle(!self.needReboot);
        $('.reboot_btn').toggle(!!self.needReboot);
    }

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/mixer.html", process_html);
    }

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_INPUTS))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_RULES))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_OVERRIDE))
            .then(callback);
    }

    function save_data(callback) {
        function send_mixer_config() {
            if (self.MIXER_CONFIG_dirty)
                MSP.send_message(MSPCodes.MSP_SET_MIXER_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_MIXER_CONFIG), false, send_mixer_input1);
            else
                send_mixer_input1();
        }
        function send_mixer_input1() {
            if (self.MIXER_INPUT1_dirty)
                mspHelper.sendMixerInput(1, send_mixer_input2);
            else
                send_mixer_input2();
        }
        function send_mixer_input2() {
            if (self.MIXER_INPUT2_dirty)
                mspHelper.sendMixerInput(2, send_mixer_input3);
            else
                send_mixer_input3();
        }
        function send_mixer_input3() {
            if (self.MIXER_INPUT3_dirty)
                mspHelper.sendMixerInput(3, send_mixer_input4);
            else
                send_mixer_input4();
        }
        function send_mixer_input4() {
            if (self.MIXER_INPUT4_dirty)
                mspHelper.sendMixerInput(4, send_mixer_rules);
            else
                send_mixer_rules();
        }
        function send_mixer_rules() {
            if (self.MIXER_RULES_dirty)
                mspHelper.sendMixerRules(save_eeprom);
            else
                save_eeprom();
        }
        function save_eeprom() {
            if (self.needSave)
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, eeprom_saved);
            else
                save_done();
        }
        function eeprom_saved() {
            GUI.log(i18n.getMessage('eepromSaved'));
            self.needSave = false;
            save_done();
        }
        function save_done() {
            self.MIXER_CONFIG_dirty = false;
            self.MIXER_INPUT1_dirty = false;
            self.MIXER_INPUT2_dirty = false;
            self.MIXER_INPUT3_dirty = false;
            self.MIXER_INPUT4_dirty = false;
            self.MIXER_RULES_dirty = false;

            self.isDirty = self.needReboot || self.needSave;

            if (self.needReboot) {
                MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                GUI.log(i18n.getMessage('deviceRebooting'));
                reinitialiseConnection(callback);
            }
            else {
                callback?.();
            }
        }

        send_mixer_config();
    }

    function add_override(axis) {

        const mixerOverride = $('#tab-mixer-templates .mixerOverrideTemplate tr').clone();

        const mixerSlider = mixerOverride.find('.mixerOverrideSlider');
        const mixerEnable = mixerOverride.find('.mixerOverrideEnable input');
        const mixerInput  = mixerOverride.find('.mixerOverrideInput input');

        const inputIndex = axis.axis;

        mixerOverride.addClass(axis.class);
        mixerOverride.addClass('mixerOverrideActive');
        mixerOverride.find('.mixerOverrideName').text(i18n.getMessage(Mixer.inputNames[inputIndex]));

        mixerInput.attr('min', axis.min);
        mixerInput.attr('max', axis.max);
        mixerInput.attr('step', axis.step);

        mixerSlider.noUiSlider({
            range: {
                'min': axis.min,
                'max': axis.max,
            },
            start: 0,
            step: axis.pipstep,
            behaviour: 'snap-drag',
        });

        mixerOverride.find('.pips-range').noUiSlider_pips({
            mode: 'values',
            values: axis.pipval,
            density: 100 / ((axis.max - axis.min) / axis.pipstep),
            stepped: true,
            format: wNumb({
                decimals: axis.pipfix,
            }),
        });

        mixerSlider.on('slide', function () {
            mixerInput.val(Number($(this).val()).toFixed(axis.fixed));
        });

        mixerSlider.on('change', function () {
            mixerInput.change();
        });

        mixerInput.change(function () {
            const value = $(this).val();
            mixerSlider.val(value);
            FC.MIXER_OVERRIDE[inputIndex] = Math.round(value / axis.scale);
            mspHelper.sendMixerOverride(inputIndex);
        });

        mixerEnable.change(function () {
            const check = $(this).prop('checked');
            const value = check ? 0 : Mixer.OVERRIDE_OFF;

            mixerInput.val(0);
            mixerSlider.val(0);

            mixerInput.prop('disabled', !check);
            mixerSlider.attr('disabled', !check);

            FC.MIXER_OVERRIDE[inputIndex] = value;
            mspHelper.sendMixerOverride(inputIndex);
        });

        let value = FC.MIXER_OVERRIDE[inputIndex];
        let check = Mixer.overrideEnabled(value);

        FC.CONFIG.mixerOverrideEnabled |= check;

        value *= axis.scale;
        value = (check ? value : 0).toFixed(axis.fixed);

        mixerInput.val(value);
        mixerSlider.val(value);

        mixerInput.prop('disabled', !check);
        mixerSlider.attr('disabled', !check);
        mixerEnable.prop('checked', check);

        $('.mixerOverrideTable tbody').append(mixerOverride);
    }

    function data_to_form() {

        $('.tab-mixer .note').hide();

        self.origMixerConfig = Mixer.cloneConfig(FC.MIXER_CONFIG);
        self.origMixerInputs = Mixer.cloneInputs(FC.MIXER_INPUTS);
        self.origMixerRules  = Mixer.cloneRules(FC.MIXER_RULES);

        self.isDirty = false;
        self.needSave = false;
        self.needReboot = false;

        self.MIXER_CONFIG_dirty = false;
        self.MIXER_INPUT1_dirty = false;
        self.MIXER_INPUT2_dirty = false;
        self.MIXER_INPUT3_dirty = false;
        self.MIXER_INPUT4_dirty = false;
        self.MIXER_RULES_dirty = false;

        self.overrideMixer.forEach(function(axis) {
            add_override(axis);
        });

        const enableOverrideSwitch = $('#mixerOverrideEnableSwitch');
        enableOverrideSwitch.prop('checked', FC.CONFIG.mixerOverrideEnabled);

        enableOverrideSwitch.change(function () {
            const checked = enableOverrideSwitch.prop('checked');
            FC.CONFIG.mixerOverrideEnabled = checked;
            $('.mixerOverrideAxis').toggle(!!checked);
            $('.mixerOverrideActive .mixerOverrideEnable input').prop('checked', checked).change();
        });

        $('.mixerOverrideAxis').toggle(!!FC.CONFIG.mixerOverrideEnabled);

        self.customConfig = false;

        self.customConfig |= (FC.MIXER_INPUTS[1].rate !=  FC.MIXER_INPUTS[2].rate &&
                              FC.MIXER_INPUTS[1].rate != -FC.MIXER_INPUTS[2].rate);

        self.customConfig |= (FC.MIXER_INPUTS[1].max !=  FC.MIXER_INPUTS[2].max);
        self.customConfig |= (FC.MIXER_INPUTS[1].min !=  FC.MIXER_INPUTS[2].min);

        self.customConfig |= (FC.MIXER_INPUTS[1].max != -FC.MIXER_INPUTS[1].min);
        self.customConfig |= (FC.MIXER_INPUTS[2].max != -FC.MIXER_INPUTS[2].min);
        self.customConfig |= (FC.MIXER_INPUTS[4].max != -FC.MIXER_INPUTS[4].min);

        if (self.customConfig) {
            $('.mixerCustomNote').show();
            $('.tab-mixer .configuration input,select').prop('disabled', true);
        }

        self.customRules = !Mixer.isNullMixer(FC.MIXER_RULES);

        if (self.customRules)
            $('.mixerRulesNote').show();

        const ailDir = (FC.MIXER_INPUTS[1].rate < 0) ? -1 : 1;
        const elevDir = (FC.MIXER_INPUTS[2].rate < 0) ? -1 : 1;
        const collDir = (FC.MIXER_INPUTS[4].rate < 0) ? -1 : 1;

        const collectiveRate = Math.abs(FC.MIXER_INPUTS[4].rate) * 0.1;
        const cyclicRate = Math.abs(FC.MIXER_INPUTS[1].rate) * 0.1;

        const collectiveMax = FC.MIXER_INPUTS[4].max * 0.012;
        const cyclicMax = FC.MIXER_INPUTS[2].max * 0.012;
        const totalMax = FC.MIXER_CONFIG.blade_pitch_limit * 0.012;

        const yawDir = (FC.MIXER_INPUTS[3].rate < 0) ? -1 : 1;
        const yawRate = Math.abs(FC.MIXER_INPUTS[3].rate) * 0.1;

        const mixerSwashType = $('#mixerSwashType');

        Mixer.swashTypes.forEach(function(name,index) {
            mixerSwashType.append($(`<option value="${index}">` + i18n.getMessage(name) + '</option>'));
        });

        mixerSwashType.val(FC.MIXER_CONFIG.swash_type);

        //$('#mixerSwashRing').val(FC.MIXER_CONFIG.swash_ring).change();
        $('#mixerAileronDirection').val(ailDir).change();
        $('#mixerElevatorDirection').val(elevDir).change();
        $('#mixerCollectiveDirection').val(collDir).change();
        $('#mixerMainRotorDirection').val(FC.MIXER_CONFIG.main_rotor_dir);

        $('#mixerSwashPhase').val(FC.MIXER_CONFIG.swash_phase * 0.1).change();

        $('#mixerSwashRollTrim').val(FC.MIXER_CONFIG.swash_trim[0] * 0.1).change();
        $('#mixerSwashPitchTrim').val(FC.MIXER_CONFIG.swash_trim[1] * 0.1).change();
        $('#mixerSwashCollectiveTrim').val(FC.MIXER_CONFIG.swash_trim[2] * 0.1).change();

        $('#mixerCyclicCalibration').val(cyclicRate).change();
        $('#mixerCollectiveCalibration').val(collectiveRate).change();
        $('#mixerCollectiveGeoCorrection').val(FC.MIXER_CONFIG.coll_geo_correction / 5).change();
        $('#mixerCollectiveLimit').val(collectiveMax).change();
        $('#mixerCyclicLimit').val(cyclicMax).change();
        $('#mixerTotalPitchLimit').val(totalMax).change();

        function setTailRotorMode(mode, change) {

            FC.MIXER_CONFIG.tail_rotor_mode = mode;

            $('#mixerTailRotorMode').val(mode);

            const motorised = (mode > 0);
            const enabled = Mixer.overrideEnabled(FC.MIXER_OVERRIDE[3]);

            $('.mixerTailMotor').toggle(motorised);
            $('.mixerTailRotor').toggle(!motorised);

            $('.mixerTailRotor .mixerOverrideEnable input').prop('checked', enabled && !motorised);
            $('.mixerTailMotor .mixerOverrideEnable input').prop('checked', enabled && motorised);

            if (motorised) {
                const yawMax = FC.MIXER_INPUTS[3].max * 0.1;
                const yawMin = FC.MIXER_INPUTS[3].min * 0.1;
                $('#mixerTailMotorMinYaw').val(yawMin.toFixed(1));
                $('#mixerTailMotorMaxYaw').val(yawMax.toFixed(1));
                $('#mixerTailMotorCenterTrim').val(FC.MIXER_CONFIG.tail_center_trim * 0.1);
                $('.mixerOverrideAxis .mixerTailMotor').addClass('mixerOverrideActive');
                $('.mixerOverrideAxis .mixerTailRotor').removeClass('mixerOverrideActive');
                if (change)
                    $('.mixerTailMotor .mixerOverrideEnable input').change();
            }
            else {
                const yawMax = FC.MIXER_INPUTS[3].max * 0.024;
                const yawMin = FC.MIXER_INPUTS[3].min * 0.024;
                $('#mixerTailRotorMinYaw').val(yawMin.toFixed(1));
                $('#mixerTailRotorMaxYaw').val(yawMax.toFixed(1));
                $('#mixerTailRotorCenterTrim').val(FC.MIXER_CONFIG.tail_center_trim * 0.024);
                $('.mixerOverrideAxis .mixerTailRotor').addClass('mixerOverrideActive');
                $('.mixerOverrideAxis .mixerTailMotor').removeClass('mixerOverrideActive');
                if (change)
                    $('.mixerTailRotor .mixerOverrideEnable input').change();
            }

            $('.mixerBidirNote').toggle(mode == 2);
        }

        $('#mixerTailRotorMode').change(function () {
            const val = $(this).val();
            setTailRotorMode(val, true);
        });

        setTailRotorMode(FC.MIXER_CONFIG.tail_rotor_mode, false);

        $('#mixerTailRotorDirection').val(yawDir).change();
        $('#mixerTailRotorCalibration').val(yawRate).change();
        $('#mixerTailMotorIdle').val(FC.MIXER_CONFIG.tail_motor_idle / 10).change();

        $('.tab-mixer .mixerReboot').change(function() {
            $('.tab-mixer .mixerRebootNote').show();
            $('select', this).addClass('attention');
            self.needReboot = true;
        });

        $('.tab-mixer .mixerConfig').change(function() {
            FC.MIXER_CONFIG.swash_type = parseInt($('#mixerSwashType').val());
            FC.MIXER_CONFIG.swash_phase = parseInt($('#mixerSwashPhase').val() * 10);
            //FC.MIXER_CONFIG.swash_ring = parseInt($('#mixerSwashRing').val());
            FC.MIXER_CONFIG.main_rotor_dir = parseInt($('#mixerMainRotorDirection').val());
            FC.MIXER_CONFIG.blade_pitch_limit = $('#mixerTotalPitchLimit').val() / 0.012;
            FC.MIXER_CONFIG.swash_trim[0] = parseInt($('#mixerSwashRollTrim').val() * 10);
            FC.MIXER_CONFIG.swash_trim[1] = parseInt($('#mixerSwashPitchTrim').val() * 10);
            FC.MIXER_CONFIG.swash_trim[2] = parseInt($('#mixerSwashCollectiveTrim').val() * 10);
            FC.MIXER_CONFIG.tail_rotor_mode = parseInt($('#mixerTailRotorMode').val());
            FC.MIXER_CONFIG.tail_motor_idle = parseInt($('#mixerTailMotorIdle').val() * 10);
            FC.MIXER_CONFIG.coll_geo_correction = parseInt($('#mixerCollectiveGeoCorrection').val() * 5);

            if (FC.MIXER_CONFIG.tail_rotor_mode > 0)
                FC.MIXER_CONFIG.tail_center_trim = parseInt($('#mixerTailMotorCenterTrim').val() * 10);
            else
                FC.MIXER_CONFIG.tail_center_trim = parseInt($('#mixerTailRotorCenterTrim').val() / 0.024);

            self.MIXER_CONFIG_dirty = true;
            self.needSave = true;
            setDirty();

            MSP.send_message(MSPCodes.MSP_SET_MIXER_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_MIXER_CONFIG));
        });

        $('.tab-mixer .mixerInput1').change(function() {
            const aileronDir = $('#mixerAileronDirection').val() * 1;
            const cyclicRate = $('#mixerCyclicCalibration').val() * 10;
            const cyclicMax = $('#mixerCyclicLimit').val() / 0.012;
            FC.MIXER_INPUTS[1].rate = cyclicRate * aileronDir;
            FC.MIXER_INPUTS[1].min = -cyclicMax;
            FC.MIXER_INPUTS[1].max =  cyclicMax;

            self.MIXER_INPUT1_dirty = true;
            self.needSave = true;
            setDirty();

            mspHelper.sendMixerInput(1);
        });

        $('.tab-mixer .mixerInput2').change(function() {
            const elevatorDir = $('#mixerElevatorDirection').val() * 1;
            const cyclicRate = $('#mixerCyclicCalibration').val() * 10;
            const cyclicMax = $('#mixerCyclicLimit').val() / 0.012;
            FC.MIXER_INPUTS[2].rate = cyclicRate * elevatorDir;
            FC.MIXER_INPUTS[2].min = -cyclicMax;
            FC.MIXER_INPUTS[2].max =  cyclicMax;

            self.MIXER_INPUT2_dirty = true;
            self.needSave = true;
            setDirty();

            mspHelper.sendMixerInput(2);
        });

        $('.tab-mixer .mixerInput3').change(function() {
            const yawDir = $('#mixerTailRotorDirection').val() * 1;
            const yawRate = $('#mixerTailRotorCalibration').val() * 10;

            let yawMin = 0.0, yawMax = 0.0;

            if (FC.MIXER_CONFIG.tail_rotor_mode > 0) {
                yawMin = $('#mixerTailMotorMinYaw').val() / 0.1;
                yawMax = $('#mixerTailMotorMaxYaw').val() / 0.1;
            }
            else {
                yawMin = $('#mixerTailRotorMinYaw').val() / 0.024;
                yawMax = $('#mixerTailRotorMaxYaw').val() / 0.024;
            }

            FC.MIXER_INPUTS[3].rate = yawRate * yawDir;
            FC.MIXER_INPUTS[3].min = yawMin;
            FC.MIXER_INPUTS[3].max = yawMax;

            self.MIXER_INPUT3_dirty = true;
            self.needSave = true;
            setDirty();

            mspHelper.sendMixerInput(3);
        });

        $('.tab-mixer .mixerInput4').change(function() {
            const collectiveDir = $('#mixerCollectiveDirection').val() * 1;
            const collectiveRate = $('#mixerCollectiveCalibration').val() * 10;
            const collectiveMax = $('#mixerCollectiveLimit').val() / 0.012;
            FC.MIXER_INPUTS[4].rate = collectiveRate * collectiveDir;
            FC.MIXER_INPUTS[4].min = -collectiveMax;
            FC.MIXER_INPUTS[4].max =  collectiveMax;

            self.MIXER_INPUT4_dirty = true;
            self.needSave = true;
            setDirty();

            mspHelper.sendMixerInput(4);
        });
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks
        data_to_form();

        // Hide the buttons toolbar
        $('.tab-mixer').addClass('toolbar_hidden');

        self.save = function (callback) {
            save_data(callback);
        };

        self.revert = function (callback) {
            FC.MIXER_CONFIG = self.origMixerConfig;
            FC.MIXER_INPUTS = self.origMixerInputs;

            self.needSave = false;
            self.needReboot = false;

            save_data(callback);
        };

        $('a.save').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.reboot').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

         GUI.content_ready(callback);
    }
};

TABS.mixer.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};


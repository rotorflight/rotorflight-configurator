'use strict';

TABS.mixer = {

    MIXER_OVERRIDE_OFF: 2501,

    MIXER_CONFIG_dirty: false,
    MIXER_INPUTS_dirty: false,
    MIXER_RULES_dirty: false,

    swashType: 0,
    tailMode: 0,

    prevInputs: null,
    prevRules: null,

    showInputs: [ 1,2,3,4,5 ],
    showOverrides: [ 1,2,3,4, ],

};

TABS.mixer.initialize = function (callback) {

    const self = this;

    if (GUI.active_tab !== 'mixer') {
        GUI.active_tab = 'mixer';
    }

    MSP.promise(MSPCodes.MSP_STATUS)
        .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
        .then(() => MSP.promise(MSPCodes.MSP_MIXER_INPUTS))
        .then(() => MSP.promise(MSPCodes.MSP_MIXER_RULES))
        .then(() => load_html());

    function load_html() {
        $('#content').load("./tabs/mixer.html", process_html);
    }

    function add_input(inputIndex) {

        const mixerInput = $('#tab-mixer-templates .mixerInputTemplate tr').clone();

        const inputName = mixerInput.find('#name');
        const inputRate = mixerInput.find('#rate');
        const inputMin  = mixerInput.find('#min');
        const inputMax  = mixerInput.find('#max');

        const input = FC.MIXER_INPUTS[inputIndex];

        mixerInput.attr('class', `mixerInput${inputIndex}`);
        mixerInput.data('index', inputIndex);

        inputName.text(i18n.getMessage(Mixer.inputNames[inputIndex]));
        inputRate.val(input.rate);
        inputMax.val(input.max);
        inputMin.val(input.min);

        $('.mixerInputs tbody').append(mixerInput);

        mixerInput.change(function() {
            input.rate = parseInt(inputRate.val());
            input.max = parseInt(inputMax.val());
            input.min = parseInt(inputMin.val());

            mspHelper.sendMixerInput(inputIndex);
        });
    }

    function add_override(inputIndex) {

        const mixerOverride = $('#tab-mixer-templates .mixerOverrideTemplate tr').clone();

        const mixerSlider = mixerOverride.find('.mixerOverrideSlider');
        const mixerEnable = mixerOverride.find('.mixerOverrideEnable input');
        const mixerInput  = mixerOverride.find('.mixerOverrideInput input');

        mixerOverride.attr('class', `mixerOverride${inputIndex}`);
        mixerOverride.find('.mixerOverrideName').text(i18n.getMessage(Mixer.inputNames[inputIndex]));

        function isAngle(index) {
            switch (index) {
                case 1: // Stabilized Roll
                case 2: // Stabilized Pitch
                case 3: // Stabilized Yaw
                case 4: // Stabilized Collective
                    return true;
                case 6: // Commanded Roll
                case 7: // Commanded Pitch
                case 8: // Commanded Yaw
                case 9: // Commanded Collective
                    return true;
            }
            return false;
        }

        if (isAngle(inputIndex)) {
            mixerInput.attr('min', '-18');
            mixerInput.attr('max', '18');
            mixerInput.attr('step', '1');

            mixerSlider.noUiSlider({
                range: {
                    'min': -18,
                    'max':  18,
                },
                start: 0,
                step: 1,
                behaviour: 'snap-drag',
            });

            mixerOverride.find('.pips-range').noUiSlider_pips({
                mode: 'values',
                values: [ -18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15, 18, ],
                density: 100 / ((18 + 18) / 1),
                stepped: true,
                format: wNumb({
                    decimals: 0,
                }),
            });
        }
        else {
            mixerInput.attr('min', '-1500');
            mixerInput.attr('max', '1500');
            mixerInput.attr('step', '50');

            mixerSlider.noUiSlider({
                range: {
                    'min': -1500,
                    'max':  1500,
                },
                start: 0,
                step: 50,
                behaviour: 'snap-drag',
            });

            mixerOverride.find('.pips-range').noUiSlider_pips({
                mode: 'values',
                values: [ -1500, -1000, -500, 0, 500, 1000, 1500, ],
                density: 100 / ((1500 + 1500) / 100),
                stepped: true,
                format: wNumb({
                    decimals: 0,
                }),
            });
        }

        mixerSlider.on('slide', function () {
            mixerInput.val(parseInt($(this).val()));
        });

        mixerSlider.on('change', function () {
            mixerInput.change();
        });

        mixerInput.change(function () {
            let value = $(this).val();
            mixerSlider.val(value);
            if (isAngle(inputIndex))
                value = value / 12 * 1000;
            FC.MIXER_OVERRIDE[inputIndex] = Math.round(value);
            mspHelper.sendMixerOverride(inputIndex);
        });

        mixerEnable.change(function () {
            const check = $(this).prop('checked');
            const value = check ? 0 : self.OVERRIDE_OFF;

            mixerInput.val(0);
            mixerSlider.val(0);
            mixerInput.prop('disabled', !check);
            mixerSlider.attr('disabled', !check);

            FC.MIXER_OVERRIDE[inputIndex] = value;
            mspHelper.sendMixerOverride(inputIndex);
        });

        let value = FC.MIXER_OVERRIDE[inputIndex];
        let check = (value >= -2500 && value <= 2500);

        if (isAngle(inputIndex))
            value = value / 1000 * 12;

        value = check ? Math.round(value) : 0;

        mixerInput.val(value);
        mixerSlider.val(value);

        mixerInput.prop('disabled', !check);
        mixerSlider.attr('disabled', !check);
        mixerEnable.prop('checked', check);

        $('.mixerOverride tbody').append(mixerOverride);
    }

    function data_to_form() {

        self.MIXER_CONFIG_dirty = false;
        self.MIXER_INPUTS_dirty = false;
        self.MIXER_RULES_dirty = false;

        self.prevInputs = Mixer.cloneInputs(FC.MIXER_INPUTS);
        self.prevRules = Mixer.cloneRules(FC.MIXER_RULES);

        self.tailMode = FC.MIXER_CONFIG.tail_rotor_mode;

        const mixer = Mixer.findMixer(FC.MIXER_RULES);

        if (mixer > 6) {
            if (self.tailMode > 0)
                self.swashType = mixer - 6;
            else
                self.swashType = 0;
        }
        else if (mixer > 0) {
            if (self.tailMode > 0)
                self.swashType = 0;
            else
                self.swashType = mixer;
        }
        else {
            self.swashType = 0;
        }

        const mixerSwashType = $('.tab-mixer #mixerSwashType');

        Mixer.swashTypes.forEach(function(name,index) {
            mixerSwashType.append($(`<option value="${index}">` + i18n.getMessage(name)  + '</option>'));
        });

        const mixerRuleOpers   = $('.mixerRuleTemplate #oper');
        const mixerRuleInputs  = $('.mixerRuleTemplate #input');
        const mixerRuleOutputs = $('.mixerRuleTemplate #output');

        Mixer.operNames.forEach(function(name,index) {
            mixerRuleOpers.append($(`<option value="${index}">` + i18n.getMessage(name)  + '</option>'));
        });

        Mixer.inputNames.forEach(function(name,index) {
            mixerRuleInputs.append($(`<option value="${index}">` + i18n.getMessage(name)  + '</option>'));
        });

        Mixer.outputNames.forEach(function(name,index) {
            mixerRuleOutputs.append($(`<option value="${index}">` + i18n.getMessage(name) + '</options>'));
        });

        self.showInputs.forEach(function(index) {
            add_input(index);
        });

        if (!FC.CONFIG.mixerOverrideDisabled) {
            self.showOverrides.forEach(function(index) {
                add_override(index);
            });
        }

        $('.tab-mixer .override').toggle(!FC.CONFIG.mixerOverrideDisabled);

        mixerSwashType.change(function () {
            const swashType = parseInt( $(this).val() );
            if (swashType == 0) {
                $('.dialogCustomMixer')[0].showModal();
                $(this).val(self.swashType);
            }
        });

        $('.tab-mixer #mixerTailRotorMode').change(function () {
            $('.tailRotorMotorized').toggle( $(this).val() != 0 );
        });

        $('.tailRotorMotorized').toggle( self.tailMode != 0 );

        $('.tab-mixer #mixerMainRotorDirection').val(FC.MIXER_CONFIG.main_rotor_dir);
        $('.tab-mixer #mixerSwashType').val(self.swashType);
        $('.tab-mixer #mixerSwashRing').val(FC.MIXER_CONFIG.swash_ring);

        $('.tab-mixer #mixerTailRotorMode').val(self.tailMode);
        $('.tab-mixer #mixerTailMotorIdle').val(FC.MIXER_CONFIG.tail_motor_idle);
    }

    function form_to_data() {

        const swashType = parseInt($('.tab-mixer #mixerSwashType').val());
        const tailMode  = parseInt($('.tab-mixer #mixerTailRotorMode').val());

        if (swashType != self.swashType || tailMode != self.tailMode) {
            FC.MIXER_RULES = Mixer.getMixer(swashType, tailMode);
            self.MIXER_RULES_dirty = true;
        }

        FC.MIXER_CONFIG.main_rotor_dir = parseInt($('.tab-mixer #mixerMainRotorDirection').val());
        FC.MIXER_CONFIG.swash_ring = parseInt($('.tab-mixer #mixerSwashRing').val());

        FC.MIXER_CONFIG.tail_rotor_mode = tailMode;
        FC.MIXER_CONFIG.tail_motor_idle = parseInt($('.tab-mixer #mixerTailMotorIdle').val());
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // Initialize mixer helper
        Mixer.initialize();

        // Update form
        data_to_form();

        // UI Hooks

        $('.mixerConfigs').change(function () {
            self.MIXER_CONFIG_dirty = true;
        });

        $('.mixerInputs').change(function () {
            self.MIXER_INPUTS_dirty = true;
        });

        $('.mixerRules').change(function () {
            self.MIXER_RULES_dirty = true;
        });

        $('a.revert').click(function () {
            function send_mixer_inputs() {
                if (self.MIXER_INPUTS_dirty)
                    mspHelper.sendMixerInputs(send_mixer_rules);
                else
                    send_mixer_rules();
            }
            function send_mixer_rules() {
                if (self.MIXER_RULES_dirty)
                    mspHelper.sendMixerRules(send_done);
                else
                    send_done();
            }
            function send_done() {
                self.refresh();
            }

            FC.MIXER_RULES = self.prevRules;
            FC.MIXER_INPUTS = self.prevInputs;

            send_mixer_inputs();
        });

        $('a.save').click(function () {
            function send_mixer_config() {
                if (self.MIXER_CONFIG_dirty)
                    MSP.send_message(MSPCodes.MSP_SET_MIXER_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_MIXER_CONFIG), false, send_mixer_inputs);
                else
                    send_mixer_inputs();
            }
            function send_mixer_inputs() {
                if (self.MIXER_INPUTS_dirty)
                    mspHelper.sendMixerInputs(send_mixer_rules);
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
                if (self.MIXER_CONFIG_dirty || self.MIXER_INPUTS_dirty || self.MIXER_RULES_dirty)
                    MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, eeprom_saved);
                else
                    self.refresh();
            }
            function eeprom_saved() {
                GUI.log(i18n.getMessage('eepromSaved'));
                self.refresh();
            }

            form_to_data();
            send_mixer_config();
        });

        $('.dialogCustomMixer-closebtn').click(function() {
            $('.dialogCustomMixer')[0].close();
        });

        GUI.content_ready(callback);
    }

};


TABS.mixer.cleanup = function (callback) {
    const self = this;

    if (callback) callback();
};

TABS.mixer.refresh = function (callback) {
    const self = this;

    GUI.tab_switch_cleanup(function () {
        self.initialize();

        if (callback) callback();
    });
};


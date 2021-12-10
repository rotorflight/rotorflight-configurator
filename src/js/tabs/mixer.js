'use strict';

TABS.mixer = {

    MIXER_CONFIG_dirty: false,
    MIXER_INPUTS_dirty: false,
    MIXER_RULES_dirty: false,

    swashType: 0,
    tailMode: 0,

    showInputs: [ 1,2,3,4,5 ],

    inputNames: [
        'mixerInputNone',
        'mixerInputStabilizedRoll',
        'mixerInputStabilizedPitch',
        'mixerInputStabilizedYaw',
        'mixerInputStabilizedCollective',
        'mixerInputStabilizedThrottle',
        'mixerInputRCCommandRoll',
        'mixerInputRCCommandPitch',
        'mixerInputRCCommandYaw',
        'mixerInputRCCommandCollective',
        'mixerInputRCCommandThrottle',
        'mixerInputRCChannelRoll',
        'mixerInputRCChannelPitch',
        'mixerInputRCChannelYaw',
        'mixerInputRCChannelCollective',
        'mixerInputRCChannelThrottle',
        'mixerInputRCChannelAux1',
        'mixerInputRCChannelAux2',
        'mixerInputRCChannelAux3',
        'mixerInputRCChannel9',
        'mixerInputRCChannel10',
        'mixerInputRCChannel11',
        'mixerInputRCChannel12',
        'mixerInputRCChannel13',
        'mixerInputRCChannel14',
        'mixerInputRCChannel15',
        'mixerInputRCChannel16',
        'mixerInputRCChannel17',
        'mixerInputRCChannel18',
    ],

    outputNames: [
        'mixerOutputNone',
        'mixerOutputMotor1',
        'mixerOutputMotor2',
        'mixerOutputMotor3',
        'mixerOutputMotor4',
        'mixerOutputServo1',
        'mixerOutputServo2',
        'mixerOutputServo3',
        'mixerOutputServo4',
        'mixerOutputServo5',
        'mixerOutputServo6',
        'mixerOutputServo7',
        'mixerOutputServo8',
    ],

    operNames: [
        'mixerRuleNOP',
        'mixerRuleSet',
        'mixerRuleAdd',
        'mixerRuleMul',
    ],

    swashTypes: [
        'mixerSwashTypeCustom',
        'mixerSwashType1',
        'mixerSwashType2',
        'mixerSwashType3',
        'mixerSwashType4',
        'mixerSwashType5',
        'mixerSwashType6',
    ],
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

        inputName.text(i18n.getMessage(self.inputNames[inputIndex]));
        inputRate.val(input.rate);
        inputMax.val(input.max);
        inputMin.val(input.min);

        $('.mixerControls tbody').append(mixerInput);

        mixerInput.find('.MIXER_INPUT').change(function() {
            input.rate = parseInt(inputRate.val());
            input.max = parseInt(inputMax.val());
            input.min = parseInt(inputMin.val());

            mspHelper.sendMixerInput(inputIndex);
        });
    }

    function data_to_form() {

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

        const mixerSwashTypes = $('.tab-mixer #mixerSwashType');

        self.swashTypes.forEach(function(name,index) {
            mixerSwashTypes.append($(`<option value="${index}">` + i18n.getMessage(name)  + '</option>'));
        });

        const mixerRuleOpers   = $('.mixerRuleTemplate #oper');
        const mixerRuleInputs  = $('.mixerRuleTemplate #input');
        const mixerRuleOutputs = $('.mixerRuleTemplate #output');

        self.operNames.forEach(function(name,index) {
            mixerRuleOpers.append($(`<option value="${index}">` + i18n.getMessage(name)  + '</option>'));
        });

        self.inputNames.forEach(function(name,index) {
            mixerRuleInputs.append($(`<option value="${index}">` + i18n.getMessage(name)  + '</option>'));
        });

        self.outputNames.forEach(function(name,index) {
            mixerRuleOutputs.append($(`<option value="${index}">` + i18n.getMessage(name) + '</options>'));
        });

        self.showInputs.forEach(function(index) {
            add_input(index);
        });

        $('.tab-mixer #mixerSwashType').change(function () {
            const swashType = parseInt( $(this).val() );
            if (swashType == 0) {
                $('.dialogCustomMixer')[0].showModal();
                $(this).val(self.swashType);
            }
        });

        $('.tab-mixer #mixerTailRotorMode').change(function () {
            $('.tailRotorMotorized').toggle( $(this).val() != 0 );
        });

        $('.tab-mixer #mixerMainRotorDirection').val(FC.MIXER_CONFIG.main_rotor_dir);
        $('.tab-mixer #mixerSwashType').val(self.swashType);
        $('.tab-mixer #mixerSwashRing').val(FC.MIXER_CONFIG.swash_ring);

        $('.tab-mixer #mixerTailRotorMode').val(self.tailMode).change();
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

        $('.MIXER_CONFIG').change(function () {
            self.MIXER_CONFIG_dirty = true;
        });

        $('.MIXER_INPUT').change(function () {
            self.MIXER_INPUTS_dirty = true;
        });

        //$('.MIXER_RULE').change(function () {
        //    self.MIXER_RULES_dirty = true;
        //});

        $('a.refresh').click(function () {
            self.refresh();
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
                GUI.log(i18n.getMessage('mixerEepromSaved'));
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
        self.MIXER_CONFIG_dirty = false;
        self.MIXER_INPUTS_dirty = false;
        self.MIXER_RULES_dirty = false;

        if (callback) callback();
    });
};


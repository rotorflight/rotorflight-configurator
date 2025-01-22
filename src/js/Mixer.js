export const Mixer = {

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
        'mixerSwashType0',
        'mixerSwashType1',
        'mixerSwashType2',
        'mixerSwashType3',
        'mixerSwashType4',
        'mixerSwashType5',
        'mixerSwashType6',
    ],

    UNINIT: -1,

    TAIL_MODE_VARIABLE:       0,
    TAIL_MODE_MOTORIZED:      1,
    TAIL_MODE_BIDIRECTIONAL:  2,

    SWASH_TYPE_NONE:    0,
    SWASH_TYPE_THRU:    1,
    SWASH_TYPE_120:     2,
    SWASH_TYPE_135:     3,
    SWASH_TYPE_140:     4,
    SWASH_TYPE_90L:     5,
    SWASH_TYPE_90V:     6,

    RULE_COUNT: 32,

    OVERRIDE_MIN: -2500,
    OVERRIDE_MAX:  2500,
    OVERRIDE_OFF:  2501,
    OVERRIDE_PASSTHROUGH:  2502,


    //// Functions

    nullRule: function ()
    {
        return { oper: 0, src: 0, dst: 0, weight: 0, offset: 0 };
    },

    cloneRule: function (a)
    {
        return Object.assign({}, a);
    },

    compareRule : function (a, b)
    {
        return( a.oper   === b.oper &&
                a.src    === b.src &&
                a.dst    === b.dst &&
                a.weight === b.weight &&
                a.offset === b.offset );
    },

    cloneRules : function (a)
    {
        const self = this;
        const copy = [];

        if (a) {
            a.forEach(function (rule) {
                copy.push(self.cloneRule(rule));
            });
        }

        return copy;
    },

    isNullRule : function (a) {
        return( a.oper   == 0 &&
                a.src    == 0 &&
                a.dst    == 0 &&
                a.weight == 0 &&
                a.offset == 0 );
    },

    isNullMixer : function (a) {
        const self = this;

        for (let i=0; i<a.length; i++)
            if (!self.isNullRule(a[i]))
                return false;

        return true;
    },

    compareMixer : function (a, b, cnt)
    {
        const self = this;

        for (let i=0; i<cnt; i++)
            if (!self.compareRule(a[i],b[i]))
                return false;

        return true;
    },

    cloneInput : function (a)
    {
        return Object.assign({}, a);
    },

    cloneInputs : function (a)
    {
        const b = [];

        a.forEach( function (input) {
            b.push(Mixer.cloneInput(input));
        });

        return b;
    },

    cloneConfig : function (orig)
    {
        const copy = Object.assign({}, orig);

        copy.swash_trim = Array.from(orig.swash_trim);

        return copy;
    },

    overrideEnabled : function (value)
    {
        const enabled = ((value >= Mixer.OVERRIDE_MIN && value <= Mixer.OVERRIDE_MAX) || value == Mixer.OVERRIDE_PASSTHROUGH);

        return enabled;
    },

    passthroughEnabled : function (value)
    {
        const enabled = (value == Mixer.OVERRIDE_PASSTHROUGH);

        return enabled;
    },

};

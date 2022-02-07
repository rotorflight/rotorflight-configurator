'use strict';

const Mixer = {

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
        'mixerSwashType7',
        'mixerSwashType8',
        'mixerSwashType9',
    ],

    UNINIT: -1,
    CUSTOM:  0,
    CP120F:  1,
    CP120R:  2,
    CP140F:  3,
    CP140R:  4,
    CP135F:  5,
    CP135R:  6,
    FP90AE:  7,
    FP45LR:  8,
    PSSTHR:  9,

    RULE_COUNT: 32,

    mixerRuleSets: [],


    //// Functions

    nullRule: function ()
    {
        return { oper: 0, src: 0, dst: 0, weight: 0, offset: 0, modes: 0 };
    },

    cloneRule: function (a)
    {
        return { oper: a.oper, src: a.src, dst: a.dst, weight: a.weight, offset: a.offset, modes: a.modes };
    },

    compareRule : function (a, b)
    {
        return( a.modes  === b.modes &&
                a.oper   === b.oper &&
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
        return( a.modes  == 0 &&
                a.oper   == 0 &&
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

    findMixer : function (ruleset)
    {
        const self = this;

        if (self.isNullMixer(ruleset))
            return self.UNINIT;

        for (let i=1; i<self.mixerRuleSets.length; i++)
            if (self.compareMixer(ruleset, self.mixerRuleSets[i], self.RULE_COUNT))
                return i;

        return self.CUSTOM;
    },

    getMixer : function (swashType)
    {
        const self = this;

        return self.cloneRules( self.mixerRuleSets[swashType] );
    },

    cloneInput : function (a)
    {
        return { rate: a.rate, max: a.max, min: a.min, };
    },

    cloneInputs : function (a)
    {
        const b = [];

        a.forEach( function (input) {
            b.push(Mixer.cloneInput(input));
        });

        return b;
    },

    initialize : function (tailMode)
    {
        const self = this;

        const NONE = 0;

        const NOP = 0,
              SET = 1,
              ADD = 2,
              MUL = 3;

        const S0 = 0,
              SR = 1,
              SP = 2,
              SY = 3,
              SC = 4,
              ST = 5,
              CR = 6,
              CP = 7,
              CY = 8,
              CC = 9,
              CT = 10,
              RR = 11,
              RP = 12,
              RY = 13,
              RC = 14,
              RT = 15;

        const D0 = 0,
              S1 = 1,
              S2 = 2,
              S3 = 3,
              S4 = 4,
              S5 = 5,
              S6 = 6,
              S7 = 7,
              S8 = 8,
              M1 = 9,
              M2 = 10,
              M3 = 11,
              M4 = 12;

        const TAIL_MODE_VARIABLE = 0,
              TAIL_MODE_MOTORIZED = 1,
              TAIL_MODE_BIDIRECTIONAL = 2;

        function rule(oper = 0, src = 0, dst = 0, weight = 0, offset = 0, modes = 0)
        {
            return { oper: oper, src: src, dst: dst, weight: weight, offset: offset, modes: modes };
        }

        self.mixerRuleSets[Mixer.CP120F] = [
            rule(ADD, SR, S2,   866),
            rule(ADD, SR, S3,  -866),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   500),
            rule(ADD, SP, S3,   500),
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP120R] = [
            rule(ADD, SR, S2,   866),
            rule(ADD, SR, S3,  -866),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -500),
            rule(ADD, SP, S3,  -500),
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP140F] = [
            rule(ADD, SR, S2,   643),
            rule(ADD, SR, S3,  -643),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   766),
            rule(ADD, SP, S3,   766),
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP140R] = [
            rule(ADD, SR, S2,   643),
            rule(ADD, SR, S3,  -643),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -766),
            rule(ADD, SP, S3,  -766),
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP135F] = [
            rule(ADD, SR, S2,   707),
            rule(ADD, SR, S3,  -707),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   707),
            rule(ADD, SP, S3,   707),
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP135R] = [
            rule(ADD, SR, S2,   707),
            rule(ADD, SR, S3,  -707),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -707),
            rule(ADD, SP, S3,  -707),
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.FP90AE] = [
            rule(ADD, SR, S1,  1000),
            rule(ADD, SP, S2,  1000),
            rule(ADD, ST, M1,   750),
            rule(ADD, SC, M1,   250),
        ];

        self.mixerRuleSets[Mixer.FP45LR] = [
            rule(ADD, SR, S1,  1000),
            rule(ADD, SR, S2, -1000),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  1000),
            rule(ADD, ST, M1,   750),
            rule(ADD, SC, M1,   250),
        ];

        self.mixerRuleSets[Mixer.PSSTHR] = [
            rule(ADD, SR, S1,  1000),
            rule(ADD, SP, S2,  1000),
            rule(ADD, SC, S3,  1000),
            rule(ADD, ST, M1,  1000),
        ];

        if (tailMode == TAIL_MODE_VARIABLE) {
            self.mixerRuleSets.forEach(function (rules) {
                rules.push(rule(SET, SY, S4, 1000));
            });
        }
        else {
            self.mixerRuleSets.forEach(function (rules) {
                rules.push(rule(SET, SY, M2, 1000));
            });
        }

        self.mixerRuleSets.forEach(function (rules) {
            for (let i=0; i<self.RULE_COUNT; i++) {
                if (rules[i] === undefined)
                    rules[i] = self.nullRule();
            }
        });
    },

};

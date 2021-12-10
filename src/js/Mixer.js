'use strict';


const Mixer = {

    CP120FV: 1,
    CP120RV: 2,
    CP140FV: 3,
    CP140RV: 4,
    CP135FV: 5,
    CP135RV: 6,
    CP120FM: 7,
    CP120RM: 8,
    CP140FM: 9,
    CP140RM: 10,
    CP135FM: 11,
    CP135RM: 12,

    RULE_COUNT: 32,

    mixerRuleSets: [],

    nullRule : function (a)
    {
        if (a === undefined)
            return true;

        if (a.oper === 0 && a.src === 0 && a.dst === 0 && a.weight === 0 && a.offset === 0 && a.modes === 0)
            return true;

        return false;
    },

    compareRule : function (a, b)
    {
        const self = this;

        if (self.nullRule(a) && self.nullRule(b))
            return true;

        if (a.oper === b.oper && a.src === b.src && a.dst === b.dst &&
            a.weight === b.weight && a.offset === b.offset && a.modes === b.modes)
            return true;

        return false;
    },

    compareMixer : function (a, b)
    {
        const self = this;

        for (let i=0; i<self.RULE_COUNT; i++)
            if (!self.compareRule(a[i],b[i]))
                return false;

        return true;
    },

    findMixer : function (ruleset)
    {
        const self = this;

        for (let i=1; i<self.mixerRuleSets.length; i++)
            if (self.compareMixer(ruleset, self.mixerRuleSets[i]))
                return i;

        return 0;
    },

    getMixer : function (swash, mode)
    {
        const self = this;

        var src = self.mixerRuleSets[swash + 6 * mode];
        var dst = [];

        for (let i=0; i<self.RULE_COUNT; i++) {
            if (src && src[i])
                dst[i] = { oper: src[i].oper, src: src[i].src, dst: src[i].dst, weight: src[i].weight, offset: src[i].offset, modes: src[i].modes };
            else
                dst[i] = { oper: 0, src: 0, dst: 0, weight: 0, offset: 0, modes: 0 };
        }

        return dst;
    },

    initialize : function ()
    {
        const self = this;

        const NONE = 0;

        const NOP = 0,
              SET = 1,
              ADD = 2,
              MUL = 3;

        const SR = 1,
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

        const S1 = 1,
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

        function rule(oper = 0, src = 0, dst = 0, weight = 0, offset = 0, modes = 0)
        {
            return { oper: oper, src: src, dst: dst, weight: weight, offset: offset, modes: modes };
        }

        self.mixerRuleSets[Mixer.CP120FV] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   866),
            rule(ADD, SR, S3,  -866),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -500),
            rule(ADD, SP, S3,  -500),
            rule(SET, SY, S4,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP120RV] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   866),
            rule(ADD, SR, S3,  -866),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   500),
            rule(ADD, SP, S3,   500),
            rule(SET, SY, S4,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP140FV] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   643),
            rule(ADD, SR, S3,  -643),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -766),
            rule(ADD, SP, S3,  -766),
            rule(SET, SY, S4,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP140RV] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   643),
            rule(ADD, SR, S3,  -643),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   766),
            rule(ADD, SP, S3,   766),
            rule(SET, SY, S4,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP135FV] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   707),
            rule(ADD, SR, S3,  -707),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -707),
            rule(ADD, SP, S3,  -707),
            rule(SET, SY, S4,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP135RV] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   707),
            rule(ADD, SR, S3,  -707),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   707),
            rule(ADD, SP, S3,   707),
            rule(SET, SY, S4,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP120FM] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   866),
            rule(ADD, SR, S3,  -866),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -500),
            rule(ADD, SP, S3,  -500),
            rule(SET, SY, M2,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP120RM] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   866),
            rule(ADD, SR, S3,  -866),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   500),
            rule(ADD, SP, S3,   500),
            rule(SET, SY, M2,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP140FM] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   643),
            rule(ADD, SR, S3,  -643),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -766),
            rule(ADD, SP, S3,  -766),
            rule(SET, SY, M2,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP140RM] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   643),
            rule(ADD, SR, S3,  -643),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   766),
            rule(ADD, SP, S3,   766),
            rule(SET, SY, M2,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP135FM] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   707),
            rule(ADD, SR, S3,  -707),
            rule(ADD, SP, S1,  1000),
            rule(ADD, SP, S2,  -707),
            rule(ADD, SP, S3,  -707),
            rule(SET, SY, M2,  1000),
            rule(SET, ST, M1,  1000),
        ];

        self.mixerRuleSets[Mixer.CP135RM] = [
            rule(ADD, SC, S1,   500),
            rule(ADD, SC, S2,   500),
            rule(ADD, SC, S3,   500),
            rule(ADD, SR, S2,   707),
            rule(ADD, SR, S3,  -707),
            rule(ADD, SP, S1, -1000),
            rule(ADD, SP, S2,   707),
            rule(ADD, SP, S3,   707),
            rule(SET, SY, M2,  1000),
            rule(SET, ST, M1,  1000),
        ];

    },

};


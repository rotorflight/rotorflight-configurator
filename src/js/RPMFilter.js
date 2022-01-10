'use strict';

const RPMFilter = {

    MAX_NOTCH_COUNT: 16,

    MAIN_MOTOR_HARMONICS: 1,
    TAIL_MOTOR_HARMONICS: 1,
    MAIN_ROTOR_HARMONICS: 4,
    TAIL_ROTOR_HARMONICS: 4,

    MAIN_MOTOR_SRC: 10,
    MAIN_ROTOR_SRC: 11,
    TAIL_MOTOR_SRC: 20,
    TAIL_ROTOR_SRC: 21,

    mainMotorHarmonics: 0,
    mainRotorHarmonics: 0,
    tailMotorHarmonics: 0,
    tailRotorHarmonics: 0,

    doubleNotchSeparation: 0.01,


    aboutEQ: function(a,b,tol)
    {
        return Math.abs(a - b) < tol;
    },

    nullNotch: function ()
    {
        return { rpm_source: 0, freq_ratio: 0, notch_q: 0, min_hz: 0, max_hz: 0, };
    },

    newNotch: function (rpm_source, freq_ratio, notch_q, min_hz, max_hz)
    {
        return { rpm_source: rpm_source, freq_ratio: freq_ratio, notch_q: notch_q, min_hz: min_hz, max_hz: max_hz, };
    },

    cloneNotch: function (a)
    {
        return { rpm_source: a.rpm_source, freq_ratio: a.freq_ratio, notch_q: a.notch_q, min_hz: a.min_hz, max_hz: a.max_hz, };
    },

    compareNotch : function (a, b)
    {
        return( a.rpm_source  == b.rpm_source &&
                a.freq_ratio  == b.freq_ratio &&
                a.notch_q     == b.notch_q &&
                a.min_hz      == b.min_hz &&
                a.max_hz      == b.max_hz );
    },

    isNullNotch : function (a)
    {
        return( a.rpm_source  == 0 );
    },

    eraseBankNotches : function(bank, index)
    {
        const self = this;

        index.forEach(function (item) {
            bank[item] = self.nullNotch();
        });
    },

    cloneBank : function (a)
    {
        const self = this;
        const copy = [];

        a.forEach(function (notch) {
            copy.push(self.cloneNotch(notch));
        });

        return copy;
    },

    compareBank : function (a, b)
    {
        const self = this;

        for (let i=0; i<self.MAX_NOTCH_COUNT; i++)
            if (!self.compareNotch(a[i],b[i]))
                return false;

        return true;
    },

    isNullBank : function (a)
    {
        const self = this;

        for (let i=0; i<self.MAX_NOTCH_COUNT; i++)
            if (!self.isNullNotch(a[i]))
                return false;

        return true;
    },

    fillUpBank : function(bank)
    {
        const self = this;

        while (bank.length < self.MAX_NOTCH_COUNT)
            bank.push(self.nullNotch());

        return bank;
    },

    findNotchAt : function(bank, source, ratio)
    {
        const self = this;

        for (let i=0; i<bank.length; i++) {
            if (bank[i].rpm_source == source && bank[i].freq_ratio == ratio)
                return i;
        }

        return undefined;
    },

    findNotchBetween : function(bank, source, ratioLow, ratioHigh)
    {
        const self = this;

        for (let i=0; i<bank.length; i++) {
            if (bank[i].rpm_source == source && bank[i].freq_ratio >= ratioLow && bank[i].freq_ratio <= ratioHigh)
                return i;
        }

        return undefined;
    },

    findSingleNotch : function(bank, source, harm)
    {
        const self = this;

        const ratio = 10000 / harm;

        const ratio1 = Math.floor(ratio) - 2;
        const ratio2 = Math.ceil(ratio) + 2;

        const index = self.findNotchBetween(bank, source, ratio1, ratio2);

        if (index != undefined) {
            return [index];
        }

        return undefined;
    },

    findDoubleNotch : function(bank, source, harm)
    {
        const self = this;

        const ratio = 10000 / harm;

        const index1 = self.findNotchBetween(bank, source, ratio + 5, ratio * 1.05);
        const index2 = self.findNotchBetween(bank, source, ratio * 0.95, ratio - 5);

        if (index1 != undefined && index2 != undefined && index1 != index2)
        {
            if (bank[index1].notch_q == bank[index2].notch_q &&
                bank[index1].min_hz  == bank[index2].min_hz &&
                bank[index1].max_hz  == bank[index2].max_hz) {
                const dist1 = (bank[index1].freq_ratio - ratio) /  ratio;
                const dist2 = (bank[index2].freq_ratio - ratio) / -ratio;

                const separ = self.doubleNotchSeparation / (bank[index1].notch_q / 100);

                if (self.aboutEQ(dist1, separ, 0.0005) && self.aboutEQ(dist2, separ, 0.0005))
                    return [index1, index2];
            }
        }

        return undefined;
    },

    findHarmonic : function(bank, source, harm)
    {
        const self = this;

        const harmonic = {
            source:    source,
            harmonic:  harm,
            count:     0,
            notch_q:   2.50,
            min_hz:    20,
            max_hz:    4000,
        };

        let index = self.findDoubleNotch(bank, source, harm);
        if (index) {
            harmonic.count   = 2;
            harmonic.notch_q = bank[index[0]].notch_q / 100;
            harmonic.min_hz  = bank[index[0]].min_hz;
            harmonic.max_hz  = bank[index[0]].max_hz;

            self.eraseBankNotches(bank, index);

            return harmonic;
        }

        index = self.findSingleNotch(bank, source, harm);
        if (index) {
            harmonic.count   = 1;
            harmonic.notch_q = bank[index[0]].notch_q / 100;
            harmonic.min_hz  = bank[index[0]].min_hz;
            harmonic.max_hz  = bank[index[0]].max_hz;

            self.eraseBankNotches(bank, index);

            return harmonic;
        }

        return harmonic;
    },

    generateSingleNotch : function(bank, harm) {
        const self = this;

        const ratio = Math.round(10000 / harm.harmonic);
        const notchq = Math.round(harm.notch_q * 100);

        bank.push( self.newNotch(harm.source, ratio, notchq, harm.min_hz, harm.max_hz) );
    },

    generateDoubleNotch : function(bank, harm) {
        const self = this;

        const ratio  = 10000 / harm.harmonic;
        const ratio1 = Math.round(ratio * (1.0 - self.doubleNotchSeparation / harm.notch_q));
        const ratio2 = Math.round(ratio * (1.0 + self.doubleNotchSeparation / harm.notch_q));
        const notchq = Math.round(harm.notch_q * 100);

        bank.push( self.newNotch(harm.source, ratio1, notchq, harm.min_hz, harm.max_hz),
                   self.newNotch(harm.source, ratio2, notchq, harm.min_hz, harm.max_hz) );
    },

    generateNotch : function(bank, harm) {
        const self = this;

        switch (harm.count) {
            case 2:
                self.generateDoubleNotch(bank, harm);
                break;
            case 1:
                self.generateSingleNotch(bank, harm);
                break;
            default:
        }
    },

    initConfig : function() {
        const config = {
            enable:     false,
            custom:     false,
            mainMotor:  [],
            mainRotor:  [],
            tailMotor:  [],
            tailRotor:  [],
        };

        return config;
    },

    generateConfig : function(config) {
        const self = this;
        const bank = [];

        if (config.enable) {
            config.mainMotor.forEach((item) => self.generateNotch(bank, item));
            config.tailMotor.forEach((item) => self.generateNotch(bank, item));
            config.mainRotor.forEach((item) => self.generateNotch(bank, item));
            config.tailRotor.forEach((item) => self.generateNotch(bank, item));
        }

        return self.fillUpBank(bank);
    },

    parseConfig : function(rpm_filter) {
        const self = this;

        const bank = self.cloneBank(rpm_filter);
        const config = self.initConfig();

        config.enable = !self.isNullBank(bank);

        for (let i=0; i<self.mainRotorHarmonics; i++)
            config.mainRotor[i] = this.findHarmonic(bank, self.MAIN_ROTOR_SRC + i, 1);

        for (let i=0; i<self.tailRotorHarmonics; i++)
            config.tailRotor[i] = this.findHarmonic(bank, self.TAIL_ROTOR_SRC + i, 1);

        for (let i=0; i<self.mainMotorHarmonics; i++)
            config.mainMotor[i] = this.findHarmonic(bank, self.MAIN_MOTOR_SRC, i + 1);

        for (let i=0; i<self.tailMotorHarmonics; i++)
            config.tailMotor[i] = this.findHarmonic(bank, self.TAIL_MOTOR_SRC, i + 1);

        config.custom = !self.isNullBank(bank);

        return config;
    },

    initialize : function () {
        const self = this;

        self.mainRotorHarmonics = self.MAIN_ROTOR_HARMONICS;
        self.mainMotorHarmonics = self.MAIN_MOTOR_HARMONICS;

        self.tailRotorHarmonics = self.TAIL_ROTOR_HARMONICS;
        self.tailMotorHarmonics = self.TAIL_MOTOR_HARMONICS;
    },

};

RPMFilter.initialize();

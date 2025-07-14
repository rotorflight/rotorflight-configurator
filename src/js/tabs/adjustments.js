import * as noUiSlider from 'nouislider';
import semver from 'semver';
import wNumb from 'wnumb';

const tab = {
    tabName: 'adjustments',
    isDirty: false,

    AUX_MIN: 875,
    AUX_MAX: 2125,

    ALWAYS_ON_CH: 255,

    PRIMARY_CHANNEL_COUNT: 5,

    callback_stack: [],

    toggle_speed: 300,
};

function getFunctions() {
    const gte12_8 = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8);
    const gte12_9 = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9);

    return [
        { id: 0,    name: 'None',                       min: 0,     max: 100,    ticks: 10,   pips: [ 0, 20, 40, 60, 80, 100 ] },
        { id: 1,    name: 'RateProfile',                min: 1,     max: 6,      ticks: 0.25, pips: [ 1, 2, 3, 4, 5, 6 ] },
        { id: 2,    name: 'PIDProfile',                 min: 1,     max: 6,      ticks: 0.25, pips: [ 1, 2, 3, 4, 5, 6 ] },
        { id: 3,    name: 'LEDProfile',                 min: 1,     max: 4,      ticks: 0.25, pips: [ 1, 2, 3, 4 ] },
        { id: 4,    name: 'OSDProfile',                 min: 1,     max: 3,      ticks: 0.25, pips: [ 1, 2, 3 ] },
        { id: 5,    name: 'PitchRate',                  min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 6,    name: 'RollRate',                   min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 7,    name: 'YawRate',                    min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 8,    name: 'PitchRCRate',                min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 9,    name: 'RollRCRate',                 min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 10,   name: 'YawRCRate',                  min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 11,   name: 'PitchRCExpo',                min: 0,     max: 100,    ticks: 5,    pips: [ 0, 20, 40, 60, 80, 100 ] },
        { id: 12,   name: 'RollRCExpo',                 min: 0,     max: 100,    ticks: 5,    pips: [ 0, 20, 40, 60, 80, 100 ] },
        { id: 13,   name: 'YawRCExpo',                  min: 0,     max: 100,    ticks: 5,    pips: [ 0, 20, 40, 60, 80, 100 ] },
        { id: 14,   name: 'PitchP',                     min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 15,   name: 'PitchI',                     min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 16,   name: 'PitchD',                     min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 17,   name: 'PitchF',                     min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 18,   name: 'RollP',                      min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 19,   name: 'RollI',                      min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 20,   name: 'RollD',                      min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 21,   name: 'RollF',                      min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 22,   name: 'YawP',                       min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 23,   name: 'YawI',                       min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 24,   name: 'YawD',                       min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 25,   name: 'YawF',                       min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 26,   name: 'YawCWStopGain',              min: 25,    max: 250,    ticks: 10,   pips: [ 50, 100, 150, 200, 250 ] },
        { id: 27,   name: 'YawCCWStopGain',             min: 25,    max: 250,    ticks: 10,   pips: [ 50, 100, 150, 200, 250 ] },
        { id: 28,   name: 'YawCyclicFF',                min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 29,   name: 'YawCollectiveFF',            min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 30,   name: 'YawCollectiveDyn',           min: -125,  max: 125,    ticks: 10,   pips: [ -100, -50, 0, 50, 100 ], hide: gte12_8 },
        { id: 31,   name: 'YawCollectiveDecay',         min: 1,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: gte12_8 },
        { id: 32,   name: 'PitchCollectiveFF',          min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 33,   name: 'PitchGyroCutoff',            min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 34,   name: 'RollGyroCutoff',             min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 35,   name: 'YawGyroCutoff',              min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 36,   name: 'PitchDtermCutoff',           min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 37,   name: 'RollDtermCutoff',            min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 38,   name: 'YawDtermCutoff',             min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 39,   name: 'RescueClimbCollective',      min: 0,     max: 1000,   ticks: 50,   pips: [ 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000 ] },
        { id: 40,   name: 'RescueHoverCollective',      min: 0,     max: 1000,   ticks: 50,   pips: [ 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000 ] },
        { id: 41,   name: 'RescueHoverAltitude',        min: 0,     max: 2500,   ticks: 50,   pips: [ 0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400 ] },
        { id: 42,   name: 'RescueAltP',                 min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 43,   name: 'RescueAltI',                 min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 44,   name: 'RescueAltD',                 min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 45,   name: 'AngleLevelGain',             min: 0,     max: 200,    ticks: 10,   pips: [ 0, 50, 100, 150, 200 ] },
        { id: 46,   name: 'HorizonLevelGain',           min: 0,     max: 200,    ticks: 10,   pips: [ 0, 50, 100, 150, 200 ] },
        { id: 47,   name: 'AcroTrainerGain',            min: 25,    max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 48,   name: 'GovernorGain',               min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 49,   name: 'GovernorP',                  min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 50,   name: 'GovernorI',                  min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 51,   name: 'GovernorD',                  min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 52,   name: 'GovernorF',                  min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 53,   name: 'GovernorTTA',                min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 54,   name: 'GovernorCyclicFF',           min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 55,   name: 'GovernorCollectiveFF',       min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 56,   name: 'PitchB',                     min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 57,   name: 'RollB',                      min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 58,   name: 'YawB',                       min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 59,   name: 'PitchO',                     min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 60,   name: 'RollO',                      min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 61,   name: 'CrossCouplingGain',          min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 62,   name: 'CrossCouplingRatio',         min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 63,   name: 'CrossCouplingCutoff',        min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ] },
        { id: 64,   name: 'AccTrimPitch',               min: -300,  max: 300,    ticks: 10,   pips: [ -300, -200, -100, 0, 100, 200, 300 ] },
        { id: 65,   name: 'AccTrimRoll',                min: -300,  max: 300,    ticks: 10,   pips: [ -300, -200, -100, 0, 100, 200, 300 ] },
        { id: 66,   name: 'YawInertiaPrecompGain',      min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 67,   name: 'YawInertiaPrecompCutoff',    min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 68,   name: 'PitchSetpointBoostGain',     min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 69,   name: 'RollSetpointBoostGain',      min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 70,   name: 'YawSetpointBoostGain',       min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 71,   name: 'CollectiveSetpointBoostGain',min: 0,     max: 255,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 72,   name: 'YawDynCeilingGain',          min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 73,   name: 'YawDynDeadbandGain',         min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 74,   name: 'YawDynDeadbandFilter',       min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 75,   name: 'YawPrecompCutoff',           min: 0,     max: 250,    ticks: 10,   pips: [ 0, 50, 100, 150, 200, 250 ], hide: !gte12_8 },
        { id: 76,   name: 'GovIdleThrottle',            min: 0,     max: 100,    ticks: 5,    pips: [ 0, 20, 40, 60, 80, 100 ], hide: !gte12_9 },
        { id: 77,   name: 'GovAutoThrottle',            min: 0,     max: 100,    ticks: 5,    pips: [ 0, 20, 40, 60, 80, 100 ], hide: !gte12_9 },
    ];
}

tab.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("/src/tabs/adjustments.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_RC))
            .then(() => MSP.promise(MSPCodes.MSP_ADJUSTMENT_RANGES))
            .then(callback);
    }

    function save_data(callback) {
        var index = 0;

        function save_range() {
            if (index < FC.ADJUSTMENT_RANGES.length) {
                if (FC.ADJUSTMENT_RANGES[index].dirty) {
                    FC.ADJUSTMENT_RANGES[index].dirty = false;
                    mspHelper.sendAdjustmentRange(index++, save_range);
                }
                else {
                    index++;
                    save_range();
                }
            } else {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                    GUI.log(i18n.getMessage('eepromSaved'));
                    callback?.();
                });
            }
        }

        save_range();
    }

    function setDirty() {
        if (!self.isDirty) {
            self.isDirty = true;
            $('.tab-adjustments').removeClass('toolbar_hidden');
        }
    }

    function xround(value, step) {
        return step * Math.floor(value / step);
    }

    function isWithin(value, range) {
        return value >= range.start && value <= range.end;
    }

    function density(min, max, width) {
        return 100 / ((max - min) / width);
    }

    function calcAdjValue(adjRange) {
        const result = { active: false, value: 0, string: '-' };
        if (adjRange.adjType == 1) {
            if (adjRange.enaChannel == self.ALWAYS_ON_CH || isWithin(adjRange.enaChannelPos, adjRange.enaRange)) {
                const rangeWidth = adjRange.adjRange1.end - adjRange.adjRange1.start;
                const valueWidth = adjRange.adjMax - adjRange.adjMin;
                if (rangeWidth > 0 && valueWidth > 0) {
                    const offset = rangeWidth / 2;
                    const value = adjRange.adjMin + Math.floor(((adjRange.adjChannelPos - adjRange.adjRange1.start) * valueWidth + offset) / rangeWidth);
                    result.value = value.clamp(adjRange.adjMin, adjRange.adjMax);
                }
                else {
                    result.value = adjRange.adjMin;
                }
                result.string = result.value.toFixed(0);
                result.active = true;
            }
        }
        else if (adjRange.adjType == 2) {
            if (isWithin(adjRange.enaChannelPos, adjRange.enaRange)) {
                if (isWithin(adjRange.adjChannelPos, adjRange.adjRange1)) {
                    result.string = '-' + adjRange.adjStep.toFixed(0);
                    result.active = true;
                }
                else if (isWithin(adjRange.adjChannelPos, adjRange.adjRange2)) {
                    result.string = '+' + adjRange.adjStep.toFixed(0);
                    result.active = true;
                }
            }
        }
        return result;
    }

    function newAdjustment(adjIndex, adjRange) {

        const adjBody = $('#tab-adjustments-templates .adjustmentBody').clone();

        adjRange.dirty = false;

        adjRange.adjType = 0;
        adjRange.enaChannelPos = 0;
        adjRange.adjChannelPos = 0;

        if (adjRange.adjFunction >= self.FUNCTIONS.length)
            adjRange.adjFunction = 0;

        var adjConfig = self.FUNCTIONS[adjRange.adjFunction];

        if (adjRange.adjFunction > 0) {
            if (adjRange.adjStep > 0)
                adjRange.adjType = 2;
            else
                adjRange.adjType = 1;
        }

        adjBody.find('.adjTypeOptionInput').attr('name', `adjTypeOptionInput${adjIndex}`);

        const channelRange = {
            'min': self.AUX_MIN,
            'max': self.AUX_MAX,
        };

        const channelPips = [ 900, 1000, 1250, 1500, 1750, 2000, 2100 ];

        const enaSlider = adjBody.find('.ena-slider');
        const incSlider = adjBody.find('.inc-slider');
        const decSlider = adjBody.find('.dec-slider');
        const valSlider = adjBody.find('.val-slider');

        noUiSlider.create(enaSlider.get(0), {
            start: [ adjRange.enaRange.start, adjRange.enaRange.end ],
            behaviour: 'snap-drag',
            step: 5,
            connect: true,
            range: channelRange,
            format: wNumb({ decimals: 0 }),
            pips: {
                mode: 'values',
                values: channelPips,
                density: density(self.AUX_MIN, self.AUX_MAX, 50),
                stepped: true,
            },
        });

        noUiSlider.create(decSlider.get(0), {
            start: [ adjRange.adjRange1.start, adjRange.adjRange1.end ],
            behaviour: 'snap-drag',
            step: 5,
            connect: true,
            range: channelRange,
            format: wNumb({ decimals: 0 }),
            pips: {
                mode: 'values',
                values: channelPips,
                density: density(self.AUX_MIN, self.AUX_MAX, 50),
                stepped: true,
            },
        });

        noUiSlider.create(incSlider.get(0), {
            start: [ adjRange.adjRange2.start, adjRange.adjRange2.end ],
            behaviour: 'snap-drag',
            step: 5,
            connect: true,
            range: channelRange,
            format: wNumb({ decimals: 0 }),
        });

        const valSliderConfig = {
            start: [ adjRange.adjMin, adjRange.adjMax ],
            behaviour: 'snap-drag',
            step: 1,
            connect: true,
            range: {
                'min': adjConfig.min,
                'max': adjConfig.max,
            },
            format: wNumb({ decimals: 0 }),
            pips: {
                mode: 'values',
                values: adjConfig.pips,
                density: density(adjConfig.min, adjConfig.max, adjConfig.ticks),
                stepped: true
            },
        };
        noUiSlider.create(valSlider.get(0), valSliderConfig);

        const enaChannelList = adjBody.find('select.enaChannel');
        enaChannelList.val(adjRange.enaChannel);

        const adjChannelList = adjBody.find('select.adjChannel');
        adjChannelList.val(adjRange.adjChannel);

        const adjFuncList = adjBody.find('select.function');
        adjFuncList.val(adjRange.adjFunction);

        const enaMinInput = adjBody.find('.lowerEnaValue');
        enaMinInput.val(adjRange.enaRange.start).attr('max', adjRange.enaRange.end);

        const enaMaxInput = adjBody.find('.upperEnaValue');
        enaMaxInput.val(adjRange.enaRange.end).attr('min', adjRange.enaRange.start);

        const decMinInput = adjBody.find('.lowerDecValue');
        decMinInput.val(adjRange.adjRange1.start).attr('max', adjRange.adjRange1.end);

        const decMaxInput = adjBody.find('.upperDecValue');
        decMaxInput.val(adjRange.adjRange1.end).attr('min', adjRange.adjRange1.start);

        const incMinInput = adjBody.find('.lowerIncValue');
        incMinInput.val(adjRange.adjRange2.start).attr('max', adjRange.adjRange2.end);

        const incMaxInput = adjBody.find('.upperIncValue');
        incMaxInput.val(adjRange.adjRange2.end).attr('min', adjRange.adjRange2.start);

        const funcMinInput = adjBody.find('.functionMinValue');
        funcMinInput.val(adjRange.adjMin).attr('min',adjConfig.min).attr('max',adjRange.adjMax);

        const funcMaxInput = adjBody.find('.functionMaxValue');
        funcMaxInput.val(adjRange.adjMax).attr('min',adjRange.adjMin).attr('max',adjConfig.max);

        const funcStepInput = adjBody.find('.functionStepSize');
        funcStepInput.val(adjRange.adjStep);

        function setEnaRange(min, max, noslide) {
            enaMinInput.attr('max',max).val(min);
            enaMaxInput.attr('min',min).val(max);
            if (!noslide) {
                enaSlider.get(0).noUiSlider.set([min,max]);
            }
            adjRange.dirty = true;
            adjRange.enaRange.start = min;
            adjRange.enaRange.end = max;
        }

        enaSlider.get(0).noUiSlider.on('change', setDirty);
        enaSlider.get(0).noUiSlider.on('slide', function(values) {
            const min = parseInt(values[0]);
            const max = parseInt(values[1]);
            setEnaRange(min,max,true);
        });

        enaMinInput.on('change', function () {
            const min = parseInt(enaMinInput.val());
            const max = parseInt(enaMaxInput.val());
            setEnaRange(min,max);
        });

        enaMaxInput.on('change', function() {
            const min = parseInt(enaMinInput.val());
            const max = parseInt(enaMaxInput.val());
            setEnaRange(min,max);
        });

        function setDecRange(min, max, noslide) {
            decMinInput.attr('max',max).val(min);
            decMaxInput.attr('min',min).val(max);
            if (!noslide) {
                decSlider.get(0).noUiSlider.set([min,max]);
            }
            adjRange.dirty = true;
            adjRange.adjRange1.start = min;
            adjRange.adjRange1.end = max;
        }

        decSlider.get(0).noUiSlider.on('change', setDirty);
        decSlider.get(0).noUiSlider.on('slide', function(values) {
            const min = parseInt(values[0]);
            const max = parseInt(values[1]);
            setDecRange(min,max,true);
        });

        decMinInput.on('change', function () {
            const min = parseInt(decMinInput.val());
            const max = parseInt(decMaxInput.val());
            setDecRange(min,max);
        });

        decMaxInput.on('change', function () {
            const min = parseInt(decMinInput.val());
            const max = parseInt(decMaxInput.val());
            setDecRange(min,max);
        });

        function setIncRange(min, max, noslide) {
            incMinInput.attr('max',max).val(min);
            incMaxInput.attr('min',min).val(max);
            if (!noslide) {
               incSlider.get(0).noUiSlider.set([min,max]);
            }
            adjRange.dirty = true;
            adjRange.adjRange2.start = min;
            adjRange.adjRange2.end = max;
        }

        incSlider.get(0).noUiSlider.on('change', setDirty);
        incSlider.get(0).noUiSlider.on('slide', function(values) {
            const min = parseInt(values[0]);
            const max = parseInt(values[1]);
            setIncRange(min,max,true);
        });

        incMinInput.on('change', function () {
            const min = parseInt(incMinInput.val());
            const max = parseInt(incMaxInput.val());
            setIncRange(min,max);
        });

        incMaxInput.on('change', function () {
            const min = parseInt(incMinInput.val());
            const max = parseInt(incMaxInput.val());
            setIncRange(min,max);
        });

        function setValRange(min, max, noslide) {
            funcMinInput.attr('max',max).val(min);
            funcMaxInput.attr('min',min).val(max);
            if (!noslide) {
                valSlider.get(0).noUiSlider.set([min,max]);
            }
            adjRange.dirty = true;
            adjRange.adjMin = min;
            adjRange.adjMax = max;
        }

        valSlider.get(0).noUiSlider.on('change', setDirty);
        valSlider.get(0).noUiSlider.on('slide', function(values) {
            const min = parseInt(values[0]);
            const max = parseInt(values[1]);
            setValRange(min,max,true);
        });

        funcMinInput.on('change', function () {
            const min = parseInt(funcMinInput.val());
            const max = parseInt(funcMaxInput.val());
            setValRange(min,max);
        });

        funcMaxInput.on('change', function () {
            const min = parseInt(funcMinInput.val());
            const max = parseInt(funcMaxInput.val());
            setValRange(min,max);
        });

        funcStepInput.on('change', function () {
            adjRange.dirty = true;
            adjRange.adjStep = parseInt(funcStepInput.val());
        });

        adjFuncList.on('change', function () {
            const index = adjFuncList.val();
            adjConfig = self.FUNCTIONS[index];
            adjRange.dirty = true;
            adjRange.adjFunction = index;
            valSlider.get(0).noUiSlider.updateOptions({
                range: {
                    min: adjConfig.min,
                    max: adjConfig.max,
                },
                pips: {
                    mode: 'values',
                    values: adjConfig.pips,
                    density: density(adjConfig.min, adjConfig.max, adjConfig.ticks),
                    stepped: true,
                },
            }, true);
            if (adjConfig.id > 0 && adjRange.adjType == 1)
                valSlider.find('.marker').show(self.toggle_speed);

            funcMinInput.attr('min', adjConfig.min);
            funcMaxInput.attr('max', adjConfig.max);
            setValRange(adjConfig.min, adjConfig.max);
        });

        enaChannelList.on('change', function () {
            const channel = parseInt(enaChannelList.val());
            adjRange.dirty = true;
            adjRange.enaChannel = channel;
            if (channel == self.ALWAYS_ON_CH) {
                setEnaRange(1500,1500);
                adjBody.find('.ena-channel-value').text('-');
                adjBody.find('.ena-slider').attr("disabled", "disabled");
                adjBody.find('.enaChannelRanges input').prop('disabled', true);
                adjBody.find('.enaMarker').hide(self.toggle_speed);
            }
            else {
                adjBody.find('.ena-slider').removeAttr("disabled");
                adjBody.find('.enaChannelRanges input').prop('disabled', false);
                adjBody.find('.enaMarker').show(self.toggle_speed);
            }
        });

        adjChannelList.on('change', function () {
            const channel = parseInt(adjChannelList.val());
            adjRange.dirty = true;
            adjRange.adjChannel = channel;
        });

        function enaSliderAuto() {
            const min = xround(adjRange.enaChannelPos - 25, 5);
            const max = xround(adjRange.enaChannelPos + 25, 5);
            setEnaRange(min,max);
        }
        enaSlider.find('.noUi-handle-lower').on('dblclick', enaSliderAuto);
        enaSlider.find('.noUi-handle-upper').on('dblclick', enaSliderAuto);

        decSlider.find('.noUi-handle-lower').on('dblclick', function () {
            if (adjRange.adjType == 1) {
                const min = xround(adjRange.adjChannelPos, 5);
                const max = Math.max(adjRange.adjRange1.end, min);
                setDecRange(min,max);
            }
            else if (adjRange.adjType == 2) {
                const min = xround(adjRange.adjChannelPos - 10, 5);
                const max = xround(adjRange.adjChannelPos + 10, 5);
                setDecRange(min,max);
            }
        });

        decSlider.find('.noUi-handle-upper').on('dblclick', function () {
            if (adjRange.adjType == 1) {
                const max = xround(adjRange.adjChannelPos + 4, 5);
                const min = Math.min(adjRange.adjRange1.start, max);
                setDecRange(min,max);
            }
            else if (adjRange.adjType == 2) {
                const min = xround(adjRange.adjChannelPos - 10, 5);
                const max = xround(adjRange.adjChannelPos + 10, 5);
                setDecRange(min,max);
            }
        });

        incSlider.find('.noUi-handle-lower').on('dblclick', function () {
            if (adjRange.adjType == 2) {
                const min = xround(adjRange.adjChannelPos - 10, 5);
                const max = xround(adjRange.adjChannelPos + 10, 5);
                setIncRange(min,max);
            }
        });

        incSlider.find('.noUi-handle-upper').on('dblclick', function () {
            if (adjRange.adjType == 2) {
                const min = xround(adjRange.adjChannelPos - 10, 5);
                const max = xround(adjRange.adjChannelPos + 10, 5);
                setIncRange(min,max);
            }
        });

        const adjTypeElems = adjBody.find('.adjTypeOptionInput');

        adjTypeElems.filter(`[value="${adjRange.adjType}"]`).prop('checked', true);

        function updateVisibility() {
            adjRange.adjType = parseInt(adjTypeElems.filter(':checked').val());

            function toggleHandleIcons(show) {
                if (show) {
                    incSlider.find('.noUi-handle')
                        .addClass('handle-icon')
                        .find('.noUi-touch-area')
                        .addClass(['fas', 'fa-plus']);
                    decSlider.find('.noUi-handle')
                        .addClass('handle-icon')
                        .find('.noUi-touch-area')
                        .addClass(['fas', 'fa-minus']);
                } else {
                    incSlider.find('.noUi-handle')
                        .removeClass('handle-icon')
                        .find('.noUi-touch-area')
                        .removeClass(['fas', 'fa-plus']);
                    decSlider.find('.noUi-handle')
                        .removeClass('handle-icon')
                        .find('.noUi-touch-area')
                        .removeClass(['fas', 'fa-minus']);
                }
            }

            if (adjRange.adjType == 0) {
                adjBody.find('.input-element').prop('disabled', true);
                adjBody.find('.adj-slider').attr("disabled", "disabled");
                adjBody.find('.value-box').text('-');
                adjBody.find('.marker').hide(self.toggle_speed);
                toggleHandleIcons(false);
                if (adjRange.adjFunction != 0) {
                    adjFuncList.val(0).trigger('change');
                }
                if (adjRange.adjMin != 0 || adjRange.adjMax != 100) {
                    setValRange(0,100);
                }
            }
            else if (adjRange.adjType == 1) {
                adjBody.find('.input-element').prop('disabled', false);
                adjBody.find('.adj-slider').removeAttr("disabled");
                adjBody.find('.adjMarker').show(self.toggle_speed);
                adjBody.find('.valMarker').show(self.toggle_speed);
                if (adjRange.enaChannel != self.ALWAYS_ON_CH)
                    adjBody.find('.enaMarker').show(self.toggle_speed);
                else
                    adjBody.find('.enaMarker').hide(self.toggle_speed);
                toggleHandleIcons(false);
                if (adjRange.adjStep > 0)
                    funcStepInput.val(0).trigger('change');
            }
            else if (adjRange.adjType == 2) {
                adjBody.find('.input-element').prop('disabled', false);
                adjBody.find('.adj-slider').removeAttr("disabled");
                adjBody.find('.adjMarker').show(self.toggle_speed);
                adjBody.find('.valMarker').hide(self.toggle_speed);
                if (adjRange.enaChannel != self.ALWAYS_ON_CH)
                    adjBody.find('.enaMarker').show(self.toggle_speed);
                else
                    adjBody.find('.enaMarker').hide(self.toggle_speed);
                toggleHandleIcons(true);
                if (adjRange.adjStep == 0) {
                    funcStepInput.val(1).trigger('change');
                }
            }

            if (adjRange.enaChannel == self.ALWAYS_ON_CH) {
                adjBody.find('.ena-slider').attr("disabled", "disabled");
                adjBody.find('.enaChannelRanges input').prop('disabled', true);
            }

            adjBody.find('.mapped-only').toggle(adjRange.adjType == 1);
            adjBody.find('.stepped-only').toggle(adjRange.adjType == 2);
        }

        adjTypeElems.on('change', updateVisibility);

        function updateMarkers() {
            if (adjRange.adjType > 0) {
                if (adjRange.enaChannel >= 0 && adjRange.enaChannel < self.ALWAYS_ON_CH) {
                    const enaChannelIndex = adjRange.enaChannel + self.PRIMARY_CHANNEL_COUNT;
                    const enaChannelPos = FC.RC.channels[enaChannelIndex];
                    const enaPercentage = (enaChannelPos - self.AUX_MIN) / (self.AUX_MAX-self.AUX_MIN) * 100;
                    adjBody.find('.enaMarker').css('left', enaPercentage.clamp(0,100).toFixed(2) + '%');
                    adjBody.find('.ena-channel-value').text(enaChannelPos + 'µs');
                    adjRange.enaChannelPos = enaChannelPos;
                }
                if (adjRange.adjChannel >= 0) {
                    const adjChannelIndex = adjRange.adjChannel + self.PRIMARY_CHANNEL_COUNT;
                    const adjChannelPos = FC.RC.channels[adjChannelIndex];
                    const adjPercentage = (adjChannelPos - self.AUX_MIN) / (self.AUX_MAX-self.AUX_MIN) * 100;
                    adjBody.find('.adjMarker').css('left', adjPercentage.clamp(0,100).toFixed(2) + '%');
                    adjBody.find('.adj-channel-value').text(adjChannelPos + 'µs');
                    adjRange.adjChannelPos = adjChannelPos;
                }
                const result = calcAdjValue(adjRange, adjConfig);
                adjBody.find('.function-value').text(result.string);
                if (result.active) {
                    const valPercentage = (result.value - adjConfig.min) / (adjConfig.max - adjConfig.min) * 100;
                    adjBody.find('.valMarker').css('left', valPercentage.clamp(0,100).toFixed(2) + '%');
                }
            }
        }

        self.callback_stack.push(updateMarkers);

        updateVisibility();
        updateMarkers();

        return adjBody;
    }

    function initAdjustments() {
        const selectFunction = $('#tab-adjustments-templates .adjustmentBody select.function');
        self.FUNCTIONS.forEach(function(fun, index) {
            const opt = new Option(i18n.getMessage('adjustmentsFunction' + fun.name), index);
            if (fun.hide) {
                opt.style.display = "none";
            }
            selectFunction.append(opt);
        });

        const enaChannel = $('#tab-adjustments-templates .adjustmentBody select.enaChannel');
        const alwaysOption = new Option(i18n.getMessage('auxiliaryAlwaysChannelSelect'), self.ALWAYS_ON_CH);
        enaChannel.append(alwaysOption);

        const channelList = $('#tab-adjustments-templates .adjustmentBody select.channel');
        const autoOption = new Option(i18n.getMessage('auxiliaryAutoChannelSelect'), -1);
        channelList.append(autoOption);

        const auxChannelCount = FC.RC.active_channels - self.PRIMARY_CHANNEL_COUNT;
        for (let index = 0; index < auxChannelCount; index++) {
            const option = new Option(`AUX${index + 1}`, index);
            channelList.append(option);
        }

        const adjTable = $('.tab-adjustments table.adjustments');
        FC.ADJUSTMENT_RANGES.forEach(function (adjRange, adjIndex) {
            adjTable.append(newAdjustment(adjIndex, adjRange));
        });
    }

    function autoSelectChannel() {
        const auto_option = $('.tab-adjustments select.channel option[value="-1"]:selected');
        if (auto_option.length > 0) {
            const RCchannels = FC.RC.channels.slice(self.PRIMARY_CHANNEL_COUNT, FC.RC.active_channels);
            if (self.RCchannels) {
                let channel = null;
                let chDelta = 100;
                for (let index = 0; index < RCchannels.length; index++) {
                    let delta = Math.abs(RCchannels[index] - self.RCchannels[index]);
                    if (delta > chDelta) {
                        channel = index;
                        chDelta = delta;
                    }
                }
                if (channel !== null) {
                    auto_option.parent().val(channel).trigger('change');
                    self.RCchannels = null;
                }
            } else {
                self.RCchannels = RCchannels;
            }
        } else {
            self.RCchannels = null;
        }
    }

    function process_html() {
        self.FUNCTIONS = getFunctions();

        // translate to user-selected language
        i18n.localizePage();

        // Create UI
        initAdjustments();

        // Hide the buttons toolbar
        $('.tab-adjustments').addClass('toolbar_hidden');

        self.isDirty = false;

        function update_ui() {
            for (const callback of self.callback_stack) {
                callback?.();
            }
            autoSelectChannel();
        }

        self.save = function (callback) {
            save_data(callback);
        };

        self.revert = function (callback) {
            callback?.();
        };

        $('a.save').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        $('.content_wrapper').on('change', function () {
            setDirty();
        });

        GUI.interval_add('rc_pull', function () {
            MSP.send_message(MSPCodes.MSP_RC, false, false, update_ui);
        }, 200, true);

        GUI.content_ready(callback);
    }
};

tab.cleanup = function (callback) {
    this.isDirty = false;

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

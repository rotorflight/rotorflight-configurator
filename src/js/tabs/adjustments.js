'use strict';

TABS.adjustments = {
    isDirty: false,

    PRIMARY_CHANNEL_COUNT: 5,

    FUNCTIONS: [
        'None',
        'PitchRate',
        'RollRate',
        'YawRate',
        'PitchRCRate',
        'RollRCRate',
        'YawRCRate',
        'PitchRCExpo',
        'RollRCExpo',
        'YawRCExpo',
        'PitchP',
        'PitchI',
        'PitchD',
        'PitchF',
        'RollP',
        'RollI',
        'RollD',
        'RollF',
        'YawP',
        'YawI',
        'YawD',
        'YawF',
        'YawCenter',
        'YawCWStopGain',
        'YawCCWStopGain',
        'YawCyclicFF',
        'YawCollectiveFF',
        'YawImpulseFF',
        'PitchCollectiveFF',
        'PitchCollectiveImpulseFF',
        'RescueCollective',
        'RescueCollectiveBoost',
        'AngleLevelStrength',
        'HorizonLevelStrength',
        'AcroTrainerGain',
        'GovernorGain',
        'GovernorP',
        'GovernorI',
        'GovernorD',
        'GovernorF',
        'GovernorTTA',
        'GovernorCyclicFF',
        'GovernorCollectiveFF',
        'TailMotorIdle',
        'SwashPhase',
        'RateProfile',
        'PIDProfile',
        'OSDProfile',
        'LEDProfile',
        'WayP',
        'WayI',
        'WayD',
        'WayF',
        'PitchErrorCutoff',
        'PitchDtermCutoff',
        'PitchFtermCutoff',
        'RollErrorCutoff',
        'RollDtermCutoff',
        'RollFtermCutoff',
        'YawErrorCutoff',
        'YawDtermCutoff',
        'YawFtermCutoff',
    ],
};

TABS.adjustments.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/adjustments.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_RC))
            .then(() => MSP.promise(MSPCodes.MSP_BOXIDS))
            .then(() => MSP.promise(MSPCodes.MSP_BOXNAMES))
            .then(() => MSP.promise(MSPCodes.MSP_ADJUSTMENT_RANGES))
            .then(callback);
    }

    function save_data(callback) {
        mspHelper.sendAdjustmentRanges(eeprom_write);

        function eeprom_write() {
            MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                GUI.log(i18n.getMessage('eepromSaved'));
                if (callback) callback();
            });
        }
    }

    function setDirty() {
        if (!self.isDirty) {
            self.isDirty = true;
            $('.tab-adjustments').removeClass('toolbar_hidden');
        }
    }

    function addAdjustment(adjustmentIndex, adjustmentRange, auxChannelCount) {

        const newAdjustment = $('#tab-adjustments-templates .adjustments .adjustment').clone();

        $(newAdjustment).attr('id', 'adjustment-' + adjustmentIndex);
        $(newAdjustment).data('index', adjustmentIndex);

        //
        // populate enable channel select box
        //
        const channelList = $(newAdjustment).find('.channelInfo .channel');
        const channelOptionTemplate = $(channelList).find('option');
        channelOptionTemplate.remove();

        let autoOption = channelOptionTemplate.clone();
        autoOption.text(i18n.getMessage('auxiliaryAutoChannelSelect'));
        autoOption.val(-1);
        channelList.append(autoOption);

        for (let index = 0; index < auxChannelCount; index++) {
            const channelOption = channelOptionTemplate.clone();
            channelOption.text('AUX ' + (index + 1));
            channelOption.val(index);
            channelList.append(channelOption);
        }
        channelList.val(adjustmentRange.enaChannel);

        //
        // update selected function
        //
        const functionList = $(newAdjustment).find('.functionSelection select');
        // update list of selected functions

        functionList.val(adjustmentRange.adjFunction);

        //
        // populate source channel select box
        //
        const srcChannelList = $(newAdjustment).find('.functionChannel select');
        const srcChannelOptionTemplate = $(srcChannelList).find('option');
        srcChannelOptionTemplate.remove();

        let srcAutoOption = channelOptionTemplate.clone();
        srcAutoOption.text(i18n.getMessage('auxiliaryAutoChannelSelect'));
        srcAutoOption.val(-1);
        srcChannelList.append(srcAutoOption);

        for (let index = 0; index < auxChannelCount; index++) {
            let srcChannelOption = srcChannelOptionTemplate.clone();
            srcChannelOption.text('AUX ' + (index + 1));
            srcChannelOption.val(index);
            srcChannelList.append(srcChannelOption);
        }
        srcChannelList.val(adjustmentRange.adjChannel);

        //
        // populate step,min,max
        //
        $(newAdjustment).find('.functionStepSize input').val(adjustmentRange.adjStep);
        $(newAdjustment).find('.functionMinValue input').val(adjustmentRange.adjMin);
        $(newAdjustment).find('.functionMaxValue input').val(adjustmentRange.adjMax);

        //
        // configure range
        //
        const channel_range = {
                'min': [  900 ],
                'max': [ 2100 ]
            };

        let rangeValues = [1300, 1700];
        if (adjustmentRange.enaRange != undefined) {
            rangeValues = [adjustmentRange.enaRange.start, adjustmentRange.enaRange.end];
        }

        let rangeElement = $(newAdjustment).find('.range');

        $(rangeElement).find('.channel-slider').noUiSlider({
            start: rangeValues,
            behaviour: 'snap-drag',
            margin: 25,
            step: 5,
            connect: true,
            range: channel_range,
            format: wNumb({
                decimals: 0
            })
        });

        $(newAdjustment).find('.channel-slider').Link('lower').to($(newAdjustment).find('.lowerLimitValue'));
        $(newAdjustment).find('.channel-slider').Link('upper').to($(newAdjustment).find('.upperLimitValue'));

        $(rangeElement).find(".pips-channel-range").noUiSlider_pips({
            mode: 'values',
            values: [900, 1000, 1200, 1400, 1500, 1600, 1800, 2000, 2100],
            density: 4,
            stepped: true
        });

        //
        // add the enable/disable behavior
        //
        const enableElement = $(newAdjustment).find('.enable');
        $(enableElement).data('adjustmentElement', newAdjustment);
        $(enableElement).change(function() {
            const adjustmentElement = $(this).data('adjustmentElement');
            if ($(this).prop("checked")) {
                $(adjustmentElement).find(':input').prop("disabled", false);
                $(adjustmentElement).find('.channel-slider').removeAttr("disabled");
                rangeElement = $(adjustmentElement).find('.range .channel-slider');
                const range = $(rangeElement).val();
                if (range[0] == range[1]) {
                    const defaultRangeValues = [1300, 1700];
                    $(rangeElement).val(defaultRangeValues);
                }
            } else {
                $(adjustmentElement).find(':input').prop("disabled", true);
                $(adjustmentElement).find('.channel-slider').attr("disabled", "disabled");
            }

            // keep this element enabled
            $(this).prop("disabled", false);
        });

        const isEnabled = (adjustmentRange?.enaRange?.start !== adjustmentRange?.enaRange?.end);
        $(enableElement).prop("checked", isEnabled).change();

        return newAdjustment;
    }

    function formToData() {

        const totalAdjustmentRangeCount = FC.ADJUSTMENT_RANGES.length;

        FC.ADJUSTMENT_RANGES = [];

        const defaultAdjustmentRange = {
            enaChannel: 0,
            enaRange: {
                start: 1500,
                end: 1500,
            },
            adjFunction: 0,
            adjChannel: 0,
            adjStep: 0,
            adjMin: 0,
            adjMax: 0,
        };

        $('.tab-adjustments .adjustments .adjustment').each(function () {
            const adjustmentElement = $(this);

            if ($(adjustmentElement).find('.enable').prop("checked")) {
                const rangeValues = $(this).find('.range .channel-slider').val();
                const adjustmentRange = {
                    enaChannel: parseInt($(this).find('.channelInfo .channel').val()),
                    enaRange: {
                        start: rangeValues[0],
                        end: rangeValues[1],
                    },
                    adjFunction: parseInt($(this).find('.functionSelection select').val()),
                    adjChannel: parseInt($(this).find('.functionChannel select').val()),
                    adjStep: parseInt($(this).find('.functionStepSize input').val()),
                    adjMin: parseInt($(this).find('.functionMinValue input').val()),
                    adjMax: parseInt($(this).find('.functionMaxValue input').val()),
                };
                FC.ADJUSTMENT_RANGES.push(adjustmentRange);
            } else {
                FC.ADJUSTMENT_RANGES.push(defaultAdjustmentRange);
            }
        });

        for (let index = FC.ADJUSTMENT_RANGES.length; index < totalAdjustmentRangeCount; index++) {
            FC.ADJUSTMENT_RANGES.push(defaultAdjustmentRange);
        }
    }

    function dataToForm() {
        const functions = self.FUNCTIONS;

        const selectFunction = $('#functionSelectionSelect');
        functions.forEach(function(value, key) {
            selectFunction.append(new Option(i18n.getMessage('adjustmentsFunction' + value), key));
        });

        const auxChannelCount = FC.RC.active_channels - self.PRIMARY_CHANNEL_COUNT;
        const modeTableBodyElement = $('.tab-adjustments .adjustments tbody');
        for (let index = 0; index < FC.ADJUSTMENT_RANGES.length; index++) {
            const newAdjustment = addAdjustment(index, FC.ADJUSTMENT_RANGES[index], auxChannelCount);
            modeTableBodyElement.append(newAdjustment);
        }
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks
        dataToForm();

        // Hide the buttons toolbar
        $('.tab-adjustments').addClass('toolbar_hidden');

        self.isDirty = false;

        function update_marker(auxChannelIndex, channelPosition) {
            if (channelPosition < 900) {
                channelPosition = 900;
            } else if (channelPosition > 2100) {
                channelPosition = 2100;
            }
            const percentage = (channelPosition - 900) / (2100-900) * 100;

            $('.adjustments .adjustment').each( function () {
                const enaChannelIndex = $(this).find('.enaChannel').val();
                if (enaChannelIndex == auxChannelIndex) {
                    $(this).find('.range .enaMarker').css('left', percentage + '%');
                }
                const adjChannelIndex = $(this).find('.adjChannel').val();
                if (adjChannelIndex == auxChannelIndex) {
                    $(this).find('.range .adjMarker').css('left', percentage + '%');
                }
            });
        }

        function update_ui() {

            auto_select_channel();

            let auxChannelCount = FC.RC.active_channels - self.PRIMARY_CHANNEL_COUNT;
            for (let index = 0; index < auxChannelCount; index++) {
                update_marker(index, FC.RC.channels[index + self.PRIMARY_CHANNEL_COUNT]);
            }
        }

        function auto_select_channel() {

            const auto_option = $('.tab-adjustments select.channel option[value="-1"]:selected');

            if (auto_option.length > 0) {
                const RCchannels = FC.RC.channels.slice(self.PRIMARY_CHANNEL_COUNT, FC.RC.active_channels);
                if (self.RCchannels) {
                    let channel = -1;
                    let chDelta = 100;
                    for (let index = 0; index < RCchannels.length; index++) {
                        let delta = Math.abs(RCchannels[index] - self.RCchannels[index]);
                        if (delta > chDelta) {
                            channel = index;
                            chDelta = delta;
                        }
                    }
                    if (channel != -1) {
                        auto_option.parent().val(channel);
                        self.RCchannels = null;
                    }
                } else {
                    self.RCchannels = RCchannels;
                }
            } else {
                self.RCchannels = null;
            }
        }

        self.save = function (callback) {
            formToData();
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

        $('.content_wrapper').change(function () {
            setDirty();
        });

        // update ui instantly on first load
        update_ui();

        // enable data pulling
        GUI.interval_add('rc_pull', function () {
            MSP.send_message(MSPCodes.MSP_RC, false, false, update_ui);
        }, 250, true);

        // status data pulled via separate timer with static speed
        GUI.interval_add('status_pull', function () {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 500, true);

        GUI.content_ready(callback);
    }
};

TABS.adjustments.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};

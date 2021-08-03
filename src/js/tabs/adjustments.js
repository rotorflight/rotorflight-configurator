'use strict';

TABS.adjustments = {
    FUNCTIONS_1_43: [
        'None',
        'RcRate',
        'RcExpo',
        'PitchRollRate',
        'YawRate',
        'PitchRollP',
        'PitchRollI',
        'PitchRollD',
        'YawP',
        'YawI',
        'YawD',
        'RateProfile',
        'PitchRate',
        'RollRate',
        'PitchP',
        'PitchI',
        'PitchD',
        'RollP',
        'RollI',
        'RollD',
        'RcRateYaw',
        'PitchRollF',
        'HorizonStrength',
        'RollRcRate',
        'PitchRcRate',
        'RollRcExpo',
        'PitchRcExpo',
        'PidAudio',
        'PitchF',
        'RollF',
        'YawF',
        'OSDProfile',
        'LEDProfile',
    ],
};

TABS.adjustments.initialize = function (callback) {
    const self = this;

    if (GUI.active_tab != 'adjustments') {
        GUI.active_tab = 'adjustments';
    }

    MSP.promise(MSPCodes.MSP_STATUS)
        .then(() => MSP.promise(MSPCodes.MSP_ADJUSTMENT_RANGES))
        .then(() => MSP.promise(MSPCodes.MSP_BOXNAMES))
        .then(() => MSP.promise(MSPCodes.MSP_BOXIDS))
        .then(() => load_html());

    function load_html() {
        $('#content').load("./tabs/adjustments.html", process_html);
    }

    function addAdjustment(adjustmentIndex, adjustmentRange, auxChannelCount) {

        const template = $('#tab-adjustments-templates .adjustments .adjustment');
        const newAdjustment = template.clone();

        $(newAdjustment).attr('id', 'adjustment-' + adjustmentIndex);
        $(newAdjustment).data('index', adjustmentIndex);

        //
        // update selected slot
        //

        if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
            const adjustmentList = $(newAdjustment).find('.adjustmentSlot .slot');
            adjustmentList.val(adjustmentRange.slotIndex);
        }

        //
        // populate source channel select box
        //

        const channelList = $(newAdjustment).find('.channelInfo .channel');
        const channelOptionTemplate = $(channelList).find('option');
        channelOptionTemplate.remove();
        for (let channelIndex = 0; channelIndex < auxChannelCount; channelIndex++) {
            const channelOption = channelOptionTemplate.clone();
            channelOption.text('AUX ' + (channelIndex + 1));
            channelOption.val(channelIndex);
            channelList.append(channelOption);
        }
        channelList.val(adjustmentRange.auxChannelIndex);

        //
        // update selected function
        //

        const functionList = $(newAdjustment).find('.functionSelection .function');
        // update list of selected functions

        functionList.val(adjustmentRange.adjustmentFunction);

        //
        // populate function channel select box
        //

        const switchList = $(newAdjustment).find('.functionSwitchChannel .channel');
        const switchOptionTemplate = $(switchList).find('option');
        switchOptionTemplate.remove();
        let switchOption;
        for (let switchIndex = 0; switchIndex < auxChannelCount; switchIndex++) {
            switchOption = switchOptionTemplate.clone();
            switchOption.text('AUX ' + (switchIndex + 1));
            switchOption.val(switchIndex);
            switchList.append(switchOption);
        }
        switchList.val(adjustmentRange.auxSwitchChannelIndex);

        //
        // configure range
        //

        const channel_range = {
                'min': [  900 ],
                'max': [ 2100 ]
            };

        let rangeValues = [1300, 1700];
        if (adjustmentRange.range != undefined) {
            rangeValues = [adjustmentRange.range.start, adjustmentRange.range.end];
        }

        let rangeElement = $(newAdjustment).find('.range');

        $(rangeElement).find('.channel-slider').noUiSlider({
            start: rangeValues,
            behaviour: 'snap-drag',
            margin: 50,
            step: 25,
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

        const isEnabled = (adjustmentRange?.range?.start !== adjustmentRange?.range?.end);
        $(enableElement).prop("checked", isEnabled).change();

        return newAdjustment;
    }

    function process_html() {

        const selectFunction = $('#functionSelectionSelect');
        let functions = [];

        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
            functions = self.FUNCTIONS_1_43;
        }
        functions.forEach(function(value, key) {
            selectFunction.append(new Option(i18n.getMessage('adjustmentsFunction' + value), key));
        });

        let auxChannelCount = FC.RC.active_channels - 5;

        const modeTableBodyElement = $('.tab-adjustments .adjustments tbody');
        for (let adjustmentIndex = 0; adjustmentIndex < FC.ADJUSTMENT_RANGES.length; adjustmentIndex++) {
            const newAdjustment = addAdjustment(adjustmentIndex, FC.ADJUSTMENT_RANGES[adjustmentIndex], auxChannelCount);
            modeTableBodyElement.append(newAdjustment);
        }

        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
            $('.tab-adjustments .adjustmentSlotsHelp').hide();
            $('.tab-adjustments .adjustmentSlotHeader').hide();
            $('.tab-adjustments .adjustmentSlot').hide();
        }

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks
        $('a.save').click(function () {

            // update internal data structures based on current UI elements
            const requiredAdjustmentRangeCount = FC.ADJUSTMENT_RANGES.length;

            FC.ADJUSTMENT_RANGES = [];

            const defaultAdjustmentRange = {
                slotIndex: 0,
                auxChannelIndex: 0,
                range: {
                    start: 900,
                    end: 900
                },
                adjustmentFunction: 0,
                auxSwitchChannelIndex: 0
            };

            $('.tab-adjustments .adjustments .adjustment').each(function () {
                const adjustmentElement = $(this);

                if ($(adjustmentElement).find('.enable').prop("checked")) {
                    const rangeValues = $(this).find('.range .channel-slider').val();
                    let slotIndex = 0;
                    if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
                        slotIndex = parseInt($(this).find('.adjustmentSlot .slot').val());
                    }

                    const adjustmentRange = {
                        slotIndex: slotIndex,
                        auxChannelIndex: parseInt($(this).find('.channelInfo .channel').val()),
                        range: {
                            start: rangeValues[0],
                            end: rangeValues[1]
                        },
                        adjustmentFunction: parseInt($(this).find('.functionSelection .function').val()),
                        auxSwitchChannelIndex: parseInt($(this).find('.functionSwitchChannel .channel').val())
                    };
                    FC.ADJUSTMENT_RANGES.push(adjustmentRange);
                } else {
                    FC.ADJUSTMENT_RANGES.push(defaultAdjustmentRange);
                }
            });

            for (let adjustmentRangeIndex = FC.ADJUSTMENT_RANGES.length; adjustmentRangeIndex < requiredAdjustmentRangeCount; adjustmentRangeIndex++) {
                FC.ADJUSTMENT_RANGES.push(defaultAdjustmentRange);
            }

            //
            // send data to FC
            //
            mspHelper.sendAdjustmentRanges(save_to_eeprom);

            function save_to_eeprom() {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                    GUI.log(i18n.getMessage('adjustmentsEepromSaved'));
                });
            }

        });

        function update_marker(auxChannelIndex, channelPosition) {
            if (channelPosition < 900) {
                channelPosition = 900;
            } else if (channelPosition > 2100) {
                channelPosition = 2100;
            }
            const percentage = (channelPosition - 900) / (2100-900) * 100;

            $('.adjustments .adjustment').each( function () {
                const auxChannelCandidateIndex = $(this).find('.channel').val();
                if (auxChannelCandidateIndex != auxChannelIndex) {
                    return;
                }
                $(this).find('.range .marker').css('left', percentage + '%');
            });
        }

        function update_ui() {
            auxChannelCount = FC.RC.active_channels - 5;

            for (let auxChannelIndex = 0; auxChannelIndex < auxChannelCount; auxChannelIndex++) {
                update_marker(auxChannelIndex, FC.RC.channels[auxChannelIndex + 5]);
            }
        }

        // enable data pulling
        GUI.interval_add('rc_pull', function () {
            MSP.send_message(MSPCodes.MSP_RC, false, false, update_ui);
        }, 100, true);

        // status data pulled via separate timer with static speed
        GUI.interval_add('status_pull', function () {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.adjustments.cleanup = function (callback) {
    if (callback) callback();
};


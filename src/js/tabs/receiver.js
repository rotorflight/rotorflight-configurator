'use strict';

TABS.receiver = {
    isDirty: false,
    rateChartHeight: 117,
    useSuperExpo: false,
    deadband: 0,
    yawDeadband: 0,
    needReboot: false,
    bindButton: false,
    stickButton: false,
    saveButtons: false,
};

TABS.receiver.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/receiver.html", process_html);
    }

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RC))
            .then(() => MSP.promise(MSPCodes.MSP_RC_TUNING))
            .then(() => MSP.promise(MSPCodes.MSP_RC_DEADBAND))
            .then(() => MSP.promise(MSPCodes.MSP_RX_MAP))
            .then(() => MSP.promise(MSPCodes.MSP_RX_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RSSI_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_RX_MAP, mspHelper.crunch(MSPCodes.MSP_SET_RX_MAP)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_RX_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_RX_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_RC_DEADBAND, mspHelper.crunch(MSPCodes.MSP_SET_RC_DEADBAND)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_RSSI_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_RSSI_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_FEATURE_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FEATURE_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                if (self.needReboot) {
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                    GUI.log(i18n.getMessage('deviceRebooting'));
                    reinitialiseConnection(callback);
                }
                else {
                    if (callback) callback();
                }
            });
    }

    function process_html() {

        // Hide the buttons toolbar
        $('.tab-receiver').addClass('toolbar_hidden');

        const featuresElement = $('.tab-receiver .features');
        FC.FEATURE_CONFIG.features.generateElements(featuresElement);

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks

        self.isDirty = false;
        self.saveButtons = false;
        self.bindButton = false;
        self.stickButton = false;
        self.needReboot = false;

        const bindBtn = $('.bind_btn');
        const stickBtn = $('.sticks_btn');
        const saveBtn = $('.save_btn');
        const rebootBtn = $('.reboot_btn');

        function updateButtons(reboot) {
            if (reboot)
                self.needReboot = true;

            if (self.saveButtons || self.bindButton || self.stickButton) {
                if (!self.isDirty) {
                    $('.tab-receiver').removeClass('toolbar_hidden');
                    self.isDirty = true;
                }
                bindBtn.toggle(self.bindButton);
                stickBtn.toggle(self.stickButton);
                saveBtn.toggle(!self.needReboot);
                rebootBtn.toggle(self.needReboot);
            }
        }

        $('.deadband input[name="deadband"]').val(FC.RC_DEADBAND_CONFIG.deadband);
        $('.deadband input[name="yaw_deadband"]').val(FC.RC_DEADBAND_CONFIG.yaw_deadband);

        $('.deadband input[name="deadband"]').change(function () {
            self.deadband = parseInt($(this).val());
        }).change();
        $('.deadband input[name="yaw_deadband"]').change(function () {
            self.yawDeadband = parseInt($(this).val());
        }).change();

        $('.sticks input[name="stick_min"]').val(FC.RX_CONFIG.stick_min);
        $('.sticks input[name="stick_center"]').val(FC.RX_CONFIG.stick_center);
        $('.sticks input[name="stick_max"]').val(FC.RX_CONFIG.stick_max);

        $('select[name="rcInterpolation-select"]').val(FC.RX_CONFIG.rcInterpolation);
        $('input[name="rcInterpolationInterval-number"]').val(FC.RX_CONFIG.rcInterpolationInterval);

        $('select[name="rcInterpolation-select"]').change(function () {
            self.updateRcInterpolationParameters();
        }).change();

        // generate bars
        const bar_names = [
            'controlAxisRoll',
            'controlAxisPitch',
            'controlAxisYaw',
            'controlAxisCollective',
            'controlAxisThrottle',
        ];

        const numBars = (FC.RC.active_channels > 0) ? FC.RC.active_channels : 8;
        const barContainer = $('.tab-receiver .bars');

        for (let i = 0, aux = 1; i < numBars; i++) {
            let name;
            if (i < bar_names.length) {
                name = i18n.getMessage(bar_names[i]);
            } else {
                name = i18n.getMessage("controlAxisAux" + (aux++));
            }

            barContainer.append('\
                <ul>\
                    <li class="name">' + name + '</li>\
                    <li class="meter">\
                        <div class="bar">\
                            <div class="label"></div>\
                            <div class="fill' + (FC.RC.active_channels == 0 ? 'disabled' : '') + '">\
                                <div class="label"></div>\
                            </div>\
                        </div>\
                    </li>\
                </ul>\
            ');
        }

        barContainer.append('\
            <ul><li></li></ul>\
            <ul>\
                <li class="name">RSSI</li>\
                <li class="meter">\
                    <div class="bar">\
                        <div class="label"></div>\
                        <div class="fill">\
                            <div class="label"></div>\
                        </div>\
                    </div>\
                </li>\
            </ul>\
        ');

        const meterScaleMin = 750;
        const meterScaleMax = 2250;

        const meterFillArray = [];
        $('.meter .fill', barContainer).each(function () {
            meterFillArray.push($(this));
        });

        const meterLabelArray = [];
        $('.meter', barContainer).each(function () {
            meterLabelArray.push($('.label', this));
        });

        // correct inner label margin on window resize (i don't know how we could do this in css)
        self.resize = function () {
            const containerWidth = $('.meter:first', barContainer).width(),
                labelWidth = $('.meter .label:first', barContainer).width(),
                margin = (containerWidth / 2) - (labelWidth / 2);

            for (let i = 0; i < meterLabelArray.length; i++) {
                meterLabelArray[i].css('margin-left', margin);
            }
        };

        $(window).on('resize', self.resize).resize(); // trigger so labels get correctly aligned on creation

        function updateRSSI() {
            const rssi = ((FC.ANALOG.rssi / 1023) * 100).toFixed(0) + '%';
            meterFillArray[numBars].css('width', rssi);
            meterLabelArray[numBars].text(rssi);
        }

        function updateBars() {
            for (let i = 0; i < FC.RC.active_channels; i++) {
                meterFillArray[i].css('width', ((FC.RC.channels[i] - meterScaleMin) / (meterScaleMax - meterScaleMin) * 100).clamp(0, 100) + '%');
                meterLabelArray[i].text(FC.RC.channels[i]);
            }
            MSP.send_message(MSPCodes.MSP_ANALOG, false, false, updateRSSI);
        }

        // handle rcmap & rssi aux channel
        let rcMapLetters = ['A', 'E', 'R', 'T', 'C', '1', '2', '3'];

        let strBuffer = [];
        for (let i = 0; i < FC.RC_MAP.length; i++) {
            strBuffer[FC.RC_MAP[i]] = rcMapLetters[i];
        }

        // reconstruct
        const str = strBuffer.join('');

        // set current value
        $('input[name="rcmap"]').val(str);

        // validation / filter
        const lastValid = str;

        $('input[name="rcmap"]').on('input', function () {
            let val = $(this).val();

            // limit length to max 8
            if (val.length > 8) {
                val = val.substr(0, 8);
                $(this).val(val);
            }
        });

        $('input[name="rcmap"]').focusout(function () {
            const val = $(this).val();
            strBuffer = val.split('');
            const duplicityBuffer = [];

            if (val.length != 8) {
                $(this).val(lastValid);
                return false;
            }

            // check if characters inside are all valid, also check for duplicity
            for (let i = 0; i < val.length; i++) {
                if (rcMapLetters.indexOf(strBuffer[i]) < 0) {
                    $(this).val(lastValid);
                    return false;
                }

                if (duplicityBuffer.indexOf(strBuffer[i]) < 0) {
                    duplicityBuffer.push(strBuffer[i]);
                } else {
                    $(this).val(lastValid);
                    return false;
                }
            }
        });

        // handle helper
        $('select[name="rcmap_helper"]').val(0); // go out of bounds
        $('select[name="rcmap_helper"]').change(function () {
            $('input[name="rcmap"]').val($(this).val());
        });

        // rssi
        const rssi_channel_e = $('select[name="rssi_channel"]');
        rssi_channel_e.append(`<option value="0">${i18n.getMessage("receiverRssiChannelDisabledOption")}</option>`);
        //1-5 reserved for Roll Pitch Yaw Collective Throttle, starting at 6
        for (let i = 6; i < FC.RC.active_channels + 1; i++) {
            rssi_channel_e.append(`<option value="${i}">${i18n.getMessage("controlAxisAux" + (i-5))}</option>`);
        }

        $('select[name="rssi_channel"]').val(FC.RSSI_CONFIG.channel);

        const serialRxSelectElement = $('select.serialRX');
        FC.getSerialRxTypes().forEach((serialRxType, index) => {
            serialRxSelectElement.append(`<option value="${index}">${serialRxType}</option>`);
        });

        serialRxSelectElement.change(function () {
            const serialRxValue = parseInt($(this).val());

            let newValue;
            if (serialRxValue !== FC.RX_CONFIG.serialrx_provider) {
                newValue = $(this).find('option:selected').text();
                updateButtons(true);
            }

            FC.RX_CONFIG.serialrx_provider = serialRxValue;
        });

        // select current serial RX type
        serialRxSelectElement.val(FC.RX_CONFIG.serialrx_provider);

        const serialRxInvertedElement = $('input[name="serialRXInverted"]');
        serialRxInvertedElement.change(function () {
            const inverted = $(this).is(':checked') ? 1 : 0;
            if (FC.RX_CONFIG.serialrx_inverted !== inverted) {
                updateButtons(true);
            }
            FC.RX_CONFIG.serialrx_inverted = inverted;
        });

        serialRxInvertedElement.prop('checked', FC.RX_CONFIG.serialrx_inverted !== 0);

        const serialRxHalfDuplexElement = $('input[name="serialRXHalfDuplex"]');
        serialRxHalfDuplexElement.change(function () {
            const halfduplex = $(this).is(':checked') ? 1 : 0;
            if (FC.RX_CONFIG.serialrx_halfduplex !== halfduplex) {
                updateButtons(true);
            }
            FC.RX_CONFIG.serialrx_halfduplex = halfduplex;
        });

        serialRxHalfDuplexElement.prop('checked', FC.RX_CONFIG.serialrx_halfduplex !== 0);

        const spiRxTypes = [
            'NRF24_V202_250K',
            'NRF24_V202_1M',
            'NRF24_SYMA_X',
            'NRF24_SYMA_X5C',
            'NRF24_CX10',
            'CX10A',
            'NRF24_H8_3D',
            'NRF24_INAV',
            'FRSKY_D',
            'FRSKY_X',
            'A7105_FLYSKY',
            'A7105_FLYSKY_2A',
            'NRF24_KN',
            'SFHSS',
            'SPEKTRUM',
            'FRSKY_X_LBT',
            'REDPINE',
        ];

        const spiRxElement = $('select.spiRx');
        for (let i = 0; i < spiRxTypes.length; i++) {
            spiRxElement.append(`<option value="${i}">${spiRxTypes[i]}</option>`);
        }

        spiRxElement.change(function () {
            const value = parseInt($(this).val());

            let newValue = undefined;
            if (value !== FC.RX_CONFIG.rxSpiProtocol) {
                newValue = $(this).find('option:selected').text();
                updateButtons(true);
            }

            FC.RX_CONFIG.rxSpiProtocol = value;
        });

        // select current serial RX type
        spiRxElement.val(FC.RX_CONFIG.rxSpiProtocol);

        $('input.feature', featuresElement).change(function () {
            const element = $(this);

            FC.FEATURE_CONFIG.features.updateData(element);
            updateTabList(FC.FEATURE_CONFIG.features);

            if (element.attr('name') === "RSSI_ADC") {
                updateButtons(true);
            }
        });

        function checkShowSerialRxBox() {
            if (FC.FEATURE_CONFIG.features.isEnabled('RX_SERIAL')) {
                $('div.serialRXBox').show();
            } else {
                $('div.serialRXBox').hide();
            }
        }

        function checkShowSpiRxBox() {
            if (FC.FEATURE_CONFIG.features.isEnabled('RX_SPI')) {
                $('div.spiRxBox').show();
            } else {
                $('div.spiRxBox').hide();
            }
        }

        $(featuresElement).filter('select').change(function () {
            const element = $(this);
            FC.FEATURE_CONFIG.features.updateData(element);
            updateTabList(FC.FEATURE_CONFIG.features);
            if (element.attr('name') === 'rxMode') {
                checkShowSerialRxBox();
                checkShowSpiRxBox();
                updateButtons(true);
            }
        });

        checkShowSerialRxBox();
        checkShowSpiRxBox();
        updateButtons();

        function updateConfig() {

            FC.RX_CONFIG.stick_max = parseInt($('.sticks input[name="stick_max"]').val());
            FC.RX_CONFIG.stick_center = parseInt($('.sticks input[name="stick_center"]').val());
            FC.RX_CONFIG.stick_min = parseInt($('.sticks input[name="stick_min"]').val());
            FC.RC_DEADBAND_CONFIG.yaw_deadband = parseInt($('.deadband input[name="yaw_deadband"]').val());
            FC.RC_DEADBAND_CONFIG.deadband = parseInt($('.deadband input[name="deadband"]').val());

            // catch rc map
            rcMapLetters = ['A', 'E', 'R', 'T', 'C', '1', '2', '3'];
            strBuffer = $('input[name="rcmap"]').val().split('');

            for (let i = 0; i < FC.RC_MAP.length; i++) {
                FC.RC_MAP[i] = strBuffer.indexOf(rcMapLetters[i]);
            }

            // catch smoothing channels
            const rcSmoothingChannels =
                  ( $('#rcSmoothingRoll').is(':checked')       ?  1 : 0 ) +
                  ( $('#rcSmoothingPitch').is(':checked')      ?  2 : 0 ) +
                  ( $('#rcSmoothingYaw').is(':checked')        ?  4 : 0 ) +
                  ( $('#rcSmoothingThrottle').is(':checked')   ?  8 : 0 ) +
                  ( $('#rcSmoothingCollective').is(':checked') ? 16 : 0 );

            // catch rssi aux
            FC.RSSI_CONFIG.channel = parseInt($('select[name="rssi_channel"]').val());

            FC.RX_CONFIG.rcInterpolation = parseInt($('select[name="rcInterpolation-select"]').val());
            FC.RX_CONFIG.rcInterpolationInterval = parseInt($('input[name="rcInterpolationInterval-number"]').val());
            FC.RX_CONFIG.rcSmoothingInputCutoff = parseInt($('input[name="rcSmoothingInputHz-number"]').val());
            FC.RX_CONFIG.rcSmoothingDerivativeCutoff = parseInt($('input[name="rcSmoothingDerivativeCutoff-number"]').val());
            FC.RX_CONFIG.rcSmoothingDerivativeType = parseInt($('select[name="rcSmoothingDerivativeType-select"]').val());
            FC.RX_CONFIG.rcSmoothingInputType = parseInt($('select[name="rcSmoothingInputType-select"]').val());
            FC.RX_CONFIG.rcInterpolationChannels = rcSmoothingChannels;
            FC.RX_CONFIG.rcSmoothingAutoSmoothness = parseInt($('input[name="rcSmoothingAutoSmoothness-number"]').val());
        }

        $("a.sticks").click(function() {
            const windowWidth = 370;
            const windowHeight = 510;

            chrome.app.window.create("/tabs/receiver_msp.html", {
                id: "receiver_msp",
                innerBounds: {
                    minWidth: windowWidth, minHeight: windowHeight,
                    width: windowWidth, height: windowHeight,
                    maxWidth: windowWidth, maxHeight: windowHeight
                },
                alwaysOnTop: true
            }, function(createdWindow) {
                // Give the window a callback it can use to send the channels (otherwise it can't see those objects)
                createdWindow.contentWindow.setRawRx = function(channels) {
                    if (CONFIGURATOR.connectionValid && GUI.active_tab != 'cli') {
                        mspHelper.setRawRx(channels);
                        return true;
                    } else {
                        return false;
                    }
                };

                DarkTheme.isDarkThemeEnabled(function(isEnabled) {
                    windowWatcherUtil.passValue(createdWindow, 'darkTheme', isEnabled);
                });

            });
        });

        self.bindButton = bit_check(FC.CONFIG.targetCapabilities, FC.TARGET_CAPABILITIES_FLAGS.SUPPORTS_RX_BIND);
        updateButtons();

        $("a.bind").click(function() {
            MSP.send_message(MSPCodes.MSP2_BETAFLIGHT_BIND);
            GUI.log(i18n.getMessage('receiverButtonBindMessage'));
        });

        // Only show the MSP control sticks if the MSP Rx feature is enabled
        self.stickButton = FC.FEATURE_CONFIG.features.isEnabled('RX_MSP');

        // RC Smoothing
        $('.tab-receiver .rcSmoothing').show();

        const rc_smoothing_protocol_e = $('select[name="rcSmoothing-select"]');
        rc_smoothing_protocol_e.change(function () {
            FC.RX_CONFIG.rcSmoothingType = $(this).val();
            updateInterpolationView();
        });
        rc_smoothing_protocol_e.val(FC.RX_CONFIG.rcSmoothingType);

        const rcSmoothingNumberElement = $('input[name="rcSmoothingInputHz-number"]');
        const rcSmoothingDerivativeNumberElement = $('input[name="rcSmoothingDerivativeCutoff-number"]');
        rcSmoothingNumberElement.val(FC.RX_CONFIG.rcSmoothingInputCutoff);
        rcSmoothingDerivativeNumberElement.val(FC.RX_CONFIG.rcSmoothingDerivativeCutoff);
        $('.tab-receiver .rcSmoothing-input-cutoff').show();
        $('select[name="rcSmoothing-input-manual-select"]').val("1");
        if (FC.RX_CONFIG.rcSmoothingInputCutoff == 0) {
            $('.tab-receiver .rcSmoothing-input-cutoff').hide();
            $('select[name="rcSmoothing-input-manual-select"]').val("0");
        }
        $('select[name="rcSmoothing-input-manual-select"]').change(function () {
            if ($(this).val() == 0) {
                rcSmoothingNumberElement.val(0);
                $('.tab-receiver .rcSmoothing-input-cutoff').hide();
            }
            if ($(this).val() == 1) {
                rcSmoothingNumberElement.val(FC.RX_CONFIG.rcSmoothingInputCutoff);
                $('.tab-receiver .rcSmoothing-input-cutoff').show();
            }
        }).change();

        $('.tab-receiver .rcSmoothing-derivative-cutoff').show();
        $('select[name="rcSmoothing-input-derivative-select"]').val("1");
        if (FC.RX_CONFIG.rcSmoothingDerivativeCutoff == 0) {
            $('select[name="rcSmoothing-input-derivative-select"]').val("0");
            $('.tab-receiver .rcSmoothing-derivative-cutoff').hide();
        }
        $('select[name="rcSmoothing-input-derivative-select"]').change(function () {
            if ($(this).val() == 0) {
                $('.tab-receiver .rcSmoothing-derivative-cutoff').hide();
                rcSmoothingDerivativeNumberElement.val(0);
            }
            if ($(this).val() == 1) {
                $('.tab-receiver .rcSmoothing-derivative-cutoff').show();
                rcSmoothingDerivativeNumberElement.val(FC.RX_CONFIG.rcSmoothingDerivativeCutoff);
            }
        }).change();

        $('#rcSmoothingRoll').prop('checked', (FC.RX_CONFIG.rcInterpolationChannels & 1));
        $('#rcSmoothingPitch').prop('checked', (FC.RX_CONFIG.rcInterpolationChannels & 2));
        $('#rcSmoothingYaw').prop('checked', (FC.RX_CONFIG.rcInterpolationChannels & 4));
        $('#rcSmoothingThrottle').prop('checked', (FC.RX_CONFIG.rcInterpolationChannels & 8));
        $('#rcSmoothingCollective').prop('checked', (FC.RX_CONFIG.rcInterpolationChannels & 16));

        const rcSmoothingDerivativeType = $('select[name="rcSmoothingDerivativeType-select"]');
        rcSmoothingDerivativeType.append($(`<option value="3">${i18n.getMessage("receiverRcSmoothingDerivativeTypeAuto")}</option>`));
        rcSmoothingDerivativeType.val(FC.RX_CONFIG.rcSmoothingDerivativeType);

        const rcSmoothingInputType = $('select[name="rcSmoothingInputType-select"]');
        rcSmoothingInputType.val(FC.RX_CONFIG.rcSmoothingInputType);

        $('select[name="rcSmoothing-input-manual-select"], select[name="rcSmoothing-input-derivative-select"]').change(function() {
            if ($('select[name="rcSmoothing-input-manual-select"]').val() == 0 || $('select[name="rcSmoothing-input-derivative-select"]').val() == 0) {
                $('.tab-receiver .rcSmoothing-auto-smoothness').show();
            } else {
                $('.tab-receiver .rcSmoothing-auto-smoothness').hide();
            }
        });
        $('select[name="rcSmoothing-input-manual-select"]').change();

        const rcSmoothingAutoSmoothness = $('input[name="rcSmoothingAutoSmoothness-number"]');
        rcSmoothingAutoSmoothness.val(FC.RX_CONFIG.rcSmoothingAutoSmoothness);

        updateInterpolationView();

        self.initModelPreview();
        self.renderModel();

        $('.content_wrapper').change(function () {
            self.saveButtons = true;
            updateButtons(true);
        });

        self.save = function(callback) {
            updateConfig();
            save_data(callback);
        };

        self.revert = function(callback) {
            callback();
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

        GUI.interval_add('receiver_pull', function () {
            MSP.send_message(MSPCodes.MSP_RC, false, false, updateBars);
        }, 33, false);

        GUI.interval_add('status_pull', function () {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

TABS.receiver.initModelPreview = function () {
    this.keepRendering = true;
    this.model = new Model($('.model_preview'), $('.model_preview canvas'));
    this.useSuperExpo = true;
    this.rateCurve = new RateCurve2();

    $(window).on('resize', $.proxy(this.model.resize, this.model));
};

TABS.receiver.renderModel = function () {
    if (this.keepRendering) { requestAnimationFrame(this.renderModel.bind(this)); }

    if (!this.clock) { this.clock = new THREE.Clock(); }

    if (FC.RC.channels[0] && FC.RC.channels[1] && FC.RC.channels[2]) {
        const delta = this.clock.getDelta();

        const roll  = delta * this.rateCurve.rcCommandRawToDegreesPerSecond(FC.RC.channels[0], FC.RC_TUNING.rates_type, FC.RC_TUNING.roll_rate, FC.RC_TUNING.RC_RATE, FC.RC_TUNING.RC_EXPO, this.useSuperExpo, this.deadband, FC.RC_TUNING.roll_rate_limit),
            pitch = delta * this.rateCurve.rcCommandRawToDegreesPerSecond(FC.RC.channels[1], FC.RC_TUNING.rates_type, FC.RC_TUNING.pitch_rate, FC.RC_TUNING.rcPitchRate, FC.RC_TUNING.RC_PITCH_EXPO, this.useSuperExpo, this.deadband, FC.RC_TUNING.pitch_rate_limit),
            yaw   = delta * this.rateCurve.rcCommandRawToDegreesPerSecond(FC.RC.channels[2], FC.RC_TUNING.rates_type, FC.RC_TUNING.yaw_rate, FC.RC_TUNING.rcYawRate, FC.RC_TUNING.RC_YAW_EXPO, this.useSuperExpo, this.yawDeadband, FC.RC_TUNING.yaw_rate_limit);

        this.model.rotateBy(-degToRad(pitch), -degToRad(yaw), -degToRad(roll));
    }
};

TABS.receiver.cleanup = function (callback) {
    $(window).off('resize', this.resize);

    if (this.model) {
        $(window).off('resize', $.proxy(this.model.resize, this.model));
        this.model.dispose();
    }

    this.keepRendering = false;
    this.isDirty = false;

    if (callback) callback();
};

TABS.receiver.updateRcInterpolationParameters = function () {
    if ($('select[name="rcInterpolation-select"]').val() === '3') {
        $('.tab-receiver .rc-interpolation-manual').show();
    } else {
        $('.tab-receiver .rc-interpolation-manual').hide();
    }
};

function updateInterpolationView() {
    $('.tab-receiver .rcInterpolation').hide();
    $('.tab-receiver .rcSmoothing-derivative-cutoff').show();
    $('.tab-receiver .rcSmoothing-input-cutoff').show();
    $('.tab-receiver .rcSmoothing-derivative-type').show();
    $('.tab-receiver .rcSmoothing-input-type').show();
    $('.tab-receiver .rcSmoothing-derivative-manual').show();
    $('.tab-receiver .rcSmoothing-input-manual').show();

    if (FC.RX_CONFIG.rcSmoothingDerivativeCutoff == 0 || FC.RX_CONFIG.rcSmoothingInputCutoff == 0) {
        $('.tab-receiver .rcSmoothing-auto-smoothness').show();
    }
    if (FC.RX_CONFIG.rcSmoothingType == 0) {
        $('.tab-receiver .rcInterpolation').show();
        $('.tab-receiver .rcSmoothing-derivative-cutoff').hide();
        $('.tab-receiver .rcSmoothing-input-cutoff').hide();
        $('.tab-receiver .rcSmoothing-derivative-type').hide();
        $('.tab-receiver .rcSmoothing-input-type').hide();
        $('.tab-receiver .rcSmoothing-derivative-manual').hide();
        $('.tab-receiver .rcSmoothing-input-manual').hide();
        $('.tab-receiver .rcSmoothing-auto-smoothness').hide();
    }
    if (FC.RX_CONFIG.rcSmoothingDerivativeCutoff == 0) {
        $('.tab-receiver .rcSmoothing-derivative-cutoff').hide();
    }
    if (FC.RX_CONFIG.rcSmoothingInputCutoff == 0) {
        $('.tab-receiver .rcSmoothing-input-cutoff').hide();
    }
}

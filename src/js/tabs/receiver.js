import { mount, unmount } from "svelte";
import { Clock } from "three";

import { Model } from "@/js/model.js";
import { windowWatcherUtil } from '@/js/utils/window_watchers.js';
import Receiver from "@/tabs/receiver/Receiver.svelte";

const tab = {
    tabName: 'receiver',
    svelteComponent: null,
    isDirty: false,
    needReboot: false,
    bindButton: false,
    stickButton: false,
    saveButtons: false,
    rcRPY: [ 0, 0, 0, ],
    rcmap: [ 0, 1, 2, 3, 4, 5, 6, 7 ],
    rcmapSize: 8,
    axisLetters: ['A', 'E', 'R', 'C', 'T', '1', '2', '3'],
    axisNames: [
        { value: 0, text: 'controlAxisRoll' },
        { value: 1, text: 'controlAxisPitch' },
        { value: 2, text: 'controlAxisYaw' },
        { value: 3, text: 'controlAxisCollective' },
        { value: 4, text: 'controlAxisThrottle' },
        { value: 5, text: 'controlAxisAux1' },
        { value: 6, text: 'controlAxisAux2' },
        { value: 7, text: 'controlAxisAux3' },
        { value: 8, text: 'controlAxisAux4' },
        { value: 9, text: 'controlAxisAux5' },
        { value: 10, text: 'controlAxisAux6' },
        { value: 11, text: 'controlAxisAux7' },
        { value: 12, text: 'controlAxisAux8' },
        { value: 13, text: 'controlAxisAux9' },
        { value: 14, text: 'controlAxisAux10' },
        { value: 15, text: 'controlAxisAux11' },
        { value: 16, text: 'controlAxisAux12' },
        { value: 17, text: 'controlAxisAux13' },
        { value: 18, text: 'controlAxisAux14' },
        { value: 19, text: 'controlAxisAux15' },
        { value: 20, text: 'controlAxisAux16' },
        { value: 21, text: 'controlAxisAux17' },
        { value: 22, text: 'controlAxisAux18' },
        { value: 23, text: 'controlAxisAux19' },
        { value: 24, text: 'controlAxisAux20' },
        { value: 25, text: 'controlAxisAux21' },
        { value: 26, text: 'controlAxisAux22' },
        { value: 27, text: 'controlAxisAux23' },
        { value: 28, text: 'controlAxisAux24' },
        { value: 29, text: 'controlAxisAux25' },
        { value: 30, text: 'controlAxisAux26' },
        { value: 31, text: 'controlAxisAux27' },
    ],
    rssiOptions: [
        { value: 0,  text:'rssiOptionAUTO' },
        { value: 1,  text:'rssiOptionADC'  },
        { value: 6,  text:'controlAxisAux1' },
        { value: 7,  text:'controlAxisAux2' },
        { value: 8,  text:'controlAxisAux3' },
        { value: 9,  text:'controlAxisAux4' },
        { value: 10, text:'controlAxisAux5' },
        { value: 11, text:'controlAxisAux6' },
        { value: 12, text:'controlAxisAux7' },
        { value: 13, text:'controlAxisAux8' },
        { value: 14, text:'controlAxisAux9' },
        { value: 15, text:'controlAxisAux10' },
        { value: 16, text:'controlAxisAux11' },
        { value: 17, text:'controlAxisAux12' },
        { value: 18, text:'controlAxisAux13' },
        { value: 19, text:'controlAxisAux14' },
        { value: 20, text:'controlAxisAux15' },
        { value: 21, text:'controlAxisAux16' },
        { value: 22, text:'controlAxisAux17' },
        { value: 23, text:'controlAxisAux18' },
        { value: 24, text:'controlAxisAux19' },
        { value: 25, text:'controlAxisAux20' },
        { value: 26, text:'controlAxisAux21' },
        { value: 27, text:'controlAxisAux22' },
        { value: 28, text:'controlAxisAux23' },
        { value: 29, text:'controlAxisAux24' },
        { value: 30, text:'controlAxisAux25' },
        { value: 31, text:'controlAxisAux26' },
        { value: 32, text:'controlAxisAux27' },
    ],
};

tab.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("/src/tabs/receiver.html", process_html);
    }

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RX_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RX_MAP))
            .then(() => MSP.promise(MSPCodes.MSP_RC_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RC_TUNING))
            .then(() => MSP.promise(MSPCodes.MSP_RSSI_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_SERIAL_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_TELEMETRY_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_RC))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_RX_MAP, mspHelper.crunch(MSPCodes.MSP_SET_RX_MAP)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_RX_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_RX_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_RC_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_RC_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_RSSI_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_RSSI_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_TELEMETRY_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_TELEMETRY_CONFIG)))
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
                    callback?.();
                }
            });
    }

    function process_html() {
        self.svelteComponent = mount(Receiver, {
            target: document.querySelector("#svelte-receiver"),
            props: {
                onchange: () => {
                    self.saveButtons = true;
                    updateButtons(true);
                }
            }
        });

        // Hide the buttons toolbar
        $('.tab-receiver').addClass('toolbar_hidden');

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
        const revertBtn = $('.revert_btn');

        function updateButtons(reboot) {
            let enableSave = true;

            if (FC.TELEMETRY_CONFIG.telemetry_sensors_list.length > 40) {
                enableSave = false;
            }

            if (reboot)
                self.needReboot = true;
            if (self.saveButtons)
                self.isDirty = true;
            if (self.saveButtons || self.bindButton || self.stickButton) {
                $('.tab-receiver').removeClass('toolbar_hidden');
                bindBtn.toggle(self.bindButton);
                stickBtn.toggle(self.stickButton);
                saveBtn.toggle(!self.needReboot && self.saveButtons && enableSave);
                rebootBtn.toggle(self.needReboot && self.saveButtons && enableSave);
                revertBtn.toggle(self.saveButtons);
                $('.disabled_save_reboot_btn').toggle(self.saveButtons && !enableSave);
            }
        }

    //// Channels Bars

        function addChannelBar(parent, name, options) {
            const elem = $('#receiverBarTemplate tr').clone();
            elem.find('.name').text(name);
            const chSelect = elem.find('.channel_select');
            if (options) {
                options.forEach((item) => {
                    const text = i18n.getMessage(item.text);
                    chSelect.append(`<option value="${item.value}">${text}</option>`);
                });
            } else {
                chSelect.hide();
            }
            elem.find('.fill').css('width', '0%');
            parent.append(elem);
            return elem;
        }

        function updateChannelBar(elem, width, label1, label2) {
            elem.find('.fill').css('width', width);
            elem.find('.label1').text(label1);
            elem.find('.label2').text(label2);
        }

        self.mapChannels = FC.RC_MAP.length;
        self.numChannels = FC.RC.active_channels;
        self.barChannels = Math.min(self.numChannels, 18);
        self.guiChannels = Math.max(self.barChannels, self.mapChannels);

        const chContainer = $('.tab-receiver .channels');

        const channelElems = [];
        const channelSelect = [];

        for (let ch = 0; ch < self.guiChannels; ch++) {
            if (ch < self.mapChannels) {
                const elem = addChannelBar(chContainer, `CH${ch + 1}`, self.axisNames.slice(0, self.mapChannels));
                channelElems.push(elem);

                const chsel = elem.find('.channel_select');
                channelSelect.push(chsel);

                chsel.change(function () {
                    const newAxis = parseInt(chsel.val());
                    const oldAxis = self.rcmap.indexOf(ch);

                    self.rcmap[oldAxis] = self.rcmap[newAxis];
                    self.rcmap[newAxis] = ch;

                    setRcMapGUI();
                });
            }
            else {
                const options = [ self.axisNames[ch] ];
                const elem = addChannelBar(chContainer, `CH${ch + 1}`, options);
                channelElems.push(elem);

                const chsel = elem.find('.channel_select');
                chsel.prop('disabled', true);
            }
        }


    //// RSSI

        // RSSI bar
        const rssiBar = addChannelBar(chContainer, 'RSSI', self.rssiOptions.slice(0, self.numChannels - 3));
        const rssiSelect = rssiBar.find('.channel_select');

        rssiSelect.change(function() {
            const value = parseInt(rssiSelect.val());
            FC.FEATURE_CONFIG.features.setFeature('RSSI_ADC', value == 1);
            FC.RSSI_CONFIG.channel = (value > 5) ? value : 0;
        });

        if (FC.FEATURE_CONFIG.features.isEnabled('RSSI_ADC')) {
            rssiSelect.val(1);
        }
        else if (FC.RSSI_CONFIG.channel > 5) {
            rssiSelect.val(FC.RSSI_CONFIG.channel);
        }
        else {
            rssiSelect.val(0);
        }


    //// RX Channels

        function calcRcCommand(axis, pulse) {
            var deflection = 0;
            var deadband = 0;
            var result = 0;
            var range = 0;
            if (axis > 4 || pulse < 750 || pulse > 2250) {
                return 0;
            }
            switch (axis) {
                case 0:
                case 1:
                    deflection = pulse - FC.RC_CONFIG.rc_center;
                    deadband = FC.RC_CONFIG.rc_deadband;
                    range = FC.RC_CONFIG.rc_deflection - FC.RC_CONFIG.rc_deadband;
                    break;
                case 2:
                    deflection = pulse - FC.RC_CONFIG.rc_center;
                    deadband = FC.RC_CONFIG.rc_yaw_deadband;
                    range = FC.RC_CONFIG.rc_deflection - FC.RC_CONFIG.rc_yaw_deadband;
                    break;
                case 3:
                    deflection = pulse - FC.RC_CONFIG.rc_center;
                    deadband = 0;
                    range = FC.RC_CONFIG.rc_deflection;
                    break;
                case 4:
                    deflection = pulse - FC.RC_CONFIG.rc_min_throttle;
                    deadband = 0;
                    range = FC.RC_CONFIG.rc_max_throttle - FC.RC_CONFIG.rc_min_throttle;
                    break;
            }
            if (deflection > deadband)
                result = (deflection - deadband) / range;
            else if (deflection < -deadband)
                result = (deflection + deadband) / range;
            return result;
        }

        function calcStickPercentage(axis, command) {
            return (axis < 5) ? (command * 100).toFixed(1) + '%' : '';
        }

        function updateBars() {
            const meterScaleMin = 750;
            const meterScaleMax = 2250;
            for (let ch = 0; ch < self.barChannels; ch++) {
                const axis = (ch < self.mapChannels) ? self.rcmap.indexOf(ch) : ch;
                const pulse = FC.RX_CHANNELS[ch];
                const width = (100 * (pulse - meterScaleMin) / (meterScaleMax - meterScaleMin)).clamp(0, 100) + '%';
                const command = calcRcCommand(axis, pulse);
                const percent = calcStickPercentage(axis, command);
                updateChannelBar(channelElems[ch], width, pulse, percent);
                if (axis < 3) {
                    // RPY used with the preview model
                    self.rcRPY[axis] = pulse ? 1500 + 500 * command : 0;
                }
            }

            const rssi = ((FC.ANALOG.rssi / 1023) * 100).toFixed(0) + '%';
            updateChannelBar(rssiBar, rssi, FC.ANALOG.rssi, rssi);
        }

        self.resize = function () {
            const barWidth = $('.meter:last', chContainer).width();
            const labelWidth = $('.meter:last .label2', chContainer).width();
            const margin = Math.max(barWidth - labelWidth - 15, 40);
            $('.channels .label1').css('margin-left', '15px');
            $('.channels .label2').css('margin-left', margin + 'px');
        };

        $(window).on('resize', self.resize).resize();


    //// RCMAP

        const rcmapInput = $('input[name="rcmap"]');
        const rcmapPreset = $('select[name="rcmap_preset"]');

        rcmapPreset.val(0);

        function setRcMapGUI() {
            const rcbuf = [];
            for (let axis = 0; axis < self.mapChannels; axis++) {
                const ch = self.rcmap[axis];
                rcbuf[ch] = self.axisLetters[axis];
                channelSelect[ch].val(axis);
            }
            rcmapInput.val(rcbuf.join(''));
        }

        rcmapInput.on('input', function () {
            const val = rcmapInput.val();
            if (val.length > self.mapChannels) {
                rcmapInput.val(val.substring(0, self.mapChannels));
            }
        });

        rcmapInput.on('change', function () {
            const val = rcmapInput.val();

            if (val.length != self.mapChannels) {
                setRcMapGUI();
                return false;
            }

            const rcvec = val.split('');
            const rcmap = [];

            for (let ch = 0; ch < self.mapChannels; ch++) {
                const letter = rcvec[ch];
                const axis = self.axisLetters.indexOf(letter);
                if (axis < 0 || rcvec.slice(0,ch).indexOf(letter) >= 0) {
                    setRcMapGUI();
                    return false;
                }
                rcmap[axis] = ch;
            }

            self.rcmap = rcmap;
            setRcMapGUI();

            return true;
        });

        rcmapPreset.on('change', function () {
            rcmapInput.val(rcmapPreset.val()).change();
            rcmapPreset.val(0);
        });

        self.rcmap = FC.RC_MAP;


    //// Virtual Stick

        $("a.sticks").click(function() {
            const windowWidth = 370;
            const windowHeight = 510;

            // use a fully qualified url so nw doesn't look on the filesystem
            // when using the vite dev server
            const location = new URL(window.location.href);
            location.pathname = "/src/tabs/receiver_msp.html";
            nw.Window.open(location.toString(), {
                id: "receiver_msp",
                always_on_top: true,
                max_width: windowWidth, max_height: windowHeight,
            }, function(createdWindow) {
                createdWindow.resizeTo(windowWidth, windowHeight);
                createdWindow.window.i18n = i18n;

                // Give the window a callback it can use to send the channels (otherwise it can't see those objects)
                createdWindow.window.setRawRx = function(channels) {
                    if (CONFIGURATOR.connectionValid && GUI.active_tab != 'cli') {
                        const data = [];
                        FC.RC_MAP.forEach((axis, channel) => {
                            data[axis] = channels[channel];
                        });
                        mspHelper.setRawRx(data);
                        return true;
                    } else {
                        return false;
                    }
                };

                DarkTheme.isDarkThemeEnabled(function(isEnabled) {
                    windowWatcherUtil.passValue(createdWindow.window, 'darkTheme', isEnabled);
                });

            });
        });

        // Only show the MSP control sticks if the MSP Rx feature is enabled
        self.stickButton = GUI.isNWJS() && FC.FEATURE_CONFIG.features.isEnabled('RX_MSP');


    //// Bind button

        self.bindButton = bit_check(FC.CONFIG.targetCapabilities, FC.TARGET_CAPABILITIES_FLAGS.SUPPORTS_RX_BIND);
        updateButtons();

        $("a.bind").click(function() {
            MSP.send_message(MSPCodes.MSP2_BETAFLIGHT_BIND);
            GUI.log(i18n.getMessage('receiverButtonBindMessage'));
        });


    //// Update data

        function updateConfig() {
            FC.RC_MAP = self.rcmap;
        }


    //// Main GUI

        setRcMapGUI();
        updateButtons();

        self.initModelPreview();
        self.renderModel();

        $('.content_wrapper').on("change", function () {
            self.saveButtons = true;
            updateButtons(true);
        });

        self.save = function(callback) {
            updateConfig();
            save_data(callback);
        };

        self.revert = function(callback) {
            callback?.();
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
            MSP.send_message(MSPCodes.MSP_BATTERY_STATE, false, false, function () {
                MSP.send_message(MSPCodes.MSP_RX_CHANNELS, false, false, function () {
                    MSP.send_message(MSPCodes.MSP_RC_COMMAND, false, false, updateBars);
                });
            });
        }, 25, false);

        GUI.interval_add('status_pull', function () {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }
};

tab.initModelPreview = function () {
    const self = this;

    try {
        self.model = new Model($('#canvas_wrapper'), $('#canvas'));
        $(window).on('resize', $.proxy(self.model.resize, self.model));
        $('#canvas_wrapper .webgl-error').hide();
    } catch (err) {
        console.log("Error initialising model", err);
        $('#canvas_wrapper .webgl-error').show();
    }

    self.clock = new Clock();
    self.rateCurve = new RateCurve2();
    self.keepRendering = true;

    self.currentRatesType = FC.RC_TUNING.rates_type;

    self.currentRates = {
        roll_rate:         FC.RC_TUNING.roll_rate,
        pitch_rate:        FC.RC_TUNING.pitch_rate,
        yaw_rate:          FC.RC_TUNING.yaw_rate,
        rc_rate:           FC.RC_TUNING.RC_RATE,
        rc_rate_yaw:       FC.RC_TUNING.rcYawRate,
        rc_expo:           FC.RC_TUNING.RC_EXPO,
        rc_yaw_expo:       FC.RC_TUNING.RC_YAW_EXPO,
        rc_rate_pitch:     FC.RC_TUNING.rcPitchRate,
        rc_pitch_expo:     FC.RC_TUNING.RC_PITCH_EXPO,
        roll_rate_limit:   FC.RC_TUNING.roll_rate_limit,
        pitch_rate_limit:  FC.RC_TUNING.pitch_rate_limit,
        yaw_rate_limit:    FC.RC_TUNING.yaw_rate_limit,
        deadband:          0,
        yawDeadband:       0,
        superexpo:         true
    };

    switch (self.currentRatesType) {

        case 2:
            self.currentRates.roll_rate     *= 100;
            self.currentRates.pitch_rate    *= 100;
            self.currentRates.yaw_rate      *= 100;
            self.currentRates.rc_rate       *= 1000;
            self.currentRates.rc_rate_yaw   *= 1000;
            self.currentRates.rc_rate_pitch *= 1000;
            self.currentRates.rc_expo       *= 100;
            self.currentRates.rc_yaw_expo   *= 100;
            self.currentRates.rc_pitch_expo *= 100;
            break;

        case 4:
            self.currentRates.roll_rate     *= 1000;
            self.currentRates.pitch_rate    *= 1000;
            self.currentRates.yaw_rate      *= 1000;
            self.currentRates.rc_rate       *= 1000;
            self.currentRates.rc_rate_yaw   *= 1000;
            self.currentRates.rc_rate_pitch *= 1000;
            break;

        case 5:
            self.currentRates.roll_rate     *= 1000;
            self.currentRates.pitch_rate    *= 1000;
            self.currentRates.yaw_rate      *= 1000;
            break;

        default:
            break;
    }
};

tab.renderModel = function () {
    const self = this;

    if (self.keepRendering) {
        requestAnimationFrame(self.renderModel.bind(this));
    }

    if (self.rcRPY[0] && self.rcRPY[1] && self.rcRPY[2]) {
        const delta = self.clock.getDelta();

        const roll = delta * self.rateCurve.rcCommandRawToDegreesPerSecond(
            self.rcRPY[0],
            self.currentRatesType,
            self.currentRates.roll_rate,
            self.currentRates.rc_rate,
            self.currentRates.rc_expo,
            self.currentRates.superexpo,
            self.currentRates.deadband,
            self.currentRates.roll_rate_limit
        );
        const pitch = delta * self.rateCurve.rcCommandRawToDegreesPerSecond(
            self.rcRPY[1],
            self.currentRatesType,
            self.currentRates.pitch_rate,
            self.currentRates.rc_rate_pitch,
            self.currentRates.rc_pitch_expo,
            self.currentRates.superexpo,
            self.currentRates.deadband,
            self.currentRates.pitch_rate_limit
        );
        const yaw = delta * self.rateCurve.rcCommandRawToDegreesPerSecond(
            self.rcRPY[2],
            self.currentRatesType,
            self.currentRates.yaw_rate,
            self.currentRates.rc_rate_yaw,
            self.currentRates.rc_yaw_expo,
            self.currentRates.superexpo,
            self.currentRates.yawDeadband,
            self.currentRates.yaw_rate_limit
        );

        self.model?.rotateBy(-degToRad(pitch), -degToRad(yaw), -degToRad(roll));
    }
};

tab.cleanup = function (callback) {
    if (this.svelteComponent) {
        unmount(this.svelteComponent);
        this.svelteComponent = null;
    }

    $(window).off('resize', this.resize);

    this.keepRendering = false;

    if (this.model) {
        $(window).off('resize', $.proxy(this.model.resize, this.model));
        this.model.dispose();
    }

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

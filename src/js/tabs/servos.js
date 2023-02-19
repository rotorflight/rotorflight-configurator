'use strict';

TABS.servos = {

    isDirty: false,

    MAX_SERVOS: 8,
    OVERRIDE_OFF: 2001,
};

TABS.servos.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_SERVO_CONFIGURATIONS))
            .then(() => MSP.promise(MSPCodes.MSP_SERVO_OVERRIDE))
            .then(() => MSP.promise(MSPCodes.MSP_SERVO))
            .then(callback);
    }

    function save_data(reboot, callback) {
        mspHelper.sendServoConfigurations(function () {
            MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, function () {
                GUI.log(i18n.getMessage('eepromSaved'));
                if (reboot) {
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                    GUI.log(i18n.getMessage('deviceRebooting'));
                    reinitialiseConnection(callback);
                } else callback();
            });
        });
    }

    function load_html() {
        $('#content').load("./tabs/servos.html", process_html);
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks

        // Hide the buttons toolbar
        $('.tab-servos').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-servos').removeClass('toolbar_hidden');
            }
        }

        function process_warnings() {

            let unusualScale = false;
            let unusualRate = false;
            let unusualLimit = false;
            let unusualGeoCor = false;

            const SERVOS = FC.SERVO_CONFIG;

            for (let index = 0; index < FC.CONFIG.servoCount; index++) {
                const servo = SERVOS[index];

                if (servo.mid > 860) {
                    if (servo.rate > 333)
                        unusualRate = true;

                    // Unusual: value > 500 ± 25%
                    if (servo.min < -625 || servo.min > -375 || servo.max >  625 || servo.max <  375)
                        unusualLimit = true;

                    if (servo.rneg < 375 || servo.rneg > 625 || servo.rpos <  375 || servo.rpos >  625)
                        unusualScale = true;
                } else {
                    if (servo.rate > 560)
                        unusualRate = true;

                    // Unusual: value > 250 ± 25%
                    if (servo.min < -312 || servo.min > -187 || servo.max >  312 || servo.max <  187)
                        unusualLimit = true;

                    if (servo.rneg < 187 || servo.rneg > 312 || servo.rpos <  187 || servo.rpos >  312)
                        unusualScale = true;
                }
            }

            if (FC.CONFIG.servoCount == 2) {
                // Fixed pitch heli with 2 servos
                if ((SERVOS[0].flags & 2) != (SERVOS[1].flags & 2))
                    unusualGeoCor = true;
            } else if (FC.CONFIG.servoCount >= 3) {
                // Collective pitch with 3 or more servos
                if (((SERVOS[0].flags & 2) != (SERVOS[1].flags & 2)) ||
                    ((SERVOS[1].flags & 2) != (SERVOS[2].flags & 2)) ||
                    ((SERVOS[0].flags & 2) != (SERVOS[2].flags & 2)))
                    unusualGeoCor = true;
            }

            $('.servo-unusual-limits-warning').toggle(unusualLimit);
            $('.servo-unusual-scales-warning').toggle(unusualScale);
            $('.servo-unusual-rates-warning').toggle(unusualRate);
            $('.servo-unusual-geometry-correction').toggle(unusualGeoCor);

            $('.warnings').toggle(unusualLimit || unusualScale || unusualRate || unusualGeoCor);
        }

        function process_override(servoIndex) {

            const servoOverride = $('#tab-servos-templates .servoOverrideTemplate tr').clone();
            const servoSlider = servoOverride.find('.servoOverrideSlider');
            const servoEnable = servoOverride.find('.servoOverrideEnable input');
            const servoInput  = servoOverride.find('.servoOverrideInput input');

            servoOverride.attr('class', `servoOverride${servoIndex}`);
            servoOverride.find('.servoOverrideIndex').text(`#${servoIndex+1}`);

            servoSlider.noUiSlider({
                range: {
                    'min': -90,
                    'max':  90,
                },
                start: 0,
                step: 5,
                behaviour: 'snap-drag',
            });

            servoOverride.find('.pips-range').noUiSlider_pips({
                mode: 'values',
                values: [ -80, -60, -40, -20, 0, 20, 40, 60, 80, ],
                density: 100 / ((80 + 80) / 5),
                stepped: true,
                format: wNumb({
                    decimals: 0,
                }),
            });

            servoSlider.on('slide', function () {
                servoInput.val(parseInt($(this).val()));
            });

            servoSlider.on('change', function () {
                servoInput.change();
            });

            servoInput.change(function () {
                const value = $(this).val();
                servoSlider.val(value);
                FC.SERVO_OVERRIDE[servoIndex] = Math.round(value * 1000 / 50);
                mspHelper.sendServoOverride(servoIndex);
            });

            servoEnable.change(function () {
                const check = $(this).prop('checked');
                const value = check ? 0 : self.OVERRIDE_OFF;

                servoInput.val(0);
                servoSlider.val(0);
                servoInput.prop('disabled', !check);
                servoSlider.attr('disabled', !check);

                FC.SERVO_OVERRIDE[servoIndex] = value;
                mspHelper.sendServoOverride(servoIndex);
            });

            const value = FC.SERVO_OVERRIDE[servoIndex];
            const check = (value >= -2000 && value <= 2000);
            const angle = check ? Math.round(value * 50 / 1000) : 0;

            servoInput.val(angle);
            servoSlider.val(angle);

            servoInput.prop('disabled', !check);
            servoSlider.attr('disabled', !check);
            servoEnable.prop('checked', check);

            $('.servoOverride tbody').append(servoOverride);
        }

        function process_config(servoIndex) {

            const servoConfig = $('#tab-servos-templates .servoConfigTemplate tr').clone();

            const SERVO = FC.SERVO_CONFIG[servoIndex];
            const revs = SERVO.flags & 1;
            const geocor = SERVO.flags & 2;

            servoConfig.attr('class', `servoConfig${servoIndex}`);
            servoConfig.data('index', servoIndex);

            servoConfig.find('#index').text(`#${servoIndex+1}`);
            servoConfig.find('#mid').val(SERVO.mid);
            servoConfig.find('#min').val(SERVO.min);
            servoConfig.find('#max').val(SERVO.max);
            servoConfig.find('#rneg').val(SERVO.rneg);
            servoConfig.find('#rpos').val(SERVO.rpos);
            servoConfig.find('#rate').val(SERVO.rate);
            servoConfig.find('#rate').change(function () {
                $('.save_reboot').toggle(true);
            });
            servoConfig.find('#speed').val(SERVO.speed);
            servoConfig.find('#reversed').prop('checked', revs);
            servoConfig.find('#geocor').prop('checked', geocor);

            servoConfig.find('input').change(function () {
                update_servo_config(servoIndex);
                process_warnings();
                mspHelper.sendServoConfig(servoIndex);
            });

            $('.servoConfig tbody').append(servoConfig);
        }

        function update_servo_config(servoIndex) {

            const servo = $(`.tab-servos .servoConfig${servoIndex}`);

            FC.SERVO_CONFIG[servoIndex].mid = parseInt($('#mid',servo).val());
            FC.SERVO_CONFIG[servoIndex].min = parseInt($('#min',servo).val());
            FC.SERVO_CONFIG[servoIndex].max = parseInt($('#max',servo).val());
            FC.SERVO_CONFIG[servoIndex].rneg = parseInt($('#rneg',servo).val());
            FC.SERVO_CONFIG[servoIndex].rpos = parseInt($('#rpos',servo).val());
            FC.SERVO_CONFIG[servoIndex].rate = parseInt($('#rate',servo).val());
            FC.SERVO_CONFIG[servoIndex].speed = parseInt($('#speed',servo).val());
            FC.SERVO_CONFIG[servoIndex].flags =  $('#reversed',servo).prop('checked') ? 1 : 0;
            FC.SERVO_CONFIG[servoIndex].flags |=  $('#geocor',servo).prop('checked') ? 2 : 0;
        }

        function update_servo_bars() {

            let rangeMin, rangeMax;

            for (let i = 0; i < FC.SERVO_DATA.length; i++) {
                const servoMeter = $(`.tab-servos .servoConfig${i} .meter`);
                const servoValue = FC.SERVO_DATA[i];

                if (FC.SERVO_CONFIG[i].mid <= 860) {
                    // 760us pulse servos
                    rangeMin = 375;
                    rangeMax = 1145;
                } else if (FC.SERVO_CONFIG[i].mid <= 1060) {
                    // 960us
                    rangeMin = 460;
                    rangeMax = 1460;
                } else {
                    // 1520us
                    rangeMin = 750;
                    rangeMax = 2250;
                }

                const range  = rangeMax - rangeMin;
                const percnt = 100 * (servoValue - rangeMin) / range;
                const length = Math.max(Math.min(percnt, 100), 0);
                const margin = 100 - length;

                $('.meter-fill', servoMeter).css({
                    'width'        : `${length}%`,
                    'margin-right' : `${margin}%`,
                });
                $('.meter-label', servoMeter).text(servoValue);
            }
        }

        function update_servos() {
            MSP.send_message(MSPCodes.MSP_SERVO, false, false, update_servo_bars);
        }

        const enableServoOverrideSwitch = $('#servoEnableOverrideSwitch');
        enableServoOverrideSwitch.prop('checked', !FC.CONFIG.servoOverrideDisabled);

        enableServoOverrideSwitch.change(function () {
            const checked = enableServoOverrideSwitch.prop('checked');
            FC.CONFIG.servoOverrideDisabled = !checked;

            if (!checked) {
                mspHelper.resetServoOverrides();
                for (let i = 0;i  < FC.CONFIG.servoCount; ++i) {
                    const servoSwitch = $(`.servoOverride${i} .servoOverrideEnable input`);
                    if (servoSwitch.prop('checked'))
                        servoSwitch.click();
                }
            }

            $('.tab-servos .override').toggle(checked);
        });

        $('.tab-servos .override').toggle(!FC.CONFIG.servoOverrideDisabled);
        $('.save_reboot').toggle(false);

        for (let index = 0; index < FC.CONFIG.servoCount; index++) {
            process_config(index);
            process_override(index);
        }
        process_warnings();

        self.prevConfig = self.cloneConfig(FC.SERVO_CONFIG);

        self.save = function(reboot, callback) {
            for (let index = 0; index < FC.CONFIG.servoCount; index++) {
                update_servo_config(index);
            }
            save_data(reboot, callback);
        };

        self.revert = function (callback) {
            FC.SERVO_CONFIG = self.prevConfig;
            mspHelper.sendServoConfigurations(callback);
        };

        $('a.save').click(function () {
            self.save(false, () => GUI.tab_switch_reload());
        });

        $('a.save_reboot').click(function () {
            self.save(true, () => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        $('.configuration').change(function () {
            setDirty();
        });

        GUI.interval_add('servo_pull', update_servos, 100);

        GUI.content_ready(callback);
    }
};

TABS.servos.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};

TABS.servos.cloneConfig = function (servos) {
    const clone = [];

    function cloneServo(a) {
        return { mid: a.mid, min: a.min, max: a.max, rneg: a.rneg, rpos: a.rpos, rate: a.rate, speed: a.speed, flags: a.flags };
    };

    servos.forEach(function (item) {
        clone.push(cloneServo(item));
    });

    return clone;
};

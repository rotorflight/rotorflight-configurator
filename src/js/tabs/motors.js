'use strict';

TABS.motors = {
    isDirty: false,
    isDshot: false,
    isProtoEnabled: false,
    isEscSensorEnabled: false,
    isFreqSensorEnabled: false,
    isGovEnabled: false,
    escProtocols: [
        "PWM",
        "ONESHOT125",
        "ONESHOT42",
        "MULTISHOT",
        "BRUSHED",
        "DSHOT150",
        "DSHOT300",
        "DSHOT600",
        "PROSHOT",
        "DISABLED",
    ],
    telemetryProtocols: [
        "Disabled",
        "BLHeli32",
        "Hobbywing Platinum V4 / FlyFun V5",
        "Hobbywing Platinum V5",
        "Scorpion",
        "Kontronik",
        "OMPHobby",
        "ZTW",
        "APD",
        "OpenYGE",
        "Custom",
    ],
    govModes: [
        "OFF",
        "PASSTHROUGH",
        "STANDARD",
        "MODE1",
        "MODE2",
    ],
};

TABS.gearModles = {
    "Default": {
        "Pinion": [1],
        "Main_gear": [1],
        "Tail_gear": [1],
        "Tail_drive": [1],
        "Motor_pole": [10],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "ALIGN 470LM": {
        "Pinion": [11],
        "Main_gear": [121],
        "Tail_gear": [15],
        "Tail_drive": [56],
        "Motor_pole": [10],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "ALIGN Trex450": {
        "Pinion": [11, 12, 13, 14],
        "Main_gear": [150],
        "Tail_gear": [25],
        "Tail_drive": [106],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 0, 0, 0]
    },
    "ALIGN Trex450[Helical teeth]": {
        "Pinion": [11, 12],
        "Main_gear": [121],
        "Tail_gear": [25],
        "Tail_drive": [106],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 0, 0, 0]
    },
    "ALZRC X360": {
        "Pinion": [11, 12, 13],
        "Main_gear": [131],
        "Tail_gear": [15],
        "Tail_drive": [71],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 0, 0, 0]
    },
    "ALZRC R42": {
        "Pinion": [19, 20, 21],
        "Main_gear": [120],
        "Tail_gear": [19, 20],
        "Tail_drive": [80],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 1, 0, 0]
    },
    "ALZRC Devil380": {
        "Pinion": [19, 21],
        "Main_gear": [120],
        "Tail_gear": [19, 21],
        "Tail_drive": [72, 80],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 1, 0, 0]
    },
    "ALZRC Devil505": {
        "Pinion": [19],
        "Main_gear": [48],
        "Tail_gear": [21],
        "Tail_drive": [28],
        "Motor_pole": [10],
        "Second_pinion": [18],
        "Second_main_gear": [62],
        "Gear_ratio": [0, 0, 0, 0, 1, 0, 0]
    },
    "ALZRC T7": {
        "Pinion": [11, 12],
        "Main_gear": [110],
        "Tail_gear": [20],
        "Tail_drive": [94],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 0, 0, 0]
    },
    "FW450 V2": {
        "Pinion": [13],
        "Main_gear": [81],
        "Tail_gear": [1],
        "Tail_drive": [1],
        "Motor_pole": [14],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "GAUI X4II": {
        "Pinion": [13, 14, 15, 16, 17, 18],
        "Main_gear": [120],
        "Tail_gear": [15],
        "Tail_drive": [61],
        "Motor_pole": [10],
        "Gear_ratio": [2, 0, 0, 0, 0]
    },
    "GAUI X5 V2": {
        "Pinion": [13, 14, 15, 16],
        "Main_gear": [120],
        "Tail_gear": [15],
        "Tail_drive": [61],
        "Motor_pole": [10],
        "Gear_ratio": [2, 0, 0, 0, 0]
    },
    "GOOSKY RS4": {
        "Pinion": [1],
        "Main_gear": [1],
        "Tail_gear": [16],
        "Tail_drive": [65],
        "Motor_pole": [40],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "GOOSKY RS7": {
        "Pinion": [11, 12],
        "Main_gear": [107],
        "Tail_gear": [21],
        "Tail_drive": [100],
        "Motor_pole": [10],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "MIKADO LOGO 600": {
        "Pinion": [11, 12, 13],
        "Main_gear": [106],
        "Tail_gear": [9],
        "Tail_drive": [42],
        "Motor_pole": [10],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "OMPHOBBY M4": {
        "Pinion": [1],
        "Main_gear": [1],
        "Tail_gear": [22],
        "Tail_drive": [88, 99],
        "Motor_pole": [42],
        "Gear_ratio": [0, 0, 0, 1, 0]
    },
    "OMPHOBBY M7": {
        "Pinion": [11, 12, 13, 14, 15],
        "Main_gear": [120],
        "Tail_gear": [22],
        "Tail_drive": [110],
        "Motor_pole": [10],
        "Gear_ratio": [2, 0, 0, 0, 0]
    },
    "SAB RAW420 COMPETITION": {
        "Pinion": [19, 20, 21, 22],
        "Main_gear": [120],
        "Tail_gear": [20],
        "Tail_drive": [80],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 0, 0, 0]
    },
    "SAB RAW420 DD": {
        "Pinion": [1],
        "Main_gear": [1],
        "Tail_gear": [20],
        "Tail_drive": [80],
        "Motor_pole": [42],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "SAB RAW500": {
        "Pinion": [16, 17, 18, 19, 20, 21],
        "Main_gear": [94],
        "Tail_gear": [25, 27],
        "Tail_drive": [105],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 1, 0, 0]
    },
    "SAB RAW700": {
        "Pinion": [20, 21, 22, 23, 24, 25],
        "Main_gear": [56],
        "Tail_gear": [26],
        "Tail_drive": [34],
        "Motor_pole": [10],
        "Second_pinion": [18],
        "Second_main_gear": [69],
        "Gear_ratio": [1, 0, 0, 0, 1, 0, 0]
    },
    "KDS A-7": {
        "Pinion": [18, 19, 20, 21],
        "Main_gear": [54],
        "Tail_gear": [12],
        "Tail_drive": [57],
        "Motor_pole": [10],
        "Second_pinion": [20],
        "Second_main_gear": [66],
        "Gear_ratio": [2, 0, 0, 0, 2, 0, 0]
    },
    "STEAM AK400": {
        "Pinion": [1],
        "Main_gear": [1],
        "Tail_gear": [20],
        "Tail_drive": [81],
        "Motor_pole": [42],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "STEAM AK420": {
        "Pinion": [12],
        "Main_gear": [75],
        "Tail_gear": [20],
        "Tail_drive": [81],
        "Motor_pole": [10],
        "Gear_ratio": [0, 0, 0, 0, 0]
    },
    "STEAM AK700": {
        "Pinion": [13, 14],
        "Main_gear": [127],
        "Tail_gear": [24, 25],
        "Tail_drive": [120],
        "Motor_pole": [10],
        "Gear_ratio": [0, 0, 1, 0, 0]
    },
    "STEAM 700": {
        "Pinion": [12, 13, 14],
        "Main_gear": [125, 127, 129],
        "Tail_gear": [19, 20],
        "Tail_drive": [95],
        "Motor_pole": [10],
        "Gear_ratio": [1, 2, 1, 0, 0]
    },
    "TRON Gemini/Orion": {
        "Pinion": [13, 14, 15, 16, 17],
        "Main_gear": [136],
        "Tail_gear": [18, 19, 20],
        "Tail_drive": [80],
        "Motor_pole": [10],
        "Gear_ratio": [3, 0, 1, 0, 0]
    },
    "TRON 5.5": {
        "Pinion": [13, 14, 15, 16, 17],
        "Main_gear": [135],
        "Tail_gear": [18, 19, 20],
        "Tail_drive": [80],
        "Motor_pole": [10],
        "Gear_ratio": [3, 0, 1, 0, 0]
    },
    "TRON 5.8": {
        "Pinion": [13, 14, 15, 16, 17],
        "Main_gear": [137],
        "Tail_gear": [18],
        "Tail_drive": [80],
        "Motor_pole": [10],
        "Gear_ratio": [3, 0, 0, 0, 0]
    },
    "XLPower Nimbus 550": {
        "Pinion": [11, 12, 13],
        "Main_gear": [106],
        "Tail_gear": [12, 13],
        "Tail_drive": [60],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 1, 0, 0]
    },
    "XLPower Nimbus 550 Nitro": {
        "Pinion": [20, 22],
        "Main_gear": [170],
        "Tail_gear": [12, 13],
        "Tail_drive": [60],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 1, 0, 0]
    },
    "XLPower Specter 700V2": {
        "Pinion": [10, 11, 12, 13],
        "Main_gear": [106],
        "Tail_gear": [20, 21],
        "Tail_drive": [100],
        "Motor_pole": [10],
        "Gear_ratio": [1, 0, 0, 0, 0]
    },
    "XLPower Specter 700 Nitro": {
        "Pinion": [17],
        "Main_gear": [136],
        "Tail_gear": [20, 21],
        "Tail_drive": [100],
        "Motor_pole": [10],
        "Gear_ratio": [0, 0, 1, 0, 0]
    },
};

TABS.motors.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_ARMING_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_BATTERY_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MOTOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MOTOR_OVERRIDE))
            .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_GOVERNOR_PROFILE))
            .then(() => MSP.promise(MSPCodes.MSP_ESC_SENSOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_SERIAL_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_FEATURE_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FEATURE_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_MOTOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_MOTOR_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_ADVANCED_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_ADVANCED_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_GOVERNOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_GOVERNOR_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_ESC_SENSOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_ESC_SENSOR_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                GUI.log(i18n.getMessage('deviceRebooting'));
                reinitialiseConnection(callback);
            });
    }

    function load_html() {
        $('#content').load("./tabs/motors.html", process_html);
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // UI Hooks

        // Hide the buttons toolbar
        $('.tab-motors').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-motors').removeClass('toolbar_hidden');
            }
        }

        self.isGovEnabled = FC.FEATURE_CONFIG.features.isEnabled('GOVERNOR');
        self.isEscSensorEnabled = FC.FEATURE_CONFIG.features.isEnabled('ESC_SENSOR');
        self.isFreqSensorEnabled = FC.FEATURE_CONFIG.features.isEnabled('FREQ_SENSOR');

        let infoUpdateList = [];

        function roundTo(value, step) {
            return Math.round(value / step) * step + step;
        }

        function meterBar(meter, label, ratio) {

            const length = ratio.clamp(0, 1) * 100;
            const margin = 100 - length;

            $('.meter-fill', meter).css({
                'width': `${length}%`,
                'margin-right': `${margin}%`,
            });

            $('.meter-label', meter).html(label);
        }

        function meterLabel(meter, min, max) {
            $('.meter-left', meter).html(min);
            $('.meter-right', meter).html(max);
        }

        function process_rotor_speeds() {

            const rpmAvailable = self.isFreqSensorEnabled || self.isEscSensorEnabled || FC.MOTOR_CONFIG.use_dshot_telemetry;
            $('.rotorSpeeds').toggle(rpmAvailable);

            if (rpmAvailable) {
                const headspeedBar = $('.motorMainRotorSpeed');
                const tailspeedBar = $('.motorTailRotorSpeed');

                let headSource = 0;
                let tailSource = 1;

                let headRatio = FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] / FC.MOTOR_CONFIG.main_rotor_gear_ratio[1];
                let tailRatio = FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] / FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1];

                if (FC.MIXER_CONFIG.tail_rotor_mode == 0) {
                    tailRatio = headRatio / tailRatio;
                    tailSource = 0;
                }

                headspeedBar.toggle(FC.CONFIG.motorCount > headSource);
                tailspeedBar.toggle(FC.CONFIG.motorCount > tailSource);

                let headspeedMax = 1000;
                let tailspeedMax = 5000;

                meterLabel(headspeedBar, '0', headspeedMax);
                meterLabel(tailspeedBar, '0', tailspeedMax);

                function updateInfo() {

                    const headspeed = FC.MOTOR_TELEMETRY_DATA.rpm[headSource] * headRatio;
                    if (headspeed > headspeedMax) {
                        headspeedMax = roundTo(headspeed + 1000, 1000);
                        meterLabel(headspeedBar, '0', headspeedMax);
                    }
                    meterBar(headspeedBar, headspeed.toFixed(0) + ' RPM', headspeed / headspeedMax);

                    const tailspeed = FC.MOTOR_TELEMETRY_DATA.rpm[tailSource] * tailRatio;
                    if (tailspeed > tailspeedMax) {
                        tailspeedMax = roundTo(tailspeed + 1000, 1000);
                        meterLabel(tailspeedBar, '0', tailspeedMax);
                    }
                    meterBar(tailspeedBar, tailspeed.toFixed(0) + ' RPM', tailspeed / tailspeedMax);
                }

                infoUpdateList.push(updateInfo);
            }
        }

        function process_motor_info(motorIndex) {

            const motorInfo = $('#tab-motors-templates .motorInfoTemplate').clone();

            const thrBar = motorInfo.find('.Throttle');
            const rpmBar = motorInfo.find('.RPM');
            const voltBar = motorInfo.find('.Volt');
            const currBar = motorInfo.find('.Curr');
            const tempBar = motorInfo.find('.Temp');
            const temp2Bar = motorInfo.find('.Temp2');
            const errorBar = motorInfo.find('.Errors');

            const rpmAvailable = self.isFreqSensorEnabled || self.isEscSensorEnabled || FC.MOTOR_CONFIG.use_dshot_telemetry;

            let rpmMax = 5000;
            let voltMax = 10;
            let currMax = 10;
            let tempMax = 150;

            motorInfo.attr('class', `motorInfo${motorIndex}`);
            motorInfo.find('.spacer_box_title').html(i18n.getMessage(`motorInfo${motorIndex + 1}`));

            rpmBar.toggle(rpmAvailable);
            voltBar.toggle(self.isEscSensorEnabled);
            currBar.toggle(self.isEscSensorEnabled);
            tempBar.toggle(self.isEscSensorEnabled);
            errorBar.toggle(FC.MOTOR_CONFIG.use_dshot_telemetry);

            meterLabel(thrBar, '0%', '100%');
            meterLabel(rpmBar, '0', rpmMax);
            meterLabel(voltBar, '0V', voltMax.toFixed(0) + 'V');
            meterLabel(currBar, '0A', currMax.toFixed(0) + 'A');
            meterLabel(tempBar, '0&deg;C', '150&deg;C');
            meterLabel(temp2Bar, '0&deg;C', '150&deg;C');
            meterLabel(errorBar, '0%', '100%');

            const motorSlider = motorInfo.find('.motorOverrideSlider');

            motorSlider.noUiSlider({
                range: {
                    'min': 0,
                    'max': 100,
                },
                start: 0,
                step: 1,
                behaviour: 'none',
            });

            motorInfo.find('.pips-range').noUiSlider_pips({
                mode: 'values',
                values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,],
                density: 100 / ((0 + 100) / 5),
                stepped: true,
                format: wNumb({
                    decimals: 0,
                }),
            });

            motorSlider.on('change', function () {
                const value = $(this).val();
                FC.MOTOR_OVERRIDE[motorIndex] = Math.round(value * 10);
                mspHelper.sendMotorOverride(motorIndex);
            });

            const value = FC.MOTOR_OVERRIDE[motorIndex];
            const angle = Math.round(value / 10);

            motorSlider.val(angle);

            FC.CONFIG.motorOverrideEnabled |= (value != 0);

            function updateInfo() {

                const value = FC.MOTOR_DATA[motorIndex];
                let throttle = 0;

                if (value < 0)
                    throttle = (value + 1000) / 10;
                else if (value > 0)
                    throttle = (value - 1000) / 10;

                const thrStr = (value == 0) ? '' : throttle.toFixed(1) + '%';
                meterBar(thrBar, thrStr, Math.abs(throttle / 100));

                const rpm = FC.MOTOR_TELEMETRY_DATA.rpm[motorIndex];
                if (rpm > rpmMax) {
                    rpmMax = roundTo(rpm + 1000, 5000);
                    meterLabel(rpmBar, '0', rpmMax);
                }
                meterBar(rpmBar, rpm, rpm / rpmMax);

                const volt = FC.MOTOR_TELEMETRY_DATA.voltage[motorIndex] / 1000;
                if (volt > voltMax) {
                    voltMax = Math.max(FC.BATTERY_STATE.cellCount * FC.BATTERY_CONFIG.vbatmaxcellvoltage, voltMax);
                    voltMax = Math.max(voltMax, roundTo(volt, 1));
                    meterLabel(voltBar, '0V', voltMax.toFixed(1) + 'V');
                }
                meterBar(voltBar, volt.toFixed(2) + 'V', volt / voltMax);

                const curr = FC.MOTOR_TELEMETRY_DATA.current[motorIndex] / 1000;
                if (curr > currMax) {
                    currMax = roundTo(curr, 10);
                    meterLabel(currBar, '0A', currMax.toFixed(0) + 'A');
                }
                meterBar(currBar, curr.toFixed(1) + 'A', curr / currMax);

                const temp = FC.MOTOR_TELEMETRY_DATA.temperature[motorIndex] / 10;
                meterBar(tempBar, temp + '&deg;C', temp / tempMax);

                const temp2 = FC.MOTOR_TELEMETRY_DATA.temperature2[motorIndex] / 10;
                meterBar(temp2Bar, temp2 + '&deg;C', temp2 / tempMax);
                temp2Bar.toggle(self.isEscSensorEnabled && temp2 > 0);

                const ratio = FC.MOTOR_TELEMETRY_DATA.invalidPercent[motorIndex] / 100;
                meterBar(errorBar, ratio + '%', ratio / 100);

                const active = (throttle > 0 || rpm > 0 || volt > 0 || temp > 0);
                if (active)
                    motorInfo.show();
            }

            $('.motorInfo').append(motorInfo);

            infoUpdateList.push(updateInfo);
        }

        process_rotor_speeds();
        for (let index = 0; index < FC.CONFIG.motorCount; index++) {
            process_motor_info(index);
        }

        const enableMotorOverrideSwitch = $('input[id="motorEnableOverrideSwitch"]');

        enableMotorOverrideSwitch.change(function () {
            const checked = enableMotorOverrideSwitch.prop('checked');
            FC.CONFIG.motorOverrideEnabled = checked;
            $('.overridesEnabled').toggle(checked);
            $('.motorOverrideSlider').val(0).change();
        });

        enableMotorOverrideSwitch.prop('checked', FC.CONFIG.motorOverrideEnabled);
        $('.overridesEnabled').toggle(!!FC.CONFIG.motorOverrideEnabled);

        $('.tab-motors .mainGearRatio').change(function () {
            const ratioN = parseInt($('input[id="mainGearRatioN"]').val());
            const ratioD = parseInt($('input[id="mainGearRatioD"]').val());
            const issue = (ratioN > ratioD);
            $('.tab-motors .motorMainGearRatioIssueNote').toggle(issue);
        });

        $('.tab-motors .tailGearRatio').change(function () {
            const ratioN = parseInt($('input[id="tailGearRatioN"]').val());
            const ratioD = parseInt($('input[id="tailGearRatioD"]').val());
            const issue = (ratioN > ratioD);
            $('.tab-motors .motorTailGearRatioIssueNote').toggle(issue);
        });

        const escProtocolSelect = $('select[id="escProtocol"]');
        self.escProtocols.forEach(function (value, index) {
            escProtocolSelect.append(`<option value="${index}">${value}</option>`);
        });
        escProtocolSelect.val(FC.MOTOR_CONFIG.motor_pwm_protocol);

        $(document).ready(function () {
            var $gearModleSelect = $('#gearModle');
            $.each(TABS.gearModles, function (key, value) {
                $gearModleSelect.append(`<option value="${key}">${key}</option>`);
            });
            $gearModleSelect.on('change', function () {
                var selectedModel = $(this).val();
                var modelData = TABS.gearModles[selectedModel];
                // Data input
                function populateSelect(selectElement, options) {
                    selectElement.empty();
                    if (Array.isArray(options)) {
                        options.forEach(function (option) {
                            selectElement.append(`<option value="${option}">${option}</option>`);
                        });
                    } else {
                        selectElement.append(`<option value="${options}">${options}</option>`);
                    }
                }
                populateSelect($('#gearPinion'), modelData.Pinion);
                populateSelect($('#gearMain'), modelData.Main_gear);
                populateSelect($('#gearTail'), modelData.Tail_gear);
                populateSelect($('#gearTailDrive'), modelData.Tail_drive);
                // Select the default value
                $('#gearPinion').val($('#gearPinion option').eq(modelData.Gear_ratio[0]).val());
                $('#gearMain').val($('#gearMain option').eq(modelData.Gear_ratio[1]).val());
                $('#gearTail').val($('#gearTail option').eq(modelData.Gear_ratio[2]).val());
                $('#gearTailDrive').val($('#gearTailDrive option').eq(modelData.Gear_ratio[3]).val());
                // Drive type
                if (modelData.Gear_ratio[4] == 2) {
                    $('#mainGearRatioN').val(modelData.Pinion[modelData.Gear_ratio[0]] * modelData.Second_pinion[modelData.Gear_ratio[5]]);
                    $('#mainGearRatioD').val(modelData.Main_gear[modelData.Gear_ratio[1]] * modelData.Second_main_gear[modelData.Gear_ratio[6]]);
                    $('#tailGearRatioN').val(modelData.Tail_gear[modelData.Gear_ratio[2]]);
                    $('#tailGearRatioD').val(modelData.Tail_drive[modelData.Gear_ratio[3]]);
                }
                else if (modelData.Gear_ratio[4] == 1) {
                    $('#mainGearRatioN').val(modelData.Pinion[modelData.Gear_ratio[0]] * modelData.Second_pinion[modelData.Gear_ratio[5]]);
                    $('#mainGearRatioD').val(modelData.Main_gear[modelData.Gear_ratio[1]] * modelData.Second_main_gear[modelData.Gear_ratio[6]]);
                    $('#tailGearRatioN').val(modelData.Tail_gear[modelData.Gear_ratio[2]] * modelData.Second_pinion[modelData.Gear_ratio[5]]);
                    $('#tailGearRatioD').val(modelData.Tail_drive[modelData.Gear_ratio[3]] * modelData.Second_main_gear[modelData.Gear_ratio[6]]);
                }
                else {
                    $('#mainGearRatioN').val(modelData.Pinion[modelData.Gear_ratio[0]]);
                    $('#mainGearRatioD').val(modelData.Main_gear[modelData.Gear_ratio[1]]);
                    $('#tailGearRatioN').val(modelData.Tail_gear[modelData.Gear_ratio[2]]);
                    $('#tailGearRatioD').val(modelData.Tail_drive[modelData.Gear_ratio[3]]);
                }
                $('#motorPoles1').val(modelData.Motor_pole);
            });
            $('#gearPinion').on('change', function () {
                var selectedModel = $gearModleSelect.val();
                var modelData = TABS.gearModles[selectedModel];
                var selectedPinion = $(this).val();
                var motorGearIndex = modelData.Pinion.indexOf(parseInt(selectedPinion, 10));
                if (motorGearIndex !== -1) {
                    if (modelData.Gear_ratio[4]) {
                        $('#mainGearRatioN').val(modelData.Pinion[motorGearIndex] * modelData.Second_pinion[modelData.Gear_ratio[5]]);
                    }
                    else {
                        $('#mainGearRatioN').val(modelData.Pinion[motorGearIndex]);
                    }
                }
            });
            $('#gearMain').on('change', function () {
                var selectedModel = $gearModleSelect.val();
                var modelData = TABS.gearModles[selectedModel];
                var selectedPinion = $(this).val();
                var motorGearIndex = modelData.Main_gear.indexOf(parseInt(selectedPinion, 10));
                if (motorGearIndex !== -1) {
                    if (modelData.Gear_ratio[4]) {
                        $('#mainGearRatioD').val(modelData.Main_gear[motorGearIndex] * modelData.Second_main_gear[modelData.Gear_ratio[6]]);
                    }
                    else {
                        $('#mainGearRatioD').val(modelData.Main_gear[motorGearIndex]);
                    }
                }
            });
            $('#gearTail').on('change', function () {
                var selectedModel = $gearModleSelect.val();
                var modelData = TABS.gearModles[selectedModel];
                var selectedPinion = $(this).val();
                var motorGearIndex = modelData.Tail_gear.indexOf(parseInt(selectedPinion, 10));
                if (motorGearIndex !== -1) {
                    if (modelData.Gear_ratio[4] == 1) {
                        $('#tailGearRatioN').val(modelData.Main_gear[motorGearIndex] * modelData.Second_pinion[modelData.Gear_ratio[5]]);
                    }
                    else {
                        $('#tailGearRatioN').val(modelData.Main_gear[motorGearIndex]);
                    }
                }
            });
            $('#gearTailDrive').on('change', function () {
                var selectedModel = $gearModleSelect.val();
                var modelData = TABS.gearModles[selectedModel];
                var selectedPinion = $(this).val();
                var motorGearIndex = modelData.Tail_drive.indexOf(parseInt(selectedPinion, 10));
                if (motorGearIndex !== -1) {
                    if (modelData.Gear_ratio[4] == 1) {
                        $('#tailGearRatioD').val(modelData.Main_gear[motorGearIndex] * modelData.Second_main_gear[modelData.Gear_ratio[6]]);
                    }
                    else {
                        $('#tailGearRatioD').val(modelData.Main_gear[motorGearIndex]);
                    }
                }
            });
        });

        const pwmUnsyncSwitch = $('input[id="motorsUnsyncedPwm"]');
        pwmUnsyncSwitch.prop('checked', FC.MOTOR_CONFIG.use_unsynced_pwm);

        const pwmFreq = (FC.MOTOR_CONFIG.motor_pwm_rate > 0) ?
            FC.MOTOR_CONFIG.motor_pwm_rate : 250;
        const pwmFreqInput = $('input[id="pwmFreq"]');
        pwmFreqInput.val(pwmFreq);

        const dshotBidirSwitch = $('input[id="dshotBidir"]');
        dshotBidirSwitch.prop('checked', FC.MOTOR_CONFIG.use_dshot_telemetry);

        const rpmSensorSwitch = $('input[id="rpmSensor"]');
        rpmSensorSwitch.prop('checked', self.isFreqSensorEnabled);

        $('input[id="mincommand"]').val(FC.MOTOR_CONFIG.mincommand);
        $('input[id="minthrottle"]').val(FC.MOTOR_CONFIG.minthrottle);
        $('input[id="maxthrottle"]').val(FC.MOTOR_CONFIG.maxthrottle);

        for (let i = 0; i < FC.CONFIG.motorCount; i++)
            $(`input[id="motorPoles${i + 1}"]`).val(FC.MOTOR_CONFIG.motor_poles[i]);

        $('input[id="mainGearRatioN"]').val(FC.MOTOR_CONFIG.main_rotor_gear_ratio[0]);
        $('input[id="mainGearRatioD"]').val(FC.MOTOR_CONFIG.main_rotor_gear_ratio[1]).change();
        $('input[id="tailGearRatioN"]').val(FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0]);
        $('input[id="tailGearRatioD"]').val(FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1]).change();

        self.telemetrySerialPort = FC.SERIAL_CONFIG.ports.some((port) => (port.functionMask & 1024));

        const telemProtocolSelect = $('select[id="telemetryProtocol"]');
        self.telemetryProtocols.forEach(function (value, index) {
            const disabled = (index > 0 && !self.telemetrySerialPort) ? 'disabled' : '';
            telemProtocolSelect.append(`<option value="${index}" ${disabled}>${value}</option>`);
        });
        telemProtocolSelect.val(self.isEscSensorEnabled ? FC.ESC_SENSOR_CONFIG.protocol : 0);

        const govModeSelect = $('select[id="govMode"]');
        self.govModes.forEach(function (value, index) {
            govModeSelect.append(`<option value="${index}">${value}</option>`);
        });
        govModeSelect.val(self.isGovEnabled ? FC.GOVERNOR.gov_mode : 0);

        $('input[id="govHandoverThrottle"]').val(FC.GOVERNOR.gov_handover_throttle).change();
        $('input[id="govStartupTime"]').val(FC.GOVERNOR.gov_startup_time / 10).change();
        $('input[id="govSpoolupTime"]').val(FC.GOVERNOR.gov_spoolup_time / 10).change();
        $('input[id="govTrackingTime"]').val(FC.GOVERNOR.gov_tracking_time / 10).change();
        $('input[id="govRecoveryTime"]').val(FC.GOVERNOR.gov_recovery_time / 10).change();
        $('input[id="govAutoBailoutTime"]').val(FC.GOVERNOR.gov_autorotation_bailout_time / 10).change();
        $('input[id="govAutoTimeout"]').val(FC.GOVERNOR.gov_autorotation_timeout / 10).change();
        $('input[id="govAutoMinEntryTime"]').val(FC.GOVERNOR.gov_autorotation_min_entry_time / 10).change();
        $('input[id="govZeroThrottleTimeout"]').val(FC.GOVERNOR.gov_zero_throttle_timeout / 10).change();
        $('input[id="govLostHeadspeedTimeout"]').val(FC.GOVERNOR.gov_lost_headspeed_timeout / 10).change();
        $('input[id="govVoltageFilterHz"]').val(FC.GOVERNOR.gov_pwr_filter).change();
        $('input[id="govHeadspeedFilterHz"]').val(FC.GOVERNOR.gov_rpm_filter).change();
        $('input[id="govTTAFilterHz"]').val(FC.GOVERNOR.gov_tta_filter).change();
        $('input[id="govFFFilterHz"]').val(FC.GOVERNOR.gov_ff_filter).change();

        function updateVisibility() {

            const protocolNum = parseInt(escProtocolSelect.val());

            self.isProtoEnabled = (protocolNum < 9) && (FC.CONFIG.motorCount > 0);
            self.isDshot = (protocolNum >= 5 && protocolNum < 9);

            $('.mincommand').toggle(self.isProtoEnabled && !self.isDshot);
            $('.minthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.maxthrottle').toggle(self.isProtoEnabled && !self.isDshot);
            $('.unsyncedPwm').toggle(self.isProtoEnabled && !self.isDshot && protocolNum != 0);
            $('.inputPwmFreq').toggle(self.isProtoEnabled && !self.isDshot);
            $('.dshotBidir').toggle(self.isProtoEnabled && self.isDshot);
            $('.rpmSensor').toggle(self.isProtoEnabled);
            $('.mainGearRatio').toggle(self.isProtoEnabled);
            $('.tailGearRatio').toggle(self.isProtoEnabled);

            $('input[id="pwmFreq"]').prop('disabled', !(pwmUnsyncSwitch.is(':checked') || protocolNum == 0));

            for (let i = 0; i < 4; i++) {
                $(`.motorPoles${i + 1}`).toggle(self.isProtoEnabled && FC.CONFIG.motorCount > i);
                $(`.motorInfo${i}`).toggle(self.isProtoEnabled && FC.CONFIG.motorCount > i);
            }

            $('#escProtocolDisabled').toggle(!self.isProtoEnabled);
            $('.tab-motors .overrides').toggle(self.isProtoEnabled);

            const govMode = parseInt(govModeSelect.val());
            $('.govEnabled').toggle(govMode > 0);
        }

        govModeSelect.change(updateVisibility);
        pwmUnsyncSwitch.change(updateVisibility);
        escProtocolSelect.change(updateVisibility);

        updateVisibility();

        function update_data() {
            FC.MOTOR_CONFIG.motor_pwm_protocol = parseInt(escProtocolSelect.val());
            FC.MOTOR_CONFIG.motor_pwm_rate = parseInt($('input[id="pwmFreq"]').val());

            FC.MOTOR_CONFIG.use_unsynced_pwm = pwmUnsyncSwitch.is(':checked') || FC.MOTOR_CONFIG.motor_pwm_protocol == 0;
            FC.MOTOR_CONFIG.use_dshot_telemetry = dshotBidirSwitch.is(':checked');

            FC.MOTOR_CONFIG.mincommand = parseInt($('input[id="mincommand"]').val());
            FC.MOTOR_CONFIG.minthrottle = parseInt($('input[id="minthrottle"]').val());
            FC.MOTOR_CONFIG.maxthrottle = parseInt($('input[id="maxthrottle"]').val());

            for (let i = 0; i < FC.CONFIG.motorCount; i++)
                FC.MOTOR_CONFIG.motor_poles[i] = parseInt($(`input[id="motorPoles${i + 1}"]`).val());

            FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] = parseInt($('input[id="mainGearRatioN"]').val());
            FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] = parseInt($('input[id="mainGearRatioD"]').val());
            FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] = parseInt($('input[id="tailGearRatioN"]').val());
            FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] = parseInt($('input[id="tailGearRatioD"]').val());

            const rpmSensorEnabled = rpmSensorSwitch.is(':checked');
            FC.FEATURE_CONFIG.features.setFeature('FREQ_SENSOR', rpmSensorEnabled);

            const telemProto = parseInt($('select[id="telemetryProtocol"]').val());
            FC.ESC_SENSOR_CONFIG.protocol = telemProto;
            FC.FEATURE_CONFIG.features.setFeature('ESC_SENSOR', telemProto > 0);

            const govMode = parseInt(govModeSelect.val());
            FC.GOVERNOR.gov_mode = govMode;
            FC.FEATURE_CONFIG.features.setFeature('GOVERNOR', govMode > 0);

            if (govMode > 0) {
                FC.GOVERNOR.gov_handover_throttle = parseInt($('input[id="govHandoverThrottle"]').val());
                FC.GOVERNOR.gov_startup_time = Math.round(parseFloat($('input[id="govStartupTime"]').val()) * 10);
                FC.GOVERNOR.gov_spoolup_time = Math.round(parseFloat($('input[id="govSpoolupTime"]').val()) * 10);
                FC.GOVERNOR.gov_tracking_time = Math.round(parseFloat($('input[id="govTrackingTime"]').val()) * 10);
                FC.GOVERNOR.gov_recovery_time = Math.round(parseFloat($('input[id="govRecoveryTime"]').val()) * 10);
                FC.GOVERNOR.gov_autorotation_bailout_time = Math.round(parseFloat($('input[id="govAutoBailoutTime"]').val()) * 10);
                FC.GOVERNOR.gov_autorotation_timeout = Math.round(parseFloat($('input[id="govAutoTimeout"]').val()) * 10);
                FC.GOVERNOR.gov_autorotation_min_entry_time = Math.round(parseFloat($('input[id="govAutoMinEntryTime"]').val()) * 10);
                FC.GOVERNOR.gov_zero_throttle_timeout = Math.round(parseFloat($('input[id="govZeroThrottleTimeout"]').val()) * 10);
                FC.GOVERNOR.gov_lost_headspeed_timeout = Math.round(parseFloat($('input[id="govLostHeadspeedTimeout"]').val()) * 10);
                FC.GOVERNOR.gov_pwr_filter = parseInt($('input[id="govVoltageFilterHz"]').val());
                FC.GOVERNOR.gov_rpm_filter = parseInt($('input[id="govHeadspeedFilterHz"]').val());
                FC.GOVERNOR.gov_tta_filter = parseInt($('input[id="govTTAFilterHz"]').val());
                FC.GOVERNOR.gov_ff_filter = parseInt($('input[id="govFFFilterHz"]').val());
            }
        }

        function get_info() {
            Promise.resolve(true)
                .then(() => MSP.promise(MSPCodes.MSP_MOTOR))
                .then(() => MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY))
                .then(() => MSP.promise(MSPCodes.MSP_BATTERY_STATE))
                .then(() => { infoUpdateList.forEach(func => func()); });
        }

        self.save = function (callback) {
            update_data();
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

        $('.configuration').change(function () {
            setDirty();
        });

        GUI.interval_add('info_pull', get_info, 100, true);

        GUI.content_ready(callback);
    }
};

TABS.motors.cleanup = function (callback) {
    this.isDirty = false;

    callback?.();
};

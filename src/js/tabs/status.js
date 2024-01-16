'use strict';

TABS.status = {
    armingEnabled: true,
    yaw_fix: 0.0,
    DISARM_FLAGS: [
        'NO_GYRO',
        'FAILSAFE',
        'RX_FAILSAFE',
        'BAD_RX_RECOVERY',
        'BOXFAILSAFE',
        'GOVERNOR',
        'CRASH',
        'THROTTLE',
        'ANGLE',
        'BOOT_GRACE_TIME',
        'NOPREARM',
        'LOAD',
        'CALIBRATING',
        'CLI',
        'CMS_MENU',
        'BST',
        'MSP',
        'PARALYZE',
        'GPS',
        'RESC',
        'RPMFILTER',
        'REBOOT_REQ',
        'DSHOT_BITBANG',
        'ACC_CALIB',
        'MOTOR_PROTO',
        'ARM_SWITCH'
    ],
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
};

TABS.status.initialize = function (callback) {
    var self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/status.html", process_html);
    }

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_ACC_TRIM))
            .then(() => MSP.promise(MSPCodes.MSP_NAME))
            .then(() => MSP.promise(MSPCodes.MSP_RC))
            .then(callback);
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // initialize 3D Model
        self.initModel();

        // Craft name
        $('.craft-name').text(FC.CONFIG.name);

        // Target and board names
        $('.target-name').text(FC.CONFIG.targetName);
        $('.board-name').text(FC.CONFIG.boardName);

        // set roll in interactive block
        $('span.roll').text(i18n.getMessage('statusAttitude', [0]));
        // set pitch in interactive block
        $('span.pitch').text(i18n.getMessage('statusAttitude', [0]));
        // set heading in interactive block
        $('span.heading').text(i18n.getMessage('statusAttitude', [0]));

        // Flight instruments
        var options = { size:90, showBox : false, img_directory: 'images/flightindicators/' };
        var attitude = $.flightIndicator('#attitude', 'attitude', options);
        var heading  = $.flightIndicator('#heading', 'heading', options);
        var altitude = $.flightIndicator('#altitude', 'altimeter', options);

        $('#arming-disable-flag').attr('title', i18n.getMessage('statusArmingDisableFlagsTooltip'));

        // display current yaw fix value (important during tab re-initialization)
        $('div#interactive_block > a.reset').text(i18n.getMessage('statusButtonResetZaxisValue', [self.yaw_fix]));

        // reset yaw button hook
        $('div#interactive_block > a.reset').click(function () {
            self.yaw_fix = FC.SENSOR_DATA.kinematics[2] * - 1.0;
            $(this).text(i18n.getMessage('statusButtonResetZaxisValue', [self.yaw_fix]));
            console.log('YAW reset to 0 deg, fix: ' + self.yaw_fix + ' deg');
        });

        // cached elements
        var arming_disable_flags_e = $('.arming-disable-flags'),
            configState_e = $('.configState'),
            bat_voltage_e = $('.bat-voltage'),
            bat_mah_drawn_e = $('.bat-mah-drawn'),
            bat_mah_drawing_e = $('.bat-mah-drawing'),
            roll_e = $('dd.roll'),
            pitch_e = $('dd.pitch'),
            heading_e = $('dd.heading');

        // Configuration status
        switch (FC.CONFIG.configurationState) {
            case FC.CONFIGURATION_STATES.CONFIGURED:
                configState_e.html(i18n.getMessage('statusConfigConfigured'));
                break;
            case FC.CONFIGURATION_STATES.DEFAULTS_CUSTOM:
                configState_e.html(i18n.getMessage('statusConfigDefaults'));
                break;
            case FC.CONFIGURATION_STATES.DEFAULTS_BARE:
                configState_e.html(i18n.getMessage('statusConfigBare'));
                break;
        }

        // Arming related elements
        function prepareArmingFlags() {

            // Hide arm warning
            $('.arm-danger-row').hide();

            // Arming disabled flags
            for (var i = 0; i < FC.CONFIG.armingDisableCount; i++) {
                // All the known elements
                if (i < self.DISARM_FLAGS.length) {
                    arming_disable_flags_e.append('<div id="statusArmingDisableFlags' + i + '" class="cf_tip disarm-flag" title="' +
                        i18n.getMessage('statusArmingDisableFlagsTooltip' + self.DISARM_FLAGS[i]) +
                        '" style="display: none;">' + self.DISARM_FLAGS[i] + '</div>');
                }
                // Unknown disarm flags
                else {
                    arming_disable_flags_e.append('<div id="statusArmingDisableFlags' + i +
                        '" class="disarm-flag" style="display: none;">' + (i + 1) + '</div>');
                }
            }
        };

        prepareArmingFlags();


        //
        // Receiver bars
        //

        function addChannelBar(parent, name) {
            const elem = $('#statusBarTemplate tr').clone();
            elem.find('.name').text(name);
            elem.find('.fill').css('width', '0%');
            parent.append(elem);
            return elem;
        }

        function updateChannelBar(elem, width, label, rabel) {
            elem.find('.fill').css('width', width);
            elem.find('.label1').text(label);
            elem.find('.label2').text(rabel);
        }

        const numChs = Math.min(FC.RC.active_channels, 18);
        const numBars = Math.max(numChs, 8);
        const barContainer = $('.tab-status .bars');

        const barElems = [];

        for (let i = 0; i < numBars; i++) {
            const name = i18n.getMessage(self.axisNames[i].text);
            const elem = addChannelBar(barContainer, name);
            barElems.push(elem);
        }

        const rssiElem = addChannelBar(barContainer, 'RSSI');

        self.resize = function () {
            const barWidth = $('.meter:first', barContainer).width();
            const labelWidth = $('.meter:first .label2', barContainer).width();
            const margin = Math.max(barWidth - labelWidth - 15, 40) + 'px';
            $('.meter .label1', barContainer).css('margin-left', '15px');
            $('.meter .label2', barContainer).css('margin-left', margin);
        };

        $(window).on('resize', self.resize).resize();

        const barScaleMin = 750;
        const barScaleMax = 2250;

        function update_rc_channels() {
            for (let i = 0; i < numChs; i++) {
                const width = ((FC.RC.channels[i] - barScaleMin) / (barScaleMax - barScaleMin) * 100).clamp(0, 100) + '%';
                const label = (FC.RC.channels[i]).toFixed(0);
                let rabel = '';
                if (i < 4)
                    rabel = (FC.RC_COMMAND[i] / 5).toFixed(1) + '%';
                else if (i == 4)
                    rabel = (FC.RC_COMMAND[i] / 10 + 50).toFixed(1) + '%';
                updateChannelBar(barElems[i], width, label, rabel);
            }
        }

        function update_rc_rssi() {
            const rssi = (FC.ANALOG.rssi / 1023 * 100).toFixed(0) + '%';
            updateChannelBar(rssiElem, rssi, FC.ANALOG.rssi, rssi);
        }

        function get_slow_data() {

            MSP.send_message(MSPCodes.MSP_STATUS, false, false, function() {
                const armingEnabled = (FC.CONFIG.armingDisableFlags == 0);
                $('.arm-danger-row').toggle(armingEnabled);
                for (var i = 0; i < FC.CONFIG.armingDisableCount; i++) {
                    $('#statusArmingDisableFlags'+i).toggle((FC.CONFIG.armingDisableFlags & (1 << i)) != 0);
                }
            });

            MSP.send_message(MSPCodes.MSP_ANALOG, false, false, function () {
                bat_voltage_e.text(i18n.getMessage('statusBatteryValue', [FC.ANALOG.voltage]));
                bat_mah_drawn_e.text(i18n.getMessage('statusBatteryMahValue', [FC.ANALOG.mAhdrawn]));
                bat_mah_drawing_e.text(i18n.getMessage('statusBatteryAValue', [FC.ANALOG.amperage.toFixed(2)]));
                update_rc_rssi();
            });

            MSP.send_message(MSPCodes.MSP_ALTITUDE, false, false, function () {
                // Usually altimeter indicates feet. We show centimeters, as it is more useful here.
                altitude.setAltitude(FC.SENSOR_DATA.altitude * 100);
            });
        }

        function get_fast_data() {

            MSP.send_message(MSPCodes.MSP_RC, false, false, function () {
                MSP.send_message(MSPCodes.MSP_RC_COMMAND, false, false, update_rc_channels);
            });

            MSP.send_message(MSPCodes.MSP_ATTITUDE, false, false, function () {
                roll_e.text(i18n.getMessage('statusAttitude', [FC.SENSOR_DATA.kinematics[0]]));
                pitch_e.text(i18n.getMessage('statusAttitude', [FC.SENSOR_DATA.kinematics[1]]));
                heading_e.text(i18n.getMessage('statusAttitude', [FC.SENSOR_DATA.kinematics[2]]));

                self.renderModel();

                attitude.setRoll(FC.SENSOR_DATA.kinematics[0]);
                attitude.setPitch(FC.SENSOR_DATA.kinematics[1]);
                heading.setHeading(FC.SENSOR_DATA.kinematics[2]);
            });
        }

        GUI.interval_add('status_data_pull_fast', get_fast_data, 50, true);   // 20 fps
        GUI.interval_add('status_data_pull_slow', get_slow_data, 250, true);  // 4 fps

        const enableArmingSwitch = $('input[id="statusEnableArming"]');
        const dialogConfirmArming = $('.dialogConfirmArming')[0];

        function updateArming(active) {
            FC.CONFIG.enableArmingFlag = active;
            mspHelper.setArmingEnabled(active);
        }

        enableArmingSwitch.change(function () {
            if (enableArmingSwitch.prop('checked')) {
                dialogConfirmArming.showModal();
            }
            else {
                updateArming(false);
            }
        });

        $('.dialogConfirmArming-cancelbtn').click(function() {
            dialogConfirmArming.close();
            enableArmingSwitch.prop('checked', false).change();
        });

        $('.dialogConfirmArming-confirmbtn').click(function() {
            dialogConfirmArming.close();
            updateArming(true);
        });

        updateArming(FC.CONFIG.enableArmingFlag);


        GUI.content_ready(callback);
    }
};


TABS.status.initModel = function () {
    this.model = new Model($('.model-and-info #canvas_wrapper'), $('.model-and-info #canvas'));

    $(window).on('resize', $.proxy(this.model.resize, this.model));
};

TABS.status.renderModel = function () {
    var x = (FC.SENSOR_DATA.kinematics[1] * -1.0) * 0.017453292519943295,
        y = ((FC.SENSOR_DATA.kinematics[2] * -1.0) - this.yaw_fix) * 0.017453292519943295,
        z = (FC.SENSOR_DATA.kinematics[0] * -1.0) * 0.017453292519943295;

    this.model.rotateTo(x, y, z);
};

TABS.status.cleanup = function (callback) {
    if (this.model) {
        $(window).off('resize', $.proxy(this.model.resize, this.model));
        this.model.dispose();
    }

    if (callback) callback();
};


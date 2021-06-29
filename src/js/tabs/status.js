'use strict';

TABS.status = {
    yaw_fix: 0.0
};

TABS.status.initialize = function (callback) {
    var self = this;

    if (GUI.active_tab != 'status') {
        GUI.active_tab = 'status';
    }

    function load_rc_data() {
        MSP.send_message(MSPCodes.MSP_RC, false, false, load_acc_trim);
    }

    function load_acc_trim() {
        MSP.send_message(MSPCodes.MSP_ACC_TRIM, false, false, load_status);
    }

    function load_status() {
        MSP.send_message(MSPCodes.MSP_STATUS_EX, false, false, load_name);
    }

    function load_name() {
        MSP.send_message(MSPCodes.MSP_NAME, false, false, load_html);
    }

    function load_html() {
        $('#content').load("./tabs/status.html", process_html);
    }

    load_rc_data();

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
        var bat_voltage_e = $('.bat-voltage'),
            bat_mah_drawn_e = $('.bat-mah-drawn'),
            bat_mah_drawing_e = $('.bat-mah-drawing'),
            rssi_e = $('.rssi-value'),
            arming_disable_flags_e = $('.arming-disable-flags'),
            gpsFix_e = $('.gpsFix'),
            gpsSats_e = $('.gpsSats'),
            gpsAlt_e = $('.gpsAlt'),
            gpsLat_e = $('.gpsLat'),
            gpsLon_e = $('.gpsLon'),
            roll_e = $('dd.roll'),
            pitch_e = $('dd.pitch'),
            heading_e = $('dd.heading');

        // DISARM FLAGS
        var prepareDisarmFlags = function() {

            var disarmFlagElements = ['NO_GYRO',
                                      'FAILSAFE',
                                      'RX_FAILSAFE',
                                      'BAD_RX_RECOVERY',
                                      'BOXFAILSAFE',
                                      'RUNAWAY_TAKEOFF',
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
                                     ];

            // Always the latest element
            disarmFlagElements = disarmFlagElements.concat(['ARM_SWITCH']);

            // Arming allowed flag
            arming_disable_flags_e.append('<span id="statusArmingAllowed" i18n="statusArmingAllowed" style="display: none;"></span>');

            // Arming disabled flags
            for (var i = 0; i < FC.CONFIG.armingDisableCount; i++) {
                // All the known elements but the ARM_SWITCH (it must be always the last element)
                if (i < disarmFlagElements.length - 1) {
                    arming_disable_flags_e.append('<span id="statusArmingDisableFlags' + i + '" class="cf_tip disarm-flag" title="' + i18n.getMessage('statusArmingDisableFlagsTooltip' + disarmFlagElements[i]) + '" style="display: none;">' + disarmFlagElements[i] + '</span>');
                }
                // The ARM_SWITCH, always the last element
                else if (i == FC.CONFIG.armingDisableCount - 1) {
                    arming_disable_flags_e.append('<span id="statusArmingDisableFlags' + i + '" class="cf_tip disarm-flag" title="' + i18n.getMessage('statusArmingDisableFlagsTooltipARM_SWITCH') + '" style="display: none;">ARM_SWITCH</span>');
                }
                // Unknown disarm flags
                else {
                    arming_disable_flags_e.append('<span id="statusArmingDisableFlags' + i + '" class="disarm-flag" style="display: none;">' + (i + 1) + '</span>');
                }
            }
        };

        prepareDisarmFlags();


        //
        // Receiver bars
        //

        const bar_names = [
            i18n.getMessage('controlAxisRoll'),
            i18n.getMessage('controlAxisPitch'),
            i18n.getMessage('controlAxisYaw'),
            i18n.getMessage('controlAxisThrottle'),
            i18n.getMessage('controlAxisCollective')
        ];

        const numBars = (FC.RC.active_channels > 0) ? FC.RC.active_channels : 8;
        const barContainer = $('.tab-status .bars');

        for (let i = 0, aux = 1; i < numBars; i++) {
            const name = (i < bar_names.length) ?
                  bar_names[i] : i18n.getMessage("controlAxisAux" + (aux++));
            barContainer.append('\
                <ul>\
                    <li class="name">' + name + '</li>\
                    <li class="meter">\
                        <div class="meter-bar">\
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
                    <div class="meter-bar">\
                        <div class="label"></div>\
                        <div class="fill">\
                            <div class="label"></div>\
                        </div>\
                    </div>\
                </li>\
            </ul>\
        ');

        function update_rc_rssi() {
            const rssi = ((FC.ANALOG.rssi / 1023) * 100).toFixed(0) + '%';
            meterFillArray[numBars].css('width', rssi);
            meterLabelArray[numBars].text(rssi);
        }

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

        function update_rc_channels() {
            for (let i = 0; i < FC.RC.active_channels; i++) {
                meterFillArray[i].css('width', ((FC.RC.channels[i] - meterScaleMin) / (meterScaleMax - meterScaleMin) * 100).clamp(0, 100) + '%');
                meterLabelArray[i].text(FC.RC.channels[i]);
            }
        }

        function get_slow_data() {

            MSP.send_message(MSPCodes.MSP_STATUS_EX, false, false, function() {
                $('#statusArmingAllowed').toggle(FC.CONFIG.armingDisableFlags == 0);
                for (var i = 0; i < FC.CONFIG.armingDisableCount; i++) {
                    $('#statusArmingDisableFlags'+i).css('display',(FC.CONFIG.armingDisableFlags & (1 << i)) == 0 ? 'none':'inline-block');
                }
            });

            MSP.send_message(MSPCodes.MSP_ANALOG, false, false, function () {
                bat_voltage_e.text(i18n.getMessage('statusBatteryValue', [FC.ANALOG.voltage]));
                bat_mah_drawn_e.text(i18n.getMessage('statusBatteryMahValue', [FC.ANALOG.mAhdrawn]));
                bat_mah_drawing_e.text(i18n.getMessage('statusBatteryAValue', [FC.ANALOG.amperage.toFixed(2)]));
                update_rc_rssi();
            });

            if (have_sensor(FC.CONFIG.activeSensors, 'gps')) {
                MSP.send_message(MSPCodes.MSP_RAW_GPS, false, false, function () {
                    gpsFix_e.html((FC.GPS_DATA.fix) ? i18n.getMessage('gpsFixYes') : i18n.getMessage('gpsFixNo'));
                    gpsSats_e.text(FC.GPS_DATA.numSat);
                    gpsAlt_e.text(FC.GPS_DATA.alt + ' m');
                    gpsLat_e.text((FC.GPS_DATA.lat / 10000000).toFixed(4) + ' deg');
                    gpsLon_e.text((FC.GPS_DATA.lon / 10000000).toFixed(4) + ' deg');
                });
            }
        }

        function get_fast_data() {

            MSP.send_message(MSPCodes.MSP_RC, false, false, update_rc_channels);

            MSP.send_message(MSPCodes.MSP_ATTITUDE, false, false, function () {
                roll_e.text(i18n.getMessage('statusAttitude', [FC.SENSOR_DATA.kinematics[0]]));
                pitch_e.text(i18n.getMessage('statusAttitude', [FC.SENSOR_DATA.kinematics[1]]));
                heading_e.text(i18n.getMessage('statusAttitude', [FC.SENSOR_DATA.kinematics[2]]));

                self.renderModel();

                attitude.setRoll(FC.SENSOR_DATA.kinematics[0]);
                attitude.setPitch(FC.SENSOR_DATA.kinematics[1]);
                heading.setHeading(FC.SENSOR_DATA.kinematics[2]);
            });

            MSP.send_message(MSPCodes.MSP_ALTITUDE, false, false, function () {
                // Usually altimeter indicates feet. We show centimeters, as it is more useful here.
                altitude.setAltitude(FC.SENSOR_DATA.altitude * 100);
            });
        }

        // status data pull
        GUI.interval_add('status_data_pull_fast', get_fast_data, 33, true); // 30 fps
        GUI.interval_add('status_data_pull_slow', get_slow_data, 250, true); // 4 fps

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


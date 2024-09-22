const tab = {
    tabName: 'receiver',
    isDirty: false,
    needReboot: false,
    bindButton: false,
    stickButton: false,
    saveButtons: false,
    rxProto: null,
    rcRPY: [ 0, 0, 0, ],
    rcmap: [ 0, 1, 2, 3, 4, 5, 6, 7 ],
    rcmapSize: 8,
    deadband: 0,
    yawDeadband: 0,
    rcCenter: 1500,
    rcDeflection: 500,
    rcArmThrottle: 1050,
    rcZeroThrottle: 1100,
    rcFullThrottle: 1900,
    telemetryExtSensors: 0,
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
    rxProtocols: [
        { name: 'None',                 id: 0,   feature: null,           telemetry: 0,           visible: true, },
        { name: 'TBS CRSF',             id: 9,   feature: 'RX_SERIAL',    telemetry: 0x0010378F,  visible: true, },
        { name: 'Futaba S.BUS',         id: 2,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'Futaba S.BUS2',        id: 15,  feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'FrSky F.PORT',         id: 12,  feature: 'RX_SERIAL',    telemetry: 0xFFFFFFFF,  visible: true, },
        { name: 'Spektrum DSM/1024',    id: 0,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'Spektrum DSM/2048',    id: 1,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'Spektrum DSM/SRXL',    id: 10,  feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'Spektrum DSM/SRXL2',   id: 13,  feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'ImmersionRC GHOST',    id: 14,  feature: 'RX_SERIAL',    telemetry: 0xFFFFFFFF,  visible: true, },
        { name: 'Graupner SUMD',        id: 3,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'Graupner SUMH',        id: 4,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'Flysky IBUS',          id: 7,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'JR XBUS',              id: 5,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'JR XBUS/RJ01',         id: 6,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'Jeti EXBUS',           id: 8,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'CPPM',                 id: 0,   feature: 'RX_PPM',       telemetry: 0,           visible: true, },
        { name: 'MSP',                  id: 0,   feature: 'RX_MSP',       telemetry: 0,           visible: true, },
        // Unsupported SPI receivers
        { name: 'SPI/CX10',             id: 4,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/CX10A',            id: 5,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/ELRS',             id: 19,  feature: 'RX_SPI',       telemetry: 0xFFFFFFFF,  visible: false, },
        { name: 'SPI/FRSKY D',          id: 8,   feature: 'RX_SPI',       telemetry: 0xFFFFFFFF,  visible: false, },
        { name: 'SPI/FRSKY X',          id: 9,   feature: 'RX_SPI',       telemetry: 0xFFFFFFFF,  visible: false, },
        { name: 'SPI/FRSKY X LBT',      id: 15,  feature: 'RX_SPI',       telemetry: 0xFFFFFFFF,  visible: false, },
        { name: 'SPI/FRSKY X V2',       id: 17,  feature: 'RX_SPI',       telemetry: 0xFFFFFFFF,  visible: false, },
        { name: 'SPI/FRSKY X LBT V2',   id: 18,  feature: 'RX_SPI',       telemetry: 0xFFFFFFFF,  visible: false, },
        { name: 'SPI/FLYSKY',           id: 10,  feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/FLYSKY 2A',        id: 11,  feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/H8_3D',            id: 6,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/INAV',             id: 7,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/KN',               id: 12,  feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/REDPINE',          id: 16,  feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/SFHSS',            id: 13,  feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/SYMA X',           id: 2,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/SYMA X5C',         id: 3,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/SPEKTRUM',         id: 14,  feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/V202 250k',        id: 0,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        { name: 'SPI/V202 1M',          id: 1,   feature: 'RX_SPI',       telemetry: 0,           visible: false, },
        // Hidden options
        { name: 'PWM',                  id: 0,   feature: 'RX_PARALLEL_PWM', telemetry: 0,           visible: false, },
        { name: 'CUSTOM',               id: 11,  feature: 'RX_SERIAL',       telemetry: 0,           visible: false, },
    ],
    telemetryProtoSensors: [
        { name: 'FrSky Hub',            id: 4,     sensors: 0xFFFFFFFF },
        { name: 'FrSky S.Port',         id: 32,    sensors: 0xFFFFFFFF },
        { name: 'FlySky iBUS',          id: 4096,  sensors: 0xFFFFFFFF },
        { name: 'Graupner HoTT',        id: 8,     sensors: 0xFFFFFFFF },
        { name: 'MAVLink',              id: 512,   sensors: 0xFFFFFFFF },
        { name: 'LTM',                  id: 16,    sensors: 0xFFFFFFFF },
    ],
    telemetrySensorList: [
        { name: 'MODE',                 id:  3, },
        { name: 'VOLTAGE',              id:  0, },
        { name: 'CURRENT',              id:  1, },
        { name: 'FUEL_LEVEL',           id:  2, },
        { name: 'USED_CAPACITY',        id: 20, },
        { name: 'TEMPERATURE',          id: 19, },
        { name: 'PITCH',                id:  7, },
        { name: 'ROLL',                 id:  8, },
        { name: 'HEADING',              id:  9, },
        { name: 'ACC_X',                id:  4, },
        { name: 'ACC_Y',                id:  5, },
        { name: 'ACC_Z',                id:  6, },
        { name: 'ALTITUDE',             id: 10, },
        { name: 'VARIO',                id: 11, },
        { name: 'LAT_LONG',             id: 12, },
        { name: 'GROUND_SPEED',         id: 13, },
        { name: 'DISTANCE',             id: 14, },
        { name: 'ESC_CURRENT',          id: 15, },
        { name: 'ESC_VOLTAGE',          id: 16, },
        { name: 'ESC_RPM',              id: 17, },
        { name: 'ESC_TEMPERATURE',      id: 18, },
        { name: 'ADJUSTMENT',           id: 21, },
        { name: 'GOV_MODE',             id: 22, },
    ],
    telemetry: {
        enabled: false,
        config: null,
        DEFAULT_CRSF_TELEMETRY_RATE: 500,
        DEFAULT_CRSF_TELEMETRY_RATIO: 4,
        CRSF_SENSOR_CONFLICTS: {},
        SENSORS: [
            'NONE',

            'HEARTBEAT',

            'BATTERY',
            'BATTERY_VOLTAGE',
            'BATTERY_CURRENT',
            'BATTERY_CONSUMPTION',
            'BATTERY_CHARGE_LEVEL',
            'BATTERY_CELL_COUNT',
            'BATTERY_CELL_VOLTAGE',
            'BATTERY_CELL_VOLTAGES',

            'CONTROL',
            'PITCH_CONTROL',
            'ROLL_CONTROL',
            'YAW_CONTROL',
            'COLLECTIVE_CONTROL',
            'THROTTLE_CONTROL',

            'ESC1_DATA',
            'ESC1_VOLTAGE',
            'ESC1_CURRENT',
            'ESC1_CAPACITY',
            'ESC1_ERPM',
            'ESC1_POWER',
            'ESC1_THROTTLE',
            'ESC1_TEMP1',
            'ESC1_TEMP2',
            'ESC1_BEC_VOLTAGE',
            'ESC1_BEC_CURRENT',
            'ESC1_STATUS',
            'ESC1_MODEL',

            'ESC2_DATA',
            'ESC2_VOLTAGE',
            'ESC2_CURRENT',
            'ESC2_CAPACITY',
            'ESC2_ERPM',
            'ESC2_POWER',
            'ESC2_THROTTLE',
            'ESC2_TEMP1',
            'ESC2_TEMP2',
            'ESC2_BEC_VOLTAGE',
            'ESC2_BEC_CURRENT',
            'ESC2_STATUS',
            'ESC2_MODEL',

            'ESC_VOLTAGE',
            'BEC_VOLTAGE',
            'BUS_VOLTAGE',
            'MCU_VOLTAGE',

            'ESC_CURRENT',
            'BEC_CURRENT',
            'BUS_CURRENT',
            'MCU_CURRENT',

            'ESC_TEMP',
            'BEC_TEMP',
            'MCU_TEMP',
            'AIR_TEMP',
            'MOTOR_TEMP',
            'BATTERY_TEMP',
            'EXHAUST_TEMP',

            'HEADING',
            'ALTITUDE',
            'VARIOMETER',

            'HEADSPEED',
            'TAILSPEED',
            'MOTOR_RPM',
            'TRANS_RPM',

            'ATTITUDE',
            'ATTITUDE_PITCH',
            'ATTITUDE_ROLL',
            'ATTITUDE_YAW',

            'ACCEL',
            'ACCEL_X',
            'ACCEL_Y',
            'ACCEL_Z',

            'GPS',
            'GPS_SATS',
            'GPS_PDOP',
            'GPS_HDOP',
            'GPS_VDOP',
            'GPS_COORD',
            'GPS_ALTITUDE',
            'GPS_HEADING',
            'GPS_GROUNDSPEED',
            'GPS_HOME_DISTANCE',
            'GPS_HOME_DIRECTION',
            'GPS_DATE_TIME',

            'LOAD',
            'CPU_LOAD',
            'SYS_LOAD',
            'RT_LOAD',

            'MODEL_ID',
            'FLIGHT_MODE',
            'ARMING_FLAGS',
            'ARMING_DISABLE_FLAGS',
            'RESCUE_STATE',
            'GOVERNOR_STATE',
            'GOVERNOR_FLAGS',

            'PID_PROFILE',
            'RATES_PROFILE',
            'BATTERY_PROFILE',
            'LED_PROFILE',

            'ADJFUNC',

            'DEBUG_0',
            'DEBUG_1',
            'DEBUG_2',
            'DEBUG_3',
            'DEBUG_4',
            'DEBUG_5',
            'DEBUG_6',
            'DEBUG_7',
        ],
        CRSF_CUSTOM_SENSORS: [
            {
                title: 'BATTERY',
                sensors: [
                    'BATTERY_VOLTAGE',
                    'BATTERY_CURRENT',
                    'BATTERY_CONSUMPTION',
                    'BATTERY_CHARGE_LEVEL',
                    'BATTERY_CELL_COUNT',
                    'BATTERY_CELL_VOLTAGE',
                ],
            },
            {
                title: 'VOLTAGE',
                sensors: [
                    'ESC_VOLTAGE',
                    'BEC_VOLTAGE',
                    'BUS_VOLTAGE',
                    'MCU_VOLTAGE',
                ],
            },
            {
                title: 'CURRENT',
                sensors: [
                    'ESC_CURRENT',
                ],
            },
            {
                title: 'TEMPERATURE',
                sensors: [
                    'ESC_TEMP',
                    'BEC_TEMP',
                    'MCU_TEMP',
                ],
            },
            {
                title: 'ESC1',
                sensors: [
                    'ESC1_VOLTAGE',
                    'ESC1_CURRENT',
                    'ESC1_CAPACITY',
                    'ESC1_ERPM',
                    'ESC1_POWER',
                    'ESC1_THROTTLE',
                    'ESC1_TEMP1',
                    'ESC1_TEMP2',
                    'ESC1_BEC_VOLTAGE',
                    'ESC1_BEC_CURRENT',
                    'ESC1_STATUS',
                    'ESC1_MODEL',
                ],
            },
            {
                title: 'ESC2',
                sensors: [
                    'ESC2_VOLTAGE',
                    'ESC2_CURRENT',
                    'ESC2_CAPACITY',
                    'ESC2_ERPM',
                    'ESC2_TEMP1',
                    'ESC2_MODEL',
                ],
            },
            {
                title: 'RPM',
                sensors: [
                    'HEADSPEED',
                    'TAILSPEED',
                ],
            },
            {
                title: 'BARO',
                sensors: [
                    'ALTITUDE',
                    'VARIOMETER',
                ],
            },
            {
                title: 'GYRO',
                sensors: [
                    'HEADING',
                    { sensor: 'ATTITUDE',       conflicts: ['ATTITUDE_PITCH', 'ATTITUDE_ROLL', 'ATTITUDE_YAW'] },
                    { sensor: 'ATTITUDE_PITCH', conflicts: ['ATTITUDE'] },
                    { sensor: 'ATTITUDE_ROLL',  conflicts: ['ATTITUDE'] },
                    { sensor: 'ATTITUDE_YAW',   conflicts: ['ATTITUDE'] },
                    { sensor: 'ACCEL',          conflicts: ['ACCEL_X', 'ACCEL_Y', 'ACCEL_Z'] },
                    { sensor: 'ACCEL_X',        conflicts: ['ACCEL'] },
                    { sensor: 'ACCEL_Y',        conflicts: ['ACCEL'] },
                    { sensor: 'ACCEL_Z',        conflicts: ['ACCEL'] },
                ],
            },
            {
                title: 'GPS',
                sensors: [
                    'GPS_SATS',
                    'GPS_PDOP',
                    'GPS_COORD',
                    'GPS_ALTITUDE',
                    'GPS_HEADING',
                    'GPS_GROUNDSPEED',
                    'GPS_HOME_DISTANCE',
                    'GPS_HOME_DIRECTION',
                ],
            },
            {
                title: 'STATUS',
                sensors: [
                    'MODEL_ID',
                    'FLIGHT_MODE',
                    'ARMING_FLAGS',
                    'ARMING_DISABLE_FLAGS',
                    'RESCUE_STATE',
                    'GOVERNOR_STATE',
                    'ADJFUNC',
                ],
            },
            {
                title: 'PROFILE',
                sensors: [
                    'PID_PROFILE',
                    'RATES_PROFILE',
                    'LED_PROFILE',
                ],
            },
            {
                title: 'CONTROL',
                sensors: [
                    {
                      sensor: 'CONTROL',
                      conflicts: [
                        'PITCH_CONTROL',
                        'ROLL_CONTROL',
                        'YAW_CONTROL',
                        'COLLECTIVE_CONTROL',
                      ],
                    },
                    { sensor: 'PITCH_CONTROL',      conflicts: ['CONTROL'] },
                    { sensor: 'ROLL_CONTROL',       conflicts: ['CONTROL'] },
                    { sensor: 'YAW_CONTROL',        conflicts: ['CONTROL'] },
                    { sensor: 'COLLECTIVE_CONTROL', conflicts: ['CONTROL'] },
                    'THROTTLE_CONTROL',
                ],
            },
            {
                title: 'SYSTEM',
                sensors: [
                    'HEARTBEAT',
                    'CPU_LOAD',
                    'SYS_LOAD',
                    'RT_LOAD',
                ],
            },
            {
                title: 'DEBUG',
                sensors: [
                    'DEBUG_0',
                    'DEBUG_1',
                    'DEBUG_2',
                    'DEBUG_3',
                    'DEBUG_4',
                    'DEBUG_5',
                    'DEBUG_6',
                    'DEBUG_7',
                ],
            },
        ],
    },
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
            if (reboot)
                self.needReboot = true;
            if (self.saveButtons)
                self.isDirty = true;
            if (self.saveButtons || self.bindButton || self.stickButton) {
                $('.tab-receiver').removeClass('toolbar_hidden');
                bindBtn.toggle(self.bindButton);
                stickBtn.toggle(self.stickButton);
                saveBtn.toggle(!self.needReboot && self.saveButtons);
                rebootBtn.toggle(self.needReboot && self.saveButtons);
                revertBtn.toggle(self.saveButtons);
            }
        }

        $('input[name="cyclic_deadband"]')
            .val(FC.RC_CONFIG.rc_deadband)
            .change(function () {
                self.deadband = getIntegerValue(this);
            })
            .change();

        $('input[name="yaw_deadband"]')
            .val(FC.RC_CONFIG.rc_yaw_deadband)
            .change(function () {
                self.yawDeadband = getIntegerValue(this);
            })
            .change();

        $('input[name="stick_center"]')
            .val(FC.RC_CONFIG.rc_center)
            .change(function () {
                self.rcCenter = getIntegerValue(this);
            })
            .change();

        $('input[name="stick_deflection"]')
            .val(FC.RC_CONFIG.rc_deflection)
            .change(function () {
                self.rcDeflection = getIntegerValue(this);
            })
            .change();

        const armThrottle = $('input[name="arm_throttle"]');
        const zeroThrottle = $('input[name="zero_throttle"]');
        const fullThrottle = $('input[name="full_throttle"]');

        armThrottle.val(FC.RC_CONFIG.rc_arm_throttle)
            .change(function () {
                const value = getIntegerValue(this);
                self.rcArmThrottle = value;
                zeroThrottle.attr('min', value + 10);
            })
            .change();

        zeroThrottle.val(FC.RC_CONFIG.rc_min_throttle)
            .change(function () {
                const value = getIntegerValue(this);
                self.rcZeroThrottle = value;
                armThrottle.attr('max', value - 10);
                fullThrottle.attr('min', value + 10);
            })
            .change();

        fullThrottle.val(FC.RC_CONFIG.rc_max_throttle)
            .change(function () {
                const value = getIntegerValue(this);
                self.rcFullThrottle = value;
                zeroThrottle.attr('max', value - 10);
            })
            .change();


    //// RX Mode

        const rxProtoSelectElement = $('select[name="receiverProtocol"]');
        var currentProto = 0;

        self.rxSerialPort = FC.SERIAL_CONFIG.ports.some((port) => (port.functionMask & 64));

        self.rxProtocols.forEach((item, index) => {
            let visible = item.visible;
            let disabled = '';
            if (FC.FEATURE_CONFIG.features.isEnabled(item.feature)) {
                if ((item.feature == 'RX_SERIAL' && item.id == FC.RX_CONFIG.serialrx_provider && self.rxSerialPort) ||
                    (item.feature == 'RX_SPI' && item.id == FC.RX_CONFIG.rxSpiProtocol) ||
                    (item.feature == 'RX_MSP') ||
                    (item.feature == 'RX_PPM') ||
                    (item.feature == 'RX_PARALLEL_PWM')) {
                        visible = true;
                        currentProto = index;
                }
            }
            if (item.feature == 'RX_SERIAL' && !self.rxSerialPort) {
                disabled = 'disabled';
            }
            if (visible) {
                rxProtoSelectElement.append(`<option value="${index}" ${disabled}>${item.name}</option>`);
            }
        });

        rxProtoSelectElement.change(function () {
            const index = parseInt($(this).val());
            const proto = self.rxProtocols[index];

            self.rxProto = proto;

            if (proto) {
                FC.FEATURE_CONFIG.features.setGroup('RX_PROTO', false);
                FC.FEATURE_CONFIG.features.setFeature(proto.feature, true);

                $('.featureSerialRx').toggle(proto.feature == 'RX_SERIAL');

                if (proto.feature == 'RX_SERIAL') {
                    FC.RX_CONFIG.serialrx_provider = proto.id;
                }
                else if (proto.feature == 'RX_SPI') {
                    FC.RX_CONFIG.rxSpiProtocol = proto.id;
                }
            }
        });

        rxProtoSelectElement.val(currentProto).change();


    //// Serial options

        const serialRxInvertedElement = $('input[name="serial_inverted"]');
        serialRxInvertedElement.change(function () {
            const inverted = $(this).is(':checked') ? 1 : 0;
            FC.RX_CONFIG.serialrx_inverted = inverted;
        });

        serialRxInvertedElement.prop('checked', FC.RX_CONFIG.serialrx_inverted !== 0);

        const serialRxHalfDuplexElement = $('input[name="serial_half_duplex"]');
        serialRxHalfDuplexElement.change(function () {
            const halfduplex = $(this).is(':checked') ? 1 : 0;
            FC.RX_CONFIG.serialrx_halfduplex = halfduplex;
        });

        serialRxHalfDuplexElement.prop('checked', FC.RX_CONFIG.serialrx_halfduplex !== 0);

        const serialRxPinswapElement = $('input[name="serial_pinswap"]');
        serialRxPinswapElement.on("change", function () {
            const pinswap = $(this).is(':checked') ? 1 : 0;
            FC.RX_CONFIG.serialrx_pinswap = pinswap;
        });

        serialRxPinswapElement.prop('checked', FC.RX_CONFIG.serialrx_pinswap !== 0);
        serialRxPinswapElement.closest('tr').toggle(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7));


    //// Telemetry Options

        function populateTelemetrySensors() {
            const templ = $('#telemetrySensorTemplate tr');
            const table = $('.tab-receiver .telemetry_sensors table');
            for (const sensor of self.telemetrySensorList) {
                const state = !!(self.telemetry.config.telemetry_sensors & (1 << sensor.id));
                const desc = i18n.getMessage(`receiverTelemetrySensor_${sensor.name}`);
                const elem = templ.clone();
                elem.attr('sensor', sensor.id);
                elem.find('span').text(desc);
                elem.find('input').prop('checked', state).change(function () {
                    const checked = $(this).is(':checked');
                    if (checked)
                        self.telemetry.config.telemetry_sensors |= (1 << sensor.id);
                    else
                        self.telemetry.config.telemetry_sensors &= ~(1 << sensor.id);
                });
                table.append(elem);
            }
        }

        function updateTelemetrySensors() {
            const sensorList = self.telemetry.enabled ?
                (self.telemetryExtSensors | (self.rxProto ? self.rxProto.telemetry : 0)) : 0;
            $('.tab-receiver .telemetry_setting').toggle(self.telemetryExtSensors != 0);
            $('.tab-receiver .telemetry_sensors').toggle(sensorList != 0);
            for (const sensor of self.telemetrySensorList) {
                const state = !!(self.telemetry.config.telemetry_sensors & (1 << sensor.id));
                const visbl = !!(sensorList & (1 << sensor.id));
                const elem = $(`.tab-receiver .telemetry_sensors tr[sensor="${sensor.id}"]`);
                elem.toggle(visbl);
                elem.find('input').prop('checked', state);
            }
        }

        function updateExternalTelemetry() {
            self.telemetryExtSensors = 0;
            for (const port of FC.SERIAL_CONFIG.ports) {
                for (const proto of self.telemetryProtoSensors) {
                    if (port.functionMask & proto.id) {
                        self.telemetryExtSensors |= proto.sensors;
                    }
                }
            }
        }

        function populateCrsfTelemetrySensors() {
            // create sensor select
            const sensorSelect = $('#crsfTelemetrySensorTemplate li select');
            sensorSelect.append(`<option value="0" selected>---</option>`);
            for (const g of self.telemetry.CRSF_CUSTOM_SENSORS) {
                const groupLabel = i18n.getMessage(`receiverTelemetryGroup_${g.title}`);
                const group = $(`<optgroup label="${groupLabel}">`);
                for (const sensor of g.sensors) {
                    const sensorName = sensor.sensor ?? sensor;
                    const sensorId = self.telemetry.SENSORS.indexOf(sensorName);

                    if (sensor.conflicts) {
                        self.telemetry.CRSF_SENSOR_CONFLICTS[sensorId] =
                            sensor.conflicts.map(x => self.telemetry.SENSORS.indexOf(x));
                    }

                    const escNum = sensorName.match(/^ESC(\d)/);
                    let desc;
                    if (escNum) {
                        const prefix = `#${escNum[1]}`;
                        const message = i18n.getMessage(`receiverCrsfTelemetrySensor_${sensorName.replace(/^ESC\d/, 'ESC')}`);
                        desc = `${prefix} ${message}`;
                    } else {
                        desc = i18n.getMessage(`receiverCrsfTelemetrySensor_${sensorName}`);
                    }
                    group.append(`<option value="${sensorId}">${desc}</option>`);
                }
                sensorSelect.append(group);
            }

            // create sensor slot list
            const dest = $('.tab-receiver .crsf-telemetry-sensors ul');
            const templ = $('#crsfTelemetrySensorTemplate li');

            for (let i = 0; i < mspHelper.CRSF_TELEMETRY_SENSOR_LENGTH; i++) {
                const elem = templ.clone();
                elem.find('select').on('change', function() {
                    updateCrsfTelemetrySensors();
                });
                dest.append(elem);
            }

            dest.sortable({ update: function() {
                updateCrsfTelemetrySensors();
                self.saveButtons = true;
                updateButtons(true);
            }});
            updateCrsfTelemetrySensors();
        }

        function updateCrsfTelemetry() {
            $('.tab-receiver .telemetry_setting').hide();
            $('.tab-receiver .crsf-telemetry-setting').show();

            const { config } = self.telemetry;
            const isCustom = config.crsf_telemetry_mode === 1;

            $('.tab-receiver .crsf-telemetry-sensors').toggle(isCustom);
            $('.tab-receiver .telemetry_sensors').toggle(!isCustom);

            $('.tab-receiver input[name="crsf-telemetry-mode"]')
                .prop('checked', isCustom);

            $('.tab-receiver input[name="crsf-telemetry-rate"]')
                .val(config.crsf_telemetry_rate || self.telemetry.DEFAULT_CRSF_TELEMETRY_RATE)
                .trigger('change');

            $('.tab-receiver input[name="crsf-telemetry-ratio"]')
                .val(config.crsf_telemetry_ratio || self.telemetry.DEFAULT_CRSF_TELEMETRY_RATIO)
                .trigger('change');

            if (isCustom) {
                $('.tab-receiver .crsf-telemetry-sensors ul')
                    .children()
                    .each(function (i) {
                        const sensorId = self.telemetry.config.crsf_telemetry_sensors[i];
                        $(this).find('select').val(sensorId);
                    });

                updateCrsfTelemetrySensors();
            } else {
                updateTelemetrySensors();
            }
        }

        function updateCrsfTelemetrySensors() {
            const items = $('.tab-receiver .crsf-telemetry-sensors ul')
                .children()
                .toArray();

            const sensors = items.map(item => Number($(item).find('select').val()));

            let lastFilledSlot = sensors.length - 1;
            for (; lastFilledSlot >= 0; lastFilledSlot--) {
                if (sensors[lastFilledSlot] > 0) break;
            }

            let sensorCount = 1;

            for (let i = 0; i < items.length; i++) {
                $(items[i])
                    .toggle(i <= lastFilledSlot + 1)
                    .find('select')
                    .val(sensors[i])
                    // disable options
                    .find('option')
                    .each(function () {
                        let disable = false;
                        const elem = $(this);
                        const val = Number(elem.attr('value'));

                        if (val === 0 || // enable the 'none' option
                            val === sensors[i]) { // enable the currently selected option
                            disable = false;
                        } else if (sensors.includes(val)) { // disable selected options
                            disable = true;
                        } else { // disable conflicts with selected options
                            for (const conflict of self.telemetry.CRSF_SENSOR_CONFLICTS[val] ?? []) {
                                if (sensors.includes(conflict)) {
                                    disable = true;
                                    break;
                                }
                            }
                        }
                        elem.prop('disabled', disable);
                    });

                $(items[i])
                    .find('.crsf-telemetry-index')
                    // ignore counting empty slots
                    .text(sensors[i] > 0 ? sensorCount++ : '');
            }
        }

        function updateTelemetry() {
            const usingExternalTelem = !!self.telemetryExtSensors;
            const isCrsf = self.telemetry.enabled && self.rxProto.name === "TBS CRSF";
            const SUPPORT_CRSF_CUSTOM_TELEM = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7);

            if (!usingExternalTelem && isCrsf && SUPPORT_CRSF_CUSTOM_TELEM) {
                return updateCrsfTelemetry();
            }

            $('.tab-receiver .crsf-telemetry-setting').hide();
            $('.tab-receiver .crsf-telemetry-sensors').hide();

            updateTelemetrySensors();
        }

        self.telemetry.enabled = FC.FEATURE_CONFIG.features.isEnabled('TELEMETRY');
        self.telemetry.config = {
            ...FC.TELEMETRY_CONFIG,
        };

        updateExternalTelemetry();
        populateTelemetrySensors();
        populateCrsfTelemetrySensors();

        $('.tab-receiver input[name="telemetry_enabled"]')
            .on('change', function () {
                self.telemetry.enabled = $(this).is(':checked');
                FC.FEATURE_CONFIG.features.setFeature('TELEMETRY', self.telemetry.enabled);
                updateTelemetry();
            })
            .prop('checked', self.telemetry.enabled)
            .trigger('change');

        $('.tab-receiver input[name="crsf-telemetry-mode"]').on('change', function () {
            self.telemetry.config.crsf_telemetry_mode = +$(this).is(':checked');
            self.telemetry.config.crsf_telemetry_sensors.fill(0);
            updateTelemetry();
        });

        $('.tab-receiver input[name="crsf-telemetry-rate"]').on('change', function() {
            self.telemetry.config.crsf_telemetry_rate = getIntegerValue(this);
        });

        $('.tab-receiver input[name="crsf-telemetry-ratio"]').on('change', function() {
            self.telemetry.config.crsf_telemetry_ratio = getIntegerValue(this);
        });

        rxProtoSelectElement.on('change', updateTelemetry);

        const telemetryInvertedElement = $('input[name="telemetry_inverted"]');
        telemetryInvertedElement.on("change", function () {
            const inverted = $(this).is(':checked') ? 1 : 0;
            FC.TELEMETRY_CONFIG.telemetry_inverted = inverted;
        });

        telemetryInvertedElement.prop('checked', FC.TELEMETRY_CONFIG.telemetry_inverted !== 0);

        const telemetryHalfDuplexElement = $('input[name="telemetry_half_duplex"]');
        telemetryHalfDuplexElement.change(function () {
            const halfduplex = $(this).is(':checked') ? 1 : 0;
            FC.TELEMETRY_CONFIG.telemetry_halfduplex = halfduplex;
        });

        telemetryHalfDuplexElement.prop('checked', FC.TELEMETRY_CONFIG.telemetry_halfduplex !== 0);

        const telemetryPinswapElement = $('input[name="telemetry_pinswap"]');
        telemetryPinswapElement.on("change", function () {
            const pinswap = $(this).is(':checked') ? 1 : 0;
            FC.TELEMETRY_CONFIG.telemetry_pinswap = pinswap;
        });

        telemetryPinswapElement.prop('checked', FC.TELEMETRY_CONFIG.telemetry_pinswap !== 0);
        telemetryPinswapElement.closest('tr').toggle(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7));


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
                    deflection = pulse - self.rcCenter;
                    deadband = self.deadband;
                    range = self.rcDeflection - self.deadband;
                    break;
                case 2:
                    deflection = pulse - self.rcCenter;
                    deadband = self.yawDeadband;
                    range = self.rcDeflection - self.yawDeadband;
                    break;
                case 3:
                    deflection = pulse - self.rcCenter;
                    deadband = 0;
                    range = self.rcDeflection;
                    break;
                case 4:
                    deflection = pulse - self.rcZeroThrottle;
                    deadband = 0;
                    range = self.rcFullThrottle - self.rcZeroThrottle;
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

            FC.RC_CONFIG.rc_center = self.rcCenter;
            FC.RC_CONFIG.rc_deflection = self.rcDeflection;

            FC.RC_CONFIG.rc_arm_throttle = self.rcArmThrottle;
            FC.RC_CONFIG.rc_min_throttle = self.rcZeroThrottle;
            FC.RC_CONFIG.rc_max_throttle = self.rcFullThrottle;

            FC.RC_CONFIG.rc_deadband = self.deadband;
            FC.RC_CONFIG.rc_yaw_deadband = self.yawDeadband;

            FC.RC_MAP = self.rcmap;

            $('.tab-receiver .crsf-telemetry-sensors .sensor-list')
                .children()
                .each(function(i) {
                    const sensorId = Number($(this).find('select').val());
                    self.telemetry.config.crsf_telemetry_sensors[i] = sensorId;
                });
            FC.TELEMETRY_CONFIG = {
                ...self.telemetry.config,
            };
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

    self.model = new Model($('#canvas_wrapper'), $('#canvas'));
    self.clock = new THREE.Clock();
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

    $(window).on('resize', $.proxy(self.model.resize, self.model));
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

        self.model.rotateBy(-degToRad(pitch), -degToRad(yaw), -degToRad(roll));
    }
};

tab.cleanup = function (callback) {
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

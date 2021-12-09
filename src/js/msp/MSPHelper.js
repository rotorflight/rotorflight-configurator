'use strict';


// Used for LED_STRIP
const ledDirectionLetters    = ['n', 'e', 's', 'w', 'u', 'd'];      // in LSB bit order
const ledFunctionLetters     = ['i', 'w', 'f', 'a', 't', 'r', 'c', 'g', 's', 'b', 'l']; // in LSB bit order
const ledBaseFunctionLetters = ['c', 'f', 'a', 'l', 's', 'g', 'r']; // in LSB bit
let ledOverlayLetters        = ['t', 'o', 'b', 'v', 'i', 'w']; // in LSB bit

function MspHelper() {
    const self = this;

    // 0 based index, must be identical to 'baudRates' in 'src/main/io/serial.c' in rotorflight
    self.BAUD_RATES = [
        'AUTO',
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '250000',
        '400000',
        '460800',
        '500000',
        '921600',
        '1000000',
        '1500000',
        '2000000',
        '2470000',
    ];

    // needs to be identical to 'serialPortFunction_e' in 'src/main/io/serial.h' in rotorflight
    self.SERIAL_PORT_FUNCTIONS = {
        'MSP': 0,
        'GPS': 1,
        'TELEMETRY_FRSKY': 2,
        'TELEMETRY_HOTT': 3,
        'TELEMETRY_MSP': 4,
        'TELEMETRY_LTM': 4,
        'TELEMETRY_SMARTPORT': 5,
        'RX_SERIAL': 6,
        'BLACKBOX': 7,
        'TELEMETRY_MAVLINK': 9,
        'ESC_SENSOR': 10,
        'TBS_SMARTAUDIO': 11,
        'TELEMETRY_IBUS': 12,
        'IRC_TRAMP': 13,
        'RUNCAM_DEVICE_CONTROL': 14,
        'LIDAR_TF': 15,
        'FRSKY_OSD': 16,
    };

    self.REBOOT_TYPES = {
        FIRMWARE: 0,
        BOOTLOADER: 1,
        MSC: 2,
        MSC_UTC: 3,
    };

    self.RESET_TYPES = {
        BASE_DEFAULTS: 0,
        CUSTOM_DEFAULTS: 1,
    };

    self.SIGNATURE_LENGTH = 32;

    self.mspMultipleCache = [];
}

MspHelper.prototype.process_data = function(dataHandler) {
    const self = this;
    const data = dataHandler.dataView; // DataView (allowing us to view arrayBuffer as struct/union)
    const code = dataHandler.code;
    const crcError = dataHandler.crcError;
    let buff = [];
    let char = '';
    let flags = 0;

    if (!crcError) {
        if (!dataHandler.unsupported) switch (code) {
            case MSPCodes.MSP_STATUS:
                FC.CONFIG.activeSensors = data.readU16();
                FC.CONFIG.mode = data.readU32();
                FC.CONFIG.armingDisableCount = data.readU8();
                FC.CONFIG.armingDisableFlags = data.readU32();
                FC.CONFIG.extraFlags = data.readU8();
                FC.CONFIG.motorCount = data.readU8();
                FC.CONFIG.servoCount = data.readU8();
                FC.CONFIG.numProfiles = data.readU8();
                FC.CONFIG.profile = data.readU8();
                FC.CONFIG.numRateProfiles = data.readU8();
                FC.CONFIG.rateProfile = data.readU8();
                FC.CONFIG.pidCycleTime = data.readU16();
                FC.CONFIG.gyroCycleTime = data.readU16();
                FC.CONFIG.sysLoad = data.readU8();
                FC.CONFIG.cpuLoad = data.readU8();
                sensor_status(FC.CONFIG.activeSensors);
                break;
            case MSPCodes.MSP_RAW_IMU:
                // 512 for mpu6050, 256 for mma
                // currently we are unable to differentiate between the sensor types, so we are goign with 512
                FC.SENSOR_DATA.accelerometer[0] = data.read16() / 512;
                FC.SENSOR_DATA.accelerometer[1] = data.read16() / 512;
                FC.SENSOR_DATA.accelerometer[2] = data.read16() / 512;

                // properly scaled
                FC.SENSOR_DATA.gyroscope[0] = data.read16() * (4 / 16.4);
                FC.SENSOR_DATA.gyroscope[1] = data.read16() * (4 / 16.4);
                FC.SENSOR_DATA.gyroscope[2] = data.read16() * (4 / 16.4);

                // no clue about scaling factor
                FC.SENSOR_DATA.magnetometer[0] = data.read16() / 1090;
                FC.SENSOR_DATA.magnetometer[1] = data.read16() / 1090;
                FC.SENSOR_DATA.magnetometer[2] = data.read16() / 1090;
                break;
            case MSPCodes.MSP_SERVO:
                const servoCount = data.byteLength / 2;
                for (let i = 0; i < servoCount; i++) {
                    FC.SERVO_DATA[i] = data.readU16();
                }
                break;
            case MSPCodes.MSP_SERVO_OVERRIDE:
                const overrideCount = data.byteLength / 2;
                for (let i = 0; i < overrideCount; i++) {
                    FC.SERVO_OVERRIDE[i] = data.read16();
                }
                break;
            case MSPCodes.MSP_MOTOR:
                const motorCount = data.byteLength / 2;
                for (let i = 0; i < motorCount; i++) {
                    FC.MOTOR_DATA[i] = data.readU16();
                }
                break;
            case MSPCodes.MSP_MOTOR_OVERRIDE:
                const motorOverrideCount = data.byteLength / 2;
                for (let i = 0; i < motorOverrideCount; i++) {
                    FC.MOTOR_OVERRIDE[i] = data.read16();
                }
                break;
            case MSPCodes.MSP2_MOTOR_OUTPUT_REORDERING:
                FC.MOTOR_OUTPUT_ORDER = [];
                const arraySize = data.read8();
                for (let i = 0; i < arraySize; i++) {
                    FC.MOTOR_OUTPUT_ORDER[i] = data.readU8();
                }
                break;
            case MSPCodes.MSP2_GET_VTX_DEVICE_STATUS:
                FC.VTX_DEVICE_STATUS = null;
                const dataLength = data.byteLength;
                if (dataLength > 0) {
                    const vtxDeviceStatusData = new Uint8Array(dataLength);
                    for (let i = 0; i < dataLength; i++) {
                        vtxDeviceStatusData[i] = data.readU8();
                    }
                    FC.VTX_DEVICE_STATUS = vtxDeviceStatusFactory.createVtxDeviceStatus(vtxDeviceStatusData);
                }
                break;
            case MSPCodes.MSP_MOTOR_TELEMETRY:
                const telemMotorCount = data.readU8();
                for (let i = 0; i < telemMotorCount; i++) {
                    FC.MOTOR_TELEMETRY_DATA.rpm[i] = data.readU32();   // RPM
                    FC.MOTOR_TELEMETRY_DATA.invalidPercent[i] = data.readU16();   // 10000 = 100.00%
                    FC.MOTOR_TELEMETRY_DATA.temperature[i] = data.readU8();       // degrees celsius
                    FC.MOTOR_TELEMETRY_DATA.voltage[i] = data.readU16();          // 0.01V per unit
                    FC.MOTOR_TELEMETRY_DATA.current[i] = data.readU16();          // 0.01A per unit
                    FC.MOTOR_TELEMETRY_DATA.consumption[i] = data.readU16();      // mAh
                }
                break;
            case MSPCodes.MSP_RC:
                FC.RC.active_channels = data.byteLength / 2;
                for (let i = 0; i < FC.RC.active_channels; i++) {
                    FC.RC.channels[i] = data.readU16();
                }
                break;
            case MSPCodes.MSP_RAW_GPS:
                FC.GPS_DATA.fix = data.readU8();
                FC.GPS_DATA.numSat = data.readU8();
                FC.GPS_DATA.lat = data.read32();
                FC.GPS_DATA.lon = data.read32();
                FC.GPS_DATA.alt = data.readU16();
                FC.GPS_DATA.speed = data.readU16();
                FC.GPS_DATA.ground_course = data.readU16();
                break;
            case MSPCodes.MSP_COMP_GPS:
                FC.GPS_DATA.distanceToHome = data.readU16();
                FC.GPS_DATA.directionToHome = data.readU16();
                FC.GPS_DATA.update = data.readU8();
                break;
            case MSPCodes.MSP_ATTITUDE:
                FC.SENSOR_DATA.kinematics[0] = data.read16() / 10.0; // x
                FC.SENSOR_DATA.kinematics[1] = data.read16() / 10.0; // y
                FC.SENSOR_DATA.kinematics[2] = data.read16(); // z
                break;
            case MSPCodes.MSP_ALTITUDE:
                FC.SENSOR_DATA.altitude = parseFloat((data.read32() / 100.0).toFixed(2)); // correct scale factor
                break;
            case MSPCodes.MSP_SONAR:
                FC.SENSOR_DATA.sonar = data.read32();
                break;
            case MSPCodes.MSP_ANALOG:
                FC.ANALOG.voltage = data.readU8() / 10.0;
                FC.ANALOG.mAhdrawn = data.readU16();
                FC.ANALOG.rssi = data.readU16(); // 0-1023
                FC.ANALOG.amperage = data.read16() / 100; // A
                FC.ANALOG.last_received_timestamp = Date.now();
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                    FC.ANALOG.voltage = data.readU16() / 100;
                }
                break;
            case MSPCodes.MSP_VOLTAGE_METERS:
                FC.VOLTAGE_METERS = [];
                const voltageMeterLength = 2;
                for (let i = 0; i < (data.byteLength / voltageMeterLength); i++) {
                    const voltageMeter = {
                        id: data.readU8(),
                        voltage: data.readU8() / 10.0,
                    };

                    FC.VOLTAGE_METERS.push(voltageMeter);
                }
                break;
            case MSPCodes.MSP_CURRENT_METERS:

                FC.CURRENT_METERS = [];
                const currentMeterLength = 5;
                for (let i = 0; i < (data.byteLength / currentMeterLength); i++) {
                    const currentMeter = {
                        id: data.readU8(),
                        mAhDrawn: data.readU16(), // mAh
                        amperage: data.readU16() / 1000, // A
                    };

                    FC.CURRENT_METERS.push(currentMeter);
                }
                break;
            case MSPCodes.MSP_BATTERY_STATE:
                FC.BATTERY_STATE.cellCount = data.readU8();
                FC.BATTERY_STATE.capacity = data.readU16(); // mAh

                FC.BATTERY_STATE.voltage = data.readU8() / 10.0; // V
                FC.BATTERY_STATE.mAhDrawn = data.readU16(); // mAh
                FC.BATTERY_STATE.amperage = data.readU16() / 100; // A
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                    FC.BATTERY_STATE.batteryState = data.readU8();
                    FC.BATTERY_STATE.voltage = data.readU16() / 100;
                }
                break;

            case MSPCodes.MSP_VOLTAGE_METER_CONFIG:
                if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_36)) {
                    FC.MISC.vbatscale = data.readU8(); // 10-200
                    FC.MISC.vbatmincellvoltage = data.readU8() / 10; // 10-50
                    FC.MISC.vbatmaxcellvoltage = data.readU8() / 10; // 10-50
                    FC.MISC.vbatwarningcellvoltage = data.readU8() / 10; // 10-50
                    if (semver.gte(FC.CONFIG.apiVersion, "1.23.0")) {
                        FC.MISC.batterymetertype = data.readU8();
                    }
                } else {
                    FC.VOLTAGE_METER_CONFIGS = [];
                    const voltageMeterCount = data.readU8();

                    for (let i = 0; i < voltageMeterCount; i++) {
                        const subframeLength = data.readU8();
                        if (subframeLength !== 5) {
                            for (let j = 0; j < subframeLength; j++) {
                                data.readU8();
                            }
                        } else {
                            const voltageMeterConfig = {
                                id: data.readU8(),
                                sensorType: data.readU8(),
                                vbatscale: data.readU8(),
                                vbatresdivval: data.readU8(),
                                vbatresdivmultiplier: data.readU8(),
                            };

                            FC.VOLTAGE_METER_CONFIGS.push(voltageMeterConfig);
                        }
                    }
                }
                break;
            case MSPCodes.MSP_CURRENT_METER_CONFIG:
                if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_36))  {
                    FC.BF_CONFIG.currentscale = data.read16();
                    FC.BF_CONFIG.currentoffset = data.read16();
                    FC.BF_CONFIG.currentmetertype = data.readU8();
                    FC.BF_CONFIG.batterycapacity = data.readU16();
                } else {
                    FC.CURRENT_METER_CONFIGS = [];
                    const currentMeterCount = data.readU8();
                    for (let i = 0; i < currentMeterCount; i++) {
                        const currentMeterConfig = {};
                        const subframeLength = data.readU8();

                        if (subframeLength !== 6) {
                            for (let j = 0; j < subframeLength; j++) {
                                data.readU8();
                            }
                        } else {
                            currentMeterConfig.id = data.readU8();
                            currentMeterConfig.sensorType = data.readU8();
                            currentMeterConfig.scale = data.read16();
                            currentMeterConfig.offset = data.read16();

                            FC.CURRENT_METER_CONFIGS.push(currentMeterConfig);
                        }
                    }
                }
                break;

            case MSPCodes.MSP_BATTERY_CONFIG:
                FC.BATTERY_CONFIG.vbatmincellvoltage = data.readU8() / 10; // 10-50
                FC.BATTERY_CONFIG.vbatmaxcellvoltage = data.readU8() / 10; // 10-50
                FC.BATTERY_CONFIG.vbatwarningcellvoltage = data.readU8() / 10; // 10-50
                FC.BATTERY_CONFIG.capacity = data.readU16();
                FC.BATTERY_CONFIG.voltageMeterSource = data.readU8();
                FC.BATTERY_CONFIG.currentMeterSource = data.readU8();
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                    FC.BATTERY_CONFIG.vbatmincellvoltage = data.readU16() / 100;
                    FC.BATTERY_CONFIG.vbatmaxcellvoltage = data.readU16() / 100;
                    FC.BATTERY_CONFIG.vbatwarningcellvoltage = data.readU16() / 100;
                }
                break;
            case MSPCodes.MSP_SET_BATTERY_CONFIG:
                console.log('Battery configuration saved');
                break;
            case MSPCodes.MSP_RC_TUNING:
                FC.RC_TUNING.rates_type = data.readU8();
                FC.RC_TUNING.RC_RATE = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.RC_EXPO = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.roll_rate = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.roll_rate_limit = data.readU16();
                FC.RC_TUNING.rcPitchRate = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.RC_PITCH_EXPO = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.pitch_rate = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.pitch_rate_limit = data.readU16();
                FC.RC_TUNING.rcYawRate = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.RC_YAW_EXPO = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.yaw_rate = parseFloat((data.readU8() / 100).toFixed(2));
                FC.RC_TUNING.yaw_rate_limit = data.readU16();
                break;
            case MSPCodes.MSP_PID:
                for (let i = 0; i < 3; i++) { // RPY
                    for (let j = 0; j < 4; j++) { // PIDF
                        FC.PIDS_ACTIVE[i][j] = data.readU8();
                        FC.PIDS[i][j] = FC.PIDS_ACTIVE[i][j];
                    }
                }
                break;
            case MSPCodes.MSP_ARMING_CONFIG:
                FC.ARMING_CONFIG.auto_disarm_delay = data.readU8();
                break;
            case MSPCodes.MSP_LOOP_TIME:
                if (semver.gte(FC.CONFIG.apiVersion, "1.8.0")) {
                    FC.FC_CONFIG.loopTime = data.readU16();
                }
                break;
            case MSPCodes.MSP_MISC: // 22 bytes
                FC.RX_CONFIG.midrc = data.readU16();
                FC.MOTOR_CONFIG.minthrottle = data.readU16(); // 0-2000
                FC.MOTOR_CONFIG.maxthrottle = data.readU16(); // 0-2000
                FC.MOTOR_CONFIG.mincommand = data.readU16(); // 0-2000
                FC.MISC.failsafe_throttle = data.readU16(); // 1000-2000
                FC.GPS_CONFIG.provider = data.readU8();
                FC.MISC.gps_baudrate = data.readU8();
                FC.GPS_CONFIG.ublox_sbas = data.readU8();
                FC.MISC.multiwiicurrentoutput = data.readU8();
                FC.RSSI_CONFIG.channel = data.readU8();
                FC.MISC.placeholder2 = data.readU8();
                data.read16(); // was mag_declination
                FC.MISC.vbatscale = data.readU8(); // was FC.MISC.vbatscale - 10-200
                FC.MISC.vbatmincellvoltage = data.readU8() / 10; // 10-50
                FC.MISC.vbatmaxcellvoltage = data.readU8() / 10; // 10-50
                FC.MISC.vbatwarningcellvoltage = data.readU8() / 10; // 10-50
                break;
            case MSPCodes.MSP_MOTOR_CONFIG:
                FC.MOTOR_CONFIG.mincommand = data.readU16();
                FC.MOTOR_CONFIG.minthrottle = data.readU16();
                FC.MOTOR_CONFIG.maxthrottle = data.readU16();
                FC.MOTOR_CONFIG.motor_pwm_protocol = data.readU8();
                FC.MOTOR_CONFIG.motor_pwm_rate = data.readU16();
                FC.MOTOR_CONFIG.use_pwm_inversion = (data.readU8() != 0);
                FC.MOTOR_CONFIG.use_unsynced_pwd = (data.readU8() != 0);
                FC.MOTOR_CONFIG.use_dshot_telemetry = (data.readU8() != 0);
                FC.MOTOR_CONFIG.motor_poles[0] = data.readU8();
                FC.MOTOR_CONFIG.motor_poles[1] = data.readU8();
                FC.MOTOR_CONFIG.motor_poles[2] = data.readU8();
                FC.MOTOR_CONFIG.motor_poles[3] = data.readU8();
                break;
            case MSPCodes.MSP_GPS_CONFIG:
                FC.GPS_CONFIG.provider = data.readU8();
                FC.GPS_CONFIG.ublox_sbas = data.readU8();
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_34)) {
                    FC.GPS_CONFIG.auto_config = data.readU8();
                    FC.GPS_CONFIG.auto_baud = data.readU8();

                    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
                        FC.GPS_CONFIG.home_point_once = data.readU8();
                        FC.GPS_CONFIG.ublox_use_galileo = data.readU8();
                    }
                }
                break;
            case MSPCodes.MSP_GPS_RESCUE:
                FC.GPS_RESCUE.angle             = data.readU16();
                FC.GPS_RESCUE.initialAltitudeM  = data.readU16();
                FC.GPS_RESCUE.descentDistanceM  = data.readU16();
                FC.GPS_RESCUE.rescueGroundspeed = data.readU16();
                FC.GPS_RESCUE.throttleMin       = data.readU16();
                FC.GPS_RESCUE.throttleMax       = data.readU16();
                FC.GPS_RESCUE.throttleHover     = data.readU16();
                FC.GPS_RESCUE.sanityChecks      = data.readU8();
                FC.GPS_RESCUE.minSats           = data.readU8();
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
                    FC.GPS_RESCUE.ascendRate            = data.readU16();
                    FC.GPS_RESCUE.descendRate           = data.readU16();
                    FC.GPS_RESCUE.allowArmingWithoutFix = data.readU8();
                    FC.GPS_RESCUE.altitudeMode          = data.readU8();
                }
                break;
            case MSPCodes.MSP_RSSI_CONFIG:
                FC.RSSI_CONFIG.channel = data.readU8();
                FC.RSSI_CONFIG.scale   = data.readU8();
                FC.RSSI_CONFIG.invert  = data.readU8();
                FC.RSSI_CONFIG.offset  = data.readU8();
                break;
            case MSPCodes.MSP_BOXNAMES:
                FC.AUX_CONFIG = []; // empty the array as new data is coming in

                buff = [];
                for (let i = 0; i < data.byteLength; i++) {
                    char = data.readU8();
                    if (char == 0x3B) { // ; (delimeter char)
                        FC.AUX_CONFIG.push(String.fromCharCode.apply(null, buff)); // convert bytes into ASCII and save as strings

                        // empty buffer
                        buff = [];
                    } else {
                        buff.push(char);
                    }
                }
                break;
            case MSPCodes.MSP_PIDNAMES:
                for (let i = 0; i < data.byteLength; i++) {
                    char = data.readU8();
                }
                break;
            case MSPCodes.MSP_BOXIDS:
                FC.AUX_CONFIG_IDS = []; // empty the array as new data is coming in

                for (let i = 0; i < data.byteLength; i++) {
                    FC.AUX_CONFIG_IDS.push(data.readU8());
                }
                break;
            case MSPCodes.MSP_SERVO_CONFIGURATIONS:
                FC.SERVO_CONFIG = []; // empty the array as new data is coming in
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
                    if (data.byteLength % 12 == 0) {
                        for (let i = 0; i < data.byteLength; i += 12) {
                            const arr = {
                                'mid':       data.readU16(),
                                'min':       data.read16(),
                                'max':       data.read16(),
                                'rate':      data.read16(),
                                'trim':      data.read16(),
                                'speed':     data.readU16()
                            };
                            FC.SERVO_CONFIG.push(arr);
                        }
                    }
                }
                break;
            case MSPCodes.MSP_RC_DEADBAND:
                FC.RC_DEADBAND_CONFIG.deadband = data.readU8();
                FC.RC_DEADBAND_CONFIG.yaw_deadband = data.readU8();
                FC.RC_DEADBAND_CONFIG.alt_hold_deadband = data.readU8();

                if (semver.gte(FC.CONFIG.apiVersion, "1.17.0")) {
                    FC.RC_DEADBAND_CONFIG.deadband3d_throttle = data.readU16();
                }
                break;
            case MSPCodes.MSP_SENSOR_ALIGNMENT:
                FC.SENSOR_ALIGNMENT.align_gyro = data.readU8();
                FC.SENSOR_ALIGNMENT.align_acc = data.readU8();
                FC.SENSOR_ALIGNMENT.align_mag = data.readU8();

                if (semver.gte(FC.CONFIG.apiVersion, '1.41.0')) {
                    FC.SENSOR_ALIGNMENT.gyro_detection_flags = data.readU8();
                    FC.SENSOR_ALIGNMENT.gyro_to_use = data.readU8();
                    FC.SENSOR_ALIGNMENT.gyro_1_align = data.readU8();
                    FC.SENSOR_ALIGNMENT.gyro_2_align = data.readU8();
                }
                break;
            case MSPCodes.MSP_DISPLAYPORT:
                break;
            case MSPCodes.MSP_SET_RAW_RC:
                break;
            case MSPCodes.MSP_SET_PID:
                console.log('PID settings saved');
                FC.PIDS_ACTIVE = FC.PIDS.map(array => array.slice());
                break;
            case MSPCodes.MSP_SET_RC_TUNING:
                console.log('RC Tuning saved');
                break;
            case MSPCodes.MSP_ACC_CALIBRATION:
                console.log('Accel calibration executed');
                break;
            case MSPCodes.MSP_MAG_CALIBRATION:
                console.log('Mag calibration executed');
                break;
            case MSPCodes.MSP_SET_MOTOR_CONFIG:
                console.log('Motor Configuration saved');
                break;
            case MSPCodes.MSP_SET_GPS_CONFIG:
                console.log('GPS Configuration saved');
                break;
            case MSPCodes.MSP_SET_GPS_RESCUE:
                console.log('GPS Rescue Configuration saved');
                break;
            case MSPCodes.MSP_SET_RSSI_CONFIG:
                console.log('RSSI Configuration saved');
                break;
            case MSPCodes.MSP_SET_FEATURE_CONFIG:
                console.log('Features saved');
                break;
            case MSPCodes.MSP_SET_BEEPER_CONFIG:
                console.log('Beeper Configuration saved');
                break;
            case MSPCodes.MSP_RESET_CONF:
                console.log('Settings Reset');
                break;
            case MSPCodes.MSP_SELECT_SETTING:
                console.log('Profile selected');
                break;
            case MSPCodes.MSP_SET_SERVO_CONFIGURATION:
                console.log('Servo Configuration saved');
                break;
            case MSPCodes.MSP_SET_SERVO_OVERRIDE:
                console.log('Servo Override set');
                break;
            case MSPCodes.MSP_EEPROM_WRITE:
                console.log('Settings Saved in EEPROM');
                break;
            case MSPCodes.MSP_SET_CURRENT_METER_CONFIG:
                console.log('Amperage Settings saved');
                break;
            case MSPCodes.MSP_SET_VOLTAGE_METER_CONFIG:
                console.log('Voltage config saved');
                break;
            case MSPCodes.MSP_DEBUG:
                for (let i = 0; i < 4; i++)
                    FC.SENSOR_DATA.debug[i] = data.read16();
                break;
            case MSPCodes.MSP_SET_MOTOR_OVERRIDE:
                console.log('Motor Override set');
                break;
            case MSPCodes.MSP_UID:
                FC.CONFIG.uid[0] = data.readU32();
                FC.CONFIG.uid[1] = data.readU32();
                FC.CONFIG.uid[2] = data.readU32();
                break;
            case MSPCodes.MSP_ACC_TRIM:
                FC.CONFIG.accelerometerTrims[0] = data.read16(); // pitch
                FC.CONFIG.accelerometerTrims[1] = data.read16(); // roll
                break;
            case MSPCodes.MSP_SET_ACC_TRIM:
                console.log('Accelerometer trimms saved.');
                break;
            case MSPCodes.MSP_GPS_SV_INFO:
                if (data.byteLength > 0) {
                    const numCh = data.readU8();

                    for (let i = 0; i < numCh; i++) {
                        FC.GPS_DATA.chn[i] = data.readU8();
                        FC.GPS_DATA.svid[i] = data.readU8();
                        FC.GPS_DATA.quality[i] = data.readU8();
                        FC.GPS_DATA.cno[i] = data.readU8();
                    }
                }
                break;

            case MSPCodes.MSP_RX_MAP:
                FC.RC_MAP = []; // empty the array as new data is coming in

                for (let i = 0; i < data.byteLength; i++) {
                    FC.RC_MAP.push(data.readU8());
                }
                break;
            case MSPCodes.MSP_SET_RX_MAP:
                console.log('RCMAP saved');
                break;

            case MSPCodes.MSP_MIXER_CONFIG:
                FC.MIXER_CONFIG.main_rotor_dir = data.readU8();
                FC.MIXER_CONFIG.tail_rotor_mode = data.readU8();
                FC.MIXER_CONFIG.tail_motor_idle = data.readU8();
                FC.MIXER_CONFIG.swash_ring = data.readU8();
                break;

            case MSPCodes.MSP_FEATURE_CONFIG:
                FC.FEATURE_CONFIG.features.setMask(data.readU32());

                updateTabList(FC.FEATURE_CONFIG.features);
                break;

            case MSPCodes.MSP_BEEPER_CONFIG:
                FC.BEEPER_CONFIG.beepers.setDisabledMask(data.readU32());
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_37)) {
                    FC.BEEPER_CONFIG.dshotBeaconTone = data.readU8();
                }
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_39)) {
                    FC.BEEPER_CONFIG.dshotBeaconConditions.setDisabledMask(data.readU32());
                }
                break;

            case MSPCodes.MSP_BOARD_ALIGNMENT_CONFIG:
                FC.BOARD_ALIGNMENT_CONFIG.roll = data.read16(); // -180 - 360
                FC.BOARD_ALIGNMENT_CONFIG.pitch = data.read16(); // -180 - 360
                FC.BOARD_ALIGNMENT_CONFIG.yaw = data.read16(); // -180 - 360
                break;

            case MSPCodes.MSP_SET_REBOOT:
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_40)) {
                    const rebootType = data.read8();
                    if ((rebootType === self.REBOOT_TYPES.MSC) || (rebootType === self.REBOOT_TYPES.MSC_UTC)) {
                        if (data.read8() === 0) {
                            console.log('Storage device not ready.');

                            showErrorDialog(i18n.getMessage('storageDeviceNotReady'));
                            break;
                        }
                    }
                }
                console.log('Reboot request accepted');
                break;

            case MSPCodes.MSP_API_VERSION:
                FC.CONFIG.mspProtocolVersion = data.readU8();
                FC.CONFIG.apiVersion = data.readU8() + '.' + data.readU8() + '.0';
                break;

            case MSPCodes.MSP_FC_VARIANT:
                let fcVariantIdentifier = '';
                for (let i = 0; i < 4; i++) {
                    fcVariantIdentifier += String.fromCharCode(data.readU8());
                }
                FC.CONFIG.flightControllerIdentifier = fcVariantIdentifier;
                break;

            case MSPCodes.MSP_FC_VERSION:
                FC.CONFIG.flightControllerVersion = data.readU8() + '.' + data.readU8() + '.' + data.readU8();
                break;

            case MSPCodes.MSP_BUILD_INFO:
                const dateLength = 11;
                buff = [];

                for (let i = 0; i < dateLength; i++) {
                    buff.push(data.readU8());
                }
                buff.push(32); // ascii space

                const timeLength = 8;
                for (let i = 0; i < timeLength; i++) {
                    buff.push(data.readU8());
                }
                FC.CONFIG.buildInfo = String.fromCharCode.apply(null, buff);
                break;

            case MSPCodes.MSP_BOARD_INFO:
                let boardIdentifier = '';
                for (let i = 0; i < 4; i++) {
                    boardIdentifier += String.fromCharCode(data.readU8());
                }
                FC.CONFIG.boardIdentifier = boardIdentifier;
                FC.CONFIG.boardVersion = data.readU16();

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_35)) {
                    FC.CONFIG.boardType = data.readU8();
                } else {
                    FC.CONFIG.boardType = 0;
                }

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_37)) {
                    FC.CONFIG.targetCapabilities = data.readU8();

                    let length = data.readU8();
                    for (let i = 0; i < length; i++) {
                        FC.CONFIG.targetName += String.fromCharCode(data.readU8());
                    }
                } else {
                    FC.CONFIG.targetCapabilities = 0;
                    FC.CONFIG.targetName = "";
                }

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_39)) {
                    let length = data.readU8();
                    for (let i = 0; i < length; i++) {
                        FC.CONFIG.boardName += String.fromCharCode(data.readU8());
                    }

                    length = data.readU8();
                    for (let i = 0; i < length; i++) {
                        FC.CONFIG.manufacturerId += String.fromCharCode(data.readU8());
                    }

                    for (let i = 0; i < self.SIGNATURE_LENGTH; i++) {
                        FC.CONFIG.signature.push(data.readU8());
                    }
                } else {
                    FC.CONFIG.boardName = "";
                    FC.CONFIG.manufacturerId = "";
                    FC.CONFIG.signature = [];
                }

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                    FC.CONFIG.mcuTypeId = data.readU8();
                } else {
                    FC.CONFIG.mcuTypeId = 255;
                }

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
                    FC.CONFIG.configurationState = data.readU8();
                }

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
                    FC.CONFIG.sampleRateHz = data.readU16();
                    FC.CONFIG.configurationProblems = data.readU32();
                } else {
                    FC.CONFIG.configurationProblems = 0;
                }

                break;

            case MSPCodes.MSP_NAME:
                FC.CONFIG.name = '';
                while ((char = data.readU8()) !== null) {
                    FC.CONFIG.name += String.fromCharCode(char);
                }
                break;

            case MSPCodes.MSP_SET_CHANNEL_FORWARDING:
                console.log('Channel forwarding saved');
                break;

            case MSPCodes.MSP_CF_SERIAL_CONFIG:
                FC.SERIAL_CONFIG.ports = [];
                if (semver.lt(FC.CONFIG.apiVersion, "1.6.0")) {
                    const serialPortCount = (data.byteLength - (4 * 4)) / 2;
                    for (let i = 0; i < serialPortCount; i++) {
                        const serialPort = {
                            identifier: data.readU8(),
                            scenario: data.readU8(),
                        };
                        FC.SERIAL_CONFIG.ports.push(serialPort);
                    }
                    FC.SERIAL_CONFIG.mspBaudRate = data.readU32();
                    FC.SERIAL_CONFIG.cliBaudRate = data.readU32();
                    FC.SERIAL_CONFIG.gpsBaudRate = data.readU32();
                    FC.SERIAL_CONFIG.gpsPassthroughBaudRate = data.readU32();
                } else {
                    const bytesPerPort = 1 + 2 + (1 * 4);

                    const serialPortCount = data.byteLength / bytesPerPort;
                    for (let i = 0; i < serialPortCount; i++) {
                        const serialPort = {
                            identifier: data.readU8(),
                            functions: self.serialPortFunctionMaskToFunctions(data.readU16()),
                            msp_baudrate: self.BAUD_RATES[data.readU8()],
                            gps_baudrate: self.BAUD_RATES[data.readU8()],
                            telemetry_baudrate: self.BAUD_RATES[data.readU8()],
                            blackbox_baudrate: self.BAUD_RATES[data.readU8()],
                        };

                        FC.SERIAL_CONFIG.ports.push(serialPort);
                    }
                }
                break;

            case MSPCodes.MSP2_COMMON_SERIAL_CONFIG:
                FC.SERIAL_CONFIG.ports = [];
                const count = data.readU8();
                const portConfigSize = data.remaining() / count;
                for (let ii = 0; ii < count; ii++) {
                    const start = data.remaining();
                    const serialPort = {
                        identifier: data.readU8(),
                        functions: self.serialPortFunctionMaskToFunctions(data.readU32()),
                        msp_baudrate: self.BAUD_RATES[data.readU8()],
                        gps_baudrate: self.BAUD_RATES[data.readU8()],
                        telemetry_baudrate: self.BAUD_RATES[data.readU8()],
                        blackbox_baudrate: self.BAUD_RATES[data.readU8()],
                    };
                    FC.SERIAL_CONFIG.ports.push(serialPort);
                    while(start - data.remaining() < portConfigSize && data.remaining() > 0) {
                        data.readU8();
                    }
                }
                break;

            case MSPCodes.MSP_SET_CF_SERIAL_CONFIG:
                console.log('Serial config saved');
                break;

            case MSPCodes.MSP2_COMMON_SET_SERIAL_CONFIG:
                console.log('Serial config saved (MSPv2)');
                break;

            case MSPCodes.MSP_MODE_RANGES:
                FC.MODE_RANGES = []; // empty the array as new data is coming in

                const modeRangeCount = data.byteLength / 4; // 4 bytes per item.

                for (let i = 0; i < modeRangeCount; i++) {
                    const modeRange = {
                        id: data.readU8(),
                        auxChannelIndex: data.readU8(),
                        range: {
                            start: 900 + (data.readU8() * 25),
                            end: 900 + (data.readU8() * 25),
                        },
                    };
                    FC.MODE_RANGES.push(modeRange);
                }
                break;

            case MSPCodes.MSP_MODE_RANGES_EXTRA:
                FC.MODE_RANGES_EXTRA = []; // empty the array as new data is coming in

                const modeRangeExtraCount = data.readU8();

                for (let i = 0; i < modeRangeExtraCount; i++) {
                    const modeRangeExtra = {
                        id: data.readU8(),
                        modeLogic: data.readU8(),
                        linkedTo: data.readU8(),
                    };
                    FC.MODE_RANGES_EXTRA.push(modeRangeExtra);
                }
                break;

            case MSPCodes.MSP_ADJUSTMENT_RANGES:
                FC.ADJUSTMENT_RANGES = []; // empty the array as new data is coming in

                const adjustmentRangeCount = data.byteLength / 10; // 10 bytes per item.

                for (let i = 0; i < adjustmentRangeCount; i++) {
                    const adjustmentRange = {
                        enaChannel: data.readU8(),
                        enaRange: {
                            start: 900 + (data.readU8() * 25),
                            end: 900 + (data.readU8() * 25),
                        },
                        adjFunction: data.readU8(),
                        adjChannel: data.readU8(),
                        adjStep: data.readU8(),
                        adjMin: data.read16(),
                        adjMax: data.read16(),
                    };
                    FC.ADJUSTMENT_RANGES.push(adjustmentRange);
                }
                break;

            case MSPCodes.MSP_RX_CONFIG:
                FC.RX_CONFIG.serialrx_provider = data.readU8();
                FC.RX_CONFIG.serialrx_inverted = data.readU8();
                FC.RX_CONFIG.serialrx_halfduplex = data.readU8();
                FC.RX_CONFIG.stick_max = data.readU16();
                FC.RX_CONFIG.stick_center = data.readU16();
                FC.RX_CONFIG.stick_min = data.readU16();
                FC.RX_CONFIG.rx_min_usec = data.readU16();
                FC.RX_CONFIG.rx_max_usec = data.readU16();
                FC.RX_CONFIG.rcInterpolation = data.readU8();
                FC.RX_CONFIG.rcInterpolationInterval = data.readU8();
                FC.RX_CONFIG.rcInterpolationChannels = data.readU8();
                FC.RX_CONFIG.rcSmoothingType = data.readU8();
                FC.RX_CONFIG.rcSmoothingInputType = data.readU8();
                FC.RX_CONFIG.rcSmoothingInputCutoff = data.readU8();
                FC.RX_CONFIG.rcSmoothingDerivativeType = data.readU8();
                FC.RX_CONFIG.rcSmoothingDerivativeCutoff = data.readU8();
                FC.RX_CONFIG.rcSmoothingAutoSmoothness = data.readU8();
                FC.RX_CONFIG.rxSpiProtocol = data.readU8();
                FC.RX_CONFIG.rxSpiId = data.readU32();
                FC.RX_CONFIG.rxSpiRfChannelCount = data.readU8();
                break;

            case MSPCodes.MSP_FAILSAFE_CONFIG:
                FC.FAILSAFE_CONFIG.failsafe_delay = data.readU8();
                FC.FAILSAFE_CONFIG.failsafe_off_delay = data.readU8();
                FC.FAILSAFE_CONFIG.failsafe_throttle = data.readU16();
                if (semver.gte(FC.CONFIG.apiVersion, "1.15.0")) {
                    FC.FAILSAFE_CONFIG.failsafe_switch_mode = data.readU8();
                    FC.FAILSAFE_CONFIG.failsafe_throttle_low_delay = data.readU16();
                    FC.FAILSAFE_CONFIG.failsafe_procedure = data.readU8();
                }
                break;

            case MSPCodes.MSP_RXFAIL_CONFIG:
                FC.RXFAIL_CONFIG = []; // empty the array as new data is coming in

                const channelCount = data.byteLength / 3;
                for (let i = 0; i < channelCount; i++) {
                    const rxfailChannel = {
                        mode:  data.readU8(),
                        value: data.readU16(),
                    };
                    FC.RXFAIL_CONFIG.push(rxfailChannel);
                }
                break;

            case MSPCodes.MSP_ADVANCED_CONFIG:
                FC.ADVANCED_CONFIG.pid_process_denom = data.readU8();
                FC.SENSOR_ALIGNMENT.gyro_to_use = data.readU8();
                FC.ADVANCED_CONFIG.gyroHighFsr = data.readU8();
                FC.ADVANCED_CONFIG.gyroMovementCalibThreshold = data.readU8();
                FC.ADVANCED_CONFIG.gyroCalibDuration = data.readU16();
                FC.ADVANCED_CONFIG.gyroOffsetYaw = data.readU16();
                FC.ADVANCED_CONFIG.gyroCheckOverflow = data.readU8();
                break;

            case MSPCodes.MSP_FILTER_CONFIG:
                FC.FILTER_CONFIG.gyro_hardware_lpf = data.readU8();
                FC.FILTER_CONFIG.gyro_lowpass_type = data.readU8();
                FC.FILTER_CONFIG.gyro_lowpass_hz = data.readU16();
                FC.FILTER_CONFIG.gyro_lowpass2_type = data.readU8();
                FC.FILTER_CONFIG.gyro_lowpass2_hz = data.readU16();
                FC.FILTER_CONFIG.gyro_notch_hz = data.readU16();
                FC.FILTER_CONFIG.gyro_notch_cutoff = data.readU16();
                FC.FILTER_CONFIG.gyro_notch2_hz = data.readU16();
                FC.FILTER_CONFIG.gyro_notch2_cutoff = data.readU16();
                FC.FILTER_CONFIG.dterm_lowpass_type = data.readU8();
                FC.FILTER_CONFIG.dterm_lowpass_hz = data.readU16();
                FC.FILTER_CONFIG.dterm_lowpass2_type = data.readU8();
                FC.FILTER_CONFIG.dterm_lowpass2_hz = data.readU16();
                FC.FILTER_CONFIG.dterm_notch_hz = data.readU16();
                FC.FILTER_CONFIG.dterm_notch_cutoff = data.readU16();
                FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz = data.readU16();
                FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz = data.readU16();
                FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz = data.readU16();
                FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz = data.readU16();
                FC.FILTER_CONFIG.dyn_notch_width_percent = data.readU8();
                FC.FILTER_CONFIG.dyn_notch_q = data.readU16();
                FC.FILTER_CONFIG.dyn_notch_min_hz = data.readU16();
                FC.FILTER_CONFIG.dyn_notch_max_hz = data.readU16();
                break;

            case MSPCodes.MSP_SET_PID_ADVANCED:
                console.log("Advanced PID settings saved");
                break;

            case MSPCodes.MSP_PID_ADVANCED:
                FC.PID_PROFILE.itermLimitRoll = data.readU16();
                FC.PID_PROFILE.itermLimitPitch = data.readU16();
                FC.PID_PROFILE.itermLimitYaw = data.readU16();
                FC.PID_PROFILE.itermDecay = data.readU8();
                FC.PID_PROFILE.itermRotation = data.readU8();
                FC.PID_PROFILE.itermRelax = data.readU8();
                FC.PID_PROFILE.itermRelaxType = data.readU8();
                FC.PID_PROFILE.itermRelaxCutoffRoll = data.readU8();
                FC.PID_PROFILE.itermRelaxCutoffPitch = data.readU8();
                FC.PID_PROFILE.itermRelaxCutoffYaw = data.readU8();
                FC.PID_PROFILE.levelAngleStrength = data.readU8();
                FC.PID_PROFILE.levelAngleLimit = data.readU8();
                FC.PID_PROFILE.horizonLevelStrength = data.readU8();
                FC.PID_PROFILE.acroTrainerGain = data.readU8();
                FC.PID_PROFILE.acroTrainerLimit = data.readU8();
                FC.PID_PROFILE.yawCenterOffset = data.readU16();
                FC.PID_PROFILE.yawStopGainCW = data.readU8();
                FC.PID_PROFILE.yawStopGainCCW = data.readU8();
                FC.PID_PROFILE.yawFFCyclicGain = data.readU8();
                FC.PID_PROFILE.yawFFCollectiveGain = data.readU8();
                FC.PID_PROFILE.yawFFImpulseGain = data.readU8();
                FC.PID_PROFILE.yawFFImpulseFreq = data.readU8();
                FC.PID_PROFILE.cyclicNormalization = data.readU8();
                FC.PID_PROFILE.collectiveNormalization = data.readU8();
                FC.PID_PROFILE.rescueCollective = data.readU16();
                FC.PID_PROFILE.rescueBoost = data.readU16();
                FC.PID_PROFILE.rescueDelay = data.readU8();
                FC.GOVERNOR.gov_headspeed = data.readU16();
                FC.GOVERNOR.gov_gain = data.readU8();
                FC.GOVERNOR.gov_p_gain = data.readU8();
                FC.GOVERNOR.gov_i_gain = data.readU8();
                FC.GOVERNOR.gov_d_gain = data.readU8();
                FC.GOVERNOR.gov_f_gain = data.readU8();
                FC.GOVERNOR.gov_tta_gain = data.readU8();
                FC.GOVERNOR.gov_tta_limit = data.readU8();
                FC.GOVERNOR.gov_cyclic_ff_weight = data.readU8();
                FC.GOVERNOR.gov_collective_ff_weight = data.readU8();
                break;

            case MSPCodes.MSP_GOVERNOR:
                FC.GOVERNOR.gov_mode                         = data.readU8();
                FC.GOVERNOR.gov_spoolup_time                 = data.readU16();
                FC.GOVERNOR.gov_tracking_time                = data.readU16();
                FC.GOVERNOR.gov_recovery_time                = data.readU16();
                FC.GOVERNOR.gov_autorotation_timeout         = data.readU16();
                FC.GOVERNOR.gov_autorotation_bailout_time    = data.readU16();
                FC.GOVERNOR.gov_autorotation_min_entry_time  = data.readU16();
                FC.GOVERNOR.gov_lost_throttle_timeout        = data.readU16();
                FC.GOVERNOR.gov_lost_headspeed_timeout       = data.readU16();
                FC.GOVERNOR.gov_gear_ratio                   = data.readU16();
                FC.GOVERNOR.gov_pwr_filter                   = data.readU16();
                FC.GOVERNOR.gov_rpm_filter                   = data.readU16();
                break;

            case MSPCodes.MSP_MIXER_INPUTS:
                FC.MIXER_INPUTS = [];
                const inputCount = data.byteLength / 6;
                for (let i = 0; i < inputCount; i++) {
                    FC.MIXER_INPUTS.push({
                        rate: data.read16(),
                        min:  data.read16(),
                        max:  data.read16(),
                    });
                }
                break;

            case MSPCodes.MSP_MIXER_RULES:
                FC.MIXER_RULES = [];
                const ruleCount = data.byteLength / 11;
                for (let i = 0; i < ruleCount; i++) {
                    FC.MIXER_RULES.push({
                        modes:  data.readU32(),
                        oper:   data.readU8(),
                        src:    data.readU8(),
                        dst:    data.readU8(),
                        offset: data.read16(),
                        weight: data.read16(),
                    });
                }
                break;

            case MSPCodes.MSP_SENSOR_CONFIG:
                FC.SENSOR_CONFIG.acc_hardware = data.readU8();
                FC.SENSOR_CONFIG.baro_hardware = data.readU8();
                FC.SENSOR_CONFIG.mag_hardware = data.readU8();
                break;

            case MSPCodes.MSP_LED_STRIP_CONFIG:
                FC.LED_STRIP = [];

                let ledCount = data.byteLength / 7; // v1.4.0 and below incorrectly reported 4 bytes per led.
                if (semver.gte(FC.CONFIG.apiVersion, "1.20.0")) {
                    ledCount = data.byteLength / 4;
                }
                if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_36)) {
                    ledOverlayLetters = ['t', 'o', 'b', 'n', 'i', 'w']; // in LSB bit
                }
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                    // According to rotorflight/src/main/msp/msp.c
                    // API 1.41 - add indicator for advanced profile support and the current profile selection
                    // 0 = basic ledstrip available
                    // 1 = advanced ledstrip available
                    // Following byte is the current LED profile
                    ledCount = (data.byteLength - 2) / 4;
                }
                for (let i = 0; i < ledCount; i++) {

                    if (semver.lt(FC.CONFIG.apiVersion, "1.20.0")) {
                        const directionMask = data.readU16();

                        const directions = [];
                        for (let directionLetterIndex = 0; directionLetterIndex < ledDirectionLetters.length; directionLetterIndex++) {
                            if (bit_check(directionMask, directionLetterIndex)) {
                                directions.push(ledDirectionLetters[directionLetterIndex]);
                            }
                        }

                        const functionMask = data.readU16();

                        const functions = [];
                        for (let functionLetterIndex = 0; functionLetterIndex < ledFunctionLetters.length; functionLetterIndex++) {
                            if (bit_check(functionMask, functionLetterIndex)) {
                                functions.push(ledFunctionLetters[functionLetterIndex]);
                            }
                        }

                        const led = {
                            directions: directions,
                            functions: functions,
                            x: data.readU8(),
                            y: data.readU8(),
                            color: data.readU8(),
                        };

                        FC.LED_STRIP.push(led);
                    } else {
                        const mask = data.readU32();

                        const functionId = (mask >> 8) & 0xF;
                        const functions = [];
                        for (let baseFunctionLetterIndex = 0; baseFunctionLetterIndex < ledBaseFunctionLetters.length; baseFunctionLetterIndex++) {
                            if (functionId == baseFunctionLetterIndex) {
                                functions.push(ledBaseFunctionLetters[baseFunctionLetterIndex]);
                                break;
                            }
                        }

                        const overlayMask = (mask >> 12) & 0x3F;
                        for (let overlayLetterIndex = 0; overlayLetterIndex < ledOverlayLetters.length; overlayLetterIndex++) {
                            if (bit_check(overlayMask, overlayLetterIndex)) {
                                functions.push(ledOverlayLetters[overlayLetterIndex]);
                            }
                        }

                        const directionMask = (mask >> 22) & 0x3F;
                        const directions = [];
                        for (let directionLetterIndex = 0; directionLetterIndex < ledDirectionLetters.length; directionLetterIndex++) {
                            if (bit_check(directionMask, directionLetterIndex)) {
                                directions.push(ledDirectionLetters[directionLetterIndex]);
                            }
                        }
                        const led = {
                            y: (mask) & 0xF,
                            x: (mask >> 4) & 0xF,
                            functions: functions,
                            color: (mask >> 18) & 0xF,
                            directions: directions,
                            parameters: (mask >> 28) & 0xF,
                        };

                        FC.LED_STRIP.push(led);
                    }
                }
                break;
            case MSPCodes.MSP_SET_LED_STRIP_CONFIG:
                console.log('Led strip config saved');
                break;
            case MSPCodes.MSP_LED_COLORS:

                FC.LED_COLORS = [];

                const ledcolorCount = data.byteLength / 4;

                for (let i = 0; i < ledcolorCount; i++) {

                    const color = {
                        h: data.readU16(),
                        s: data.readU8(),
                        v: data.readU8(),
                    };
                    FC.LED_COLORS.push(color);
                }

                break;
            case MSPCodes.MSP_SET_LED_COLORS:
                console.log('Led strip colors saved');
                break;
            case MSPCodes.MSP_LED_STRIP_MODECOLOR:
                if (semver.gte(FC.CONFIG.apiVersion, "1.19.0")) {

                    FC.LED_MODE_COLORS = [];

                    const colorCount = data.byteLength / 3;

                    for (let i = 0; i < colorCount; i++) {

                        const modeColor = {
                            mode: data.readU8(),
                            direction: data.readU8(),
                            color: data.readU8(),
                        };
                        FC.LED_MODE_COLORS.push(modeColor);
                    }
                }
                break;
            case MSPCodes.MSP_SET_LED_STRIP_MODECOLOR:
                console.log('Led strip mode colors saved');
                break;

            case MSPCodes.MSP_DATAFLASH_SUMMARY:
                if (data.byteLength >= 13) {
                    flags = data.readU8();
                    FC.DATAFLASH.ready = (flags & 1) != 0;
                    FC.DATAFLASH.supported = (flags & 2) != 0;
                    FC.DATAFLASH.sectors = data.readU32();
                    FC.DATAFLASH.totalSize = data.readU32();
                    FC.DATAFLASH.usedSize = data.readU32();
                } else {
                    // Firmware version too old to support MSP_DATAFLASH_SUMMARY
                    FC.DATAFLASH.ready = false;
                    FC.DATAFLASH.supported = false;
                    FC.DATAFLASH.sectors = 0;
                    FC.DATAFLASH.totalSize = 0;
                    FC.DATAFLASH.usedSize = 0;
                }
                update_dataflash_global();
                break;
            case MSPCodes.MSP_DATAFLASH_READ:
                // No-op, let callback handle it
                break;
            case MSPCodes.MSP_DATAFLASH_ERASE:
                console.log("Data flash erase begun...");
                break;
            case MSPCodes.MSP_SDCARD_SUMMARY:
                flags = data.readU8();

                FC.SDCARD.supported = (flags & 0x01) != 0;
                FC.SDCARD.state = data.readU8();
                FC.SDCARD.filesystemLastError = data.readU8();
                FC.SDCARD.freeSizeKB = data.readU32();
                FC.SDCARD.totalSizeKB = data.readU32();
                break;
            case MSPCodes.MSP_BLACKBOX_CONFIG:
                FC.BLACKBOX.supported = (data.readU8() & 1) != 0;
                FC.BLACKBOX.blackboxDevice = data.readU8();
                FC.BLACKBOX.blackboxRateNum = data.readU8();
                FC.BLACKBOX.blackboxRateDenom = data.readU8();
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_36)) {
                    FC.BLACKBOX.blackboxPDenom = data.readU16();
                }
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_44)) {
                    FC.BLACKBOX.blackboxSampleRate = data.readU8();
                }
                break;
            case MSPCodes.MSP_SET_BLACKBOX_CONFIG:
                console.log("Blackbox config saved");
                break;
            case MSPCodes.MSP_TRANSPONDER_CONFIG:
                let bytesRemaining = data.byteLength;
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_33)) {
                    const providerCount = data.readU8();
                    bytesRemaining--;

                    FC.TRANSPONDER.supported = providerCount > 0;
                    FC.TRANSPONDER.providers = [];

                    for (let i = 0; i < providerCount; i++) {
                        const provider = {
                            id: data.readU8(),
                            dataLength: data.readU8(),
                        };
                        bytesRemaining -= 2;

                        FC.TRANSPONDER.providers.push(provider);
                    }
                    FC.TRANSPONDER.provider = data.readU8();
                    bytesRemaining--;

                } else {
                    FC.TRANSPONDER.supported = (data.readU8() & 1) != 0;
                    bytesRemaining--;

                    // only ILAP was supported prior to 1.33.0
                    FC.TRANSPONDER.providers = [{
                        id: 1, // ILAP
                        dataLength: 6,
                    }];
                    FC.TRANSPONDER.provider = FC.TRANSPONDER.providers[0].id;
                }
                FC.TRANSPONDER.data = [];
                for (let i = 0; i < bytesRemaining; i++) {
                    FC.TRANSPONDER.data.push(data.readU8());
                }
                break;

            case MSPCodes.MSP_SET_TRANSPONDER_CONFIG:
                console.log("Transponder config saved");
                break;

            case MSPCodes.MSP_VTX_CONFIG:

                FC.VTX_CONFIG.vtx_type = data.readU8();
                FC.VTX_CONFIG.vtx_band = data.readU8();
                FC.VTX_CONFIG.vtx_channel = data.readU8();
                FC.VTX_CONFIG.vtx_power = data.readU8();
                FC.VTX_CONFIG.vtx_pit_mode = data.readU8() != 0;
                FC.VTX_CONFIG.vtx_frequency = data.readU16();
                FC.VTX_CONFIG.vtx_device_ready = data.readU8() != 0;
                FC.VTX_CONFIG.vtx_low_power_disarm = data.readU8();

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
                    FC.VTX_CONFIG.vtx_pit_mode_frequency = data.readU16();
                    FC.VTX_CONFIG.vtx_table_available = data.readU8() != 0;
                    FC.VTX_CONFIG.vtx_table_bands = data.readU8();
                    FC.VTX_CONFIG.vtx_table_channels = data.readU8();
                    FC.VTX_CONFIG.vtx_table_powerlevels = data.readU8();
                    FC.VTX_CONFIG.vtx_table_clear = false;
                }
                break;

            case MSPCodes.MSP_SET_VTX_CONFIG:
                console.log("VTX config sent");
                break;

            case MSPCodes.MSP_VTXTABLE_BAND:

                FC.VTXTABLE_BAND.vtxtable_band_number = data.readU8();

                const bandNameLength = data.readU8();
                FC.VTXTABLE_BAND.vtxtable_band_name = '';
                for (let i = 0; i < bandNameLength; i++) {
                    FC.VTXTABLE_BAND.vtxtable_band_name += String.fromCharCode(data.readU8());
                }

                FC.VTXTABLE_BAND.vtxtable_band_letter = String.fromCharCode(data.readU8());
                FC.VTXTABLE_BAND.vtxtable_band_is_factory_band = data.readU8() != 0;

                const bandFrequenciesLength = data.readU8();
                FC.VTXTABLE_BAND.vtxtable_band_frequencies = [];
                for (let i = 0; i < bandFrequenciesLength; i++) {
                    FC.VTXTABLE_BAND.vtxtable_band_frequencies.push(data.readU16());
                }

                break;

            case MSPCodes.MSP_SET_VTXTABLE_BAND:
                console.log("VTX band sent");
                break;

            case MSPCodes.MSP_VTXTABLE_POWERLEVEL:

                FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_number = data.readU8();
                FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_value = data.readU16();

                const powerLabelLength = data.readU8();
                FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_label = '';
                for (let i = 0; i < powerLabelLength; i++) {
                    FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_label += String.fromCharCode(data.readU8());
                }

                break;

            case MSPCodes.MSP_SET_TUNING_SLIDERS:
                console.log("Tuning Sliders data sent");
                break;

            case MSPCodes.MSP_TUNING_SLIDERS:
                FC.TUNING_SLIDERS.slider_pids_mode = data.readU8();
                FC.TUNING_SLIDERS.slider_master_multiplier = data.readU8();
                FC.TUNING_SLIDERS.slider_roll_pitch_ratio = data.readU8();
                FC.TUNING_SLIDERS.slider_i_gain = data.readU8();
                FC.TUNING_SLIDERS.slider_pd_ratio = data.readU8();
                FC.TUNING_SLIDERS.slider_pd_gain = data.readU8();
                FC.TUNING_SLIDERS.slider_dmin_ratio = data.readU8();
                FC.TUNING_SLIDERS.slider_ff_gain = data.readU8();
                FC.TUNING_SLIDERS.slider_dterm_filter = data.readU8();
                FC.TUNING_SLIDERS.slider_dterm_filter_multiplier = data.readU8();
                FC.TUNING_SLIDERS.slider_gyro_filter = data.readU8();
                FC.TUNING_SLIDERS.slider_gyro_filter_multiplier = data.readU8();

                break;

            case MSPCodes.MSP_SET_VTXTABLE_POWERLEVEL:
                console.log("VTX powerlevel sent");
                break;
            case MSPCodes.MSP_SET_MODE_RANGE:
                console.log('Mode range saved');
                break;
            case MSPCodes.MSP_SET_ADJUSTMENT_RANGE:
                console.log('Adjustment range saved');
                break;
            case MSPCodes.MSP_SET_BOARD_ALIGNMENT_CONFIG:
                console.log('Board alignment saved');
                break;
            case MSPCodes.MSP_DEBUG_CONFIG:
                FC.DEBUG_CONFIG.debugModeCount = data.readU8();
                FC.DEBUG_CONFIG.debugMode = data.readU8();
                break;
            case MSPCodes.MSP_SET_DEBUG_CONFIG:
                console.log('Debug flags changed');
                break;
            case MSPCodes.MSP_SET_LOOP_TIME:
                console.log('Looptime saved');
                break;
            case MSPCodes.MSP_SET_ARMING_CONFIG:
                console.log('Arming config saved');
                break;
            case MSPCodes.MSP_SET_RESET_CURR_PID:
                console.log('Current PID profile reset');
                break;
            case MSPCodes.MSP_SET_MIXER_CONFIG:
                console.log('Mixer config changed');
                break;
            case MSPCodes.MSP_SET_MIXER_INPUT:
                console.log('Mixer input changed');
                break;
            case MSPCodes.MSP_SET_MIXER_RULE:
                console.log('Mixer rule changed');
                break;
            case MSPCodes.MSP_SET_RC_DEADBAND:
                console.log('Rc controls settings saved');
                break;
            case MSPCodes.MSP_SET_SENSOR_ALIGNMENT:
                console.log('Sensor alignment saved');
                break;
            case MSPCodes.MSP_SET_RX_CONFIG:
                console.log('Rx config saved');
                break;
            case MSPCodes.MSP_SET_RXFAIL_CONFIG:
                console.log('Rxfail config saved');
                break;
            case MSPCodes.MSP_SET_FAILSAFE_CONFIG:
                console.log('Failsafe config saved');
                break;
            case MSPCodes.MSP_OSD_CONFIG:
                break;
            case MSPCodes.MSP_SET_OSD_CONFIG:
                console.log('OSD config set');
                break;
            case MSPCodes.MSP_OSD_CHAR_READ:
                break;
            case MSPCodes.MSP_OSD_CHAR_WRITE:
                console.log('OSD char uploaded');
                break;
            case MSPCodes.MSP_SET_NAME:
                console.log('Name set');
                break;
            case MSPCodes.MSP_SET_FILTER_CONFIG:
                console.log('Filter config set');
                break;
            case MSPCodes.MSP_SET_ADVANCED_CONFIG:
                console.log('Advanced config parameters set');
                break;
            case MSPCodes.MSP_SET_SENSOR_CONFIG:
                console.log('Sensor config parameters set');
                break;
            case MSPCodes.MSP_COPY_PROFILE:
                console.log('Copy profile');
                break;
            case MSPCodes.MSP_ARMING_DISABLE:
                console.log('Arming disable');
                break;
            case MSPCodes.MSP_SET_RTC:
                console.log('Real time clock set');
                break;
            case MSPCodes.MSP2_SET_MOTOR_OUTPUT_REORDERING:
                console.log('Motor output reordering set');
                break;
            case MSPCodes.MSP2_SEND_DSHOT_COMMAND:
                console.log('DSHOT command sent');
                break;

            case MSPCodes.MSP_MULTIPLE_MSP:

                let hasReturnedSomeCommand = false; // To avoid infinite loops

                while (data.offset < data.byteLength) {

                    hasReturnedSomeCommand = true;

                    const command = self.mspMultipleCache.shift();
                    const payloadSize = data.readU8();

                    if (payloadSize != 0) {

                        const currentDataHandler = {
                            code         : command,
                            dataView     : new DataView(data.buffer, data.offset, payloadSize),
                            callbacks    : [],
                        };

                        self.process_data(currentDataHandler);

                        data.offset += payloadSize;
                    }
                }

                if (hasReturnedSomeCommand) {
                    // Send again MSP messages missing, the buffer in the FC was too small
                    if (self.mspMultipleCache.length > 0) {

                        const partialBuffer = [];
                        for (let i = 0; i < self.mspMultipleCache.length; i++) {
                            partialBuffer.push8(self.mspMultipleCache[i]);
                        }

                        MSP.send_message(MSPCodes.MSP_MULTIPLE_MSP, partialBuffer, false, dataHandler.callbacks);
                        dataHandler.callbacks = [];
                    }
                } else {
                    console.log("MSP Multiple can't process the command");
                    self.mspMultipleCache = [];
                }

                break;

            default:
                console.log('Unknown code detected: ' + code);

        } else {
            console.log('FC reports unsupported message error: ' + code);

            if (code === MSPCodes.MSP_SET_REBOOT) {
                TABS.onboard_logging.mscRebootFailedCallback();
            }
        }
    } else {
        console.warn(`code: ${code} - crc failed`);
    }
    // trigger callbacks, cleanup/remove callback after trigger
    for (let i = dataHandler.callbacks.length - 1; i >= 0; i--) { // iterating in reverse because we use .splice which modifies array length
        if (dataHandler.callbacks[i]?.code === code) {
            // save callback reference
            const callback = dataHandler.callbacks[i].callback;
            const callbackOnError = dataHandler.callbacks[i].callbackOnError;

            // remove timeout
            clearInterval(dataHandler.callbacks[i].timer);

            // remove object from array
            dataHandler.callbacks.splice(i, 1);
            if (!crcError || callbackOnError) {
                // fire callback
                if (callback) callback({'command': code, 'data': data, 'length': data.byteLength, 'crcError': crcError});
            } else {
                console.warn(`code: ${code} - crc failed. No callback`);
            }
        }
    }
};

/**
 * Encode the request body for the MSP request with the given code and return it as an array of bytes.
 */
MspHelper.prototype.crunch = function(code) {
    const buffer = [];
    const self = this;

    switch (code) {
        case MSPCodes.MSP_SET_FEATURE_CONFIG:
            const featureMask = FC.FEATURE_CONFIG.features.getMask();
            buffer.push32(featureMask);
            break;
        case MSPCodes.MSP_SET_BEEPER_CONFIG:
            const beeperDisabledMask = FC.BEEPER_CONFIG.beepers.getDisabledMask();
            buffer.push32(beeperDisabledMask);
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_37)) {
                buffer.push8(FC.BEEPER_CONFIG.dshotBeaconTone);
            }
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_39)) {
                buffer.push32(FC.BEEPER_CONFIG.dshotBeaconConditions.getDisabledMask());
            }
            break;
        case MSPCodes.MSP_SET_MIXER_CONFIG:
            buffer.push8(FC.MIXER_CONFIG.main_rotor_dir)
                .push8(FC.MIXER_CONFIG.tail_rotor_mode)
                .push8(FC.MIXER_CONFIG.tail_motor_idle)
                .push8(FC.MIXER_CONFIG.swash_ring);
            break;
        case MSPCodes.MSP_SET_BOARD_ALIGNMENT_CONFIG:
            buffer.push16(FC.BOARD_ALIGNMENT_CONFIG.roll)
                .push16(FC.BOARD_ALIGNMENT_CONFIG.pitch)
                .push16(FC.BOARD_ALIGNMENT_CONFIG.yaw);
            break;
        case MSPCodes.MSP_SET_PID:
            for (let i = 0; i < 3; i++) { // RPY
                for (let j = 0; j < 4; j++) { // PIDF
                    buffer.push8(parseInt(FC.PIDS[i][j]));
                }
            }
            break;
        case MSPCodes.MSP_SET_RC_TUNING:
            buffer.push8(FC.RC_TUNING.rates_type);
            buffer.push8(Math.round(FC.RC_TUNING.RC_RATE * 100))
                  .push8(Math.round(FC.RC_TUNING.RC_EXPO * 100))
                  .push8(Math.round(FC.RC_TUNING.roll_rate * 100))
                  .push16(FC.RC_TUNING.roll_rate_limit);
            buffer.push8(Math.round(FC.RC_TUNING.rcPitchRate * 100))
                  .push8(Math.round(FC.RC_TUNING.RC_PITCH_EXPO * 100))
                  .push8(Math.round(FC.RC_TUNING.pitch_rate * 100))
                  .push16(FC.RC_TUNING.pitch_rate_limit);
            buffer.push8(Math.round(FC.RC_TUNING.rcYawRate * 100))
                  .push8(Math.round(FC.RC_TUNING.yaw_rate * 100))
                  .push8(Math.round(FC.RC_TUNING.RC_YAW_EXPO * 100))
                  .push16(FC.RC_TUNING.yaw_rate_limit);
            break;
        case MSPCodes.MSP_SET_RX_MAP:
            for (let i = 0; i < FC.RC_MAP.length; i++) {
                buffer.push8(FC.RC_MAP[i]);
            }
            break;
        case MSPCodes.MSP_SET_ACC_TRIM:
            buffer.push16(FC.CONFIG.accelerometerTrims[0])
                .push16(FC.CONFIG.accelerometerTrims[1]);
            break;
        case MSPCodes.MSP_SET_DEBUG_CONFIG:
            buffer.push8(FC.DEBUG_CONFIG.debugMode);
            break;
        case MSPCodes.MSP_SET_ARMING_CONFIG:
            buffer.push8(FC.ARMING_CONFIG.auto_disarm_delay);
            break;
        case MSPCodes.MSP_SET_LOOP_TIME:
            buffer.push16(FC.FC_CONFIG.loopTime);
            break;
        case MSPCodes.MSP_SET_MISC:
            buffer.push16(FC.RX_CONFIG.midrc)
                .push16(FC.MOTOR_CONFIG.minthrottle)
                .push16(FC.MOTOR_CONFIG.maxthrottle)
                .push16(FC.MOTOR_CONFIG.mincommand)
                .push16(FC.MISC.failsafe_throttle)
                .push8(FC.GPS_CONFIG.provider)
                .push8(FC.MISC.gps_baudrate)
                .push8(FC.GPS_CONFIG.ublox_sbas)
                .push8(FC.MISC.multiwiicurrentoutput)
                .push8(FC.RSSI_CONFIG.channel)
                .push8(FC.MISC.placeholder2)
                .push16(0) // was mag_declination
                .push8(FC.MISC.vbatscale)
                .push8(Math.round(FC.MISC.vbatmincellvoltage * 10))
                .push8(Math.round(FC.MISC.vbatmaxcellvoltage * 10))
                .push8(Math.round(FC.MISC.vbatwarningcellvoltage * 10));
            break;
        case MSPCodes.MSP_SET_MOTOR_CONFIG:
            buffer.push16(FC.MOTOR_CONFIG.mincommand)
                .push16(FC.MOTOR_CONFIG.minthrottle)
                .push16(FC.MOTOR_CONFIG.maxthrottle)
                .push8(FC.MOTOR_CONFIG.motor_pwm_protocol)
                .push16(FC.MOTOR_CONFIG.motor_pwm_rate)
                .push8(FC.MOTOR_CONFIG.use_unsynced_pwm ? 1 : 0)
                .push8(FC.MOTOR_CONFIG.use_pwm_inversion ? 1 : 0)
                .push8(FC.MOTOR_CONFIG.use_dshot_telemetry ? 1 : 0)
                .push8(FC.MOTOR_CONFIG.motor_poles[0])
                .push8(FC.MOTOR_CONFIG.motor_poles[1])
                .push8(FC.MOTOR_CONFIG.motor_poles[2])
                .push8(FC.MOTOR_CONFIG.motor_poles[3]);
            break;
        case MSPCodes.MSP_SET_GPS_CONFIG:
            buffer.push8(FC.GPS_CONFIG.provider)
                .push8(FC.GPS_CONFIG.ublox_sbas);
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_34)) {
                buffer.push8(FC.GPS_CONFIG.auto_config)
                    .push8(FC.GPS_CONFIG.auto_baud);

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
                    buffer.push8(FC.GPS_CONFIG.home_point_once)
                          .push8(FC.GPS_CONFIG.ublox_use_galileo);
                }
            }
            break;
        case MSPCodes.MSP_SET_GPS_RESCUE:
            buffer.push16(FC.GPS_RESCUE.angle)
                  .push16(FC.GPS_RESCUE.initialAltitudeM)
                  .push16(FC.GPS_RESCUE.descentDistanceM)
                  .push16(FC.GPS_RESCUE.rescueGroundspeed)
                  .push16(FC.GPS_RESCUE.throttleMin)
                  .push16(FC.GPS_RESCUE.throttleMax)
                  .push16(FC.GPS_RESCUE.throttleHover)
                  .push8(FC.GPS_RESCUE.sanityChecks)
                  .push8(FC.GPS_RESCUE.minSats);

                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
                    buffer.push16(FC.GPS_RESCUE.ascendRate)
                          .push16(FC.GPS_RESCUE.descendRate)
                          .push8(FC.GPS_RESCUE.allowArmingWithoutFix)
                          .push8(FC.GPS_RESCUE.altitudeMode);
                }
            break;
        case MSPCodes.MSP_SET_RSSI_CONFIG:
            buffer.push8(FC.RSSI_CONFIG.channel)
                  .push8(FC.RSSI_CONFIG.scale)
                  .push8(FC.RSSI_CONFIG.invert)
                  .push8(FC.RSSI_CONFIG.offset);
            break;
        case MSPCodes.MSP_SET_BATTERY_CONFIG:
            buffer.push8(Math.round(FC.BATTERY_CONFIG.vbatmincellvoltage * 10))
                .push8(Math.round(FC.BATTERY_CONFIG.vbatmaxcellvoltage * 10))
                .push8(Math.round(FC.BATTERY_CONFIG.vbatwarningcellvoltage * 10))
                .push16(FC.BATTERY_CONFIG.capacity)
                .push8(FC.BATTERY_CONFIG.voltageMeterSource)
                .push8(FC.BATTERY_CONFIG.currentMeterSource);
                if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                    buffer.push16(Math.round(FC.BATTERY_CONFIG.vbatmincellvoltage * 100))
                        .push16(Math.round(FC.BATTERY_CONFIG.vbatmaxcellvoltage * 100))
                        .push16(Math.round(FC.BATTERY_CONFIG.vbatwarningcellvoltage * 100));
                }
            break;
        case MSPCodes.MSP_SET_VOLTAGE_METER_CONFIG:
            if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_36)) {
                buffer.push8(FC.MISC.vbatscale)
                    .push8(Math.round(FC.MISC.vbatmincellvoltage * 10))
                    .push8(Math.round(FC.MISC.vbatmaxcellvoltage * 10))
                    .push8(Math.round(FC.MISC.vbatwarningcellvoltage * 10));
                    if (semver.gte(FC.CONFIG.apiVersion, "1.23.0")) {
                        buffer.push8(FC.MISC.batterymetertype);
                    }
            }
           break;
        case MSPCodes.MSP_SET_CURRENT_METER_CONFIG:
            if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_36))  {
                buffer.push16(FC.BF_CONFIG.currentscale)
                    .push16(FC.BF_CONFIG.currentoffset)
                    .push8(FC.BF_CONFIG.currentmetertype)
                    .push16(FC.BF_CONFIG.batterycapacity);
            }
            break;

        case MSPCodes.MSP_SET_RX_CONFIG:
            buffer.push8(FC.RX_CONFIG.serialrx_provider)
                  .push8(FC.RX_CONFIG.serialrx_inverted)
                  .push8(FC.RX_CONFIG.serialrx_halfduplex)
                  .push16(FC.RX_CONFIG.stick_max)
                  .push16(FC.RX_CONFIG.stick_center)
                  .push16(FC.RX_CONFIG.stick_min)
                  .push16(FC.RX_CONFIG.rx_min_usec)
                  .push16(FC.RX_CONFIG.rx_max_usec)
                  .push8(FC.RX_CONFIG.rcInterpolation)
                  .push8(FC.RX_CONFIG.rcInterpolationInterval)
                  .push8(FC.RX_CONFIG.rcInterpolationChannels)
                  .push8(FC.RX_CONFIG.rcSmoothingType)
                  .push8(FC.RX_CONFIG.rcSmoothingInputType)
                  .push8(FC.RX_CONFIG.rcSmoothingInputCutoff)
                  .push8(FC.RX_CONFIG.rcSmoothingDerivativeType)
                  .push8(FC.RX_CONFIG.rcSmoothingDerivativeCutoff)
                  .push8(FC.RX_CONFIG.rcSmoothingAutoSmoothness)
                  .push8(FC.RX_CONFIG.rxSpiProtocol)
                  .push32(FC.RX_CONFIG.rxSpiId)
                  .push8(FC.RX_CONFIG.rxSpiRfChannelCount);
            break;

        case MSPCodes.MSP_SET_FAILSAFE_CONFIG:
            buffer.push8(FC.FAILSAFE_CONFIG.failsafe_delay)
                .push8(FC.FAILSAFE_CONFIG.failsafe_off_delay)
                .push16(FC.FAILSAFE_CONFIG.failsafe_throttle);
            if (semver.gte(FC.CONFIG.apiVersion, "1.15.0")) {
                buffer.push8(FC.FAILSAFE_CONFIG.failsafe_switch_mode)
                    .push16(FC.FAILSAFE_CONFIG.failsafe_throttle_low_delay)
                    .push8(FC.FAILSAFE_CONFIG.failsafe_procedure);
            }
            break;

        case MSPCodes.MSP_SET_TRANSPONDER_CONFIG:
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_33)) {
                buffer.push8(FC.TRANSPONDER.provider); //
            }
            for (let i = 0; i < FC.TRANSPONDER.data.length; i++) {
                buffer.push8(FC.TRANSPONDER.data[i]);
            }
            break;

        case MSPCodes.MSP_SET_CHANNEL_FORWARDING:
            break;

        case MSPCodes.MSP_SET_CF_SERIAL_CONFIG:
            if (semver.lt(FC.CONFIG.apiVersion, "1.6.0")) {

                for (let i = 0; i < FC.SERIAL_CONFIG.ports.length; i++) {
                    buffer.push8(FC.SERIAL_CONFIG.ports[i].scenario);
                }
                buffer.push32(FC.SERIAL_CONFIG.mspBaudRate)
                    .push32(FC.SERIAL_CONFIG.cliBaudRate)
                    .push32(FC.SERIAL_CONFIG.gpsBaudRate)
                    .push32(FC.SERIAL_CONFIG.gpsPassthroughBaudRate);
            } else {
                for (let i = 0; i < FC.SERIAL_CONFIG.ports.length; i++) {
                    const serialPort = FC.SERIAL_CONFIG.ports[i];

                    buffer.push8(serialPort.identifier);

                    const functionMask = self.serialPortFunctionsToMask(serialPort.functions);
                    buffer.push16(functionMask)
                        .push8(self.BAUD_RATES.indexOf(serialPort.msp_baudrate))
                        .push8(self.BAUD_RATES.indexOf(serialPort.gps_baudrate))
                        .push8(self.BAUD_RATES.indexOf(serialPort.telemetry_baudrate))
                        .push8(self.BAUD_RATES.indexOf(serialPort.blackbox_baudrate));
                }
            }
            break;

        case MSPCodes.MSP2_COMMON_SET_SERIAL_CONFIG:
            buffer.push8(FC.SERIAL_CONFIG.ports.length);

            for (let i = 0; i < FC.SERIAL_CONFIG.ports.length; i++) {
                const serialPort = FC.SERIAL_CONFIG.ports[i];

                buffer.push8(serialPort.identifier);

                const functionMask = self.serialPortFunctionsToMask(serialPort.functions);
                buffer.push32(functionMask)
                    .push8(self.BAUD_RATES.indexOf(serialPort.msp_baudrate))
                    .push8(self.BAUD_RATES.indexOf(serialPort.gps_baudrate))
                    .push8(self.BAUD_RATES.indexOf(serialPort.telemetry_baudrate))
                    .push8(self.BAUD_RATES.indexOf(serialPort.blackbox_baudrate));
            }
            break;

        case MSPCodes.MSP_SET_RC_DEADBAND:
            buffer.push8(FC.RC_DEADBAND_CONFIG.deadband)
                .push8(FC.RC_DEADBAND_CONFIG.yaw_deadband)
                .push8(FC.RC_DEADBAND_CONFIG.alt_hold_deadband);
            if (semver.gte(FC.CONFIG.apiVersion, "1.17.0")) {
                buffer.push16(FC.RC_DEADBAND_CONFIG.deadband3d_throttle);
            }
            break;

        case MSPCodes.MSP_SET_SENSOR_ALIGNMENT:
            buffer.push8(FC.SENSOR_ALIGNMENT.align_gyro)
                .push8(FC.SENSOR_ALIGNMENT.align_acc)
                .push8(FC.SENSOR_ALIGNMENT.align_mag);
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                buffer.push8(FC.SENSOR_ALIGNMENT.gyro_to_use)
                .push8(FC.SENSOR_ALIGNMENT.gyro_1_align)
                .push8(FC.SENSOR_ALIGNMENT.gyro_2_align);
            }
            break;

    case MSPCodes.MSP_SET_ADVANCED_CONFIG:
            buffer.push8(FC.ADVANCED_CONFIG.pid_process_denom)
                .push8(FC.SENSOR_ALIGNMENT.gyro_to_use)
                .push8(FC.ADVANCED_CONFIG.gyroHighFsr)
                .push8(FC.ADVANCED_CONFIG.gyroMovementCalibThreshold)
                .push16(FC.ADVANCED_CONFIG.gyroCalibDuration)
                .push16(FC.ADVANCED_CONFIG.gyroOffsetYaw)
                .push8(FC.ADVANCED_CONFIG.gyroCheckOverflow);
            break;

        case MSPCodes.MSP_SET_FILTER_CONFIG:
            buffer.push8(FC.FILTER_CONFIG.gyro_hardware_lpf)
                .push8(FC.FILTER_CONFIG.gyro_lowpass_type)
                .push16(FC.FILTER_CONFIG.gyro_lowpass_hz)
                .push8(FC.FILTER_CONFIG.gyro_lowpass2_type)
                .push16(FC.FILTER_CONFIG.gyro_lowpass2_hz)
                .push16(FC.FILTER_CONFIG.gyro_notch_hz)
                .push16(FC.FILTER_CONFIG.gyro_notch_cutoff)
                .push16(FC.FILTER_CONFIG.gyro_notch2_hz)
                .push16(FC.FILTER_CONFIG.gyro_notch2_cutoff)
                .push8(FC.FILTER_CONFIG.dterm_lowpass_type)
                .push16(FC.FILTER_CONFIG.dterm_lowpass_hz)
                .push8(FC.FILTER_CONFIG.dterm_lowpass2_type)
                .push16(FC.FILTER_CONFIG.dterm_lowpass2_hz)
                .push16(FC.FILTER_CONFIG.dterm_notch_hz)
                .push16(FC.FILTER_CONFIG.dterm_notch_cutoff)
                .push16(FC.FILTER_CONFIG.gyro_lowpass_dyn_min_hz)
                .push16(FC.FILTER_CONFIG.gyro_lowpass_dyn_max_hz)
                .push16(FC.FILTER_CONFIG.dterm_lowpass_dyn_min_hz)
                .push16(FC.FILTER_CONFIG.dterm_lowpass_dyn_max_hz)
                .push8(FC.FILTER_CONFIG.dyn_notch_width_percent)
                .push16(FC.FILTER_CONFIG.dyn_notch_q)
                .push16(FC.FILTER_CONFIG.dyn_notch_min_hz)
                .push16(FC.FILTER_CONFIG.dyn_notch_max_hz);
            break;

        case MSPCodes.MSP_SET_PID_ADVANCED:
            buffer.push16(FC.PID_PROFILE.itermLimitRoll)
                .push16(FC.PID_PROFILE.itermLimitPitch)
                .push16(FC.PID_PROFILE.itermLimitYaw)
                .push8(FC.PID_PROFILE.itermDecay)
                .push8(FC.PID_PROFILE.itermRotation)
                .push8(FC.PID_PROFILE.itermRelax)
                .push8(FC.PID_PROFILE.itermRelaxType)
                .push8(FC.PID_PROFILE.itermRelaxCutoffRoll)
                .push8(FC.PID_PROFILE.itermRelaxCutoffPitch)
                .push8(FC.PID_PROFILE.itermRelaxCutoffYaw)
                .push8(FC.PID_PROFILE.levelAngleStrength)
                .push8(FC.PID_PROFILE.levelAngleLimit)
                .push8(FC.PID_PROFILE.horizonLevelStrength)
                .push8(FC.PID_PROFILE.acroTrainerGain)
                .push8(FC.PID_PROFILE.acroTrainerLimit)
                .push16(FC.PID_PROFILE.yawCenterOffset)
                .push8(FC.PID_PROFILE.yawStopGainCW)
                .push8(FC.PID_PROFILE.yawStopGainCCW)
                .push8(FC.PID_PROFILE.yawFFCyclicGain)
                .push8(FC.PID_PROFILE.yawFFCollectiveGain)
                .push8(FC.PID_PROFILE.yawFFImpulseGain)
                .push8(FC.PID_PROFILE.yawFFImpulseFreq)
                .push8(FC.PID_PROFILE.cyclicNormalization)
                .push8(FC.PID_PROFILE.collectiveNormalization)
                .push16(FC.PID_PROFILE.rescueCollective)
                .push16(FC.PID_PROFILE.rescueBoost)
                .push8(FC.PID_PROFILE.rescueDelay)
                .push16(FC.GOVERNOR.gov_headspeed)
                .push8(FC.GOVERNOR.gov_gain)
                .push8(FC.GOVERNOR.gov_p_gain)
                .push8(FC.GOVERNOR.gov_i_gain)
                .push8(FC.GOVERNOR.gov_d_gain)
                .push8(FC.GOVERNOR.gov_f_gain)
                .push8(FC.GOVERNOR.gov_tta_gain)
                .push8(FC.GOVERNOR.gov_tta_limit)
                .push8(FC.GOVERNOR.gov_cyclic_ff_weight)
                .push8(FC.GOVERNOR.gov_collective_ff_weight);
           break;

        case MSPCodes.MSP_SET_GOVERNOR:
            buffer.push8(FC.GOVERNOR.gov_mode)
                .push16(FC.GOVERNOR.gov_spoolup_time)
                .push16(FC.GOVERNOR.gov_tracking_time)
                .push16(FC.GOVERNOR.gov_recovery_time)
                .push16(FC.GOVERNOR.gov_autorotation_timeout)
                .push16(FC.GOVERNOR.gov_autorotation_bailout_time)
                .push16(FC.GOVERNOR.gov_autorotation_min_entry_time)
                .push16(FC.GOVERNOR.gov_lost_throttle_timeout)
                .push16(FC.GOVERNOR.gov_lost_headspeed_timeout)
                .push16(FC.GOVERNOR.gov_gear_ratio)
                .push16(FC.GOVERNOR.gov_pwr_filter)
            .push16(FC.GOVERNOR.gov_rpm_filter);
            break;

        case MSPCodes.MSP_SET_SENSOR_CONFIG:
            buffer.push8(FC.SENSOR_CONFIG.acc_hardware)
                .push8(FC.SENSOR_CONFIG.baro_hardware)
                .push8(FC.SENSOR_CONFIG.mag_hardware);
            break;

        case MSPCodes.MSP_SET_NAME:
            const MSP_BUFFER_SIZE = 64;
            for (let i = 0; i<FC.CONFIG.name.length && i<MSP_BUFFER_SIZE; i++) {
                buffer.push8(FC.CONFIG.name.charCodeAt(i));
            }
            break;

        case MSPCodes.MSP_SET_BLACKBOX_CONFIG:
            buffer.push8(FC.BLACKBOX.blackboxDevice)
                .push8(FC.BLACKBOX.blackboxRateNum)
                .push8(FC.BLACKBOX.blackboxRateDenom);
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_36)) {
                buffer.push16(FC.BLACKBOX.blackboxPDenom);
            }
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_44)) {
                buffer.push8(FC.BLACKBOX.blackboxSampleRate);
            }
            break;

        case MSPCodes.MSP_COPY_PROFILE:
            buffer.push8(FC.COPY_PROFILE.type)
                .push8(FC.COPY_PROFILE.dstProfile)
                .push8(FC.COPY_PROFILE.srcProfile);
            break;

        case MSPCodes.MSP_ARMING_DISABLE:
            buffer.push8(FC.CONFIG.armingDisabled ? 1 : 0);
            break;

        case MSPCodes.MSP_SET_RTC:
            const now = new Date();

            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
                const timestamp = now.getTime();
                const secs = timestamp / 1000;
                const millis = timestamp % 1000;
                buffer.push32(secs);
                buffer.push16(millis);
            } else {
                buffer.push16(now.getUTCFullYear());
                buffer.push8(now.getUTCMonth() + 1);
                buffer.push8(now.getUTCDate());
                buffer.push8(now.getUTCHours());
                buffer.push8(now.getUTCMinutes());
                buffer.push8(now.getUTCSeconds());
            }

            break;

        case MSPCodes.MSP_SET_VTX_CONFIG:

            buffer.push16(FC.VTX_CONFIG.vtx_frequency)
                  .push8(FC.VTX_CONFIG.vtx_power)
                  .push8(FC.VTX_CONFIG.vtx_pit_mode ? 1 : 0)
                  .push8(FC.VTX_CONFIG.vtx_low_power_disarm);

            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_42)) {
                buffer.push16(FC.VTX_CONFIG.vtx_pit_mode_frequency)
                      .push8(FC.VTX_CONFIG.vtx_band)
                      .push8(FC.VTX_CONFIG.vtx_channel)
                      .push16(FC.VTX_CONFIG.vtx_frequency)
                      .push8(FC.VTX_CONFIG.vtx_table_bands)
                      .push8(FC.VTX_CONFIG.vtx_table_channels)
                      .push8(FC.VTX_CONFIG.vtx_table_powerlevels)
                      .push8(FC.VTX_CONFIG.vtx_table_clear ? 1 : 0);
            }

            break;

        case MSPCodes.MSP_SET_VTXTABLE_POWERLEVEL:

            buffer.push8(FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_number)
                  .push16(FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_value);

            buffer.push8(FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_label.length);
            for (let i = 0; i < FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_label.length; i++) {
                buffer.push8(FC.VTXTABLE_POWERLEVEL.vtxtable_powerlevel_label.charCodeAt(i));
            }

            break;

        case MSPCodes.MSP_SET_VTXTABLE_BAND:

            buffer.push8(FC.VTXTABLE_BAND.vtxtable_band_number);

            buffer.push8(FC.VTXTABLE_BAND.vtxtable_band_name.length);
            for (let i = 0; i < FC.VTXTABLE_BAND.vtxtable_band_name.length; i++) {
                buffer.push8(FC.VTXTABLE_BAND.vtxtable_band_name.charCodeAt(i));
            }

            if (FC.VTXTABLE_BAND.vtxtable_band_letter != '') {
                buffer.push8(FC.VTXTABLE_BAND.vtxtable_band_letter.charCodeAt(0));
            } else {
                buffer.push8(' '.charCodeAt(0));
            }
            buffer.push8(FC.VTXTABLE_BAND.vtxtable_band_is_factory_band ? 1 : 0);

            buffer.push8(FC.VTXTABLE_BAND.vtxtable_band_frequencies.length);
            for (let i = 0; i < FC.VTXTABLE_BAND.vtxtable_band_frequencies.length; i++) {
                buffer.push16(FC.VTXTABLE_BAND.vtxtable_band_frequencies[i]);
            }

            break;

        case MSPCodes.MSP_MULTIPLE_MSP:

            while (FC.MULTIPLE_MSP.msp_commands.length > 0) {
                const mspCommand = FC.MULTIPLE_MSP.msp_commands.shift();
                self.mspMultipleCache.push(mspCommand);
                buffer.push8(mspCommand);
            }

            break;

        case MSPCodes.MSP2_SET_MOTOR_OUTPUT_REORDERING:

            buffer.push8(FC.MOTOR_OUTPUT_ORDER.length);
            for (let i = 0; i < FC.MOTOR_OUTPUT_ORDER.length; i++) {
                buffer.push8(FC.MOTOR_OUTPUT_ORDER[i]);
            }

            break;

        case MSPCodes.MSP2_SEND_DSHOT_COMMAND:
            buffer.push8(1);
            break;

        case MSPCodes.MSP_SET_TUNING_SLIDERS:
            buffer.push8(FC.TUNING_SLIDERS.slider_pids_mode)
                  .push8(FC.TUNING_SLIDERS.slider_master_multiplier)
                  .push8(FC.TUNING_SLIDERS.slider_roll_pitch_ratio)
                  .push8(FC.TUNING_SLIDERS.slider_i_gain)
                  .push8(FC.TUNING_SLIDERS.slider_pd_ratio)
                  .push8(FC.TUNING_SLIDERS.slider_pd_gain)
                  .push8(FC.TUNING_SLIDERS.slider_dmin_ratio)
                  .push8(FC.TUNING_SLIDERS.slider_ff_gain)
                  .push8(FC.TUNING_SLIDERS.slider_dterm_filter)
                  .push8(FC.TUNING_SLIDERS.slider_dterm_filter_multiplier)
                  .push8(FC.TUNING_SLIDERS.slider_gyro_filter)
                  .push8(FC.TUNING_SLIDERS.slider_gyro_filter_multiplier);

            break;

        default:
            return false;
    }

    return buffer;
};

/**
 * Set raw Rx values over MSP protocol.
 *
 * Channels is an array of 16-bit unsigned integer channel values to be sent. 8 channels is probably the maximum.
 */
MspHelper.prototype.setRawRx = function(channels) {
    const buffer = [];

    for (let i = 0; i < channels.length; i++) {
        buffer.push16(channels[i]);
    }

    MSP.send_message(MSPCodes.MSP_SET_RAW_RC, buffer, false);
};

/**
 * Send a request to read a block of data from the dataflash at the given address and pass that address and a dataview
 * of the returned data to the given callback (or null for the data if an error occured).
 */
MspHelper.prototype.dataflashRead = function(address, blockSize, onDataCallback) {
    let outData = [address & 0xFF, (address >> 8) & 0xFF, (address >> 16) & 0xFF, (address >> 24) & 0xFF];

    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_31)) {
        outData = outData.concat([blockSize & 0xFF, (blockSize >> 8) & 0xFF]);
    }

    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_36)) {
        // Allow compression
        outData = outData.concat([1]);
    }

    MSP.send_message(MSPCodes.MSP_DATAFLASH_READ, outData, false, function(response) {
        if (!response.crcError) {
            const chunkAddress = response.data.readU32();

            let headerSize = 4;
            let dataSize = response.data.buffer.byteLength - headerSize;
            let dataCompressionType = 0;
            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_31)) {
                headerSize = headerSize + 3;
                dataSize = response.data.readU16();
                dataCompressionType = response.data.readU8();
            }

            // Verify that the address of the memory returned matches what the caller asked for and there was not a CRC error
            if (chunkAddress == address) {
                /* Strip that address off the front of the reply and deliver it separately so the caller doesn't have to
                 * figure out the reply format:
                 */
                if (dataCompressionType == 0) {
                    onDataCallback(address, new DataView(response.data.buffer, response.data.byteOffset + headerSize, dataSize));
                } else if (dataCompressionType == 1) {
                    // Read compressed char count to avoid decoding stray bit sequences as bytes
                    const compressedCharCount = response.data.readU16();

                    // Compressed format uses 2 additional bytes as a pseudo-header to denote the number of uncompressed bytes
                    const compressedArray = new Uint8Array(response.data.buffer, response.data.byteOffset + headerSize + 2, dataSize - 2);
                    const decompressedArray = huffmanDecodeBuf(compressedArray, compressedCharCount, defaultHuffmanTree, defaultHuffmanLenIndex);

                    onDataCallback(address, new DataView(decompressedArray.buffer), dataSize);
                }
            } else {
                // Report address error
                console.log('Expected address ' + address + ' but received ' + chunkAddress + ' - retrying');
                onDataCallback(address, null);  // returning null to the callback forces a retry
            }
        } else {
            // Report crc error
            console.log('CRC error for address ' + address + ' - retrying');
            onDataCallback(address, null);  // returning null to the callback forces a retry
        }
    }, true);
};

MspHelper.prototype.sendMotorOverride = function(motorIndex, onCompleteCallback)
{
    const value = FC.MOTOR_OVERRIDE[motorIndex];
    const buffer = [];

    buffer.push8(motorIndex)
          .push16(value);

    MSP.send_message(MSPCodes.MSP_SET_MOTOR_OVERRIDE, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendMotorOverrides = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.MOTOR_OVERRIDE.length)
            self.sendMotorOverride(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendServoOverride = function(servoIndex, onCompleteCallback)
{
    const value = FC.SERVO_OVERRIDE[servoIndex];
    const buffer = [];

    buffer.push8(servoIndex)
          .push16(value);

    MSP.send_message(MSPCodes.MSP_SET_SERVO_OVERRIDE, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendServoOverrides = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.SERVO_OVERRIDE.length)
            self.sendServoOverride(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendServoConfig = function(servoIndex, onCompleteCallback)
{
    const CONFIG = FC.SERVO_CONFIG[servoIndex];
    const buffer = [];

    buffer.push8(servoIndex)
          .push16(CONFIG.mid)
          .push16(CONFIG.min)
          .push16(CONFIG.max)
          .push16(CONFIG.rate)
          .push16(CONFIG.trim)
          .push16(CONFIG.speed);

    MSP.send_message(MSPCodes.MSP_SET_SERVO_CONFIGURATION, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendServoConfigurations = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.SERVO_CONFIG.length)
            self.sendServoConfig(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendMixerInput = function(inputIndex, onCompleteCallback)
{
    const input = FC.MIXER_INPUTS[inputIndex];
    const buffer = [];

    buffer.push8(inputIndex)
          .push16(input.rate)
          .push16(input.min)
          .push16(input.max);

    MSP.send_message(MSPCodes.MSP_SET_MIXER_INPUT, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendMixerInputs = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.MIXER_INPUTS.length)
            self.sendMixerInput(index++, send_next);
        else
            onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendMixerRule = function(ruleIndex, onCompleteCallback)
{
    const rule = FC.MIXER_RULES[ruleIndex];
    const buffer = [];

    buffer.push8(ruleIndex)
          .push32(rule.modes)
          .push8(rule.oper)
          .push8(rule.src)
          .push8(rule.dst)
          .push16(rule.offset)
          .push16(rule.weight);

    MSP.send_message(MSPCodes.MSP_SET_MIXER_RULE, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendMixerRules = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.MIXER_RULES.length)
            self.sendMixerRule(index++, send_next);
        else
            onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendModeRange = function(modeRangeIndex, onCompleteCallback)
{
    const modeRange = FC.MODE_RANGES[modeRangeIndex];
    const buffer = [];

    buffer.push8(modeRangeIndex)
          .push8(modeRange.id)
          .push8(modeRange.auxChannelIndex)
          .push8((modeRange.range.start - 900) / 25)
          .push8((modeRange.range.end - 900) / 25);

    if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
        const modeRangeExtra = FC.MODE_RANGES_EXTRA[modeRangeIndex];
        buffer.push8(modeRangeExtra.modeLogic)
              .push8(modeRangeExtra.linkedTo);
    }

    MSP.send_message(MSPCodes.MSP_SET_MODE_RANGE, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendModeRanges = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.MODE_RANGES.length)
            self.sendModeRange(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendAdjustmentRange = function(adjustmentRangeIndex, onCompleteCallback)
{
    const adjustmentRange = FC.ADJUSTMENT_RANGES[adjustmentRangeIndex];
    const buffer = [];

    buffer.push8(adjustmentRangeIndex)
          .push8(adjustmentRange.enaChannel)
          .push8((adjustmentRange.enaRange.start - 900) / 25)
          .push8((adjustmentRange.enaRange.end - 900) / 25)
          .push8(adjustmentRange.adjFunction)
          .push8(adjustmentRange.adjChannel)
          .push8(adjustmentRange.adjStep)
          .push16(adjustmentRange.adjMin)
          .push16(adjustmentRange.adjMax);

    MSP.send_message(MSPCodes.MSP_SET_ADJUSTMENT_RANGE, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendAdjustmentRanges = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.ADJUSTMENT_RANGES.length)
            self.sendAdjustmentRange(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendVoltageMeterConfig = function(configIndex, onCompleteCallback)
{
    const config = FC.VOLTAGE_METER_CONFIGS[configIndex];
    const buffer = [];

    buffer.push8(config.id)
          .push8(config.vbatscale)
          .push8(config.vbatresdivval)
          .push8(config.vbatresdivmultiplier);

    MSP.send_message(MSPCodes.MSP_SET_VOLTAGE_METER_CONFIG, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendVoltageConfig = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.VOLTAGE_METER_CONFIGS.length)
            self.sendVoltageMeterConfig(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendCurrentMeterConfig = function(configIndex, onCompleteCallback)
{
    const config = FC.CURRENT_METER_CONFIGS[configIndex];
    const buffer = [];

    buffer.push8(config.id)
          .push16(config.scale)
          .push16(config.offset);

    MSP.send_message(MSPCodes.MSP_SET_CURRENT_METER_CONFIG, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendCurrentConfig = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.CURRENT_METER_CONFIGS.length)
            self.sendCurrentMeterConfig(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendLedConfig = function(ledIndex, onCompleteCallback)
{
    const led = FC.LED_STRIP[ledIndex];
    const buffer = [];

    buffer.push(ledIndex);

    if (semver.lt(FC.CONFIG.apiVersion, API_VERSION_1_36)) {
        ledOverlayLetters = ['t', 'o', 'b', 'n', 'i', 'w']; // in LSB bit
    }

    if (semver.lt(FC.CONFIG.apiVersion, "1.20.0")) {
        let directionMask = 0;
        for (let directionLetterIndex = 0; directionLetterIndex < led.directions.length; directionLetterIndex++) {
            const bitIndex = ledDirectionLetters.indexOf(led.directions[directionLetterIndex]);
            if (bitIndex >= 0) {
                directionMask = bit_set(directionMask, bitIndex);
            }
        }
        buffer.push16(directionMask);

        let functionMask = 0;
        for (let functionLetterIndex = 0; functionLetterIndex < led.functions.length; functionLetterIndex++) {
            const bitIndex = ledFunctionLetters.indexOf(led.functions[functionLetterIndex]);
            if (bitIndex >= 0) {
                functionMask = bit_set(functionMask, bitIndex);
            }
        }
        buffer.push16(functionMask)

            .push8(led.x)
            .push8(led.y)
            .push8(led.color);
    } else {
        let mask = 0;

        mask |= (led.y << 0);
        mask |= (led.x << 4);

        for (let functionLetterIndex = 0; functionLetterIndex < led.functions.length; functionLetterIndex++) {
            const fnIndex = ledBaseFunctionLetters.indexOf(led.functions[functionLetterIndex]);
            if (fnIndex >= 0) {
                mask |= (fnIndex << 8);
                break;
            }
        }

        for (let overlayLetterIndex = 0; overlayLetterIndex < led.functions.length; overlayLetterIndex++) {
            const bitIndex = ledOverlayLetters.indexOf(led.functions[overlayLetterIndex]);
            if (bitIndex >= 0) {
                mask |= bit_set(mask, bitIndex + 12);
            }
        }

        mask |= (led.color << 18);

        for (let directionLetterIndex = 0; directionLetterIndex < led.directions.length; directionLetterIndex++) {
            const bitIndex = ledDirectionLetters.indexOf(led.directions[directionLetterIndex]);
            if (bitIndex >= 0) {
                mask |= bit_set(mask, bitIndex + 22);
            }
        }

        mask |= (0 << 28); // parameters

        buffer.push32(mask);
    }

    MSP.send_message(MSPCodes.MSP_SET_LED_STRIP_CONFIG, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendLedStripConfig = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.LED_STRIP.length)
            self.sendLedConfig(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.sendLedStripColors = function(onCompleteCallback) {
    if (FC.LED_COLORS.length == 0) {
        if (onCompleteCallback) onCompleteCallback();
    } else {
        const buffer = [];

        for (const color of FC.LED_COLORS) {
            buffer.push16(color.h)
                .push8(color.s)
                .push8(color.v);
        }
        MSP.send_message(MSPCodes.MSP_SET_LED_COLORS, buffer, false, onCompleteCallback);
    }
};

MspHelper.prototype.sendLedStripModeColor = function(index, onCompleteCallback)
{
    const modeColor = FC.LED_MODE_COLORS[index];
    const buffer = [];

    buffer.push8(modeColor.mode)
          .push8(modeColor.direction)
          .push8(modeColor.color);

    MSP.send_message(MSPCodes.MSP_SET_LED_STRIP_MODECOLOR, buffer, false, onCompleteCallback);

};

MspHelper.prototype.sendLedStripModeColors = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.LED_MODE_COLORS.length)
            self.sendLedStripModeColor(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.serialPortFunctionMaskToFunctions = function(functionMask)
{
    const self = this;
    const functions = [];

    const keys = Object.keys(self.SERIAL_PORT_FUNCTIONS);
    for (const key of keys) {
        const bit = self.SERIAL_PORT_FUNCTIONS[key];
        if (bit_check(functionMask, bit)) {
            functions.push(key);
        }
    }
    return functions;
};

MspHelper.prototype.serialPortFunctionsToMask = function(functions)
{
    const self = this;
    let mask = 0;

    for (let index = 0; index < functions.length; index++) {
        const key = functions[index];
        const bitIndex = self.SERIAL_PORT_FUNCTIONS[key];
        if (bitIndex >= 0) {
            mask = bit_set(mask, bitIndex);
        }
    }
    return mask;
};

MspHelper.prototype.sendRxFailChannel = function(index, onCompleteCallback)
{
    const rxFail = FC.RXFAIL_CONFIG[index];
    const buffer = [];

    buffer.push8(index)
          .push8(rxFail.mode)
          .push16(rxFail.value);

    MSP.send_message(MSPCodes.MSP_SET_RXFAIL_CONFIG, buffer, false, onCompleteCallback);
};

MspHelper.prototype.sendRxFailConfig = function(onCompleteCallback)
{
    const self = this;
    var index = 0;

    function send_next() {
        if (index < FC.RXFAIL_CONFIG.length)
            self.sendRxFailChannel(index++, send_next);
        else
            if (onCompleteCallback) onCompleteCallback();
    }

    send_next();
};

MspHelper.prototype.setArmingEnabled = function(doEnable, onCompleteCallback)
{
    if (FC.CONFIG.armingDisabled === doEnable) {

        FC.CONFIG.armingDisabled = !doEnable;

        MSP.send_message(MSPCodes.MSP_ARMING_DISABLE, mspHelper.crunch(MSPCodes.MSP_ARMING_DISABLE), false, function () {
            GUI.log(i18n.getMessage(doEnable ? 'armingEnabled' : 'armingDisabled'));
            if (onCompleteCallback) onCompleteCallback();
        });
    }
    else {
        if (onCompleteCallback) onCompleteCallback();
    }
};

MspHelper.prototype.loadSerialConfig = function(callback) {
    const mspCode = semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43) ? MSPCodes.MSP2_COMMON_SERIAL_CONFIG : MSPCodes.MSP_CF_SERIAL_CONFIG;
    MSP.send_message(mspCode, false, false, callback);
};

MspHelper.prototype.sendSerialConfig = function(callback) {
    const mspCode = semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43) ? MSPCodes.MSP2_COMMON_SET_SERIAL_CONFIG : MSPCodes.MSP_SET_CF_SERIAL_CONFIG;
    MSP.send_message(mspCode, mspHelper.crunch(mspCode), false, callback);
};

MSP.SDCARD_STATE_NOT_PRESENT = 0; //TODO, move these to better place
MSP.SDCARD_STATE_FATAL       = 1;
MSP.SDCARD_STATE_CARD_INIT   = 2;
MSP.SDCARD_STATE_FS_INIT     = 3;
MSP.SDCARD_STATE_READY       = 4;

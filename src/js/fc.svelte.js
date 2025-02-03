const INITIAL_CONFIG = {
    apiVersion:                       "0.0.0",
    flightControllerIdentifier:       '',
    flightControllerVersion:          '',
    version:                          0,
    buildInfo:                        '',
    multiType:                        0,
    msp_version:                      0, // not specified using semantic versioning
    capability:                       0,
    pidCycleTime:                     0,
    gyroCycleTime:                    0,
    cpuLoad:                          0,
    rtLoad:                           0,
    activeSensors:                    0,
    mode:                             0,
    motorCount:                       0,
    servoCount:                       0,
    numProfiles:                      3,
    profile:                          0,
    numRateProfile:                   6,
    rateProfile:                      0,
    uid:                              [0, 0, 0],
    accelerometerTrims:               [0, 0],
    name:                             '',
    displayName:                      'JOE PILOT',
    boardType:                        0,
    extraFlags:                       0,
    armingDisableCount:               0,
    armingDisableFlags:               0,
    armingDisabled:                   false,
    enableArmingFlag:                 false,
    motorOverrideEnabled:             false,
    servoOverrideEnabled:             false,
    mixerOverrideEnabled:             false,
    boardIdentifier:                  "",
    boardVersion:                     0,
    targetCapabilities:               0,
    targetName:                       "",
    boardName:                        "",
    manufacturerId:                   "",
    signature:                        [],
    mcuTypeId:                        255,
    configurationState:               0,
    sampleRateHz:                     0,
    configurationProblems:            0,
    hardwareName:                     '',
};

const INITIAL_ANALOG = {
    voltage:                    0,
    mAhdrawn:                   0,
    rssi:                       0,
    amperage:                   0,
};

const INITIAL_BATTERY_CONFIG = {
    capacity:                   0,
    cellCount:                  0,
    voltageMeterSource:         0,
    currentMeterSource:         0,
    vbatmincellvoltage:         0,
    vbatmaxcellvoltage:         0,
    vbatfullcellvoltage:        0,
    vbatwarningcellvoltage:     0,
    lvcPercentage:              0,
    mahWarningPercentage:       0,
};

const INITIAL_BATTERY_STATE = {
    batteryState:               0,
    cellCount:                  0,
    capacity:                   0,
    mAhDrawn:                   0,
    voltage:                    0,
    amperage:                   0,
    chargeLevel:                0,
};

export const FC = $state({

    // define all the global variables that are uses to hold FC state
    // the default state must be defined inside the resetState() method
    ADJUSTMENT_RANGES: null,
    PID_PROFILE: null,
    ANALOG: {...INITIAL_ANALOG},
    DEBUG_CONFIG: null,
    ARMING_CONFIG: null,
    AUX_CONFIG: null,
    AUX_CONFIG_IDS: null,
    BATTERY_CONFIG: {...INITIAL_BATTERY_CONFIG},
    BATTERY_STATE: {...INITIAL_BATTERY_STATE},
    BEEPER_CONFIG: null,
    BF_CONFIG: null,          // Remove when we officialy retire BF 3.1
    BLACKBOX: null,
    BOARD_ALIGNMENT_CONFIG: null,
    // Shallow copy of original config and added getter
    // getter allows this to be used with simple dot notation
    // and bridges the vue and rest of the code
    CONFIG: {
        ...INITIAL_CONFIG,
        get hardwareName() {
            let name;
            if (this.targetName) {
                name = this.targetName;
            } else {
                name = this.boardIdentifier;
            }

            if (this.boardName && this.boardName !== name) {
                name = `${this.boardName}(${name})`;
            }

            if (this.manufacturerId) {
                name = `${this.manufacturerId}/${name}`;
            }

            return name;
        },
        set hardwareName(name) {
            // NOOP, can't really be set. Maybe implement some logic?
        },
    },
    COPY_PROFILE: null,
    CURRENT_METERS: null,
    CURRENT_METER_CONFIGS: null,
    DATAFLASH: null,
    DEFAULT: null,
    FAILSAFE_CONFIG: null,
    FEATURE_CONFIG: null,
    FILTER_CONFIG: null,
    RPM_FILTER_CONFIG: null,
    RPM_FILTER_CONFIG_V2: null,
    GOVERNOR: null,
    GPS_CONFIG: null,
    GPS_DATA: null,
    GPS_RESCUE: null,
    LED_COLORS: null,
    LED_MODE_COLORS: null,
    LED_STRIP: null,
    LED_STRIP_CONFIG: null,
    MIXER_CONFIG: null,
    MIXER_INPUTS: null,
    MIXER_RULES: null,
    MIXER_OVERRIDE: null,
    MODE_RANGES: null,
    MODE_RANGES_EXTRA: null,
    MOTOR_CONFIG: null,
    MOTOR_DATA: null,
    MOTOR_OVERRIDE: null,
    MOTOR_OUTPUT_ORDER: null,
    MOTOR_TELEMETRY_DATA: null,
    MULTIPLE_MSP: null,
    PID: null,
    PIDS_ACTIVE: null,
    ADVANCED_CONFIG: null,
    PID_NAMES: null,
    PIDS: null,
    RC: null,
    RC_MAP: null,
    RC_TUNING: null,
    RSSI_CONFIG: null,
    RXFAIL_CONFIG: null,
    RX_CONFIG: null,
    TELEMETRY_CONFIG: null,
    SDCARD: null,
    SENSOR_ALIGNMENT: null,
    SENSOR_CONFIG: null,
    SENSOR_DATA: null,
    ESC_SENSOR_CONFIG: null,
    SERIAL_CONFIG: null,
    SERVO_CONFIG: null,
    SERVO_DATA: null,
    SERVO_RULES: null,
    SERVO_OVERRIDE: null,
    TRANSPONDER: null,
    TUNING_SLIDERS: null,
    VOLTAGE_METERS: null,
    VOLTAGE_METER_CONFIGS: null,

    resetState () {
        // Using `Object.assign` instead of reassigning to
        // trigger the updates on the Vue side
        Object.assign(this.CONFIG, INITIAL_CONFIG);
        Object.assign(this.BATTERY_CONFIG, INITIAL_BATTERY_CONFIG);
        Object.assign(this.BATTERY_STATE, INITIAL_BATTERY_STATE);
        Object.assign(this.ANALOG, INITIAL_ANALOG);

        this.BF_CONFIG = {
            currentscale:               0,
            currentoffset:              0,
            currentmetertype:           0,
            batterycapacity:            0,
        };

        this.COPY_PROFILE = {
            type:                       0,
            dstProfile:                 0,
            srcProfile:                 0,
        };

        this.FEATURE_CONFIG = {
            features:                   new Features(),
        };

        this.BEEPER_CONFIG = {
            beepers:                    0,
            dshotBeaconTone:            0,
            dshotBeaconConditions:      0,
        };

        this.MIXER_CONFIG = {
            main_rotor_dir:             0,
            tail_rotor_mode:            0,
            tail_motor_idle:            0,
            tail_center_trim:           0,
            swash_type:                 0,
            swash_ring:                 0,
            swash_phase:                0,
            swash_trim:                 [ 0, 0, 0 ],
            blade_pitch_limit:          0,
            coll_rpm_correction:        0,
            coll_geo_correction:        0,
        };

        this.MIXER_INPUTS =             [];
        this.MIXER_RULES =              [];
        this.MIXER_OVERRIDE =           Array.from({length: 29});

        this.BOARD_ALIGNMENT_CONFIG = {
            roll:                       0,
            pitch:                      0,
            yaw:                        0,
        };

        this.LED_STRIP =                [];
        this.LED_COLORS =               [];
        this.LED_MODE_COLORS =          [];

        this.LED_STRIP_CONFIG = {
            ledstrip_beacon_armed_only:     0,
            ledstrip_beacon_color:          0,
            ledstrip_beacon_percent:        0,
            ledstrip_beacon_period_ms:      0,
            ledstrip_blink_period_ms:       0,
            ledstrip_brightness:            0,
            ledstrip_fade_rate:             0,
            ledstrip_flicker_rate:          0,
            ledstrip_grb_rgb:               0,
            ledstrip_profile:               0,
            ledstrip_race_color:            0,
            ledstrip_visual_beeper:         0,
            ledstrip_visual_beeper_color:   0
        };

        this.PID = {
            controller:                 0,
        };

        this.PID_NAMES =                [];
        this.PIDS_ACTIVE = Array.from({length: 3});
        this.PIDS = Array.from({length: 3});
        for (let i = 0; i < 3; i++) {
            this.PIDS_ACTIVE[i] = Array.from({length: 8});
            this.PIDS[i] = Array.from({length: 8});
        }

        this.RC_MAP = [];

        // defaults
        // roll, pitch, yaw, throttle, aux 1, ... aux n
        this.RC = {
            active_channels:            0,
            channels:                   Array.from({length: 32}),
        };

        this.RX_CHANNELS = Array.from({length: 32});
        this.RC_COMMAND = Array.from({length: 32});

        this.RC_TUNING = {
            RC_RATE:                    0,
            RC_EXPO:                    0,
            roll_pitch_rate:            0, // pre 1.7 api only
            roll_rate:                  0,
            pitch_rate:                 0,
            yaw_rate:                   0,
            collective_rate:            0,
            dynamic_THR_PID:            0,
            throttle_MID:               0,
            throttle_EXPO:              0,
            dynamic_THR_breakpoint:     0,
            RC_YAW_EXPO:                0,
            rcYawRate:                  0,
            rcPitchRate:                0,
            RC_PITCH_EXPO:              0,
            rcCollectiveRate:           0,
            RC_COLLECTIVE_EXPO:         0,
            roll_rate_limit:            2000,
            pitch_rate_limit:           2000,
            yaw_rate_limit:             2000,
            collective_rate_limit:      2000,
            roll_response_time:         0,
            pitch_response_time:        0,
            yaw_response_time:          0,
            collective_response_time:   0,
            roll_accel_limit:           0,
            pitch_accel_limit:          0,
            yaw_accel_limit:            0,
            collective_accel_limit:     0,
        };

        this.AUX_CONFIG =               [];
        this.AUX_CONFIG_IDS =           [];

        this.MODE_RANGES =              [];
        this.MODE_RANGES_EXTRA =        [];
        this.ADJUSTMENT_RANGES =        [];

        this.SERVO_CONFIG =             [];
        this.SERVO_RULES =              [];

        this.SERIAL_CONFIG = {
            ports:                      [],

            // pre 1.6 settings
            mspBaudRate:                0,
            gpsBaudRate:                0,
            gpsPassthroughBaudRate:     0,
            cliBaudRate:                0,
        };

        this.ESC_SENSOR_CONFIG = {
            protocol:                   0,
            half_duplex:                0,
            update_hz:                  0,
            current_offset:             0,
            pinswap:                    0,
        };

        this.SENSOR_DATA = {
            gyroscope:                  [0, 0, 0],
            accelerometer:              [0, 0, 0],
            magnetometer:               [0, 0, 0],
            altitude:                   0,
            sonar:                      0,
            kinematics:                 [0.0, 0.0, 0.0],
            debug:                      [0, 0, 0, 0],
        };

        this.MOTOR_DATA =               [0, 0, 0, 0];
        this.MOTOR_OVERRIDE =           [0, 0, 0, 0];
        this.SERVO_DATA =               [0, 0, 0, 0, 0, 0, 0, 0];
        this.SERVO_OVERRIDE =           [0, 0, 0, 0, 0, 0, 0, 0];

        this.MOTOR_TELEMETRY_DATA = {
            rpm:                        [0, 0, 0, 0, 0, 0, 0, 0],
            invalidPercent:             [0, 0, 0, 0, 0, 0, 0, 0],
            voltage:                    [0, 0, 0, 0, 0, 0, 0, 0],
            current:                    [0, 0, 0, 0, 0, 0, 0, 0],
            consumption:                [0, 0, 0, 0, 0, 0, 0, 0],
            temperature:                [0, 0, 0, 0, 0, 0, 0, 0],
            temperature2:               [0, 0, 0, 0, 0, 0, 0, 0],
        };

        this.GPS_DATA = {
            fix:                        0,
            numSat:                     0,
            lat:                        0,
            lon:                        0,
            alt:                        0,
            speed:                      0,
            ground_course:              0,
            distanceToHome:             0,
            ditectionToHome:            0,
            update:                     0,

            chn:                        [],
            svid:                       [],
            quality:                    [],
            cno:                        [],
        };

        this.VOLTAGE_METERS =           [];
        this.VOLTAGE_METER_CONFIGS =    [];
        this.CURRENT_METERS =           [];
        this.CURRENT_METER_CONFIGS =    [];

        this.DEBUG_CONFIG = {
            debugMode:                  0,
            debugAxis:                  0,
            debugModeCount:             0,
            debugValueCount:            0,
        };

        this.ARMING_CONFIG = {
            auto_disarm_delay:          0,
            disarm_kill_switch:         0,
        };

        this.MOTOR_CONFIG = {
            mincommand:                 0,
            minthrottle:                0,
            maxthrottle:                0,
            motor_pwm_protocol:         0,
            motor_pwm_rate:             0,
            motor_poles:                [ 0, 0, 0, 0 ],
            motor_rpm_lpf:              [ 0, 0, 0, 0 ],
            use_dshot_telemetry:        false,
            use_unsynced_pwm:           false,
            main_rotor_gear_ratio:      [ 1, 1 ],
            tail_rotor_gear_ratio:      [ 1, 1 ],
        };

        this.GPS_CONFIG = {
            provider:                   0,
            ublox_sbas:                 0,
            auto_config:                0,
            auto_baud:                  0,
            home_point_once:            0,
            ublox_use_galileo:          0,
        };

        this.RSSI_CONFIG = {
            channel:                    0,
            scale:                      0,
            invert:                     0,
            offset:                     0,
        };

        this.DATAFLASH = {
            ready:                      false,
            supported:                  false,
            sectors:                    0,
            totalSize:                  0,
            usedSize:                   0,
        };

        this.SDCARD = {
            supported:                  false,
            state:                      0,
            filesystemLastError:        0,
            freeSizeKB:                 0,
            totalSizeKB:                0,
        };

        this.BLACKBOX = {
            supported:                  false,
            blackboxDevice:             0,
            blackboxMode:               0,
            blackboxDenom:              0,
            blackboxFields:             0,
        };

        this.TRANSPONDER = {
            supported:                  false,
            data:                       [],
            provider:                   0,
            providers:                  [],
        };

        this.SENSOR_ALIGNMENT = {
            gyro_1_align:               0,
            gyro_2_align:               0,
            align_mag:                  0,
        };

        this.ADVANCED_CONFIG = {
            gyro_sync_denom:            1,
            pid_process_denom:          1,
        };

        this.FILTER_CONFIG = {
            gyro_hardware_lpf:          0,
            gyro_lowpass_type:          0,
            gyro_lowpass_hz:            0,
            gyro_lowpass2_type:         0,
            gyro_lowpass2_hz:           0,
            gyro_notch_hz:              0,
            gyro_notch_cutoff:          0,
            gyro_notch2_hz:             0,
            gyro_notch2_cutoff:         0,
            dterm_lowpass_type:         0,
            dterm_lowpass_hz:           0,
            dterm_lowpass2_type:        0,
            dterm_lowpass2_hz:          0,
            dterm_notch_hz:             0,
            dterm_notch_cutoff:         0,
            gyro_lowpass_dyn_min_hz:    0,
            gyro_lowpass_dyn_max_hz:    0,
            dterm_lowpass_dyn_min_hz:   0,
            dterm_lowpass_dyn_max_hz:   0,
            dyn_notch_count:            0,
            dyn_notch_q:                0,
            dyn_notch_min_hz:           0,
            dyn_notch_max_hz:           0,
            rpm_preset:                 0,
            rpm_min_hz:                 0,
        };

        this.RPM_FILTER_CONFIG = [];
        this.RPM_FILTER_CONFIG_V2 = [];

        this.PID_PROFILE = {
            rollPitchItermIgnoreRate:   0,
            yawItermIgnoreRate:         0,
            yaw_p_limit:                0,
            deltaMethod:                0,
            vbatPidCompensation:        0,
            dtermSetpointTransition:    0,
            dtermSetpointWeight:        0,
            toleranceBand:              0,
            toleranceBandReduction:     0,
            itermThrottleGain:          0,
            pidMaxVelocity:             0,
            pidMaxVelocityYaw:          0,
            levelAngleLimit:            0,
            levelSensitivity:           0,
            itermThrottleThreshold:     0,
            itermAcceleratorGain:       0,
            error_rotation:             0,
            error_decay_time_ground:    0,
            error_decay_time_cyclic:    0,
            error_decay_time_yaw:       0,
            error_decay_limit_cyclic:   0,
            error_decay_limit_yaw:      0,
            errorLimitRoll:             0,
            errorLimitPitch:            0,
            errorLimitYaw:              0,
            offsetLimitRoll:            0,
            offsetLimitPitch:           0,
            gyroCutoffRoll:             0,
            gyroCutoffPitch:            0,
            gyroCutoffYaw:              0,
            dtermCutoffRoll:            0,
            dtermCutoffPitch:           0,
            dtermCutoffYaw:             0,
            btermCutoffRoll:            0,
            btermCutoffPitch:           0,
            btermCutoffYaw:             0,
            smartFeedforward:           0,
            itermRelax:                 0,
            itermRelaxType:             0,
            itermRelaxCutoff:           0,
            itermRelaxCutoffRoll:       0,
            itermRelaxCutoffPitch:      0,
            itermRelaxCutoffYaw:        0,
            itermRelaxLevelRoll:        0,
            itermRelaxLevelPitch:       0,
            itermRelaxLevelYaw:         0,
            absoluteControlGain:        0,
            throttleBoost:              0,
            levelAngleStrength:         0,
            horizonLevelStrength:       0,
            acroTrainerAngleLimit:      0,
            acroTrainerLimit:           0,
            acroTrainerGain:            0,
            feedforwardRoll:            0,
            feedforwardPitch:           0,
            feedforwardYaw:             0,
            feedforwardTransition:      0,
            antiGravityMode:            0,
            dMinRoll:                   0,
            dMinPitch:                  0,
            dMinYaw:                    0,
            dMinGain:                   0,
            dMinAdvance:                0,
            useIntegratedYaw:           0,
            integratedYawRelax:         0,
            motorOutputLimit:           0,
            autoProfileCellCount:       0,
            idleMinRpm:                 0,
            ff_interpolate_sp:          0,
            ff_smooth_factor:           0,
            ff_boost:                   0,
            vbat_sag_compensation:      0,
            thrustLinearization:        0,
            yawCenterOffset:            0,
            yawStopGainCW:              0,
            yawStopGainCCW:             0,
            yawPrecompCutoff:           0,
            yawFFCyclicGain:            0,
            yawFFCollectiveGain:        0,
            yawFFImpulseGain:           0,
            yawFFImpulseDecay:          0,
            pitchFFCollectiveGain:      0,
            cyclicCrossCouplingGain:    0,
            cyclicCrossCouplingRatio:   0,
            cyclicCrossCouplingCutoff:  0,
            pid_mode:                   0,
            rescueMode:                 0,
            rescueFlipMode:             0,
            rescueFlipGain:             0,
            rescuePullupTime:           0,
            rescueClimbTime:            0,
            rescueFlipTime:             0,
            rescueExitTime:             0,
            rescuePullupCollective:     0,
            rescueClimbCollective:      0,
            rescueHoverCollective:      0,
            rescueHoverAltitude:        0,
            rescueAltitudePGain:        0,
            rescueAltitudeIGain:        0,
            rescueAltitudeDGain:        0,
            rescueMaxCollective:        0,
            rescueMaxRate:              0,
            rescueMaxAccel:             0,
            yaw_inertia_precomp_gain:   0,
            yaw_inertia_precomp_cutoff: 0,
        };

        this.GOVERNOR = {
            gov_mode:                       0,
            gov_startup_time:               0,
            gov_spoolup_time:               0,
            gov_tracking_time:              0,
            gov_recovery_time:              0,
            gov_zero_throttle_timeout:      0,
            gov_lost_headspeed_timeout:     0,
            gov_autorotation_timeout:       0,
            gov_autorotation_bailout_time:  0,
            gov_autorotation_min_entry_time: 0,
            gov_handover_throttle:          0,
            gov_headspeed:                  0,
            gov_gain:                       0,
            gov_p_gain:                     0,
            gov_i_gain:                     0,
            gov_d_gain:                     0,
            gov_f_gain:                     0,
            gov_tta_gain:                   0,
            gov_tta_limit:                  0,
            gov_yaw_ff_weight:              0,
            gov_cyclic_ff_weight:           0,
            gov_collective_ff_weight:       0,
            gov_max_throttle:               0,
            gov_min_throttle:               0,
            gov_pwr_filter:                 0,
            gov_rpm_filter:                 0,
            gov_tta_filter:                 0,
            gov_ff_filter:                  0,
        };

        this.SENSOR_CONFIG = {
            acc_hardware:               0,
            baro_hardware:              0,
            mag_hardware:               0,
            gyro_to_use:                0,
            gyroHighFsr:                0,
            gyroMovementCalibThreshold: 0,
            gyroCalibDuration:          0,
            gyroOffsetYaw:              0,
            gyroCheckOverflow:          0,
        };

        this.RX_CONFIG = {
            serialrx_provider:            0,
            serialrx_inverted:            0,
            serialrx_halfduplex:          0,
            rx_pulse_min:                 0,
            rx_pulse_max:                 0,
            rxSpiProtocol:                0,
            rxSpiId:                      0,
            rxSpiRfChannelCount:          0,
            serialrx_pinswap:             0,
        };

        this.RC_CONFIG = {
            rc_center:                    0,
            rc_deflection:                0,
            rc_arm_throttle:              0,
            rc_min_throttle:              0,
            rc_max_throttle:              0,
            rc_deadband:                  0,
            rc_yaw_deadband:              0,
        };

        this.FAILSAFE_CONFIG = {
            failsafe_delay:                 0,
            failsafe_off_delay:             0,
            failsafe_throttle:              0,
            failsafe_switch_mode:           0,
            failsafe_throttle_low_delay:    0,
            failsafe_procedure:             0,
        };

        this.TELEMETRY_CONFIG = {
            telemetry_inverted:             0,
            telemetry_halfduplex:           0,
            telemetry_sensors:              0,
            telemetry_pinswap:              0,
            crsf_telemetry_mode:            0,
            crsf_telemetry_rate:            0,
            crsf_telemetry_ratio:           0,
            crsf_telemetry_sensors:         [],
        };

        this.GPS_RESCUE = {
            angle:                          0,
            initialAltitudeM:               0,
            descentDistanceM:               0,
            rescueGroundspeed:              0,
            throttleMin:                    0,
            throttleMax:                    0,
            throttleHover:                  0,
            sanityChecks:                   0,
            minSats:                        0,
            ascendRate:                     0,
            descendRate:                    0,
            allowArmingWithoutFix:          0,
            altitudeMode:                   0,
        };

        this.RXFAIL_CONFIG = [];

        this.MOTOR_OUTPUT_ORDER =           [];

        this.MULTIPLE_MSP = {
            msp_commands:                   [],
        };

        this.DEFAULT = {
            gyro_lowpass_hz:                100,
            gyro_lowpass_dyn_min_hz:        150,
            gyro_lowpass_dyn_max_hz:        450,
            gyro_lowpass_type:              this.FILTER_TYPE_FLAGS.PT1,
            gyro_lowpass2_hz:               300,
            gyro_lowpass2_type:             this.FILTER_TYPE_FLAGS.PT1,
            gyro_notch_cutoff:              300,
            gyro_notch_hz:                  400,
            gyro_notch2_cutoff:             100,
            gyro_notch2_hz:                 200,
            gyro_rpm_notch_harmonics:         3,
            gyro_rpm_notch_min_hz:          100,
            dterm_lowpass_hz:               100,
            dterm_lowpass_dyn_min_hz:       150,
            dterm_lowpass_dyn_max_hz:       250,
            dyn_lpf_curve_expo:             5,
            dterm_lowpass_type:             this.FILTER_TYPE_FLAGS.PT1,
            dterm_lowpass2_hz:              150,
            dterm_lowpass2_type:            this.FILTER_TYPE_FLAGS.BIQUAD,
            dterm_notch_cutoff:             160,
            dterm_notch_hz:                 260,
            yaw_lowpass_hz:                 100,
            dyn_notch_q:                     20,
            dyn_notch_count:                  0,
            dyn_notch_q_rpm:                250, // default with rpm filtering
            dyn_notch_count_rpm:              0,
            dyn_notch_min_hz:                25,
            dyn_notch_max_hz:               245,
        };

        this.TUNING_SLIDERS = {
            slider_pids_mode:                   0,
            slider_master_multiplier:           0,
            slider_roll_pitch_ratio:            0,
            slider_i_gain:                      0,
            slider_pd_ratio:                    0,
            slider_pd_gain:                     0,
            slider_dmin_ratio:                  0,
            slider_ff_gain:                     0,
            slider_dterm_filter:                0,
            slider_dterm_filter_multiplier:     0,
            slider_gyro_filter:                 0,
            slider_gyro_filter_multiplier:      0,
        };
    },

    getSerialRxTypes: () => {
        // defaults
        const serialRxTypes = [
            'SPEKTRUM1024',
            'SPEKTRUM2048',
            'SBUS',
            'SUMD',
            'SUMH',
            'XBUS_MODE_B',
            'XBUS_MODE_B_RJ01',
            'IBUS',
            'JETIEXBUS',
            'CRSF',
            'SPEKTRUM2048/SRXL',
            'TARGET_CUSTOM',
            'FPORT',
            'SPEKTRUM SRXL2',
        ];

        return serialRxTypes;
    },

    getHardwareName() {
        let name;
        if (this.CONFIG.targetName) {
            name = this.CONFIG.targetName;
        } else {
            name = this.CONFIG.boardIdentifier;
        }

        if (this.CONFIG.boardName && this.CONFIG.boardName !== name) {
            name = `${this.CONFIG.boardName}(${name})`;
        }

        if (this.CONFIG.manufacturerId) {
            name = `${this.CONFIG.manufacturerId}/${name}`;
        }

        return name;
    },


    MCU_TYPES: {
        0: "SIMULATOR",
        1: "F103",
        2: "F303",
        3: "F40X",
        4: "F411",
        5: "F446",
        6: "F722",
        7: "F745",
        8: "F746",
        9: "F765",
        255: "Unknown MCU",
    },

    getMcuType() {
        return this.MCU_TYPES[this.CONFIG.mcuTypeId];
    },

    CONFIGURATION_STATES: {
        DEFAULTS_BARE: 0,
        DEFAULTS_CUSTOM: 1,
        CONFIGURED: 2,
    },

    TARGET_CAPABILITIES_FLAGS: {
        HAS_VCP: 0,
        HAS_SOFTSERIAL: 1,
        IS_UNIFIED: 2,
        HAS_FLASH_BOOTLOADER: 3,
        SUPPORTS_CUSTOM_DEFAULTS: 4,
        HAS_CUSTOM_DEFAULTS: 5,
        SUPPORTS_RX_BIND: 6,
    },

    CONFIGURATION_PROBLEM_FLAGS: {
        ACC_NEEDS_CALIBRATION: 0,
        MOTOR_PROTOCOL_DISABLED: 1,
    },

    boardHasVcp() {
        return bit_check(this.CONFIG.targetCapabilities, this.TARGET_CAPABILITIES_FLAGS.HAS_VCP);
    },

    FILTER_TYPE_FLAGS: {
        PT1: 0,
        BIQUAD: 1,
    },

    getFilterDefaults() {
        const versionFilterDefaults = this.DEFAULT;

        versionFilterDefaults.gyro_lowpass_hz = 125;
        versionFilterDefaults.gyro_lowpass_dyn_min_hz = 50;
        versionFilterDefaults.gyro_lowpass_dyn_max_hz = 150;
        versionFilterDefaults.gyro_lowpass_type = this.FILTER_TYPE_FLAGS.BIQUAD;
        versionFilterDefaults.gyro_lowpass2_hz = 500;
        versionFilterDefaults.gyro_lowpass2_type = this.FILTER_TYPE_FLAGS.BIQUAD;
        versionFilterDefaults.dterm_lowpass_hz = 50;
        versionFilterDefaults.dterm_lowpass_dyn_min_hz = 25;
        versionFilterDefaults.dterm_lowpass_dyn_max_hz = 60;
        versionFilterDefaults.dterm_lowpass_type = this.FILTER_TYPE_FLAGS.PT1;
        versionFilterDefaults.dterm_lowpass2_hz = 0;
        versionFilterDefaults.dterm_lowpass2_type = this.FILTER_TYPE_FLAGS.PT1;

        return versionFilterDefaults;
    },

    getPidDefaults() {
        return [
            10, 50,  0, 50,
            10, 50,  0, 50,
            50, 50,  0,  0,
        ];
    },
});

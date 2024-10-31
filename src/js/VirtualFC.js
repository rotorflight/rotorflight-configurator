'use strict';

const VirtualFC = {
    // these values are manufactured to unlock all the functionality of the configurator, they dont represent actual hardware
    setVirtualConfig() {
        const virtualFC = FC;

        virtualFC.resetState();

        virtualFC.CONFIG.flightControllerVersion = "4.2.4";
        virtualFC.CONFIG.apiVersion = CONFIGURATOR.virtualApiVersion;

        virtualFC.BEEPER_CONFIG.beepers = new Beepers(FC.CONFIG);
        virtualFC.BEEPER_CONFIG.dshotBeaconConditions = new Beepers(FC.CONFIG, [ "RX_LOST", "RX_SET" ]);

        virtualFC.MIXER_CONFIG.mixer = 3;

        virtualFC.MOTOR_DATA = Array.from({length: 8});
        virtualFC.MOTOR_3D_CONFIG = {
            deadband3d_low: 1406,
            deadband3d_high: 1514,
            neutral: 1460,
        };
        virtualFC.MOTOR_CONFIG = {
            minthrottle: 1070,
            maxthrottle: 2000,
            mincommand: 1000,
            motor_poles: [ 8, 8, 8, 8 ],
            use_dshot_telemetry: true,
            use_esc_sensor: false,
        };

        virtualFC.SERVO_CONFIG = Array.from({length: 8});

        for (let i = 0; i < virtualFC.SERVO_CONFIG.length; i++) {
            virtualFC.SERVO_CONFIG[i] = {
                mid: 1500,
                min: -500,
                max:  500,
                rate: 500,
                trim: 0,
                speed: 0,
            };
        }

        virtualFC.ADJUSTMENT_RANGES = Array.from({length: 16});

        for (let i = 0; i < virtualFC.ADJUSTMENT_RANGES.length; i++) {
            virtualFC.ADJUSTMENT_RANGES[i] = {
                slotIndex: 0,
                auxChannelIndex: 0,
                range: {
                    start: 900,
                    end: 900,
                },
                adjustmentFunction: 0,
                auxSwitchChannelIndex: 0,
            };
        }

        virtualFC.SERIAL_CONFIG.ports = Array.from({length: 6});

        virtualFC.SERIAL_CONFIG.ports[0] = {
            identifier: 20,
            auxChannelIndex: 0,
            functions: ["MSP"],
            msp_baudrate: 115200,
            gps_baudrate: 57600,
            telemetry_baudrate: "AUTO",
            blackbox_baudrate: 115200,
        };

        for (let i = 1; i < virtualFC.SERIAL_CONFIG.ports.length; i++) {
            virtualFC.SERIAL_CONFIG.ports[i] = {
                identifier: i-1,
                auxChannelIndex: 0,
                functions: [],
                msp_baudrate: 115200,
                gps_baudrate: 57600,
                telemetry_baudrate: "AUTO",
                blackbox_baudrate: 115200,
            };
        }

        virtualFC.LED_STRIP = Array.from({length: 256});

        for (let i = 0; i < virtualFC.LED_STRIP.length; i++) {
            virtualFC.LED_STRIP[i] = {
                x: 0,
                y: 0,
                functions: ["c"],
                color: 0,
                directions: [],
                parameters: 0,
            };
        }

        virtualFC.ANALOG = {
            voltage: 12,
            mAhdrawn: 1200,
            rssi: 100,
            amperage: 3,
        };

        virtualFC.CONFIG.sampleRateHz  = 12000;
        virtualFC.ADVANCED_CONFIG.pid_process_denom = 2;

        virtualFC.BLACKBOX.supported = true;

        virtualFC.BATTERY_CONFIG = {
            vbatmincellvoltage: 1,
            vbatmaxcellvoltage: 4,
            vbatwarningcellvoltage: 3,
            capacity: 10000,
            voltageMeterSource: 1,
            currentMeterSource: 1,
        };

        virtualFC.BATTERY_STATE = {
            cellCount: 10,
            voltage: 20,
            mAhDrawn: 1000,
            amperage: 3,
        };

        virtualFC.DATAFLASH = {
            ready: true,
            supported: true,
            sectors: 1024,
            totalSize: 40000,
            usedSize: 10000,
        };

        virtualFC.SDCARD = {
            supported: true,
            state: 1,
            freeSizeKB: 1024,
            totalSizeKB: 2048,
        };

        virtualFC.SENSOR_CONFIG = {
            acc_hardware: 1,
            baro_hardware: 1,
            mag_hardware: 1,
        };

        virtualFC.RC = {
            channels: Array.from({length: 16}),
            active_channels: 16,
        };
        for (let i = 0; i < virtualFC.RC.channels.length; i++) {
            virtualFC.RC.channels[i] = 1500;
        }

        // from https://github.com/betaflight/betaflight/blob/master/docs/Modes.md
        virtualFC.AUX_CONFIG = ["ARM","ANGLE","HORIZON","ANTI GRAVITY","MAG","HEADFREE","HEADADJ","CAMSTAB","PASSTHRU","BEEPERON","LEDLOW","CALIB",
        "TELEMETRY","SERVO1","SERVO2","SERVO3","BLACKBOX","FAILSAFE","AIRMODE","3D","FPV ANGLE MIX","BLACKBOX ERASE","CAMERA CONTROL 1",
        "CAMERA CONTROL 2","CAMERA CONTROL 3","FLIP OVER AFTER CRASH","BOXPREARM","BEEP GPS SATELLITE COUNT","VTX PIT MODE","USER1","USER2",
        "USER3","USER4","PID AUDIO","PARALYZE","GPS RESCUE","ACRO TRAINER","DISABLE VTX CONTROL","LAUNCH CONTROL"];
        FC.AUX_CONFIG_IDS = [0,1,2,4,5,6,7,8,12,13,15,17,19,20,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,39,40,41,42,43,44,45,46,47,48,49];

        for (let i = 0; i < 16; i++) {
            virtualFC.RXFAIL_CONFIG[i] = {
                mode: 1,
                value: 1500,
            };
        }

        // 11 1111 (pass bitchecks)
        virtualFC.CONFIG.activeSensors = 63;
    },
};

import semver from "semver";
import { mount, unmount } from "svelte";

import { Model } from "@/js/model.js";
import BusOutputs from "@/tabs/configuration/BusOutputs.svelte";

const tab = {
    tabName: 'configuration',
    svelteComponent: null,
    isDirty: false,
    yaw_fix: 0.0,
};

tab.initialize = function (callback) {
    const self = this;

    const uartNames = {
        0: 'UART1',
        1: 'UART2',
        2: 'UART3',
        3: 'UART4',
        4: 'UART5',
        5: 'UART6',
        6: 'UART7',
        7: 'UART8',
        8: 'UART9',
        9: 'UART10',
        20: 'USB VCP',
        30: 'SOFTSERIAL1',
        31: 'SOFTSERIAL2',
    };

    const portNamesRF2 = {
        'F7A1':
        {
            0: 'DSM Ⓓ',
            1: 'S.BUS',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'Port Ⓔ',
            5: 'Port Ⓑ',
        },
        'F7A2':
        {
            0: 'DSM Ⓓ',
            1: 'S.BUS',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'Port Ⓔ',
            5: 'Port Ⓖ',
        },
        'F7A3':
        {
            0: 'DSM Ⓓ',
            1: 'S.BUS',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'Int.Rx',
            5: 'Port Ⓑ',
        },
        'F7A4':
        {
            0: 'DSM Ⓓ',
            1: 'S.BUS',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'Int.Rx',
            5: 'Port Ⓖ',
        },
        'F7B1':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'DSM Ⓓ',
            5: 'Port Ⓑ',
        },
        'F7B2':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'DSM Ⓓ',
            5: 'Port Ⓖ',
        },
        'F7B3':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'Port Ⓔ',
            5: 'Port Ⓑ',
        },
        'F7B4':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'Port Ⓔ',
            5: 'Port Ⓖ',
        },
        'F7B5':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'Int.Rx',
            5: 'Port Ⓑ',
        },
        'F7B6':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'Int.Rx',
            5: 'Port Ⓖ',
        },
        'F7C1':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'DSM Ⓓ',
            5: 'Port Ⓑ',
        },
        'F7C2':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'DSM Ⓓ',
            5: 'Port Ⓖ',
        },
        'F7C3':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'Port Ⓔ',
            5: 'Port Ⓑ',
        },
        'F7C4':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'Port Ⓔ',
            5: 'Port Ⓖ',
        },
        'F7C5':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓒ',
            3: 'Port Ⓐ',
            4: 'Int.Rx',
            5: 'Port Ⓑ',
        },
        'F7C6':
        {
            0: 'S.BUS',
            1: 'TELEM',
            2: 'Port Ⓖ',
            3: 'Port Ⓐ',
            4: 'Int.Rx',
            5: 'Port Ⓖ',
        },
    };

    const portTypes = {
        DISABLED:   0,
        MSP:        1,
        GPS:        2,
        TELEM:      3,
        MAVLINK:    4,
        BLACKBOX:   5,
        CUSTOM:     6,
        AUTO:       7,
    };

    const baudRateOptions = {};

    baudRateOptions[portTypes.DISABLED] = [
        'DISABLED',
    ];

    baudRateOptions[portTypes.MSP] = [
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '250000',
        '460800',
        '500000',
        '921600',
        '1000000',
    ];

    baudRateOptions[portTypes.GPS] = [
        'AUTO',
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '460800',
    ];

    baudRateOptions[portTypes.MAVLINK] = [
        'AUTO',
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '460800',
    ];

    baudRateOptions[portTypes.TELEM] = [
        'AUTO',
    ];

    baudRateOptions[portTypes.BLACKBOX] = [
        'AUTO',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '250000',
        '460800',
        '500000',
        '921600',
        '1000000',
        '1500000',
        '2000000',
        '2470000',
    ];

    baudRateOptions[portTypes.CUSTOM] = [
        'CUSTOM',
    ];

    baudRateOptions[portTypes.AUTO] = [
        'AUTO',
    ];

    const portFunctions = [
        { id: 0,     excl: 0,       name: 'DISABLED',             type: portTypes.DISABLED },
        { id: 1,     excl: 1,       name: 'MSP',                  type: portTypes.MSP },
        { id: 2,     excl: 2,       name: 'GPS',                  type: portTypes.GPS },
        { id: 64,    excl: 64,      name: 'RX_SERIAL',            type: portTypes.AUTO },
        { id: 1024,  excl: 1024,    name: 'ESC_SENSOR',           type: portTypes.AUTO },
        { id: 128,   excl: 128,     name: 'BLACKBOX',             type: portTypes.BLACKBOX },
        { id: 262144,excl: 262144,  name: 'SBUS_OUT',             type: portTypes.AUTO },
        { id: 524288,excl: 524288,  name: 'FBUS_OUT',             type: portTypes.AUTO },
        { id: 4,     excl: 4668,    name: 'TELEMETRY_FRSKY',      type: portTypes.TELEM },
        { id: 32,    excl: 4668,    name: 'TELEMETRY_SMARTPORT',  type: portTypes.TELEM },
        { id: 4096,  excl: 4668,    name: 'TELEMETRY_IBUS',       type: portTypes.TELEM },
        { id: 8,     excl: 4668,    name: 'TELEMETRY_HOTT',       type: portTypes.TELEM },
        { id: 512,   excl: 4668,    name: 'TELEMETRY_MAVLINK',    type: portTypes.MAVLINK },
        { id: 16,    excl: 4668,    name: 'TELEMETRY_LTM',        type: portTypes.TELEM },
        //{ id: 2048,  excl: 10240,   name: 'TBS_SMARTAUDIO',       type: portTypes.AUTO },
        //{ id: 8192,  excl: 10240,   name: 'IRC_TRAMP',            type: portTypes.AUTO },
        //{ id: 16384, excl: 16384,   name: 'RUNCAM',               type: portTypes.AUTO },
        //{ id: 32768, excl: 32768,   name: 'LIDAR_TF',             type: portTypes.AUTO },
        //{ id: 65536, excl: 65536,   name: 'FRSKY_OSD',            type: portTypes.AUTO },
    ];

    GUI.configuration_loaded = true;

    load_data(load_html);

    function load_html() {
        $('#content').load("/src/tabs/configuration.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_NAME))
            .then(() => MSP.promise(MSPCodes.MSP_BOARD_INFO))
            .then(() => MSP.promise(MSPCodes.MSP_FEATURE_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_MIXER_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_SENSOR_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_SENSOR_ALIGNMENT))
            .then(() => MSP.promise(MSPCodes.MSP_BOARD_ALIGNMENT_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_ACC_TRIM))
            .then(() => MSP.promise(MSPCodes.MSP_SERIAL_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_SBUS_OUTPUT_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_GET_FBUS_MASTER_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_NAME, mspHelper.crunch(MSPCodes.MSP_SET_NAME)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_FEATURE_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_FEATURE_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_ADVANCED_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_ADVANCED_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_SENSOR_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_SENSOR_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_SENSOR_ALIGNMENT, mspHelper.crunch(MSPCodes.MSP_SET_SENSOR_ALIGNMENT)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_BOARD_ALIGNMENT_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_BOARD_ALIGNMENT_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_ACC_TRIM, mspHelper.crunch(MSPCodes.MSP_SET_ACC_TRIM)))
            .then(() => MSP.promise(MSPCodes.MSP_SET_SERIAL_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_SERIAL_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                GUI.log(i18n.getMessage('deviceRebooting'));
                reinitialiseConnection(callback);
            });
    }

    function get_port_baudrate(portIndex, portType) {
        const serialPort = FC.SERIAL_CONFIG.ports[portIndex];
        switch (portType) {
            case portTypes.MSP:
                return serialPort.msp_baudrate;
            case portTypes.GPS:
                return serialPort.gps_baudrate;
            case portTypes.MAVLINK:
                return serialPort.telemetry_baudrate;
            case portTypes.BLACKBOX:
                return serialPort.blackbox_baudrate;
            case portTypes.AUTO:
            case portTypes.TELEM:
                return "AUTO";
            case portTypes.CUSTOM:
                return "CUSTOM";
            default:
                return "DISABLED";
        }
    }

    function set_port_baudrate(portIndex, portType, value) {
        const serialPort = FC.SERIAL_CONFIG.ports[portIndex];
        switch (portType) {
            case portTypes.MSP:
                return serialPort.msp_baudrate = value;
            case portTypes.GPS:
                return serialPort.gps_baudrate = value;
            case portTypes.MAVLINK:
                return serialPort.telemetry_baudrate = value;
            case portTypes.BLACKBOX:
                return serialPort.blackbox_baudrate = value;
            case portTypes.AUTO:
            case portTypes.TELEM:
                return "AUTO";
            case portTypes.CUSTOM:
                return "CUSTOM";
            default:
                return "DISABLED";
        }
    }

    function get_port_func(funcId) {
        for (const func of portFunctions) {
            if (func.id == funcId)
                return func;
        }
        return undefined;
    }

    function get_port_type(funcId) {
        for (const func of portFunctions) {
            if (func.id == funcId)
                return func.type;
        }
        return portTypes.CUSTOM;
    }

    function get_port_excl(funcId) {
        for (const func of portFunctions) {
            if (func.id == funcId)
                return func.excl;
        }
        return funcId;
    }

    function update_baudrate_list(listElement, portIndex, portType) {
        const baudRate = get_port_baudrate(portIndex, portType);
        listElement.empty();
        for (const rate of baudRateOptions[portType]) {
            const rateName = i18n.existsMessage('baudrate_' + rate) ?
                i18n.getMessage('baudrate_' + rate) : rate;
            listElement.append(`<option value="${rate}">${rateName}</option>`);
        }
        if (!baudRateOptions[portType].includes(baudRate)) {
            const rateName = i18n.existsMessage('baudrate_' + baudRate) ?
                i18n.getMessage('baudrate_' + baudRate) : baudRate;
            listElement.append(`<option value="${baudRate}">${rateName}</option>`);
        }
        listElement.val(baudRate);
    }

    function update_function_lists() {
        let usedFunctions = 0;

        $('.tab-configuration .serialPorts .portConfiguration select.function').each(function() {
            const funcValue = $(this).val();
            usedFunctions |= get_port_excl(funcValue);
        });

        $('.tab-configuration .serialPorts .portConfiguration select.function').each(function() {
            const funcValue = $(this).val();
            const exclFuncs = usedFunctions ^ get_port_excl(funcValue);
            $('option', this).each(function() {
                const option = $(this);
                const optVal = option.val();
                option.prop('disabled', optVal & exclFuncs);
            });
        });
    }

    function add_serial_ports_html() {

        const VCP_PORT_IDENTIFIER = 20;

        const portsList = $('.tab-configuration .serialPorts');
        const portTemplate = $('#tab-configuration-templates .portConfiguration');

        for (let portIndex = 0; portIndex < FC.SERIAL_CONFIG.ports.length; portIndex++) {
            const serialPort = FC.SERIAL_CONFIG.ports[portIndex];

            if (serialPort.identifier === VCP_PORT_IDENTIFIER)
                continue;

            const element = portTemplate.clone();

            const portElement = element.find('.portid');
            const uartElement = element.find('.uartid');
            const funcElement = element.find('select.function');
            const baudElement = element.find('select.baudrate');

            if (FC.CONFIG.boardDesign in portNamesRF2) {
                const portNames = portNamesRF2[FC.CONFIG.boardDesign];
                portElement.text(portNames[serialPort.identifier]);
                uartElement.text('[' + uartNames[serialPort.identifier] + ']');
            }
            else {
                portElement.text(uartNames[serialPort.identifier]);
            }

            for (const func of portFunctions) {
                const funcName = i18n.getMessage('portsFunction_' + func.name);
                    if (
                        (func.name !== 'SBUS_OUT' || semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_7)) &&
                        (func.name !== 'FBUS_OUT' || semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9))
                    ) {
                    funcElement.append(`<option value="${func.id}">${funcName}</option>`);
                }
            }

            if (!get_port_func(serialPort.functionMask)) {
                const funcName = i18n.getMessage('portsFunction_CUSTOM');
                funcElement.append(`<option value="${serialPort.functionMask}">${funcName}</option>`);
            }

            update_baudrate_list(baudElement, portIndex, get_port_type(serialPort.functionMask));

            baudElement.change(function () {
                const baudValue = baudElement.val();
                const funcValue = funcElement.val();
                set_port_baudrate(portIndex, get_port_type(funcValue), baudValue);
            });

            funcElement.change(function () {
                const funcValue = funcElement.val();
                serialPort.functionMask = funcValue;
                update_baudrate_list(baudElement, portIndex, get_port_type(funcValue));
                update_function_lists();
            });

            funcElement.val(serialPort.functionMask);

            portsList.append(element);
        }

        update_function_lists();
    }

    function process_html() {
        self.svelteComponent = mount(BusOutputs, {
            target: document.querySelector("#svelte-bus-outputs"),
            props: {
                onchange: () => {
                    setDirty();
                }
            }
        });

        // Hide the buttons toolbar
        $('.tab-configuration').addClass('toolbar_hidden');

        const features_e = $('.tab-configuration .features');
        features_e.each(function () {
          const element = $(this);

          for (const groupName of Object.keys(Features.GROUPS)) {
            if (!element.hasClass(groupName)) continue;

            for (const featureName of Features.GROUPS[groupName]) {
              let tipHtml = "";
              if (i18n.existsMessage(`featureTip_${featureName}`)) {
                tipHtml = `<div class="helpicon cf_tip" i18n_title="featureTip_${featureName}"></div>`;
              }

              const newElement = $(`<tr>
                <td><input class="feature toggle" id="feature-${featureName}" name="${featureName}" title="${featureName}" type="checkbox"/></td>
                <td><div>${featureName}</div><span class="xs" i18n="feature_${featureName}"></span></td>
                <td><span class="sm-min" i18n="feature_${featureName}"></span>${tipHtml}</td>
                </tr>`);

              newElement
                .find("input.feature")
                .prop("checked", FC.FEATURE_CONFIG.features.isEnabled(featureName))
                .data("featureName", featureName);

              element.append(newElement);
            }
          }
        });

        // translate to user-selected language
        i18n.localizePage();

        // initialize 3D Model
        self.initModel();

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-configuration').removeClass('toolbar_hidden');
            }
        }

        const alignments = [
            'CW 0°',
            'CW 90°',
            'CW 180°',
            'CW 270°',
            'CW 0° flip',
            'CW 90° flip',
            'CW 180° flip',
            'CW 270° flip',
            'Custom',
        ];

        const orientation_mag_e = $('select.magalign');

        for (let i = 0; i < alignments.length; i++) {
            orientation_mag_e.append(`<option value="${(i+1)}">${alignments[i]}</option>`);
        }

        orientation_mag_e.val(FC.SENSOR_ALIGNMENT.align_mag);

        orientation_mag_e.change(function () {
            let value = parseInt($(this).val());
            FC.SENSOR_ALIGNMENT.align_mag = value;
        });

        // Gyro and PID update
        const gyroTextElement = $('input.gyroFrequency');
        const pidSelectElement = $('select.pidProcessDenom');

        function addDenomOption(element, denom, baseFreq) {
            let denomDescription;
            if (baseFreq === 0) {
                denomDescription = i18n.getMessage('configurationSpeedPidNoGyro', {'value' : denom});
            } else {
                denomDescription = i18n.getMessage('configurationKHzUnitLabel', { 'value' : (baseFreq / denom / 1000).toFixed(2)});
            }
            element.append(`<option value="${denom}">${denomDescription}</option>`);
        }

         const updateGyroDenomReadOnly = function (gyroFrequency) {
             let gyroContent;
             if (gyroFrequency === 0) {
                gyroContent = i18n.getMessage('configurationSpeedGyroNoGyro');
             } else {
                gyroContent = i18n.getMessage('configurationKHzUnitLabel', { 'value' : (gyroFrequency / 1000).toFixed(2)});
             }
             gyroTextElement.val(gyroContent);
         };

         const pidBaseFreq = FC.CONFIG.sampleRateHz;

        updateGyroDenomReadOnly(pidBaseFreq);

        pidSelectElement.empty();
        for (let denom = 1; denom <= 16; denom++) {
            if (pidBaseFreq / denom >= 1000)
                addDenomOption(pidSelectElement, denom, pidBaseFreq);
        }
        pidSelectElement.val(FC.ADVANCED_CONFIG.pid_process_denom);

        $('input[name="craftName"]').val(FC.CONFIG.name);

        $('input[id="accHardwareSwitch"]').prop('checked', FC.SENSOR_CONFIG.acc_hardware !== 1);
        $('input[id="baroHardwareSwitch"]').prop('checked', FC.SENSOR_CONFIG.baro_hardware !== 1);
        $('input[id="magHardwareSwitch"]').prop('checked', FC.SENSOR_CONFIG.mag_hardware !== 1);

        // fill board alignment
        $('input[name="board_align_roll"]').val(FC.BOARD_ALIGNMENT_CONFIG.roll);
        $('input[name="board_align_pitch"]').val(FC.BOARD_ALIGNMENT_CONFIG.pitch);
        $('input[name="board_align_yaw"]').val(FC.BOARD_ALIGNMENT_CONFIG.yaw);

        // fill accel trims
        $('input[name="roll"]').val(FC.CONFIG.accelerometerTrims[1]);
        $('input[name="pitch"]').val(FC.CONFIG.accelerometerTrims[0]);

        // display current yaw fix value (important during tab re-initialization)
        $('div#interactive_block > a.reset').text(i18n.getMessage('statusButtonResetZaxisValue', [self.yaw_fix]));

        // reset yaw button hook
        $('div#interactive_block > a.reset').click(function () {
            self.yaw_fix = FC.SENSOR_DATA.kinematics[2] * - 1.0;
            $(this).text(i18n.getMessage('statusButtonResetZaxisValue', [self.yaw_fix]));
            console.log('YAW reset to 0 deg, fix: ' + self.yaw_fix + ' deg');
        });

        // initialize serial ports
        add_serial_ports_html();


        function updateConfig() {

            // gather data that doesn't have automatic change event bound
            FC.CONFIG.name = $.trim($('input[name="craftName"]').val());

            FC.SENSOR_CONFIG.acc_hardware = $('input[id="accHardwareSwitch"]').is(':checked') ? 0 : 1;
            FC.SENSOR_CONFIG.baro_hardware = $('input[id="baroHardwareSwitch"]').is(':checked') ? 0 : 1;
            FC.SENSOR_CONFIG.mag_hardware = $('input[id="magHardwareSwitch"]').is(':checked') ? 0 : 1;

            FC.BOARD_ALIGNMENT_CONFIG.roll = parseInt($('input[name="board_align_roll"]').val());
            FC.BOARD_ALIGNMENT_CONFIG.pitch = parseInt($('input[name="board_align_pitch"]').val());
            FC.BOARD_ALIGNMENT_CONFIG.yaw = parseInt($('input[name="board_align_yaw"]').val());

            FC.CONFIG.accelerometerTrims[1] = parseInt($('input[name="roll"]').val());
            FC.CONFIG.accelerometerTrims[0] = parseInt($('input[name="pitch"]').val());

            FC.ADVANCED_CONFIG.pid_process_denom = parseInt(pidSelectElement.val());
        }

        // UI hooks

        $('input.feature', features_e).change(function () {
            const element = $(this);
            FC.FEATURE_CONFIG.features.setFeature(
              element.data("featureName"),
              element.is(":checked")
            );
            updateTabList(FC.FEATURE_CONFIG.features);
        });

        $('input[id="accHardwareSwitch"]').change(function() {
            const checked = $(this).is(':checked');
            $('.accelNeeded').toggle(checked);
        }).change();

        $(features_e).filter('select').change(function () {
            const element = $(this);
            FC.FEATURE_CONFIG.features.setFeature(
              element.data("featureName"),
              element.is(":checked")
            );
            updateTabList(FC.FEATURE_CONFIG.features);
        });

        self.save = function (callback) {
            updateConfig();
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

        $('.content_wrapper').change(function () {
            setDirty();
        });

        //GUI.interval_add('status_pull', function() {
        //    MSP.send_message(MSPCodes.MSP_STATUS);
        //}, 250, true);

        GUI.interval_add('attitude_pull', function () {
            MSP.send_message(MSPCodes.MSP_ATTITUDE, false, false, function () {
                self.renderModel();
            });
        }, 50, true);

        GUI.content_ready(callback);
    }
};

tab.initModel = function () {
    try {
        this.model = new Model($('.model-and-info #canvas_wrapper'), $('.model-and-info #canvas'));
        $('#canvas_wrapper .webgl-error').hide();
        $(window).on('resize', $.proxy(this.model.resize, this.model));
    } catch (err) {
        console.log("Error initialising model", err);
        $('#canvas_wrapper .webgl-error').show();
    }
};

tab.renderModel = function () {
    const x = (-FC.SENSOR_DATA.kinematics[1]) * 0.017453292519943295,
          y = (-FC.SENSOR_DATA.kinematics[2] - this.yaw_fix) * 0.017453292519943295,
          z = (-FC.SENSOR_DATA.kinematics[0]) * 0.017453292519943295;

    this.model?.rotateTo(x, y, z);
};

tab.cleanup = function (callback) {
    if (this.svelteComponent) {
        unmount(this.svelteComponent);
        this.svelteComponent = null;
    }

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

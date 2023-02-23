'use strict';

TABS.ports = {
    isDirty: false,
};

TABS.ports.initialize = function (callback) {
    const self = this;

    const functionRules = [
        { name: 'MSP',                  groups: ['configuration', 'msp'], maxPorts: 2 },
        { name: 'GPS',                  groups: ['sensors'], maxPorts: 1 },
        { name: 'TELEMETRY_FRSKY',      groups: ['telemetry'], sharableWith: ['msp'], notSharableWith: ['peripherals'], maxPorts: 1 },
        { name: 'TELEMETRY_HOTT',       groups: ['telemetry'], sharableWith: ['msp'], notSharableWith: ['peripherals'], maxPorts: 1 },
        { name: 'TELEMETRY_SMARTPORT',  groups: ['telemetry'], maxPorts: 1 },
        { name: 'RX_SERIAL',            groups: ['rx'], maxPorts: 1 },
        { name: 'BLACKBOX',             groups: ['peripherals'], sharableWith: ['msp'], notSharableWith: ['telemetry'], maxPorts: 1 },
        { name: 'TELEMETRY_LTM',        groups: ['telemetry'], sharableWith: ['msp'], notSharableWith: ['peripherals'], maxPorts: 1 },
        { name: 'TELEMETRY_MAVLINK',    groups: ['telemetry'], sharableWith: ['msp'], notSharableWith: ['peripherals'], maxPorts: 1},
        { name: 'ESC_SENSOR',           groups: ['sensors'], maxPorts: 1 },
        { name: 'TBS_SMARTAUDIO',       groups: ['peripherals'], maxPorts: 1 },
        { name: 'IRC_TRAMP',            groups: ['peripherals'], maxPorts: 1 },
        { name: 'TELEMETRY_IBUS',       groups: ['telemetry'], maxPorts: 1 },
        { name: 'RUNCAM_DEVICE_CONTROL', groups: ['peripherals'], maxPorts: 1 },
        { name: 'LIDAR_TF',             groups: ['peripherals'], maxPorts: 1 },
        { name: 'FRSKY_OSD',            groups: ['peripherals'], maxPorts: 1 },
    ];

    for (const rule of functionRules) {
        rule.displayName = i18n.getMessage(`portsFunction_${rule.name}`);
    }

    let mspBaudRates = [
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '250000',
        '500000',
        '1000000',
    ];

    const gpsBaudRates = [
        'AUTO',
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
    ];

    const telemetryBaudRates = [
        'AUTO',
        '9600',
        '19200',
        '38400',
        '57600',
        '115200',
    ];

    const blackboxBaudRates = [
        'AUTO',
        '19200',
        '38400',
        '57600',
        '115200',
        '230400',
        '250000',
        '1500000',
        '2000000',
        '2470000',
    ];

    const columns = [
        'configuration',
        'peripherals',
        'sensors',
        'telemetry',
        'rx',
    ];

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/ports.html", on_tab_loaded_handler);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_VTX_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP_VTX_CONFIG))
            .then(() => MSP.promise(MSPCodes.MSP2_COMMON_SERIAL_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP2_COMMON_SET_SERIAL_CONFIG, mspHelper.crunch(MSPCodes.MSP2_COMMON_SET_SERIAL_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                GUI.log(i18n.getMessage('deviceRebooting'));
                reinitialiseConnection(callback);
            });
    }

    function setDirty() {
        if (!self.isDirty) {
            self.isDirty = true;
            $('.tab-ports').removeClass('toolbar_hidden');
        }
    }

    function update_ui() {

        $(".tab-ports").addClass("supported");
        $('.tab-ports').addClass('toolbar_hidden');

        const VCP_PORT_IDENTIFIER = 20;

        const portIdentifierToNameMapping = {
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

        let gpsBaudrateElement = $('select.gps_baudrate');
        for (const baudrate of gpsBaudRates) {
            gpsBaudrateElement.append(`<option value="${baudrate}">${baudrate}</option>`);
        }

        let mspBaudrateElement = $('select.msp_baudrate');
        for (const baudrate of mspBaudRates) {
            mspBaudrateElement.append(`<option value="${baudrate}">${baudrate}</option>`);
        }

        let telemetryBaudrateElement = $('select.telemetry_baudrate');
        for (const baudrate of telemetryBaudRates) {
            telemetryBaudrateElement.append(`<option value="${baudrate}">${baudrate}</option>`);
        }

        let blackboxBaudrateElement = $('select.blackbox_baudrate');
        for (const baudrate of blackboxBaudRates) {
            blackboxBaudrateElement.append(`<option value="${baudrate}">${baudrate}</option>`);
        }

        let lastVtxControlSelected;
        const portsElement = $('.tab-ports .ports');
        const portIdentifierTemplateElement = $('#tab-ports-templates .portIdentifier');
        const portConfigurationTemplateElement = $('#tab-ports-templates .portConfiguration');

        for (let portIndex = 0; portIndex < FC.SERIAL_CONFIG.ports.length; portIndex++) {
            const portIdentifierElement = portIdentifierTemplateElement.clone();
            const portConfigurationElement = portConfigurationTemplateElement.clone();
            const serialPort = FC.SERIAL_CONFIG.ports[portIndex];

            portConfigurationElement.data('serialPort', serialPort);

            mspBaudrateElement = portConfigurationElement.find('select.msp_baudrate');
            mspBaudrateElement.val(serialPort.msp_baudrate);

            telemetryBaudrateElement = portConfigurationElement.find('select.telemetry_baudrate');
            telemetryBaudrateElement.val(serialPort.telemetry_baudrate);

            let gpsBaudrate;
            if (serialPort.functions.indexOf('GPS') >= 0) {
                gpsBaudrate = serialPort.gps_baudrate;
            } else {
                gpsBaudrate = 'AUTO';
            }
            gpsBaudrateElement = portConfigurationElement.find('select.gps_baudrate');
            gpsBaudrateElement.val(gpsBaudrate);

            let blackboxBaudrate;
            if (serialPort.functions.indexOf('BLACKBOX') >= 0) {
                blackboxBaudrate = serialPort.blackbox_baudrate;
            } else {
                blackboxBaudrate = 'AUTO';
            }
            blackboxBaudrateElement = portConfigurationElement.find('select.blackbox_baudrate');
            blackboxBaudrateElement.val(blackboxBaudrate);

            portIdentifierElement.find('.identifier').text(portIdentifierToNameMapping[serialPort.identifier]);
            portConfigurationElement.find('.identifier').text(portIdentifierToNameMapping[serialPort.identifier]);

            portConfigurationElement.data('index', portIndex);
            portConfigurationElement.data('port', serialPort);


            for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                const column = columns[columnIndex];

                const functionsElement = $(portConfigurationElement).find(`.functionsCell-${column}`);

                for (let i = 0; i < functionRules.length; i++) {
                    const functionRule = functionRules[i];
                    const functionName = functionRule.name;

                    if (functionRule.groups.indexOf(column) === -1) {
                        continue;
                    }

                    let selectElement;
                    if (column !== 'telemetry' && column !== 'sensors' && column !== 'peripherals') {
                        const checkboxId = `functionCheckbox-${portIndex}-${columnIndex}-${i}`;
                        let longElement = `<span class="function"><input type="checkbox" class="togglemedium" id=`;
                        longElement += `"${checkboxId}" value="${functionName}" /><label for="${checkboxId}"></label></span>`;
                        functionsElement.prepend(longElement);

                        if (serialPort.functions.indexOf(functionName) >= 0) {
                            const checkboxElement = functionsElement.find(`#${checkboxId}`);
                            checkboxElement.prop("checked", true);
                        }

                        if (serialPort.identifier === VCP_PORT_IDENTIFIER && functionName === "MSP") {
                            const checkboxElement = functionsElement.find(`#${checkboxId}`);
                            checkboxElement.prop("checked", true);
                            checkboxElement.prop("disabled", true);
                        }

                    } else {
                        const selectElementName = `function-${column}`;
                        const selectElementSelector = `select[name=${selectElementName}]`;
                        selectElement = functionsElement.find(selectElementSelector);

                        if (selectElement.length === 0) {
                            functionsElement.prepend(`<span class="function"><select name="${selectElementName}" /></span>`);
                            selectElement = functionsElement.find(selectElementSelector);
                            const disabledText = i18n.getMessage('portsTelemetryDisabled');
                            selectElement.append(`<option value="">${disabledText}</option>`);
                        }
                        selectElement.append(`<option value="${functionName}">${functionRule.displayName}</option>`);

                        if (serialPort.functions.indexOf(functionName) >= 0) {
                            selectElement.val(functionName);

                            if (column === 'peripherals' && (functionName === "TBS_SMARTAUDIO" || functionName === "IRC_TRAMP")) {
                                lastVtxControlSelected = functionName;
                            }
                        }

                        if (column === 'telemetry') {
                            const initialValue = functionName;
                            selectElement.change(function () {
                                const telemetryValue = $(this).val();

                                let newValue;
                                if (telemetryValue !== initialValue) {
                                    newValue = $(this).find('option:selected').text();
                                }
                            });
                        }
                    }
                }
            }

            portsElement.find('tbody').append(portIdentifierElement);
            portsElement.find('tbody').append(portConfigurationElement);
        }

        let vtxTableNotConfigured = FC.VTX_CONFIG.vtx_table_available &&
                (FC.VTX_CONFIG.vtx_table_bands === 0 ||
                 FC.VTX_CONFIG.vtx_table_channels === 0 ||
                 FC.VTX_CONFIG.vtx_table_powerlevels === 0);

        const pheripheralsSelectElement = $('select[name="function-peripherals"]');
        pheripheralsSelectElement.change(function() {
            let vtxControlSelected = undefined;
            pheripheralsSelectElement.each(function() {
                const el = $(this);
                if (el.val() === "TBS_SMARTAUDIO" || el.val() === "IRC_TRAMP") {
                    vtxControlSelected = el.val();
                }
            });

            if (lastVtxControlSelected !== vtxControlSelected) {
                lastVtxControlSelected = vtxControlSelected;
            }

            if (vtxControlSelected && vtxTableNotConfigured) {
                $('.vtxTableNotSet').show();
            } else {
                $('.vtxTableNotSet').hide();
            }
        });
        pheripheralsSelectElement.change();
    }

    function on_tab_loaded_handler() {

        i18n.localizePage();

        update_ui();

        self.isDirty = false;

        $('.portChanges').change(function () {
            setDirty();
        });

        self.save = function (callback) {
            on_save_handler(callback);
        };

        self.revert = function (callback) {
            callback();
        };

        $('a.save').click(function () {
            self.save(() => GUI.tab_switch_reload());
        });

        $('a.revert').click(function () {
            self.revert(() => GUI.tab_switch_reload());
        });

        GUI.interval_add('status_pull', function status_pull() {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }

   function on_save_handler(callback) {

        // update configuration based on current ui state
        FC.SERIAL_CONFIG.ports = [];

        $('.tab-ports .portConfiguration').each(function (port, portConfig) {

            const serialPort = $(portConfig).data('serialPort');

            const functions = $(portConfig).find('input:checkbox:checked').map(function() {
                return this.value;
            }).get();

            const telemetryFunction = $(portConfig).find('select[name=function-telemetry]').val();
            if (telemetryFunction) {
                functions.push(telemetryFunction);
            }

            const sensorFunction = $(portConfig).find('select[name=function-sensors]').val();
            if (sensorFunction) {
                functions.push(sensorFunction);
            }

            const peripheralFunction = $(portConfig).find('select[name=function-peripherals]').val();
            if (peripheralFunction) {
                functions.push(peripheralFunction);
            }

            let gpsBaudrate = $(portConfig).find('.gps_baudrate').val();
            if (gpsBaudrate === 'AUTO') {
                gpsBaudrate = '57600';
            }

            let blackboxBaudrate = $(portConfig).find('.blackbox_baudrate').val();
            if (blackboxBaudrate === 'AUTO') {
                blackboxBaudrate = '115200';
            }

            const serialPortConfig = {
                functions: functions,
                msp_baudrate: $(portConfig).find('.msp_baudrate').val(),
                telemetry_baudrate: $(portConfig).find('.telemetry_baudrate').val(),
                gps_baudrate: gpsBaudrate,
                blackbox_baudrate: blackboxBaudrate,
                identifier: serialPort.identifier,
            };
            FC.SERIAL_CONFIG.ports.push(serialPortConfig);
        });

        save_data(callback);
    }
};

TABS.ports.cleanup = function (callback) {
    this.isDirty = false;

    if (callback) callback();
};

'use strict';

TABS.receiver = {
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
    telemetryFeature: false,
    telemetrySensors: 0,
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
        { name: 'CRSF',                 id: 9,   feature: 'RX_SERIAL',    telemetry: 0x0010378F,  visible: true, },
        { name: 'S.BUS',                id: 2,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'F.PORT',               id: 12,  feature: 'RX_SERIAL',    telemetry: 0xFFFFFFFF,  visible: true, },
        { name: 'DSM/1024',             id: 0,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'DSM/2048',             id: 1,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'DSM/SRXL',             id: 10,  feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'DSM/SRXL2',            id: 13,  feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'GHOST',                id: 14,  feature: 'RX_SERIAL',    telemetry: 0xFFFFFFFF,  visible: true, },
        { name: 'SUMD',                 id: 3,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'SUMH',                 id: 4,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'IBUS',                 id: 7,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'XBUS',                 id: 5,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'XBUS/RJ01',            id: 6,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'EXBUS',                id: 8,   feature: 'RX_SERIAL',    telemetry: 0,           visible: true, },
        { name: 'PPM',                  id: 0,   feature: 'RX_PPM',       telemetry: 0,           visible: true, },
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
        { name: 'VOLTAGE',              id:  0, },
        { name: 'CURRENT',              id:  1, },
        { name: 'FUEL_LEVEL',           id:  2, },
        { name: 'USED_CAPACITY',        id: 20, },
        { name: 'TEMPERATURE',          id: 19, },
        { name: 'MODE',                 id:  3, },
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
    ],
};

TABS.receiver.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("./tabs/receiver.html", process_html);
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
                    if (callback) callback();
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
                self.deadband = parseInt($(this).val());
            })
            .change();

        $('input[name="yaw_deadband"]')
            .val(FC.RC_CONFIG.rc_yaw_deadband)
            .change(function () {
                self.yawDeadband = parseInt($(this).val());
            })
            .change();

        $('input[name="stick_center"]')
            .val(FC.RC_CONFIG.rc_center)
            .change(function () {
                self.rcCenter = parseInt($(this).val());
            })
            .change();

        $('input[name="stick_deflection"]')
            .val(FC.RC_CONFIG.rc_deflection)
            .change(function () {
                self.rcDeflection = parseInt($(this).val());
            })
            .change();

        const armThrottle = $('input[name="arm_throttle"]');
        const zeroThrottle = $('input[name="zero_throttle"]');
        const fullThrottle = $('input[name="full_throttle"]');

        armThrottle.val(FC.RC_CONFIG.rc_arm_throttle)
            .change(function () {
                const value = parseInt($(this).val());
                self.rcArmThrottle = value;
                zeroThrottle.attr('min', value + 10);
            })
            .change();

        zeroThrottle.val(FC.RC_CONFIG.rc_min_throttle)
            .change(function () {
                const value = parseInt($(this).val());
                self.rcZeroThrottle = value;
                armThrottle.attr('max', value - 10);
                fullThrottle.attr('min', value + 10);
            })
            .change();

        fullThrottle.val(FC.RC_CONFIG.rc_max_throttle)
            .change(function () {
                const value = parseInt($(this).val());
                self.rcFullThrottle = value;
                zeroThrottle.attr('max', value - 10);
            })
            .change();


    //// RX Mode

        const rxProtoSelectElement = $('select[name="receiverProtocol"]');
        var currentProto = 0;

        self.rxSerialPort = false;
        for (const port of FC.SERIAL_CONFIG.ports) {
            if (port.functionMask & 64)
                self.rxSerialPort = true;
        }

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
            if (FC.RX_CONFIG.serialrx_inverted !== inverted) {
                updateButtons(true);
            }
            FC.RX_CONFIG.serialrx_inverted = inverted;
        });

        serialRxInvertedElement.prop('checked', FC.RX_CONFIG.serialrx_inverted !== 0);

        const serialRxHalfDuplexElement = $('input[name="serial_half_duplex"]');
        serialRxHalfDuplexElement.change(function () {
            const halfduplex = $(this).is(':checked') ? 1 : 0;
            if (FC.RX_CONFIG.serialrx_halfduplex !== halfduplex) {
                updateButtons(true);
            }
            FC.RX_CONFIG.serialrx_halfduplex = halfduplex;
        });

        serialRxHalfDuplexElement.prop('checked', FC.RX_CONFIG.serialrx_halfduplex !== 0);


    //// Telemetry Options

        function populateTelemetrySensors() {
            const templ = $('#telemetrySensorTemplate tr');
            const table = $('.tab-receiver .telemetry_sensors table');
            for (const sensor of self.telemetrySensorList) {
                const state = !!(self.telemetrySensors & (1 << sensor.id));
                const desc = i18n.getMessage(`receiverTelemetrySensor_${sensor.name}`);
                const elem = templ.clone();
                elem.attr('sensor', sensor.id);
                elem.find('span').text(desc);
                elem.find('input').prop('checked', state).change(function () {
                    const checked = $(this).is(':checked');
                    if (checked)
                        self.telemetrySensors |= (1 << sensor.id);
                    else
                        self.telemetrySensors &= ~(1 << sensor.id);
                });
                table.append(elem);
            }
        }

        function updateTelemetrySensors() {
            const sensorList = self.telemetryFeature ?
                (self.telemetryExtSensors | (self.rxProto ? self.rxProto.telemetry : 0)) : 0;
            $('.tab-receiver .telemetry_setting').toggle(self.telemetryExtSensors != 0);
            $('.tab-receiver .telemetry_sensors').toggle(sensorList != 0);
            for (const sensor of self.telemetrySensorList) {
                const state = !!(self.telemetrySensors & (1 << sensor.id));
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

        self.telemetryFeature = FC.FEATURE_CONFIG.features.isEnabled('TELEMETRY');
        self.telemetrySensors = FC.TELEMETRY_CONFIG.telemetry_sensors;

        updateExternalTelemetry();
        populateTelemetrySensors();

        $('.tab-receiver input[name="telemetry_enabled"]').change(function () {
            self.telemetryFeature = $(this).is(':checked');
            FC.FEATURE_CONFIG.features.setFeature('TELEMETRY', self.telemetryFeature);
            updateTelemetrySensors();
        }).prop('checked', self.telemetryFeature).change();

        rxProtoSelectElement.change(updateTelemetrySensors);


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

            chrome.app.window.create("/tabs/receiver_msp.html", {
                id: "receiver_msp",
                innerBounds: {
                    width: windowWidth, height: windowHeight,
                    minWidth: windowWidth, minHeight: windowHeight,
                    maxWidth: windowWidth, maxHeight: windowHeight
                },
                alwaysOnTop: true
            }, function(createdWindow) {
                // Give the window a callback it can use to send the channels (otherwise it can't see those objects)
                createdWindow.contentWindow.setRawRx = function(channels) {
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
                    windowWatcherUtil.passValue(createdWindow, 'darkTheme', isEnabled);
                });

            });
        });

        // Only show the MSP control sticks if the MSP Rx feature is enabled
        self.stickButton = FC.FEATURE_CONFIG.features.isEnabled('RX_MSP');


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

            FC.TELEMETRY_CONFIG.telemetry_sensors = self.telemetrySensors;
        }


    //// Main GUI

        setRcMapGUI();
        updateButtons();

        self.initModelPreview();
        self.renderModel();

        $('.content_wrapper').change(function () {
            self.saveButtons = true;
            updateButtons(true);
        });

        self.save = function(callback) {
            updateConfig();
            save_data(callback);
        };

        self.revert = function(callback) {
            callback();
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
            MSP.send_message(MSPCodes.MSP_ANALOG, false, false, function () {
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

TABS.receiver.initModelPreview = function () {
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

TABS.receiver.renderModel = function () {
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

TABS.receiver.cleanup = function (callback) {
    $(window).off('resize', this.resize);

    this.keepRendering = false;

    if (this.model) {
        $(window).off('resize', $.proxy(this.model.resize, this.model));
        this.model.dispose();
    }

    this.isDirty = false;

    if (callback) callback();
};

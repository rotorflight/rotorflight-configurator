'use strict';

TABS.gps = {};
TABS.gps.initialize = function (callback) {

    if (GUI.active_tab !== 'gps') {
        GUI.active_tab = 'gps';
    }

    function set_online(){
        $('#connect').hide();
        $('#waiting').show();
        $('#loadmap').hide();
    }

    function set_offline(){
        $('#connect').show();
        $('#waiting').hide();
        $('#loadmap').hide();
    }

    function load_msp_status() {
        MSP.send_message(MSPCodes.MSP_STATUS, false, false, load_gps_config);
    }

    function load_gps_config() {
        MSP.send_message(MSPCodes.MSP_GPS_CONFIG, false, false, load_html);
    }

    function load_html() {
        $('#content').load("./tabs/gps.html", process_html);
    }

    load_msp_status();

    function process_html() {

        // To not flicker the divs while the fix is unstable
        let gpsWasFixed = false;

        // generate GPS
        const gpsProtocols = [
            'NMEA',
            'UBLOX',
        ];
        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_41)) {
            gpsProtocols.push('MSP');
        }

        const gpsBaudRates = [
            '115200',
            '57600',
            '38400',
            '19200',
            '9600',
        ];

        const gpsSbas = [
            i18n.getMessage('gpsSbasAutoDetect'),
            i18n.getMessage('gpsSbasEuropeanEGNOS'),
            i18n.getMessage('gpsSbasNorthAmericanWAAS'),
            i18n.getMessage('gpsSbasJapaneseMSAS'),
            i18n.getMessage('gpsSbasIndianGAGAN'),
        ];
        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43)) {
            gpsSbas.push(i18n.getMessage('gpsSbasNone'));
        }

        const gpsProtocolElement = $('select.gps_protocol');
        const gpsAutoBaudElement = $('input[name="gps_auto_baud"]');
        const gpsAutoBaudGroup = $('.gps_auto_baud');
        const gpsAutoConfigElement = $('input[name="gps_auto_config"]');
        const gpsAutoConfigGroup = $('.gps_auto_config');
        const gpsUbloxGalileoElement = $('input[name="gps_ublox_galileo"]');
        const gpsUbloxGalileoGroup = $('.gps_ublox_galileo');
        const gpsUbloxSbasElement = $('select.gps_ubx_sbas');
        const gpsUbloxSbasGroup = $('.gps_ubx_sbas');
        const gpsHomeOnceElement = $('input[name="gps_home_once"]');
        const gpsBaudrateElement = $('select.gps_baudrate');

        for (let protocolIndex = 0; protocolIndex < gpsProtocols.length; protocolIndex++) {
            gpsProtocolElement.append(`<option value="${protocolIndex}">${gpsProtocols[protocolIndex]}</option>`);
        }

        gpsProtocolElement.change(function () {
            FC.GPS_CONFIG.provider = parseInt($(this).val());
            // Call this to enable or disable auto config elements depending on the protocol
            gpsAutoConfigElement.change();
        }).val(FC.GPS_CONFIG.provider).change();

        gpsAutoBaudElement.prop('checked', FC.GPS_CONFIG.auto_baud === 1);

        gpsAutoConfigElement.change(function () {
            const checked = $(this).is(":checked");
            const ubloxSelected = FC.GPS_CONFIG.provider === gpsProtocols.indexOf('UBLOX');
            const enableGalileoVisible = checked && ubloxSelected && semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43);
            gpsUbloxGalileoGroup.toggle(enableGalileoVisible);
            const enableSbasVisible = checked && ubloxSelected;
            gpsUbloxSbasGroup.toggle(enableSbasVisible);
        }).prop('checked', FC.GPS_CONFIG.auto_config === 1).change();

        if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_34)) {
            gpsAutoBaudGroup.show();
            gpsAutoConfigGroup.show();
        } else {
            gpsAutoBaudGroup.hide();
            gpsAutoConfigGroup.hide();
        }

        gpsUbloxGalileoElement.change(function() {
            FC.GPS_CONFIG.ublox_use_galileo = $(this).is(':checked') ? 1 : 0;
        }).prop('checked', FC.GPS_CONFIG.ublox_use_galileo > 0).change();

        for (let sbasIndex = 0; sbasIndex < gpsSbas.length; sbasIndex++) {
            gpsUbloxSbasElement.append(`<option value="${sbasIndex}">${gpsSbas[sbasIndex]}</option>`);
        }

        gpsUbloxSbasElement.change(function () {
            FC.GPS_CONFIG.ublox_sbas = parseInt($(this).val());
        }).val(FC.GPS_CONFIG.ublox_sbas);

        $('.gps_home_once').toggle(semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_43));
        gpsHomeOnceElement.change(function() {
            FC.GPS_CONFIG.home_point_once = $(this).is(':checked') ? 1 : 0;
        }).prop('checked', FC.GPS_CONFIG.home_point_once > 0).change();

        for (let baudRateIndex = 0; baudRateIndex < gpsBaudRates.length; baudRateIndex++) {
            gpsBaudrateElement.append(`<option value="${gpsBaudRates[baudRateIndex]}">${gpsBaudRates[baudRateIndex]}</option>`);
        }

        if (semver.lt(FC.CONFIG.apiVersion, "1.6.0")) {
            gpsBaudrateElement.change(function () {
                FC.SERIAL_CONFIG.gpsBaudRate = parseInt($(this).val());
            });
            gpsBaudrateElement.val(FC.SERIAL_CONFIG.gpsBaudRate);
        } else {
            gpsBaudrateElement.prop("disabled", true);
            gpsBaudrateElement.parent().hide();
        }

        // translate to user-selected languageconsole.log('Online');
        i18n.localizePage();

        function update_ui() {
            const alt = FC.GPS_DATA.alt;
            const lat = FC.GPS_DATA.lat / 10000000;
            const lon = FC.GPS_DATA.lon / 10000000;
            const url = `https://maps.google.com/?q=${lat},${lon}`;

            $('.GPS_info td.fix').html((FC.GPS_DATA.fix) ? i18n.getMessage('gpsFixTrue') : i18n.getMessage('gpsFixFalse'));
            $('.GPS_info td.alt').text(alt + ' m');
            $('.GPS_info td.lat a').prop('href', url).text(lat.toFixed(4) + ' deg');
            $('.GPS_info td.lon a').prop('href', url).text(lon.toFixed(4) + ' deg');
            $('.GPS_info td.speed').text(FC.GPS_DATA.speed + ' cm/s');
            $('.GPS_info td.sats').text(FC.GPS_DATA.numSat);
            $('.GPS_info td.distToHome').text(FC.GPS_DATA.distanceToHome + ' m');

            // Update GPS Signal Strengths
            const eSsTable = $('div.GPS_signal_strength table tr:not(.titles)');

            for (let i = 0; i < FC.GPS_DATA.chn.length; i++) {
                const row = eSsTable.eq(i);
                $('td', row).eq(0).text(FC.GPS_DATA.svid[i]);
                $('td', row).eq(1).text(FC.GPS_DATA.quality[i]);
                $('td', row).eq(2).find('progress').val(FC.GPS_DATA.cno[i]);
            }

            const message = {
                action: 'center',
                lat: lat,
                lon: lon
            };

            const frame = document.getElementById('map');

            if (navigator.onLine) {
                $('#connect').hide();
                if (FC.GPS_DATA.fix) {
                   gpsWasFixed = true;
                   frame.contentWindow.postMessage(message, '*');
                   $('#loadmap').show();
                   $('#waiting').hide();
                } else if (!gpsWasFixed) {
                   $('#loadmap').hide();
                   $('#waiting').show();
                } else {
                    message.action = 'nofix';
                    frame.contentWindow.postMessage(message, '*');
                }
            } else {
                gpsWasFixed = false;
                $('#connect').show();
                $('#waiting').hide();
                $('#loadmap').hide();
            }
        }

        function get_raw_gps_data() {
            MSP.send_message(MSPCodes.MSP_RAW_GPS, false, false, get_comp_gps_data);
        }

        function get_comp_gps_data() {
            MSP.send_message(MSPCodes.MSP_COMP_GPS, false, false, get_gpsvinfo_data);
        }

        function get_gpsvinfo_data() {
            MSP.send_message(MSPCodes.MSP_GPS_SV_INFO, false, false, update_ui);
        }

        // enable data pulling
        GUI.interval_add('gps_pull', function() {
            get_raw_gps_data();
        }, 75, true);

        // status data pulled via separate timer with static speed
        GUI.interval_add('status_pull', function() {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        //check for internet connection on load
        if (navigator.onLine) {
            console.log('Online');
            set_online();
        } else {
            console.log('Offline');
            set_offline();
        }

        $("#check").on('click',function(){
            if (navigator.onLine) {
                console.log('Online');
                set_online();
            } else {
                console.log('Offline');
                set_offline();
            }
        });

        $('#zoom_in').click(function() {
            console.log('zoom in');
            const message = {
                action: 'zoom_in'
            };
            frame.contentWindow.postMessage(message, '*');
        });

        $('#zoom_out').click(function() {
            console.log('zoom out');
            const message = {
                action: 'zoom_out'
            };
            frame.contentWindow.postMessage(message, '*');
        });

        $('a.save').on('click', function() {

            if (semver.gte(FC.CONFIG.apiVersion, API_VERSION_1_34)) {
                FC.GPS_CONFIG.auto_baud = $('input[name="gps_auto_baud"]').is(':checked') ? 1 : 0;
                FC.GPS_CONFIG.auto_config = $('input[name="gps_auto_config"]').is(':checked') ? 1 : 0;
            }

            function save_gps_config() {
                MSP.send_message(MSPCodes.MSP_SET_GPS_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_GPS_CONFIG), false, save_to_eeprom);
            }

            function save_to_eeprom() {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, reboot);
            }

            function reboot() {
                GUI.log(i18n.getMessage('configurationEepromSaved'));
                GUI.tab_switch_cleanup(function() {
                    MSP.send_message(MSPCodes.MSP_SET_REBOOT, false, false);
                    reinitialiseConnection(self);
                });
            }

            save_gps_config();
        });

        GUI.content_ready(callback);
    }

};

TABS.gps.cleanup = function (callback) {
    if (callback) callback();
};

const tab = {
    tabName: 'gps',
    isDirty: false,
};

tab.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("/src/tabs/gps.html", process_html);
    }

    function load_data(callback) {
        MSP.promise(MSPCodes.MSP_STATUS)
            .then(() => MSP.promise(MSPCodes.MSP_GPS_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_GPS_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_GPS_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                MSP.send_message(MSPCodes.MSP_SET_REBOOT);
                GUI.log(i18n.getMessage('deviceRebooting'));
                reinitialiseConnection(callback);
            });
    }

    function process_html() {

        // Hide the buttons toolbar
        $('.tab-gps').addClass('toolbar_hidden');

        // To not flicker the divs while the fix is unstable
        let gpsWasFixed = false;

        // generate GPS
        const gpsProtocols = [
            'NMEA',
            'UBLOX',
            'MSP',
        ];

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
            i18n.getMessage('gpsSbasNone'),
        ];

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

        gpsAutoBaudElement.change(function () {
            const checked = $(this).is(":checked");
            FC.GPS_CONFIG.auto_baud = checked ? 1 : 0;
        }).prop('checked', FC.GPS_CONFIG.auto_baud > 0);

        gpsAutoConfigElement.change(function () {
            const checked = $(this).is(":checked");
            const ubloxSelected = (FC.GPS_CONFIG.provider === gpsProtocols.indexOf('UBLOX'));
            const enableGalileoVisible = checked && ubloxSelected;
            gpsUbloxGalileoGroup.toggle(enableGalileoVisible);
            const enableSbasVisible = checked && ubloxSelected;
            gpsUbloxSbasGroup.toggle(enableSbasVisible);
            FC.GPS_CONFIG.auto_config = checked ? 1 : 0;
        }).prop('checked', FC.GPS_CONFIG.auto_config > 0).change();

        gpsAutoBaudGroup.show();
        gpsAutoConfigGroup.show();

        gpsUbloxGalileoElement.change(function() {
            const checked = $(this).is(":checked");
            FC.GPS_CONFIG.ublox_use_galileo = checked ? 1 : 0;
        }).prop('checked', FC.GPS_CONFIG.ublox_use_galileo > 0).change();

        for (let sbasIndex = 0; sbasIndex < gpsSbas.length; sbasIndex++) {
            gpsUbloxSbasElement.append(`<option value="${sbasIndex}">${gpsSbas[sbasIndex]}</option>`);
        }

        gpsUbloxSbasElement.change(function () {
            FC.GPS_CONFIG.ublox_sbas = parseInt($(this).val());
        }).val(FC.GPS_CONFIG.ublox_sbas);

        gpsHomeOnceElement.change(function() {
            const checked = $(this).is(":checked");
            FC.GPS_CONFIG.home_point_once = checked ? 1 : 0;
        }).prop('checked', FC.GPS_CONFIG.home_point_once > 0).change();

        for (let baudRateIndex = 0; baudRateIndex < gpsBaudRates.length; baudRateIndex++) {
            gpsBaudrateElement.append(`<option value="${gpsBaudRates[baudRateIndex]}">${gpsBaudRates[baudRateIndex]}</option>`);
        }

        gpsBaudrateElement.prop("disabled", true);
        gpsBaudrateElement.parent().hide();

        const mapFrame = document.getElementById('map');

        // translate to user-selected language
        i18n.localizePage();

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-gps').removeClass('toolbar_hidden');
            }
        }

        function update_ui() {

            const alt = FC.GPS_DATA.alt;
            const lat = FC.GPS_DATA.lat / 10000000;
            const lon = FC.GPS_DATA.lon / 10000000;

            const url = `https://maps.google.com/?q=${lat},${lon}`;

            $('.gpsFix').html((FC.GPS_DATA.fix) ? i18n.getMessage('gpsFixYes') : i18n.getMessage('gpsFixNo'));

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

            if (navigator.onLine) {
                $('#connect').hide();
                if (FC.GPS_DATA.fix) {
                   gpsWasFixed = true;
                   mapFrame.contentWindow.postMessage(message, '*');
                   $('#loadmap').show();
                   $('#waiting').hide();
                } else if (!gpsWasFixed) {
                   $('#loadmap').hide();
                   $('#waiting').show();
                } else {
                    message.action = 'nofix';
                    mapFrame.contentWindow.postMessage(message, '*');
                }
            } else {
                gpsWasFixed = false;
                $('#connect').show();
                $('#waiting').hide();
                $('#loadmap').hide();
            }
        }

        function set_online_status(online){
            console.log(online ? 'Online Status: Connected' : 'Online Status: Disconnected');
            $('#connect').toggle(!online);
            $('#waiting').toggle(online);
            $('#loadmap').toggle(online);
        }

        set_online_status(navigator.onLine);

        $("#check").on('click',function(){
            set_online_status(navigator.onLine);
        });

        $('#zoom_in').click(function() {
            console.log('zoom in');
            mapFrame.contentWindow.postMessage({ action: 'zoom_in' }, '*');
        });

        $('#zoom_out').click(function() {
            console.log('zoom out');
            mapFrame.contentWindow.postMessage({ action: 'zoom_out' }, '*');
        });

        self.save = function (callback) {
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

        $('.GPS_settings').change(function () {
            setDirty();
        });

        GUI.interval_add('gps_pull', function() {
            MSP.send_message(MSPCodes.MSP_RAW_GPS, false, false, () =>
            MSP.send_message(MSPCodes.MSP_COMP_GPS, false, false, () =>
            MSP.send_message(MSPCodes.MSP_GPS_SV_INFO, false, false, () =>
            update_ui() )));
        }, 75, true);

        GUI.interval_add('status_pull', function() {
            MSP.send_message(MSPCodes.MSP_STATUS);
        }, 250, true);

        GUI.content_ready(callback);
    }

};

tab.cleanup = function (callback) {
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

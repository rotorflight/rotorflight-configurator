'use strict';

TABS.beepers = {};

TABS.beepers.initialize = function (callback) {
    const self = this;

    if (GUI.active_tab != 'beepers') {
        GUI.active_tab = 'beepers';
    }

    load_beepers_config();

    function load_beepers_config() {
        MSP.send_message(MSPCodes.MSP_BEEPER_CONFIG, false, false, load_html);
    }

    function load_html() {
        $('#content').load("./tabs/beepers.html", process_html);
    }

    function process_html() {

        // Dshot Beeper
        const dshotBeeper_e = $('.tab-beepers .dshotbeeper');
        const dshotBeacon_e = $('.tab-beepers .dshotbeacon');
        const dshotBeeperBeaconTone = $('select.dshotBeeperBeaconTone');
        const dshotBeaconCondition_e = $('tbody.dshotBeaconConditions');

        for (let i = 1; i <= 5; i++) {
            dshotBeeperBeaconTone.append('<option value="' + (i) + '">'+ (i) + '</option>');
        }
        dshotBeeper_e.show();

        dshotBeeperBeaconTone.change(function() {
            FC.BEEPER_CONFIG.dshotBeaconTone = dshotBeeperBeaconTone.val();
        });

        dshotBeeperBeaconTone.val(FC.BEEPER_CONFIG.dshotBeaconTone);

        const template = $('.beepers .beeper-template');

        FC.BEEPER_CONFIG.dshotBeaconConditions.generateElements(template, dshotBeaconCondition_e);

        $('input.condition', dshotBeaconCondition_e).change(function () {
            const element = $(this);
            FC.BEEPER_CONFIG.dshotBeaconConditions.updateData(element);
        });

        // Analog Beeper
        const destination = $('.beepers .beeper-configuration');
        const beeper_e = $('.tab-beepers .beepers');

        FC.BEEPER_CONFIG.beepers.generateElements(template, destination);

        // translate to user-selected language
        i18n.localizePage();

        $('input.condition', beeper_e).change(function () {
            const element = $(this);
            FC.BEEPER_CONFIG.beepers.updateData(element);
        });

        $('a.save').click(function() {

            function save_beeper_config() {
                MSP.send_message(MSPCodes.MSP_SET_BEEPER_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_BEEPER_CONFIG), false, save_to_eeprom);
            }

            function save_to_eeprom() {
                MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, save_completed);
            }

            function save_completed() {
                GUI.log(i18n.getMessage('beepersEepromSaved'));
                TABS.beepers.initialize();
            }

            save_beeper_config();
        });

        GUI.content_ready(callback);
    }
};

TABS.beepers.cleanup = function (callback) {
    if (callback) callback();
};

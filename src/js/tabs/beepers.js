TABS.beepers = {
    isDirty: false,
};

TABS.beepers.initialize = function (callback) {
    const self = this;

    load_data(load_html);

    function load_html() {
        $('#content').load("/src/tabs/beepers.html", process_html);
    }

    function load_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_STATUS))
            .then(() => MSP.promise(MSPCodes.MSP_BEEPER_CONFIG))
            .then(callback);
    }

    function save_data(callback) {
        Promise.resolve(true)
            .then(() => MSP.promise(MSPCodes.MSP_SET_BEEPER_CONFIG, mspHelper.crunch(MSPCodes.MSP_SET_BEEPER_CONFIG)))
            .then(() => MSP.promise(MSPCodes.MSP_EEPROM_WRITE))
            .then(() => {
                GUI.log(i18n.getMessage('eepromSaved'));
                callback?.();
            });
    }

    function process_html() {

        // translate to user-selected language
        i18n.localizePage();

        // Hide the buttons toolbar
        $('.tab-beepers').addClass('toolbar_hidden');

        self.isDirty = false;

        function setDirty() {
            if (!self.isDirty) {
                self.isDirty = true;
                $('.tab-beepers').removeClass('toolbar_hidden');
            }
        }

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

        $('input.condition', beeper_e).change(function () {
            const element = $(this);
            FC.BEEPER_CONFIG.beepers.updateData(element);
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

        $('.content_wrapper').change(function () {
            setDirty();
        });

        GUI.content_ready(callback);
    }
};

TABS.beepers.cleanup = function (callback) {
    this.isDirty = false;

    callback?.();
};

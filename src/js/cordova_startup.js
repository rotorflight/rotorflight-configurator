import * as config from "@/js/config.js";

export const cordovaUI = {
    uiZoom: 1,
    canChangeUI: true,
    init: async function() {
        const self = this;
        const screenWidth = $(window).width();
        const screenHeight = $(window).height();
        let length;
        let orientation;
        if (screenWidth > screenHeight) {
            length = screenWidth;
            orientation = 'landscape';
        } else {
            length = screenHeight;
            orientation = 'portrait';
        }
        if (length < 1024) {
            self.uiZoom = length/1024;
        }
        if (screenWidth > 575 && screenHeight > 575) {
            self.canChangeUI = false;
        }

        if (config.get('cordovaForceComputerUI') === undefined) {
            if ((orientation === 'landscape' && screenHeight <= 575)
                || (orientation === 'portrait' && screenWidth <= 575)) {
                config.set({'cordovaForceComputerUI': false});
            } else {
                config.set({'cordovaForceComputerUI': true});
            }
        }
        self.set();
    },
    set: function() {
        if (config.get('cordovaForceComputerUI')) {
            window.screen.orientation.lock('landscape');
            $('body').css('zoom', this.uiZoom);
        } else {
            window.screen.orientation.lock('portrait');
            $('body').css('zoom', 1);
        }
    },
};

export const cordovaApp = {
    initialize: function() {
        this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() {
        $('.open_firmware_flasher, .tab_firmware_flasher').hide();
        cordovaUI.init();
        navigator.splashscreen.hide();
        cordovaChromeapi.init();
        appReady();
    },
};

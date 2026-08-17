const docsVersionSpecifier = '/2.3.0';

// default URL
const defaultHelpURL = 'https://www.rotorflight.org/';

// tab specific URLs
const tabHelpURLs = {

    tabStatus:          `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/status`,
    tabSetup:           `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/setup`,
    tabConfiguration:   `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/configuration`,
    tabPresets:         `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/presets`,
    tabReceiver:        `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/receiver`,
    tabFailsafe:        `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/failsafe`,
    tabPower:           `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/power`,
    tabMotors:          `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/motors`,
    tabServos:          `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/servos`,
    tabMixer:           `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/mixer`,
    tabGyro:            `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/gyro`,
    tabRates:           `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/rates`,
    tabProfiles:        `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/profiles`,
    tabAuxiliary:       `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/modes`,
    tabAdjustments:     `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/adjustments`,
    tabLedStrip:        `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/led-strip`,
    tabBeepers:         `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/beepers`,
    tabGPS:             `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/gps`,
    tabSensors:         `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/sensors`,
    tabBlackbox:        `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/blackbox`,
    tabFbusSensors:     `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/fbus-sensors`,
    tabCli:             `https://www.rotorflight.org/docs${docsVersionSpecifier}/configurator/tabs/cli`,
};

export function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}

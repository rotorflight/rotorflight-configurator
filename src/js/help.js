// default URL
const defaultHelpURL = 'https://www.rotorflight.org/';

const docsVersion = '2.3.0';

// tab specific URLs
const tabHelpURLs = {

    tabStatus:          `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/status`,
    tabSetup:           `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/setup`,
    tabConfiguration:   `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/configuration`,
    tabPresets:         `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/presets`,
    tabReceiver:        `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/receiver`,
    tabFailsafe:        `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/failsafe`,
    tabPower:           `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/power`,
    tabMotors:          `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/motors`,
    tabServos:          `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/servos`,
    tabMixer:           `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/mixer`,
    tabGyro:            `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/gyro`,
    tabRates:           `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/rates`,
    tabProfiles:        `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/profiles`,
    tabAuxiliary:       `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/modes`,
    tabAdjustments:     `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/adjustments`,
    tabLedStrip:        `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/led-strip`,
    tabBeepers:         `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/beepers`,
    tabGPS:             `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/gps`,
    tabSensors:         `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/sensors`,
    tabBlackbox:        `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/blackbox`,
    tabCli:             `https://www.rotorflight.org/docs/${docsVersion}/configurator/tabs/cli`,
};

export function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}


// default URL
const defaultHelpURL = 'https://www.rotorflight.org/';

// tab specific URLs
const tabHelpURLs = {

    tabStatus:          'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/status',
    tabSetup:           'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/setup',
    tabConfiguration:   'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/configuration',
    tabPresets:         'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/presets',
    tabReceiver:        'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/receiver',
    tabFailsafe:        'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/failsafe',
    tabPower:           'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/power',
    tabMotors:          'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/motors',
    tabServos:          'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/servos',
    tabMixer:           'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/mixer',
    tabGyro:            'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/gyro',
    tabRates:           'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/rates',
    tabProfiles:        'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/profiles',
    tabAuxiliary:       'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/modes',
    tabAdjustments:     'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/adjustments',
    tabLedStrip:        'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/led-strip',
    tabBeepers:         'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/beepers',
    tabGPS:             'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/gps',
    tabSensors:         'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/sensors',
    tabBlackbox:        'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/blackbox',
    tabCli:             'https://www.rotorflight.org/docs/2.2.0/configurator/tabs/cli',
};

export function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}

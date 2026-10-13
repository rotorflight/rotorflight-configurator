// default URL
const defaultHelpURL = 'https://doc.rotorflight.org/';

// tab specific URLs
const tabHelpURLs = {

    tabStatus:          'https://doc.rotorflight.org/configurator/tabs/status/',
    tabSetup:           'https://doc.rotorflight.org/configurator/tabs/setup/',
    tabConfiguration:   'https://doc.rotorflight.org/configurator/tabs/configuration/',
    tabPresets:         'https://doc.rotorflight.org/configurator/tabs/presets/',
    tabReceiver:        'https://doc.rotorflight.org/configurator/tabs/receiver/',
    tabFailsafe:        'https://doc.rotorflight.org/configurator/tabs/failsafe/',
    tabPower:           'https://doc.rotorflight.org/configurator/tabs/power/',
    tabMotors:          'https://doc.rotorflight.org/configurator/tabs/motors/',
    tabGovernor:        'https://doc.rotorflight.org/configurator/tabs/governor/',
    tabServos:          'https://doc.rotorflight.org/configurator/tabs/servos/',
    tabXactServoProgramming: 'https://doc.rotorflight.org/configurator/tabs/xact-servo/',
    tabMixer:           'https://doc.rotorflight.org/configurator/tabs/mixer/',
    tabGyro:            'https://doc.rotorflight.org/configurator/tabs/gyro/',
    tabRates:           'https://doc.rotorflight.org/configurator/tabs/rates/',
    tabProfiles:        'https://doc.rotorflight.org/configurator/tabs/profiles/',
    tabAuxiliary:       'https://doc.rotorflight.org/configurator/tabs/modes/',
    tabAdjustments:     'https://doc.rotorflight.org/configurator/tabs/adjustments/',
    tabLedStrip:        'https://doc.rotorflight.org/configurator/tabs/led-strip/',
    tabBeepers:         'https://doc.rotorflight.org/configurator/tabs/beepers/',
    tabGPS:             'https://doc.rotorflight.org/configurator/tabs/gps/',
    tabSensors:         'https://doc.rotorflight.org/configurator/tabs/sensors/',
    tabCrsfSensors:     'https://doc.rotorflight.org/configurator/tabs/crsf-sensors/',
    tabBlackbox:        'https://doc.rotorflight.org/configurator/tabs/blackbox/',
    tabRemapFC:         'https://doc.rotorflight.org/configurator/tabs/remap-fc/',
    tabCli:             'https://doc.rotorflight.org/configurator/tabs/cli/',
};

export function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}

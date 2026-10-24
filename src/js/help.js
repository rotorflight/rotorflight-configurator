// default URL
const defaultHelpURL = 'https://doc.rotorflight.org/2.4/';

// tab specific URLs
const tabHelpURLs = {

    tabStatus:          'https://doc.rotorflight.org/2.4/configurator/tabs/status/',
    tabSetup:           'https://doc.rotorflight.org/2.4/configurator/tabs/setup/',
    tabConfiguration:   'https://doc.rotorflight.org/2.4/configurator/tabs/configuration/',
    tabPresets:         'https://doc.rotorflight.org/2.4/configurator/tabs/presets/',
    tabReceiver:        'https://doc.rotorflight.org/2.4/configurator/tabs/receiver/',
    tabFailsafe:        'https://doc.rotorflight.org/2.4/configurator/tabs/failsafe/',
    tabPower:           'https://doc.rotorflight.org/2.4/configurator/tabs/power/',
    tabMotors:          'https://doc.rotorflight.org/2.4/configurator/tabs/motors/',
    tabGovernor:        'https://doc.rotorflight.org/2.4/configurator/tabs/governor/',
    tabServos:          'https://doc.rotorflight.org/2.4/configurator/tabs/servos/',
    tabXactServoProgramming: 'https://doc.rotorflight.org/2.4/configurator/tabs/xact-servo/',
    tabMixer:           'https://doc.rotorflight.org/2.4/configurator/tabs/mixer/',
    tabGyro:            'https://doc.rotorflight.org/2.4/configurator/tabs/gyro/',
    tabRates:           'https://doc.rotorflight.org/2.4/configurator/tabs/rates/',
    tabProfiles:        'https://doc.rotorflight.org/2.4/configurator/tabs/profiles/',
    tabAuxiliary:       'https://doc.rotorflight.org/2.4/configurator/tabs/modes/',
    tabAdjustments:     'https://doc.rotorflight.org/2.4/configurator/tabs/adjustments/',
    tabLedStrip:        'https://doc.rotorflight.org/2.4/configurator/tabs/led-strip/',
    tabBeepers:         'https://doc.rotorflight.org/2.4/configurator/tabs/beepers/',
    tabGPS:             'https://doc.rotorflight.org/2.4/configurator/tabs/gps/',
    tabSensors:         'https://doc.rotorflight.org/2.4/configurator/tabs/sensors/',
    tabCrsfSensors:     'https://doc.rotorflight.org/2.4/configurator/tabs/crsf-sensors/',
    tabFbusSensors:     'https://doc.rotorflight.org/2.4/configurator/tabs/fbus-sensors/',
    tabBlackbox:        'https://doc.rotorflight.org/2.4/configurator/tabs/blackbox/',
    tabRemapFC:         'https://doc.rotorflight.org/2.4/configurator/tabs/remap-fc/',
    tabCli:             'https://doc.rotorflight.org/2.4/configurator/tabs/cli/',
};

export function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}

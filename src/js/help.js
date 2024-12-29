
// default URL
const defaultHelpURL = 'https://www.rotorflight.org/';

// tab specific URLs
const tabHelpURLs = {

    tabStatus:          'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Status',
    tabSetup:           'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Setup',
    tabConfiguration:   'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Configuration',
    tabReceiver:        'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Receiver',
    tabFailsafe:        'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Failsafe',
    tabPower:           'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Power',
    tabMotors:          'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Motor-and-Esc',
    tabServos:          'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Servos',
    tabMixer:           'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Mixer',
    tabGyro:            'https://www.rotorflight.org/docs/2.1.0/Wiki/Tutorial-Setup/RPM-Filters',
    tabRates:           'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Rates',
    tabProfiles:        'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Profiles',
    tabAuxiliary:       'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Modes',
    tabAdjustments:     'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Adjustments',
    tabLedStrip:        'https://www.rotorflight.org/docs/2.1.0/Wiki/Tutorial-Setup/led-strip-quick-start',
    tabBeepers:         'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Beepers',
    tabGPS:             'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Gps',
    tabSensors:         'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Sensors',
    tabBlackbox:        'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/Blackbox',
    tabCli:             'https://www.rotorflight.org/docs/2.1.0/Wiki/Configurator/CLI',
};

export function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}


// default URL
const defaultHelpURL = 'https://www.rotorflight.org/';

// tab specific URLs
const tabHelpURLs = {
    tabStatus:          'https://www.rotorflight.org/docs/Wiki/Configurator/Status',
    tabSetup:           'https://www.rotorflight.org/docs/Wiki/Configurator/Setup',
    tabConfiguration:   'https://www.rotorflight.org/docs/Wiki/Configurator/Configuration',
    tabReceiver:        'https://www.rotorflight.org/docs/Wiki/Configurator/Receiver',
    tabFailsafe:        'https://www.rotorflight.org/docs/Wiki/Configurator/Failsafe',
    tabPower:           'https://www.rotorflight.org/docs/Wiki/Configurator/Power',
    tabMotors:          'https://www.rotorflight.org/docs/Wiki/Configurator/Motor-and-Esc',
    tabServos:          'https://www.rotorflight.org/docs/Wiki/Configurator/Servos',
    tabMixer:           'https://www.rotorflight.org/docs/Wiki/Configurator/Mixer',
    tabGyro:            'https://www.rotorflight.org/docs/Wiki/Tutorial-Setup/RPM-Filters',
    tabRates:           'https://www.rotorflight.org/docs/Wiki/Configurator/Rates',
    tabProfiles:        'https://www.rotorflight.org/docs/Wiki/Configurator/Profiles',
    tabAuxiliary:       'https://www.rotorflight.org/docs/Wiki/Configurator/Modes',
    tabAdjustments:     'https://www.rotorflight.org/docs/Wiki/Configurator/Adjustments',
    tabLedStrip:        'https://www.rotorflight.org/docs/Wiki/Tutorial-Setup/led-strip-quick-start',
    tabBeepers:         'https://www.rotorflight.org/docs/Wiki/Configurator/Beepers',
    tabGPS:             'https://www.rotorflight.org/docs/Wiki/Configurator/Gps',
    tabSensors:         'https://www.rotorflight.org/docs/Wiki/Configurator/Sensors',
    tabBlackbox:        'https://www.rotorflight.org/docs/Wiki/Configurator/Blackbox',
    tabCli:             'https://www.rotorflight.org/docs/Wiki/Configurator/CLI',
};

export function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}


// default URL
const defaultHelpURL = 'https://www.rotorflight.org/';

// tab specific URLs
const tabHelpURLs = {
    tabStatus:          '',
    tabSetup:           '',
    tabConfiguration:   'https://www.rotorflight.org/docs/Tutorial-Setup/Configuration',
    tabReceiver:        'https://www.rotorflight.org/docs/Tutorial-Setup/Receiver',
    tabFailsafe:        'https://www.rotorflight.org/docs/Tutorial-Setup/Failsafe',
    tabBeepers:         'https://www.rotorflight.org/docs/Tutorial-Setup/Beepers',
    tabPower:           'https://www.rotorflight.org/docs/Tutorial-Setup/Power',
    tabGyro:            'https://www.rotorflight.org/docs/Tutorial-Setup/RPM-Filters',
    tabMotors:          'https://www.rotorflight.org/docs/Tutorial-Setup/Motor-and-Esc',
    tabServos:          'https://www.rotorflight.org/docs/Tutorial-Setup/Servos',
    tabMixer:           'https://www.rotorflight.org/docs/Tutorial-Setup/Mixer',
    tabRates:           'https://www.rotorflight.org/docs/Tutorial-Setup/Rates',
    tabProfiles:        'https://www.rotorflight.org/docs/Tutorial-Setup/Profiles',
    tabAuxiliary:       'https://www.rotorflight.org/docs/Tutorial-Setup/Modes',
    tabAdjustments:     'https://www.rotorflight.org/docs/Tutorial-Setup/Adjustments',
    tabSensors:         'https://www.rotorflight.org/docs/Tutorial-Setup/Sensors',
    tabBlackbox:        'https://www.rotorflight.org/docs/Tutorial-Setup/Blackbox',
    tabCli:             'https://www.rotorflight.org/docs/Tutorial-Setup/CLI',
};

function getTabHelpURL(tabName)
{
    if (tabName && tabHelpURLs[tabName])
        return tabHelpURLs[tabName];

    return defaultHelpURL;
}

//define lookup table
const wiki = [];
wiki["tabStatus"]           = '';
wiki["tabSetup"]            = '';
wiki["tabConfiguration"]    = 'https://www.rotorflight.org/docs/Tutorial-Setup/Configuration';
wiki["tabReceiver"]         = 'https://www.rotorflight.org/docs/Tutorial-Setup/Receiver';
wiki["tabFailsafe"]         = 'https://www.rotorflight.org/docs/Tutorial-Setup/Failsafe';
wiki["tabBeepers"]          = 'https://www.rotorflight.org/docs/Tutorial-Setup/Beepers';
wiki["tabPower"]            = 'https://www.rotorflight.org/docs/Tutorial-Setup/Power';
wiki["tabGyro"]             = 'https://www.rotorflight.org/docs/Tutorial-Setup/RPM-Filters';
wiki["tabMotors"]           = 'https://www.rotorflight.org/docs/Tutorial-Setup/Motor-and-Esc';
wiki["tabServos"]           = 'https://www.rotorflight.org/docs/Tutorial-Setup/Servos';
wiki["tabMixer"]            = 'https://www.rotorflight.org/docs/Tutorial-Setup/Mixer';
wiki["tabRates"]            = 'https://www.rotorflight.org/docs/Tutorial-Setup/Rates';
wiki["tabProfiles"]         = 'https://www.rotorflight.org/docs/Tutorial-Setup/Profiles';
wiki["tabAuxiliary"]        = 'https://www.rotorflight.org/docs/Tutorial-Setup/Modes';
wiki["tabAdjustments"]      = 'https://www.rotorflight.org/docs/Tutorial-Setup/Adjustments';
wiki["tabSensors"]          = 'https://www.rotorflight.org/docs/Tutorial-Setup/Sensors';
wiki["tabBlackbox"]         = 'https://www.rotorflight.org/docs/Tutorial-Setup/Blackbox';
wiki["tabCli"]              = '';

//default wiki url
const wikiURL = 'https://www.rotorflight.org/';

function buildWikiURL(wikiLoc){
    if (wikiLoc == '' || wikiLoc == null){
        return wikiURL + wikiLoc;
    } else {
        loc = wiki[wikiLoc];
        if (loc == undefined){
            return wikiURL + wikiLoc;
        } else if (loc == ''){
            return wikiURL;
        } else {
            return loc;
        }
    }
}
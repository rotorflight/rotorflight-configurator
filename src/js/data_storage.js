'use strict';

const API_VERSION_1_31 = '1.31.0';
const API_VERSION_1_32 = '1.32.0';
const API_VERSION_1_33 = '1.33.0';
const API_VERSION_1_34 = '1.34.0';
const API_VERSION_1_35 = '1.35.0';
const API_VERSION_1_36 = '1.36.0';
const API_VERSION_1_37 = '1.37.0';
const API_VERSION_1_38 = '1.38.0';
const API_VERSION_1_39 = '1.39.0';
const API_VERSION_1_40 = '1.40.0';
const API_VERSION_1_41 = '1.41.0';
const API_VERSION_1_42 = '1.42.0';
const API_VERSION_1_43 = '1.43.0';
const API_VERSION_1_44 = '255.44.0'; // 4.4.x firmware - not supported by RF

const API_VERSION_RTFL_1 = '11.1.0';
const API_VERSION_RTFL_2 = '11.2.0';

const API_VERSION_RTFL_MIN = '11.2.0';
const API_VERSION_RTFL_MAX = '11.2.0';

const FW_VERSION_RTFL_MIN = '4.3.0-alpha';
const FW_VERSION_RTFL_MAX = '4.3.99';

const CONFIGURATOR = {
    // all versions are specified and compared using semantic versioning http://semver.org/
    API_VERSION_MAX_SUPPORTED: API_VERSION_RTFL_MAX,
    API_VERSION_ACCEPTED: API_VERSION_RTFL_MIN,

    FW_VERSION_MIN_SUPPORTED: FW_VERSION_RTFL_MIN,
    FW_VERSION_MAX_SUPPORTED: FW_VERSION_RTFL_MAX,

    API_VERSION_MIN_SUPPORTED_BACKUP_RESTORE: API_VERSION_RTFL_MIN,
    BACKUP_FILE_VERSION_MIN_SUPPORTED: API_VERSION_RTFL_MIN,

    connectionValid: false,
    connectionValidCliOnly: false,
    virtualMode: false,
    virtualApiVersion: '0.0.1',
    cliActive: false,
    cliValid: false,
    gitChangesetId: 'unknown',
    version: '0.0.1',
    latestVersion: '0.0.1',
    latestVersionReleaseUrl: 'https://github.com/rotorflight/rotorflight-configurator/releases',
};

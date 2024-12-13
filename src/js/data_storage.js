export const API_VERSION_1_31 = '1.31.0';
export const API_VERSION_1_32 = '1.32.0';
export const API_VERSION_1_33 = '1.33.0';
export const API_VERSION_1_34 = '1.34.0';
export const API_VERSION_1_35 = '1.35.0';
export const API_VERSION_1_36 = '1.36.0';
export const API_VERSION_1_37 = '1.37.0';
export const API_VERSION_1_38 = '1.38.0';
export const API_VERSION_1_39 = '1.39.0';
export const API_VERSION_1_40 = '1.40.0';
export const API_VERSION_1_41 = '1.41.0';
export const API_VERSION_1_42 = '1.42.0';
export const API_VERSION_1_43 = '1.43.0';
export const API_VERSION_1_44 = '1.44.0';

export const API_VERSION_12_6 = '12.6.0';
export const API_VERSION_12_7 = '12.7.0';
export const API_VERSION_12_8 = '12.8.0';

export const API_VERSION_RTFL_MIN = API_VERSION_12_6;
export const API_VERSION_RTFL_MAX = API_VERSION_12_8;

export const FW_VERSION_RTFL_MIN = '4.3.0-0';
export const FW_VERSION_RTFL_MAX = '4.5.99';

export const CONFIGURATOR = {
    // all versions are specified and compared using semantic versioning http://semver.org/
    API_VERSION_MIN_SUPPORTED: API_VERSION_RTFL_MIN,
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
    allReleasesUrl: 'https://github.com/rotorflight/rotorflight-configurator/releases',
};

export const API_VERSION_12_6 = '12.6.0';
export const API_VERSION_12_7 = '12.7.0';
export const API_VERSION_12_8 = '12.8.0';

export const FW_VERSION_4_3_0 = '4.3.0';
export const FW_VERSION_4_4_0 = '4.4.0';
export const FW_VERSION_4_5_0 = '4.5.0';

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

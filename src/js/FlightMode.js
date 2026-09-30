import { i18n } from '@/js/localization.js';

// Shared by the Modes tab and its mode cards. Rotorflight shows every mode
// the firmware reports; the lists stay so a mode can be hidden in one place.
export const UNUSED_MODES = [];

// Modes only shown in Expert Mode (unless a range or link is set for them):
// switch-driven calibration, the race-style PARALYZE lockout, turning stick
// commands off, and the beeper, OSD, camera and VTX switches are not
// something a normal pilot needs.
export const EXPERT_MODES = [
    'CALIB',
    'PARALYZE',
    'STICK COMMANDS DISABLE',
    'BEEPER',
    'BEEPER MUTE',
    'OSD DISABLE',
    'CAMSTAB',
    'CAMTRIG',
    'CAMERA CONTROL 1',
    'CAMERA CONTROL 2',
    'CAMERA CONTROL 3',
    'VTX PIT MODE',
    'VTX CONTROL DISABLE',
];

export function getModeDisplayName(modeName) {
    return i18n.existsMessage('mode ' + modeName) ?
        i18n.getMessage('mode ' + modeName) : modeName;
}

export function getModeDescription(modeName) {
    return i18n.existsMessage('modeHelp ' + modeName) ?
        i18n.getMessage('modeHelp ' + modeName) : '';
}

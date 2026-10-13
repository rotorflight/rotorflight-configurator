import { i18n } from '@/js/localization.js';

// Shared by the Modes tab and its mode cards. Rotorflight shows every mode
// the firmware reports; the lists stay so a mode can be hidden in one place.
export const UNUSED_MODES = [];

// Modes only shown in Expert Mode.
export const EXPERT_MODES = [];

export function getModeDisplayName(modeName) {
    return i18n.existsMessage('mode ' + modeName) ?
        i18n.getMessage('mode ' + modeName) : modeName;
}

export function getModeDescription(modeName) {
    return i18n.existsMessage('modeHelp ' + modeName) ?
        i18n.getMessage('modeHelp ' + modeName) : '';
}

// Categories for the Modes tab's "Add mode" picker, in display order. Modes
// within a group are listed in this order too; anything the FC reports that
// isn't named here falls into a trailing "other" group so it stays reachable.
export const MODE_GROUPS = [
    { key: 'Arming', modes: ['ARM', 'PREARM', 'FAILSAFE', 'PARALYZE', 'STICK COMMANDS DISABLE'] },
    { key: 'Flight', modes: ['ANGLE', 'HORIZON', 'ALTHOLD', 'TRAINER', 'CALIB'] },
    { key: 'Rescue', modes: ['RESCUE', 'GPS RESCUE', 'GPS BEEP SATELLITE COUNT'] },
    { key: 'Governor', modes: ['GOVERNOR FALLBACK', 'GOVERNOR SUSPEND', 'GOVERNOR BYPASS'] },
    { key: 'Alerts', modes: ['BEEPER', 'BEEPER MUTE', 'LEDLOW'] },
    { key: 'Logging', modes: ['BLACKBOX', 'BLACKBOX ERASE', 'TELEMETRY'] },
    { key: 'Video', modes: ['CAMERA CONTROL 1', 'CAMERA CONTROL 2', 'CAMERA CONTROL 3', 'VTX PIT MODE', 'VTX CONTROL DISABLE', 'OSD DISABLE'] },
    { key: 'User', modes: ['USER1', 'USER2', 'USER3', 'USER4'] },
];

export const MODE_GROUP_OTHER = 'Other';

// Sort key placing a mode by its group, then its position within the group.
export function getModeOrder(modeName) {
    for (let g = 0; g < MODE_GROUPS.length; g++) {
        const m = MODE_GROUPS[g].modes.indexOf(modeName);
        if (m !== -1) return { group: g, index: m };
    }
    return { group: MODE_GROUPS.length, index: 0 };
}

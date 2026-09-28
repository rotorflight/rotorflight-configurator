export const AUX_MIN = 875;
export const AUX_MAX = 2125;
export const ALWAYS_ON_CH = 255;
// Roll, pitch, yaw, collective and throttle come before AUX1.
export const PRIMARY_CHANNEL_COUNT = 5;

export function xround(value, step) {
    return step * Math.floor(value / step);
}

export function isWithin(value, range) {
    return value >= range.start && value <= range.end;
}

export function density(min, max, width) {
    return 100 / ((max - min) / width);
}

// Resets a slot back to Off. Only touches the fields the firmware actually
// reads for adjFunction==0 (mirrors legacy's Off-branch in updateVisibility)
// - channel/range assignments are left untouched so flipping Mapped/Stepped
// back on later doesn't lose them.
export function resetToOff(adjRange) {
    adjRange.adjFunction = 0;
    adjRange.adjMin = 0;
    adjRange.adjMax = 100;
    adjRange.adjStep = 0;
}

// Pure function - takes the live RC channel positions as arguments rather
// than reading/storing them on adjRange, so calling this on every RC poll
// tick never mutates FC.ADJUSTMENT_RANGES (which would otherwise show up as
// spurious dirty-diff churn against the load-time snapshot).
export function calcAdjValue(adjRange, adjType, enaChannelPos, adjChannelPos, alwaysOnChannel) {
    const result = { active: false, value: 0, string: '-' };

    if (adjType === 1) {
        if (adjRange.enaChannel === alwaysOnChannel || isWithin(enaChannelPos, adjRange.enaRange)) {
            const rangeWidth = adjRange.adjRange1.end - adjRange.adjRange1.start;
            const valueWidth = adjRange.adjMax - adjRange.adjMin;
            if (rangeWidth > 0 && valueWidth > 0) {
                const offset = rangeWidth / 2;
                const value = adjRange.adjMin + Math.floor(((adjChannelPos - adjRange.adjRange1.start) * valueWidth + offset) / rangeWidth);
                result.value = value.clamp(adjRange.adjMin, adjRange.adjMax);
            }
            else {
                result.value = adjRange.adjMin;
            }
            result.string = result.value.toFixed(0);
            result.active = true;
        }
    }
    else if (adjType === 2) {
        if (isWithin(enaChannelPos, adjRange.enaRange)) {
            if (isWithin(adjChannelPos, adjRange.adjRange1)) {
                result.string = '-' + adjRange.adjStep.toFixed(0);
                result.active = true;
            }
            else if (isWithin(adjChannelPos, adjRange.adjRange2)) {
                result.string = '+' + adjRange.adjStep.toFixed(0);
                result.active = true;
            }
        }
    }

    return result;
}

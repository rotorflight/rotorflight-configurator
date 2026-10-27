/*
    The "everything off" sequence: what a flight controller must get when
    whoever was driving it goes away -- a disconnect, or the end of a remote
    support session. Motor overrides time out on their own after a second,
    but servo and mixer overrides set without a timeout stay until cleared
    or the board reboots, and the tabs that set them don't clear them on
    their way out. So this clears everything a tab can drive, whether or not
    it is set; a command the firmware doesn't know (older firmware) is
    answered with an error and changes nothing. Counts and values follow
    rotorflight-firmware (common_defaults_post.h, servos.h, mixer.h).

    The frames are built here rather than through MSP.send_message(): its
    queue sends a command only once its previous request has been answered,
    which would make 80-odd commands take seconds over a remote link.
*/

export const MOTOR_COUNT = 4; // MAX_SUPPORTED_MOTORS
export const SERVO_COUNT = 26; // MAX_SUPPORTED_SERVOS: 8 PWM + 18 bus servos
export const MIXER_INPUT_COUNT = 29; // MIXER_INPUT_COUNT; 0 is "none"

const MSP_SET_ARMING_DISABLED = 99;
const MSP_SET_MIXER_OVERRIDE = 191;
const MSP_SET_SERVO_OVERRIDE = 193;
const MSP_SET_MOTOR_OVERRIDE = 195;
const MSP_SET_SERVO_OVERRIDE_ALL = 196;

const MOTOR_OVERRIDE_OFF = 0;
const SERVO_OVERRIDE_OFF = 2001;
const MIXER_OVERRIDE_OFF = 2501;

const u16 = (value) => [value & 0xff, (value >> 8) & 0xff];

function crc8DvbS2(crc, byte) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
        crc = crc & 0x80 ? ((crc << 1) ^ 0xd5) & 0xff : (crc << 1) & 0xff;
    }
    return crc;
}

/** One MSP request frame: v1 for codes up to 254, v2 above. */
export function encodeRequest(code, payload = []) {
    if (code < 255) {
        const body = [payload.length, code, ...payload];
        const checksum = body.reduce((sum, byte) => sum ^ byte, 0);
        return Uint8Array.from([0x24, 0x4d, 0x3c, ...body, checksum]); // $M<
    }
    const body = [0, ...u16(code), ...u16(payload.length), ...payload];
    const crc = body.reduce(crc8DvbS2, 0);
    return Uint8Array.from([0x24, 0x58, 0x3c, ...body, crc]); // $X<
}

/**
 * The sequence as groups of frames, to be written with a short pause in
 * between so a slow link can't overrun the board's receive buffer.
 *
 * `disarm`: also disarm (MSP_SET_ARMING_DISABLED 1, which disarms an armed
 * board) and then lift that block again. For the end of a remote session;
 * the configurator's own disconnect leaves arming to setArmingEnabled().
 */
export function safeStopGroups({ disarm = false } = {}) {
    const groups = [];
    if (disarm) {
        groups.push([encodeRequest(MSP_SET_ARMING_DISABLED, [1])]);
    }
    groups.push(
        Array.from({ length: MOTOR_COUNT }, (_, i) =>
            encodeRequest(MSP_SET_MOTOR_OVERRIDE, [i, ...u16(MOTOR_OVERRIDE_OFF)]),
        ),
        // One command for all servos, and each one singly for firmware
        // without it.
        [
            encodeRequest(MSP_SET_SERVO_OVERRIDE_ALL, u16(SERVO_OVERRIDE_OFF)),
            ...Array.from({ length: SERVO_COUNT }, (_, i) =>
                encodeRequest(MSP_SET_SERVO_OVERRIDE, [i, ...u16(SERVO_OVERRIDE_OFF)]),
            ),
        ],
        Array.from({ length: MIXER_INPUT_COUNT - 1 }, (_, i) =>
            encodeRequest(MSP_SET_MIXER_OVERRIDE, [i + 1, ...u16(MIXER_OVERRIDE_OFF)]),
        ),
    );
    if (disarm) {
        groups.push([encodeRequest(MSP_SET_ARMING_DISABLED, [0])]);
    }
    return groups.map((frames) => {
        const out = new Uint8Array(frames.reduce((sum, frame) => sum + frame.length, 0));
        let offset = 0;
        for (const frame of frames) {
            out.set(frame, offset);
            offset += frame.length;
        }
        return out;
    });
}

/*
    Gets the pilot's attention during a remote support session when they have
    to do something (allow a port, answer a request for control). The request
    itself is shown in the window (RemoteSupportOverlay.svelte); this brings
    them back to it when their eyes are elsewhere, e.g. in the call app:

    - a short chime, repeated CHIME_REPEATS times CHIME_INTERVAL apart until
      the request is answered (unless muted),
    - a flashing window title while the window doesn't have the focus,
    - in the desktop app, a flashing taskbar entry.

    No system notifications: they need a permission prompt, which is one more
    thing for an unsure user to answer.

    Browsers only let a page play sound after the user has clicked in it, so
    unlockSound() is called from the clicks that start a session.
*/

const CHIME_REPEATS = 3;
const CHIME_INTERVAL = 10000;
const TITLE_INTERVAL = 1000;
const MUTE_KEY = 'remoteSupportMuted';

let audio = null;
// key -> { message, chimes, timer }
const active = new Map();
let titleTimer = null;
let savedTitle = null;

function readMuted() {
    try {
        return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
        return false;
    }
}

let muted = readMuted();

export function isMuted() {
    return muted;
}

export function setMuted(value) {
    muted = Boolean(value);
    try {
        localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
        // per-viewer convenience only
    }
}

/** Call from a click: lets the chime play later. */
export function unlockSound() {
    try {
        audio ??= new AudioContext();
        if (audio.state === 'suspended') {
            audio.resume().catch(() => {});
        }
    } catch {
        audio = null;
    }
}

/** Two rising tones, about half a second. */
export function chime() {
    if (muted || !audio) {
        return;
    }
    try {
        const start = audio.currentTime + 0.01;
        for (const [offset, frequency] of [[0, 660], [0.18, 880]]) {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, start + offset);
            gain.gain.exponentialRampToValueAtTime(0.25, start + offset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.35);
            osc.connect(gain).connect(audio.destination);
            osc.start(start + offset);
            osc.stop(start + offset + 0.4);
        }
    } catch (err) {
        console.warn('Remote support: no chime', err);
    }
}

function flashTaskbar(on) {
    if (__BACKEND__ === 'nwjs') {
        try {
            nw.Window.get().requestAttention(on);
        } catch {
            // not available
        }
    }
}

function updateTitle() {
    const first = active.values().next().value;
    if (!first || document.hasFocus()) {
        if (savedTitle !== null) {
            document.title = savedTitle;
            savedTitle = null;
        }
        if (!first) {
            clearInterval(titleTimer);
            titleTimer = null;
        }
        return;
    }
    savedTitle ??= document.title;
    document.title = document.title === savedTitle ? `⚠ ${first.message}` : savedTitle;
}

/**
 * Starts asking for attention for request `key`, until clearAttention(key).
 * Asking again for an active key does nothing.
 */
export function attention(key, message) {
    if (active.has(key)) {
        return;
    }
    const entry = { message, chimes: 1, timer: null };
    entry.timer = setInterval(() => {
        if (entry.chimes >= CHIME_REPEATS) {
            clearInterval(entry.timer);
            return;
        }
        entry.chimes++;
        chime();
    }, CHIME_INTERVAL);
    active.set(key, entry);
    chime();
    if (!document.hasFocus()) {
        flashTaskbar(true);
    }
    titleTimer ??= setInterval(updateTitle, TITLE_INTERVAL);
    updateTitle();
}

export function clearAttention(key) {
    const entry = active.get(key);
    if (!entry) {
        return;
    }
    clearInterval(entry.timer);
    active.delete(key);
    if (!active.size) {
        flashTaskbar(false);
    }
    updateTitle();
}

export function clearAllAttention() {
    for (const key of [...active.keys()]) {
        clearAttention(key);
    }
}

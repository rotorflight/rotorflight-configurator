import { record, Replayer } from 'rrweb';
import { RemoteSupport, VIEW_DATA, VIEW_REQUEST } from '@/js/protocols/RemoteSupport.js';
import { GUI } from '@/js/gui.js';
import { serial } from '@/js/serial.js';

/*
    Screen mirroring for remote support: the person getting help (pilot) sees
    what the supporter does in their configurator.

    The supporter's configurator records its own DOM with rrweb (a snapshot
    plus every change, input, scroll and pointer move) and sends the events
    to the pilot's configurator over the remote support session, end to end
    encrypted like the rest of it. The pilot's configurator replays
    them in a read-only window. Nothing the pilot does there can reach the
    supporter or the flight controller.

    Canvases (the 3D model, graphs) are not recorded by rrweb itself: its
    canvas replay needs a script-enabled, same-origin iframe, which would let
    a supporter run code in the pilot's configurator (and through NW.js, on
    their computer). Instead the supporter sends each visible canvas as a
    small image a few times a second when it changed (an rrweb custom
    event), and the viewer shows it as an image inside the replayed canvas
    (see drawCanvasFrame()).

    The pilot starts and stops the stream (VIEW_REQUEST), so nothing is
    recorded or sent unless someone is watching. The supporter's dialog shows
    when that is the case. Password fields are masked by rrweb.

    Wire format (see PROTOCOL.md, RemoteSession.js): each message is `type kind payload`.
    VIEW_DATA carries one JSON-encoded rrweb event, split into fragments of
    FRAGMENT_SIZE bytes when larger (kind WHOLE, or FIRST/MIDDLE/LAST).
    VIEW_REQUEST carries one of the REQUEST codes.
*/

const FRAGMENT_SIZE = 16000;
// Spreads the fragments of a large snapshot out a little rather than sending
// them back to back.
const FRAGMENT_INTERVAL = 2;
// If the link can't keep up, start over with a fresh snapshot instead of
// falling further and further behind.
const MAX_QUEUED_FRAGMENTS = 600;
const REQUEST_RETRY_INTERVAL = 2000;
const CANVAS_EVENT = 'remote-support-canvas';
const CANVAS_INTERVAL = 200;
const CANVAS_MAX_WIDTH = 640;

const KIND = { WHOLE: 0, FIRST: 1, MIDDLE: 2, LAST: 3 };
const REQUEST = { START: 1, STOP: 2 };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** What the remote support dialog shows. */
export const remote = $state({
    relayConnected: false,
    role: null,
    code: '',
    peerConnected: false,
    device: null,
    message: null,
    error: false,
    // Pilot: the viewer window is open and a frame has arrived.
    watching: false,
    hasFrame: false,
    // Supporter: the pilot is watching this configurator.
    beingWatched: false,
});

function sync() {
    const { session } = RemoteSupport;
    const peerJoined = RemoteSupport.peerConnected && !remote.peerConnected;
    remote.relayConnected = RemoteSupport.relayConnected;
    remote.role = session.role ?? null;
    remote.code = session.code ?? '';
    remote.peerConnected = RemoteSupport.peerConnected;
    remote.device = session.device ?? null;
    remote.message = session.message ?? null;
    remote.error = Boolean(session.error);

    if (remote.role !== 'join' || !remote.peerConnected) {
        stopRecording();
    }
    if (!remote.peerConnected) {
        remote.hasFrame = false;
    }
    if (remote.watching && peerJoined) {
        sendRequest(REQUEST.START);
    }
}

export function startSession(code) {
    RemoteSupport.joinSession(code);
}

/**
 * Starts sharing. A board this configurator is connected to is let go of
 * first: the port can only be open once, so the supporter could not open it
 * otherwise.
 */
export async function startSharing() {
    await disconnect();
    RemoteSupport.shareSession();
}

/** Disconnects (or cancels connecting) and waits until the port is closed. */
async function disconnect() {
    if (GUI.connected_to || GUI.connecting_to) {
        document.querySelector('div#connectbutton a.connect')?.click();
    }
    const deadline = Date.now() + 4000;
    while ((GUI.connected_to || GUI.disconnect_in_progress) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

export function stopSession() {
    RemoteSupport.stopSession();
}

/** Switches to the Remote Support tab (from the Welcome and Maintenance tabs). */
export function openRemoteSupportTab() {
    document.querySelector('#tabs li.tab_remote_support a')?.click();
}

/**
 * Ends the session from either side. A supporter connected to the pilot's
 * board disconnects first, while the link is still up, so the board gets
 * its motors stopped and its overrides released by the normal disconnect.
 * The pilot's side does the same again once the session is gone.
 */
export async function killSession() {
    if (remote.role === 'join' && serial.connectionType === 'remote') {
        await disconnect();
    }
    stopSession();
}

// ---- supporter: record and send -------------------------------------------

let stopRecord = null;
const outbox = [];
let outboxTimer = null;
let canvasTimer = null;
// The last image sent per canvas (by rrweb node ID), to send only changes.
let canvasFrames = {};
let canvasScratch = null;

function captureCanvases() {
    canvasScratch ??= document.createElement('canvas');
    const context = canvasScratch.getContext('2d');
    for (const canvas of document.querySelectorAll('canvas')) {
        const rect = canvas.getBoundingClientRect();
        const id = record.mirror.getId(canvas);
        if (id < 0 || !rect.width || !rect.height || !canvas.width || !canvas.height) {
            continue;
        }
        const scale = Math.min(1, CANVAS_MAX_WIDTH / rect.width);
        canvasScratch.width = Math.round(rect.width * scale);
        canvasScratch.height = Math.round(rect.height * scale);
        context.clearRect(0, 0, canvasScratch.width, canvasScratch.height);
        try {
            context.drawImage(canvas, 0, 0, canvasScratch.width, canvasScratch.height);
        } catch {
            continue;
        }
        const data = canvasScratch.toDataURL('image/webp', 0.6);
        if (canvasFrames[id] !== data) {
            canvasFrames[id] = data;
            record.addCustomEvent(CANVAS_EVENT, { id, data });
        }
    }
}

function pump() {
    if (outboxTimer !== null || !outbox.length) {
        return;
    }
    outboxTimer = setTimeout(() => {
        outboxTimer = null;
        const message = outbox.shift();
        if (message) {
            RemoteSupport.sendView(VIEW_DATA, message);
        }
        pump();
    }, FRAGMENT_INTERVAL);
}

function queue(kind, chunk) {
    const message = new Uint8Array(1 + chunk.length);
    message[0] = kind;
    message.set(chunk, 1);
    outbox.push(message);
}

function sendEvent(event) {
    const bytes = textEncoder.encode(JSON.stringify(event));
    if (bytes.length <= FRAGMENT_SIZE) {
        queue(KIND.WHOLE, bytes);
    } else {
        for (let offset = 0; offset < bytes.length; offset += FRAGMENT_SIZE) {
            const last = offset + FRAGMENT_SIZE >= bytes.length;
            const kind = offset === 0 ? KIND.FIRST : last ? KIND.LAST : KIND.MIDDLE;
            queue(kind, bytes.subarray(offset, offset + FRAGMENT_SIZE));
        }
    }
    if (outbox.length > MAX_QUEUED_FRAGMENTS) {
        outbox.length = 0;
        // A fresh snapshot has empty canvases; send them all again.
        canvasFrames = {};
        record.takeFullSnapshot(true);
    }
    pump();
}

function startRecording() {
    // A fresh snapshot has empty canvases; send them all again.
    canvasFrames = {};
    if (stopRecord) {
        // The pilot (re)started watching: give them a fresh picture.
        record.takeFullSnapshot(true);
    } else {
        stopRecord = record({
            emit: sendEvent,
            sampling: { mousemove: 50, scroll: 100, input: 'last' },
            // Replaying canvases needs a script-enabled, same-origin iframe,
            // which would let a supporter run code in the pilot's
            // configurator (and through NW.js, on their computer). The 3D
            // model and graphs are sent as images instead (captureCanvases()).
            recordCanvas: false,
            maskInputOptions: { password: true },
        });
        canvasTimer = setInterval(captureCanvases, CANVAS_INTERVAL);
    }
    remote.beingWatched = true;
}

function stopRecording() {
    stopRecord?.();
    stopRecord = null;
    clearInterval(canvasTimer);
    canvasTimer = null;
    canvasFrames = {};
    outbox.length = 0;
    remote.beingWatched = false;
}

function handleRequest(code) {
    if (remote.role !== 'join' || !remote.peerConnected) {
        return;
    }
    if (code === REQUEST.START) {
        startRecording();
    } else if (code === REQUEST.STOP) {
        stopRecording();
    }
}

// ---- pilot: receive and replay --------------------------------------------

let replayer = null;
let viewerContainer = null;
let viewerSize = null;
let retryTimer = null;
let resizeObserver = null;
let partial = null;

function sendRequest(code) {
    RemoteSupport.sendView(VIEW_REQUEST, Uint8Array.of(code));
}

function fit() {
    if (!replayer || !viewerSize || !viewerContainer) {
        return;
    }
    const scale = Math.min(
        viewerContainer.clientWidth / viewerSize.width,
        viewerContainer.clientHeight / viewerSize.height,
    );
    replayer.wrapper.style.transformOrigin = 'top left';
    replayer.wrapper.style.transform = `scale(${scale})`;
}

/** Opens the read-only replay inside `container` and asks for the stream. */
export function startWatching(container) {
    stopWatching();
    viewerContainer = container;
    replayer = new Replayer([], {
        root: container,
        liveMode: true,
        mouseTail: false,
        showWarning: false,
        // Keep rrweb's default sandbox (no scripts): see startRecording().
        UNSAFE_replayCanvas: false,
    });
    replayer.on('resize', (size) => {
        viewerSize = size;
        fit();
    });
    replayer.on('custom-event', (event) => {
        if (event.data?.tag === CANVAS_EVENT) {
            drawCanvasFrame(event.data.payload);
        }
    });
    replayer.startLive();
    resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(container);

    remote.watching = true;
    remote.hasFrame = false;
    sendRequest(REQUEST.START);
    retryTimer = setInterval(() => {
        // The supporter may not be ready yet, or a datagram was lost.
        if (!remote.hasFrame && remote.peerConnected) {
            sendRequest(REQUEST.START);
        }
    }, REQUEST_RETRY_INTERVAL);
}

export function stopWatching() {
    if (remote.watching) {
        sendRequest(REQUEST.STOP);
    }
    clearInterval(retryTimer);
    retryTimer = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    replayer?.destroy();
    replayer = null;
    viewerContainer?.replaceChildren();
    viewerContainer = null;
    viewerSize = null;
    partial = null;
    remote.watching = false;
    remote.hasFrame = false;
}

function drawCanvasFrame({ id, data } = {}) {
    if (typeof data !== 'string' || !data.startsWith('data:image/')) {
        return;
    }
    const canvas = replayer?.getMirror().getNode(id);
    if (canvas?.nodeName !== 'CANVAS') {
        return;
    }
    // The viewer's sandbox has scripting disabled, and a canvas in such a
    // document shows its fallback content instead of its bitmap: drawing
    // into it would show nothing. Show the picture as an image inside it.
    let image = canvas.firstElementChild;
    if (image?.nodeName !== 'IMG') {
        image = canvas.ownerDocument.createElement('img');
        canvas.replaceChildren(image);
    }
    const style = canvas.ownerDocument.defaultView.getComputedStyle(canvas);
    const width = style.width === 'auto' ? `${canvas.width}px` : style.width;
    const height = style.height === 'auto' ? `${canvas.height}px` : style.height;
    image.style.cssText = `display: block; width: ${width}; height: ${height};`;
    image.src = data;
}

function addEvent(event) {
    if (!replayer) {
        return;
    }
    // Live mode schedules events by timestamp on this computer's clock, so a
    // supporter whose clock is ahead would appear frozen. Play them as they
    // arrive instead.
    event.timestamp = Date.now();
    replayer.addEvent(event);
    if (event.type === 2) {
        remote.hasFrame = true;
    }
}

// Images and fonts in the events point at the supporter's app origin. A
// release build's chrome-extension:// origin differs per install, so point
// them at ours.
let remoteOrigin = null;

function localizeUrls(text) {
    if (text.startsWith('{"type":4,')) {
        // Meta event: tells us where the supporter's app is served from.
        try {
            remoteOrigin = new URL(JSON.parse(text).data.href).origin;
        } catch {
            // keep the previous origin
        }
    }
    if (!remoteOrigin || remoteOrigin === location.origin) {
        return text;
    }
    return text.split(remoteOrigin).join(location.origin);
}

function handleData(body) {
    if (!replayer || body.length < 1) {
        return;
    }
    const chunk = body.subarray(1);
    let json;
    switch (body[0]) {
        case KIND.WHOLE:
            json = chunk;
            break;
        case KIND.FIRST:
            partial = [chunk.slice()];
            return;
        case KIND.MIDDLE:
            partial?.push(chunk.slice());
            return;
        case KIND.LAST: {
            if (!partial) {
                return;
            }
            partial.push(chunk.slice());
            const joined = new Uint8Array(partial.reduce((sum, part) => sum + part.length, 0));
            let offset = 0;
            for (const part of partial) {
                joined.set(part, offset);
                offset += part.length;
            }
            partial = null;
            json = joined;
            break;
        }
        default:
            return;
    }
    try {
        addEvent(JSON.parse(localizeUrls(textDecoder.decode(json))));
    } catch (err) {
        console.warn('Remote view: bad event', err);
        // We may have missed part of the picture; get a fresh one.
        sendRequest(REQUEST.START);
    }
}

function handleView(type, body) {
    if (type === VIEW_REQUEST) {
        handleRequest(body[0]);
    } else if (type === VIEW_DATA) {
        handleData(body);
    }
}

RemoteSupport.onChange = sync;
RemoteSupport.onView = handleView;

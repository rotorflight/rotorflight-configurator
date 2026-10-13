/**
 * File: src/js/remap_fc/rotorflight_target_source.js
 * A board with no Rotorflight-specific build of its own reports
 * "BTFL" (or nothing at all) as its board_design -- see
 * RemapFc.svelte's isGenericBoard for the same check. Its own
 * `dump hardware` still only ever reports resources up to whatever
 * Rotorflight's own runtime was compiled to support (see
 * remap_table.js's MAX_VALID_MOTORS/MAX_VALID_SERVOS), even though
 * the shared Betaflight target it's actually running defines more --
 * commonly up to 8 motors, sometimes 12 servos.
 *
 * This looks up that same target's own unified config file from
 * rotorflight/rotorflight-targets -- the same GitHub repository the
 * Firmware Flasher tab reads builds from (see firmware_flasher.js),
 * though from the `master` branch's full upstream config set rather
 * than the smaller Rotorflight-curated `rotorflight` branch the
 * flasher uses: the whole point here is a board with no
 * Rotorflight-specific target of its own, so its definition only
 * exists on `master`. Parsed with hardware_parser.js's own
 * parseHardwareDump, unmodified: a unified target config is
 * already written in the identical `resource`/`timer`/`dma pin` CLI
 * syntax a real `dump hardware` response uses. So this needs no
 * parser of its own, just the right file to hand parseHardwareDump
 * instead of a CLI dump.
 *
 * Never used for anything sent back to the flight controller -- see
 * remap_fc.js's #doRunSequence, which only ever hands this result to
 * the Svelte component's own display-only defaultHardware, keeping
 * its own restoreCommands/buildChangeCommands computation on the
 * FC's real, as-reported defaults throughout.
 */

import * as github from "@/js/GitHubApi.js";

import { parseHardwareDump } from "./hardware_parser.js";
import { withTimeout } from "./with_timeout.js";

const REPO = "rotorflight/rotorflight-targets";
const BRANCH = "master";
const CONFIGS_PATH = "configs";
const FETCH_TIMEOUT_MS = 4000;

async function fetchRawConfig(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function fetchRotorflightTargetDefaultsUncached(manufacturerId, boardName) {
  // Config filenames follow "<manufacturer>-<board>.config" -- the
  // same convention firmware_flasher/util.js's parseUnifiedTargets
  // splits back apart via its own TARGET_REGEXP, just assembled
  // forwards here since we already know both halves.
  const wantedName = `${manufacturerId}-${boardName}.config`.toUpperCase();

  try {
    const entries = await withTimeout(
      github.getContents(REPO, BRANCH, CONFIGS_PATH),
      FETCH_TIMEOUT_MS,
      "the rotorflight-targets config listing",
    );
    const match = entries.find(
      (entry) => entry.name.toUpperCase() === wantedName,
    );
    if (!match?.download_url) {
      console.log(`remap_fc: no rotorflight-targets config found for ${wantedName}`);
      return null;
    }

    const configText = await withTimeout(
      fetchRawConfig(match.download_url),
      FETCH_TIMEOUT_MS,
      "the rotorflight-targets config file",
    );
    const hardware = parseHardwareDump(configText);
    if (Object.keys(hardware).length === 0) {
      throw new Error("parsed target config had no resources");
    }

    console.log(`remap_fc: loaded default hardware from rotorflight-targets (${match.name})`);
    return hardware;
  } catch (err) {
    console.log(
      "remap_fc: could not load rotorflight-targets default hardware, falling back to the FC's own defaults",
      err,
    );
    return null;
  }
}

// Repeated "Read FC"/"Load Changes" runs against the same connected
// board hit this every time, each one re-fetching the whole
// rotorflight-targets config listing plus the matched file -- wasted
// network round-trips for data that isn't going to change mid-session.
// Cached by manufacturer+board key, keyed on the in-flight promise
// itself so two overlapping calls for the same board (e.g. a fast
// double-click) share one fetch rather than racing two. Only a
// successful lookup stays cached: a failure (board genuinely
// undocumented, or just a transient network/timeout blip) is evicted
// once it settles, so it's retried fresh next time rather than
// permanently giving up on a board for the rest of the session over
// what might have been a one-off failure.
const targetDefaultsCache = new Map();

/**
 * Finds and parses the unified target config matching the given
 * manufacturer/board pair, if any. Never throws -- any failure (no
 * matching file, the repository listing or the file itself can't be
 * fetched in time, or the matched file has no usable resources in it)
 * just resolves to null, so a caller can always fall back to the FC's
 * own reported defaults without special-casing errors itself.
 * @param {?string} manufacturerId - e.g. "MTKS", from FC.CONFIG.manufacturerId.
 * @param {?string} boardName - e.g. "MATEKF405TE", from FC.CONFIG.boardName.
 * @returns {Promise<?import("./hardware_parser.js").HardwareMap>}
 */
export function fetchRotorflightTargetDefaults(manufacturerId, boardName) {
  if (!manufacturerId || !boardName) return Promise.resolve(null);

  const cacheKey = `${manufacturerId}-${boardName}`.toUpperCase();
  const cached = targetDefaultsCache.get(cacheKey);
  if (cached) return cached;

  const promise = fetchRotorflightTargetDefaultsUncached(
    manufacturerId,
    boardName,
  ).then((result) => {
    if (!result) targetDefaultsCache.delete(cacheKey);
    return result;
  });
  targetDefaultsCache.set(cacheKey, promise);
  return promise;
}

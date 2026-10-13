/**
 * File: src/js/remap_fc/reference_design_source.js
 * Fetches the latest reference_designs.json and manufacturer_designs.json
 * straight from this project's own GitHub repository at runtime, so a
 * newly documented board (official or manufacturer-supplied) doesn't
 * have to wait for the next configurator release before it shows up
 * here -- falling back to the copy bundled with this build if the
 * fetch fails or times out (offline, GitHub unreachable, an unexpected
 * response, ...). Each file is fetched at most once per session,
 * independently of the other: the first call for a given file kicks it
 * off and every later call for that same file (e.g. the tab being
 * re-opened) reuses the same result rather than re-fetching.
 */

const RAW_BASE =
  "https://raw.githubusercontent.com/rotorflight/rotorflight-configurator/devel/src/tabs/remap_fc/";

const FETCH_TIMEOUT_MS = 4000;

// A minimal sanity check that fetched JSON is actually shaped like
// either of this module's two files -- an object whose values are
// themselves per-design/per-board objects -- rather than trusting an
// unexpected response (an error page, a redirect, a differently-shaped
// file) outright and silently showing wrong labels from it.
// reference_designs.json and manufacturer_designs.json share this same
// shape (usage/pin data keyed one level deep under a design-family or
// board-name key), so one check covers both.
function looksLikeDesignData(data) {
  return (
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Object.keys(data).some((key) => key !== "_file" && typeof data[key] === "object")
  );
}

async function fetchDesignFile(filename, localData) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${RAW_BASE}${filename}`, {
      cache: "no-cache",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!looksLikeDesignData(data)) {
      throw new Error("unexpected response shape");
    }

    console.log(`remap_fc: loaded ${filename} from GitHub`);
    return data;
  } catch (err) {
    console.log(
      `remap_fc: could not fetch latest ${filename}, using the bundled copy`,
      err,
    );
    return localData;
  } finally {
    clearTimeout(timeout);
  }
}

// Cached separately per file across every call within this session, so
// re-opening the tab (which re-imports/re-runs the component that
// calls these) doesn't re-fetch -- the first call's promise for a
// given file is simply reused by every later one, whether it's still
// pending or already settled.
let cachedReferenceDesigns = null;
let cachedManufacturerDesigns = null;

/**
 * Returns the latest reference_designs.json from this project's own
 * GitHub repository, or `localData` (the copy bundled with this
 * build) if that fetch fails, times out, or returns something that
 * doesn't look like the expected data at all.
 * @param {Object} localData - The statically-imported reference_designs.json.
 * @returns {Promise<Object>}
 */
export function loadReferenceDesigns(localData) {
  cachedReferenceDesigns ??= fetchDesignFile("reference_designs.json", localData);
  return cachedReferenceDesigns;
}

/**
 * Same as loadReferenceDesigns, for manufacturer_designs.json --
 * fetched and cached entirely independently, since the two files are
 * unrelated data (see manufacturer_designs.json's own _file comment
 * for why they're kept separate) that just happen to live in the same
 * repository.
 * @param {Object} localData - The statically-imported manufacturer_designs.json.
 * @returns {Promise<Object>}
 */
export function loadManufacturerDesigns(localData) {
  cachedManufacturerDesigns ??= fetchDesignFile("manufacturer_designs.json", localData);
  return cachedManufacturerDesigns;
}

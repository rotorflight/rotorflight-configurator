import { config } from "@/js/config.svelte.ts";
import { Metadata, Source } from "@/js/presets/source/source.js";

/**
 * @returns {Metadata} the metadata of the official presets repository
 */
function officialMetadata() {
  const metadata = new Metadata(
    "Rotorflight Official Presets",
    "https://github.com/rotorflight/rotorflight-presets",
    "presets-v1",
  );
  metadata.official = true;
  metadata.active = true;
  return metadata;
}

/**
 * The official source followed by the user's sources from the config.
 * @returns {Metadata[]}
 */
export function loadSourcesMetadata() {
  const result = [officialMetadata()];
  for (const stored of config.presetsSourcesMetadata) {
    const metadata = new Metadata(stored.name, stored.url, stored.branch);
    metadata.official = stored.official;
    metadata.active = stored.active;
    result.push(metadata);
  }
  return result;
}

/**
 * Stores the user's (non-official) sources in the config.
 * @param {Metadata[]} sources
 */
export function saveSourcesMetadata(sources) {
  config.presetsSourcesMetadata = sources
    .filter((m) => !m.official)
    .map(({ name, url, branch, official, active }) => ({
      name,
      url,
      branch,
      official,
      active,
    }));
}

/**
 * @param {Metadata[]} sources
 * @returns {Source[]} the active sources, ready to be loaded
 */
export function activeSources(sources) {
  return sources
    .filter((m) => m.official || m.active)
    .map((m) => new Source(m));
}

/**
 * @param {Metadata[]} sources
 * @returns {boolean} whether any non-official source is active
 */
export function isThirdPartyActive(sources) {
  return sources.some((m) => m.active && !m.official);
}

export function newSourceMetadata(name) {
  return new Metadata(name, "", "");
}

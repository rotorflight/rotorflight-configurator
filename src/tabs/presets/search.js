/**
 * @typedef {import("@/js/presets/source/retriever.js").PresetData} PresetData
 * @typedef {import("@/js/presets/source/source.js").Source} Source
 * @typedef {import("@/js/presets/source/preset_instance.js").default} PresetInstance
 *
 * @typedef {object} SearchParams
 * @property {string[]} categories
 * @property {string[]} keywords
 * @property {string[]} authors
 * @property {string[]} firmwareVersions
 * @property {string[]} status
 * @property {string} searchString
 */
import { FC } from "@/js/fc.svelte.js";

export const MAX_PRESETS_SHOWN = 60;

/**
 * Sorted union of the values `extractor` returns for each source.
 * @param {Source[]} sources
 * @param {(source: Source) => string[]} extractor
 */
export function uniqueValues(sources, extractor) {
  const values = new Set();
  for (const source of sources) {
    for (const value of extractor(source) ?? []) {
      values.add(value);
    }
  }
  return [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/**
 * @param {PresetData} preset
 * @param {Source} source
 * @param {PresetInstance[]} picked
 */
export function isPicked(preset, source, picked) {
  return picked.some(
    (pi) =>
      pi.presetData.hash === preset.hash &&
      pi.sourceMetadata.rawUrl === source.rawUrl,
  );
}

function intersects(wanted, values) {
  return (
    wanted.length === 0 ||
    (Array.isArray(values) && wanted.some((v) => values.includes(v)))
  );
}

function matchesSearchString(preset, searchString) {
  if (!searchString) {
    return true;
  }
  const haystack = [
    preset.description,
    (preset.keywords ?? []).join(" "),
    preset.title,
    preset.author,
    (preset.firmware_version ?? []).join(" "),
    preset.category,
  ]
    .join("\n")
    .toLowerCase()
    .replace("''", '"');
  return searchString
    .toLowerCase()
    .replace("''", '"')
    .split(" ")
    .every((word) => haystack.includes(word));
}

function matchesBoardName(preset) {
  if (preset.board_name === undefined || FC.CONFIG.boardName == "") {
    return true;
  }
  return preset.board_name.includes(FC.CONFIG.boardName);
}

/**
 * @param {PresetData} preset
 * @param {?SearchParams} params
 */
function matches(preset, params) {
  if (params == null || preset.hidden) {
    return false;
  }
  const authors = params.authors.map((a) => a.toLowerCase());
  return (
    (params.status.length === 0 || params.status.includes(preset.status)) &&
    (params.categories.length === 0 ||
      params.categories.includes(preset.category)) &&
    intersects(params.keywords, preset.keywords) &&
    (authors.length === 0 ||
      (preset.author !== undefined &&
        authors.includes(preset.author.toLowerCase()))) &&
    intersects(params.firmwareVersions, preset.firmware_version) &&
    matchesSearchString(preset, params.searchString) &&
    matchesBoardName(preset)
  );
}

/**
 * Presets matching the search (plus the already picked ones, and the one
 * with `hash`), recently picked first, then by priority.
 *
 * @param {Source[]} sources
 * @param {?SearchParams} params
 * @param {PresetInstance[]} picked
 * @param {{ find: (viewUrl: string) => ?{ lastPickDate: number } }} tracker
 * @param {string} [hash]
 * @returns {{ preset: PresetData, source: Source }[]}
 */
export function searchPresets(sources, params, picked, tracker, hash = "") {
  const result = [];
  const seen = new Set();

  for (const source of sources) {
    for (const preset of source.index.presets) {
      if (seen.has(preset.hash)) {
        continue;
      }
      if (
        matches(preset, params) ||
        isPicked(preset, source, picked) ||
        (hash !== "" && hash === preset.hash)
      ) {
        result.push({ preset, source });
        seen.add(preset.hash);
      }
    }
  }

  const lastPick = (entry) =>
    tracker.find(entry.source.metadata.viewUrl + entry.preset.fullPath)
      ?.lastPickDate;

  return result.sort((a, b) => {
    const pickA = lastPick(a);
    const pickB = lastPick(b);
    if (pickA && pickB) {
      return pickB - pickA;
    }
    if (pickA || pickB) {
      return pickA ? -1 : 1;
    }
    return a.preset.priority > b.preset.priority ? -1 : 1;
  });
}

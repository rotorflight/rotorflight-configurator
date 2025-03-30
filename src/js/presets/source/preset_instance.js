/**
 * @typedef {import('@/js/presets/source/source.js').Metadata} Metadata
 * @typedef {import("@/js/presets/source/retriever.js").PresetData} PresetData
 */
export default class PresetInstance {
  /**
   * @type {string}
   */
  get fullPath() {
    return this.presetData.fullPath;
  }
  /**
   * @type {Metadata}
   */
  sourceMetadata = null;
  /**
   * @type {PresetData}
   */
  presetData = null;
  /**
   * @type {string[]}
   */
  cliStringsArr = [];
  /**
   * @type {string[]}
   */
  renderedCliArr = [];

  /**
   * @type {any[]}
   */
  optionsValues = null;

  completeWarning = "";

  /**
   *
   * @param {string} presetFullPath
   * @param {SourceMetadata} sourceMetadata
   */
  constructor(sourceMetadata, presetData) {
    this.sourceMetadata = sourceMetadata;
    this.presetData = presetData;
  }

  /**
   * @returns {string}
   */
  get viewLink() {
    return this.sourceMetadata.viewUrl + this.presetData.fullPath;
  }
}

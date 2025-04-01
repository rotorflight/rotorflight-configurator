import { Source, Metadata } from "@/js/presets/source/source.js";

// PresetsSources contains the sources for presets and the corresponding dialog
export default class Sources {
  #panelCounter = 0;

  #dom = {
    /**
     * @type {HTMLElement}
     */
    dialog: null,

    /**
     * @type {HTMLDivElement}
     */
    divSourcesPanel: null,

    /**
     * @type {HTMLButtonElement}
     */
    buttonAddNew: null,

    /**
     * @type {HTMLButtonElement}
     */
    buttonClose: null,
  };

  /**
   * @type {Source[]}
   */
  #sourcePanels = [];

  /**
   * @type {?Function}
   */
  #sourceSelectedPromiseResolve = null;

  /**
   *
   * @param {string} dialogSelector
   */
  constructor(dialogSelector) {
    this.#dom.dialog = $(dialogSelector);
  }

  /**
   * Loads and initializes the Sources dialog
   */
  async load() {
    await new Promise((resolve) => {
      this.#dom.dialog.load("./tabs/presets/sources_dialog.html", resolve);
    });
    this.#setupDialog();
    await this.#initializeSources();
  }

  /**
   * Shows the source dialog
   * @returns {Promise<void>}
   */
  show() {
    this.#dom.dialog[0].showModal();
    return new Promise(
      (resolve) => (this.#sourceSelectedPromiseResolve = resolve),
    );
  }

  /**
   * Collects and returns the active sources
   * @returns {Source[]}
   */
  collectActiveSources() {
    let activePresetsSources = [];
    for (let i = 0; i < this.#sourcePanels.length; i++) {
      if (!this.#sourcePanels[i].metadata.active) {
        continue;
      }
      activePresetsSources.push(this.#sourcePanels[i]);
    }
    return activePresetsSources;
  }

  /**
   * Collects and returns the metadata the sources.
   * @param {boolean} includeOfficial
   * @returns
   */
  #collectSourcesMetadata(includeOfficial = false) {
    let sourcesMetadata = [];
    for (let i = 0; i < this.#sourcePanels.length; i++) {
      if (!includeOfficial && this.#sourcePanels[i].metadata.official) {
        continue;
      }
      sourcesMetadata.push(this.#sourcePanels[i].metadata);
    }
    return sourcesMetadata;
  }

  /**
   * Returns whether there are any third party sources active
   * @returns {boolean}
   */
  get isThirdPartyActive() {
    return (
      this.#collectSourcesMetadata().filter(
        (source) => source.active && !source.official,
      ).length > 0
    );
  }

  /**
   * Loads existing sources from storage and initializes them
   */
  async #initializeSources() {
    let sourceMetadata = [];
    ConfigStorage.get("PresetsSourcesMetadata", function (result) {
      if (result.PresetSourcesMetadata) {
        sourceMetadata = result.PresetSourcesMetadata;
      }
    });
    sourceMetadata.unshift(this.#officialSourceMetadata());
    for (let i = 0; i < sourceMetadata.length; i++) {
      await this.#newSource(sourceMetadata[i]);
    }
  }

  /**
   * Saves the metadata of the sources to storage
   */
  #saveSourcesMetadataToStorage() {
    ConfigStorage.set({
      PresetsSourcesMetadata: this.#collectSourcesMetadata(),
    });
  }

  /**
   * Returns the metadata for the official source
   * @returns {Metadata}
   */
  #officialSourceMetadata() {
    const officialSource = new Metadata(
      "Rotorflight Official Presets",
      "https://github.com/rotorflight/rotorflight-presets",
      "presets-v1",
    );
    officialSource.official = true;
    officialSource.active = true;
    return officialSource;
  }

  #setupDialog() {
    this.#dom.buttonAddNew = $("#presets_sources_dialog_add_new");
    this.#dom.buttonClose = $("#presets_sources_dialog_close");
    this.#dom.divSourcesPanel = $(".presets_sources_dialog_sources");

    this.#dom.buttonClose.on("click", () => this.#dom.dialog[0].close());
    this.#dom.buttonAddNew.on("click", () => this.#onAddNewSourceButtonClick());

    this.#dom.dialog.on("close", () => this.#sourceSelectedPromiseResolve?.());
    i18n.localizePage();
  }

  async #newSource(metadata, selected = false) {
    const source = new Source(
      this.#dom.divSourcesPanel,
      metadata,
      `source_panel_${this.#panelCounter}`,
    );
    this.#panelCounter++;

    if (!metadata.official) {
      source.sourceChangedCallback =
        this.#saveSourcesMetadataToStorage.bind(this);
    }

    await source.loadPanel();

    source.selected = selected;

    this.#sourcePanels.push(source);
  }

  #onAddNewSourceButtonClick() {
    const presetSource = new Metadata(
      i18n.getMessage("presetsSourcesDialogDefaultSourceName"),
      "",
      "",
    );
    this.#newSource(presetSource, true).then(() => {
      this.#dom.divSourcesPanel.stop();
      this.#dom.divSourcesPanel.animate({
        scrollTop: `${this.#dom.divSourcesPanel.prop("scrollHeight")}px`,
      });
      this.#saveSourcesMetadataToStorage();
    });
  }
}

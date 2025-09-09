import PresetPanel from "@/js/presets/preset_panel.js";
import { marked } from "marked";
import DOMPurify from "dompurify";

const optionGroupVsNameDelimiter = ":";

/**
 * @typedef {import("@/js/presets/source/preset_instance.js").PresetInstance} PresetInstance
 * @typedef {import('./source/source.js').Source} Source
 * @typedef {import("@/js/presets/source/retriever.js").PresetData} PresetData
 * @typedef {import("@/js/presets/preset_tracker.js").default} PresetTracker
 */

/**
 * Class that encompasses the detailed dialog of a preset
 */
export default class PresetDialog {
  #dom = {
    /**
     * @type {HTMLDialogElement}
     */
    dialog: null,

    /**
     * @type {HTMLButtonElement}
     */
    buttonApply: null,
    /**
     * @type {HTMLButtonElement}
     */
    buttonCancel: null,

    /**
     * @type {HTMLDivElement}
     */
    loading: null,
    /**
     * @type {HTMLDivElement}
     */

    error: null,
    /**
     * @type {HTMLDivElement}
     */
    properties: null,

    /**
     * @type {HTMLDivElement}
     */
    titlePanel: null,

    /**
     * @type {HTMLDivElement}
     */
    descriptionText: null,

    /**
     * @type {HTMLDivElement}
     */
    descriptionHtml: null,

    /**
     * @type {HTMLDivElement}
     */
    cliText: null,

    /**
     * @type {HTMLAnchorElement}
     */
    githubLink: null,

    /**
     * @type {HTMLAnchorElement}
     */
    discussionLink: null,

    /**
     * @type {HTMLSelectElement}
     */
    optionsSelect: null,

    /**
     * @type {HTMLDivElement}
     */
    optionsSelectPanel: null,

    /**
     * @type {HTMLButtonElement}
     */
    buttonShowCLI: null,
    /**
     * @type {HTMLButtonElement}
     */
    buttonHideCLI: null,
  };

  /**
   * @type {Function} Callback function when a preset is picked.
   * @private
   */
  #onPresetPickedCallback;

  /**
   * @type {Function} Promise resolve function for the open dialog.
   * @private
   */
  #openPromiseResolve;

  /**
   * @type {boolean} Indicates if the description is in HTML format.
   * @private
   */
  #isDescriptionHtml = false;

  /**
   * @type {Source}
   */
  #presetSource;

  /**
   * @type {PresetInstance} Instance of the preset.
   */
  #presetInstance;

  /**
   * @type {boolean} Indicates if the preset repository name should be shown.
   * @private
   */
  #showPresetRepoName;

  /**
   * @type {boolean} Indicates if options have been shown at least once.
   * @private
   */
  #optionsShownAtLeastOnce;

  /**
   * @type {boolean} Indicates if a preset was picked when the dialog was closed.
   * @private
   */
  #isPresetPickedOnClose;

  /**
   * @type {PresetTracker} Preset tracker.
   * @private
   */
  #presetTracker;

  /**
   * Creates an instance of PresetDetails.
   * @param {HTMLElement} domDialog - The dialog element.
   * @param {Function} onPresetPickedCallback - Callback when a preset is picked.
   * @param {PresetTracker} presetTracker - Preset tracker.
   */
  constructor(domDialog, onPresetPickedCallback, presetTracker) {
    this.#dom.dialog = domDialog;
    this.#onPresetPickedCallback = onPresetPickedCallback;
    this.#presetTracker = presetTracker;
  }

  /**
   * Loads the preset details dialog.
   * @returns {Promise<void>} A promise that resolves when the dialog is loaded.
   */
  initialize() {
    return new Promise((resolve) => {
      this.#dom.dialog.load("./src/tabs/presets/preset_dialog.html", () => {
        this.#readDom();
        resolve();
      });
    });
  }

  /**
   *
   * @param {PresetInstance} presetInstance
   * @param {boolean} showPresetRepoName
   * @returns {Promise}
   */
  showPreset(presetSource, presetInstance, showPresetRepoName) {
    this.#presetSource = presetSource;
    this.#presetInstance = presetInstance;
    this.#showPresetRepoName = showPresetRepoName;

    this.#setLoadingState(true);
    this.#dom.dialog[0].showModal();
    this.#optionsShownAtLeastOnce = false;
    this.#isPresetPickedOnClose = false;

    this.#presetSource.retriever
      .loadPreset(this.#presetInstance)
      .then(() => {
        this.#loadPresetUi();
        this.#setLoadingState(false);
      })
      .catch((err) => {
        console.error(err);
        const msg = i18n.getMessage("presetsLoadError");
        this.#showError(msg);
      });

    return new Promise((resolve) => (this.#openPromiseResolve = resolve));
  }

  #readDom() {
    i18n.localizePage();

    this.#dom.buttonApply = $("#preset_dialog_applybtn");
    this.#dom.buttonCancel = $("#preset_dialog_closebtn");
    this.#dom.loading = $("#preset_dialog_loading");
    this.#dom.error = $("#preset_dialog_error");
    this.#dom.properties = $("#preset_dialog_properties");
    this.#dom.titlePanel = $(".preset_dialog_title_panel");
    this.#dom.descriptionText = $("#preset_dialog_text_description");
    this.#dom.descriptionHtml = $("#preset_dialog_html_description");
    this.#dom.cliText = $("#preset_dialog_text_cli");
    this.#dom.githubLink = this.#dom.dialog.find("#presets_open_online");
    this.#dom.discussionLink = this.#dom.dialog.find(
      "#presets_open_discussion",
    );
    this.#dom.optionsSelect = $("#preset_options_select");
    this.#dom.optionsSelectPanel = $("#preset_options_panel");
    this.#dom.buttonShowCLI = $("#presets_cli_show");
    this.#dom.buttonHideCLI = $("#presets_cli_hide");

    this.#dom.buttonApply.on("click", () => this.#onApplyButtonClicked());
    this.#dom.buttonCancel.on("click", () => this.#onCancelButtonClicked());
    this.#dom.buttonShowCLI.on("click", () => this.#showCliText(true));
    this.#dom.buttonHideCLI.on("click", () => this.#showCliText(false));
    this.#dom.dialog.on("close", () => this.#onClose());
  }

  #onCancelButtonClicked() {
    this.#dom.dialog[0].close();
  }

  #loadPresetUi() {
    this.#loadDescription();

    this.#dom.githubLink.attr("href", this.#presetInstance.viewLink);

    if (this.#presetInstance.presetData.discussion) {
      this.#dom.discussionLink.toggle(true);
      this.#dom.discussionLink.attr(
        "href",
        this.#presetInstance.presetData.discussion,
      );
    } else {
      this.#dom.discussionLink.toggle(false);
    }

    this.#dom.titlePanel.empty();
    const titlePanel = new PresetPanel(
      this.#dom.titlePanel,
      this.#presetInstance.presetData,
      this.#presetSource,
      false,
      this.#showPresetRepoName,
      false,
      () => this.#setLoadingState(false),
      this.#presetTracker,
    );
    titlePanel.load();
    this.#loadOptionsSelect();
    this.#updateFinalCliText();
    this.#showCliText(false);
  }

  #loadDescription() {
    let text = this.#presetInstance.presetData.description?.join("\n");

    switch (this.#presetInstance.presetData.parser) {
      case "MARKED":
        this.#isDescriptionHtml = true;
        text = marked.parse(text);
        text = DOMPurify.sanitize(text);
        this.#dom.descriptionHtml.html(text);
        GUI.addLinksTargetBlank(this.#dom.descriptionHtml);
        break;
      default:
        this.#isDescriptionHtml = false;
        this.#dom.descriptionText.text(text);
        break;
    }
  }

  #updateFinalCliText() {
    this.#presetInstance.optionsValues = this.#dom.optionsSelect.multipleSelect(
      "getSelects",
      "value",
    );
    this.#presetInstance.renderedCliArr =
      this.#presetSource.retriever.parser.renderPreset(
        this.#presetInstance.cliStringsArr,
        this.#presetInstance.optionsValues,
      );
    this.#dom.cliText.text(this.#presetInstance.renderedCliArr.join("\n"));
  }

  #setLoadingState(isLoading) {
    this.#dom.properties.toggle(!isLoading);
    this.#dom.loading.toggle(isLoading);
    this.#dom.error.toggle(false);

    if (isLoading) {
      this.#dom.buttonApply.toggleClass("disabled", true);
    } else {
      this.#dom.buttonApply.toggleClass("disabled", false);
    }
  }

  #showError(msg) {
    this.#dom.error.toggle(true);
    this.#dom.error.text(msg);
    this.#dom.properties.toggle(false);
    this.#dom.loading.toggle(false);
    this.#dom.buttonApply.toggleClass("disabled", true);
  }

  #showCliText(value) {
    this.#dom.descriptionText.toggle(!value && !this.#isDescriptionHtml);
    this.#dom.descriptionHtml.toggle(!value && this.#isDescriptionHtml);
    this.#dom.cliText.toggle(value);
    this.#dom.buttonShowCLI.toggle(!value);
    this.#dom.buttonHideCLI.toggle(value);
  }

  #createOptionsSelect() {
    let data = [];

    this.#presetInstance.presetData.options.forEach((option) => {
      if (!option.options) {
        data.push(this.#msOption(option));
      } else {
        data.push(this.#msOptionGroup(option));
      }
    });
    this.#dom.optionsSelect.multipleSelect({
      placeholder: i18n.getMessage("presetOptionsPlaceholder"),
      formatSelectAll() {
        return i18n.getMessage("dropDownSelectAll");
      },
      formatAllSelected() {
        return i18n.getMessage("dropDownAll");
      },
      onClick: () => this.#optionsSelectionChanged(),
      onCheckAll: () => this.#optionsSelectionChanged(),
      onUncheckAll: () => this.#optionsSelectionChanged(),
      onOpen: () => this.#optionsOpened(),
      onBeforeClick: (view) => this.#ensureMutuallyExclusiveOptions(view),
      hideOptgroupCheckboxes: true,
      singleRadio: true,
      multiple: true,
      selectAll: false,
      data: data,
      minimumCountSelected: 128,
    });

    if (this.#presetInstance.optionsValues !== null) {
      this.#dom.optionsSelect.multipleSelect(
        "setSelects",
        this.#presetInstance.optionsValues,
      );
    }
  }

  #optionsOpened() {
    this.#optionsShownAtLeastOnce = true;
  }

  #ensureMutuallyExclusiveOptions(view) {
    // In this form: option_0_1 where 0_1 is the group and the index within that group.
    const selectedOptionKey = view._key;
    const firstUnderscoreIndex = selectedOptionKey.indexOf("_");
    const lastUnderscoreIndex = selectedOptionKey.lastIndexOf("_");
    const groupIndex = selectedOptionKey.slice(
      firstUnderscoreIndex + 1,
      lastUnderscoreIndex,
    );

    const group = this.#presetInstance.presetData.options[groupIndex];
    if (group.isExclusive) {
      const existingCheckedValues =
        this.#dom.optionsSelect.multipleSelect("getSelects");
      let newCheckedValues = [];
      existingCheckedValues.forEach((v) => {
        if (v.includes(optionGroupVsNameDelimiter)) {
          let optionGroupName = v.split(optionGroupVsNameDelimiter)[0];
          if (optionGroupName != group.name) {
            newCheckedValues.push(v);
          }
        } else {
          newCheckedValues.push(v);
        }
      });
      this.#dom.optionsSelect.multipleSelect("setSelects", newCheckedValues);
    }
  }

  #msOption(option) {
    return {
      text: option.name,
      value: option.name,
      visible: true,
      selected: option.checked,
    };
  }

  #msOptionGroup(optionGroup) {
    let msOptionGroup = {
      type: "optgroup",
      label: optionGroup.name,
      value: optionGroup.name,
      visible: true,
      children: [],
    };
    optionGroup.options.forEach((option) => {
      msOptionGroup.children.push({
        text: option.name,
        value: optionGroup.name + optionGroupVsNameDelimiter + option.name,
        visible: true,
        selected: option.checked,
      });
    });
    return msOptionGroup;
  }

  #optionsSelectionChanged() {
    this.#updateFinalCliText();
  }

  #destroyOptionsSelect() {
    this.#dom.optionsSelect.multipleSelect("destroy");
  }

  #loadOptionsSelect() {
    const optionsVisible = 0 !== this.#presetInstance.presetData.options.length;
    this.#dom.optionsSelect.empty();
    this.#dom.optionsSelectPanel.toggle(optionsVisible);

    if (optionsVisible) {
      this.#createOptionsSelect();
    }

    this.#dom.optionsSelect.multipleSelect("refresh");
  }

  #onApplyButtonClicked() {
    if (
      this.#presetInstance.presetData.force_options_review &&
      !this.#optionsShownAtLeastOnce
    ) {
      alert(i18n.getMessage("presetsReviewOptionsWarning"));
    } else if (!this.#presetInstance.completeWarning) {
      this.#pickPresetFwVersionCheck();
    } else {
      if (confirm(GUI.escapeHtml(this.#presetInstance.completeWarning))) {
        this.#pickPresetFwVersionCheck();
      }
    }
  }

  #pickPreset() {
    this.#onPresetPickedCallback?.();
    this.#isPresetPickedOnClose = true;
    this.#onCancelButtonClicked();
  }

  #pickPresetFwVersionCheck() {
    let compatible = false;

    for (const fw of this.#presetInstance.presetData.firmware_version) {
      if (FC.CONFIG.flightControllerVersion.startsWith(fw)) {
        compatible = true;
        break;
      }
    }
    if (compatible) {
      this.#pickPreset();
    } else {
      if (
        confirm(
          i18n.getMessage("presetsWarningWrongVersionConfirmation", [
            this.#presetInstance.presetData.firmware_version,
            FC.CONFIG.flightControllerVersion,
          ]),
        )
      ) {
        this.#pickPreset();
      }
    }
  }

  #onClose() {
    this.#destroyOptionsSelect();
    this.#openPromiseResolve?.(this.#isPresetPickedOnClose);
  }
}

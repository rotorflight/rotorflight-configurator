import GithubUtil from "@/js/presets/source/github.js";
import Retriever from "@/js/presets/source/retriever.js";

/**
 * @typedef {import('@/js/presets/source/retriever.js').SourceIndex}    SourceIndex
 */

export class Metadata {
  name = "New Source";
  url = "";
  branch = "";
  official = false;
  active;

  constructor(name, url, branch = "") {
    this.name = name;
    this.url = url;
    this.branch = branch;
  }

  get trimmedUrl() {
    let url = this.url.trim();

    if (!url.endsWith("/")) {
      url += "/";
    }
    return url;
  }

  get trimmedBranch() {
    let branch = this.branch;
    if (branch.startsWith("/")) {
      branch = branch.slice(1);
    }
    if (branch.endsWith("/")) {
      branch = branch.slice(0, -1);
    }
    return branch;
  }

  get rawUrl() {
    if (GithubUtil.isUrlGithubRepo(this.url)) {
      return `https://raw.githubusercontent.com${this.trimmedUrl.slice("https://github.com".length)}${this.trimmedBranch}/`;
    }
    return this.trimmedUrl;
  }

  get viewUrl() {
    if (GithubUtil.isUrlGithubRepo(this.url)) {
      return `${this.trimmedUrl}blob/${this.trimmedBranch}/`;
    }
    return this.trimmedUrl;
  }
}

export class Source {
  /**
   * @type {Metadata}
   */
  #metadata;

  get rawUrl() {
    return this.#metadata.rawUrl;
  }

  /**
   * @type {boolean}
   */
  #selected = undefined;

  /**
   * @type {?Retriever}
   */
  #retriever = null;

  #metadataEditPending = false;

  #domId = "";

  #dom = {
    /**
     * @type {HTMLDivElement}
     */
    parentDiv: null,

    /**
     * @type {HTMLDivElement}
     */
    divWrapper: null,

    /**
     * @type {HTMLDivElement}
     */
    divInnerPanel: null,
    /**
     * @type {HTMLDivElement}
     */
    divNoEditing: null,
    /**
     * @type {HTMLDivElement}
     */
    divEditing: null,

    /**
     * @type {HTMLInputElement}
     */
    editName: null,
    /**
     * @type {HTMLInputElement}
     */
    editUrl: null,
    /**
     * @type {HTMLInputElement}
     */
    editGitHubBranch: null,

    /**
     * @type {HTMLButtonElement}
     */
    buttonSave: null,
    /**
     * @type {HTMLButtonElement}
     */
    buttonReset: null,
    /**
     * @type {HTMLButtonElement}
     */
    buttonActivate: null,
    /**
     * @type {HTMLButtonElement}
     */
    buttonDeactivate: null,
    /**
     * @type {HTMLButtonElement}
     */
    buttonDelete: null,
    /**
     * @type {HTMLDivElement}
     */
    divGithubBranch: null,
    /**
     * @type {HTMLDivElement}
     */
    divNoEditingName: null,

    /**
     * @type {HTMLDivElement}
     */
    divSelectedIndicator: null,
  };

  #callbacks = {
    /**
     * @type {?Function}
     */
    sourceChanged: null,
  };

  /**
   *
   * @param {HTMLDivElement} parentDiv
   * @param {Metadata} metadata
   * @param {string} panelId
   */
  constructor(parentDiv, metadata, panelId) {
    this.#dom.parentDiv = parentDiv;
    this.#metadata = metadata;
    this.#domId = panelId;
  }

  /**
   * @returns {Metadata}
   */
  get metadata() {
    return this.#metadata;
  }

  /**
   * @returns {Retriever}
   */
  get retriever() {
    return this.#retriever;
  }

  /**
   * @param {boolean} active
   */
  set active(active) {
    this.#metadata.active = active;
    this.#dom.divSelectedIndicator.toggle(active);
    if (!this.#metadata.official) {
      this.#dom.buttonActivate.toggle(!active);
      this.#dom.buttonDeactivate.toggle(active);
    }
    if (!active) {
      this.#retriever = null;
    }
  }

  /**
   * Activates the source, by setting up the retriever and retrieving the index.
   * @returns {Promise<void>}
   */
  async loadData() {
    console.log("Loading source data");
    this.active = true;
    this.#retriever = new Retriever(this.rawUrl);
    await this.#retriever.retrieveIndex();
  }

  /**
   * Loads the source panel.
   */
  async loadPanel() {
    this.#dom.parentDiv.append(`<div id="${this.#domId}"></div>`);
    this.#dom.divWrapper = $(`#${this.#domId}`);
    this.#dom.divWrapper.toggle(false);
    console.log("loading the source panel " + this.#domId);
    await new Promise((resolve) => {
      console.log("Loading source panel HTML " + this.#domId);
      this.#dom.divWrapper.load(
        "./src/tabs/presets/source_panel.html",
        resolve,
      );
    });
    this.#prepareDom();

    this.selected = false;
    this.metadataEdited = false;

    if (this.#metadata.official || this.#metadata.active) {
      this.active = true;
    } else {
      this.active = false;
    }

    i18n.localizePage();
    this.#dom.divWrapper.toggle(true);
  }

  /**
   * @returns {SourceIndex} - The index object
   */
  get index() {
    return this.#retriever.index;
  }

  /**
   * @param {?Function} sourceChangedCallback
   */
  set sourceChangedCallback(sourceChangedCallback) {
    this.#callbacks.sourceChanged = sourceChangedCallback;
  }

  /**
   * @param {boolean} isSelected
   */
  set selected(isSelected) {
    if (this.#selected !== isSelected) {
      this.#dom.divNoEditing.toggle(!isSelected);
      this.#dom.divEditing.toggle(isSelected);
      this.#onResetButtonClick();
      this.#dom.divNoEditingName.text(this.#metadata.name);

      this.#dom.divInnerPanel.toggleClass(
        "presets_source_panel_not_selected",
        !isSelected,
      );
      this.#dom.divInnerPanel.toggleClass(
        "presets_source_panel_selected",
        isSelected,
      );
      if (isSelected) {
        this.#dom.divInnerPanel.off("click");
      } else {
        this.#dom.divInnerPanel.on("click", () => this.#onPanelSelected());
      }

      this.#selected = isSelected;
    }
  }

  /**
   * @param {boolean} edited
   */
  set metadataEdited(edited) {
    this.#metadataEditPending = edited;
    if (this.#metadataEditPending) {
      this.#dom.buttonSave.removeClass("disabled");
      this.#dom.buttonReset.removeClass("disabled");
      this.#dom.buttonActivate.addClass("disabled");
      this.#dom.buttonDeactivate.addClass("disabled");
    } else {
      this.#dom.buttonSave.addClass("disabled");
      this.#dom.buttonReset.addClass("disabled");
      this.#dom.buttonActivate.removeClass("disabled");
      this.#dom.buttonDeactivate.removeClass("disabled");
    }
  }

  /**
   * Callback for when the panel is selected.
   */
  #onPanelSelected() {
    this.selected = true;
    this.#callbacks.onSelected?.(this);
  }

  /**
   * Shows the branch field if the URL is a GitHub repository.
   */
  #displayBranchFieldIfGithub() {
    const isGithubUrl = GithubUtil.isUrlGithubRepo(
      this.#dom.editUrl.val() ?? "",
    );
    this.#dom.divGithubBranch.toggle(isGithubUrl);
  }

  /**
   * Callback for when any of the inputs change.
   */
  #onInputChange() {
    this.#displayBranchFieldIfGithub();
    if (GithubUtil.containsBranchName(this.#dom.editUrl.val())) {
      this.#dom.editGitHubBranch.val(
        GithubUtil.getBranchName(this.#dom.editUrl.val()),
      );
      this.#dom.editUrl.val(this.#dom.editUrl.val().split("/tree/")[0]);
    }
    this.metadataEdited = true;
  }

  /**
   * Callback for when the save button is clicked.
   */
  #onSaveButtonClick() {
    this.#metadata.name = this.#dom.editName.val();
    this.#metadata.url = this.#dom.editUrl.val();
    this.#metadata.branch = this.#dom.editGitHubBranch.val();
    this.metadataEdited = false;
    this.#callbacks.onSave?.(this);
  }

  /**
   * Callback for when the reset button is clicked.
   */
  #onResetButtonClick() {
    this.#dom.editName.val(this.#metadata.name);
    this.#dom.editUrl.val(this.#metadata.url);
    this.#dom.editGitHubBranch.val(this.#metadata.branch);
    this.#displayBranchFieldIfGithub();
    this.metadataEdited = false;
  }

  /**
   * Callback for when the delete button is clicked.
   */
  #onDeleteButtonClick() {
    this.#dom.divWrapper.remove();
    this.#callbacks.sourceChanged?.({ remove: true });
  }

  /**
   * Callback for when the activate button is clicked.
   */
  async #onActivateButtonClick() {
    this.#onSaveButtonClick();
    this.active = true;
    this.#callbacks.sourceChanged?.();
  }

  /**
   * Callback for when the deactivate button is clicked.
   */
  #onDeactivateButtonClick() {
    this.#onSaveButtonClick();
    this.active = false;
    this.#callbacks.sourceChanged?.();
  }

  /**
   * Reads and prepares the DOM elements.
   */
  #prepareDom() {
    this.#dom.divInnerPanel = this.#dom.divWrapper.find(
      ".presets_source_panel",
    );
    this.#dom.divNoEditing = this.#dom.divWrapper.find(
      ".presets_source_panel_no_editing",
    );
    this.#dom.divEditing = this.#dom.divWrapper.find(
      ".presets_source_panel_editing",
    );

    this.#dom.editName = this.#dom.divWrapper.find(
      ".presets_source_panel_editing_name_field",
    );
    this.#dom.editUrl = this.#dom.divWrapper.find(
      ".presets_source_panel_editing_url_field",
    );
    this.#dom.editGitHubBranch = this.#dom.divWrapper.find(
      ".presets_source_panel_editing_branch_field",
    );

    this.#dom.buttonSave = this.#dom.divWrapper.find(
      ".presets_source_panel_save",
    );
    this.#dom.buttonReset = this.#dom.divWrapper.find(
      ".presets_source_panel_reset",
    );
    this.#dom.buttonActivate = this.#dom.divWrapper.find(
      ".presets_source_panel_activate",
    );
    this.#dom.buttonDeactivate = this.#dom.divWrapper.find(
      ".presets_source_panel_deactivate",
    );
    this.#dom.buttonDelete = this.#dom.divWrapper.find(
      ".presets_source_panel_delete",
    );
    this.#dom.divGithubBranch = this.#dom.divWrapper.find(
      ".presets_source_panel_editing_github_branch",
    );
    this.#dom.divNoEditingName = this.#dom.divWrapper.find(
      ".presets_source_panel_no_editing_name",
    );

    this.#dom.divSelectedIndicator = this.#dom.divWrapper.find(
      ".presets_source_panel_no_editing_selected",
    );

    this.#dom.buttonSave.on("click", () => this.#onSaveButtonClick());
    this.#dom.buttonReset.on("click", () => this.#onResetButtonClick());
    this.#dom.buttonDelete.on("click", () => this.#onDeleteButtonClick());
    this.#dom.buttonActivate.on("click", () => this.#onActivateButtonClick());
    this.#dom.buttonDeactivate.on("click", () =>
      this.#onDeactivateButtonClick(),
    );

    this.#dom.editName.on("input", () => this.#onInputChange());
    this.#dom.editUrl.on("input", () => this.#onInputChange());
    this.#dom.editGitHubBranch.on("input", () => this.#onInputChange());

    this.#displayBranchFieldIfGithub();

    if (this.#metadata.official) {
      this.#dom.buttonSave.toggle(false);
      this.#dom.buttonReset.toggle(false);
      this.#dom.buttonDelete.toggle(false);
      this.#dom.buttonActivate.toggle(false);
      this.#dom.buttonDeactivate.toggle(false);
      this.#dom.editName.prop("disabled", true);
      this.#dom.editUrl.prop("disabled", true);
      this.#dom.editGitHubBranch.prop("disabled", true);
    }
  }
}

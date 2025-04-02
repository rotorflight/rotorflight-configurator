/**
 * @typedef {import("@/js/presets/source/retriever.js").PresetData} PresetData
 * @typedef {import("@/js/presets/source/source.js").Source} Source
 */

import CliEngine from "@/js/cli_engine.js";
import * as filesystem from "@/js/filesystem.js";
import PresetInstance from "@/js/presets/source/preset_instance.js";
import PresetDialog from "@/js/presets/preset_dialog.js";
import PresetPanel from "@/js/presets/preset_panel.js";
import Sources from "@/js/presets/sources.js";
import PresetTracker from "@/js/presets/preset_tracker.js";
import { FC } from "@/js/fc.svelte.js";
import { mount, unmount } from "svelte";
import SelectedPresetReviewDialog from "@/tabs/presets/selected_preset_review_dialog.svelte";

const COMMAND_DIFF_ALL = "diff all";
const COMMAND_DUMP_ALL = "dump all";

class PresetsTab {
  /**
   * @type {import("@/js/presets/source/source.js").Source[]}
   */
  activePresetsSources = [];
  /**
   * @type {CliEngine}
   */
  #cliEngine = null;

  /**
   * @type {import("@/js/presets/preset_panel.js").PresetPanel[]}
   */
  presetsPanels = [];

  majorVersion = 1;

  /**
   * @type {import("@/js/presets/preset_tracker.js").default}
   */
  #presetTracker = null;

  /**
   * @type {PresetDialog}
   */
  #presetDialog = null;

  /**
   * @type {Sources}
   */
  #sourcesDialog = null;

  /**
   * @type {PresetInstance[]}
   */
  #presetInstances = [];

  #presetsReviewDialog;

  /**
   * @typedef {Object} DOMElements
   * @property {?HTMLElement} divGlobaling - The global loading indicator element.
   * @property {?HTMLElement} divGlobalLoadingError - The global loading error indicator element.
   * @property {?HTMLElement} divCli - The CLI (Command Line Interface) container element.
   * @property {?HTMLElement} divMainContent - The main content container element.
   * @property {?HTMLSelectElement} selectCategory - The dropdown for selecting a category.
   * @property {?HTMLSelectElement} selectKeyword - The dropdown for selecting a keyword.
   * @property {?HTMLSelectElement} selectAuthor - The dropdown for selecting an author.
   * @property {?HTMLSelectElement} selectFirmwareVersion - The dropdown for selecting a firmware version.
   * @property {?HTMLSelectElement} selectStatus - The dropdown for selecting a status.
   * @property {?HTMLInputElement} inputTextFilter - The input field for text filtering.
   * @property {?HTMLElement} divPresetList - The container for the preset list.
   * @property {?HTMLButtonElement} buttonReview - The save button element.
   * @property {?HTMLButtonElement} buttonReset - The cancel button element.
   * @property {?HTMLButtonElement} reloadButton - The reload button element.
   * @property {?HTMLElement} contentWrapper - The wrapper element for the main content.
   * @property {?HTMLElement} dialogCli - The CLI dialog element.
   * @property {?HTMLButtonElement} buttonCliExit - The button to exit the CLI dialog.
   * @property {?HTMLButtonElement} buttonCliSave - The button to save changes in the CLI dialog.
   * @property {?HTMLElement} progressDialogProgressBar - The progress bar element in the progress dialog.
   * @property {?HTMLElement} dialogCliWarning - The warning dialog element for CLI-related issues.
   * @property {?HTMLButtonElement} buttonBackupDiffAll - The button to backup all differences.
   * @property {?HTMLButtonElement} buttonBackupDumpAll - The button to dump all backups.
   * @property {?HTMLButtonElement} buttonBackupLoad - The button to load a backup.
   * @property {?HTMLButtonElement} buttonPresetSources - The button to manage preset sources.
   * @property {?HTMLElement} warningNotOfficialSource - The warning element for unofficial sources.
   * @property {?HTMLElement} warningFailedToLoadRepositories - The warning element for failed repository loads.
   * @property {?HTMLElement} warningBackup - The warning element for backup-related issues.
   * @property {?HTMLButtonElement} buttonHideBackupWarning - The button to hide the backup warning.
   * @property {?HTMLElement} listNoFound - The element displayed when no items are found.
   * @property {?HTMLElement} listTooManyFound - The element displayed when too many items are found.
   *
   */

  /**
   * @type {DOMElements}
   */
  #dom = {
    divGlobalLoading: null,
    divGlobalLoadingError: null,
    divCli: null,
    divMainContent: null,

    selectCategory: null,
    selectKeyword: null,
    selectAuthor: null,
    selectFirmwareVersion: null,
    selectStatus: null,
    inputTextFilter: null,
    divPresetList: null,

    buttonReview: null,
    buttonReset: null,

    reloadButton: null,
    contentWrapper: null,

    dialogCli: null,
    buttonCliExit: null,
    buttonCliSave: null,
    progressDialogProgressBar: null,
    dialogCliWarning: null,

    buttonBackupDiffAll: null,
    buttonBackupDumpAll: null,
    buttonBackupLoad: null,
    buttonPresetSources: null,

    warningNotOfficialSource: null,
    warningFailedToLoadRepositories: null,
    warningBackup: null,
    buttonHideBackupWarning: null,

    listNoFound: null,
    listTooManyFound: null,
  };

  /**
   * Initializes the presets tab.
   * @param {?Function} callback
   */
  initialize(callback) {
    this.#cliEngine = new CliEngine(this);
    this.#cliEngine.setProgressCallback((value) =>
      this.onApplyProgressChange(value),
    );

    this.#presetTracker = new PresetTracker();

    const self = this;
    $("#content").load("/src/tabs/presets/presets.html", () =>
      self.onHtmlLoad(callback),
    );

    if (GUI.active_tab !== "presets") {
      GUI.active_tab = "presets";
    }
  }

  /**
   * Reads the DOM elements for the presets tab.
   */
  #readDom() {
    this.#dom.divGlobalLoading = $("#presets_global_loading");
    this.#dom.divGlobalLoadingError = $("#presets_global_loading_error");
    this.#dom.divCli = $("#presets_cli");
    this.#dom.divMainContent = $("#presets_main_content");
    this.#dom.selectCategory = $("#presets_filter_category");
    this.#dom.selectKeyword = $("#presets_filter_keyword");
    this.#dom.selectAuthor = $("#presets_filter_author");
    this.#dom.selectFirmwareVersion = $("#presets_filter_firmware_version");
    this.#dom.selectStatus = $("#presets_filter_status");
    this.#dom.inputTextFilter = $("#presets_filter_text");
    this.#dom.divPresetList = $("#presets_list");

    this.#dom.buttonReview = $("#presets_review_button");
    this.#dom.buttonReset = $("#presets_reset_button");

    this.#dom.reloadButton = $("#presets_reload");
    this.#dom.contentWrapper = $("#presets_content_wrapper");

    this.#dom.dialogCli = $("#presets_cli_dialog");
    this.#dom.buttonCliExit = $("#presets_cli_exit_button");
    this.#dom.buttonCliSave = $("#presets_cli_save_button");
    this.#dom.progressDialogProgressBar = $(
      ".presets_apply_progress_dialog_progress_bar",
    );
    this.#dom.dialogCliWarning = $(".presets_cli_errors_dialog_warning");

    this.#dom.buttonBackupDiffAll = $(".backup_diff_all");
    this.#dom.buttonBackupDumpAll = $(".backup_dump_all");
    this.#dom.buttonBackupLoad = $(".backup_load");
    this.#dom.buttonPresetSources = $(".presets_sources_show");

    this.#dom.warningNotOfficialSource = $(
      ".presets_warning_not_official_source",
    );
    this.#dom.warningFailedToLoadRepositories = $(
      ".presets_failed_to_load_repositories",
    );
    this.#dom.warningBackup = $(".presets_warning_backup");
    this.#dom.buttonHideBackupWarning = $(
      ".presets_warning_backup_button_hide",
    );

    this.#dom.listNoFound = $("#presets_list_no_found");
    this.#dom.listTooManyFound = $("#presets_list_too_many_found");
  }

  /**
   * Renders the CLI commands for all picked presets.
   * @returns {string[]}
   */
  getPickedPresetsCli() {
    let result = [];
    this.#presetInstances.forEach((pi) => {
      result.push(...pi.renderedCliArr);
    });
    result = result.filter((command) => command.trim() !== "");
    return result;
  }

  onApplyProgressChange(value) {
    this.#dom.progressDialogProgressBar.val(value);
  }

  applyCommandsList(strings) {
    strings.forEach((cliCommand) => {
      this.#cliEngine.sendLine(cliCommand);
    });
  }

  async onReviewClick(skipReview = false) {
    const self = this;

    const previewArea = $("#snippetpreviewcontent textarea#preview");

    async function executeSnippet() {
      try {
        await self.activateCli();
        self.#dom.progressDialogProgressBar.show();
        self.#dom.progressDialogProgressBar.val(0);
        self.setupCliDialogAndShow(i18n.getMessage("presetsApplyingPresets"));
        const commands = previewArea.val();
        self.snippetPreviewWindow.close();

        const initialCliErrorCount = self.#cliEngine.errorsCount;
        await self.#cliEngine.executeCommands(commands);

        self.#dom.progressDialogProgressBar.hide();
        if (self.#cliEngine.errorsCount !== initialCliErrorCount) {
          showFinalCliOptions(true);
        } else {
          showFinalCliOptions(false);
        }
      } catch (error) {
        console.error("Error in executeSnippet:", error);
      }
    }

    function previewCommands(result, resetOnClose = false) {
      if (!self.snippetPreviewWindow) {
        self.snippetPreviewWindow = new jBox("Modal", {
          id: "snippetPreviewWindow",
          width: "auto",
          height: "auto",
          closeButton: "title",
          animation: false,
          isolateScroll: false,
          title: i18n.getMessage("presetsCliConfirmationDialogTitle"),
          content: $("#snippetpreviewcontent"),
          onCreated: () =>
            $("#snippetpreviewcontent a.confirm").on("click", () =>
              executeSnippet(),
            ),
          onClose: () => {
            if (resetOnClose) {
              self.#resetAction();
            }
          },
        });
      }
      previewArea.val(result.join("\n"));
      self.snippetPreviewWindow.open();
    }

    function showFinalCliOptions(errorsEncountered) {
      if (errorsEncountered) {
        $("#presets_cli_command_input").toggle(true);
      }
      self.#dom.buttonCliSave.off("click");
      self.#dom.buttonCliSave.on("click", () => {
        self.#cliEngine.subscribeResponseCallback(() => {
          self.#cliEngine.unsubscribeResponseCallback();
          if (self.#cliEngine.inBatchMode && errorsEncountered) {
            // In case of batch CLI command errors, the firmware requires extra "save" command for CLI safety.
            // No need for this safety in presets as preset tab already detected errors and showed them to the user.
            // At this point user clicked "save anyway".
            self.#cliEngine.sendLine("save");
          }
        });
        self.#cliEngine.sendLine("save");
        self.#dom.dialogCli[0].close();
      });
      self.#dom.buttonCliSave.show();

      self.#dom.buttonCliExit.off("click");
      self.#dom.buttonCliExit.on("click", () => {
        self.#dom.dialogCli[0].close();
      });
      self.#dom.buttonCliExit.show();

      self.#dom.dialogCli.on("close", () => {
        self.#cliEngine.sendLine("exit");
        self.disconnectCliMakeSure();
        self.#dom.dialogCliWarning.hide();
        self.#dom.buttonCliSave.hide();
        self.#dom.buttonCliExit.hide();
        self.#dom.dialogCli.off("close");
        self.#dom.buttonCliSave.off("click");
        self.#dom.buttonCliExit.off("click");
      });
    }

    if (this.#presetsReviewDialog) {
      unmount(this.#presetsReviewDialog);
      this.#presetsReviewDialog = undefined;
    }

    if (skipReview) {
      previewCommands(this.getPickedPresetsCli(), true);
    } else {
      this.#presetsReviewDialog = mount(SelectedPresetReviewDialog, {
        target: document.querySelector("#svelte_components"),
        props: {
          presetInstances: this.#presetInstances,
          /** @param {PresetInstance} presetInstance */
          onEditPresetInstance: (presetInstance, onEditCompleteCallback) => {
            this.#displayPresets(
              this.#searchPresets(null, presetInstance.presetData.hash),
            ).then(() => {
              this.freezeSearch = true;
              const presetPanel = this.presetsPanels[0];
              presetPanel.showPresetDetails(
                self.#presetDialog,
                self.#presetInstances,
                presetInstance,
                () => {
                  onEditCompleteCallback();
                  this.freezeSearch = false;
                  this.#updateSearchResults();
                },
              );
            });
          },
          onCancelButtonClicked: () => {
            unmount(this.#presetsReviewDialog);
            this.#updateSearchResults();
            if (this.#presetInstances.length == 0) {
              this.enableSaveCancelButtons(false);
            }
          },
          onApplyButtonClicked: () => {
            unmount(this.#presetsReviewDialog);
            self.markPickedPresetsAsFavorites();
            previewCommands(this.getPickedPresetsCli());
          },
        },
      });
      $("#presets_review_dialog")[0].showModal();
    }
  }

  disconnectCliMakeSure() {
    GUI.timeout_add(
      "disconnect",
      function () {
        $("div.connect_controls a.connect").trigger("click");
      },
      500,
    );
  }

  markPickedPresetsAsFavorites() {
    for (const presetInstance of this.#presetInstances) {
      if (presetInstance.source !== undefined) {
        this.#presetTracker.add(presetInstance.viewLink);
      }
    }
  }

  setupCliDialogAndShow(dialogTitle) {
    const title = $("#presets_cli_dialog_title");

    title.html(dialogTitle);
    title.show();
    $("#presets_cli_command_input").toggle(false);
    this.#dom.dialogCli[0].showModal();
    return this.#dom.dialogCli[0];
  }

  #resetAction() {
    this.#presetInstances = [];
    this.#updateSearchResults();
    this.enableSaveCancelButtons(false);
  }

  setupMenuButtons() {
    this.#dom.buttonReview.on("click", () => this.onReviewClick());
    this.#dom.buttonReset.on("click", () => {
      this.#resetAction();
    });

    this.#dom.buttonBackupDiffAll.on("click", () =>
      this.onSaveBackupClick("diff"),
    );
    this.#dom.buttonBackupDumpAll.on("click", () =>
      this.onSaveBackupClick("dump"),
    );
    this.#dom.buttonBackupLoad.on("click", () => this.onBackupLoadClick());

    this.#dom.buttonPresetSources.on("click", () =>
      this.onPresetSourcesShowClick(),
    );
    this.#dom.buttonHideBackupWarning.on("click", () =>
      this.onButtonHideBackupWarningClick(),
    );

    this.#dom.buttonReview.toggleClass("disabled", false);
    this.#dom.buttonReset.toggleClass("disabled", false);
    this.#dom.reloadButton.on("click", () => this.reload());

    this.enableSaveCancelButtons(false);
  }

  enableSaveCancelButtons(isEnabled) {
    this.#dom.buttonReview.toggleClass("disabled", !isEnabled);
    this.#dom.buttonReset.toggleClass("disabled", !isEnabled);
    this.#dom.buttonBackupLoad.toggleClass("disabled", isEnabled);
    this.#dom.buttonBackupDiffAll.toggleClass("disabled", isEnabled);
    this.#dom.buttonBackupDumpAll.toggleClass("disabled", isEnabled);
    this.#dom.buttonPresetSources.toggleClass("disabled", isEnabled);
  }

  onButtonHideBackupWarningClick() {
    this.#dom.warningBackup.toggle(false);
    ConfigStorage.set({ showPresetsWarningBackup: false });
  }

  setupBackupWarning() {
    let showPresetsWarningBackup = false;
    ConfigStorage.get("showPresetsWarningBackup", function (result) {
      if (result.showPresetsWarningBackup) {
        showPresetsWarningBackup = true;
      } else if (showPresetsWarningBackup === undefined) {
        showPresetsWarningBackup = true;
      }
    });

    const warningVisible = !!showPresetsWarningBackup;
    this.#dom.warningBackup.toggle(warningVisible);
  }

  onPresetSourcesShowClick() {
    this.#sourcesDialog.show().then(() => {
      this.reload();
    });
  }

  async handleBackupDialogSaveClick(backupType) {
    const prefix = "backup_" + backupType;
    const suffix = ".txt";
    try {
      await filesystem.writeTextFile(this.#cliEngine.outputHistory, {
        suggestedName: generateFilename(prefix, suffix),
        description: `${suffix.toUpperCase()} files`,
      });
      this.#dom.dialogCli[0].close();
    } catch (err) {
      console.error("Failed to save backup", err);
      alert(i18n.getMessage("backupFailedToSave"));
      this.#dom.dialogCli[0].close();
    }
  }

  async onSaveBackupClick(backupType) {
    let backupCliDialogTitle = "";

    switch (backupType) {
      case "diff":
        backupCliDialogTitle = i18n.getMessage("backupDiffAll");
        break;
      case "dump":
        backupCliDialogTitle = i18n.getMessage("backupDumpAll");
        break;
    }

    this.setupCliDialogAndShow(backupCliDialogTitle);
    this.#dom.buttonCliSave.off("click");
    this.#dom.buttonCliSave.on(
      "click",
      this.handleBackupDialogSaveClick.bind(this, backupType),
    );
    this.#dom.buttonCliSave.toggleClass("disabled", true);
    this.#dom.buttonCliSave.show();

    this.#dom.buttonCliExit.off("click");
    this.#dom.buttonCliExit.on("click", () => {
      this.#dom.dialogCli[0].close();
    });
    this.#dom.buttonCliExit.toggleClass("disabled", true);
    this.#dom.buttonCliExit.show();

    await this.activateCli();
    await this.performBackup(backupType);

    this.#dom.buttonCliSave.toggleClass("disabled", false);
    this.#dom.buttonCliExit.toggleClass("disabled", false);

    this.#dom.dialogCli.on("close", () => {
      this.#cliEngine.sendLine("exit");
      this.disconnectCliMakeSure();
      this.#dom.dialogCliWarning.hide();
      this.#dom.buttonCliSave.hide();
      this.#dom.buttonCliExit.hide();
      this.#dom.dialogCli.off("close");
      this.#dom.buttonCliSave.off("click");
      this.#dom.buttonCliExit.off("click");
    });
  }

  performBackup(backupType) {
    const self = this;
    let lastCliStringReceived = performance.now();

    const readingDumpIntervalName = "PRESETS_BACKUP_INTERVAL";
    this.#cliEngine.subscribeResponseCallback(() => {
      lastCliStringReceived = performance.now();
    });

    switch (backupType) {
      case "diff":
        this.#cliEngine.sendLine(COMMAND_DIFF_ALL);
        break;
      case "dump":
        this.#cliEngine.sendLine(COMMAND_DUMP_ALL);
        break;
      default:
        return;
    }

    return new Promise((resolve) => {
      GUI.interval_add(
        readingDumpIntervalName,
        () => {
          const currentTime = performance.now();
          if (currentTime - lastCliStringReceived > 500) {
            GUI.interval_remove(readingDumpIntervalName);
            resolve(self.#cliEngine.outputHistory);
          }
        },
        500,
        false,
      );
    });
  }

  async onBackupLoadClick() {
    try {
      const file = await filesystem.readTextFile({
        description: "Backup Files",
        extensions: [".txt", ".config"],
      });
      if (!file) return;

      const pickedPreset = new PresetInstance();
      pickedPreset.renderedCliArr = file.content.split("\n");
      this.#presetInstances.push(pickedPreset);
      this.onReviewClick(true);
    } catch (err) {
      console.error("Failed to load config", err);
    }
  }

  async onHtmlLoad(callback) {
    i18n.localizePage();
    this.adaptPhones();
    this.#readDom();
    this.setupMenuButtons();
    this.setupBackupWarning();
    this.#dom.inputTextFilter.attr(
      "placeholder",
      i18n.getMessage("presetsSearchPlaceholder"),
    );

    this.#presetDialog = new PresetDialog(
      $("#presets_detailed_dialog"),
      () => {
        this.enableSaveCancelButtons(true);
      },
      this.#presetTracker,
    );
    this.#sourcesDialog = new Sources("#presets_sources_dialog");

    await this.#presetDialog.initialize();
    await this.#sourcesDialog.load();

    await this.tryLoadPresets();
    GUI.content_ready(callback);
  }

  // activateCli returns a new Promise that resolves when the CLI engine is ready
  activateCli() {
    return new Promise((resolve) => {
      CONFIGURATOR.cliEngineActive = true;
      CONFIGURATOR.cliTab = "presets";
      this.#cliEngine.setUi(
        $("#presets_cli_dialog .window"),
        $("#presets_cli_dialog .window .wrapper"),
        $("#presets_cli_command_input"),
      );
      this.#cliEngine.enterCliMode();

      const waitForValidCliEngine = setInterval(() => {
        if (CONFIGURATOR.cliEngineActive) {
          clearInterval(waitForValidCliEngine);
          GUI.timeout_add(
            "presets_enter_cli_mode_done",
            () => {
              resolve();
            },
            500,
          );
        }
      }, 500);
    });
  }

  async reload() {
    this.resetInitialValues();
    await this.tryLoadPresets();
  }

  async tryLoadPresets() {
    const activeSources = this.#sourcesDialog.collectActiveSources();
    this.activePresetsSources = [];
    for (let i = 0; i < activeSources.length; i++) {
      this.activePresetsSources.push(activeSources[i]);
    }

    this.#dom.divMainContent.toggle(false);
    this.#dom.divGlobalLoadingError.toggle(false);
    this.#dom.divGlobalLoading.toggle(true);
    this.#dom.warningNotOfficialSource.toggle(
      this.#sourcesDialog.isThirdPartyActive,
    );

    const failedToLoad = [];

    for (let i = 0; i < this.activePresetsSources.length; i++) {
      try {
        await this.activePresetsSources[i].loadData();
      } catch (err) {
        console.error(err);
        failedToLoad.push(this.activePresetsSources[i]);
      }
    }
    try {
      this.#dom.warningFailedToLoadRepositories.toggle(failedToLoad.length > 0);
      this.#dom.warningFailedToLoadRepositories.html(
        i18n.getMessage("presetsFailedToLoadRepositories", {
          repos: failedToLoad.map((repo) => repo.metadata.name).join(", "),
        }),
      );
      this.activePresetsSources = this.activePresetsSources.filter(
        (repo) => !failedToLoad.includes(repo),
      );
      this.#prepareFilterFields();
      this.#dom.divGlobalLoading.toggle(false);
      this.#dom.divMainContent.toggle(true);
    } catch (err) {
      this.#dom.divGlobalLoading.toggle(false);
      this.#dom.divGlobalLoadingError.toggle(true);
      console.error(err);
    }
  }

  multipleSelectComponentScrollFix() {
    /*
            A hack for multiple select that fixes scrolling problem
            when the number of items 199+. More details here:
            https://github.com/wenzhixin/multiple-select/issues/552
        */
    return new Promise((resolve) => {
      GUI.timeout_add(
        "hack_fix_multipleselect_scroll",
        () => {
          this.#dom.selectCategory.multipleSelect("refresh");
          this.#dom.selectKeyword.multipleSelect("refresh");
          this.#dom.selectAuthor.multipleSelect("refresh");
          this.#dom.selectFirmwareVersion.multipleSelect("refresh");
          this.#dom.selectStatus.multipleSelect("refresh");
          resolve();
        },
        100,
      );
    });
  }

  #prepareFilterFields() {
    function getUniqueValues(objects, extractor) {
      let values = objects.map(extractor);
      let uniqueValues = [
        ...values.reduce((a, b) => new Set([...a, ...b]), new Set()),
      ];
      return uniqueValues.sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      );
    }

    this.freezeSearch = true;

    this.#prepareFilterSelectField(
      this.#dom.selectCategory,
      getUniqueValues(
        this.activePresetsSources,
        (x) => x.index.uniqueValues.category,
      ),
      3,
    );
    this.#prepareFilterSelectField(
      this.#dom.selectKeyword,
      getUniqueValues(
        this.activePresetsSources,
        (x) => x.index.uniqueValues.keywords,
      ),
      3,
    );
    this.#prepareFilterSelectField(
      this.#dom.selectAuthor,
      getUniqueValues(
        this.activePresetsSources,
        (x) => x.index.uniqueValues.author,
      ),
      1,
    );
    this.#prepareFilterSelectField(
      this.#dom.selectFirmwareVersion,
      getUniqueValues(
        this.activePresetsSources,
        (x) => x.index.uniqueValues.firmware_version,
      ),
      2,
    );
    this.#prepareFilterSelectField(
      this.#dom.selectStatus,
      getUniqueValues(
        this.activePresetsSources,
        (x) => x.index.settings.PresetStatusEnum,
      ),
      2,
    );

    this.multipleSelectComponentScrollFix().then(() => {
      this.#preselectFilterFields();
      this.#dom.inputTextFilter.on("input", () => this.#updateSearchResults());
      this.freezeSearch = false;
      this.#updateSearchResults();
    });
  }

  #preselectFilterFields() {
    const currentVersion = FC.CONFIG.flightControllerVersion;
    const selectedVersions = [];

    for (const source of this.activePresetsSources) {
      for (const bfVersion of source.index.uniqueValues.firmware_version) {
        if (currentVersion.startsWith(bfVersion)) {
          selectedVersions.push(bfVersion);
        }
      }
    }

    this.#dom.selectFirmwareVersion.multipleSelect(
      "setSelects",
      selectedVersions,
    );
  }

  #prepareFilterSelectField(
    domSelectElement,
    selectOptions,
    minimumCountSelected,
  ) {
    domSelectElement.multipleSelect("destroy");
    domSelectElement.multipleSelect({
      data: selectOptions,
      showClear: true,
      minimumCountSelected: minimumCountSelected,
      placeholder: i18n.getMessage("dropDownFilterDisabled"),
      onClick: () => {
        this.#updateSearchResults();
      },
      onCheckAll: () => {
        this.#updateSearchResults();
      },
      onUncheckAll: () => {
        this.#updateSearchResults();
      },
      formatSelectAll() {
        return i18n.getMessage("dropDownSelectAll");
      },
      formatAllSelected() {
        return i18n.getMessage("dropDownAll");
      },
    });
  }

  async #updateSearchResults() {
    if (!this.freezeSearch) {
      this.freezeSearch = true;
      const searchParams = {
        categories: this.#dom.selectCategory.multipleSelect(
          "getSelects",
          "text",
        ),
        keywords: this.#dom.selectKeyword.multipleSelect("getSelects", "text"),
        authors: this.#dom.selectAuthor.multipleSelect("getSelects", "text"),
        firmwareVersions: this.#dom.selectFirmwareVersion.multipleSelect(
          "getSelects",
          "text",
        ),
        status: this.#dom.selectStatus.multipleSelect("getSelects", "text"),
        searchString: this.#dom.inputTextFilter.val().trim(),
      };

      this.#updateSelectStyle();
      searchParams.authors = searchParams.authors.map((str) =>
        str.toLowerCase(),
      );
      await this.#displayPresets(this.#searchPresets(searchParams));
      this.freezeSearch = false;
    }
  }

  #updateSelectStyle() {
    this.#updateSingleSelectStyle(this.#dom.selectCategory);
    this.#updateSingleSelectStyle(this.#dom.selectKeyword);
    this.#updateSingleSelectStyle(this.#dom.selectAuthor);
    this.#updateSingleSelectStyle(this.#dom.selectFirmwareVersion);
    this.#updateSingleSelectStyle(this.#dom.selectStatus);
  }

  #updateSingleSelectStyle(select) {
    const selectedOptions = select.multipleSelect("getSelects", "text");
    const isSomethingSelected = 0 !== selectedOptions.length;
    select
      .parent()
      .find($(".ms-choice"))
      .toggleClass("presets_filter_select_nonempty", isSomethingSelected);
  }

  async #displayPresets(presets) {
    this.presetsPanels.forEach((presetPanel) => {
      presetPanel.remove();
    });
    this.presetsPanels = [];

    const maxPresetsToShow = 60;
    this.#dom.listTooManyFound.toggle(presets.length > maxPresetsToShow);
    presets.length = Math.min(presets.length, maxPresetsToShow);

    this.#dom.listNoFound.toggle(presets.length === 0);

    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      const presetPanel = new PresetPanel(
        this.#dom.divPresetList,
        preset[0],
        preset[1],
        true,
        this.#sourcesDialog.isThirdPartyActive,
        this.#presetSelected(preset[0], preset[1]),
        null,
        this.#presetTracker,
      );
      await presetPanel.load();
      this.presetsPanels.push(presetPanel);
      presetPanel.subscribeClick(this.#presetDialog, this.#presetInstances);
    }

    this.#dom.listTooManyFound.appendTo(this.#dom.divPresetList);
  }

  /**
   *
   * @param {PresetData} presetData
   * @param {Source} source
   * @returns
   */
  #presetSelected(presetData, source) {
    let presetFound = false;
    this.#presetInstances.forEach((pi) => {
      if (
        pi.presetData.hash === presetData.hash &&
        pi.sourceMetadata.rawUrl === source.rawUrl
      ) {
        presetFound = true;
      }
    });
    return presetFound;
  }

  #searchPresets(searchParams, hash = "") {
    console.log("Searching presets with parameters: ", searchParams);
    const matchingPresets = [];
    const presetsViewLinkHashTable = [];
    const seenHashes = new Set();

    for (const source of this.activePresetsSources) {
      for (const preset of source.index.presets) {
        if (
          (this.#presetMatchesSearch(preset, searchParams) ||
            this.#presetSelected(preset, source) ||
            (hash != "" && hash == preset.hash)) &&
          !seenHashes.has(preset.hash)
        ) {
          matchingPresets.push([preset, source]);
          presetsViewLinkHashTable[preset.hash] =
            source.metadata.viewUrl + preset.fullPath;
          seenHashes.add(preset.hash);
        }
      }
    }

    console.log("Presets found: ", matchingPresets);

    matchingPresets.sort((a, b) =>
      this.#presetSearchPriorityComparer(presetsViewLinkHashTable, a[0], b[0]),
    );

    return matchingPresets;
  }

  #presetSearchPriorityComparer(presetsViewLinkHashTable, presetA, presetB) {
    const presetALastPickDate = this.#presetTracker.find(
      presetsViewLinkHashTable[presetA.hash],
    );
    const presetBLastPickDate = this.#presetTracker.find(
      presetsViewLinkHashTable[presetB.hash],
    );

    if (presetALastPickDate && presetBLastPickDate) {
      return presetBLastPickDate - presetALastPickDate;
    }

    if (presetALastPickDate || presetBLastPickDate) {
      return presetALastPickDate ? -1 : 1;
    }

    return presetA.priority > presetB.priority ? -1 : 1;
  }

  /**
   *
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesStatuses(preset, searchParams) {
    return (
      0 === searchParams.status.length ||
      searchParams.status.includes(preset.status)
    );
  }

  /**
   *
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesSearchCategories(preset, searchParams) {
    if (0 !== searchParams.categories.length) {
      if (undefined === preset.category) {
        return false;
      }

      if (!searchParams.categories.includes(preset.category)) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesBoardName(preset) {
    if (undefined === preset.board_name || FC.CONFIG.boardName == "") {
      return true;
    }

    let boardNameMatches = false;
    preset.board_name.forEach((boardName) => {
      if (FC.CONFIG.boardName === boardName) {
        boardNameMatches = true;
      }
    });

    return boardNameMatches;
  }

  /**
   *
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesSearchKeyboards(preset, searchParams) {
    if (0 !== searchParams.keywords.length) {
      if (!Array.isArray(preset.keywords)) {
        return false;
      }

      const keywordsIntersection = searchParams.keywords.filter((value) =>
        preset.keywords.includes(value),
      );
      if (0 === keywordsIntersection.length) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesAuthors(preset, searchParams) {
    if (0 !== searchParams.authors.length) {
      if (undefined === preset.author) {
        return false;
      }

      if (!searchParams.authors.includes(preset.author.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesFirmwareVersions(preset, searchParams) {
    if (0 !== searchParams.firmwareVersions.length) {
      if (!Array.isArray(preset.firmware_version)) {
        return false;
      }

      const firmwareVersionsIntersection = searchParams.firmwareVersions.filter(
        (value) => preset.firmware_version.includes(value),
      );
      if (0 === firmwareVersionsIntersection.length) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesSearchString(preset, searchParams) {
    if (searchParams.searchString) {
      const allKeywords = preset.keywords.join(" ");
      const allVersions = preset.firmware_version.join(" ");
      const totalLine = [
        preset.description,
        allKeywords,
        preset.title,
        preset.author,
        allVersions,
        preset.category,
      ]
        .join("\n")
        .toLowerCase()
        .replace("''", '"');
      const allWords = searchParams.searchString
        .toLowerCase()
        .replace("''", '"')
        .split(" ");

      for (const word of allWords) {
        if (!totalLine.includes(word)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * @param {PresetData} preset
   * @param {*} searchParams
   * @returns
   */
  #presetMatchesSearch(preset, searchParams) {
    if (searchParams == null) {
      return false;
    }
    if (preset.hidden) {
      return false;
    }

    if (!this.#presetMatchesStatuses(preset, searchParams)) {
      return false;
    }

    if (!this.#presetMatchesSearchCategories(preset, searchParams)) {
      return false;
    }

    if (!this.#presetMatchesSearchKeyboards(preset, searchParams)) {
      return false;
    }

    if (!this.#presetMatchesAuthors(preset, searchParams)) {
      return false;
    }

    if (!this.#presetMatchesFirmwareVersions(preset, searchParams)) {
      return false;
    }

    if (!this.#presetMatchesSearchString(preset, searchParams)) {
      return false;
    }

    if (!this.#presetMatchesBoardName(preset)) {
      return false;
    }

    return true;
  }

  adaptPhones() {
    if (GUI.isCordova()) {
      UI_PHONES.initToolbar();
    }
  }

  read(readInfo) {
    this.#cliEngine.readSerial(readInfo);
  }

  cleanup(callback) {
    this.resetInitialValues();

    if (
      !(
        CONFIGURATOR.connectionValid &&
        CONFIGURATOR.cliEngineActive &&
        CONFIGURATOR.cliEngineValid
      )
    ) {
      if (callback) {
        callback();
      }

      return;
    }

    TABS.presets.#cliEngine.close(() => {
      if (callback) {
        callback();
      }
    });
  }

  resetInitialValues() {
    CONFIGURATOR.cliEngineActive = false;
    CONFIGURATOR.cliEngineValid = false;
    CONFIGURATOR.cliTab = "";
    this.activePresetsSources = [];
    this.#presetInstances = [];
    //this.domProgressDialog.close();
  }
}

TABS["presets"] = new PresetsTab();

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && GUI.active_tab === "presets") {
      TABS["presets"].initialize();
    }
  });

  import.meta.hot.dispose(() => {
    TABS["presets"].cleanup();
  });
}

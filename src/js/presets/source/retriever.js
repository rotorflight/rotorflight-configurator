/**
 * @typedef {object} SourceIndex
 * @property {number} majorVersion
 * @property {number} minorVersion
 * @property {Settings} settings
 * @property {UniqueValues} uniqueValues
 * @property {PresetData[]} presets
 *
 * @typedef {object} Settings
 * @property {string} MetapropertyDirective
 * @property {PresetCategories} PresetCategories
 * @property {PresetCategoriesPriorities} PresetCategoriesPriorities
 * @property {MetadataTypes} MetadataTypes
 * @property {OptionsDirectives} OptionsDirectives
 * @property {string[]} PresetStatusEnum
 * @property {string[]} ParserEnum
 * @property {string} presetsDir
 * @property {string} presetsFileEncoding
 * @property {PresetsFileMetadata} presetsFileMetadata
 *
 * @typedef {object} PresetCategories
 * @property {string} PROFILE
 * @property {string} RATEPROFILE
 * @property {string} FILTERS
 * @property {string} REMAPPING
 * @property {string} BNF
 * @property {string} OTHER
 *
 * @typedef {object} PresetCategoriesPriorities
 * @property {number} PROFILE
 * @property {number} RATEPROFILE
 * @property {number} REMAPPING
 * @property {number} FILTERS
 * @property {number} BNF
 * @property {number} OTHER
 *
 * @typedef {object} MetadataTypes
 * @property {string} STRING
 * @property {string} STRING_ARRAY
 * @property {string} PRESET_CATEGORY
 * @property {string} FILE_PATH
 * @property {string} BOOLEAN
 * @property {string} WORDS_ARRAY
 * @property {string} FILE_PATH_ARRAY
 * @property {string} PRESET_STATUS
 * @property {string} PRIORITY
 * @property {string} PARSER
 *
 * @typedef {object} OptionsDirectives
 * @property {string} OPTION_DIRECTIVE
 * @property {string} BEGIN_OPTION_DIRECTIVE
 * @property {string} END_OPTION_DIRECTIVE
 * @property {string} OPTION_CHECKED
 * @property {string} OPTION_UNCHECKED
 * @property {string} BEGIN_OPTION_GROUP_DIRECTIVE
 * @property {string} END_OPTION_GROUP_DIRECTIVE
 * @property {string} EXCLUSIVE_OPTION_GROUP
 *
 * @typedef {object} PresetsFileMetadata
 * @property {Title} title
 * @property {FirmwareVersion} firmware_version
 * @property {Category} category
 * @property {Status} status
 * @property {Author} author
 * @property {Description} description
 * @property {Include} include
 * @property {Keywords} keywords
 * @property {BoardName} board_name
 * @property {Hidden} hidden
 * @property {Discussion} discussion
 * @property {Warning} warning
 * @property {Disclaimer} disclaimer
 * @property {IncludeWarning} include_warning
 * @property {IncludeDisclaimer} include_disclaimer
 * @property {Priority} priority
 * @property {ForceOptionsReview} force_options_review
 * @property {Parser} parser
 *
 * @typedef {object} Title
 * @property {string} title.type
 * @property {boolean} title.optional
 *
 * @typedef {object} FirmwareVersion
 * @property {string} firmware_version.type
 * @property {boolean} firmware_version.optional
 *
 * @typedef {object} BoardName
 * @property {string} board_name.type
 * @property {boolean} board_name.optional
 *
 * @typedef {object} Category
 * @property {string} category.type
 * @property {boolean} category.optional
 *
 * @typedef {object} Status
 * @property {string} status.type
 * @property {boolean} status.optional
 *
 * @typedef {object} Author
 * @property {string} author.type
 * @property {boolean} author.optional
 *
 * @typedef {object} Description
 * @property {string} description.type
 * @property {boolean} description.optional
 *
 * @typedef {object} Include
 * @property {string} include.type
 * @property {boolean} include.optional
 *
 * @typedef {object} Keywords
 * @property {string} keywords.type
 * @property {boolean} keywords.optional
 *
 * @typedef {object} Hidden
 * @property {string} hidden.type
 * @property {boolean} hidden.optional
 *
 * @typedef {object} Discussion
 * @property {string} discussion.type
 * @property {boolean} discussion.optional
 *
 * @typedef {object} Warning
 * @property {string} warning.type
 * @property {boolean} warning.optional
 *
 * @typedef {object} Disclaimer
 * @property {string} disclaimer.type
 * @property {boolean} disclaimer.optional
 *
 * @typedef {object} IncludeWarning
 * @property {string} include_warning.type
 * @property {boolean} include_warning.optional
 *
 * @typedef {object} IncludeDisclaimer
 * @property {string} include_disclaimer.type
 * @property {boolean} include_disclaimer.optional
 *
 * @typedef {object} Priority
 * @property {string} priority.type
 * @property {boolean} priority.optional
 *
 * @typedef {object} ForceOptionsReview
 * @property {string} force_options_review.type
 * @property {boolean} force_options_review.optional
 *
 * @typedef {object} Parser
 * @property {string} parser.type
 * @property {boolean} parser.optional
 *
 * @typedef {object} UniqueValues
 * @property {string[]} firmware_version
 * @property {string[]} category
 * @property {string[]} author
 * @property {string[]} keywords
 *
 * @typedef {object} PresetData
 * @property {string} fullPath
 * @property {string} hash
 * @property {string} title
 * @property {string[]} firmware_version
 * @property {string[]} board_name
 * @property {string} category
 * @property {string} status
 * @property {string[]} keywords
 * @property {string} author
 * @property {number} priority
 */

/**
 * @typedef {import("@/js/presets/source/preset_instance.js").default} PresetInstance
 */

// Reg exp extracts file/path.txt from # include: file/path.txt
const REGEXP_INCLUDE = /^#\$[ ]+?INCLUDE:[ ]+?(?<filePath>\S+$)/;

/**
 * Indexer class that loads the index.json and can retrieve and can parse presets from a source
 */
export default class Retriever {
  /**
   * @type {string} - The URL to prefix preset fullpaths with.
   */
  #rawUrl;

  /**
   * @type {SourceIndex}
   */
  #index = null;

  /**
   * @returns {SourceIndex} - The index object
   */
  get index() {
    return this.#index;
  }

  /**
   * @type {Parser}
   */
  #parser;

  /**
   * @returns {Parser} - The preset parser
   */
  get parser() {
    return this.#parser;
  }

  /**
   * @param {string} rawUrl
   */
  constructor(rawUrl) {
    this.#rawUrl = rawUrl.trim();
  }

  /**
   * Retrieves the index.json from the source.
   * @returns {Promise<Response>}
   */
  async retrieveIndex() {
    try {
      const res = await fetch(`${this.#rawUrl}index.json`, {
        cache: "no-cache",
      });
      const index = await res.json();
      console.log("Loaded index from: " + this.#rawUrl + "index.json");
      this.#index = index;
      this.#parser = new Parser(this.#index.settings);
    } catch (err) {
      console.log("error while trying to fetch index.json: " + err);
      throw err;
    }
  }

  /**
   * Parses the given strings and adds promises generated for each include
   * @param {string[]} strings
   * @param {number[]} includeRowIndexes
   * @param {Promise[]} promises
   */
  #parseIncludes(strings, includeRowIndexes, promises) {
    for (let i = 0; i < strings.length; i++) {
      const match = REGEXP_INCLUDE.exec(strings[i]);

      if (match !== null) {
        includeRowIndexes.push(i);
        const promise = this.#fetchFile(this.#rawUrl + match.groups.filePath);
        promises.push(
          promise.then((text) => {
            let tmpStrings = text.split("\n");
            tmpStrings = tmpStrings.map((str) => str.trim());
            let strings = [];
            for (let line of tmpStrings) {
              if (
                !line.startsWith(this.#index.settings.MetapropertyDirective) ||
                line
                  .slice(this.#index.settings.MetapropertyDirective.length)
                  .trim()
                  .toLowerCase()
                  .startsWith(
                    this.#index.settings.OptionsDirectives.OPTION_DIRECTIVE,
                  )
              ) {
                strings.push(line);
              }
            }
            return strings;
          }),
        );
      }
    }
  }

  /**
   * Iterates over strings and expands any nested arrays within it
   * @param {(string|string[])[]} strings
   * @returns {string[]}
   */
  #expandNestedStringsArray(strings) {
    let i = 0;
    while (i < strings.length) {
      if (Array.isArray(strings[i])) {
        strings.splice(i, 1, ...strings[i]);
      } else {
        i++;
      }
    }
    return strings;
  }

  /**
   * executes the nested includes by checking for an include directive
   * @param {string[]} strings
   * @returns {Promise<string[]>}
   */
  async #executeIncludes(strings) {
    if (this.#parser.isIncludeFound(strings)) {
      /**
       * @type {number[]} - row indexes with "#include" statements
       */
      const includeRowIndexes = []; // row indexes with "#include" statements

      /**
       * @type {Promise[]} - promises to load all files
       */
      const promises = []; // promises to load included files

      this.#parseIncludes(strings, includeRowIndexes, promises);

      /**
       * @type {string[]} - an array of the included texts that have been loaded
       */
      const includedTexts = await Promise.all(promises);

      for (let i = 0; i < includedTexts.length; i++) {
        strings[includeRowIndexes[i]] = includedTexts[i];
      }

      // Expand the included file into its spot in the resultant file
      strings = this.#expandNestedStringsArray(strings);
      strings = strings.map((str) => str.trim() + "\n");
      strings = this.#executeIncludes(strings);
    }

    return strings;
  }

  /**
   * Loads the preset and populates the CLI strings.
   * @param {PresetInstance} presetInstance
   */
  async loadPreset(presetInstance) {
    const presetText = await this.#fetchFile(
      this.#rawUrl + presetInstance.presetData.fullPath,
    );

    let presetContentsArray = presetText.split("\n").map((str) => str.trim());

    presetContentsArray.unshift(`# Preset: ${presetInstance.presetData.title}`);
    await this.#executeIncludes(presetContentsArray);

    this.#parser.populatePresetProperties(presetInstance, presetContentsArray);

    presetInstance.cliStringsArr = presetContentsArray;

    await this.#loadPresetWarning(presetInstance);
  }

  /**
   *
   * @param {PresetInstance} presetInstance
   */
  async #loadPresetWarning(presetInstance) {
    presetInstance.completeWarning = "";

    if (presetInstance.presetData.warning) {
      presetInstance.completeWarning += presetInstance.presetData.warning;
    }

    if (presetInstance.presetData.disclaimer) {
      presetInstance.completeWarning +=
        (presetInstance.completeWarning ? "\n" : "") +
        presetInstance.presetData.disclaimer;
    }

    const includedWarningAndDisclaimerFiles = [].concat(
      ...[
        presetInstance.presetData.include_warning,
        presetInstance.presetData.include_disclaimer,
      ].filter(Array.isArray),
    );

    const includedWarningsAndDisclaimers = await this.#fetchAllFiles(
      includedWarningAndDisclaimerFiles,
    );

    presetInstance.completeWarning +=
      (presetInstance.completeWarning ? "\n" : "") +
      includedWarningsAndDisclaimers;
  }

  /**
   * Fetches all files from the given fullPaths.
   * @param {string[]} fullPaths
   * @returns {Promise<string>}
   */
  async #fetchAllFiles(fullPaths) {
    const fetchPromises = [];

    fullPaths?.forEach((fullPath) => {
      fetchPromises.push(this.#fetchFile(this.#rawUrl + fullPath));
    });

    const texts = await Promise.all(fetchPromises);
    return texts.join("\n");
  }

  /**
   * Returns a promise that fetches a file from the given URL.
   * @param {string} url
   * @returns {Promise<string>}
   */
  #fetchFile(url) {
    return new Promise((resolve, reject) => {
      console.log("Fetching file from URL: " + url);
      fetch(url, { cache: "no-cache" })
        .then((res) => res.text())
        .then((text) => resolve(text))
        .catch((err) => {
          console.error(err);
          reject(err);
        });
    });
  }
}

class Option {
  /**
   *
   * @param {string} name
   * @param {string} optionGroupName
   * @param {boolean} checked
   */
  constructor(name, optionGroupName, checked) {
    this.name = name;
    this.optionGroupName = optionGroupName;
    this.checked = checked;
  }
  /**
   * @type {string}
   */
  name;
  /**
   * @type {string}
   */
  optionGroupName;
  /**
   * @type {boolean}
   */
  checked;
}

class OptionGroup {
  /**
   *
   * @param {string} name
   * @param {Option[]} options
   * @param {boolean} isExclusive
   */
  constructor(name, options, isExclusive) {
    this.name = name;
    this.options = options;
    this.isExclusive = isExclusive;
  }
  /**
   * @type {string}
   */
  name;
  /**
   * @type {Option[]}
   */
  options;
  /**
   * @type {boolean}
   */
  isExclusive;
}

/**
 * MetaParser parses the metadata on a preset.
 */
class Parser {
  /**
   * @type {Settings}
   */
  #settings;

  /**
   * Creates a new MetaParser instance.
   * @param {Settings} settings
   */
  constructor(settings) {
    this.#settings = settings;
  }

  /**
   * Parse the presets properties
   * @param {PresetInstance} presetInstance
   * @param {string[]} presetContentsArray
   */
  populatePresetProperties(presetInstance, presetContentsArray) {
    const propertiesToRead = [
      "description",
      "discussion",
      "warning",
      "disclaimer",
      "include_warning",
      "include_disclaimer",
      "discussion",
      "force_options_review",
      "parser",
    ];
    const propertiesMetadata = {};
    presetInstance.presetData.options = [];

    // Build the relationship between a property and type
    propertiesToRead.forEach((propertyName) => {
      // metadata of each property, name, type, optional true/false; example:
      // keywords: {type: MetadataTypes.WORDS_ARRAY, optional: true}
      propertiesMetadata[propertyName] =
        this.#settings.presetsFileMetadata[propertyName];
      presetInstance.presetData[propertyName] = undefined;
    });

    // when parsing options, need to keep track of the current option using a temporary variable
    presetInstance.currentOptionGroup = undefined;

    for (const line of presetContentsArray) {
      if (this.#lineStartsWithMetapropertyDirective(line)) {
        this.#parseAttributeLine(presetInstance, line, propertiesMetadata);
      }
    }

    delete presetInstance.currentOptionGroup;
  }

  /**
   *
   * @param {PresetInstance} presetInstance
   * @param {string} line
   * @param {object} propertiesMetadata
   */
  #parseAttributeLine(presetInstance, line, propertiesMetadata) {
    line = this.#trimMetapropertyDirective(line);
    const lowCaseLine = line.toLowerCase();
    let isProperty = false;

    for (const propertyName in propertiesMetadata) {
      const lineBeginning = `${propertyName.toLowerCase()}:`; // "description:"

      if (lowCaseLine.startsWith(lineBeginning)) {
        line = line.slice(lineBeginning.length).trim(); // (Title: foo) -> (foo)
        this.#parseProperty(presetInstance, line, propertyName);
        isProperty = true;
      }
    }

    if (
      !isProperty &&
      lowCaseLine.startsWith(this.#settings.OptionsDirectives.OPTION_DIRECTIVE)
    ) {
      this.#parseOptionDirective(presetInstance, line);
    }
  }

  /**
   *
   * @param {PresetInstance} presetInstance
   * @param {string} line
   * @param {string} propertyName
   */
  #parseProperty(presetInstance, line, propertyName) {
    switch (this.#settings.presetsFileMetadata[propertyName].type) {
      case this.#settings.MetadataTypes.STRING_ARRAY:
        this.#processArrayProperty(presetInstance, line, propertyName);
        break;
      case this.#settings.MetadataTypes.STRING:
        this.#processStringProperty(presetInstance, line, propertyName);
        break;
      case this.#settings.MetadataTypes.FILE_PATH:
        this.#processStringProperty(presetInstance, line, propertyName);
        break;
      case this.#settings.MetadataTypes.FILE_PATH_ARRAY:
        this.#processArrayProperty(presetInstance, line, propertyName);
        break;
      case this.#settings.MetadataTypes.BOOLEAN:
        this.#processBooleanProperty(presetInstance, line, propertyName);
        break;
      case this.#settings.MetadataTypes.PARSER:
        this.#processStringProperty(presetInstance, line, propertyName);
        break;
      default:
        console.err(
          `Parsing preset: unknown property type '${this.#settings.presetsFileMetadata[propertyName].type}' for the property '${propertyName}'`,
        );
    }
  }

  /**
   *
   * @param {PresetInstance} presetInstance
   * @param {string} line
   * @param {string} propertyName
   */
  #processBooleanProperty(presetInstance, line, propertyName) {
    const trueValues = ["true", "yes"];

    const lineLowCase = line.toLowerCase();
    let result = false;

    if (trueValues.includes(lineLowCase)) {
      result = true;
    }

    presetInstance.presetData[propertyName] = result;
  }

  /**
   *
   * @param {PresetInstance} presetInstance
   * @param {string} line
   * @param {string} propertyName
   */
  #processArrayProperty(presetInstance, line, propertyName) {
    if (!presetInstance.presetData[propertyName]) {
      presetInstance.presetData[propertyName] = [];
    }

    presetInstance.presetData[propertyName].push(line);
  }

  /**
   *
   * @param {PresetInstance} presetInstance
   * @param {string} line
   * @param {string} propertyName
   */
  #processStringProperty(presetInstance, line, propertyName) {
    presetInstance.presetData[propertyName] = line;
  }

  /**
   * Checks to see if a line begins with a #$
   * @param {string} line
   * @returns {string}
   */
  #lineStartsWithMetapropertyDirective(line) {
    return line.trim().startsWith(this.#settings.MetapropertyDirective);
  }

  /**
   * Strips the #$ from the front of a line i.e. (#$ DESCRIPTION: foo) -> (DESCRIPTION: foo)
   * @param {string} line
   * @returns {string}
   */
  #trimMetapropertyDirective(line) {
    return line
      .trim()
      .slice(this.#settings.MetapropertyDirective.length)
      .trim();
  }

  /**
   * Parses the option directive in the given line. Accepts a trimmed line without the metaproperty directive.
   * @param {PresetInstance} presetInstance
   * @param {string} line
   */
  #parseOptionDirective(presetInstance, line) {
    let currentOptionGroupName = "";
    if (presetInstance.currentOptionGroup) {
      currentOptionGroupName = presetInstance.currentOptionGroup.name;
    }

    if (this.#isOptionBegin(line)) {
      const option = this.#getOption(line, currentOptionGroupName);
      if (!presetInstance.currentOptionGroup) {
        presetInstance.presetData.options.push(option);
      } else {
        presetInstance.currentOptionGroup.options.push(option);
      }
    } else if (this.#isOptionGroupBegin(line)) {
      const optionGroup = new OptionGroup(
        this.#getOptionGroupName(line),
        [],
        this.#isExclusiveOptionGroup(line),
      );
      presetInstance.currentOptionGroup = optionGroup;
      presetInstance.presetData.options.push(optionGroup);
    } else if (this.#isOptionGroupEnd(line)) {
      presetInstance.currentOptionGroup = undefined;
    }
  }

  /**
   *
   * @param {string} line
   * @returns {string}
   */
  #getOptionName(line) {
    const directiveRemoved = line
      .slice(this.#settings.OptionsDirectives.BEGIN_OPTION_DIRECTIVE.length)
      .trim();
    const regExpRemoveChecked = new RegExp(
      this.#escapeRegex(`${this.#settings.OptionsDirectives.OPTION_CHECKED}:`),
      "gi",
    );
    const regExpRemoveUnchecked = new RegExp(
      this.#escapeRegex(
        `${this.#settings.OptionsDirectives.OPTION_UNCHECKED}:`,
      ),
      "gi",
    );
    let optionName = directiveRemoved.replace(regExpRemoveChecked, "");
    optionName = optionName.replace(regExpRemoveUnchecked, "").trim();
    return optionName;
  }

  /**
   *
   * @param {string} line
   * @returns {string}
   */
  #getOptionGroupName(line) {
    let ogName = line
      .slice(
        this.#settings.OptionsDirectives.BEGIN_OPTION_GROUP_DIRECTIVE.length +
          1,
      )
      .trim();
    if (this.#isExclusiveOptionGroup(line)) {
      ogName = ogName
        .slice(this.#settings.OptionsDirectives.EXCLUSIVE_OPTION_GROUP.length)
        .trim();
    }
    return ogName;
  }

  // returns an object that represents an option
  /**
   *
   * @param {string} line
   * @param {string} optionGroupName
   * @returns {Option}
   */
  #getOption(line, optionGroupName) {
    const directiveRemoved = line
      .slice(this.#settings.OptionsDirectives.BEGIN_OPTION_DIRECTIVE.length)
      .trim();
    const directiveRemovedLowCase = directiveRemoved.toLowerCase();
    const optionChecked = this.#isOptionChecked(directiveRemovedLowCase);

    const regExpRemoveChecked = new RegExp(
      this.#escapeRegex(this.#settings.OptionsDirectives.OPTION_CHECKED),
      "gi",
    );
    const regExpRemoveUnchecked = new RegExp(
      this.#escapeRegex(this.#settings.OptionsDirectives.OPTION_UNCHECKED),
      "gi",
    );
    let optionName = directiveRemoved.replace(regExpRemoveChecked, "");
    optionName = optionName.replace(regExpRemoveUnchecked, "").trim();

    return new Option(
      optionName.slice(1).trim(),
      optionGroupName,
      optionChecked,
    );
  }

  /**
   *
   * @param {string} line
   * @returns {boolean}
   */
  #isExclusiveOptionGroup(line) {
    const lowCaseLine = line.toLowerCase();
    return lowCaseLine.includes(
      this.#settings.OptionsDirectives.EXCLUSIVE_OPTION_GROUP,
    );
  }

  /**
   *
   * @param {string} lowCaseLine
   * @returns {boolean}
   */
  #isOptionChecked(lowCaseLine) {
    return lowCaseLine.includes(
      this.#settings.OptionsDirectives.OPTION_CHECKED,
    );
  }

  /**
   *
   * @param {string} line
   * @returns {boolean}
   */
  #isOptionGroupBegin(line) {
    const lowCaseLine = line.toLowerCase();
    return lowCaseLine.startsWith(
      this.#settings.OptionsDirectives.BEGIN_OPTION_GROUP_DIRECTIVE,
    );
  }

  /**
   *
   * @param {string} line
   * @returns {boolean}
   */
  #isOptionGroupEnd(line) {
    const lowCaseLine = line.toLowerCase();
    return lowCaseLine.startsWith(
      this.#settings.OptionsDirectives.END_OPTION_GROUP_DIRECTIVE,
    );
  }

  /**
   *
   * @param {string} line
   * @returns {boolean}
   */
  #isOptionBegin(line) {
    const lowCaseLine = line.toLowerCase();
    return lowCaseLine.startsWith(
      this.#settings.OptionsDirectives.BEGIN_OPTION_DIRECTIVE,
    );
  }

  /**
   *
   * @param {string} line
   * @returns {boolean}
   */
  #isOptionEnd(line) {
    const lowCaseLine = line.toLowerCase();
    return lowCaseLine.startsWith(
      this.#settings.OptionsDirectives.END_OPTION_DIRECTIVE,
    );
  }

  /**
   *
   * @param {string} string
   * @returns {string}
   */
  #escapeRegex(string) {
    return string.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  /**
   * Renders the the preset CLI strings basd on provided strings and checked options.
   * @param {string[]} strings
   * @param {string[]} checkedOptions
   * @returns {string[]}
   */
  renderPreset(strings, checkedOptions) {
    let resultStrings = [];
    let includeOption = false;
    let handlingOption = false;
    let currentOptionGroupName = "";

    const lowerCasedCheckedOptions = checkedOptions.map((optionName) =>
      optionName.toLowerCase(),
    );

    strings.forEach((str) => {
      if (this.#lineStartsWithMetapropertyDirective(str)) {
        const line = this.#trimMetapropertyDirective(str);
        if (this.#isOptionGroupBegin(line)) {
          handlingOption = true;
          currentOptionGroupName = this.#getOptionGroupName(line).toLowerCase();
        } else if (this.#isOptionGroupEnd(line)) {
          handlingOption = false;
          includeOption = false;
          currentOptionGroupName = "";
        } else if (this.#isOptionBegin(line)) {
          handlingOption = true;
          let optionNameLowCase = this.#getOptionName(line).toLowerCase();
          if (currentOptionGroupName != "") {
            optionNameLowCase =
              currentOptionGroupName.toLowerCase() + ":" + optionNameLowCase;
          }
          if (lowerCasedCheckedOptions.includes(optionNameLowCase)) {
            includeOption = true;
          }
        } else if (this.#isOptionEnd(line)) {
          if (currentOptionGroupName == "") {
            handlingOption = false;
          }
          includeOption = false;
        }
      } else if ((handlingOption && includeOption) || !handlingOption) {
        resultStrings.push(str);
      }
    });

    resultStrings = this.#removeExtraneousEmptyLines(resultStrings);

    return resultStrings;
  }

  /**
   * removes empty lines if there are two or more in a row leaving just one empty line
   * @param {string[]} strings
   * @returns
   */
  #removeExtraneousEmptyLines(strings) {
    const result = [];
    let lastStringEmpty = false;

    strings.forEach((str) => {
      if ("" !== str || !lastStringEmpty) {
        result.push(str);
      }
      if ("" === str) {
        lastStringEmpty = true;
      } else {
        lastStringEmpty = false;
      }
    });

    return result;
  }

  /**
   *
   * @param {string[]} strings
   * @returns {boolean}
   */
  isIncludeFound(strings) {
    for (const str of strings) {
      const match = REGEXP_INCLUDE.exec(str);

      if (match !== null) {
        return true;
      }
    }

    return false;
  }
}

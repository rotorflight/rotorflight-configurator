import { reinitialiseConnection } from "@/js/serial_backend.js";
import { CliAutoComplete } from "@/js/CliAutoComplete.js";
import { CONFIGURATOR } from "@/js/data_storage.js";

const CHAR_CODE_BACKSPACE = 8;
const CHAR_CODE_LINE_FEED = 10;
const CHAR_CODE_CARRIAGE_RETURN = 13;

export default class CliEngine {
  #lineDelayMs = 15;
  #profileSwitchDelayMs = 100;
  #rateProfileSwitchDelayMs = 100;

  #outputHistory = ""; // output history holds the human-readable history from the flight controller
  #cliBuffer = ""; // cliBuffer holds the current data received from the flight controller
  #cliBufferContainsPartialCommand = false; // Tracks whether the cliBuffer contains a partial command.

  #cliErrorsCount = 0;

  #onSendCommandsProgressCallback = undefined; // callback to be called when sending commands to the flight controller (used for a progress bar)
  #responseCallback = undefined; // callback to be called when a response is received from the flight controller
  #cliAutoComplete = undefined; // holds an instance of the CLIAutoComplete

  #startProcessingForValidation = false; // Start processing the serial read data for validation of the engine

  #inBatchMode = false; // track whether batch mode has been detected

  // GUI elements for presenting an interactable CLI
  #GUI = {
    window: null, // the CLI window
    windowWrapper: null, // contains the output history
    textarea: null, // the textarea for command entry
  };

  // History tracker for previously entered commands
  #history = {
    history: [],
    wipCommand: "",
    index: 0,
    add: function (str) {
      this.history.push(str);
      this.index = this.history.length;
      this.wipCommand = "";
    },
    prev: function () {
      if (this.index > 0) {
        this.index -= 1;
      }
      return this.history[this.index];
    },
    next: function () {
      if (this.index < this.history.length) {
        this.index += 1;
      }
      return this.history[this.index - 1];
    },
  };

  get outputHistory() {
    return this.#outputHistory;
  }
  clearOutputHistory() {
    this.#outputHistory = "";
    this.#GUI.windowWrapper.empty();
  }

  get errorsCount() {
    return this.#cliErrorsCount;
  }
  get inBatchMode() {
    return this.#inBatchMode;
  }

  setUi(window, windowWrapper, textarea) {
    this.#GUI.window = window;
    this.#GUI.windowWrapper = windowWrapper;
    this.#GUI.textarea = textarea;
    this.#setTextareaListen();
  }

  initializeAutoComplete() {
    const self = this;
    CliAutoComplete.initialize(
      this.#GUI.textarea,
      this.sendLine,
      this.writeToOutput,
    );
    $(CliAutoComplete).on("build:start", function () {
      self.#GUI._textarea
        .val("")
        .attr("placeholder", i18n.getMessage("cliInputPlaceholderBuilding"))
        .prop("disabled", true);
    });
    $(CliAutoComplete).on("build:stop", function () {
      self.#GUI._textarea
        .attr("placeholder", i18n.getMessage("cliInputPlaceholder"))
        .prop("disabled", false)
        .focus();
    });
    this.#cliAutoComplete = CliAutoComplete;
  }

  setProgressCallback(sendCommandsProgressCallback) {
    this.#onSendCommandsProgressCallback = sendCommandsProgressCallback;
  }

  #reportSendCommandsProgress(value) {
    this.#onSendCommandsProgressCallback?.(value);
  }

  enterCliMode() {
    const bufferOut = new ArrayBuffer(1);
    const bufView = new Uint8Array(bufferOut);
    this.#cliBuffer = "";

    bufView[0] = 0x23;

    serial.send(bufferOut);
  }

  #setTextareaListen() {
    // Tab key detection must be on keydown,
    // `keypress`/`keyup` happens too late, as `textarea` will have already lost focus.
    this.#GUI.textarea.keydown((event) => {
      if (event.key === "Tab") {
        // prevent default tabbing behaviour
        event.preventDefault();

        if (this.#cliAutoComplete) {
          if (!this.#cliAutoComplete.isEnabled()) {
            // Native FC autoComplete
            const outString = this.#GUI.textarea.val();
            const lastCommand = outString.split("\n").pop();
            this.#sendLineWithTab(lastCommand);
          } else if (
            !this.#cliAutoComplete.isOpen() &&
            !this.#cliAutoComplete.isBuilding()
          ) {
            // force show autocomplete on Tab
            this.#cliAutoComplete.openLater(true);
          }
        }
      }
    });

    this.#GUI.textarea.keypress((event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // prevent the adding of new line

        if (this.#cliAutoComplete && this.#cliAutoComplete.isBuilding()) {
          return; // silently ignore commands if autocomplete is still building
        }

        const outString = this.#GUI.textarea.val();
        this.#history.add(outString);
        this.executeCommands(outString);
        this.#GUI.textarea.val("");
      }
    });

    this.#GUI.textarea.keyup((event) => {
      if (this.#cliAutoComplete && this.#cliAutoComplete.isOpen()) {
        return; // disable history keys if autocomplete is open
      }

      if (event.key == "Up") {
        this.#GUI.textarea.val(this.#history.prev());
      }

      if (event.key == "Down") {
        this.#GUI.textarea.val(this.#history.next());
      }
    });

    // give input element user focus
    this.#GUI.textarea.focus();
  }

  // Close attempts to send an `exit` to the flight controller. Notably, it uses the `_lineWithBuffer` function as there could be pending CLI buffer data.
  close(callback) {
    let line = "exit\r";
    if (this.#cliBufferContainsPartialCommand) {
      line = this.#lineWithBuffer(line);
    }
    this.#send(line, function () {
      // we could handle this "nicely", but this will do for now
      // (another approach is however much more complicated):
      // we can setup an interval asking for data lets say every 200ms,
      // when data arrives, callback will be triggered and tab switched
      // we could probably implement this someday
      callback?.();
      CONFIGURATOR.cliEngineActive = false;
      CONFIGURATOR.cliEngineValid = false;
      CONFIGURATOR.cliTab = "";
    });
  }

  // executeCommands splits (on \n) the given output string into an array of strings and returns a promise that resolves after all of the commands have been sent.
  async executeCommands(commandString) {
    const commandArray = commandString.split("\n");
    this.executeCommandsArray(commandArray);
  }

  // executeCommandsArray
  async executeCommandsArray(commandsArray) {
    this.#reportSendCommandsProgress(0);
    for (let i = 0, delay = 0; i < commandsArray.length; i++) {
      let line = commandsArray[i].trim();
      if (line.length === 0) continue;

      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));

      if (this.#cliBufferContainsPartialCommand) {
        line = this.#lineWithBuffer(line);
      }

      await new Promise((resolve) => this.sendLine(line, resolve));

      this.#reportSendCommandsProgress((100.0 * i) / commandsArray.length);

      if (line.toLowerCase().startsWith("profile")) {
        delay = this.#profileSwitchDelayMs;
      } else if (line.toLowerCase().startsWith("rateprofile")) {
        delay = this.#rateProfileSwitchDelayMs;
      } else {
        delay = this.#lineDelayMs;
      }
    }
    this.#reportSendCommandsProgress(100);
  }

  // removePromptHash removes the # from the prompt text, and is used to handle the output of the FC native autocomplete.
  #removePromptHash(promptText) {
    return promptText.replace(/^# /, "");
  }

  // The cliBuffer may have a partial command from a previous auto-complete request.
  // #lineWithBuffer parses the input line and the cliBuffer, to return a line that when sent, will achieve the desired command.
  // For example, if the cliBuffer contains "# dump all", and the user is trying to run a "diff all", the input for this function should be "diff all"
  // and the line returned by this function would be `<number of backspaces required to reduce the cliBuffer to "# d">iff all`.
  #lineWithBuffer(line) {
    const buffer = this.#removePromptHash(this.#cliBuffer);
    const bufferRegex = new RegExp(`^${buffer}`, "g");
    if (line.match(bufferRegex)) {
      return line.replace(bufferRegex, "");
    }

    let commonChars = 0;

    for (let i = 0; i < buffer.length; i++) {
      if (line[i] === buffer[i]) {
        commonChars++;
      } else {
        break;
      }
    }

    const noOfCharsToDelete = buffer.length - commonChars;

    const backspace = String.fromCharCode(127);
    return (
      backspace.repeat(noOfCharsToDelete) +
      line.substring(buffer.length - noOfCharsToDelete, line.length)
    );
  }

  // writeToOutput is a function used to write text to the window wrapper -- while primarily used by the CliEngine, it is also used by CliAutoComplete.
  writeToOutput(text) {
    if (this.#cliAutoComplete && this.#cliAutoComplete.isBuilding()) {
      this.#cliAutoComplete.builderParseLine(text);
      return; // suppress output if the autocomplete is building state
    }

    this.#GUI.windowWrapper.append(text);
    this.#GUI.window.scrollTop(this.#GUI.window.prop("scrollHeight"));
  }

  #writeLineToOutput(text) {
    if (text.startsWith("###ERROR")) {
      this.writeToOutput(`<span class="error_message">${text}</span><br>`);
      this.#cliErrorsCount++;
    } else {
      this.writeToOutput(`${text}<br>`);
    }
    this.#responseCallback?.();
  }

  readSerial(readInfo) {
    /*  Some info about handling line feeds and carriage return

            line feed = LF = \n = 0x0A = 10
            carriage return = CR = \r = 0x0D = 13

            MAC only understands CR
            Linux and Unix only understand LF
            Windows understands (both) CRLF
            Chrome OS currently unknown
        */
    const data = new Uint8Array(readInfo.data ?? readInfo);
    let validateText = "";
    let sequenceCharsToSkip = 0;

    for (const charCode of data) {
      const currentChar = String.fromCharCode(charCode);
      const isCRLF =
        currentChar.charCodeAt() === CHAR_CODE_LINE_FEED ||
        currentChar.charCodeAt() === CHAR_CODE_CARRIAGE_RETURN;

      if (
        !CONFIGURATOR.cliEngineValid &&
        (isCRLF || this.#startProcessingForValidation)
      ) {
        // try to catch part of valid CLI enter message
        this.#startProcessingForValidation = true;
        validateText += currentChar;
        this.writeToOutput(currentChar);
        continue;
      }

      const escapeSequenceCode = 27;
      const escapeSequenceCharLength = 3;
      if (charCode === escapeSequenceCode && !sequenceCharsToSkip) {
        // ESC + other
        sequenceCharsToSkip = escapeSequenceCharLength;
      }

      if (sequenceCharsToSkip) {
        sequenceCharsToSkip--;
        continue;
      }

      this.#adjustCliBuffer(charCode);

      if (this.#cliBuffer === "Rebooting" && CHAR_CODE_BACKSPACE !== charCode) {
        CONFIGURATOR.cliEngineActive = false;
        CONFIGURATOR.cliEngineValid = false;
        CONFIGURATOR.cliTab = "";
        GUI.log(i18n.getMessage("cliReboot"));
        reinitialiseConnection();
      }
      if (
        this.#cliBuffer === "Command batch started" &&
        CHAR_CODE_BACKSPACE !== charCode
      ) {
        this.#inBatchMode = true;
      }

      if (
        this.#cliBuffer === "Command batch ended" &&
        CHAR_CODE_BACKSPACE !== charCode
      ) {
        this.#inBatchMode = false;
      }
    }
    if (!CONFIGURATOR.cliEngineValid && validateText.indexOf("CLI") !== -1) {
      GUI.log(i18n.getMessage("cliEnter"));
      CONFIGURATOR.cliEngineValid = true; // TODO: consolidate this!

      // begin output history with the prompt (last line of welcome message)
      // this is to match the content of the history with what the user sees on this tab
      const lastLine = validateText.split("\n").pop();
      this.#outputHistory = lastLine;

      if (
        this.#cliAutoComplete &&
        this.#cliAutoComplete.isEnabled() &&
        !this.#cliAutoComplete.isBuilding()
      ) {
        // start building autoComplete
        this.#cliAutoComplete.builderStart();
      }
    }

    if (CONFIGURATOR.cliEngineValid) {
      // fallback to native autocomplete
      if (
        ((this.#cliAutoComplete && !this.#cliAutoComplete.isEnabled()) ||
          this.#cliAutoComplete == undefined) &&
        this.#cliBufferContainsPartialCommand
      ) {
        this.setPrompt(this.#removePromptHash(this.#cliBuffer));
      }
    }
  }

  setPrompt(text) {
    this.#GUI.textarea.val(text);
  }

  // sendLine sends a line that ends with a \n. This will clear the buffer, as it will no longer contain a partial command.
  sendLine(line, callback) {
    this.#send(`${line}\n`, callback);
  }

  // _sendLineWithTab sends a line with a tab character -- this triggers the FC's native autocomplete, which in turn will populate the buffer with a partial command that needs to be handled.
  #sendLineWithTab(line, callback) {
    if (this.#cliBufferContainsPartialCommand) {
      line = this.#lineWithBuffer(line);
    } else {
      this.#cliBufferContainsPartialCommand = true;
    }
    this.#send(line + "\t", callback);
  }

  subscribeResponseCallback(callback) {
    this.#responseCallback = callback;
  }
  unsubscribeResponseCallback() {
    this.#responseCallback = undefined;
  }

  #send(line, callback) {
    const bufferOut = new ArrayBuffer(line.length);
    const bufView = new Uint8Array(bufferOut);

    for (let cKey = 0; cKey < line.length; cKey++) {
      bufView[cKey] = line.charCodeAt(cKey);
    }

    serial.send(bufferOut, callback);
  }

  // adjustCliBuffer handles a character code and translates it as necessary onto the CLI buffer.
  #adjustCliBuffer(newCharacterCode) {
    if (CONFIGURATOR.cliEngineValid) {
      const currentChar = String.fromCharCode(newCharacterCode);
      switch (newCharacterCode) {
        // Windows
        case CHAR_CODE_LINE_FEED:
          if (GUI.operating_system === "Windows") {
            this.#writeLineToOutput(this.#cliBuffer);
            this.#cliBuffer = "";
          }
          break;
        // Everything else
        case CHAR_CODE_CARRIAGE_RETURN:
          if (GUI.operating_system !== "Windows") {
            this.#writeLineToOutput(this.#cliBuffer);
            this.#cliBuffer = "";
          }
          break;
        case 60:
          this.#cliBuffer += "&lt";
          break;
        case 62:
          this.#cliBuffer += "&gt";
          break;
        case CHAR_CODE_BACKSPACE:
          this.#cliBuffer = this.#cliBuffer.slice(0, -1);
          this.#outputHistory = this.#outputHistory.slice(0, -1);
          return; // Return so we don't unnecessarily append to the output history.
        default:
          this.#cliBuffer += currentChar;
      }
      this.#outputHistory += currentChar;
    }
  }
}

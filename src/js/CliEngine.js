import { reinitialiseConnection } from "./serial_backend";

export default class CliEngine {
    constructor(currentTab) {
        this._currentTab = currentTab;
        this._lineDelayMs = 15;
        this._profileSwitchDelayMs = 100;
        this._rateProfileSwitchDelayMs = 100;

        this._outputHistory = "", // output history holds the human-readable history from the flight controller
            this._cliBuffer = ""; // cliBuffer holds the current data received from the flight controller 
        this._cliBufferContainsPartialCommand = false; // Tracks whether the cliBuffer contains a partial command.

        this._cliErrorsCount = 0;
        this._sendCommandsProgress = 0;

        this._onSendCommandsProgressCallback = undefined; // callback to be called when sending commands to the flight controller (used for a progress bar)
        this._responseCallback = undefined; // callback to be called when a response is received from the flight controller
        this._cliAutoComplete = undefined; // holds an instance of the CLIAutoComplete

        this._startProcessingForValidation = false; // Start processing the serial read data for validation of the engine

        this._inBatchMode = false; // track whether batch mode has been detected

        // GUI elements for presenting an interactable CLI
        this._GUI = {
            window: null, // the CLI window
            windowWrapper: null, // contains the output history
            textarea: null, // the textarea for command entry
        };

        // History tracker for previously entered commands
        this._history = {
            history: [],
            wipCommand: '',
            index: 0,
            add: function (str) {
                this.history.push(str);
                this.index = this.history.length;
                this.wipCommand = '';
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
    };

    get outputHistory() { return this._outputHistory; }
    clearOutputHistory() {
        this._outputHistory = "";
        this._GUI.windowWrapper.empty();
    }

    get errorsCount() { return this._cliErrorsCount; }
    get inBatchMode() { return this._inBatchMode; }

    setUi(window, windowWrapper, textarea) {
        this._GUI.window = window;
        this._GUI.windowWrapper = windowWrapper;
        this._GUI.textarea = textarea;
        this._setTextareaListen();
    }

    initializeAutoComplete() {
        CliAutoComplete.initialize(this._GUI.textarea, this.sendLine, this.writeToOutput);
        $(CliAutoComplete).on('build:start', function () {
            this._GUI._textarea
                .val('')
                .attr('placeholder', i18n.getMessage('cliInputPlaceholderBuilding'))
                .prop('disabled', true);
        });
        $(CliAutoComplete).on('build:stop', function () {
            this._GUI._textarea
                .attr('placeholder', i18n.getMessage('cliInputPlaceholder'))
                .prop('disabled', false)
                .focus();
        });
        this._cliAutoComplete = CliAutoComplete;
    }

    setProgressCallback(sendCommandsProgressCallback) {
        this._onSendCommandsProgressCallback = sendCommandsProgressCallback;
    }

    _reportSendCommandsProgress(value) {
        this._sendCommandsProgress = value;
        this._onSendCommandsProgressCallback?.(value);
    }

    enterCliMode() {
        const bufferOut = new ArrayBuffer(1);
        const bufView = new Uint8Array(bufferOut);
        this._cliBuffer = "";

        bufView[0] = 0x23;

        serial.send(bufferOut);
    }

    _setTextareaListen() {
        // Tab key detection must be on keydown,
        // `keypress`/`keyup` happens too late, as `textarea` will have already lost focus.
        this._GUI.textarea.keydown(event => {
            if (event.which === CliEngine.s_tabCode) {
                // prevent default tabbing behaviour
                event.preventDefault();

                if (this._cliAutoComplete) {
                    if (!this._cliAutoComplete.isEnabled()) {
                        // Native FC autoComplete
                        const outString = this._GUI.textarea.val();
                        const lastCommand = outString.split("\n").pop();
                        this._sendLineWithTab(lastCommand);
                    }
                    else if (!this._cliAutoComplete.isOpen() && !this._cliAutoComplete.isBuilding()) {
                        // force show autocomplete on Tab
                        this._cliAutoComplete.openLater(true);
                    }
                }
            }
        });

        this._GUI.textarea.keypress(event => {
            if (event.which === CliEngine.s_enterKeyCode) {
                event.preventDefault(); // prevent the adding of new line

                if (this._cliAutoComplete && this._cliAutoComplete.isBuilding()) {
                    return; // silently ignore commands if autocomplete is still building
                }

                const outString = this._GUI.textarea.val();
                this._history.add(outString);
                this.executeCommands(outString);
                this._GUI.textarea.val('');
            }
        });

        this._GUI.textarea.keyup(event => {
            const keyUp = { 38: true };
            const keyDown = { 40: true };

            if (this._cliAutoComplete && this._cliAutoComplete.isOpen()) {
                return; // disable history keys if autocomplete is open
            }

            if (event.keyCode in keyUp) {
                this._GUI.textarea.val(this._history.prev());
            }

            if (event.keyCode in keyDown) {
                this._GUI.textarea.val(this._history.next());
            }
        });

        // give input element user focus
        this._GUI.textarea.focus();
    }

    // Close attempts to send an `exit` to the flight controller. Notably, it uses the `_lineWithBuffer` function as there could be pending CLI buffer data.
    close(callback) {
        let line = 'exit\r';
        if (this._cliBufferContainsPartialCommand) {
            line = this._lineWithBuffer(line)
        }
        this._send(line, function () {
            // we could handle this "nicely", but this will do for now
            // (another approach is however much more complicated):
            // we can setup an interval asking for data lets say every 200ms,
            // when data arrives, callback will be triggered and tab switched
            // we could probably implement this someday
            callback?.();
            CONFIGURATOR.cliEngineActive = false;
            CONFIGURATOR.cliEngineValid = false;
            CONFIGURATOR.cliTab = '';
        });
    }

    // executeCommands splits (on \n) the given output string into an array of strings and returns a promise that resolves after all of the commands have been sent.
    executeCommands(commandString) {
        const commandArray = commandString.split("\n");
        return this.executeCommandsArray(commandArray);
    }

    // executeCommandsArray Returns a promise that resolves after all of the commands have been sent.
    executeCommandsArray(strings) {
        this._reportSendCommandsProgress(0);
        const totalCommandsCount = strings.length;
        return strings.reduce((p, line, index) =>
            p.then((delay) =>
                new Promise((resolve) => {
                    GUI.timeout_add('CLI_send_slowly', () => {
                        let processingDelay = this._lineDelayMs;
                        line = line.trim();

                        // firmware does not like empty lines, so don't send them.
                        if (line.length === 0) {
                            resolve(0);
                            return;
                        }

                        if (line.toLowerCase().startsWith('profile')) {
                            processingDelay = this._profileSwitchDelayMs;
                        }
                        if (line.toLowerCase().startsWith('rateprofile')) {
                            processingDelay = this._rateProfileSwitchDelayMs;
                        }

                        if (this._cliBufferContainsPartialCommand) {
                            line = this._lineWithBuffer(line);
                        }

                        this.subscribeResponseCallback(() => {
                            resolve(processingDelay);
                            this._reportSendCommandsProgress(100.0 * index / totalCommandsCount);
                            this.unsubscribeResponseCallback();
                        })


                        this.sendLine(line);
                    }, delay);
                }),
            ),
            Promise.resolve(0),
        ).then(() => {
            this._reportSendCommandsProgress(100);
        });
    }

    // removePromptHash removes the # from the prompt text, and is used to handle the output of the FC native autocomplete.
    _removePromptHash(promptText) {
        return promptText.replace(/^# /, '');
    }

    // The cliBuffer may have a partial command from a previous auto-complete request.
    // _lineWithBuffer parses the input line and the cliBuffer, to return a line that when sent, will achieve the desired command.
    // For example, if the cliBuffer contains "# dump all", and the user is trying to run a "diff all", the input for this function should be "diff all" 
    // and the line returned by this function would be `<number of backspaces required to reduce the cliBuffer to "# d">iff all`. 
    _lineWithBuffer(line) {
        const buffer = this._removePromptHash(this._cliBuffer);
        const bufferRegex = new RegExp(`^${buffer}`, 'g');
        if (line.match(bufferRegex)) {
            return line.replace(bufferRegex, '');
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
        return backspace.repeat(noOfCharsToDelete) + line.substring(buffer.length - noOfCharsToDelete, line.length);
    }

    // writeToOutput is a function used to write text to the window wrapper -- while primarily used by the CliEngine, it is also used by CliAutoComplete.
    writeToOutput(text) {
        if (this._cliAutoComplete && this._cliAutoComplete.isBuilding()) {
            this._cliAutoComplete.builderParseLine(text);
            return; // suppress output if the autocomplete is building state
        }

        this._GUI.windowWrapper.append(text);
        this._GUI.window.scrollTop(this._GUI.window.prop("scrollHeight"));
    }

    _writeLineToOutput(text) {
        if (text.startsWith("###ERROR")) {
            this.writeToOutput(`<span class="error_message">${text}</span><br>`);
            this._cliErrorsCount++;
        } else {
            this.writeToOutput(`${text}<br>`);
        }
        this._responseCallback?.();
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
            const isCRLF = currentChar.charCodeAt() === CliEngine.s_lineFeedCode || currentChar.charCodeAt() === CliEngine.s_carriageReturnCode;

            if (!CONFIGURATOR.cliEngineValid && (isCRLF || this._startProcessingForValidation)) {
                // try to catch part of valid CLI enter message
                this._startProcessingForValidation = true;
                validateText += currentChar;
                this.writeToOutput(currentChar);
                continue;
            }

            const escapeSequenceCode = 27;
            const escapeSequenceCharLength = 3;
            if (charCode === escapeSequenceCode && !sequenceCharsToSkip) { // ESC + other
                sequenceCharsToSkip = escapeSequenceCharLength;
            }

            if (sequenceCharsToSkip) {
                sequenceCharsToSkip--;
                continue;
            }

            this._adjustCliBuffer(charCode)

            if (this._cliBuffer === 'Rebooting' && CliEngine.s_backspaceCode !== charCode) {
                CONFIGURATOR.cliEngineActive = false;
                CONFIGURATOR.cliEngineValid = false;
                CONFIGURATOR.cliTab = '';
                GUI.log(i18n.getMessage('cliReboot'));
                reinitialiseConnection();
            }
            if (this._cliBuffer === 'Command batch started' && CliEngine.s_backspaceCode !== charCode) {
                this._inBatchMode = true;
            }

            if (this._cliBuffer === 'Command batch ended' && CliEngine.s_backspaceCode !== charCode) {
                this._inBatchMode = false;
            }
        }
        if (!CONFIGURATOR.cliEngineValid && validateText.indexOf('CLI') !== -1) {

            GUI.log(i18n.getMessage('cliEnter'));
            CONFIGURATOR.cliEngineValid = true; // TODO: consolidate this!

            // begin output history with the prompt (last line of welcome message)
            // this is to match the content of the history with what the user sees on this tab
            const lastLine = validateText.split("\n").pop();
            this._outputHistory = lastLine;

            if (this._cliAutoComplete && this._cliAutoComplete.isEnabled() && !this._cliAutoComplete.isBuilding()) {
                // start building autoComplete
                this._cliAutoComplete.builderStart();
            }
        }

        if (CONFIGURATOR.cliEngineValid) {
            // fallback to native autocomplete
            if (((this._cliAutoComplete && !this._cliAutoComplete.isEnabled()) || this._cliAutoComplete == undefined) && this._cliBufferContainsPartialCommand) {
                this.setPrompt(this._removePromptHash(this._cliBuffer));
            }
        }
    }

    setPrompt(text) {
        this._GUI.textarea.val(text);
    }

    // sendLine sends a line that ends with a \n. This will clear the buffer, as it will no longer contain a partial command. 
    sendLine(line, callback) {
        this._send(`${line}\n`, callback);
    }

    // _sendLineWithTab sends a line with a tab character -- this triggers the FC's native autocomplete, which in turn will populate the buffer with a partial command that needs to be handled.
    _sendLineWithTab(line, callback) {
        if (this._cliBufferContainsPartialCommand) {
            line = this._lineWithBuffer(line);
        } else {
            this._cliBufferContainsPartialCommand = true;
        }
        this._send(line + '\t', callback);
    }

    subscribeResponseCallback(callback) {
        this._responseCallback = callback;
    }
    unsubscribeResponseCallback() {
        this._responseCallback = undefined;
    }

    _send(line, callback) {
        const bufferOut = new ArrayBuffer(line.length);
        const bufView = new Uint8Array(bufferOut);

        for (let cKey = 0; cKey < line.length; cKey++) {
            bufView[cKey] = line.charCodeAt(cKey);
        }

        serial.send(bufferOut, callback);
    }

    // adjustCliBuffer handles a character code and translates it as necessary onto the CLI buffer.
    _adjustCliBuffer(newCharacterCode) {
        if (CONFIGURATOR.cliEngineValid) {
            const currentChar = String.fromCharCode(newCharacterCode);
            switch (newCharacterCode) {
                // Windows
                case CliEngine.s_lineFeedCode:
                    if (GUI.operating_system === "Windows") {
                        this._writeLineToOutput(this._cliBuffer);
                        this._cliBuffer = "";
                    }
                    break;
                // Everything else 
                case CliEngine.s_carriageReturnCode:
                    if (GUI.operating_system !== "Windows") {
                        this._writeLineToOutput(this._cliBuffer);
                        this._cliBuffer = "";
                    }
                    break;
                case 60:
                    this._cliBuffer += '&lt';
                    break;
                case 62:
                    this._cliBuffer += '&gt';
                    break;
                case CliEngine.s_backspaceCode:
                    this._cliBuffer = this._cliBuffer.slice(0, -1);
                    this._outputHistory = this._outputHistory.slice(0, -1);
                    return; // Return so we don't unnecessarily append to the output history.
                default:
                    this._cliBuffer += currentChar;
            }
            this._outputHistory += currentChar;
        }
    }
}

CliEngine.s_backspaceCode = 8;
CliEngine.s_lineFeedCode = 10;
CliEngine.s_carriageReturnCode = 13;
CliEngine.s_tabCode = 9;
CliEngine.s_enterKeyCode = 13;
CliEngine.s_keyUpCode = 38;
CliEngine.s_keyDownCode = 40;
CliEngine.s_commandDiffAll = "diff all";
CliEngine.s_commandDumpAll = "dump all";
CliEngine.s_commandDefaultsNoSave = "defaults nosave";
CliEngine.s_commandSave = "save";
CliEngine.s_commandExit = "exit";

import * as clipboard from "@/js/clipboard.js";
import * as filesystem from '@/js/filesystem.js';
import CliEngine from '@/js/cli_engine.js';

const tab = {
    tabName: 'cli',
    cliEngine: null,
    GUI: {
        snippetPreviewWindow: null,
        copyButton: null,
        window: null,
        windowWrapper: null,
        textarea: null,
    },
};

async function copyToClipboard(text) {
    try {
        await clipboard.writeText(text);
        const button = tab.GUI.copyButton;
        const origText = button.text();
        const origWidth = button.css("width");
        button.text(i18n.getMessage("cliCopySuccessful"));
        button.css({
            width: origWidth,
            textAlign: "center",
        });
        setTimeout(() => {
            button.text(origText);
            button.css({
                width: "",
                textAlign: "",
            });
        }, 1500);
    } catch (err) {
        console.warn(err);
    }
}

tab.initialize = function (callback) {
    const self = this;

    if (GUI.active_tab !== 'cli') {
        GUI.active_tab = 'cli';
    }

    self.cliEngine = new CliEngine();

    $('#content').load("/src/tabs/cli.html", function () {

        // translate to user-selected language
        i18n.localizePage();

        tab.adaptPhones();

        self.GUI.copyButton = $('.tab-cli .copy');
        self.GUI.window = $('.tab-cli .window');
        self.GUI.windowWrapper = $('.tab-cli .window .wrapper');
        self.GUI.textarea = $('.tab-cli textarea[name="commands"]');

        $('.tab-cli .save').on('click', async function () {
            const prefix = 'cli';
            const suffix = 'txt';

            try {
              await filesystem.writeTextFile(self.cliEngine.outputHistory, {
                  suggestedName: generateFilename(prefix, suffix),
                  description: `${suffix.toUpperCase()} files`,
              });
            } catch (err) {
                console.log('Failed to save config', err);
            }
        });

        $('.tab-cli .clear').on("click", function () {
            self.cliEngine.clearOutputHistory();
        });

        self.GUI.copyButton.click(function() {
            copyToClipboard(self.cliEngine.outputHistory);
        });

        $('.tab-cli .load').on('click', async function () {
            const previewArea = $("#snippetpreviewcontent textarea#preview");

            function executeSnippet() {
                const commands = previewArea.val();
                self.cliEngine.executeCommands(commands);
                self.GUI.snippetPreviewWindow.close();
            }

            function previewCommands(result, fileName) {
                if (!self.GUI.snippetPreviewWindow) {
                    self.GUI.snippetPreviewWindow = new jBox("Modal", {
                        id: "snippetPreviewWindow",
                        width: 'auto',
                        height: 'auto',
                        closeButton: 'title',
                        animation: false,
                        isolateScroll: false,
                        title: i18n.getMessage("cliConfirmSnippetDialogTitle", { fileName: fileName }),
                        content: $('#snippetpreviewcontent'),
                        onCreated: () =>
                            $("#snippetpreviewcontent a.confirm").on('click', () => executeSnippet(fileName))
                        ,
                    });
                }

                let parsedLines = result.split('\n').map(line => {
                    const lowerLine = line.toLowerCase().trim();
                    if (
                        lowerLine.startsWith('save') ||
                        lowerLine.startsWith('dump') ||
                        lowerLine.startsWith('diff') ||
                        lowerLine.startsWith('exit')
                    ) {
                        return `# ${line}`;
                    } else {
                        return line;
                    }
                }).join('\n');
                previewArea.val(parsedLines);
                console.log('Previewing commands:', parsedLines);
                self.GUI.snippetPreviewWindow.open();
            }

            try {
                const file = await filesystem.readTextFile({
                    description: "Config files",
                    extensions: [".txt", ".config"],
                });
                if (!file) return;
                previewCommands(file.content, file.name);
            } catch (err) {
                console.log("Failed to load config", err);
            }
        });

        self.exit = function (callback) {
            if (CONFIGURATOR.cliEngineActive) {
                const dialog = $('.dialogCLIExit')[0];

                $('.cliExitBackBtn').click(function () {
                    $('.cliExitBackBtn').off('click');
                    dialog.close();
                });

                dialog.showModal();
            }
            else {
                callback?.();
            }
        };

        self.activateCli();

        GUI.saveDefaultTab('status');

        GUI.content_ready(callback);
    });
};

tab.activateCli = function () {
    return new Promise(resolve => {
        CONFIGURATOR.cliEngineActive = true;
        CONFIGURATOR.cliTab = 'cli';
        this.cliEngine.setUi(this.GUI.window, this.GUI.windowWrapper, this.GUI.textarea);
        this.cliEngine.initializeAutoComplete();
        this.cliEngine.enterCliMode();

        const waitForValidCliEngine = setInterval(() => {
            if (CONFIGURATOR.cliEngineValid) {
                clearInterval(waitForValidCliEngine);
                GUI.timeout_add('enter_cli', () => {
                    resolve();
                }, 500);
            }
        }, 500);
    });
};

tab.adaptPhones = function () {
    if ($(window).width() < 575) {
        const backdropHeight = $('.note').height() + 22 + 38;
        $('.backdrop').css('height', `calc(100% - ${backdropHeight}px)`);
    }

    if (GUI.isCordova()) {
        UI_PHONES.initToolbar();
    }
};

tab.read = function (readInfo) {
    this.cliEngine.readSerial(readInfo);
};

tab.cleanup = function (callback) {
    if (tab.GUI.snippetPreviewWindow) {
        tab.GUI.snippetPreviewWindow.destroy();
        tab.GUI.snippetPreviewWindow = null;
    }

    if (!(CONFIGURATOR.connectionValid && CONFIGURATOR.cliEngineValid && CONFIGURATOR.cliEngineActive)) {
        callback?.();
        return;
    }
    this.cliEngine.close(callback);

    CliAutoComplete.cleanup();
    $(CliAutoComplete).off();
};

TABS[tab.tabName] = tab;

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        if (newModule && GUI.active_tab === tab.tabName) {
            TABS[tab.tabName].initialize();
        }
    });

    import.meta.hot.dispose(() => {
        tab.cleanup();
    });
}

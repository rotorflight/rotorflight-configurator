// The Virtual FC has no firmware to talk to, so the CLI would never answer:
// the engine would not see the welcome banner, and `exit`/`save` would never
// produce the "Rebooting" that ends the session, leaving the CLI tab locked.
// This emulates just enough of the firmware's CLI to enter it and leave it
// again. It produces the same text the firmware does, so CliEngine parses it
// exactly like a real FC's output.

const NL = "\r\n";
const PROMPT = `${NL}# `;

const CHAR_DELETE = "\x7f";

export default class VirtualCli {
  #line = "";

  // What the firmware prints on receiving the `#` that enters the CLI.
  banner() {
    return `${NL}Entering CLI Mode, type 'exit' to return, or 'help'${NL}${PROMPT}`;
  }

  // Takes the characters sent to the FC and returns the FC's reply.
  input(text) {
    let output = "";
    for (const char of text) {
      if (char === "\r" || char === "\n") {
        output += this.#execute(this.#line.trim());
        this.#line = "";
      } else if (char === CHAR_DELETE || char === "\b") {
        this.#line = this.#line.slice(0, -1);
      } else if (char !== "\t") {
        this.#line += char;
        output += char;
      }
    }
    return output;
  }

  #execute(line) {
    const command = line.split(/\s+/)[0].toLowerCase();
    switch (command) {
      case "":
        return PROMPT;
      case "exit":
        return `${NL}# leaving CLI mode, unsaved changes lost${NL}${NL}Rebooting`;
      case "save":
        return `${NL}# saving${NL}${NL}Rebooting`;
      case "help":
        return (
          `${NL}The Virtual FC only emulates these commands:` +
          `${NL}exit - leave CLI mode, discarding changes` +
          `${NL}save - leave CLI mode, saving changes${PROMPT}`
        );
      default:
        return `${NL}###ERROR: ${command}: NOT AVAILABLE ON THE VIRTUAL FC###${PROMPT}`;
    }
  }
}

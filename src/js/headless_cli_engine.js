import CliEngine from "@/js/cli_engine.js";

/**
 * File: src/js/headless_cli_engine.js
 * HeadlessCliEngine is a CliEngine with no on-screen console.
 *
 * CliEngine only touches its jQuery-wrapped `#GUI` elements from two
 * places: `setUi()` (which we simply never call) and `writeToOutput()`
 * (which is called internally, including from deep inside
 * `readSerial()`). Overriding `writeToOutput` as a no-op means `#GUI`
 * is never dereferenced, while `outputHistory` still accumulates
 * correctly — that bookkeeping lives in CliEngine's own private
 * `#adjustCliBuffer()` logic and does not depend on the UI at all.
 *
 * Use this for tabs that just need to send a fixed CLI command
 * sequence and read back the response text, without rendering an
 * interactive console.
 */
export default class HeadlessCliEngine extends CliEngine {
  writeToOutput(_text) {
    // Intentionally empty — no console to write to.
  }
}
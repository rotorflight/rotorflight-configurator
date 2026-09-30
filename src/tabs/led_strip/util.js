import { CELL_COUNT, GRID_SIZE } from "./constants.js";

export function cellIndex(x, y) {
  return y * GRID_SIZE + x;
}

export function cellXY(index) {
  return { x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) };
}

export function makeCell() {
  return {
    wire: null,
    func: "",
    overlays: { t: false, o: false, b: false, v: false, i: false, w: false, k: false, d: false },
    directions: { n: false, e: false, s: false, w: false, u: false, d: false },
    color: 0,
    altColor: 0,
    blinkPattern: 0,
    blinkPause: 0,
  };
}

export function makeGrid() {
  return Array.from({ length: CELL_COUNT }, () => makeCell());
}

export function hasAnyFunction(cell) {
  return cell.func !== "" || Object.values(cell.overlays).some(Boolean);
}

export function directionsString(cell) {
  return Object.keys(cell.directions)
    .filter((d) => cell.directions[d])
    .join("");
}

export function functionsString(cell) {
  let out = cell.func;
  for (const letter of Object.keys(cell.overlays)) {
    if (cell.overlays[letter]) out += letter;
  }
  return out;
}

// A led entry firmware/updateBulkCmd considers "not actually configured" -
// the shape left behind for unused wire slots.
export function isDefaultLed(led) {
  return (
    led.functions?.[0] === "c" &&
    led.functions.length === 1 &&
    (!led.directions || led.directions.length === 0) &&
    Number(led.color) === 0 &&
    Number(led.x) === 0 &&
    Number(led.y) === 0
  );
}

export function loadGridFromLedStrip(ledStrip) {
  const grid = makeGrid();

  ledStrip.forEach((led, wireIndex) => {
    if (isDefaultLed(led)) return;

    const cell = grid[cellIndex(Number(led.x), Number(led.y))];
    cell.wire = wireIndex;

    const functions = Array.from(led.functions ?? []);
    for (const letter of functions) {
      if (letter in cell.overlays) {
        cell.overlays[letter] = true;
      } else {
        cell.func = letter;
      }
    }

    for (const letter of Array.from(led.directions ?? [])) {
      if (letter in cell.directions) cell.directions[letter] = true;
    }

    cell.color = Number(led.color) || 0;
    cell.altColor = Number(led.altColor) || 0;
    cell.blinkPattern = Number(led.blinkPattern) || 0;
    cell.blinkPause = Number(led.blinkPause) || 0;
  });

  return grid;
}

export function buildLedStrip(grid, wireCount) {
  const ledStrip = new Array(wireCount);

  grid.forEach((cell, index) => {
    if (cell.wire === null || cell.wire >= wireCount) return;
    if (!hasAnyFunction(cell)) return;

    const { x, y } = cellXY(index);
    ledStrip[cell.wire] = {
      x,
      y,
      directions: directionsString(cell),
      functions: functionsString(cell),
      color: cell.color,
      blinkPattern: cell.blinkPattern,
      blinkPause: cell.blinkPause,
      altColor: cell.altColor,
    };
  });

  // Matches the shape firmware reports for an unconfigured slot (functionId
  // 0 always decodes to letter 'c' - see isDefaultLed), so a save/revert
  // round-trip through this placeholder is recognized as "unconfigured"
  // again instead of leaking a stray wire assignment at grid position (0,0).
  const defaultLed = { x: 0, y: 0, directions: "", functions: "c", color: 0 };
  for (let i = 0; i < wireCount; i++) {
    if (!ledStrip[i]) ledStrip[i] = defaultLed;
  }

  return ledStrip;
}

export function usedWireCount(grid) {
  return grid.reduce((count, cell) => count + (cell.wire !== null ? 1 : 0), 0);
}

export function nextFreeWire(grid, wireCount) {
  const used = new Set(grid.filter((c) => c.wire !== null).map((c) => c.wire));
  let n = 0;
  while (used.has(n)) n++;
  return n < wireCount ? n : null;
}

export function bpmToMs(bpm) {
  let ms = Math.round((60 * 250) / bpm);
  if (ms < 50) ms = 50;
  else if (ms > 500) ms = 500;
  return ms;
}

export function msToBpm(ms) {
  let bpm = Math.round((60 * 250) / ms);
  if (bpm < 30) bpm = 30;
  else if (bpm > 300) bpm = 300;
  return bpm;
}

export function areModifiersActive(func) {
  return func === "c" || func === "a" || func === "f";
}

export function areOverlaysActive(func) {
  return ["", "c", "a", "f", "s", "l", "r", "o", "g"].includes(func);
}

export function areBlinkersActive(func) {
  return func === "c" || func === "a" || func === "f";
}

export function isWarningActive(func) {
  if (["l", "s", "g"].includes(func)) return false;
  if (["r", "b"].includes(func)) return false;
  return true;
}

export function isVtxActive(func) {
  return ["v", "c", "a", "f"].includes(func);
}

export function hsvToColor(hsv) {
  if (!hsv) return "";

  const h = Number(hsv.h);
  const s = Number(hsv.s);
  const v = Number(hsv.v);

  if (s === 0 && v === 0) return "";

  const sat = 1 - s / 255;
  const val = v / 255;

  const l = ((2 - sat) * val) / 2;
  const sl = l && l < 1 ? (sat * val) / (l < 0.5 ? l * 2 : 2 - l * 2) : sat;

  return `hsl(${h}, ${sl * 100}%, ${l * 100}%)`;
}

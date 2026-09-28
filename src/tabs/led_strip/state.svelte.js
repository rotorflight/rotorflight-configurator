import { SvelteSet } from "svelte/reactivity";

import { FC } from "@/js/fc.svelte.js";
import { mspHelper } from "@/js/msp/MSPHelper.js";

import { DIRECTIONS } from "./constants.js";
import {
  areBlinkersActive,
  areModifiersActive,
  areOverlaysActive,
  buildLedStrip,
  isVtxActive,
  isWarningActive,
  loadGridFromLedStrip,
  makeCell,
  makeGrid,
  nextFreeWire,
  usedWireCount,
} from "./util.js";

function makePanel() {
  return {
    func: "",
    overlays: {
      t: false,
      o: false,
      b: false,
      v: false,
      i: false,
      w: false,
      k: false,
      d: false,
    },
    directions: { n: false, e: false, s: false, w: false, u: false, d: false },
    color: 0,
    altColor: 0,
    blinkPattern: 0,
    blinkPause: 0,
  };
}

export const ledState = $state({
  grid: makeGrid(),
  selected: new SvelteSet(),
  wireMode: false,
  panel: makePanel(),
  selectedModeColor: null,
});

export function initFromFC() {
  ledState.grid = loadGridFromLedStrip(FC.LED_STRIP);
  ledState.selected = new SvelteSet();
  ledState.wireMode = false;
  ledState.panel = makePanel();
  ledState.selectedModeColor = null;
}

function syncToFC() {
  FC.LED_STRIP = buildLedStrip(ledState.grid, FC.LED_STRIP.length);
  mspHelper.sendLedStripConfig();
}

export function wiresRemaining() {
  return FC.LED_STRIP.length - usedWireCount(ledState.grid);
}

export function commitSelection(cellIndices) {
  const sorted = [...cellIndices].sort((a, b) => a - b);

  if (ledState.wireMode) {
    for (const idx of sorted) {
      const cell = ledState.grid[idx];
      if (cell.wire === null) {
        const wire = nextFreeWire(ledState.grid, FC.LED_STRIP.length);
        if (wire !== null) cell.wire = wire;
      }
    }
  }

  ledState.selected = new SvelteSet(sorted);

  const unionDirections = { n: false, e: false, s: false, w: false, u: false, d: false };
  let lastWired = null;
  for (const idx of sorted) {
    const cell = ledState.grid[idx];
    if (cell.wire === null) continue;
    for (const d of DIRECTIONS) {
      if (cell.directions[d]) unionDirections[d] = true;
    }
    lastWired = cell;
  }

  ledState.panel = lastWired
    ? {
        func: lastWired.func,
        overlays: { ...lastWired.overlays },
        directions: unionDirections,
        color: lastWired.color,
        altColor: lastWired.altColor,
        blinkPattern: lastWired.blinkPattern,
        blinkPause: lastWired.blinkPause,
      }
    : { ...makePanel(), directions: unionDirections };

  ledState.selectedModeColor = null;

  syncToFC();
}

function overlayAllowed(letter, func) {
  switch (letter) {
    case "t":
    case "o":
      return areModifiersActive(func);
    case "b":
      return areBlinkersActive(func);
    case "i":
    case "k":
    case "d":
      return areOverlaysActive(func);
    case "w":
      return areOverlaysActive(func) && isWarningActive(func);
    case "v":
      return areOverlaysActive(func) && isVtxActive(func);
    default:
      return false;
  }
}

function unselectOverlaysForFunction(func) {
  const toClear = [];
  if (func === "r" || func === "") {
    toClear.push("o", "b", "t");
  }
  if (["l", "g", "s"].includes(func)) {
    toClear.push("w", "v", "t", "o", "b");
  }
  for (const letter of toClear) {
    setOverlay(letter, false);
  }
}

export function applyFunction(letter) {
  for (const idx of ledState.selected) {
    const cell = ledState.grid[idx];
    if (cell.wire === null) continue;
    cell.func = letter;
  }
  ledState.panel.func = letter;

  unselectOverlaysForFunction(letter);

  syncToFC();
}

export function setOverlay(letter, checked) {
  if (checked) {
    for (const idx of ledState.selected) {
      const cell = ledState.grid[idx];
      if (cell.wire === null) continue;
      if (overlayAllowed(letter, cell.func)) cell.overlays[letter] = true;
    }
  } else {
    for (const idx of ledState.selected) {
      ledState.grid[idx].overlays[letter] = false;
    }
  }
  ledState.panel.overlays[letter] = checked;
  syncToFC();
}

export function toggleDirection(letter) {
  if (ledState.selected.size === 0) return;

  const newValue = !ledState.panel.directions[letter];
  for (const idx of ledState.selected) {
    ledState.grid[idx].directions[letter] = newValue;
  }
  ledState.panel.directions[letter] = newValue;
  ledState.selectedModeColor = null;
  syncToFC();
}

export function selectColor(index) {
  if (ledState.selectedModeColor) {
    const { mode, direction } = ledState.selectedModeColor;
    const mc = FC.LED_MODE_COLORS.find((m) => m.mode === mode && m.direction === direction);
    if (mc) mc.color = index;
  } else {
    for (const idx of ledState.selected) {
      ledState.grid[idx].color = index;
    }
    syncToFC();
  }
  ledState.panel.color = index;
}

export function selectAltColor(index) {
  if (ledState.selectedModeColor) return;

  for (const idx of ledState.selected) {
    ledState.grid[idx].altColor = index;
  }
  ledState.panel.altColor = index;
  syncToFC();
}

export function selectModeColor(mode, direction) {
  if (
    ledState.selectedModeColor?.mode === mode &&
    ledState.selectedModeColor?.direction === direction
  ) {
    ledState.selectedModeColor = null;
    return;
  }

  ledState.selectedModeColor = { mode, direction };
  const mc = FC.LED_MODE_COLORS.find((m) => m.mode === mode && m.direction === direction);
  ledState.panel.color = mc ? mc.color : 0;
}

export function setBlinkBit(bit, checked) {
  if (ledState.selected.size === 0) return;

  const mask = 1 << bit;
  const newPattern = checked
    ? ledState.panel.blinkPattern | mask
    : ledState.panel.blinkPattern & ~mask;

  for (const idx of ledState.selected) {
    ledState.grid[idx].blinkPattern = newPattern;
  }
  ledState.panel.blinkPattern = newPattern;
  syncToFC();
}

export function setBlinkPause(value) {
  if (ledState.selected.size === 0) return;

  for (const idx of ledState.selected) {
    ledState.grid[idx].blinkPause = value;
  }
  ledState.panel.blinkPause = value;
  syncToFC();
}

export function clearSelected() {
  for (const idx of ledState.selected) {
    ledState.grid[idx] = makeCell();
  }
  ledState.panel = makePanel();
  syncToFC();
}

export function clearAll() {
  ledState.grid = makeGrid();
  ledState.selected = new SvelteSet();
  ledState.panel = makePanel();
  ledState.selectedModeColor = null;
  syncToFC();
}

export function wireClearSelected() {
  for (const idx of ledState.selected) {
    ledState.grid[idx].wire = null;
  }
  syncToFC();
}

export function wireClearAll() {
  for (const cell of ledState.grid) {
    cell.wire = null;
  }
  syncToFC();
}

export function toggleWireMode() {
  ledState.wireMode = !ledState.wireMode;
}

export function updateColorHSV(component, value) {
  const idx = ledState.panel.color;
  if (!FC.LED_COLORS[idx]) return;

  FC.LED_COLORS[idx][component] = value;
  mspHelper.sendLedStripColors();
}

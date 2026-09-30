export const GRID_SIZE = 16;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

// Must match ledDirectionLetters/ledBaseFunctionLetters/ledOverlayLetters in
// MSPHelper.js - order is the wire-protocol bit order, not display order.
export const DIRECTIONS = ["n", "e", "s", "w", "u", "d"];
export const BASE_FUNCS = ["c", "f", "a", "l", "s", "g", "r"];
export const OVERLAYS = ["t", "o", "b", "v", "i", "w", "k", "d"];

export const FUNCTION_LABELS = {
  c: "ledStripFunctionColorOption",
  f: "ledStripFunctionModesOption",
  a: "ledStripFunctionArmOption",
  l: "ledStripFunctionBatteryOption",
  s: "ledStripFunctionRSSIOption",
  g: "ledStripFunctionGPSOption",
  r: "ledStripFunctionRingOption",
};

// Background swatch shown on grid cells/the function dropdown, matching the
// legacy tab's per-function CSS.
export const FUNCTION_COLORS = {
  c: "linear-gradient(to bottom right, rgba(255,0,0,.5) 0%, rgba(255,255,0,.5) 15%, rgba(0,255,0,.5) 30%, rgba(0,255,255,.5) 50%, rgba(0,0,255,.5) 65%, rgba(255,0,255,.5) 80%, rgba(255,0,0,.5) 100%)",
  f: "rgb(50, 205, 50)",
  a: "rgb(52, 155, 255)",
  l: "magenta",
  s: "brown",
  g: "green",
  r: "radial-gradient(ellipse at center, #000 0%, #000 60%, #fff 60%, #fff 70%, #000 70%, #000 100%)",
};

export const MODE_OPTIONS = [
  "ledStripModeColorsModeOrientation",
  "ledStripModeColorsModeHeadfree",
  "ledStripModeColorsModeHorizon",
  "ledStripModeColorsModeAngle",
  "ledStripModeColorsModeMag",
  "ledStripModeColorsModeBaro",
];

// Special "mode 6" mode-color slots - which ones are relevant depends on the
// active function (matches setOptionalGroupsVisibility's switch). "Animation"
// (direction 2) and "Background" (direction 3) exist in the data model but
// are never shown by the legacy tab either - dropped here too.
export const SPECIAL_COLOR_SLOTS = [
  { direction: 0, label: "ledStripModeColorsModeDisarmed", forFunc: ["a"] },
  { direction: 1, label: "ledStripModeColorsModeArmed", forFunc: ["a"] },
  { direction: 4, label: "ledStripModeColorsModeBlinkBg", forFunc: ["b"] },
  { direction: 5, label: "ledStripModeColorsModeGPSNoSats", forFunc: ["g"] },
  { direction: 6, label: "ledStripModeColorsModeGPSNoLock", forFunc: ["g"] },
  { direction: 7, label: "ledStripModeColorsModeGPSLocked", forFunc: ["g"] },
];

export const COLOR_COUNT = 16;
export const COLOR_TITLES = [
  "colorBlack",
  "colorWhite",
  "colorRed",
  "colorOrange",
  "colorYellow",
  "colorLimeGreen",
  "colorGreen",
  "colorMintGreen",
  "colorCyan",
  "colorLightBlue",
  "colorBlue",
  "colorDarkViolet",
  "colorMagenta",
  "colorDeepPink",
  "colorBlack",
  "colorBlack",
];

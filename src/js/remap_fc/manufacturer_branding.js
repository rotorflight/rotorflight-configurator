/**
 * File: src/js/remap_fc/manufacturer_branding.js
 * Presentation data for the board diagram, keyed by FC.CONFIG.manufacturerId
 * -- purely cosmetic (name, brand artwork, case colours), never used
 * for anything sent to the flight controller. Kept as plain JS rather
 * than JSON so each entry can sit next to the comment explaining it;
 * a manufacturer missing from one or all of these three just falls
 * back to RemapFc.svelte's own generic presentation.
 */

// The board's own printed brand name -- distinct from
// manufacturers.js's own `name` (the parent RC-radio manufacturer,
// e.g. "FrSky"), this is what's actually silkscreened on the board
// itself (e.g. "Vantac"). Falls back to FC.CONFIG's own reported
// manufacturerId when a board has no dedicated diagram.
export const MANUFACTURER_BOARD_NAMES = {
  RDMS: "RadioMaster",
  FRSK: "Vantac",
  GSKY: "Goosky",
  FDRC: "FlyDragon",
  FWRF: "FlyWing",
  MTKS: "Matek",
};

// The board's own printed branding artwork -- one <MANUFACTURER>_
// BRAND.svg file per manufacturer (see src/images/remap_fc/), each
// laid over the diagram at a fixed width (see RemapFc.svelte's
// BRAND_IMAGE_WIDTH) with its own aspect ratio setting the height, so
// every image can have a different natural shape without needing
// per-manufacturer layout code. A manufacturer with no entry here just
// shows the plain generic body.
export const MANUFACTURER_BRAND_IMAGES = {
  RDMS: { file: "RADIOMASTER_BRAND.svg", aspect: 282 / 75 },
  FRSK: { file: "VANTAC_BRAND.svg", aspect: 1377 / 596 },
  GSKY: { file: "GOOSKY_BRAND.svg", aspect: 1427 / 135 },
  FDRC: { file: "FLYDRAGON_BRAND.svg", aspect: 500 / 360 },
  FWRF: { file: "FLYWING_BRAND.svg", aspect: 613 / 171 },
  MTKS: { file: "MATEKSYS_BRAND.svg", aspect: 300 / 70 },
};

// Body/bezel colours for the board diagram -- grey is the generic
// fallback; manufacturers with a real reference diagram get their own
// real case colours instead.
export const MANUFACTURER_BOARD_COLORS = {
  RDMS: { bezel: "#c9d0d6", body: "#2f6f96" },
  FDRC: { bezel: "#c9d0d6", body: "#a13d3d" },
  GSKY: { bezel: "#c9d0d6", body: "#6f4a91" },
  FRSK: { bezel: "#2b2d31", body: "#101113" },
};

import { TBS_CRSF_ID } from "./protocols.js";

// Common channel orders. map[function] = receiver channel, functions in the
// order roll, pitch, yaw, collective, throttle, aux 1-3 (rxConfig()->rcmap).
export const CHANNEL_PRESETS = [
  { label: "ELRS", map: [0, 1, 3, 2, 5, 4, 6, 7] },
  { label: "FrSky", map: [0, 1, 3, 4, 2, 5, 6, 7] },
  { label: "Futaba / Hitec", map: [0, 1, 3, 5, 2, 4, 6, 7] },
  { label: "Spektrum / Graupner / JR", map: [1, 2, 3, 5, 0, 4, 6, 7] },
];

// Channel order to apply when a receiver type is chosen, or null to leave the map alone.
// TBS CRSF gets the ELRS order (#307), but only while the current map is one of the presets:
// a hand-made order (for example from the wizard's order detection) is kept.
export function channelOrderFor(protocolId, currentMap) {
  if (protocolId !== TBS_CRSF_ID) return null;

  const isPreset = CHANNEL_PRESETS.some((p) =>
    p.map.every((ch, i) => currentMap?.[i] === ch),
  );
  if (!isPreset) return null;

  return CHANNEL_PRESETS.find((p) => p.label === "ELRS")?.map ?? null;
}

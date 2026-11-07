// Common channel orders. map[function] = receiver channel, functions in the
// order roll, pitch, yaw, collective, throttle, aux 1-3 (rxConfig()->rcmap).
export const CHANNEL_PRESETS = [
  { label: "ELRS", map: [0, 1, 3, 2, 5, 4, 6, 7] },
  { label: "FrSky", map: [0, 1, 3, 4, 2, 5, 6, 7] },
  { label: "Futaba / Hitec", map: [0, 1, 3, 5, 2, 4, 6, 7] },
  { label: "Spektrum / Graupner / JR", map: [1, 2, 3, 5, 0, 4, 6, 7] },
];

// TBS CRSF (serialrx_provider 9) is used with ELRS, whose channel order is set here: choosing
// the receiver type sets it, so nobody has to set it by hand (#307). Null for other receivers.
export const TBS_CRSF_PROTOCOL_ID = 9;

export function channelOrderFor(protocolId) {
  if (protocolId !== TBS_CRSF_PROTOCOL_ID) return null;
  return CHANNEL_PRESETS.find((p) => p.label === "ELRS")?.map ?? null;
}

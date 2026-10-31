// Goosky ESCs run AM32 firmware, so this is the AM32 module under the Goosky brand: same
// esc_signature (0xC2), EEPROM layout, pages and handshake. Selectable with the Goosky
// telemetry protocol (16, a firmware alias of BLHeli32) as well as BLHeli32 itself.

import am32 from "./am32.js";
import { registerManufacturer } from "./registry.js";

function describeEsc(values) {
    return `Goosky ${am32.describeEsc(values)}`;
}

const goosky = {
    ...am32,
    id: "goosky",
    name: "Goosky",
    escSensorProtocolIds: [16, 1],
    describeEsc,
};

registerManufacturer(goosky);

export default goosky;

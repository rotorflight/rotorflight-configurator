// Registers every ESC manufacturer module (each imports registerManufacturer from
// registry.js and calls it as a side effect) and re-exports the read side of the registry.

export { getManufacturer, listManufacturers } from "./registry.js";

import "./am32.js";
import "./blheli_s.js";
import "./bluejay.js";
import "./flyrotor.js";
import "./hw5.js";
import "./omp.js";
import "./scorpion.js";
import "./xdfly.js";
import "./yge.js";
import "./ztw.js";

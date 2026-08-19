// Registry storage, split out from index.js so manufacturer modules can import
// registerManufacturer without a self-referential cycle through index.js (which imports the
// manufacturer files for their registration side effect) -- a cycle through index.js hit a
// genuine "Cannot access 'registry' before initialization" TDZ error, since index.js's `import`
// lines run before its own `const registry = ...` line does.

const registry = new Map();

export function registerManufacturer(manufacturer) {
    registry.set(manufacturer.id, manufacturer);
}

export function getManufacturer(id) {
    return registry.get(id);
}

export function listManufacturers() {
    return Array.from(registry.values());
}

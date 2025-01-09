/**
 * @typedef {import('@/js/presets/source/preset_instance.js').default} PresetInstance
 */
const MAX_TRACKED_PRESETS_COUNT = 50;

export class TrackedPreset {
    viewURL = "";
    lastPickDate = 0;

    constructor(viewURL){
        this.viewURL = viewURL;
        this.lastPickDate = Date.now();
    }
}


export default class PresetTracker {
    /**
     * @type {TrackedPreset[]}
     */
    #trackedPresets;

    constructor() {
        this.#trackedPresets = [];
        this.#loadFromStorage();
    }

    #sort() {
        this.#trackedPresets.sort((a, b) => (a.lastPickDate - b.lastPickDate));
    }

    #prune() {
        this.#trackedPresets.splice(MAX_TRACKED_PRESETS_COUNT + 1, this.#trackedPresets.length);
    }

    #loadFromStorage() {
        this.#trackedPresets = [];
        const self = this;
        ConfigStorage.get('TrackedPresets', function (result) {
            if (result.TrackedPresets) {
                self.#trackedPresets = result.TrackedPresets;
            }
        });
        
    }

    #saveToStorage() {
        ConfigStorage.set({'TrackedPresets': this.#trackedPresets});
    }

    /**
     * Adds a preset to be tracked. If the preset is already being tracked, it will update its last pick date.
     * @param {string} viewURL - The full path (viewURL) of the preset to be tracked.
     * @returns {TrackedPreset}
     */
    add(viewURL) {
        let trackedPreset = this.find(viewURL);

        if (!trackedPreset) {
            trackedPreset = new TrackedPreset(viewURL);
            this.#trackedPresets.push(trackedPreset);
            console.log("Added preset to the tracked list: " + viewURL);
        }

        trackedPreset.lastPickDate = Date.now();
        this.#sort();
        this.#prune();
        this.#saveToStorage();

        return trackedPreset;
    }

    /**
     * Removes a preset from being0 tracked.
     * @param {string} viewURL - The full path of the preset to be tracked.
     */
    remove(viewURL) {
        const index = this.#trackedPresets.findIndex((trackedPreset) => trackedPreset.viewURL === viewURL);

        if (index >= 0) {
            this.#trackedPresets.splice(index, 1);
            this.#sort();
            this.#prune();
            this.#saveToStorage();
        }
    }

    find(viewURL) {
        return this.#trackedPresets.find((trackedPreset) => trackedPreset.viewURL === viewURL);
    }
}

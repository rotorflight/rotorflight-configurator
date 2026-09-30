import PresetTracker from "@/js/presets/preset_tracker.js";

/**
 * PresetTracker (the starred / recently picked presets) whose lookups are
 * reactive, so stars and the result order update when it changes.
 */
export class ReactivePresetTracker {
  #tracker = new PresetTracker();
  #version = $state(0);

  find(viewUrl) {
    void this.#version;
    return this.#tracker.find(viewUrl);
  }

  add(viewUrl) {
    this.#tracker.add(viewUrl);
    this.#version++;
  }

  remove(viewUrl) {
    this.#tracker.remove(viewUrl);
    this.#version++;
  }

  toggle(viewUrl) {
    if (this.#tracker.find(viewUrl)) {
      this.remove(viewUrl);
    } else {
      this.add(viewUrl);
    }
  }
}

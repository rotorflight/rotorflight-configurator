// Remembers which rate profile was active the first time the Rates tab was
// opened this session, so Revert has something to switch back to even after
// the tab has been unmounted/remounted (e.g. by switching rate-profile
// sub-tabs, which itself forces a full reload). Only updated on an explicit
// Save. Mirrors src/tabs/profiles/state.svelte.js.
class State {
  savedRateProfile = $state();
}

export default new State();

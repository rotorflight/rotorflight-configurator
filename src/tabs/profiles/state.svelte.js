// Remembers which PID profile was active the first time the Profiles tab was
// opened this session, so Revert has something to switch back to even after
// the tab has been unmounted/remounted (e.g. by switching profile sub-tabs,
// which itself forces a full reload). Only updated on an explicit Save.
class State {
  savedProfile = $state();
}

export default new State();

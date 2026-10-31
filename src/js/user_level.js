import { config, isConfigSet } from "@/js/config.svelte.ts";
import { CONFIGURATOR } from "@/js/configurator.svelte.js";

// How much of the Configurator the pilot sees:
// - beginner: the Setup Wizard is the main tool; the nav keeps only the
//   tabs the wizard doesn't cover or sends the pilot to, and connecting
//   opens the wizard.
// - intermediate: every tab but the few only experts need, with the
//   detailed settings (<Field expert>, <Expert>) not shown at all.
// - advanced: every tab and every setting (what Expert Mode used to be).
// CONFIGURATOR.expertMode stays as the "advanced" flag the tabs read.
export const USER_LEVELS = ["beginner", "intermediate", "advanced"];

// Governor, Profiles and Rates are where the Setup Wizard's Finish step
// sends the pilot next.
const BEGINNER_TABS = [
  "status",
  "setup_wizard",
  "receiver",
  "failsafe",
  "governor",
  "profiles",
  "rates",
  "blackbox",
  "setup",
  "cli",
];

// Tabs only Advanced shows.
const ADVANCED_TABS = ["adjustments", "beepers", "sensors"];

export function loadUserLevel() {
  let level = config.userLevel;
  if (!USER_LEVELS.includes(level)) {
    // Before the levels there was only the Expert Mode switch. A pilot who
    // never touched it is new, so they start on Beginner.
    if (!isConfigSet("expertMode")) {
      level = "beginner";
    } else {
      level = config.expertMode ? "advanced" : "intermediate";
    }
    config.userLevel = level;
  }
  applyUserLevel(level);
}

export function setUserLevel(level) {
  config.userLevel = level;
  applyUserLevel(level);
}

function applyUserLevel(level) {
  CONFIGURATOR.userLevel = level;
  CONFIGURATOR.expertMode = level === "advanced";
}

export function isTabInUserLevel(tabName, level = CONFIGURATOR.userLevel) {
  if (level === "beginner") return BEGINNER_TABS.includes(tabName);
  if (level === "intermediate") return !ADVANCED_TABS.includes(tabName);
  return true;
}

// The tab to open on connect when nothing else asks for one.
export function homeTab() {
  return CONFIGURATOR.userLevel === "beginner" ? "setup_wizard" : "status";
}

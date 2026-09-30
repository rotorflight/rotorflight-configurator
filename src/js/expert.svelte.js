import { getContext, setContext } from "svelte";

// Shared between a Section and the <Expert> blocks inside it: `hidden` counts
// the blocks currently hidden by basic mode, `revealed` shows them anyway
// without switching expert mode on globally.
const KEY = Symbol("expert-section");

export function createExpertSection() {
  const section = $state({ hidden: 0, revealed: false });
  setContext(KEY, section);
  return section;
}

export function getExpertSection() {
  return getContext(KEY);
}

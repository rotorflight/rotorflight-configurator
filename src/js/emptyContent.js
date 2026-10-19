// Sections and SubSections hide themselves when nothing in them is shown,
// e.g. below the Advanced user level when every field in them is an
// expert one: no empty boxes and no headings over nothing.

// Anything a pilot can see or use, besides text.
const CONTENT = "input, select, textarea, button, canvas, svg, img, video, table";

export function hasContent(el) {
  return el.textContent.trim() !== "" || el.querySelector(CONTENT) !== null;
}

// Svelte action: calls `set(empty)` now and whenever the subtree changes.
export function watchEmpty(node, set) {
  const check = () => set(!hasContent(node));
  check();
  const observer = new MutationObserver(check);
  observer.observe(node, { childList: true, subtree: true, characterData: true });
  return { destroy: () => observer.disconnect() };
}

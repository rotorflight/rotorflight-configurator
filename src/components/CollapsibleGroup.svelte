<script>
  // A collapsible group frame for a list of cards: a dark header bar with a
  // chevron, title, count and live dot, and the cards as flat sections
  // inside, split by plain lines. The caller owns the open state.
  import { slide } from "svelte/transition";

  let {
    title,
    count,
    live = false,
    liveTitle = "",
    open = true,
    onToggle,
    children,
  } = $props();
</script>

<section class="group">
  <button
    type="button"
    class="group-header"
    aria-expanded={open}
    onclick={onToggle}
  >
    <em class={["fas", "fa-chevron-right", "chevron", open && "open"]}></em>
    <span class="group-title">{title}</span>
    <span class="group-count">{count}</span>
    {#if live}
      <span class="live-dot" title={liveTitle}></span>
    {/if}
  </button>
  {#if open}
    <div class="items" transition:slide={{ duration: 150 }}>
      {@render children?.()}
    </div>
  {/if}
</section>

<style lang="scss">
  .group {
    margin-top: var(--section-gap);
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    box-shadow: var(--shadow-xs);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    font: inherit;
    font-size: 1rem;
    font-weight: 700;
    text-align: left;
    /* surface-alt is a dark band in both themes; text-alt is the text
       token for it. */
    color: var(--color-text-alt);
    background-color: var(--color-surface-alt);
    border: none;
    cursor: pointer;

    @media (hover: hover) {
      &:hover {
        filter: brightness(1.15);
      }
    }

    &:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 3px var(--color-focus-ring);
    }
  }

  .chevron {
    width: 1em;
    font-size: 0.8rem;
    opacity: 0.8;
    transition: transform var(--animation-speed);

    &.open {
      transform: rotate(90deg);
    }
  }

  .group-count {
    min-width: 1.75em;
    padding: 0 8px;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.6;
    text-align: center;
    border-radius: var(--radius-pill);
    color: var(--color-text-alt);
    background-color: var(--color-accent-500);
  }

  .live-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background-color: var(--color-accent-500);
    box-shadow: 0 0 0 3px var(--color-accent-soft);
  }

  .items {
    display: flex;
    flex-direction: column;

    > :global(* + *) {
      border-top: 1px solid var(--color-border);
    }
  }
</style>

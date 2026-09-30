<script>
  let { children, loading = false, header, toolbar } = $props();
</script>

<div class="container svelte">
  <div class="wrapper">
    <header class="header">
      {@render header?.()}
    </header>
    <main>
      {#if loading}
        <div class="loading">
          <div class="spinner"></div>
          <p>Waiting for data...</p>
        </div>
      {:else}
        <div class="content">
          {@render children?.()}
        </div>
      {/if}
    </main>
  </div>
  {#if toolbar}
    <div class="toolbar">
      {@render toolbar?.()}
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    display: grid;
    grid-template-rows: 1fr auto;
    height: 100%;

    color: var(--color-text);
    background-color: var(--color-bg);
  }

  .wrapper {
    display: grid;
    grid-template-rows: auto 1fr;
    overflow-y: auto;
    /* Setting only overflow-y forces overflow-x to compute as "auto" too
       (that's the CSS spec's rule for mismatched axes) - without this,
       .wrapper silently becomes a horizontal scroll container for the
       *whole* tab body (header included) whenever anything inside main
       is wide, instead of staying vertical-only as intended. */
    overflow-x: hidden;
  }

  .content {
    margin: 0 var(--section-gap) var(--section-gap);
  }

  main {
    /* A grid item with the default overflow:visible sizes itself to fit
       its widest descendant (e.g. a tab's wide table), which inflates
       main - and drags .wrapper/.container along with it - instead of
       letting that descendant's own overflow-x:auto box scroll locally.
       min-width: 0 lets main shrink to the space it's actually given. */
    min-width: 0;
  }

  .header {
    /* Sticky so the tab title/controls stay put while the (often long)
       body scrolls underneath - the header lives inside .wrapper, which
       is the scroll container, so this costs nothing structurally. */
    position: sticky;
    top: 0;
    z-index: 20;
    padding: 10px var(--section-gap);
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    border-bottom: 1px solid var(--color-border-soft);

    color: var(--color-text);
    background-color: var(--color-surface);

    :global(html[data-theme="light"]) & {
      box-shadow: var(--shadow-xs);
    }

    :global(html[data-theme="dark"]) & {
      border-bottom-color: var(--color-neutral-800);
    }
  }

  /* The one bit of brand colour in the tab chrome: a hairline accent rule
     under the header instead of the old full-weight red border, which
     read as a warning stripe rather than as structure. */
  .header::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: linear-gradient(
      90deg,
      var(--color-accent-500),
      transparent 55%
    );
    pointer-events: none;
  }

  .loading {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .loading p {
    color: var(--color-text-muted);
  }

  .spinner {
    margin: 12px;
    height: 64px;
    width: 64px;
    background-image: url("/images/loading-spin.svg");
    background-repeat: no-repeat;
    background-position: center center;
  }

  .toolbar {
    display: flex;
    /* Wrap instead of forcing every toolbar button into one row: on wide
       screens there's always enough room so nothing wraps, but tabs with
       several buttons (e.g. firmware flasher) would otherwise get squeezed
       below their readable width - or push the whole page into horizontal
       scroll - on narrow/mobile viewports. */
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
    justify-content: end;
    bottom: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    z-index: 1000;

    :global(html[data-theme="light"]) & {
      background: var(--color-surface);
      border-top: 1px solid var(--color-border-soft);
      box-shadow: 0 -2px 10px -4px var(--color-shadow);
    }

    :global(html[data-theme="dark"]) & {
      background: var(--color-surface);
      border-top: 1px solid var(--color-neutral-800);
    }
  }

  @media only screen and (max-width: 480px) {
    .content {
      margin: 0;
    }

    .header {
      margin-bottom: 8px;
    }

    .toolbar {
      justify-content: center;
    }
  }
</style>

<script>
  let { children, loading = false, header, toolbar } = $props();
</script>

<div class="container">
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
    display: content;
  }

  .content {
    margin: 0 var(--section-gap) var(--section-gap);
    border-top-left-radius: 32px;
  }

  .header {
    padding: 8px var(--section-gap);
    display: flex;
    gap: 8px;
    align-items: center;
    border-bottom: 1px solid var(--color-border-accent);

    color: var(--color-text-soft);
    background-color: var(--color-surface);

    :global(html[data-theme="light"]) & {
      box-shadow: 0 2px 8px -4px var(--color-shadow);
    }
  }

  .loading {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
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
      border-top: 1px solid var(--color-border);
      box-shadow: 0 -2px 8px -2px var(--color-shadow);
    }

    :global(html[data-theme="dark"]) & {
      background: var(--color-neutral-700);
      border-top: 1px solid var(--color-neutral-500);
    }
  }

  @media only screen and (max-width: 480px) {
    .content {
      margin: 0;
    }

    .header {
      margin-bottom: 8px;
    }
  }
</style>

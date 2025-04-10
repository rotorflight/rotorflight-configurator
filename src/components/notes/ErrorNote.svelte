<script>
  import { i18n } from "@/js/i18n.js";
  let { children, message } = $props();
</script>

<div class="container">
  <div class="header">
    <div class="fas fa-times-circle"></div>
    <b>{$i18n.t("errorTitle")}</b>
  </div>
  <div>
    {#if children}
      {@render children()}
    {:else if typeof message === "string"}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t(message)}
    {/if}
  </div>
</div>

<style lang="scss">
  .container {
    border-radius: 2px;
    padding: 8px 16px;
    margin: 0 4px;

    :global(html[data-theme="light"]) & {
      color: var(--color-red-900);
      background: var(--color-red-100);
      border: 1px solid var(--color-red-200);
      font-weight: 600;
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-red-500);
      background: var(--color-neutral-800);
      border-left: 3px solid var(--color-red-500);

      background-color: hsl(160, 2%, 15%);
    }
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
</style>

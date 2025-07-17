<script>
  import { i18n } from "@/js/i18n.js";
  let { children, message } = $props();
</script>

<div class="container">
  <div class="header">
    <div class="fas fa-sticky-note"></div>
    <b>{$i18n.t("noteTitle")}</b>
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
    margin: 4px;

    :global(html[data-theme="light"]) & {
      color: hsl(205, 60%, 25%);
      background: hsl(205, 80%, 95%);
      border: 1px solid hsl(205, 60%, 25%);
      font-weight: 600;
    }

    :global(html[data-theme="dark"]) & {
      color: hsl(210, 90%, 70%);
      background: var(--color-neutral-800);
      border-left: 3px solid hsl(200, 90%, 70%);
    }
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
</style>

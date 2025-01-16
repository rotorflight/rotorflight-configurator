<script>
  import { i18n } from "@/js/i18n.js";
  let { children } = $props();
</script>

<div class="container">
  <div class="header">
    <div class="fas fa-exclamation-triangle"></div>
    <b>{$i18n.t("warningTitle")}</b>
  </div>
  <div>
    {@render children?.()}
  </div>
</div>

<style lang="scss">
  .container {
    border-radius: 2px;
    padding: 8px 16px;
    margin: 8px 0;

    :global(html[data-theme="light"]) & {
      color: var(--color-yellow-900);
      background: var(--color-yellow-100);
      border: 1px solid var(--color-yellow-900);
      font-weight: 600;
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-yellow-500);
      background: var(--color-neutral-800);
      border-left: 3px solid var(--color-yellow-500);
    }
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
</style>

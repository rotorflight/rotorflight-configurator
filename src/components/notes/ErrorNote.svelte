<script>
  import { i18n } from "@/js/i18n.js";
  let { children } = $props();
</script>

<div class="container">
  <div class="icon fas fa-times-circle"></div>
  <div>
    <b>{$i18n.t("errorTitle")}: </b>
    <span>
      {@render children?.()}
    </span>
  </div>
</div>

<style lang="scss">
  .container {
    display: grid;
    grid-template-columns: 32px 1fr;
    align-items: start;
    border-radius: 2px;
    padding: 8px 8px 8px 0;
    margin: 8px 0;

    .icon {
      margin: 4px auto;

      :global(html[data-theme="light"]) & {
        color: var(--color-red-900);
      }
    }

    :global(html[data-theme="light"]) & {
      color: var(--color-red-900);
      background: var(--color-red-100);
      border: 1px solid var(--color-red-900);
      font-weight: 600;
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-red-500);
      background: var(--color-neutral-800);
      border-left: 3px solid var(--color-red-500);
    }
  }
</style>

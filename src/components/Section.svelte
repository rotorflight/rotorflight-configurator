<script>
  import { i18n } from "@/js/i18n.js";

  let { children, label } = $props();
</script>

<div class="container">
  <div class="header">
    {$i18n.t(label)}
  </div>
  <div class="content">
    {@render children?.()}
  </div>
</div>

<style lang="scss">
  .header {
    font-size: 1rem;
    font-weight: 600;
    font-weight: 600;
    border-bottom-width: 2px;
    border-style: solid;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-900);
      border-bottom-color: var(--color-neutral-300);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-100);
      border-bottom-color: var(--color-neutral-600);
    }
  }
</style>

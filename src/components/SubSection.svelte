<script>
  import { i18n } from "@/js/i18n.js";

  let { children, label } = $props();
</script>

<div class="container">
  {#if label}
    <div class="header">
      {$i18n.t(label)}
    </div>
  {/if}
  <div class="content">{@render children?.()}</div>
</div>

<style lang="scss">
  .container {
    margin-top: 8px;
  }

  .header {
    font-weight: 900;
    padding: 4px 4px;
  }

  @media only screen and (max-width: 480px) {
    .content > :global(*) + :global(*) {
      border-top: 1px solid var(--color-neutral-600);
    }

    .header {
      font-weight: 900;
      padding: 4px 0;
    }
  }
</style>

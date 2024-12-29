<script>
  import { i18n } from "@/js/i18n.js";

  const { help, attrs } = $props();
</script>

<div class="container">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html $i18n.t(help)}
  {#if attrs}
    <div class="attrs">
      {#each attrs as attr}
        <p><b>{attr.name}:</b> {attr.value}</p>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .container {
    font-size: 0.8rem;
  }

  .attrs {
    margin-top: 8px;
    font-size: 0.8rem;
  }
</style>

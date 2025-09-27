<script>
  import { i18n } from "@/js/i18n.js";

  const { help, attrs } = $props();
</script>

<div class="container">
  {#if help}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <span class="message">{@html $i18n.t(help)}</span>
  {/if}
  {#if attrs}
    <table class="attrs">
      {#each attrs as attr (attr.name)}
        <tr>
          <th>{$i18n.t(attr.name)}</th><td>{attr.value}</td>
        </tr>
      {/each}
    </table>
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 8px;
    font-size: 0.8rem;
  }

  .attrs {
    font-size: 0.8rem;
  }

  th {
    text-align: left;
    font-weight: 600;
    padding-right: 8px;
  }

  .message {
    :global(p) + :global(p) {
      margin-top: 6px;
    }

    :global(code) {
      background: none;
      padding: 0;
      margin: 0;
    }
  }
</style>

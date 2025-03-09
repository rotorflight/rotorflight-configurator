<script>
  import Switch from "@/components/Switch.svelte";

  let { enabled = $bindable(), children } = $props();
</script>

<div class="container">
  <div class="toggle">
    <Switch bind:checked={enabled} />
  </div>
  <div class="content">
    {@render children?.()}
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    gap: 8px;
  }

  .toggle {
    display: flex;
    align-items: center;
    height: 2rem;
    margin-left: 4px;
  }

  .content {
    width: 100%;
  }

  @media only screen and (max-width: 480px) {
    .toggle {
      height: 3rem;
    }
  }
</style>

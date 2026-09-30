<script>
  import Select from "@/components/Select.svelte";

  let { item, modeId, linkOptions, showLogic, logicOptions, onEdit, onDelete } =
    $props();
</script>

<div class="row">
  <div class="link-info">
    <select bind:value={item.linkedTo} onchange={onEdit}>
      {#each linkOptions as option (option.value)}
        <option value={option.value} disabled={option.value === modeId}>
          {option.label}
        </option>
      {/each}
    </select>
    {#if showLogic}
      <Select
        bind:value={item.logic}
        options={logicOptions}
        onchange={onEdit}
      />
    {/if}
  </div>

  <button class="delete" onclick={onDelete} aria-label="Delete">
    <span class="fas fa-times"></span>
  </button>
</div>

<style lang="scss">
  .row {
    position: relative;
    display: flex;
    align-items: center;
    padding: 12px 32px 12px 8px;
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  .link-info {
    display: flex;
    gap: 8px;

    select {
      min-width: 160px;
    }
  }

  .delete {
    position: absolute;
    top: 8px;
    right: 6px;
    background: none;
    border: none;
    padding: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text-soft);

    @media (hover: hover) {
      &:hover {
        color: var(--color-text);
      }
    }
  }
</style>

<script>
  import GroupCard from "@/components/GroupCard.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";

  import { getModeDescription, getModeDisplayName } from "@/js/FlightMode.js";
  import { i18n } from "@/js/i18n.js";

  import LinkRow from "./LinkRow.svelte";
  import RangeRow from "./RangeRow.svelte";

  let {
    modeId,
    modeName,
    items,
    isOn,
    channelOptions,
    logicOptions,
    linkOptions,
    onAddRange,
    onAddLink,
    onDeleteItem,
    onRemove,
    onEdit,
  } = $props();

  let displayName = $derived(getModeDisplayName(modeName));
  let description = $derived(getModeDescription(modeName));
</script>

{#snippet header()}
  <span class="title">{displayName}</span>
  {#if description}
    <HelpIcon>{description}</HelpIcon>
  {/if}
  <div class="grow"></div>
  <button class="add" onclick={onAddRange}>
    {$i18n.t("auxiliaryAddRange")}
  </button>
  {#if modeId !== 0}
    <button class="add" onclick={onAddLink}>
      {$i18n.t("auxiliaryAddLink")}
    </button>
  {/if}
  {#if onRemove}
    <button
      class="remove"
      onclick={onRemove}
      aria-label={$i18n.t("auxiliaryRemoveMode")}
      title={$i18n.t("auxiliaryRemoveMode")}
    >
      <span class="fas fa-trash"></span>
    </button>
  {/if}
{/snippet}

<GroupCard live={isOn} {header}>
  {#if items.length > 0}
    {#each items as item, index (item)}
      {#if item.type === "range"}
        <RangeRow
          {item}
          showLogic={index > 0}
          {channelOptions}
          {logicOptions}
          {onEdit}
          onDelete={() => onDeleteItem(item)}
        />
      {:else}
        <LinkRow
          {item}
          {modeId}
          {linkOptions}
          showLogic={index > 0}
          {logicOptions}
          {onEdit}
          onDelete={() => onDeleteItem(item)}
        />
      {/if}
    {/each}
  {:else}
    <p class="empty">{$i18n.t("auxiliaryModeEmpty")}</p>
  {/if}
</GroupCard>

<style lang="scss">
  .title {
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .add {
    @extend %button;
    height: 22px;
    line-height: 22px;
    font-size: 0.7rem;
    margin-left: 6px;
  }

  .remove {
    background: none;
    border: none;
    padding: 4px 4px 4px 10px;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--color-text-soft);

    @media (hover: hover) {
      &:hover {
        color: var(--color-text);
      }
    }
  }

  .empty {
    margin: 0;
    padding: 12px 12px 18px;
    font-size: 0.8rem;
    font-style: italic;
    color: var(--color-text-soft);
  }
</style>

<script>
  import HelpIcon from "@/components/HelpIcon.svelte";
  import Section from "@/components/Section.svelte";

  import { getModeDescription, getModeDisplayName } from "@/js/FlightMode.js";
  import { i18n } from "@/js/i18n.js";

  import LinkRow from "./LinkRow.svelte";
  import RangeRow from "./RangeRow.svelte";

  let {
    modeId,
    modeName,
    items,
    hidden,
    isOn,
    channelOptions,
    logicOptions,
    linkOptions,
    onAddRange,
    onAddLink,
    onDeleteItem,
    onEdit,
  } = $props();

  let displayName = $derived(getModeDisplayName(modeName));
  let description = $derived(getModeDescription(modeName));
</script>

{#snippet header()}
  <div class="header" class:on={isOn} class:off={!isOn}>
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
  </div>
{/snippet}

{#if !hidden}
  <div class="mode-card">
    <Section {header}>
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
    </Section>
  </div>
{/if}

<style lang="scss">
  .mode-card {
    margin-top: var(--section-gap);
  }

  .header {
    @extend %section-header;
    padding-right: 8px;

    &.on {
      color: var(--color-text-alt);
      background-color: var(--color-accent-500);
    }

    &.off {
      /* surface-alt is a dark band in both themes -- text-alt is the token
         for text on it, giving near-white text here instead of the default
         header-fg color, which is tuned for the light header band and reads
         low-contrast on this darker one. */
      color: var(--color-text-alt);
      background-color: var(--color-surface-alt);
    }
  }

  .title {
    padding-left: 8px;
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

  .empty {
    margin: 0;
    padding: 12px 12px 18px;
    font-size: 0.8rem;
    font-style: italic;
    color: var(--color-text-soft);
  }
</style>

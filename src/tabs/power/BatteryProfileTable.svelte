<script>
  import HelpIcon from "@/components/HelpIcon.svelte";
  import NumberInput from "@/components/NumberInput.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  let { onActivate } = $props();

  const PROFILE_COUNT = 6;

  const VOLTAGE_COLUMNS = [
    ["vbatmaxcellvoltages", "powerBatteryProfileMaximumCellVoltage"],
    ["vbatfullcellvoltages", "powerBatteryProfileFullCellVoltage"],
    ["vbatwarningcellvoltages", "powerBatteryProfileWarningCellVoltage"],
    ["vbatmincellvoltages", "powerBatteryProfileMinimumCellVoltage"],
  ];

  /* Same grid approach as ServoConfigTable: no sub-pixel row drift. */
  const gridColumns = "96px repeat(6, minmax(124px, 1fr))";
</script>

<div class="scroll">
  <div class="battery-profiles">
    <div class="header-row" style="grid-template-columns: {gridColumns}">
      <span></span>
      <span>{$i18n.t("powerBatteryProfileCapacity")}</span>
      <span class="header-label-flex">
        <span>{$i18n.t("powerBatteryProfileCellCount")}</span>
        <HelpIcon>{$i18n.t("powerBatteryProfileCellCountHelp")}</HelpIcon>
      </span>
      {#each VOLTAGE_COLUMNS as [, label] (label)}
        <span>{$i18n.t(label)}</span>
      {/each}
    </div>

    {#each Array.from({ length: PROFILE_COUNT }) as _, i (i)}
      <div
        class={[
          "profile-row",
          i === FC.BATTERY_STATE.batteryProfile && "active",
        ]}
        style="grid-template-columns: {gridColumns}"
      >
        <button
          type="button"
          class="profile-activate"
          onclick={() => onActivate(i)}
        >
          {$i18n.t("powerBatteryProfile", { 1: i + 1 })}
        </button>
        <NumberInput
          id={`power-profile-capacity-${i}`}
          bind:value={FC.BATTERY_CONFIG.capacities[i]}
          min={0}
          max={40000}
          step={10}
        />
        <NumberInput
          id={`power-profile-cells-${i}`}
          bind:value={FC.BATTERY_CONFIG.cellCounts[i]}
          min={0}
          max={24}
          step={1}
        />
        {#each VOLTAGE_COLUMNS as [field] (field)}
          <NumberInput
            id={`power-profile-${field}-${i}`}
            bind:value={FC.BATTERY_CONFIG[field][i]}
            min={1}
            max={5}
            step={0.01}
          />
        {/each}
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .scroll {
    overflow-x: auto;
  }

  .battery-profiles {
    min-width: max-content;
    margin-top: 2px;
  }

  .header-row,
  .profile-row {
    display: grid;
    align-items: center;
    column-gap: 4px;
  }

  .header-row {
    padding: 4px;
    font-weight: 600;
    font-size: 0.75rem;
    text-align: center;

    color: var(--color-text-soft);
    background-color: var(--color-surface-float, var(--color-surface));
    border-bottom: 1px solid var(--color-border);
  }

  .header-label-flex {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    line-height: 1.2;
  }

  .header-label-flex :global(.container) {
    margin-left: 2px;
  }

  .profile-row {
    justify-items: center;
    padding: 4px;
    font-variant-numeric: tabular-nums;
    border-bottom: 1px solid var(--color-border);
  }

  .profile-activate {
    @extend %button;
    justify-self: stretch;
    padding: 4px 8px;
    font-size: 0.75rem;
    text-align: left;
  }

  .profile-row.active .profile-activate {
    color: var(--color-accent-fg);
    background-color: var(--color-accent-500);
  }
</style>

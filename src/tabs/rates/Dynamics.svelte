<script>
  import HelpIcon from "@/components/HelpIcon.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";

  import { i18n } from "@/js/i18n.js";

  let { dyn = $bindable(), hasBoost } = $props();

  const AXES = [
    { key: "roll", label: "axisROLL" },
    { key: "pitch", label: "axisPITCH" },
    { key: "yaw", label: "axisYAW" },
    { key: "collective", label: "axisCOLLECTIVE" },
  ];
</script>

<Section label="rateSetupDynamic">
  <div class="dynamics">
    <div class="grid">
      <span></span>
      {#each AXES as axis (axis.key)}
        <span class={["axis", axis.key]}>{$i18n.t(axis.label)}</span>
      {/each}

      <span class="row-label">
        {$i18n.t("rateSetupResponse")}
        <HelpIcon>{$i18n.t("rateSetupResponseHelp")}</HelpIcon>
      </span>
      {#each AXES as axis (axis.key)}
        <NumberInput
          min={0}
          max={250}
          step={1}
          bind:value={dyn[`${axis.key}_response_time`]}
        />
      {/each}

      {#if hasBoost}
        <span class="row-label">
          {$i18n.t("rateSetpointBoostGain")}
          <HelpIcon>{$i18n.t("rateSetpointBoostGainHelp")}</HelpIcon>
        </span>
        {#each AXES as axis (axis.key)}
          <NumberInput
            min={0}
            max={250}
            step={1}
            bind:value={dyn[`${axis.key}_setpoint_boost_gain`]}
          />
        {/each}

        <span class="row-label">{$i18n.t("rateSetpointBoostCutoff")}</span>
        {#each AXES as axis (axis.key)}
          <NumberInput
            min={0}
            max={250}
            step={1}
            bind:value={dyn[`${axis.key}_setpoint_boost_cutoff`]}
          />
        {/each}
      {/if}
    </div>

    {#if hasBoost}
      <div class="yaw">
        <span class="row-label">
          {$i18n.t("rateYawDynamicCeilingGain")}
          <HelpIcon>{$i18n.t("rateYawDynamicCeilingGainHelp")}</HelpIcon>
        </span>
        <NumberInput
          min={0}
          max={250}
          step={1}
          bind:value={dyn.yaw_dynamic_ceiling_gain}
        />
        <span class="row-label">
          {$i18n.t("rateYawDynamicDeadbandGain")}
          <HelpIcon>{$i18n.t("rateYawDynamicDeadbandGainHelp")}</HelpIcon>
        </span>
        <NumberInput
          min={0}
          max={250}
          step={1}
          bind:value={dyn.yaw_dynamic_deadband_gain}
        />
        <span class="row-label">{$i18n.t("rateYawDynamicDeadbandFilter")}</span>
        <NumberInput
          min={0}
          max={25}
          step={0.1}
          bind:value={dyn.yaw_dynamic_deadband_filter}
        />
      </div>
    {/if}
  </div>
</Section>

<style lang="scss">
  .dynamics {
    container-type: inline-size;
    overflow-x: auto;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) repeat(4, minmax(92px, 110px));
    align-items: center;
    gap: 6px 8px;
    padding: 4px 8px 8px;
  }

  .axis {
    font-weight: 600;
    text-align: center;
    font-size: 0.8rem;

    &.roll {
      color: var(--color-roll);
    }

    &.pitch {
      color: var(--color-pitch);
    }

    &.yaw {
      color: var(--color-yaw);
    }

    &.collective {
      color: var(--color-collective);
    }
  }

  .row-label {
    display: inline-flex;
    align-items: center;
    font-size: 0.8rem;
  }

  .yaw {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) 110px;
    align-items: center;
    gap: 6px 8px;
    padding: 8px;
    border-top: 1px solid var(--color-border-soft);
  }

  /* Four axis columns of inputs need about 540px; below that, let the
     label column wrap and tighten the inputs. Below about 390px the
     wrapper scrolls rather than crush the inputs further. */
  @container (max-width: 540px) {
    .grid {
      grid-template-columns: minmax(64px, 1fr) repeat(4, minmax(72px, 110px));
      gap: 6px 4px;
      @include mixins.compact-number-input;
    }

    .yaw {
      grid-template-columns: minmax(64px, 1fr) minmax(80px, 110px);
      @include mixins.compact-number-input;
    }
  }
</style>

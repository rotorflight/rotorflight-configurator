<script>
  import semver from "semver";
  import { onMount } from "svelte";
  import diff from "microdiff";
  import { i18n } from "@/js/i18n.js";
  import Switch from "@/components/Switch.svelte";
  import { FC } from "@/js/fc.svelte.js";
  import CustomNotches from "./CustomNotches.svelte";
  import HoverTooltip from "@/components/HoverTooltip.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import {
    parseRpmFilterConfig1,
    parseRpmFilterConfig2,
    generateRpmFilterConfig1,
    generateRpmFilterConfig2,
  } from "./filter_config.js";

  const filterStrengths = ["Custom", "Low", "Normal", "High"];

  const { onRpmSettingsUpdate, onRpmNotchUpdate } = $props();

  let notches = $state(null);
  let enabled = $derived(FC.FEATURE_CONFIG.features.RPM_FILTER);
  let custom = $derived.by(() => {
    if (semver.gte(FC.CONFIG.buildVersion, FW_VERSION_4_5_0)) {
      return enabled && FC.FILTER_CONFIG.rpm_preset === 0;
    }

    return enabled;
  });

  let initialState;
  let initialNotchState;

  function parseNotches() {
    if (semver.gte(FC.CONFIG.buildVersion, FW_VERSION_4_5_0)) {
      notches = parseRpmFilterConfig2($state.snapshot(FC.RPM_FILTER_CONFIG_V2));
    } else {
      notches = parseRpmFilterConfig1($state.snapshot(FC.RPM_FILTER_CONFIG));
    }
  }

  onMount(() => {
    parseNotches();
    initialNotchState = $state.snapshot(notches);
    initialState = $state.snapshot({
      config: FC.FILTER_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  });

  $effect(() => {
    if (!notches) {
      return;
    }

    const currentState = $state.snapshot(notches);
    if (currentState) {
      const changed = diff(initialNotchState, currentState).length > 0;
      onRpmNotchUpdate(changed);
    }

    if (semver.gte(FC.CONFIG.buildVersion, FW_VERSION_4_5_0)) {
      FC.RPM_FILTER_CONFIG_V2 = generateRpmFilterConfig2(notches);
    } else {
      FC.RPM_FILTER_CONFIG = generateRpmFilterConfig1(notches);
    }
  });

  $effect(() => {
    onRpmSettingsUpdate(
      diff(initialState, {
        config: FC.FILTER_CONFIG,
        features: FC.FEATURE_CONFIG.features.bitfield,
      }).length > 0,
    );
  });

  function onResetNotches() {
    FC.RPM_FILTER_CONFIG = [];
    FC.RPM_FILTER_CONFIG_V2 = [{}, {}, {}];
    parseNotches();
  }
</script>

<div class="container">
  <div class="header">RPM Filter</div>
  <div class="settings">
    <WarningNote>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("gyroRpmFilterConfigNote")}
    </WarningNote>

    <div class="row">
      <label>
        <span>Enable</span>
        <Switch bind:checked={FC.FEATURE_CONFIG.features.RPM_FILTER} />
      </label>
    </div>

    {#if enabled}
      {#if semver.gte(FC.CONFIG.buildVersion, FW_VERSION_4_5_0)}
        <div class="row">
          <label>
            <span>Strength</span>
            <HoverTooltip>
              {#snippet tooltip()}
                <Tooltip
                  help="some help message about the filter strength options"
                />
              {/snippet}
              <select bind:value={FC.FILTER_CONFIG.rpm_preset}>
                {#each filterStrengths as strength, index}
                  <option value={index}>{strength}</option>
                {/each}
              </select>
            </HoverTooltip>
          </label>
        </div>
        <div class="row">
          <label>
            <span>Minimum Frequency (Hz)</span>
            <HoverTooltip>
              {#snippet tooltip()}
                <Tooltip
                  help="some help message about minimum hz"
                  attrs={[{ name: "Default", value: "20Hz" }]}
                />
              {/snippet}
              <input
                type="number"
                min="0"
                bind:value={FC.FILTER_CONFIG.rpm_min_hz}
              />
            </HoverTooltip>
          </label>
        </div>
      {:else if notches}
        <div class="group-heading">
          <span>{$i18n.t("gyroRpmFilterMinRPMGroup")}</span>
          <HelpIcon>
            <Tooltip help="gyroRpmFilterMinRPMGroupHelp" />
          </HelpIcon>
        </div>
        <div class="row">
          <label>
            <span>{$i18n.t("gyroRpmFilterMainRotorMinRPM")}</span>
            <input type="number" min="0" bind:value={notches.rpmLimitMain} />
          </label>
        </div>
        <div class="row">
          <label>
            <span>{$i18n.t("gyroRpmFilterTailRotorMinRPM")}</span>
            <input type="number" min="0" bind:value={notches.rpmLimitTail} />
          </label>
        </div>
      {/if}
    {/if}
  </div>
</div>

{#if custom}
  <div class="notch-container">
    <CustomNotches {FC} {onResetNotches} bind:notches />
  </div>
{/if}

<style lang="scss">
  .notch-container {
    float: left;
    width: 100%;
  }

  .container {
    margin-bottom: 1rem;
    width: 100%;
    float: left;
  }

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

  .row {
    display: flex;
    align-items: center;
    min-height: 2rem;

    label {
      display: flex;
      flex-grow: 1;
      align-items: center;
      padding: 4px 0;

      :global(> *:first-child) {
        flex-grow: 1;
      }
    }
  }

  .group-heading {
    display: flex;
    font-weight: 600;
    grid-column: 1 / -1;
    margin-top: 8px;
  }

  @media only screen and (max-width: 480px) {
    .row {
      height: 3rem;
    }

    .row + .row {
      border-top-width: 1px;
      border-top-style: solid;

      :global(html[data-theme="light"]) & {
        border-top-color: var(--color-neutral-400);
      }

      :global(html[data-theme="dark"]) & {
        border-top-color: var(--color-neutral-700);
      }
    }
  }
</style>

<script>
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import SensorsUnorderedList from "./SensorsUnorderedList.svelte";
  import SensorsBitfield from "./SensorsBitfield.svelte";
  import SensorsOrderedList from "./SensorsOrderedList/SensorsOrderedList.svelte";
  import { TelemetryType } from "../protocols.js";

  let { telemetry } = $props();

  let view = $state(1);
</script>

<Section>
  {#snippet header()}
    <div class="header">
      <span class="title">{$i18n.t("receiverTelemetrySensors")}</span>
      {#if telemetry.type === TelemetryType.ORDERED_LIST}
        <div class="grow"></div>
        <div class="button-group">
          <div class="slider" style:left={`${view * 50}%`}></div>
          <button class={{ active: view === 0 }} onclick={() => (view = 0)}>
            {$i18n.t("receiverTelemetrySensorsSort")}
          </button>
          <button class={{ active: view === 1 }} onclick={() => (view = 1)}>
            {$i18n.t("receiverTelemetrySensorsSelect")}
          </button>
        </div>
      {/if}
    </div>
  {/snippet}
  <SubSection>
    {#if telemetry.type === TelemetryType.ORDERED_LIST}
      <SensorsOrderedList
        sensors={telemetry.sensors}
        bind:value={FC.TELEMETRY_CONFIG.telemetry_sensors_list}
        {view}
      />
    {:else if telemetry.type === TelemetryType.UNORDERED_LIST}
      <SensorsUnorderedList
        sensors={telemetry.sensors}
        bind:value={FC.TELEMETRY_CONFIG.telemetry_sensors_list}
      />
    {:else if telemetry.type === TelemetryType.BITFIELD}
      <SensorsBitfield
        mask={telemetry.mask}
        bind:value={FC.TELEMETRY_CONFIG.telemetry_sensors}
      />
    {/if}
  </SubSection>
</Section>

<style lang="scss">
  .header {
    @extend %section-header;
  }

  .button-group {
    position: relative;
    display: flex;
    transition: var(--animation-speed);
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    align-self: stretch;

    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-400);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-600);
    }

    & > :first-child {
      border-top-left-radius: 4px;
    }

    & > :last-child {
      border-top-right-radius: 4px;
    }

    .slider {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 50%;
      border-radius: 4px 4px 0 0;
      z-index: 0;
      transition: left 0.3s ease;

      :global(html[data-theme="light"]) & {
        background-color: var(--color-accent-500);
      }

      :global(html[data-theme="dark"]) & {
        background-color: var(--color-accent-300);
      }
    }

    button {
      border: none;
      border-radius: 0;
      padding: 8px;
      width: 80px;
      text-align: center;
      font-size: 0.8rem;
      font-weight: 600;
      transition: var(--animation-speed);

      position: relative;
      flex: 1;
      background: transparent;
      border: none;
      z-index: 1;
      cursor: pointer;

      :global(html[data-theme="light"]) & {
        color: var(--color-neutral-700);
      }

      :global(html[data-theme="dark"]) & {
        color: var(--color-neutral-300);
      }

      &.active {
        :global(html[data-theme="light"]) & {
          color: var(--color-neutral-800);
        }

        :global(html[data-theme="dark"]) & {
          color: var(--color-neutral-100);
        }
      }
    }
  }

  .title {
    padding-left: 8px;
  }

  .grow {
    flex-grow: 1;
  }
</style>

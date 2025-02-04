<script>
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import SensorsOrderedList from "./SensorsOrderedList.svelte";
  import SensorsUnorderedList from "./SensorsUnorderedList.svelte";
  import SensorsBitfield from "./SensorsBitfield.svelte";
  import { TelemetryType } from "../protocols.js";

  let { FC = $bindable(), telemetry } = $props();
</script>

<Section label="receiverTelemetrySensors">
  <SubSection>
    {#if telemetry.type === TelemetryType.ORDERED_LIST}
      <SensorsOrderedList
        sensors={telemetry.sensors}
        bind:value={FC.TELEMETRY_CONFIG.telemetry_sensors_list}
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
</style>

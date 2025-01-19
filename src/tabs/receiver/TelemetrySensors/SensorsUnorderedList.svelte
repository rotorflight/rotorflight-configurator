<script>
  import Switch from "@/components/Switch.svelte";
  import Field from "@/components/Field.svelte";
  import { TELEMETRY_SENSORS } from "../telemetry/sensors.js";

  let { value = $bindable([]), sensors } = $props();

  let selected = $derived(value.filter((x) => x > 0));
</script>

{#each sensors as group}
  {#if group.title}{/if}
  {#each group.sensors as sensor}
    <Field
      id={`telemetry-sensor-${sensor.name}`}
      label={`receiverTelemetrySensor_${sensor.name}`}
    >
      <Switch
        id={`telemetry-sensor-${sensor.name}`}
        bind:checked={
          () => value.includes(TELEMETRY_SENSORS[sensor.name]),
          (v) => {
            const sensorId = TELEMETRY_SENSORS[sensor.name];
            if (v) {
              value = [...selected, sensorId];
            } else {
              const index = selected.indexOf(sensorId);
              value = [
                ...selected.slice(0, index),
                ...selected.slice(index + 1),
              ];
            }
          }
        }
      />
    </Field>
  {/each}
{/each}

<style lang="scss">
</style>

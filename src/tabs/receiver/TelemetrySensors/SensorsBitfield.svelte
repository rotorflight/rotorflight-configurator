<script>
  import Switch from "@/components/Switch.svelte";
  import Field from "@/components/Field.svelte";

  let { value = $bindable(), mask } = $props();

  const sensors = [
    { name: "MODE", id: 3 },
    { name: "VOLTAGE", id: 0 },
    { name: "CURRENT", id: 1 },
    { name: "FUEL_LEVEL", id: 2 },
    { name: "USED_CAPACITY", id: 20 },
    { name: "BEC_VOLTAGE", id: 26 },
    { name: "HEADSPEED", id: 27 },
    { name: "TAILSPEED", id: 28 },
    { name: "TEMPERATURE", id: 19 },
    { name: "PITCH", id: 7 },
    { name: "ROLL", id: 8 },
    { name: "HEADING", id: 9 },
    { name: "ACC_X", id: 4 },
    { name: "ACC_Y", id: 5 },
    { name: "ACC_Z", id: 6 },
    { name: "ALTITUDE", id: 10 },
    { name: "VARIO", id: 11 },
    { name: "LAT_LONG", id: 12 },
    { name: "GROUND_SPEED", id: 13 },
    { name: "DISTANCE", id: 14 },
    { name: "ESC_CURRENT", id: 15 },
    { name: "ESC_VOLTAGE", id: 16 },
    { name: "ESC_RPM", id: 17 },
    { name: "ESC_TEMPERATURE", id: 18 },
    { name: "ADJUSTMENT", id: 21 },
    { name: "GOV_MODE", id: 22 },
    { name: "ARMING_FLAGS", id: 30 },
    { name: "PID_PROFILE", id: 24 },
    { name: "RATES_PROFILE", id: 25 },
    { name: "THROTTLE_CONTROL", id: 29 },
    { name: "MODEL_ID", id: 23 },
  ];
</script>

{#each sensors as sensor}
  {#if bit_check(mask, sensor.id)}
    <Field
      id={`telemetry-sensor-${sensor.name}`}
      label={`receiverTelemetrySensor_${sensor.name}`}
    >
      <Switch
        id={`telemetry-sensor-${sensor.name}`}
        bind:checked={
          () => bit_check(value, sensor.id),
          (v) => {
            value = (v ? bit_set : bit_clear)(value, sensor.id);
          }
        }
      />
    </Field>
  {/if}
{/each}

<style lang="scss">
</style>

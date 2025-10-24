<script>
  import { SvelteSet } from "svelte/reactivity";

  import { i18n } from "@/js/i18n.js";
  import { TELEMETRY_SENSORS } from "../../telemetry/sensors.js";
  import Field from "@/components/Field.svelte";
  import Switch from "@/components/Switch.svelte";
  import Details from "./Details.svelte";

  let { value = $bindable([]), sensors } = $props();

  let lookup = $derived.by(() => {
    const s = new SvelteSet();
    for (const item of value) {
      if (item.value !== 0) {
        s.add(item.value);
      }
    }

    return s;
  });

  let options = $derived.by(() => {
    let count = 0;
    const options = [];
    for (const group of sensors) {
      const optGroup = { title: group.title, sensors: [], count: 0 };

      for (const sensor of group.sensors) {
        const escNum = sensor.name.match(/^ESC(\d)/);
        const id = TELEMETRY_SENSORS[sensor.name];
        const enabled = lookup.has(id);
        optGroup.sensors.push({
          id,
          name: escNum ? sensor.name.replace(/^ESC\d/, "ESC") : sensor.name,
          esc: escNum && escNum[1],
          conflicts: sensor.conflicts,
          enabled,
        });
        count++;
        if (enabled) {
          optGroup.count++;
        }
      }

      options.push(optGroup);
    }

    return { groups: options, count };
  });

  function checkConflict(sensor) {
    if (!sensor.conflicts) {
      return false;
    }

    for (const conflict of sensor.conflicts) {
      return lookup.has(TELEMETRY_SENSORS[conflict]);
    }
  }

  function toggleSensor(id, enable) {
    const newValue = $state.snapshot(value);
    if (enable) {
      newValue.push({ value: id });
    } else {
      const index = newValue.findIndex((x) => x.value === id);
      newValue.splice(index, 1);
    }

    value = newValue;
  }
</script>

<div class="content">
  {#each options.groups as optionGroup (optionGroup.title)}
    <Details>
      {#snippet summary()}
        <span class="title">
          {$i18n.t(`receiverTelemetryGroup_${optionGroup.title}`)}
        </span>
        <span class="count">
          {optionGroup.count} / {optionGroup.sensors.length}
        </span>
      {/snippet}
      <div class="switch-group">
        {#each optionGroup.sensors as sensor (sensor.id)}
          <Field
            id={`telemetry-sensor-${sensor.id}`}
            label={`receiverTelemetrySensor_${sensor.name}`}
          >
            <Switch
              id={`telemetry-sensor-${sensor.id}`}
              disabled={checkConflict(sensor)}
              bind:checked={
                () => sensor.enabled, (v) => toggleSensor(sensor.id, v)
              }
            />
          </Field>
        {/each}
      </div>
    </Details>
  {/each}
</div>

<style lang="scss">
  .title {
    flex-grow: 1;
  }

  .content {
    > :global(*) + :global(*) {
      :global(html[data-theme="light"]) & {
        border-top: 1px solid var(--color-border-soft);
      }

      :global(html[data-theme="dark"]) & {
        border-top: 1px solid var(--color-neutral-800);
      }
    }
  }

  .switch-group {
    margin-bottom: 4px;
  }

  .title,
  .count {
    color: var(--color-text-soft);
  }
</style>

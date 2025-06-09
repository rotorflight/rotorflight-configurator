<script>
  import { i18n } from "@/js/i18n.js";
  import Select from "./Select.svelte";
  import Sort from "./Sort.svelte";
  import ErrorNote from "@/components/notes/ErrorNote.svelte";

  let { value = $bindable([]), sensors, view } = $props();

  const MAX_SENSORS = 40;

  const fields = {
    get items() {
      const items = [];
      for (let i = 0; i < value.length; i++) {
        if (value[i] > 0) {
          items.push({ value: value[i] });
        }
      }

      return items;
    },
    set items(items) {
      value = items.map((x) => x.value);
    },
  };

  let totalCount = $derived(fields.items.length);
</script>

<div class="container">
  {#if totalCount > MAX_SENSORS}
    <ErrorNote>
      <span>
        {$i18n.t("receiverTelemetrySensorsExceededWarning", {
          max: MAX_SENSORS,
        })}
      </span>
      <br />
      <span class="sensor-count">{totalCount} / {MAX_SENSORS}</span>
    </ErrorNote>
  {/if}

  {#if view === 0}
    <Sort bind:value={fields.items} {sensors} />
  {:else if view === 1}
    <Select bind:value={fields.items} {sensors} />
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    gap: 8px;
  }

  .sensor-count {
    font-weight: 800;
  }
</style>

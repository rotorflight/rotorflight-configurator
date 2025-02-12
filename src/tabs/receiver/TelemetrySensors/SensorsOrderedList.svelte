<script>
  import diff from "microdiff";
  import Sortable from "sortablejs";
  import { i18n } from "@/js/i18n.js";
  import { TELEMETRY_SENSORS } from "../telemetry/sensors.js";

  let { value = $bindable([]), sensors } = $props();

  let sortable;

  const MAX_LENGTH = 40;
  const empty = new Array(MAX_LENGTH);
  for (let i = 0; i < empty.length; i++) {
    empty[i] = { ref: null, value: 0, hide: true, count: null };
  }

  let items = $state(empty);

  function updateItems(items) {
    const order = sortable.toArray().map(Number);
    const newList = new Array(MAX_LENGTH);

    for (let i = 0; i < newList.length; i++) {
      newList[i] = items[order[i]].value;
    }

    if (diff(value, newList, { cyclesFix: false }).length > 0) {
      value = newList;
    }
  }

  $effect(() => {
    // find last non-zero element;
    let last = value.length - 1;
    for (; last >= 0; last--) {
      if (value[last]) {
        break;
      }
    }

    const result = [];
    let count = 1;
    for (const s of value.slice(0, last + 1)) {
      const item = { id: s };
      if (s > 0) {
        item.count = count++;
      }

      result.push(item);
    }

    if (result.length < MAX_LENGTH) {
      result.push({ id: 0 });
    }

    const newItems = new Array(MAX_LENGTH);
    const mapping = sortable.toArray().map(Number);
    for (let i = 0; i < mapping.length; i++) {
      const sensor = result[i];
      if (!sensor) {
        newItems[mapping[i]] = {
          value: 0,
          hide: true,
          count: null,
        };
        continue;
      }

      newItems[mapping[i]] = {
        value: sensor.id,
        hide: false,
        count: sensor.count,
      };
    }

    items = newItems;
  });

  $effect(() => {
    updateItems(items);
  });

  let options = $derived.by(() => {
    const options = [];
    for (const group of sensors) {
      const optGroup = { title: group.title, sensors: [] };

      for (const sensor of group.sensors) {
        let disabled = false;
        for (const conflict of [sensor.name, ...(sensor.conflicts ?? [])]) {
          if (value.includes(TELEMETRY_SENSORS[conflict])) {
            disabled = true;
            break;
          }
        }

        const escNum = sensor.name.match(/^ESC(\d)/);
        optGroup.sensors.push({
          id: TELEMETRY_SENSORS[sensor.name],
          name: escNum ? sensor.name.replace(/^ESC\d/, "ESC") : sensor.name,
          disabled,
          esc: escNum && escNum[1],
        });
      }

      options.push(optGroup);
    }

    return options;
  });

  function makeSortable(node) {
    sortable = Sortable.create(node, {
      animation: 150,
      handle: ".handle",
      onUpdate() {
        updateItems(items);
      },
    });

    return {
      destroy: () => sortable.destroy(),
    };
  }
</script>

<ul use:makeSortable>
  {#each { length: MAX_LENGTH } as _, i (i)}
    <li class="row" class:hide={items[i].hide} data-id={i}>
      <div class="index">
        {#if items[i].count}
          {items[i].count}
        {/if}
      </div>
      <select bind:this={items[i].ref} bind:value={items[i].value}>
        <option value={0}>---</option>
        {#each options as optgroup}
          {#snippet opts()}
            {#each optgroup.sensors as sensor}
              <option
                value={sensor.id}
                disabled={sensor.disabled && sensor.id !== items[i].value}
              >
                {#if sensor.esc}
                  #{sensor.esc}
                {/if}
                {$i18n.t(`receiverTelemetrySensor_${sensor.name}`)}
              </option>
            {/each}
          {/snippet}
          {#if optgroup.title}
            <optgroup label={optgroup.title}>{@render opts()} </optgroup>
          {:else}
            {@render opts()}
          {/if}
        {/each}
      </select>
      <div class="handle">
        <div class="fas fa-grip-vertical"></div>
      </div>
    </li>
  {/each}
</ul>

<style lang="scss">
  select {
    min-width: 200px;
  }

  .index {
    min-width: 20px;
    text-align: right;
    font-weight: 600;
  }

  .row {
    display: flex;
    margin: 8px 0;
    align-items: center;
    gap: 8px;
    height: 1.5rem;
  }

  .row:global(.sortable-ghost) {
    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-200);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-700);
    }
  }

  .hide {
    display: none;
  }

  .handle {
    margin: 0;
    width: 16px;
    min-height: 100%;
    height: 100%;
    cursor: grab;
    position: relative;

    > * {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translateX(-50%) translateY(-50%);
    }
  }

  @media only screen and (max-width: 480px) {
    .row {
      width: 100%;
      height: 3rem;

      select {
        flex-grow: 1;
      }
    }

    .handle {
      width: 48px;
    }
  }
</style>

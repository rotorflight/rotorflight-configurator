<script>
  import Sortable from "sortablejs";
  import { i18n } from "@/js/i18n.js";
  import { TELEMETRY_SENSORS } from "../../telemetry/sensors.js";

  let { value = $bindable([]) } = $props();

  let sortable;

  function makeSortable(node) {
    sortable = Sortable.create(node, {
      animation: 150,
      handle: ".handle",
      onUpdate(event) {
        const { oldIndex, newIndex } = event;
        const newValue = $state.snapshot(value);

        const target = newValue[oldIndex];
        const increment = newIndex < oldIndex ? -1 : 1;

        for (let i = oldIndex; i !== newIndex; i += increment) {
          newValue[i] = newValue[i + increment];
        }
        newValue[newIndex] = target;
        value = newValue;
      },
    });

    return {
      destroy: () => sortable.destroy(),
    };
  }

  function getLabel(id) {
    const name = TELEMETRY_SENSORS[id];

    const parts = [];

    let i18nName;
    const escNum = name.match(/^ESC(\d)/);
    if (escNum) {
      parts.push(`#${escNum[1]}`);
      i18nName = name.replace(/^ESC\d/, "ESC");
    } else {
      i18nName = name;
    }
    parts.push($i18n.t(`receiverTelemetrySensor_${i18nName}`));

    return parts.join(" ");
  }
</script>

<ul use:makeSortable>
  {#each value as item, i (item)}
    <li>
      <div class="index">{i + 1}</div>
      <span class="name">
        {getLabel(item.value)}
      </span>
      <div class="handle">
        <div class="fas fa-grip-vertical"></div>
      </div>
    </li>
  {/each}
</ul>

<style lang="scss">
  ul {
    padding: 0 4px;
  }

  .index {
    margin: 0 8px;
    min-width: 16px;
    text-align: right;
    font-weight: 600;
  }

  .name {
    flex-grow: 1;
  }

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    max-width: 300px;

    border-radius: 2px;

    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-200);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-800);
    }
  }

  li:global(.sortable-ghost) {
    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-300);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-700);
    }
  }

  li + li {
    margin-top: 8px;
  }

  .hide {
    display: none;
  }

  .handle {
    display: flex;
    align-items: center;
    padding: 0 12px;
    align-self: stretch;
    cursor: grab;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-800);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-200);
    }
  }

  @media only screen and (max-width: 480px) {
    li {
      max-width: none;
      height: 42px;
    }

    .handle {
      padding: 0 16px;
    }
  }
</style>

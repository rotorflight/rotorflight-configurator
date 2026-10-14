<script>
  import HelpIcon from "@/components/HelpIcon.svelte";
  import Section from "@/components/Section.svelte";

  import { i18n } from "@/js/i18n.js";

  import { AXES, GAINS } from "./fields.js";

  // The gains the controller applies: each gain times its axis's master
  // gain, mirroring flight/pid.c. Master gains scale P, I, D and O (the
  // feedback terms); F and B are feedforward and are shown unscaled.
  const COLUMNS = [
    ...GAINS.map((gain, index) => ({ ...gain, index })),
    {
      key: "O",
      label: "profilesOffset",
      help: "profilesOffsetGainHelp",
      index: 5,
    },
  ];
  const SCALED = new Set(["P", "I", "D", "O"]);
  const MASTER_GAIN_KEYS = [
    "cyclicMasterGain",
    "cyclicMasterGain",
    "yawMasterGain",
  ];

  // `form`/`initial` are the page's edited and last loaded values, `live`
  // the FC's current ones (they follow in-flight adjustments).
  let { form, initial, live, showOffset } = $props();

  let columns = $derived(COLUMNS.filter((c) => showOffset || c.key !== "O"));

  // A value edited on the page wins; an untouched one follows the FC.
  function current(formValue, initialValue, liveValue) {
    return formValue === initialValue ? liveValue : formValue;
  }

  function gainOf(values, axis, index) {
    if (index === 5) {
      return axis === 0 ? values.offsetGainRoll : values.offsetGainPitch;
    }
    return values.pids[axis][index];
  }

  function masterGain(axis) {
    const key = MASTER_GAIN_KEYS[axis];
    return current(form[key], initial[key], live[key]);
  }

  // The master gain differs from the saved one: changed on the page or by
  // an adjustment function in flight.
  function masterGainDelta(axis) {
    return masterGain(axis) - initial[MASTER_GAIN_KEYS[axis]];
  }

  function effective(axis, column) {
    if (column.key === "O" && axis === 2) {
      return null;
    }
    const gain = current(
      gainOf(form, axis, column.index),
      gainOf(initial, axis, column.index),
      live.pids[axis][column.index],
    );
    const scale = SCALED.has(column.key) ? masterGain(axis) / 100 : 1;
    return gain * scale;
  }

  function format(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
</script>

<Section label="profilesEffectivePidGains" summary="profilesEffectiveGainsHelp">
  <div class="wrap">
    <div
      class="table"
      style:--cols={columns.length}
      style:--rows={columns.length + 1}
    >
      <span></span>
      {#each columns as column (column.key)}
        <span class="col">
          {$i18n.t(column.label)}
          <HelpIcon>{$i18n.t(column.help)}</HelpIcon>
        </span>
      {/each}
      {#each AXES as axis, a (axis)}
        {@const delta = masterGainDelta(a)}
        <span class={["axis", axis.toLowerCase()]}>
          {$i18n.t(`axis${axis}`)}
          <!-- As on Wingflight: tagged only while the master gain is off
               its saved value, e.g. moved by an adjustment in flight. -->
          {#if Math.abs(delta) >= 0.5}
            <span
              class={["tag", delta > 0 ? "higher" : "lower"]}
              title={$i18n.t("profilesMasterGainTagHelp")}
            >
              {Math.round(masterGain(a))}%
            </span>
          {/if}
        </span>
        {#each columns as column (column.key)}
          {@const value = effective(a, column)}
          <span class={["value", value === null && "empty"]}>
            {value === null ? "" : format(value)}
          </span>
        {/each}
      {/each}
    </div>
  </div>
</Section>

<style lang="scss">
  .wrap {
    container-type: inline-size;
    overflow-x: auto;
  }

  .table {
    display: grid;
    grid-template-columns: minmax(70px, 1fr) repeat(
        var(--cols),
        minmax(56px, 104px)
      );
    align-items: center;
    gap: 6px 6px;
    padding: 4px 8px 8px;
  }

  /* Same transpose as the PID gains table: on a narrow pane the terms
     become rows and the three axes columns. */
  @container (max-width: 540px) {
    .table {
      grid-auto-flow: column;
      grid-template-columns: auto repeat(3, minmax(56px, 1fr));
      grid-template-rows: repeat(var(--rows), auto);
    }

    .col {
      justify-content: flex-start;
    }

    .axis {
      text-align: center;
    }
  }

  .col {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-soft);
    white-space: nowrap;
  }

  .axis {
    font-weight: 600;

    &.roll {
      color: var(--color-roll);
    }

    &.pitch {
      color: var(--color-pitch);
    }

    &.yaw {
      color: var(--color-yaw);
    }
  }

  /* Read-only look of a disabled input, as on Wingflight. */
  .value {
    height: 1.75rem;
    padding: 0 8px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xs);
    background-color: var(--color-input-bg-disabled);
    color: var(--color-text-soft);
    text-align: right;
    line-height: 1.75rem;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }

  .value.empty {
    visibility: hidden;
  }

  .tag {
    margin-left: 4px;
    padding: 0 4px;
    border-radius: var(--radius-xs);
    font-size: 0.7rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    &.higher {
      color: var(--color-success);
      background-color: var(--color-success-soft);
    }

    &.lower {
      color: var(--color-warning);
      background-color: var(--color-warning-soft);
    }
  }
</style>

<script>
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Modal from "@/components/Modal.svelte";

  let { busType } = $props();

  let editIndex = $state(null);
  let editOutput = $state();

  function onEdit(index) {
    editIndex = index;
    editOutput = $state.snapshot(FC[busType][index]);
  }

  const SOURCE_TYPES = ["Disabled", "Receiver", "Mixer", "Servo", "Motor"];

  const INDEX_CONFIG = [
    { max: 24 },
    { max: 24 },
    { max: 24 },
    { max: FC.CONFIG.servoCount },
    { max: FC.CONFIG.motorCount },
  ];

  const RANGE_CONFIG = [
    { min: 500, max: 2000, defaultMin: 1000, defaultMax: 2000 },
    { min: 500, max: 2000, defaultMin: 1000, defaultMax: 2000 },
    { min: -1000, max: 1000, defaultMin: -1000, defaultMax: 1000 },
    { min: 1000, max: 2000, defaultMin: 1000, defaultMax: 2000 },
    { min: 0, max: 1000, defaultMin: 0, defaultMax: 1000 },
  ];

  function onChangeSourceType(event) {
    editOutput.source_range_low = RANGE_CONFIG[event.target.value].defaultMin;
    editOutput.source_range_high = RANGE_CONFIG[event.target.value].defaultMax;
  }
</script>

{#if editIndex !== null}
  <Modal
    onclose={() => {
      editIndex = null;
    }}
    onconfirm={() => {
      FC[busType][editIndex] = editOutput;
      editIndex = null;
    }}
  >
    {#snippet label()}
      {$i18n.t(`configuration_${busType}_EditHeading`, {
        index: editIndex + 1,
      })}
    {/snippet}
    <SubSection>
      <Field id="bus-source-type" label="configurationBusOutSourceType">
        <select
          id="bus-source-type"
          bind:value={editOutput.source_type}
          onchange={onChangeSourceType}
        >
          <option value={0}>None</option>
          <option value={1}>Receiver</option>
          <option value={2}>Mixer</option>
          <option value={3}>Servo</option>
          <option value={4}>Motor</option>
        </select>
      </Field>
      <Field id="bus-source-index" label="configurationBusOutSourceIndex">
        <NumberInput
          id="bus-source-index"
          min="0"
          max={INDEX_CONFIG[editOutput.source_type].max - 1}
          bind:value={editOutput.source_index}
        />
      </Field>
      <Field id="bus-low" label="configurationBusOutSourceRangeLow">
        <NumberInput
          id="bus-low"
          min={RANGE_CONFIG[editOutput.source_type].min}
          max={RANGE_CONFIG[editOutput.source_type].max}
          bind:value={editOutput.source_range_low}
        />
      </Field>
      <Field id="bus-high" label="configurationBusOutSourceRangeHigh">
        <NumberInput
          id="bus-high"
          min={RANGE_CONFIG[editOutput.source_type].min}
          max={RANGE_CONFIG[editOutput.source_type].max}
          bind:value={editOutput.source_range_high}
        />
      </Field>
    </SubSection>
  </Modal>
{/if}

<div class="wrapper">
  <Section label={`configuration_${busType}_Heading`}>
    <SubSection>
      <table>
        <thead>
          <tr>
            <th class="cell">
              {busType === "SBUS_OUT" ? "S.BUS" : "F.BUS"} #
            </th>
            <th colspan="2">{$i18n.t("configurationBusOutHeadingSource")}</th>
            <th colspan="2">{$i18n.t("genericRange")}</th>
            <th class="edit">{$i18n.t("genericEdit")}</th>
          </tr>
        </thead>
        <tbody>
          {#each FC[busType] as _, index (index)}
            <tr>
              <td class="cell">{index + 1}</td>
              <td class="cell source-type">
                {SOURCE_TYPES[FC[busType][index].source_type]}
              </td>

              {#if FC[busType][index].source_type > 0}
                <td class="cell source-index">
                  {FC[busType][index].source_index}
                </td>
                <td class="cell">{FC[busType][index].source_range_low}</td>
                <td class="cell">{FC[busType][index].source_range_high}</td>
              {:else}
                <td colspan="3"></td>
              {/if}

              <td class="edit icon" onclick={() => onEdit(index)}>
                <div class="fas fa-edit"></div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </SubSection>
  </Section>
</div>

<style lang="scss">
  .wrapper {
    float: left;
    width: 100%;
    margin-bottom: 10px;
  }

  .cell {
    width: 100px;
  }

  table {
    border-collapse: collapse;
    width: 100%;

    thead {
      display: table-header-group;
    }

    td {
      text-align: center;
      border-top: 1px solid var(--color-border-soft);
      padding: 4px 0;
    }

    th {
      text-align: center;
      color: var(--color-text-soft);
      padding: 4px 0;
    }

    th + th,
    td:nth-child(2),
    td:nth-child(4),
    td:nth-child(6) {
      border-left: 1px solid var(--color-border-soft);
    }
  }

  .edit.icon {
    cursor: pointer;
    color: var(--color-text-soft);

    :global(html[data-theme="light"]) &:hover {
      color: hsl(40, 100%, 50%);
    }

    :global(html[data-theme="dark"]) &:hover {
      background: var(--color-hover);
    }
  }

  @media only screen and (max-width: 480px) {
    td {
      height: 42px;
    }
  }
</style>

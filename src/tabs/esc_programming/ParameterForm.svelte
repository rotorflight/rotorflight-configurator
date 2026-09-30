<script>
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";

  import { i18n } from "@/js/i18n.js";

  import {
    displayMax,
    displayMin,
    displayStep,
    fieldOptions,
    hasEnum,
    isFieldVisible,
    keepPageField,
    resolveManufacturerField,
  } from "./engine.js";
  import escState from "./state.svelte.js";

  function fieldMeta(apikey) {
    for (const field of escState.manufacturer.fields) {
      if (field.key === apikey) return field;
      const sub = field.bitmap?.find((entry) => entry.key === apikey);
      if (sub) return sub;
    }
    return undefined;
  }
</script>

{#if escState.manufacturer.powerCycleRequired}
  <p class="power-cycle-note">{$i18n.t("escProgrammingPowerCycleNote")}</p>
{/if}

<div class="pages">
  {#each escState.manufacturer.pages as page (page.title)}
    <Section label={page.title}>
      {#each page.fields as pageField, i (pageField.apikey + "-" + i)}
        {@const rawField = fieldMeta(pageField.apikey)}
        {@const field =
          rawField &&
          resolveManufacturerField(
            escState.manufacturer,
            rawField,
            escState.values,
          )}
        {@const fieldId = pageField.apikey + "-" + i}
        {#if field && pageField.apikey in escState.values && isFieldVisible(field, escState.values) && keepPageField(pageField, escState.values.layout_revision)}
          <Field id={fieldId} label={pageField.label} unit={field.unit}>
            {#if hasEnum(field)}
              <Select
                id={fieldId}
                bind:value={escState.values[pageField.apikey]}
                options={fieldOptions(field)}
              />
            {:else}
              <NumberInput
                id={fieldId}
                bind:value={escState.values[pageField.apikey]}
                min={displayMin(field)}
                max={displayMax(field)}
                step={displayStep(field)}
              />
            {/if}
          </Field>
        {/if}
      {/each}
    </Section>
  {/each}
</div>

<style lang="scss">
  .pages {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  .power-cycle-note {
    padding: 8px;
    font-weight: 600;
  }
</style>

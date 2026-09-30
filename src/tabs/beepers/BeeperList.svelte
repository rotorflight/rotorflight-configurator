<script>
  import Field from "@/components/Field.svelte";
  import Switch from "@/components/Switch.svelte";

  import { i18n } from "@/js/i18n.js";
  import { bit_check, bit_clear, bit_set } from "@/js/serial_backend.js";

  let { beepers, mask = $bindable(), idPrefix } = $props();

  const visible = $derived(beepers._beepers.filter((b) => b.visible));
</script>

<div class="beeper-list">
  {#each visible as beeper (beeper.bit)}
    <Field id={`${idPrefix}-${beeper.name}`} label={rowLabel}>
      {#snippet rowLabel()}
        <span class="name">{beeper.name}</span>
      {/snippet}
      {#snippet tooltip()}
        {$i18n.t(`beeper_${beeper.name}`)}
      {/snippet}
      <Switch
        id={`${idPrefix}-${beeper.name}`}
        bind:checked={
          () => !bit_check(mask, beeper.bit),
          (v) => {
            mask = v ? bit_clear(mask, beeper.bit) : bit_set(mask, beeper.bit);
          }
        }
      />
    </Field>
  {/each}
</div>

<style lang="scss">
  .name {
    font-weight: 600;
    font-size: 0.8rem;
  }
</style>

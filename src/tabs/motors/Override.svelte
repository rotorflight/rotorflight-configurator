<script>
  import Field from "@/components/Field.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import motorState from "./state.svelte.js";

  async function enableHandler() {
    if (!motorState.overrideEnabled) {
      await mspHelper.resetMotorOverrides();
    }
  }
</script>

<Section label="motorOverrideTitle">
  <WarningNote message="motorOverrideNote" />
  <SubSection>
    <Field id="motor-override-enable" label="genericEnable">
      <Switch
        id="motor-override-enable"
        bind:checked={motorState.overrideEnabled}
        onchange={enableHandler}
      />
    </Field>
  </SubSection>
</Section>

<style lang="scss">
</style>

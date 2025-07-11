<script>
  import { onDestroy } from "svelte";
  import { FC } from "@/js/fc.svelte.js";

  import Field from "@/components/Field.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Switch from "@/components/Switch.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";

  import Motor from "./Motor.svelte";
  import motorState from "../state.svelte.js";

  let pollerInterval;

  $effect(() => {
    // poll for telemetry while override is enabled
    if (!motorState.overrideEnabled) {
      clearInterval(pollerInterval);
      pollerInterval = null;
    } else if (!pollerInterval) {
      pollerInterval = setInterval(async () => {
        await MSP.promise(MSPCodes.MSP_MOTOR);
        await MSP.promise(MSPCodes.MSP_MOTOR_TELEMETRY);
        await MSP.promise(MSPCodes.MSP_BATTERY_STATE);
      }, 50);
    }
  });

  async function enableHandler() {
    if (!motorState.overrideEnabled) {
      await mspHelper.resetMotorOverrides();
    }
  }

  onDestroy(() => {
    clearInterval(pollerInterval);
    pollerInterval = null;
  });
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

{#if motorState.overrideEnabled}
  {#each { length: FC.CONFIG.motorCount } as _, i (i)}
    <Motor index={i} />
  {/each}
{/if}

<style lang="scss">
</style>

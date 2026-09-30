<script>
  import { onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import BeeperList from "./BeeperList.svelte";

  let loading = $state(true);

  let beeperMask = $state(0);
  let dshotMask = $state(0);
  let dshotBeaconTone = $state(1);

  let initialBeeperMask = $state(0);
  let initialDshotMask = $state(0);
  let initialDshotBeaconTone = $state(1);

  let dirty = $derived(
    beeperMask !== initialBeeperMask ||
      dshotMask !== initialDshotMask ||
      dshotBeaconTone !== initialDshotBeaconTone,
  );
  let showToolbar = $derived(!loading && dirty);

  const toneOptions = Array.from({ length: 5 }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
  }));

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_BEEPER_CONFIG);

    beeperMask = FC.BEEPER_CONFIG.beepers.getDisabledMask();
    dshotMask = FC.BEEPER_CONFIG.dshotBeaconConditions.getDisabledMask();
    dshotBeaconTone = FC.BEEPER_CONFIG.dshotBeaconTone;

    initialBeeperMask = beeperMask;
    initialDshotMask = dshotMask;
    initialDshotBeaconTone = dshotBeaconTone;

    loading = false;
  });

  function onClickHelp() {
    window.open(getTabHelpURL("tabBeepers"), "_system");
  }

  export async function onSave() {
    FC.BEEPER_CONFIG.beepers.setDisabledMask(beeperMask);
    FC.BEEPER_CONFIG.dshotBeaconConditions.setDisabledMask(dshotMask);
    FC.BEEPER_CONFIG.dshotBeaconTone = dshotBeaconTone;

    await MSP.promise(
      MSPCodes.MSP_SET_BEEPER_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_BEEPER_CONFIG),
    );
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    initialBeeperMask = beeperMask;
    initialDshotMask = dshotMask;
    initialDshotBeaconTone = dshotBeaconTone;
  }

  export async function onRevert() {
    beeperMask = initialBeeperMask;
    dshotMask = initialDshotMask;
    dshotBeaconTone = initialDshotBeaconTone;
  }

  export function isDirty() {
    return dirty;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabBeepers")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSave")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <Section label="configurationBeeper" summary="configurationBeeperHelp">
      <BeeperList
        idPrefix="beeper"
        beepers={FC.BEEPER_CONFIG.beepers}
        bind:mask={beeperMask}
      />
    </Section>

    <Section
      label="configurationDshotBeeper"
      summary="configurationDshotBeaconHelp"
    >
      <Field id="dshot-beacon-tone" label="configurationDshotBeaconTone">
        <Select
          id="dshot-beacon-tone"
          bind:value={dshotBeaconTone}
          options={toneOptions}
        />
      </Field>
      <BeeperList
        idPrefix="dshot-beacon"
        beepers={FC.BEEPER_CONFIG.dshotBeaconConditions}
        bind:mask={dshotMask}
      />
    </Section>
  </div>
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }

  .help-btn {
    min-width: 60px;
  }

  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    column-gap: var(--section-gap);
  }

  @media only screen and (max-width: 480px) {
    .content {
      grid-template-columns: 1fr;
      row-gap: 0;
    }
  }
</style>

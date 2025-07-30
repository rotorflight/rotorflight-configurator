<script>
  import diff from "microdiff";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";

  import { i18n } from "@/js/i18n.js";
  import { FC } from "@/js/fc.svelte.js";
  import { reinitialiseConnection } from "@/js/serial_backend";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import Expert from "@/components/Expert.svelte";
  import Field from "@/components/Field.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import SubSection from "@/components/SubSection.svelte";
  import Tooltip from "@/components/Tooltip.svelte";

  let loading = $state(true);
  let initialState;

  function snapshotState() {
    return $state.snapshot({
      RX_CONFIG: FC.RX_CONFIG,
      RXFAIL_CONFIG: FC.RXFAIL_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }

    return diff(initialState, snapshotState());
  });
  let showToolbar = $derived(!loading && changes.length > 0);

  const channelNames = [
    "controlAxisRoll",
    "controlAxisPitch",
    "controlAxisYaw",
    "controlAxisCollective",
    "controlAxisThrottle",
  ];

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_RXFAIL_CONFIG);
    await MSP.promise(MSPCodes.MSP_RX_CONFIG);

    initialState = snapshotState();
    loading = false;
  });

  export async function onSave() {
    function save(code) {
      return MSP.promise(code, mspHelper.crunch(code));
    }

    await mspHelper.sendRxFailConfig();
    await save(MSPCodes.MSP_SET_RX_CONFIG);

    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));
    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  export function onRevert() {
    Object.assign(FC.RX_CONFIG, initialState.RX_CONFIG);
    Object.assign(FC.RXFAIL_CONFIG, initialState.RXFAIL_CONFIG);
    FC.FEATURE_CONFIG.features.bitfield = initialState.features;
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabFailsafe"), "_system");
  }

  export function isDirty() {
    return changes.length > 0;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabFailsafe")}</h1>
  <div class="grow"></div>
  <button class="help-btn" onclick={onClickHelp}>Help</button>
{/snippet}

{#snippet toolbar()}
  <button onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button onclick={onSave}>
    {$i18n.t("buttonSaveReboot")}
  </button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="content">
    <div>
      <Expert>
        <div transition:slide>
          <Section
            label="failsafePulsrangeTitle"
            summary="failsafePulsrangeHelp"
          >
            <SubSection>
              <Field id="rx-pulse-min" label="failsafeRxMinUsecItem" unit="μs">
                {#snippet tooltip()}
                  <Tooltip
                    attrs={[
                      { name: "genericDefault", value: "885μs" },
                      { name: "genericRange", value: "750μs - 2250μs " },
                    ]}
                  />
                {/snippet}
                <NumberInput
                  id="rx-pulse-min"
                  min="750"
                  max="2250"
                  bind:value={FC.RX_CONFIG.rx_pulse_min}
                />
              </Field>
              <Field id="rx-pulse-max" label="failsafeRxMaxUsecItem" unit="μs">
                {#snippet tooltip()}
                  <Tooltip
                    attrs={[
                      { name: "genericDefault", value: "2115μs" },
                      { name: "genericRange", value: "750μs - 2250μs " },
                    ]}
                  />
                {/snippet}
                <NumberInput
                  id="rx-pulse-max"
                  min="750"
                  max="2250"
                  bind:value={FC.RX_CONFIG.rx_pulse_max}
                />
              </Field>
            </SubSection>
          </Section>
        </div>
      </Expert>
      <Section
        label="failsafeChannelFallbackSettingsTitle"
        summary="failsafeChannelFallbackSettingsHelp"
      >
        <SubSection>
          {#each { length: FC.RXFAIL_CONFIG?.length ?? 0 } as _, i (i)}
            <Field
              id={`fallback-${i}`}
              label={channelNames[i] ??
                `controlAxisAux${i - channelNames.length + 1}`}
            >
              <div class="fallback-group">
                {#if FC.RXFAIL_CONFIG[i].mode === 2}
                  <NumberInput
                    id={`set-${i}`}
                    min="875"
                    max="2125"
                    step="5"
                    bind:value={FC.RXFAIL_CONFIG[i].value}
                  />
                {/if}
                <select
                  class="switchMode"
                  id={`fallback-${i}`}
                  bind:value={FC.RXFAIL_CONFIG[i].mode}
                >
                  {#if i < channelNames.length}
                    <option value={0}>
                      {$i18n.t("failsafeChannelFallbackOptionAuto")}
                    </option>
                  {/if}
                  <option value={1}>
                    {$i18n.t("failsafeChannelFallbackOptionHold")}
                  </option>
                  <option value={2}>
                    {$i18n.t("failsafeChannelFallbackOptionSet")}
                  </option>
                </select>
              </div>
            </Field>
          {/each}
        </SubSection>
      </Section>
    </div>
    <div></div>
  </div>
</Page>

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    column-gap: var(--section-gap);
  }

  .fallback-group {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .help-btn {
    padding: 4px 8px;
    min-width: 60px;
  }

  .grow {
    flex-grow: 1;
  }

  button {
    @extend %button;
  }
</style>

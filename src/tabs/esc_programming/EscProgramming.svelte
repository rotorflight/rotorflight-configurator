<script>
  import { onMount } from "svelte";

  import Page from "@/components/Page.svelte";

  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import DetectionStatus from "./DetectionStatus.svelte";
  import EscTargetSelector from "./EscTargetSelector.svelte";
  import ManufacturerPicker from "./ManufacturerPicker.svelte";
  import ParameterForm from "./ParameterForm.svelte";
  import escState, { View } from "./state.svelte.js";

  let loading = $state(true);
  let showToolbar = $derived(escState.view === View.FORM && escState.isDirty());

  // The manufacturer picker's protocol soft-filter reads FC.ESC_SENSOR_CONFIG.protocol, and
  // the ESC1/ESC2 selector's escTwoAvailable reads FC.MOTOR_CONFIG.motor_count_blheli. Neither
  // is fetched anywhere else unless another tab (e.g. Motors) happened to load it first -- so
  // without an explicit fetch here both looked inconsistent/stale depending on prior
  // navigation (protocol filter sometimes enabling everything; ESC2 sometimes missing even
  // with two ESCs connected).
  async function refreshAndReset() {
    loading = true;
    escState.reset();
    await MSP.promise(MSPCodes.MSP_ESC_SENSOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_MOTOR_CONFIG);
    loading = false;
  }

  onMount(refreshAndReset);

  export function onSave() {
    return escState.onSave();
  }

  export function onRevert() {
    escState.onRevert();
  }

  export function isDirty() {
    return escState.view === View.FORM && escState.isDirty();
  }
</script>

{#snippet header()}
  <div class="title">
    <h1>{$i18n.t("tabEscProgramming")}</h1>
    {#if escState.view === View.FORM && escState.escLabel}
      <span class="esc-label">{escState.escLabel}</span>
    {/if}
  </div>
  <div class="grow"></div>
  {#if escState.view !== View.PICKER}
    <button class="btn" onclick={refreshAndReset}>
      {$i18n.t("escProgrammingChangeEsc")}
    </button>
  {/if}
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSave")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  {#if escState.armed}
    <p class="armed-warning">{$i18n.t("escProgrammingArmedWarning")}</p>
  {/if}

  {#if escState.view === View.PICKER}
    <ManufacturerPicker />
  {:else if escState.view === View.SELECTOR}
    <EscTargetSelector />
  {:else if escState.view === View.DETECTING}
    <DetectionStatus />
  {:else if escState.view === View.FORM}
    <ParameterForm />
  {/if}
</Page>

<style lang="scss">
  .title {
    display: flex;
    flex-direction: column;
    gap: 2px;

    h1 {
      margin: 0;
    }
  }

  .esc-label {
    font-size: 0.8em;
    font-weight: 400;
    color: var(--color-text-soft);
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }

  .armed-warning {
    padding: 8px;
    font-weight: 600;
    color: var(--color-red-900);
  }
</style>

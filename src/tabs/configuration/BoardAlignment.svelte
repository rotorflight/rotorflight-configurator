<script>
  import { mount, unmount } from "svelte";

  import Field from "@/components/Field.svelte";
  import HelpIcon from "@/components/HelpIcon.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Select from "@/components/Select.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import AutoAlignWizard from "./AutoAlignWizard.svelte";
  import { SENSOR_ALIGNMENTS } from "./util.js";

  let { magHardwareEnabled, onModelPollingPausedChange } = $props();

  let magAlignOptions = $derived([
    { value: 0, label: $i18n.t("configurationSensorAlignmentDefaultOption") },
    ...SENSOR_ALIGNMENTS.map((label, i) => ({ value: i + 1, label })),
  ]);

  let autoAlignDisabled = $state(false);
  let autoAlignWizardInstance = null;

  // The wizard polls MSP2_BOARD_AUTO_ALIGN every 250ms while open; pause the
  // 3D model's MSP_ATTITUDE poll meanwhile so the two don't contend on a
  // slow serial link.
  function closeAutoAlignWizard() {
    if (!autoAlignWizardInstance) return;
    const instance = autoAlignWizardInstance;
    autoAlignWizardInstance = null;
    unmount(instance);
    onModelPollingPausedChange?.(false);
  }

  function onClickAutoAlign() {
    closeAutoAlignWizard();
    // Mounted to <body> so the native <dialog> centers on the viewport
    // instead of the transformed #content ancestor.
    autoAlignWizardInstance = mount(AutoAlignWizard, {
      target: document.body,
      props: {
        onButtonDisabled: (v) => (autoAlignDisabled = v),
        onClose: closeAutoAlignWizard,
      },
    });
    onModelPollingPausedChange?.(true);
  }

  export function cleanup() {
    autoAlignWizardInstance?.stop();
    closeAutoAlignWizard();
  }
</script>

<div class="row">
  <div class="inputs">
    <label class="axis">
      <NumberInput
        bind:value={FC.BOARD_ALIGNMENT_CONFIG.roll}
        min={-180}
        max={360}
        step={1}
      />
      <span class="icon roll"></span>
      <span>{$i18n.t("configurationBoardAlignmentRoll")}</span>
    </label>
    <label class="axis">
      <NumberInput
        bind:value={FC.BOARD_ALIGNMENT_CONFIG.pitch}
        min={-180}
        max={360}
        step={1}
      />
      <span class="icon pitch"></span>
      <span>{$i18n.t("configurationBoardAlignmentPitch")}</span>
    </label>
    <label class="axis">
      <NumberInput
        bind:value={FC.BOARD_ALIGNMENT_CONFIG.yaw}
        min={-180}
        max={360}
        step={1}
      />
      <span class="icon yaw"></span>
      <span>{$i18n.t("configurationBoardAlignmentYaw")}</span>
    </label>
  </div>

  <div class="auto-align">
    <button class="btn" disabled={autoAlignDisabled} onclick={onClickAutoAlign}>
      {$i18n.t("configurationBoardAutoAlignStart")}
    </button>
    <HelpIcon>{$i18n.t("configurationBoardAutoAlignHelp")}</HelpIcon>
  </div>
</div>

{#if magHardwareEnabled}
  <div class="mag-align">
    <Field id="mag-align" label="configurationSensorAlignmentMag">
      <Select
        id="mag-align"
        bind:value={FC.SENSOR_ALIGNMENT.align_mag}
        options={magAlignOptions}
      />
    </Field>
  </div>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 20px;
  }

  .inputs {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .axis {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
  }

  .icon {
    width: 15px;
    height: 15px;
    background-repeat: no-repeat;
    background-position: center;

    &.roll {
      background-image: url(/images/icons/cf_icon_roll.svg);
    }
    &.pitch {
      background-image: url(/images/icons/cf_icon_pitch.svg);
    }
    &.yaw {
      background-image: url(/images/icons/cf_icon_yaw.svg);
    }
  }

  .auto-align {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .mag-align {
    margin-top: 4px;
    border-top: 1px dotted var(--color-border);
  }

  /* The Select component has no <style> of its own, so Svelte's scoping
     can't reach its internal <select> from here without :global(). */
  .mag-align :global(select) {
    height: 1.5rem;
    min-width: 120px;
    padding: 0 4px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--color-border-soft);
    background-color: var(--color-input-bg);
    color: var(--color-text);
  }
</style>

<script>
  import { getContext, mount, onDestroy, unmount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { have_sensor } from "@/js/serial_backend.js";
  import AutoAlignWizard from "@/tabs/configuration/AutoAlignWizard.svelte";

  import HeliSide from "./HeliSide.svelte";

  const wiz = getContext("setupWizard");

  let calibrating = $state(false);
  let calibrated = $state(false);
  let dialogBusy = $state(false);
  let dialog = null;
  let calibrationTimer;

  const before = { ...FC.BOARD_ALIGNMENT_CONFIG };

  let hasAcc = $derived(have_sensor(FC.CONFIG.activeSensors, "acc"));

  // The auto-align applies its result on the FC (unsaved) and in
  // FC.BOARD_ALIGNMENT_CONFIG; it only takes effect for good after a save
  // and reboot.
  let alignmentChanged = $derived(
    ["roll", "pitch", "yaw"].some(
      (axis) => FC.BOARD_ALIGNMENT_CONFIG[axis] !== before[axis],
    ),
  );

  $effect(() => {
    if (alignmentChanged) wiz.markChanged();
  });

  wiz.setCommit(async () => {
    if (!alignmentChanged) return;
    await MSP.promise(
      MSPCodes.MSP_SET_BOARD_ALIGNMENT_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_BOARD_ALIGNMENT_CONFIG),
    );
  });

  function calibrateAccel() {
    if (calibrating) return;
    calibrating = true;
    MSP.send_message(MSPCodes.MSP_ACC_CALIBRATION, false, false, () => {
      GUI.log($i18n.t("initialSetupAccelCalibStarted"));
    });
    calibrationTimer = setTimeout(() => {
      GUI.log($i18n.t("initialSetupAccelCalibEnded"));
      calibrating = false;
      calibrated = true;
    }, 2000);
  }

  function closeDialog() {
    if (!dialog) return;
    const instance = dialog;
    dialog = null;
    unmount(instance);
  }

  // Mounted on <body>, as on the Configuration tab, so the native <dialog>
  // centres on the viewport.
  function openAutoAlign() {
    closeDialog();
    dialog = mount(AutoAlignWizard, {
      target: document.body,
      props: {
        onButtonDisabled: (v) => (dialogBusy = v),
        onClose: closeDialog,
      },
    });
  }

  onDestroy(() => {
    clearTimeout(calibrationTimer);
    dialog?.stop?.();
    closeDialog();
  });
</script>

<div class="with-art">
  <div class="art"><HeliSide scene="bladesOff" /></div>
  <div class="text"><p>{$i18n.t("setupWizardSensorsIntro")}</p></div>
</div>

{#if !hasAcc}
  <div class="note">{$i18n.t("setupWizardSensorsNoAcc")}</div>
{/if}

<section class={["card", calibrated && "complete"]}>
  <h3>
    <span class="num">1</span>{$i18n.t("setupWizardSensorsAccTitle")}
    {#if calibrated}
      <span class="badge good">
        <i class="fas fa-check" aria-hidden="true"></i>
        {$i18n.t("setupWizardDone")}
      </span>
    {/if}
  </h3>
  <div class="with-art">
    <div class="art"><HeliSide scene="level" /></div>
    <div class="text"><p>{$i18n.t("setupWizardSensorsAccText")}</p></div>
  </div>
  <div class="actions">
    <button
      class="btn"
      disabled={!hasAcc || calibrating || wiz.armed}
      onclick={calibrateAccel}
    >
      {calibrating
        ? $i18n.t("initialSetupButtonCalibratingText")
        : $i18n.t("initialSetupButtonCalibrateAccel")}
    </button>
  </div>
</section>

<section class={["card", alignmentChanged && "complete"]}>
  <h3><span class="num">2</span>{$i18n.t("setupWizardSensorsAlignTitle")}</h3>
  <div class="with-art">
    <div class="art"><HeliSide scene="tailLift" /></div>
    <div class="text">
      <p>{$i18n.t("setupWizardSensorsAlignText")}</p>
      <span class="pill">
        {$i18n.t("setupWizardSensorsAlignValues", {
          1: FC.BOARD_ALIGNMENT_CONFIG.roll,
          2: FC.BOARD_ALIGNMENT_CONFIG.pitch,
          3: FC.BOARD_ALIGNMENT_CONFIG.yaw,
        })}
      </span>
    </div>
  </div>
  <div class="actions">
    <button
      class="btn"
      disabled={!hasAcc || dialogBusy || wiz.armed}
      onclick={openAutoAlign}
    >
      {$i18n.t("configurationBoardAutoAlignStart")}
    </button>
    <button class="btn" onclick={() => wiz.openTab("configuration")}>
      {$i18n.t("setupWizardOpenConfiguration")}
    </button>
  </div>
</section>

{#if alignmentChanged}
  <div class="callout">
    <i class="fas fa-sync-alt" aria-hidden="true"></i>
    <span>{$i18n.t("setupWizardRebootNeeded")}</span>
    <button class="btn primary" onclick={wiz.saveAndReboot}>
      {$i18n.t("buttonSaveReboot")}
    </button>
  </div>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }
</style>

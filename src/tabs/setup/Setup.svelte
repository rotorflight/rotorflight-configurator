<script>
  import { onDestroy, onMount } from "svelte";

  import Page from "@/components/Page.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { have_sensor, reinitialiseConnection } from "@/js/serial_backend.js";

  let loading = $state(true);

  let hasAcc = $state(false);
  let hasMag = $state(false);

  let calibratingAccel = $state(false);
  let calibratingMag = $state(false);
  let accelTimeout;
  let magTimeout;

  let resetDialogEl;

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_ARMING_CONFIG);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_ADVANCED_CONFIG);

    hasAcc = have_sensor(FC.CONFIG.activeSensors, "acc");
    hasMag = have_sensor(FC.CONFIG.activeSensors, "mag");

    loading = false;
  });

  onDestroy(() => {
    clearTimeout(accelTimeout);
    clearTimeout(magTimeout);
  });

  function onClickHelp() {
    window.open(getTabHelpURL("tabSetup"), "_system");
  }

  function calibrateAccel() {
    if (calibratingAccel) {
      return;
    }
    calibratingAccel = true;

    MSP.send_message(MSPCodes.MSP_ACC_CALIBRATION, false, false, () => {
      GUI.log($i18n.t("initialSetupAccelCalibStarted"));
    });

    accelTimeout = setTimeout(() => {
      GUI.log($i18n.t("initialSetupAccelCalibEnded"));
      calibratingAccel = false;
    }, 2000);
  }

  function calibrateMag() {
    if (calibratingMag || !hasMag) {
      return;
    }
    calibratingMag = true;

    MSP.send_message(MSPCodes.MSP_MAG_CALIBRATION, false, false, () => {
      GUI.log($i18n.t("initialSetupMagCalibStarted"));
    });

    magTimeout = setTimeout(() => {
      GUI.log($i18n.t("initialSetupMagCalibEnded"));
      calibratingMag = false;
    }, 30000);
  }

  function onClickResetSettings() {
    resetDialogEl.showModal();
  }

  function onConfirmResetSettings() {
    resetDialogEl.close();
    MSP.send_message(MSPCodes.MSP_RESET_CONF, false, false, () => {
      GUI.log($i18n.t("initialSetupSettingsRestored"));
      GUI.tab_switch_reload();
    });
  }

  function onClickSaveSettings() {
    MSP.send_message(MSPCodes.MSP_EEPROM_WRITE, false, false, () => {
      GUI.log($i18n.t("initialSetupSettingsSaved"));
      GUI.tab_switch_reload();
    });
  }

  function onClickRebootBootloader() {
    MSP.send_message(
      MSPCodes.MSP_SET_REBOOT,
      [mspHelper.REBOOT_TYPES.BOOTLOADER],
      false,
    );
  }

  function onClickRebootMsc() {
    // Reboot into MSC using UTC time offset instead of user timezone - Linux
    // seems to expect FAT file system timestamps to be UTC based.
    const code =
      GUI.operating_system === "Linux"
        ? mspHelper.REBOOT_TYPES.MSC_UTC
        : mspHelper.REBOOT_TYPES.MSC;
    MSP.send_message(MSPCodes.MSP_SET_REBOOT, [code], false);
  }

  function onClickRebootFirmware() {
    GUI.log($i18n.t("deviceRebooting"));
    MSP.send_message(
      MSPCodes.MSP_SET_REBOOT,
      [mspHelper.REBOOT_TYPES.FIRMWARE],
      false,
    );
    reinitialiseConnection();
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabSetup")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

<Page {header} {loading}>
  <div class="row">
    <div class="action">
      <button
        class="btn"
        disabled={!hasAcc || calibratingAccel}
        onclick={calibrateAccel}
      >
        {calibratingAccel
          ? $i18n.t("initialSetupButtonCalibratingText")
          : $i18n.t("initialSetupButtonCalibrateAccel")}
      </button>
    </div>
    <div class="description">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("initialSetupCalibrateAccelText")}
    </div>
  </div>

  <div class="row">
    <div class="action">
      <button
        class="btn"
        disabled={!hasMag || calibratingMag}
        onclick={calibrateMag}
      >
        {calibratingMag
          ? $i18n.t("initialSetupButtonCalibratingText")
          : $i18n.t("initialSetupButtonCalibrateMag")}
      </button>
    </div>
    <div class="description">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("initialSetupCalibrateMagText")}
    </div>
  </div>

  <div class="row">
    <div class="action">
      <button class="btn" onclick={onClickResetSettings}>
        {$i18n.t("initialSetupButtonResetSettings")}
      </button>
    </div>
    <div class="description">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("initialSetupResetSettingsText")}
    </div>
  </div>

  <div class="row">
    <div class="action">
      <button class="btn" onclick={onClickSaveSettings}>
        {$i18n.t("initialSetupButtonSaveSettings")}
      </button>
    </div>
    <div class="description">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("initialSetupSaveSettingsText")}
    </div>
  </div>

  <div class="row">
    <div class="action">
      <button class="btn" onclick={onClickRebootBootloader}>
        {$i18n.t("initialSetupButtonRebootBootloader")}
      </button>
    </div>
    <div class="description">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("initialSetupRebootBootloaderText")}
    </div>
  </div>

  <div class="row">
    <div class="action">
      <button class="btn" onclick={onClickRebootMsc}>
        {$i18n.t("initialSetupButtonMassStorage")}
      </button>
    </div>
    <div class="description">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("initialSetupButtonMassStorageText")}
    </div>
  </div>

  <div class="row">
    <div class="action">
      <button class="btn" onclick={onClickRebootFirmware}>
        {$i18n.t("initialSetupButtonReboot")}
      </button>
    </div>
    <div class="description">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("initialSetupButtonRebootText")}
    </div>
  </div>
</Page>

<dialog bind:this={resetDialogEl}>
  <h3>{$i18n.t("dialogConfirmResetTitle")}</h3>
  <div class="content">
    <p>{$i18n.t("dialogConfirmResetNote")}</p>
  </div>
  <div class="buttons">
    <button class="btn" onclick={onConfirmResetSettings}>
      {$i18n.t("dialogConfirmResetConfirm")}
    </button>
    <button class="btn" onclick={() => resetDialogEl.close()}>
      {$i18n.t("dialogConfirmResetClose")}
    </button>
  </div>
</dialog>

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

  .row {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: var(--section-gap);
    padding: 10px 4px;
    border-bottom: 1px dotted var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  .action .btn {
    width: 100%;
  }

  .description {
    color: var(--color-text-soft);
    font-size: 0.85rem;
  }

  dialog {
    width: 32em;
    border-radius: var(--radius-lg);
  }

  dialog .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 1.5em;
  }

  dialog h3 {
    margin-bottom: 0.5em;
  }

  @media only screen and (max-width: 575px) {
    .row {
      grid-template-columns: 1fr;
    }
  }
</style>

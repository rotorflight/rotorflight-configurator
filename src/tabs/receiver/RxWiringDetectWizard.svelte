<script>
  import { onMount } from "svelte";

  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  // onDetected is called with (inverted, halfDuplex, pinSwap) on SUCCESS so
  // the caller can apply the result to FC.RX_CONFIG - this component has no
  // opinion on that. onSaveRequested is the tab's own onSave() - offered as
  // a direct "Save & Reboot" action on the success screen so finding a
  // working combo doesn't require the user to separately notice the tab
  // went dirty and hunt for its own Save button.
  let { onDetected, onButtonDisabled, onClose, onSaveRequested } = $props();

  // Keep in sync with rotorflight-firmware's rx.h rxSerialTrialState_e.
  const RX_SERIAL_TRIAL = {
    IDLE: 0,
    RUNNING: 1,
    SUCCESS: 2,
    FAILED: 3,
    REJECTED: 4,
  };

  const COMBO_COUNT = 8;
  const POLL_INTERVAL_MS = 200; // comfortably under the firmware's 3s no-poll watchdog

  let dialogEl;
  let wizardStep = $state("");
  let wizardDetail = $state("");
  let wizardProgress = $state(0);
  let canRetry = $state(false);
  let canSave = $state(false);

  let pollTimer;

  // Same "race a single dropped/slow reply against a local timeout" pattern
  // used elsewhere for MSP.send_message-driven polling loops - MSP.promise()
  // never rejects and has no timeout of its own on a real (non-virtual)
  // connection, so a missed packet would otherwise hang this loop forever.
  function sendTrialQuery(action) {
    const payload = action ? [action] : false;

    return new Promise((resolve) => {
      let settled = false;
      let timeout;

      function finish(response) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(response ?? null);
      }

      timeout = setTimeout(() => finish(null), 1000);
      MSP.send_message(
        MSPCodes.MSP2_RX_SERIAL_TRIAL,
        payload,
        false,
        finish,
        true,
      );
    });
  }

  function t(key, args = []) {
    const params = {};
    args.forEach((value, i) => (params[i + 1] = value));
    return $i18n.t(key, params);
  }

  function yesNo(value) {
    return value ? $i18n.t("yes") : $i18n.t("no");
  }

  function setWizard(
    stepKey,
    detailKey,
    progressPercent,
    detailArgs = [],
    retry = false,
    save = false,
  ) {
    wizardStep = t(stepKey);
    wizardDetail = t(detailKey, detailArgs);
    wizardProgress = progressPercent;
    canRetry = retry;
    canSave = save;
  }

  function clearPoll() {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  function onQueryFailed() {
    setWizard(
      "receiverWiringDetectWizardStep2",
      "receiverWiringDetectUnsupported",
      100,
    );
    onButtonDisabled(false);
    clearPoll();
  }

  // Always tells the firmware to stop/restore, regardless of the state we
  // ended on - the trial never persists anything itself, so this is the
  // only way a running or finished trial ever gets cleaned up on the FC
  // side. Fire-and-forget: nothing here depends on the response.
  function stopTrial() {
    sendTrialQuery(2);
  }

  async function queryTrial(startProcedure = false) {
    const response = await sendTrialQuery(startProcedure ? 1 : 0);

    if (!response) {
      clearPoll();
      pollTimer = setTimeout(() => {
        queryTrial(false).catch(onQueryFailed);
      }, 250);
      return;
    }

    const { data } = response;

    if (!data || data.byteLength < 7) {
      onButtonDisabled(true);
      setWizard(
        "receiverWiringDetectWizardStep2",
        "receiverWiringDetectUnsupported",
        100,
      );
      clearPoll();
      return;
    }

    const state = data.readU8();
    const comboIndex = data.readU8();
    const inverted = data.readU8();
    const halfDuplex = data.readU8();
    const pinSwap = data.readU8();
    data.readU16(); // elapsedMs - not currently surfaced in the UI

    if (state === RX_SERIAL_TRIAL.RUNNING) {
      setWizard(
        "receiverWiringDetectWizardStep1",
        "receiverWiringDetectScanning",
        Math.round(((comboIndex + 1) / COMBO_COUNT) * 100),
        [comboIndex + 1, COMBO_COUNT],
      );
      onButtonDisabled(true);
      clearPoll();
      pollTimer = setTimeout(() => {
        queryTrial(false).catch(onQueryFailed);
      }, POLL_INTERVAL_MS);
      return;
    }

    onButtonDisabled(false);
    clearPoll();

    if (state === RX_SERIAL_TRIAL.SUCCESS) {
      // Apply now, while the combo is still live and reflected in this
      // response - this is the only place the result becomes visible. The
      // caller's onDetected writes it into FC.RX_CONFIG, which rides that
      // tab's existing dirty-diff/Save/Revert flow exactly like any
      // manually-edited field.
      //
      // Deliberately NOT calling stopTrial() here - the firmware leaves a
      // successful combo live so the rest of the tab (channel bars, link
      // status) can confirm it for real while this dialog is still open.
      // stopTrial() still fires from handleDialogClose() once the user
      // actually closes the dialog, or from "Save & Reboot" superseding it
      // entirely.
      onDetected(inverted, halfDuplex, pinSwap);

      // Deliberately no auto-close - closing without the user clicking
      // "Save and Reboot" discards the result (the caller's onClose reverts
      // FC.RX_CONFIG since `saved` never got set), so an unattended
      // auto-close would silently throw away a successful detection. The
      // result sits here until the user takes an explicit action.
      setWizard(
        "receiverWiringDetectWizardStep2",
        "receiverWiringDetectSuccess",
        100,
        [yesNo(inverted), yesNo(halfDuplex), yesNo(pinSwap)],
        false,
        true,
      );
      return;
    }

    if (state === RX_SERIAL_TRIAL.FAILED) {
      stopTrial();
      setWizard(
        "receiverWiringDetectWizardStep2",
        "receiverWiringDetectFailed",
        100,
        [],
        true,
      );
      return;
    }

    if (state === RX_SERIAL_TRIAL.REJECTED) {
      setWizard(
        "receiverWiringDetectWizardStep2",
        "receiverWiringDetectRejected",
        100,
      );
      return;
    }

    // IDLE - shouldn't normally be observed mid-wizard, but handle it rather
    // than getting stuck if it ever is.
    setWizard(
      "receiverWiringDetectWizardStep1",
      "receiverWiringDetectScanning",
      0,
      [1, COMBO_COUNT],
    );
  }

  function onClickRetry() {
    setWizard(
      "receiverWiringDetectWizardStep1",
      "receiverWiringDetectScanning",
      0,
      [1, COMBO_COUNT],
    );
    queryTrial(true).catch(onQueryFailed);
  }

  function onClickClose() {
    dialogEl.close();
  }

  function onClickSaveReboot() {
    onSaveRequested?.();
    // The save flow itself reboots and reinitialises the whole connection,
    // so there's nothing left for this dialog to keep polling for - close it
    // rather than leaving it sitting open through that.
    dialogEl.close();
  }

  // Single source of truth for "this wizard is done" - a native <dialog>
  // fires `close` whether it was closed via our own dialogEl.close() calls
  // or the browser's own dismissal paths (Escape, backdrop click), which
  // never go through our click handlers. Always stop the trial here so a
  // scan abandoned mid-flight doesn't leave the FC sitting on a wiring
  // combo indefinitely (the firmware's own watchdog is the backstop if even
  // this doesn't arrive - e.g. the whole app closing).
  function handleDialogClose() {
    clearPoll();
    stopTrial();
    onButtonDisabled(false);
    onClose();
  }

  export function stop() {
    clearPoll();
    stopTrial();
  }

  onMount(() => {
    dialogEl.showModal();
    setWizard(
      "receiverWiringDetectWizardStep1",
      "receiverWiringDetectScanning",
      0,
      [1, COMBO_COUNT],
    );
    queryTrial(true).catch(onQueryFailed);
  });
</script>

<dialog bind:this={dialogEl} onclose={handleDialogClose}>
  <h3>{$i18n.t("receiverWiringDetectWizardTitle")}</h3>
  <div class="wizard-step">{wizardStep}</div>
  <div class="wizard-detail">{wizardDetail}</div>
  <div class="wizard-progress" aria-hidden="true">
    <div class="wizard-progress-fill" style:width="{wizardProgress}%"></div>
  </div>
  <div class="wizard-actions">
    {#if canRetry}
      <button class="btn" onclick={onClickRetry}>
        {$i18n.t("receiverWiringDetectWizardRetry")}
      </button>
    {/if}
    <button class="btn" onclick={onClickClose}>
      {$i18n.t("receiverWiringDetectWizardClose")}
    </button>
    {#if canSave}
      <button class="btn btn-primary" onclick={onClickSaveReboot}>
        {$i18n.t("buttonSaveReboot")}
      </button>
    {/if}
  </div>
</dialog>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn-primary {
    color: var(--color-text-alt);
    background-color: var(--color-accent-500);

    @media (hover: hover) {
      &:hover {
        background-color: var(--color-accent-400);
      }
    }

    &:active {
      background-color: var(--color-accent-600);
    }
  }

  dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(400px, calc(100% - 2em));
    border-radius: 4px;
  }

  dialog h3 {
    margin: 0 0 12px;
  }

  .wizard-step {
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .wizard-detail {
    font-size: 0.75rem;
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .wizard-progress {
    width: 100%;
    height: 6px;
    border-radius: 2px;
    background: var(--color-border);
    overflow: hidden;
  }

  .wizard-progress-fill {
    height: 100%;
    background: var(--color-accent-500);
    transition: width 180ms ease-out;
  }

  .wizard-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;
  }
</style>

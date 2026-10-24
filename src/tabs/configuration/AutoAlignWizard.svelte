<script>
  import { onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  let { onButtonDisabled, onClose } = $props();

  const BOARD_AUTO_ALIGN = {
    IDLE: 0,
    WAITING_FOR_TAIL_LIFT: 1,
    SUCCESS: 2,
    REJECTED_ARMED: 3,
    TIMEOUT: 4,
    NO_MATCH: 5,
    REJECTED_UNCALIBRATED: 6,
  };

  let dialogEl;
  let wizardStep = $state("");
  let wizardDetail = $state("");
  let wizardProgress = $state(0);
  let canRetry = $state(false);
  let canCalibrate = $state(false);

  let pollTimer;
  let autoCloseTimer;

  // MSP.promise() never rejects and has no timeout of its own on a real
  // (non-virtual) connection -- a single dropped/slow reply on the serial
  // link left this polling loop awaiting forever, which showed up as the
  // wizard permanently stuck mid-procedure. Race it against a local
  // timeout (same pattern as Configuration.svelte's attitude poll) and,
  // when it fires, resolve with null so the caller can just retry on the
  // next tick instead of hanging.
  function sendBoardAutoAlignQuery(startProcedure) {
    const payload = startProcedure ? [1] : false;

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
        MSPCodes.MSP2_BOARD_AUTO_ALIGN,
        payload,
        false,
        finish,
        true,
      );
    });
  }

  // Mirrors legacy's i18n.getMessage(key, [a, b, ...]) -- the Svelte i18n
  // store doesn't have that array-to-{1,2,...}-object convenience wrapper.
  function t(key, args = []) {
    const params = {};
    args.forEach((value, i) => (params[i + 1] = value));
    return $i18n.t(key, params);
  }

  function setWizard(
    stepKey,
    detailKey,
    progressPercent,
    detailArgs = [],
    retry = false,
    calibrate = false,
  ) {
    wizardStep = t(stepKey);
    wizardDetail = t(detailKey, detailArgs);
    wizardProgress = progressPercent;
    canRetry = retry;
    canCalibrate = calibrate;
  }

  function clearPoll() {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  function clearAutoClose() {
    clearInterval(autoCloseTimer);
    autoCloseTimer = null;
  }

  function startAutoCloseCountdown(roll, pitch, yaw, seconds = 3) {
    clearAutoClose();

    let remaining = seconds;
    setWizard(
      "configurationBoardAutoAlignWizardStep3",
      "configurationBoardAutoAlignSuccessCountdown",
      100,
      [roll, pitch, yaw, remaining],
    );

    autoCloseTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearAutoClose();
        dialogEl.close();
        return;
      }
      setWizard(
        "configurationBoardAutoAlignWizardStep3",
        "configurationBoardAutoAlignSuccessCountdown",
        100,
        [roll, pitch, yaw, remaining],
      );
    }, 1000);
  }

  function onQueryFailed() {
    setWizard(
      "configurationBoardAutoAlignWizardStep3",
      "configurationBoardAutoAlignUnsupported",
      100,
    );
    onButtonDisabled(false);
    clearPoll();
  }

  async function queryBoardAutoAlign(startProcedure = false) {
    const response = await sendBoardAutoAlignQuery(startProcedure);

    if (!response) {
      // No reply within the timeout -- don't give up on a single missed
      // packet, just poll again on the next tick.
      clearAutoClose();
      clearPoll();
      pollTimer = setTimeout(() => {
        queryBoardAutoAlign(false).catch(onQueryFailed);
      }, 250);
      return;
    }

    const { data } = response;

    if (!data || data.byteLength < 8) {
      clearAutoClose();
      onButtonDisabled(true);
      setWizard(
        "configurationBoardAutoAlignWizardStep3",
        "configurationBoardAutoAlignUnsupported",
        100,
      );
      clearPoll();
      return;
    }

    const state = data.readU8();
    const roll = data.read16();
    const pitch = data.read16();
    const yaw = data.read16();

    if (state === BOARD_AUTO_ALIGN.WAITING_FOR_TAIL_LIFT) {
      clearAutoClose();
      setWizard(
        "configurationBoardAutoAlignWizardStep2",
        "configurationBoardAutoAlignWaiting",
        60,
      );
      onButtonDisabled(true);
      clearPoll();
      pollTimer = setTimeout(() => {
        queryBoardAutoAlign(false).catch(onQueryFailed);
      }, 250);
      return;
    }

    onButtonDisabled(false);
    clearPoll();

    if (state === BOARD_AUTO_ALIGN.SUCCESS) {
      FC.BOARD_ALIGNMENT_CONFIG.roll = roll;
      FC.BOARD_ALIGNMENT_CONFIG.pitch = pitch;
      FC.BOARD_ALIGNMENT_CONFIG.yaw = yaw;

      setWizard(
        "configurationBoardAutoAlignWizardStep3",
        "configurationBoardAutoAlignSuccessCountdown",
        100,
        [roll, pitch, yaw, 3],
      );
      startAutoCloseCountdown(roll, pitch, yaw, 3);
      return;
    }

    if (state === BOARD_AUTO_ALIGN.REJECTED_ARMED) {
      clearAutoClose();
      setWizard(
        "configurationBoardAutoAlignWizardStep1",
        "configurationBoardAutoAlignDisarmRequired",
        100,
        [],
        true,
      );
      return;
    }

    if (state === BOARD_AUTO_ALIGN.REJECTED_UNCALIBRATED) {
      clearAutoClose();
      setWizard(
        "configurationBoardAutoAlignWizardStep1",
        "configurationBoardAutoAlignUncalibrated",
        100,
        [],
        false,
        true,
      );
      return;
    }

    if (state === BOARD_AUTO_ALIGN.TIMEOUT) {
      clearAutoClose();
      setWizard(
        "configurationBoardAutoAlignWizardStep2",
        "configurationBoardAutoAlignTimeout",
        100,
        [],
        true,
      );
      return;
    }

    if (state === BOARD_AUTO_ALIGN.NO_MATCH) {
      clearAutoClose();
      setWizard(
        "configurationBoardAutoAlignWizardStep2",
        "configurationBoardAutoAlignNoMatch",
        100,
        [],
        true,
      );
      return;
    }

    clearAutoClose();
    setWizard(
      "configurationBoardAutoAlignWizardStep1",
      "configurationBoardAutoAlignIdle",
      0,
    );
  }

  function onClickRetry() {
    clearAutoClose();
    setWizard(
      "configurationBoardAutoAlignWizardStep1",
      "configurationBoardAutoAlignStarting",
      25,
    );
    queryBoardAutoAlign(true).catch(onQueryFailed);
  }

  function onClickCalibrate() {
    clearAutoClose();
    clearPoll();

    setWizard(
      "configurationBoardAutoAlignWizardStep1",
      "configurationBoardAutoAlignCalibrating",
      10,
    );

    // Same pattern as Setup's accel calibration: the MCU is locked in a
    // blocking loop for the duration of the calibration and can't process
    // other MSP traffic, so the poll timer must stay cleared until the
    // fixed wait below has elapsed.
    MSP.send_message(MSPCodes.MSP_ACC_CALIBRATION, false, false, () => {
      GUI.log($i18n.t("initialSetupAccelCalibStarted"));
    });

    GUI.timeout_add(
      "board_auto_align_calibrate_wait",
      () => {
        GUI.log($i18n.t("initialSetupAccelCalibEnded"));
        setWizard(
          "configurationBoardAutoAlignWizardStep1",
          "configurationBoardAutoAlignStarting",
          25,
        );
        queryBoardAutoAlign(true).catch(onQueryFailed);
      },
      2000,
    );
  }

  function onClickClose() {
    dialogEl.close();
  }

  // The single source of truth for "this wizard is done": a native <dialog>
  // fires `close` whether it was closed via our own dialogEl.close() calls
  // (button clicks, the success auto-close countdown) or via the browser's
  // own dismissal paths (Escape key, backdrop click) that never go through
  // our click handlers. Relying only on the latter left the parent's
  // "wizard is open" state (and the model-polling pause it drives) stuck
  // permanently on if the dialog was ever dismissed that way.
  function handleDialogClose() {
    clearPoll();
    clearAutoClose();
    onButtonDisabled(false);
    onClose();
  }

  export function stop() {
    clearPoll();
    clearAutoClose();
  }

  onMount(() => {
    dialogEl.showModal();
    setWizard(
      "configurationBoardAutoAlignWizardStep1",
      "configurationBoardAutoAlignStarting",
      25,
    );
    queryBoardAutoAlign(true).catch(onQueryFailed);
  });
</script>

<dialog bind:this={dialogEl} onclose={handleDialogClose}>
  <h3>{$i18n.t("configurationBoardAutoAlignWizardTitle")}</h3>
  <div class="wizard-step">{wizardStep}</div>
  <div class="wizard-detail">{wizardDetail}</div>
  <div class="wizard-progress" aria-hidden="true">
    <div class="wizard-progress-fill" style:width="{wizardProgress}%"></div>
  </div>
  <div class="wizard-actions">
    {#if canCalibrate}
      <button class="btn" onclick={onClickCalibrate}>
        {$i18n.t("configurationBoardAutoAlignWizardCalibrate")}
      </button>
    {/if}
    {#if canRetry}
      <button class="btn" onclick={onClickRetry}>
        {$i18n.t("configurationBoardAutoAlignWizardRetry")}
      </button>
    {/if}
    <button class="btn" onclick={onClickClose}>
      {$i18n.t("configurationBoardAutoAlignWizardClose")}
    </button>
  </div>
</dialog>

<style lang="scss">
  .btn {
    @extend %button;
  }

  dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(400px, calc(100% - 2em));
    border-radius: var(--radius-lg);
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
    border-radius: var(--radius-xs);
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

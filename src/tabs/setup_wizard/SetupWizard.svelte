<script>
  import semver from "semver";
  import { onDestroy, onMount, setContext } from "svelte";

  import Page from "@/components/Page.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import {
    API_VERSION_12_8,
    API_VERSION_12_9,
    API_VERSION_12_10,
    CONFIGURATOR,
  } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { bit_check, reinitialiseConnection } from "@/js/serial_backend";

  import StepConnect from "./StepConnect.svelte";
  import StepDirection from "./StepDirection.svelte";
  import StepEscTelemetry from "./StepEscTelemetry.svelte";
  import StepFinish from "./StepFinish.svelte";
  import StepGyro from "./StepGyro.svelte";
  import StepLevel from "./StepLevel.svelte";
  import StepModes from "./StepModes.svelte";
  import StepMotor from "./StepMotor.svelte";
  import StepPitch from "./StepPitch.svelte";
  import StepProfiles from "./StepProfiles.svelte";
  import StepReceiver from "./StepReceiver.svelte";
  import StepSensors from "./StepSensors.svelte";
  import StepServoType from "./StepServoType.svelte";
  import StepServos from "./StepServos.svelte";
  import StepSwash from "./StepSwash.svelte";
  import StepTail from "./StepTail.svelte";
  import StepThrottle from "./StepThrottle.svelte";
  import { STABILIZED_AXES, missingServos, wizardServos } from "./heli.js";

  // Order follows how the helicopter is put together. First everything that
  // is only typed in, with the servos unplugged, so their type and frame
  // rate are on the FC before anything powers them. Then the gate, which
  // does the one reboot those settings need. Then the bench work, in the
  // order of the "Servo Setup" and "Mixer Setup" docs pages: each step
  // relies on the ones before it (servos are centred before the swash is
  // levelled, the swash is levelled before the pitch is measured).
  const STEPS = [
    { key: "sensors", component: StepSensors },
    // Before anything that uses the sticks. Reboots by itself, as the
    // signal check needs the new port and protocol.
    { key: "receiver", component: StepReceiver },
    // Assigned while the radio is in hand; armed only in the Finish step.
    { key: "modes", component: StepModes },
    // Profiles, rates and master gain on switches; fits 8 channels.
    { key: "profiles", component: StepProfiles },
    { key: "swash", component: StepSwash },
    { key: "servoType", component: StepServoType },
    { key: "motor", component: StepMotor },
    { key: "connect", component: StepConnect, gate: true },
    // Battery off at the start, on at the end.
    { key: "throttle", component: StepThrottle },
    // Optional: skipped with Next when the ESC has no telemetry. Needs the
    // ESC powered to check it.
    { key: "escTelemetry", component: StepEscTelemetry },
    { key: "servos", component: StepServos },
    { key: "direction", component: StepDirection },
    { key: "level", component: StepLevel },
    { key: "pitch", component: StepPitch },
    { key: "tail", component: StepTail },
    { key: "gyro", component: StepGyro },
    { key: "finish", component: StepFinish },
  ];
  const GATE_INDEX = STEPS.findIndex((s) => s.gate);

  const STEP_STORAGE_KEY = "setupWizardStep";
  const PWM_SERVO_SLOTS = 8;
  const BUS_SERVO_CHANNELS = 18;
  const SERVO_OVERRIDE_OFF = 2001;
  const POLL_MS = 200;

  let loading = $state(true);
  let stepIndex = $state(readStoredStep());
  let pending = $state(false);
  let saving = $state(false);
  let armed = $state(false);
  // Set by the steps before the gate whose settings only apply after a
  // reboot; the gate does it once for all of them. Any reboot reloads the
  // tab, which clears it.
  let rebootPending = $state(false);
  let commitFn = null;
  let leaveFn = null;
  let snapshot = null;
  let pollTimer;
  let stopped = false;

  function readStoredStep() {
    try {
      // Stored by key, so adding a step doesn't move a saved position.
      const index = STEPS.findIndex(
        (s) => s.key === localStorage.getItem(STEP_STORAGE_KEY),
      );
      return Math.max(index, 0);
    } catch {
      return 0;
    }
  }

  function storeStep(index) {
    try {
      localStorage.setItem(STEP_STORAGE_KEY, STEPS[index].key);
    } catch {
      // Remembering the step is a convenience only.
    }
  }

  // PWM servos only, as counted by the Servos tab: with FBUS/SBUS out on,
  // FC.CONFIG.servoCount includes the bus servos too. Mixer output N drives
  // FC.SERVO_CONFIG[N - 1] and servo override N - 1 directly.
  let busActive = $derived(
    semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9) &&
      (FC.SERIAL_CONFIG.ports ?? []).some(
        (port) =>
          port.functions?.includes("FBUS_OUT") ||
          port.functions?.includes("SBUS_OUT"),
      ),
  );
  let servoCount = $derived(
    Math.min(
      busActive
        ? Math.max(0, FC.SERVO_CONFIG.length - BUS_SERVO_CHANNELS)
        : (FC.CONFIG.servoCount ?? 0),
      PWM_SERVO_SLOTS,
      FC.SERVO_CONFIG.length,
    ),
  );

  let servos = $derived(wizardServos(FC.MIXER_CONFIG, servoCount));
  let missing = $derived(missingServos(FC.MIXER_CONFIG, servoCount));
  let motorised = $derived(
    FC.MIXER_CONFIG.tail_rotor_mode !== Mixer.TAIL_MODE_VARIABLE,
  );

  function takeSnapshot() {
    snapshot = $state.snapshot({
      SERVO_CONFIG: FC.SERVO_CONFIG,
      MIXER_INPUTS: FC.MIXER_INPUTS,
      MIXER_CONFIG: FC.MIXER_CONFIG,
      // Sent live by the Mode switches and Profile switch steps.
      MODE_RANGES: FC.MODE_RANGES,
      MODE_RANGES_EXTRA: FC.MODE_RANGES_EXTRA,
      ADJUSTMENT_RANGES: FC.ADJUSTMENT_RANGES,
      // Staged by a step and only sent by its commit, so Revert has
      // nothing to send for these: putting them back is enough.
      BOARD_ALIGNMENT_CONFIG: FC.BOARD_ALIGNMENT_CONFIG,
      SERIAL_CONFIG: FC.SERIAL_CONFIG,
      RX_CONFIG: FC.RX_CONFIG,
      RC_MAP: FC.RC_MAP,
      MOTOR_CONFIG: FC.MOTOR_CONFIG,
      ESC_SENSOR_CONFIG: FC.ESC_SENSOR_CONFIG,
      features: FC.FEATURE_CONFIG.features.bitfield,
    });
  }

  function isArmed() {
    const index = FC.AUX_CONFIG.indexOf("ARM");
    return index >= 0 && bit_check(FC.CONFIG.mode, index);
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_BOXNAMES);
    await MSP.promise(MSPCodes.MSP_BOXIDS);
    await MSP.promise(MSPCodes.MSP_MODE_RANGES);
    await MSP.promise(MSPCodes.MSP_MODE_RANGES_EXTRA);
    await MSP.promise(MSPCodes.MSP_ADJUSTMENT_RANGES);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_BOARD_ALIGNMENT_CONFIG);
    await MSP.promise(MSPCodes.MSP_SERIAL_CONFIG);
    await MSP.promise(MSPCodes.MSP_RX_MAP);
    await MSP.promise(MSPCodes.MSP_RX_CONFIG);
    await MSP.promise(MSPCodes.MSP_RC_CONFIG);
    await MSP.promise(MSPCodes.MSP_MOTOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_ESC_SENSOR_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_INPUTS);
    await MSP.promise(MSPCodes.MSP_MIXER_OVERRIDE);
    await MSP.promise(MSPCodes.MSP_SERVO_CONFIGURATIONS);
    await MSP.promise(MSPCodes.MSP_SERVO_OVERRIDE);
    await MSP.promise(MSPCodes.MSP_SERVO);

    takeSnapshot();
    // Start from no overrides at all: one left on (by the Servos or Mixer
    // tab, or by a step before the tab was reloaded) would hold its servo
    // still and make every later check look wrong. Steps that need one set
    // it themselves when they open.
    releaseAll();
    armed = isArmed();
    loading = false;

    // Self-rescheduling, not setInterval: see Motors.svelte.
    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_SERVO);
      await MSP.promise(MSPCodes.MSP_STATUS);
      armed = isArmed();
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    }
    poll();
  });

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
    clearInterval(overrideRefresh);
    leaveFn?.();
    releaseAll();
  });

  //// Overrides. Both kinds are RAM only, ignored while armed and block
  //// arming while on (ARMING_DISABLED_OVERRIDE), so a closed app or a
  //// pulled cable can't leave the heli flyable with a servo held.
  ////
  //// From API 12.10 each hold is sent with a timeout and re-sent every
  //// OVERRIDE_REFRESH_MS, so the FC drops it by itself if the wizard goes
  //// away. Older firmware has no timeouts: there an override left behind
  //// stays (and blocks arming) until the FC reboots. Releases are sent
  //// without one, which clears the override at once.

  const OVERRIDE_TIMEOUT_MS = 3000;
  const OVERRIDE_REFRESH_MS = 1000;
  const timedOverrides =
    CONFIGURATOR.virtualMode ||
    semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_10);
  const overrideRefresh = timedOverrides
    ? setInterval(refreshOverrides, OVERRIDE_REFRESH_MS)
    : null;

  function overrideTimeout(held) {
    return timedOverrides && held ? OVERRIDE_TIMEOUT_MS : undefined;
  }

  function refreshOverrides() {
    for (const input of STABILIZED_AXES) {
      if (FC.MIXER_OVERRIDE[input] !== Mixer.OVERRIDE_OFF) {
        mspHelper.sendMixerOverride(input, undefined, OVERRIDE_TIMEOUT_MS);
      }
    }
    for (let i = 0; i < servoCount; i++) {
      if (FC.SERVO_OVERRIDE[i] !== SERVO_OVERRIDE_OFF) {
        mspHelper.sendServoOverride(i, undefined, OVERRIDE_TIMEOUT_MS);
      }
    }
  }

  function holdMixer(input, raw) {
    FC.MIXER_OVERRIDE[input] = raw;
    mspHelper.sendMixerOverride(
      input,
      undefined,
      overrideTimeout(raw !== Mixer.OVERRIDE_OFF),
    );
  }

  // The sticks drive the input, without the stabilizer. Firmware before
  // API 12.8 has no passthrough: there the input is left to the stabilizer,
  // which also follows the sticks while disarmed (with the gyro mixed in).
  const hasPassthrough = semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8);

  function passthroughMixer(input) {
    if (hasPassthrough) {
      holdMixer(input, Mixer.OVERRIDE_PASSTHROUGH);
    } else {
      releaseMixer(input);
    }
  }

  function releaseMixer(input) {
    if (FC.MIXER_OVERRIDE[input] === Mixer.OVERRIDE_OFF) return;
    holdMixer(input, Mixer.OVERRIDE_OFF);
  }

  function releaseMixers() {
    for (const input of STABILIZED_AXES) {
      releaseMixer(input);
    }
  }

  function holdServo(servo, raw) {
    FC.SERVO_OVERRIDE[servo] = Math.max(-2000, Math.min(2000, Math.round(raw)));
    mspHelper.sendServoOverride(servo, undefined, overrideTimeout(true));
  }

  function releaseServo(servo) {
    if (FC.SERVO_OVERRIDE[servo] === SERVO_OVERRIDE_OFF) return;
    FC.SERVO_OVERRIDE[servo] = SERVO_OVERRIDE_OFF;
    mspHelper.sendServoOverride(servo);
  }

  function releaseServos() {
    for (let i = 0; i < servoCount; i++) {
      releaseServo(i);
    }
  }

  function releaseAll() {
    releaseMixers();
    releaseServos();
  }

  //// Live changes. Every edit goes to the FC straight away so the servos
  //// move; Save writes them to EEPROM.

  function sendServo(servo) {
    mspHelper.sendServoConfig(servo);
    pending = true;
  }

  function sendMixerInput(input) {
    mspHelper.sendMixerInput(input);
    pending = true;
  }

  function sendMixerConfig() {
    MSP.send_message(
      MSPCodes.MSP_SET_MIXER_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_MIXER_CONFIG),
    );
    pending = true;
  }

  function markChanged() {
    pending = true;
  }

  // False when the step's commit reports something it couldn't do: the
  // rest is still saved, but Next stays on the step so it's seen.
  async function save() {
    saving = true;
    try {
      let ok = true;
      if (commitFn) {
        ok = (await commitFn()) !== false;
      }
      await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
      GUI.log($i18n.t("eepromSaved"));
      pending = false;
      takeSnapshot();
      return ok;
    } finally {
      saving = false;
    }
  }

  // Steps whose settings only apply after a reboot (swash type, tail mode,
  // servo rate, receiver, ESC protocol, board alignment). After the
  // reconnect the wizard reopens on the same step, so the user can check
  // the result before moving on.
  async function saveAndReboot() {
    releaseAll();
    await save();
    storeStep(stepIndex);
    rebootPending = false;
    // A virtual FC doesn't reboot or reconnect, so nothing would use it.
    if (!CONFIGURATOR.virtualMode) GUI.tabAfterReboot = "setup_wizard";
    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));
    reinitialiseConnection();
  }

  async function revert() {
    if (!snapshot) return;
    FC.MODE_RANGES = snapshot.MODE_RANGES;
    FC.MODE_RANGES_EXTRA = snapshot.MODE_RANGES_EXTRA;
    await new Promise((resolve) => mspHelper.sendModeRanges(resolve));
    FC.ADJUSTMENT_RANGES = snapshot.ADJUSTMENT_RANGES;
    await new Promise((resolve) => mspHelper.sendAdjustmentRanges(resolve));
    FC.SERVO_CONFIG = snapshot.SERVO_CONFIG;
    FC.MIXER_INPUTS = snapshot.MIXER_INPUTS;
    FC.MIXER_CONFIG = snapshot.MIXER_CONFIG;
    await new Promise((resolve) => mspHelper.sendServoConfigurations(resolve));
    await new Promise((resolve) => mspHelper.sendMixerInputs(resolve));
    await MSP.promise(
      MSPCodes.MSP_SET_MIXER_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_MIXER_CONFIG),
    );
    FC.BOARD_ALIGNMENT_CONFIG = snapshot.BOARD_ALIGNMENT_CONFIG;
    FC.SERIAL_CONFIG = snapshot.SERIAL_CONFIG;
    FC.RX_CONFIG = snapshot.RX_CONFIG;
    FC.RC_MAP = snapshot.RC_MAP;
    FC.MOTOR_CONFIG = snapshot.MOTOR_CONFIG;
    FC.ESC_SENSOR_CONFIG = snapshot.ESC_SENSOR_CONFIG;
    FC.FEATURE_CONFIG.features.bitfield = snapshot.features;
    pending = false;
    takeSnapshot();
  }

  function openTab(tabName) {
    document
      .querySelector(`#tabs ul.mode-connected .tab_${tabName} a`)
      ?.click();
  }

  // Shared with every step component.
  setContext("setupWizard", {
    get servos() {
      return servos;
    },
    get servoCount() {
      return servoCount;
    },
    get motorised() {
      return motorised;
    },
    hasPassthrough,
    get armed() {
      return armed;
    },
    get pending() {
      return pending;
    },
    get saving() {
      return saving;
    },
    get rebootPending() {
      return rebootPending;
    },
    save,
    saveAndReboot,
    // A setting that only applies after a reboot, left for the gate.
    requestReboot() {
      rebootPending = true;
    },
    holdMixer,
    passthroughMixer,
    releaseMixer,
    releaseMixers,
    holdServo,
    releaseServo,
    releaseServos,
    sendServo,
    sendMixerInput,
    sendMixerConfig,
    markChanged,
    openTab,
    goToStep(key) {
      goTo(STEPS.findIndex((s) => s.key === key));
    },
    // A step that stages edits instead of sending them live registers how to
    // send them; Save runs it before the EEPROM write.
    setCommit(fn) {
      commitFn = fn;
    },
    // Runs when the step is left (another step, another tab).
    setLeave(fn) {
      leaveFn = fn;
    },
    servoLabel(servo) {
      return $i18n.t("setupWizardServoLabel", {
        1: servo.servo + 1,
        2: $i18n.t(servo.role),
      });
    },
  });

  function goTo(index) {
    if (index === stepIndex || index < 0 || index >= STEPS.length) return;
    leaveFn?.();
    leaveFn = null;
    commitFn = null;
    releaseAll();
    stepIndex = index;
    storeStep(index);
  }

  let rebootOnNext = $derived(STEPS[stepIndex].gate && rebootPending);

  // The gate reboots and reopens on itself: the servos are plugged in only
  // once the FC runs their new frame rate.
  async function next() {
    if (rebootOnNext) {
      await saveAndReboot();
      return;
    }
    if (pending && !(await save())) {
      return;
    }
    goTo(stepIndex + 1);
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabSetupWizard"), "_system");
  }

  export function isDirty() {
    return pending;
  }

  export async function onSave() {
    await save();
  }

  export async function onRevert() {
    await revert();
  }

  let Current = $derived(STEPS[stepIndex].component);
</script>

{#snippet header()}
  <h1>{$i18n.t("tabSetupWizard")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

<Page {header} {loading}>
  <div class="layout">
    <nav class="steps" aria-label={$i18n.t("tabSetupWizard")}>
      <ol>
        {#each STEPS as step, i (step.key)}
          <li>
            <button
              class={[
                "step",
                i === stepIndex && "active",
                i < stepIndex && "done",
              ]}
              aria-current={i === stepIndex ? "step" : undefined}
              onclick={() => goTo(i)}
            >
              <span class="number">
                {#if i < stepIndex}
                  <i class="fas fa-check" aria-hidden="true"></i>
                {:else}
                  {i + 1}
                {/if}
              </span>
              <span class="label">{$i18n.t(`setupWizardStep_${step.key}`)}</span
              >
            </button>
          </li>
        {/each}
      </ol>
    </nav>

    <div class="content">
      {#if armed}
        <div class="banner warn">{$i18n.t("setupWizardArmedWarning")}</div>
      {/if}
      {#if missing.length > 0}
        <div class="banner warn">
          {$i18n.t("setupWizardServosMissing", {
            1: missing.join(", "),
            2: servoCount,
          })}
        </div>
      {/if}
      {#if rebootPending && stepIndex > GATE_INDEX}
        <div class="banner warn">
          {$i18n.t("setupWizardRebootSkipped")}
          <button class="btn" onclick={() => goTo(GATE_INDEX)}>
            {$i18n.t(`setupWizardStep_${STEPS[GATE_INDEX].key}`)}
          </button>
        </div>
      {/if}
      {#if busActive}
        <div class="banner">{$i18n.t("setupWizardBusServos")}</div>
      {/if}

      <section class="panel">
        <header class="panel-head">
          <span class="counter">
            {$i18n.t("setupWizardStepCounter", {
              1: stepIndex + 1,
              2: STEPS.length,
            })}
          </span>
          <h2>{$i18n.t(`setupWizardStep_${STEPS[stepIndex].key}`)}</h2>
          <div
            class="progress"
            role="progressbar"
            aria-valuemin="1"
            aria-valuemax={STEPS.length}
            aria-valuenow={stepIndex + 1}
          >
            <div
              class="progress-fill"
              style:width="{((stepIndex + 1) / STEPS.length) * 100}%"
            ></div>
          </div>
        </header>

        {#key stepIndex}
          <div class="step-body">
            <Current />
          </div>
        {/key}

        <footer class="footer">
          <button
            class="btn"
            disabled={stepIndex === 0}
            onclick={() => goTo(stepIndex - 1)}
          >
            <i class="fas fa-arrow-left" aria-hidden="true"></i>
            {$i18n.t("setupWizardBack")}
          </button>
          <div class="grow"></div>
          <!-- The last step has its own Finish button. -->
          {#if stepIndex < STEPS.length - 1}
            {#if pending}
              <span class="unsaved">{$i18n.t("setupWizardUnsaved")}</span>
            {/if}
            <button class="btn primary" disabled={saving} onclick={next}>
              {rebootOnNext
                ? $i18n.t("setupWizardRebootNext")
                : pending
                  ? $i18n.t("setupWizardSaveNext")
                  : $i18n.t("setupWizardNext")}
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </button>
          {/if}
        </footer>
      </section>
    </div>
  </div>
</Page>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .grow {
    flex: 1;
  }

  .layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: var(--section-gap);
    align-items: start;
    max-width: 1240px;
    padding-top: var(--section-gap);
  }

  /* Step list */

  .steps {
    @extend %section-shadow;
    position: sticky;
    top: var(--section-gap);
    padding: 8px;
    background-color: var(--color-surface);
  }

  .steps ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--color-text-soft);
    text-align: left;
    cursor: pointer;
    font: inherit;
    transition: background-color var(--animation-speed);

    &:hover {
      background-color: var(--color-hover);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    &.active {
      background-color: var(--color-accent-soft);
      color: var(--color-text);
      font-weight: 600;

      .number {
        border-color: var(--color-accent-500);
        background-color: var(--color-accent-500);
        color: var(--color-accent-fg);
      }
    }

    &.done .number {
      border-color: var(--color-accent-500);
      color: var(--color-accent-500);
    }
  }

  .number {
    flex: 0 0 24px;
    height: 24px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    transition:
      background-color var(--animation-speed),
      border-color var(--animation-speed);

    i {
      font-size: 0.85em;
    }
  }

  /* Step panel */

  .content {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
    min-width: 0;
  }

  .panel {
    @extend %section-shadow;
    background-color: var(--color-surface);
  }

  .panel-head {
    display: grid;
    gap: 2px;
    padding: 16px 24px 0;
  }

  .counter {
    color: var(--color-accent-500);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0 0 12px;
    font-size: 1.4em;
    line-height: 1.2;
  }

  .progress {
    height: 3px;
    margin: 0 -24px;
    background-color: var(--color-border-soft);
  }

  .progress-fill {
    height: 100%;
    background-color: var(--color-accent-500);
    transition: width var(--animation-speed-slow);
  }

  .step-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px 24px 24px;
    line-height: 1.5;
  }

  .footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    background-color: var(--color-surface-sunken);
    border-top: 1px solid var(--color-border-soft);

    .btn {
      height: 2rem;
      padding: 0 16px;
    }
  }

  .banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-left-width: 4px;

    &.warn {
      border-color: var(--color-yellow-500);
    }
  }

  .unsaved {
    color: var(--color-text-soft);
    font-size: 0.9em;
  }

  /* Building blocks shared by the steps. Buttons stay in each step (they */
  /* need @extend, which can't reach another component's markup). */

  .step-body :global {
    p {
      margin: 0;
      max-width: 70ch;
    }

    .intro {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* A picture beside its text: <div class="with-art"><div class="art">
       ...</div><div class="text">...</div></div>. */
    .with-art {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px 24px;

      > .art {
        flex: 0 0 auto;
        width: 150px;
        display: flex;
        justify-content: center;
      }

      > .text {
        flex: 1 1 280px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }
    }

    .muted {
      color: var(--color-text-soft);
      font-size: 0.9em;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }

    /* A highlighted call to action, e.g. Save & Reboot. */
    .callout {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid var(--color-accent-500);
      border-radius: var(--radius-md);
      background-color: var(--color-accent-soft);

      > span {
        flex: 1;
      }
    }

    .note {
      padding: 10px 14px;
      border-left: 4px solid var(--color-yellow-500);
      background-color: var(--color-surface-sunken);
      border-radius: var(--radius-xs);
      max-width: 70ch;
    }

    .good-text {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--color-status-good);
      font-weight: 600;
    }

    /* Numbered cards, one per part of a step. */

    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
      background-color: var(--color-surface-sunken);

      &.complete {
        border-color: var(--color-status-good);
      }
    }

    h3 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 10px;
      margin: 0;
      font-size: 1em;
      font-weight: 700;
    }

    .num {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: var(--color-accent-500);
      color: var(--color-accent-fg);
      font-size: 0.8em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px;
      border: 1px solid currentColor;
      border-radius: var(--radius-pill);
      font-size: 0.8em;
      font-weight: 600;

      &.good {
        color: var(--color-status-good);
      }

      &.bad {
        color: var(--color-status-bad);
      }

      &.warn {
        color: var(--color-warning);
      }
    }

    .pill {
      align-self: flex-start;
      padding: 1px 8px;
      border-radius: var(--radius-pill);
      background-color: var(--color-hover);
      color: var(--color-text-soft);
      font-size: 0.85em;
      font-variant-numeric: tabular-nums;
    }

    /* Choice tiles: a grid of radio-like buttons. */

    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 10px;
    }

    .tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 10px 12px;
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
      background-color: var(--color-surface);
      color: var(--color-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition:
        border-color var(--animation-speed),
        background-color var(--animation-speed),
        box-shadow var(--animation-speed);

      &:hover:not(:disabled) {
        border-color: var(--color-border);
      }

      &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px var(--color-focus-ring);
      }

      &.selected {
        border-color: var(--color-accent-500);
        background-color: var(--color-accent-soft);
        box-shadow: inset 0 0 0 1px var(--color-accent-500);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        background-color: transparent;
      }

      i {
        color: var(--color-accent-500);
      }
    }

    .tile-name {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
    }

    /* -10 -1 [value] +1 +10 */

    .nudges {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .value {
      min-width: 6ch;
      padding: 0 6px;
      text-align: center;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  }

  /* Narrow screens: the step list becomes a scrolling strip of numbers. */

  @media only screen and (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .steps {
      position: static;
      overflow-x: auto;
    }

    .steps ol {
      flex-direction: row;
    }

    .step {
      width: auto;

      .label {
        display: none;
      }

      &.active .label {
        display: inline;
        white-space: nowrap;
      }
    }

    .panel-head,
    .step-body,
    .footer {
      padding-left: 16px;
      padding-right: 16px;
    }

    .progress {
      margin: 0 -16px;
    }
  }
</style>

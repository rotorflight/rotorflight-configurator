<script>
  import { getContext } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import govState from "@/tabs/governor/state.svelte.js";
  import motorState from "@/tabs/motors/state.svelte.js";

  import HeliSide from "./HeliSide.svelte";
  import MotorGearArt from "./MotorGearArt.svelte";
  import RebootLater from "./RebootLater.svelte";
  import TabButton from "./TabButton.svelte";

  const wiz = getContext("setupWizard");

  // The usual heli ESC protocols as tiles; anything else from the list.
  // DShot600 stays in the list: it is fussy about long, noisy ESC leads.
  const COMMON = ["PWM", "DSHOT150", "DSHOT300"];

  let changed = $state(false);

  wiz.setCommit(async () => {
    if (!changed) return;
    // Castle Link telemetry and ESC_SENSOR follow the protocol.
    motorState.fixConfig();
    for (const code of [
      MSPCodes.MSP_SET_FEATURE_CONFIG,
      MSPCodes.MSP_SET_MOTOR_CONFIG,
      MSPCodes.MSP_SET_ESC_SENSOR_CONFIG,
    ]) {
      await MSP.promise(code, mspHelper.crunch(code));
    }
  });

  function markChanged() {
    changed = true;
    wiz.markChanged();
    wiz.requestReboot();
  }

  let protocols = $derived(
    motorState.throttleProtocols
      .map((name, index) => ({ name, index }))
      .filter((p) => p.name),
  );
  let common = $derived(protocols.filter((p) => COMMON.includes(p.name)));
  let protocolName = $derived(
    motorState.throttleProtocols[FC.MOTOR_CONFIG.motor_pwm_protocol],
  );

  function setProtocol(index) {
    if (FC.MOTOR_CONFIG.motor_pwm_protocol === index) return;
    FC.MOTOR_CONFIG.motor_pwm_protocol = index;
    // No bidirectional DShot on DShot150, and an ESC that doesn't answer
    // the request may not arm.
    if (motorState.throttleProtocols[index] === "DSHOT150") {
      FC.MOTOR_CONFIG.use_dshot_telemetry = false;
    }
    // With a governor the RPM source follows the protocol, as in the Ethos
    // wizard: DShot300 and DShot600 carry the RPM back, the others need the
    // wire sensor.
    if (govState.enabled) {
      const carriesRpm = ["DSHOT300", "DSHOT600"].includes(
        motorState.throttleProtocols[index],
      );
      setRpmSource(carriesRpm ? "dshot" : "sensor");
    }
    markChanged();
  }

  // One RPM source, as in the Ethos wizard: the ESC's bidirectional DShot
  // telemetry, or a wire RPM sensor on a frequency input. The firmware
  // prefers the sensor when both are set; the wizard keeps one.
  let rpmSource = $derived(
    FC.FEATURE_CONFIG.features.FREQ_SENSOR
      ? "sensor"
      : FC.MOTOR_CONFIG.use_dshot_telemetry
        ? "dshot"
        : null,
  );

  function setRpmSource(source) {
    if (rpmSource === source) return;
    FC.FEATURE_CONFIG.features.FREQ_SENSOR = source === "sensor";
    FC.MOTOR_CONFIG.use_dshot_telemetry = source === "dshot";
    markChanged();
  }

  let mainRatio = $derived(
    FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] /
      FC.MOTOR_CONFIG.main_rotor_gear_ratio[0],
  );
  let tailRatio = $derived(
    FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] /
      FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0],
  );
</script>

<div class="with-art">
  <div class="art"><HeliSide scene="bladesOff" /></div>
  <div class="text">
    <p>{$i18n.t("setupWizardMotorIntro")}</p>
    <div class="note">{$i18n.t("setupWizardMotorPropsOff")}</div>
  </div>
</div>

<section class="card">
  <h3><span class="num">1</span>{$i18n.t("motorsEscProtocol")}</h3>
  <div class="tiles" role="radiogroup">
    {#each common as p (p.index)}
      {@const selected = FC.MOTOR_CONFIG.motor_pwm_protocol === p.index}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        class={["tile", selected && "selected"]}
        onclick={() => setProtocol(p.index)}
      >
        <span class="tile-name">
          {$i18n.t(`setupWizardMotor_${p.name}`)}
          {#if selected}
            <i class="fas fa-check-circle" aria-hidden="true"></i>
          {/if}
        </span>
        <span class="muted">{$i18n.t(`setupWizardMotorHelp_${p.name}`)}</span>
      </button>
    {/each}
  </div>
  <div class="actions">
    <span class="muted">{$i18n.t("setupWizardMotorOther")}</span>
    <select
      value={FC.MOTOR_CONFIG.motor_pwm_protocol}
      onchange={(e) => setProtocol(Number(e.target.value))}
    >
      {#each protocols as p (p.index)}
        <option value={p.index}>{p.name}</option>
      {/each}
    </select>
  </div>
  {#if protocolName === "DISABLED"}
    <div class="note">{$i18n.t("setupWizardMotorDisabled")}</div>
  {:else if protocolName === "DSHOT150"}
    <div class="note">{$i18n.t("setupWizardMotorDshot150NoRpm")}</div>
  {/if}
</section>

<section class="card">
  <h3><span class="num">2</span>{$i18n.t("setupWizardMotorRpmTitle")}</h3>
  <div class="with-art">
    <div class="art"><MotorGearArt /></div>
    <div class="text"><p>{$i18n.t("setupWizardMotorRpmText")}</p></div>
  </div>
  <div class="fields">
    <span>{$i18n.t("motorsMotorPoles1Long")}</span>
    <NumberInput
      min="2"
      max="255"
      step="2"
      bind:value={FC.MOTOR_CONFIG.motor_poles[0]}
      onchange={markChanged}
    />
    <span></span>

    <span>{$i18n.t("setupWizardMotorPinion")}</span>
    <NumberInput
      min="1"
      max="50000"
      bind:value={FC.MOTOR_CONFIG.main_rotor_gear_ratio[0]}
      onchange={markChanged}
    />
    <span></span>

    <span>{$i18n.t("setupWizardMotorMainGear")}</span>
    <NumberInput
      min="1"
      max="50000"
      bind:value={FC.MOTOR_CONFIG.main_rotor_gear_ratio[1]}
      onchange={markChanged}
    />
    <span class="pill">1:{mainRatio.toFixed(2)}</span>

    {#if !wiz.motorised}
      <span>{$i18n.t("motorsTailRotorGearRatio")}</span>
      <span class="ratio">
        <NumberInput
          min="1"
          max="50000"
          bind:value={FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0]}
          onchange={markChanged}
        />
        :
        <NumberInput
          min="1"
          max="50000"
          bind:value={FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1]}
          onchange={markChanged}
        />
      </span>
      <span class="pill">1:{tailRatio.toFixed(2)}</span>
    {/if}
  </div>
</section>

{#if govState.enabled}
  <section class="card">
    <h3>
      <span class="num">3</span>{$i18n.t("setupWizardRpmSourceTitle")}
    </h3>
    <p>{$i18n.t("setupWizardRpmSourceText")}</p>
    <div class="tiles" role="radiogroup">
      <button
        type="button"
        role="radio"
        aria-checked={rpmSource === "dshot"}
        class={["tile", rpmSource === "dshot" && "selected"]}
        disabled={!motorState.bidirCapable}
        onclick={() => setRpmSource("dshot")}
      >
        <span class="tile-name">
          {$i18n.t("setupWizardRpmSourceDshot")}
        </span>
        <span class="muted">{$i18n.t("setupWizardRpmSourceDshotHelp")}</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={rpmSource === "sensor"}
        class={["tile", rpmSource === "sensor" && "selected"]}
        onclick={() => setRpmSource("sensor")}
      >
        <span class="tile-name">
          {$i18n.t("setupWizardRpmSourceSensor")}
        </span>
        <span class="muted">{$i18n.t("setupWizardRpmSourceSensorHelp")}</span>
      </button>
    </div>
    {#if !rpmSource}
      <div class="note">{$i18n.t("setupWizardRpmSourceNone")}</div>
    {/if}
  </section>
{/if}

{#if changed}
  <RebootLater />
{/if}

<div>
  <TabButton tab="motors">
    {$i18n.t("setupWizardOpenMotors")}
  </TabButton>
</div>

<style lang="scss">
  .fields {
    display: grid;
    grid-template-columns: auto 12rem auto;
    justify-content: start;
    align-items: center;
    gap: 8px 12px;
  }

  .ratio {
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>

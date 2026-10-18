<script>
  import { getContext } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import motorState from "@/tabs/motors/state.svelte.js";

  import HeliSide from "./HeliSide.svelte";
  import MotorGearArt from "./MotorGearArt.svelte";

  const wiz = getContext("setupWizard");

  // The usual heli ESC protocols as tiles; anything else from the list.
  const COMMON = ["PWM", "DSHOT300", "DSHOT600", "CASTLE"];

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

{#if changed}
  <div class="callout">
    <i class="fas fa-sync-alt" aria-hidden="true"></i>
    <span>{$i18n.t("setupWizardRebootNeeded")}</span>
    <button class="btn primary" onclick={wiz.saveAndReboot}>
      {$i18n.t("buttonSaveReboot")}
    </button>
  </div>
{/if}

<div>
  <button class="btn" onclick={() => wiz.openTab("motors")}>
    {$i18n.t("setupWizardOpenMotors")}
  </button>
</div>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

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

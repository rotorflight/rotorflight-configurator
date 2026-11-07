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

  //// Gearing, as in the Ethos wizard. The firmware keeps two products per
  //// ratio, and the ratio is field 1 / field 0 (flight/motors.c). Main gear:
  //// field 0 = pinion x the gear on the main side, field 1 = the gear on the
  //// pinion side x main gear. Tail: field 0 = the tail side, field 1 = the
  //// drive side. One stage is two stages with both intermediate gears at 1.

  const MAX_TEETH = 500;
  const MAX_PRODUCT = 65535;

  let stages = $state(1);
  let train = $state({
    pinion: FC.MOTOR_CONFIG.main_rotor_gear_ratio[0],
    pinionSide: 1,
    mainSide: 1,
    main: FC.MOTOR_CONFIG.main_rotor_gear_ratio[1],
  });
  let ratioValue = $state(
    FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] /
      FC.MOTOR_CONFIG.main_rotor_gear_ratio[0],
  );
  let tailFromShaft = $state(false);
  let tailShaft = $state({ drive: 1, rotor: 1, mesh: 1 });
  let tailRatioValue = $state(
    FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] /
      FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0],
  );

  let gearOverflow = $derived(
    train.pinion * train.mainSide > MAX_PRODUCT ||
      train.pinionSide * train.main > MAX_PRODUCT,
  );

  // The smallest whole pair with this ratio: 9.70 is 10 and 97. Null when
  // no pair up to MAX_TEETH gives it.
  function wholePair(ratio) {
    const hundredths = Math.round(ratio * 100);
    for (let k = 1; k <= MAX_TEETH; k++) {
      if ((hundredths * k) % 100 === 0) return [k, (hundredths * k) / 100];
    }
    return null;
  }

  function applyMain() {
    const g = FC.MOTOR_CONFIG.main_rotor_gear_ratio;
    g[0] = train.pinion * train.mainSide;
    g[1] = train.pinionSide * train.main;
    if (tailFromShaft) applyTail();
    markChanged();
  }

  function setStages(count) {
    if (stages === count) return;
    stages = count;
    // Both intermediate gears take the main gear's count, so the ratio stays.
    train.pinionSide = count === 2 ? train.main : 1;
    train.mainSide = count === 2 ? train.main : 1;
    applyMain();
  }

  function setRatio(value) {
    const pair = wholePair(value);
    if (!pair) return;
    train.pinion = pair[0];
    train.main = pair[1];
    applyMain();
  }

  function applyTail() {
    const t = FC.MOTOR_CONFIG.tail_rotor_gear_ratio;
    if (!tailFromShaft) return;
    // From the intermediate shaft: the drive pulley on it, the tail rotor
    // pulley, and the gear on the main side that the shaft turns through.
    const mesh = stages === 2 ? train.mainSide : tailShaft.mesh;
    t[0] = mesh * tailShaft.rotor;
    t[1] = train.main * tailShaft.drive;
    markChanged();
  }

  function setTailFromShaft(value) {
    if (tailFromShaft === value) return;
    tailFromShaft = value;
    if (value) applyTail();
    else markChanged();
  }

  function setTailRatio(value) {
    const pair = wholePair(value);
    if (!pair) return;
    FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] = pair[0];
    FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] = pair[1];
    markChanged();
  }
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

    <span>{$i18n.t("setupWizardGearStage")}</span>
    <span class="stages">
      <button
        type="button"
        class={["btn", stages === 1 && "primary"]}
        onclick={() => setStages(1)}
      >
        {$i18n.t("setupWizardGearStageOne")}
      </button>
      <button
        type="button"
        class={["btn", stages === 2 && "primary"]}
        onclick={() => setStages(2)}
      >
        {$i18n.t("setupWizardGearStageTwo")}
      </button>
    </span>
    <span></span>

    <span>{$i18n.t("setupWizardMotorPinion")}</span>
    <NumberInput
      min="1"
      max={MAX_TEETH}
      bind:value={train.pinion}
      onchange={applyMain}
    />
    <span></span>

    {#if stages === 2}
      <span>{$i18n.t("setupWizardGearInterPinion")}</span>
      <NumberInput
        min="1"
        max={MAX_TEETH}
        bind:value={train.pinionSide}
        onchange={applyMain}
      />
      <span></span>

      <span>{$i18n.t("setupWizardGearInterMain")}</span>
      <NumberInput
        min="1"
        max={MAX_TEETH}
        bind:value={train.mainSide}
        onchange={applyMain}
      />
      <span></span>
    {/if}

    <span>{$i18n.t("setupWizardMotorMainGear")}</span>
    <NumberInput
      min="1"
      max={MAX_TEETH}
      bind:value={train.main}
      onchange={applyMain}
    />
    <span class="pill">1:{mainRatio.toFixed(2)}</span>

    {#if stages === 1}
      <span>{$i18n.t("setupWizardGearRatio")}</span>
      <NumberInput
        min="0.1"
        max="500"
        step="0.01"
        bind:value={ratioValue}
        onchange={() => setRatio(ratioValue)}
      />
      <span class="muted">:1</span>
    {/if}

    {#if !wiz.motorised}
      <span>{$i18n.t("setupWizardGearTail")}</span>
      <span class="stages">
        <button
          type="button"
          class={["btn", !tailFromShaft && "primary"]}
          onclick={() => setTailFromShaft(false)}
        >
          {$i18n.t("setupWizardGearTailDirect")}
        </button>
        <button
          type="button"
          class={["btn", tailFromShaft && "primary"]}
          onclick={() => setTailFromShaft(true)}
        >
          {$i18n.t("setupWizardGearTailShaft")}
        </button>
      </span>
      <span></span>

      {#if tailFromShaft}
        <span>{$i18n.t("setupWizardGearDrivePulley")}</span>
        <NumberInput
          min="1"
          max={MAX_TEETH}
          bind:value={tailShaft.drive}
          onchange={applyTail}
        />
        <span></span>

        <span>{$i18n.t("setupWizardGearRotorPulley")}</span>
        <NumberInput
          min="1"
          max={MAX_TEETH}
          bind:value={tailShaft.rotor}
          onchange={applyTail}
        />
        <span></span>

        {#if stages === 1}
          <span>{$i18n.t("setupWizardGearMesh")}</span>
          <NumberInput
            min="1"
            max={MAX_TEETH}
            bind:value={tailShaft.mesh}
            onchange={applyTail}
          />
          <span></span>
        {/if}

        <span>{$i18n.t("motorsTailRotorGearRatio")}</span>
        <span></span>
        <span class="pill">1:{tailRatio.toFixed(2)}</span>
      {:else}
        <span>{$i18n.t("motorsTailRotorGearRatio")}</span>
        <span class="ratio">
          <NumberInput
            min="1"
            max={MAX_TEETH}
            bind:value={FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0]}
            onchange={markChanged}
          />
          :
          <NumberInput
            min="1"
            max={MAX_TEETH}
            bind:value={FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1]}
            onchange={markChanged}
          />
        </span>
        <span class="pill">1:{tailRatio.toFixed(2)}</span>

        <span>{$i18n.t("setupWizardGearRatio")}</span>
        <NumberInput
          min="0.1"
          max="500"
          step="0.01"
          bind:value={tailRatioValue}
          onchange={() => setTailRatio(tailRatioValue)}
        />
        <span class="muted">:1</span>
      {/if}
    {/if}
  </div>
  {#if gearOverflow}
    <div class="note">{$i18n.t("setupWizardGearOverflow")}</div>
  {/if}
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

  .stages {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }
</style>

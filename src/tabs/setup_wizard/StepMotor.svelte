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

  import GearVisualization from "./GearVisualization.svelte";
  import HeliSide from "./HeliSide.svelte";
  import MotorGearArt from "./MotorGearArt.svelte";
  import MotorPolesViz from "./MotorPolesViz.svelte";
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

  const MIN_TEETH = 6; // Minimum tooth count for gear visualization
  const MAX_TEETH = 500;
  const MAX_PRODUCT = 65535;

  // Gear modes: 1=One stage, 2=Two stages, 3=Ratio only (like Ethos)
  let mainGearMode = $state(1);
  let tailGearMode = $state(1);

  let train = $state({
    pinion: FC.MOTOR_CONFIG.main_rotor_gear_ratio[0],
    pinionSide: 1,
    mainSide: 1,
    main: FC.MOTOR_CONFIG.main_rotor_gear_ratio[1],
  });
  let mainRatioValue = $state(
    FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] /
      FC.MOTOR_CONFIG.main_rotor_gear_ratio[0],
  );

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
    if (tailGearMode === 2) applyTail(); // Tail from intermediate shaft needs main gear update
    markChanged();
  }

  function setMainGearMode(mode) {
    if (mainGearMode === mode) return;
    mainGearMode = mode;
    if (mode === 2) {
      // Two stages: intermediate gears take main gear count
      train.pinionSide = train.main;
      train.mainSide = train.main;
    } else if (mode === 1) {
      // One stage: reset intermediate gears to 1
      train.pinionSide = 1;
      train.mainSide = 1;
    }
    // Mode 3 (Ratio only) doesn't need gear changes
    if (mode !== 3) applyMain();
  }

  function applyMainRatioOnly() {
    const g = FC.MOTOR_CONFIG.main_rotor_gear_ratio;
    const pair = wholePair(mainRatioValue);
    if (!pair) return;
    g[0] = pair[0];
    g[1] = pair[1];
    markChanged();
  }

  function setTailGearMode(mode) {
    if (tailGearMode === mode) return;
    tailGearMode = mode;
    // Mode changes don't apply immediately for tail in Ratio only
  }

  function applyTailRatioOnly() {
    const t = FC.MOTOR_CONFIG.tail_rotor_gear_ratio;
    const pair = wholePair(tailRatioValue);
    if (!pair) return;
    t[0] = pair[0];
    t[1] = pair[1];
    markChanged();
  }

  function applyTail() {
    const t = FC.MOTOR_CONFIG.tail_rotor_gear_ratio;
    if (tailGearMode === 3) return; // Ratio only, don't apply
    if (tailGearMode === 1) {
      // From main shaft: drive gear (from main) x rotor pulley
      t[0] = tailShaft.rotor;
      t[1] = train.main * tailShaft.drive;
    } else if (tailGearMode === 2) {
      // From intermediate shaft: mesh x rotor pulley and intermediate x drive
      const mesh = mainGearMode === 2 ? train.mainSide : tailShaft.mesh;
      t[0] = mesh * tailShaft.rotor;
      t[1] = train.main * tailShaft.drive;
    }
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

  <!-- Motor poles with visualization -->
  <div
    style="display: flex; gap: 2rem; align-items: center; margin-bottom: 2rem;"
  >
    <div style="flex: 1;">
      <label style="display: block; font-weight: 500; margin-bottom: 0.5rem;">
        {$i18n.t("motorsMotorPoles1Long")}
      </label>
      <NumberInput
        min="2"
        max="255"
        step="2"
        bind:value={FC.MOTOR_CONFIG.motor_poles[0]}
        onchange={markChanged}
      />
    </div>
    <div style="width: 150px; flex-shrink: 0;">
      <MotorPolesViz poles={FC.MOTOR_CONFIG.motor_poles[0]} />
    </div>
  </div>

  <!-- Main Gear Ratio Section -->
  <div style="margin-top: 2rem;">
    <h4 style="margin: 0 0 1rem 0;">{$i18n.t("setupWizardMotorMainGear")}</h4>
    <div class="stages" style="margin-bottom: 1.5rem;">
      <button
        type="button"
        class={["btn", mainGearMode === 1 && "primary"]}
        onclick={() => setMainGearMode(1)}
      >
        {$i18n.t("setupWizardGearStageOne")}
      </button>
      <button
        type="button"
        class={["btn", mainGearMode === 2 && "primary"]}
        onclick={() => setMainGearMode(2)}
      >
        {$i18n.t("setupWizardGearStageTwo")}
      </button>
      <button
        type="button"
        class={["btn", mainGearMode === 3 && "primary"]}
        onclick={() => setMainGearMode(3)}
      >
        {$i18n.t("setupWizardMotorRatioOnlyTitle", "Ratio only")}
      </button>
    </div>

    {#if mainGearMode < 3}
      <!-- One stage or Two stages: tooth count inputs + visualization -->
      <div
        style="display: grid; grid-template-columns: minmax(0, 1fr) 160px; gap: 2rem; align-items: flex-start; margin-bottom: 1.5rem;"
      >
        <div
          style="display: grid; grid-template-columns: auto 1fr auto; gap: 1rem; align-items: center;"
        >
          <span>{$i18n.t("setupWizardMotorPinion")}</span>
          <NumberInput
            min={MIN_TEETH}
            max={MAX_TEETH}
            bind:value={train.pinion}
            onchange={applyMain}
          />
          <span></span>

          {#if mainGearMode === 2}
            <span>{$i18n.t("setupWizardGearInterPinion")}</span>
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={train.pinionSide}
              onchange={applyMain}
            />
            <span></span>

            <span>{$i18n.t("setupWizardGearInterMain")}</span>
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={train.mainSide}
              onchange={applyMain}
            />
            <span></span>
          {/if}

          <span>{$i18n.t("setupWizardMotorMainGear")}</span>
          <NumberInput
            min={MIN_TEETH}
            max={MAX_TEETH}
            bind:value={train.main}
            onchange={applyMain}
          />
          <span class="pill">1:{mainRatio.toFixed(2)}</span>
        </div>

        <div
          style="display: flex; justify-content: center; align-items: flex-start;"
        >
          <GearVisualization
            teeth={mainGearMode === 2
              ? [train.pinion, train.pinionSide, train.mainSide, train.main]
              : [train.pinion, train.main]}
            stage={mainGearMode}
          />
        </div>
      </div>
    {:else}
      <!-- Ratio only: direct ratio input -->
      <div
        style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem;"
      >
        <label style="font-weight: 500; white-space: nowrap;">
          {$i18n.t("setupWizardGearRatio")}
        </label>
        <div style="display: flex; gap: 0.3rem; align-items: center;">
          <NumberInput
            min="0.1"
            max="500"
            step="0.01"
            bind:value={mainRatioValue}
            onchange={applyMainRatioOnly}
          />
          <span class="muted">:1</span>
        </div>
      </div>
    {/if}

    {#if !wiz.motorised}
      <!-- Tail Gear Ratio Section -->
      <div style="margin-top: 2rem;">
        <h4 style="margin: 0 0 1rem 0;">{$i18n.t("setupWizardGearTail")}</h4>
        <div class="stages" style="margin-bottom: 1.5rem;">
          <button
            type="button"
            class={["btn", tailGearMode === 1 && "primary"]}
            onclick={() => setTailGearMode(1)}
          >
            {$i18n.t("setupWizardMotorTailFromMain", "From main")}
          </button>
          <button
            type="button"
            class={["btn", tailGearMode === 2 && "primary"]}
            onclick={() => setTailGearMode(2)}
            disabled={mainGearMode !== 2}
          >
            {$i18n.t("setupWizardMotorTailFromInter", "From intermediate")}
          </button>
          <button
            type="button"
            class={["btn", tailGearMode === 3 && "primary"]}
            onclick={() => setTailGearMode(3)}
          >
            {$i18n.t("setupWizardMotorRatioOnlyTitle", "Ratio only")}
          </button>
        </div>

        {#if tailGearMode === 1}
          <!-- From main shaft: drive pulley on main, tail rotor pulley -->
          <div
            style="display: grid; grid-template-columns: minmax(0, 1fr) 160px; gap: 2rem; align-items: flex-start; margin-bottom: 1.5rem;"
          >
            <div
              style="display: grid; grid-template-columns: auto 1fr auto; gap: 1rem; align-items: center;"
            >
              <span>{$i18n.t("setupWizardGearDrivePulley")}</span>
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tailShaft.drive}
                onchange={applyTail}
              />
              <span></span>

              <span>{$i18n.t("setupWizardGearRotorPulley")}</span>
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tailShaft.rotor}
                onchange={applyTail}
              />
              <span class="pill">1:{tailRatio.toFixed(2)}</span>
            </div>

            <div
              style="display: flex; justify-content: center; align-items: flex-start;"
            >
              <GearVisualization
                teeth={[tailShaft.drive, tailShaft.rotor]}
                stage={1}
              />
            </div>
          </div>
        {:else if tailGearMode === 2}
          <!-- From intermediate shaft: mesh, drive pulley, rotor pulley -->
          <div
            style="display: grid; grid-template-columns: minmax(0, 1fr) 160px; gap: 2rem; align-items: flex-start; margin-bottom: 1.5rem;"
          >
            <div
              style="display: grid; grid-template-columns: auto 1fr auto; gap: 1rem; align-items: center;"
            >
              {#if mainGearMode === 1}
                <span>{$i18n.t("setupWizardGearMesh")}</span>
                <NumberInput
                  min={MIN_TEETH}
                  max={MAX_TEETH}
                  bind:value={tailShaft.mesh}
                  onchange={applyTail}
                />
                <span></span>
              {/if}

              <span>{$i18n.t("setupWizardGearDrivePulley")}</span>
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tailShaft.drive}
                onchange={applyTail}
              />
              <span></span>

              <span>{$i18n.t("setupWizardGearRotorPulley")}</span>
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tailShaft.rotor}
                onchange={applyTail}
              />
              <span class="pill">1:{tailRatio.toFixed(2)}</span>
            </div>

            <div
              style="display: flex; justify-content: center; align-items: flex-start;"
            >
              <GearVisualization
                teeth={[
                  mainGearMode === 2 ? train.mainSide : tailShaft.mesh,
                  tailShaft.drive,
                  tailShaft.rotor,
                  train.main,
                ]}
                stage={2}
              />
            </div>
          </div>
        {:else}
          <!-- Ratio only: direct ratio input -->
          <div style="display: flex; gap: 1rem; align-items: center;">
            <label style="font-weight: 500; white-space: nowrap;">
              {$i18n.t("setupWizardGearRatio")}
            </label>
            <div style="display: flex; gap: 0.3rem; align-items: center;">
              <NumberInput
                min="0.1"
                max="500"
                step="0.01"
                bind:value={tailRatioValue}
                onchange={applyTailRatioOnly}
              />
              <span class="muted">:1</span>
            </div>
          </div>
        {/if}
      </div>
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

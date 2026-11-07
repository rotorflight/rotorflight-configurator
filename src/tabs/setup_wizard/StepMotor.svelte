<script module>
  // The gear modes and counts, kept while the configurator runs.
  const session = { main: null, tail: null };
</script>

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

  //// Gearing, as in the Ethos wizard (app/pages/setup_wizard_motor.lua).
  //// The firmware keeps two products per ratio, and the ratio is field 1 /
  //// field 0 (flight/motors.c). Main gear: field 0 = pinion x the
  //// intermediate gear on the main side, field 1 = the intermediate gear on
  //// the pinion side x main gear. Tail: field 0 = the tail side, field 1 =
  //// the drive side. Each goes in one of three ways: one stage, two stages,
  //// or the ratio only.

  const ONE = 1;
  const TWO = 2;
  const RATIO = 3;
  const MODES = [
    [ONE, "setupWizardGearStageOne"],
    [TWO, "setupWizardGearStageTwo"],
    [RATIO, "setupWizardGearStageRatio"],
  ];
  // A gear has at least 6 teeth; anything else goes in as a ratio.
  const MIN_TEETH = 6;
  const MAX_TEETH = 500;
  // The firmware's fields are 16 bit.
  const MAX_PRODUCT = 65535;
  const MIN_RATIO = 1;
  const MAX_RATIO = 100;

  const round2 = (v) => Math.round(v * 100) / 100;
  const clampRatio = (v) =>
    Math.min(MAX_RATIO, Math.max(MIN_RATIO, round2(v) || MIN_RATIO));
  const fits = (v) => v >= MIN_TEETH && v <= MAX_TEETH;
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  // The smallest whole pair with this ratio: 9.70 is 10 and 97.
  function wholePair(ratio) {
    const hundredths = Math.round(ratio * 100);
    for (let k = 1; k < 100; k++) {
      if ((hundredths * k) % 100 === 0) return [k, (hundredths * k) / 100];
    }
    return [100, hundredths];
  }

  // Teeth for a ratio: the smallest pair that shows it to two decimals (7.27
  // is 11 and 80), else the nearest. Null above MAX_TEETH / MIN_TEETH.
  function teethFor(ratio) {
    let best = null;
    for (let p = MIN_TEETH; p * ratio <= MAX_TEETH + 0.5; p++) {
      const m = Math.round(p * ratio);
      if (!fits(m)) continue;
      const error = Math.abs(m / p - ratio);
      if (error < 0.005) return [p, m];
      if (!best || error < best.error) best = { pair: [p, m], error };
    }
    return best?.pair ?? null;
  }

  // A pair as gear teeth: scaled up until both have MIN_TEETH. Null when
  // that is more than MAX_TEETH.
  function asTeeth(pair) {
    const k = Math.ceil(MIN_TEETH / Math.min(...pair));
    const scaled = pair.map((v) => v * k);
    return scaled.every(fits) ? scaled : null;
  }

  // Two products as one pair of teeth: the first count kept when the second
  // comes out whole (as Ethos), else the reduced pair. When that needs more
  // than MAX_TEETH, the first count is kept and the second rounded: the ratio
  // shown beside the title then tells the small difference.
  function onePair(first, p0, p1) {
    const second = (first * p1) / p0;
    if (Number.isInteger(second) && fits(first) && fits(second)) {
      return [first, second];
    }
    const g = gcd(p0, p1);
    const exact = asTeeth([p0 / g, p1 / g]);
    if (exact) return exact;
    const near = [first, Math.round(second)];
    return near.every(fits) ? near : teethFor(clampRatio(p1 / p0));
  }

  function mainProducts(m) {
    if (m.mode === RATIO) return wholePair(m.ratio);
    if (m.mode === TWO) return [m.pinion * m.mainSide, m.pinionSide * m.main];
    return [m.pinion, m.main];
  }

  // From the intermediate shaft the main gear drives the shaft through the
  // intermediate gear on the main side: the two-stage train's own, else the
  // tail's mesh count.
  function meshOf(t, m) {
    return m.mode === TWO ? m.mainSide : t.mesh;
  }

  function tailProducts(t, m) {
    if (t.mode === RATIO) return wholePair(t.ratio);
    if (t.mode === TWO) return [meshOf(t, m) * t.rotor, m.main * t.drive];
    return [t.rotor, t.drive];
  }

  // The counts behind two stages can't be read back from the two products,
  // so they are kept for the session, as Ethos does, and used again while
  // the FC still holds their products.
  function initMain() {
    const g = FC.MOTOR_CONFIG.main_rotor_gear_ratio;
    const s = session.main;
    if (s && same(mainProducts(s), g)) return { ...s };
    const ratio = clampRatio(g[1] / g[0]);
    if (fits(g[0]) && fits(g[1])) {
      return {
        mode: ONE,
        pinion: g[0],
        pinionSide: g[1],
        mainSide: g[1],
        main: g[1],
        ratio,
      };
    }
    // An FC that has no gear set (1:1) opens on the ratio.
    const [pinion, main] = teethFor(ratio) ?? [MIN_TEETH, MIN_TEETH];
    return {
      mode: RATIO,
      pinion,
      pinionSide: main,
      mainSide: main,
      main,
      ratio,
    };
  }

  function initTail(m) {
    const t = FC.MOTOR_CONFIG.tail_rotor_gear_ratio;
    const s = session.tail;
    if (s && same(tailProducts(s, m), t)) return { ...s };
    const ratio = clampRatio(t[1] / t[0]);
    if (fits(t[0]) && fits(t[1])) {
      return { mode: ONE, drive: t[1], rotor: t[0], mesh: m.main, ratio };
    }
    const [rotor, drive] = teethFor(ratio) ?? [MIN_TEETH, MIN_TEETH];
    return { mode: RATIO, drive, rotor, mesh: m.main, ratio };
  }

  let main = $state(initMain());
  let tail = $state(initTail(main));

  let mainOverflow = $derived(mainProducts(main).some((v) => v > MAX_PRODUCT));
  let tailOverflow = $derived(
    !wiz.motorised && tailProducts(tail, main).some((v) => v > MAX_PRODUCT),
  );

  function ratioText(pair) {
    return `${(pair[1] / pair[0]).toFixed(2)}:1`;
  }

  function store(field, pair) {
    const g = FC.MOTOR_CONFIG[field];
    if (pair.some((v) => v > MAX_PRODUCT) || same(pair, g)) return;
    g[0] = pair[0];
    g[1] = pair[1];
    markChanged();
  }

  function remember() {
    session.main = $state.snapshot(main);
    session.tail = $state.snapshot(tail);
  }

  function applyTail() {
    if (!wiz.motorised) {
      store("tail_rotor_gear_ratio", tailProducts(tail, main));
    }
    remember();
  }

  function applyMain() {
    store("main_rotor_gear_ratio", mainProducts(main));
    // A tail driven from the intermediate shaft turns with the main gear.
    applyTail();
  }

  function setMainMode(mode) {
    if (main.mode === mode) return;
    const [p0, p1] = mainProducts(main);
    if (mode === RATIO) {
      main.ratio = clampRatio(p1 / p0);
    } else {
      // Teeth at the ratio as it is now.
      let pair = [main.pinion, main.main];
      if (main.mode === RATIO) pair = teethFor(main.ratio);
      if (main.mode === TWO) {
        pair = onePair(main.pinion, p0, p1);
        // The tail keeps the main-side gear for a drive from the shaft.
        tail.mesh = main.mainSide;
      }
      if (!pair) return;
      [main.pinion, main.main] = pair;
      // Two stages start with both intermediate gears at the main gear's
      // count: a 1:1 pair, so the ratio stays.
      if (mode === TWO) {
        main.pinionSide = main.main;
        main.mainSide = main.main;
      }
    }
    main.mode = mode;
    applyMain();
  }

  function setTailMode(mode) {
    if (tail.mode === mode) return;
    const [p0, p1] = tailProducts(tail, main);
    if (mode === RATIO) {
      tail.ratio = clampRatio(p1 / p0);
    } else {
      let pair = [tail.rotor, tail.drive];
      if (tail.mode === RATIO) pair = teethFor(tail.ratio);
      else if (mode === ONE) pair = onePair(tail.rotor, p0, p1);
      if (!pair) return;
      [tail.rotor, tail.drive] = pair;
      // Onto the intermediate shaft: its main-side gear takes the main
      // gear's count (1:1), so the tail keeps its ratio.
      if (mode === TWO && main.mode !== TWO) tail.mesh = main.main;
    }
    tail.mode = mode;
    applyTail();
  }

  // The intermediate gear on the main side, as the tail sees it.
  function getMesh() {
    return meshOf(tail, main);
  }

  function setMesh(v) {
    if (main.mode === TWO) main.mainSide = v;
    else tail.mesh = v;
    applyMain();
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
  <p>{$i18n.t("setupWizardMotorRpmText")}</p>

  <div class="part">
    <h4>{$i18n.t("setupWizardPolesTitle")}</h4>
    <p class="muted">{$i18n.t("setupWizardPolesText")}</p>
    <div class="part-row">
      <div class="part-fields">
        <span>{$i18n.t("motorsMotorPoles1Long")}</span>
        <NumberInput
          min="2"
          max="254"
          step="2"
          bind:value={FC.MOTOR_CONFIG.motor_poles[0]}
          onchange={markChanged}
        />
      </div>
      <div class="part-art poles">
        <MotorPolesViz poles={FC.MOTOR_CONFIG.motor_poles[0]} />
      </div>
    </div>
  </div>

  <div class="part">
    <h4>
      {$i18n.t("setupWizardGearMainTitle")}
      <span class="pill">
        {ratioText(FC.MOTOR_CONFIG.main_rotor_gear_ratio)}
      </span>
    </h4>
    <p class="muted">{$i18n.t("setupWizardGearMainText")}</p>
    <div class="part-row">
      <div class="part-fields">
        <span>{$i18n.t("setupWizardGearStage")}</span>
        {@render modes(main.mode, setMainMode)}

        {#if main.mode === RATIO}
          <span>{$i18n.t("setupWizardGearRatioDirect")}</span>
          <span class="pair">
            <NumberInput
              min={MIN_RATIO}
              max={MAX_RATIO}
              step="0.01"
              bind:value={main.ratio}
              onchange={applyMain}
            />
            <span class="muted">:1</span>
          </span>
        {:else if main.mode === TWO}
          <span>{$i18n.t("setupWizardGearPairStage1")}</span>
          <span class="pair">
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={main.pinion}
              onchange={applyMain}
            />
            :
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={main.pinionSide}
              onchange={applyMain}
            />
          </span>
          <span>{$i18n.t("setupWizardGearPairStage2")}</span>
          <span class="pair">
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={main.mainSide}
              onchange={applyMain}
            />
            :
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={main.main}
              onchange={applyMain}
            />
          </span>
        {:else}
          <span>{$i18n.t("setupWizardGearPairSingle")}</span>
          <span class="pair">
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={main.pinion}
              onchange={applyMain}
            />
            :
            <NumberInput
              min={MIN_TEETH}
              max={MAX_TEETH}
              bind:value={main.main}
              onchange={applyMain}
            />
          </span>
        {/if}
      </div>
      <div class="part-art">
        {#if main.mode === RATIO}
          <GearVisualization teeth={[8, 32]} counts={false} />
        {:else if main.mode === TWO}
          <GearVisualization
            teeth={[main.pinion, main.pinionSide, main.mainSide, main.main]}
            train
          />
        {:else}
          <GearVisualization teeth={[main.pinion, main.main]} />
        {/if}
      </div>
    </div>
    {#if main.mode !== RATIO}
      <p class="muted">{$i18n.t("setupWizardGearMinTeeth")}</p>
    {/if}
  </div>

  {#if !wiz.motorised}
    <div class="part">
      <h4>
        {$i18n.t("setupWizardGearTailTitle")}
        <span class="pill">
          {ratioText(FC.MOTOR_CONFIG.tail_rotor_gear_ratio)}
        </span>
      </h4>
      <p class="muted">{$i18n.t("setupWizardGearTailText")}</p>
      <div class="part-row">
        <div class="part-fields">
          <span>{$i18n.t("setupWizardGearStage")}</span>
          {@render modes(tail.mode, setTailMode)}

          {#if tail.mode === RATIO}
            <span>{$i18n.t("setupWizardGearRatioDirect")}</span>
            <span class="pair">
              <NumberInput
                min={MIN_RATIO}
                max={MAX_RATIO}
                step="0.01"
                bind:value={tail.ratio}
                onchange={applyTail}
              />
              <span class="muted">:1</span>
            </span>
          {:else if tail.mode === TWO}
            <span>{$i18n.t("setupWizardGearPairMainMesh")}</span>
            <span class="pair">
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={getMesh, setMesh}
              />
              :
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={main.main}
                onchange={applyMain}
              />
            </span>
            <span>{$i18n.t("setupWizardGearPairTailShaft")}</span>
            <span class="pair">
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tail.drive}
                onchange={applyTail}
              />
              :
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tail.rotor}
                onchange={applyTail}
              />
            </span>
          {:else}
            <span>{$i18n.t("setupWizardGearPairTail")}</span>
            <span class="pair">
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tail.drive}
                onchange={applyTail}
              />
              :
              <NumberInput
                min={MIN_TEETH}
                max={MAX_TEETH}
                bind:value={tail.rotor}
                onchange={applyTail}
              />
            </span>
          {/if}
        </div>
        <div class="part-art">
          {#if tail.mode === RATIO}
            <GearVisualization teeth={[3, 5]} counts={false} />
          {:else if tail.mode === TWO}
            <!-- Left to right, as Ethos: tail rotor pulley, drive pulley on
                 the intermediate shaft, its gear on the main side, main gear. -->
            <GearVisualization
              teeth={[tail.rotor, tail.drive, getMesh(), main.main]}
              train
            />
          {:else}
            <GearVisualization teeth={[tail.drive, tail.rotor]} />
          {/if}
        </div>
      </div>
      {#if tail.mode !== RATIO}
        <p class="muted">{$i18n.t("setupWizardGearMinTeeth")}</p>
      {/if}
    </div>
  {/if}

  {#if mainOverflow || tailOverflow}
    <div class="note">{$i18n.t("setupWizardGearOverflow")}</div>
  {/if}
</section>

{#snippet modes(current, set)}
  <span class="stages">
    {#each MODES as [mode, key] (mode)}
      <button
        type="button"
        class={["btn", current === mode && "primary"]}
        aria-pressed={current === mode}
        onclick={() => set(mode)}
      >
        {$i18n.t(key)}
      </button>
    {/each}
  </span>
{/snippet}

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
  /* One part of the motor card (poles, main gear, tail gear): its fields,
     and the picture right beside them, not pushed to the card's edge. */
  .part {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border-soft);

    p {
      margin: 0;
    }
  }

  h4 {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    margin: 0;
    font-size: 1em;
    font-weight: 700;
  }

  .part-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 40px;
  }

  /* The minimum width lines the three pictures up in one column. */
  .part-fields {
    display: grid;
    min-width: 30rem;
    grid-template-columns: max-content max-content;
    align-items: center;
    gap: 8px 12px;
  }

  .part-art {
    flex: none;
    width: 200px;

    /* Smaller than the gears, centred in the same column. */
    &.poles :global(.poles-viz) {
      width: 120px;
      margin: 0 auto;
    }
  }

  .pair {
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

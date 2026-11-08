<script>
  import { getContext } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import PulseTrain from "./PulseTrain.svelte";
  import RebootLater from "./RebootLater.svelte";
  import ServoArt from "./ServoArt.svelte";
  import ServoTypeArt from "./ServoTypeArt.svelte";
  import TabButton from "./TabButton.svelte";

  const wiz = getContext("setupWizard");

  // Centre pulse and frame rate. A narrow band servo (760 us centre) needs
  // its own limits and scale too; those are reset only when the band
  // changes, so a type change within a band keeps any calibration.
  // The types per group, their band and frame rate (Hz), as in the Ethos
  // wizard (lib/setup_wizard_heli.lua SERVO_TYPES, setup_wizard_servotype.lua).
  const TYPES = {
    swash: [
      { key: "analog", band: "wide", rate: 50 },
      { key: "digital", band: "wide", rate: 165 },
      { key: "hiend", band: "wide", rate: 333 },
      { key: "narrow", band: "narrow", rate: 560 },
    ],
    tail: [
      { key: "digital", band: "wide", rate: 200 },
      { key: "specific", band: "narrow", rate: 333 },
      { key: "hiend_specific", band: "narrow", rate: 560 },
    ],
  };
  // A frame rate of its own stays within its band's range (Ethos BAND_HZ).
  const BANDS = {
    wide: { mid: 1520, travel: 700, scale: 500, minHz: 50, maxHz: 333 },
    narrow: { mid: 760, travel: 250, scale: 250, minHz: 200, maxHz: 560 },
  };
  // Ethos' presets (lib/setup_wizard_heli.lua SERVO_TYPES): a servo at one of
  // these rates and bands has that type; any other setting is custom.
  const PRESETS = [
    { band: "wide", rate: 50 },
    { band: "wide", rate: 165 },
    { band: "wide", rate: 200 },
    { band: "wide", rate: 333 },
    { band: "narrow", rate: 333 },
    { band: "narrow", rate: 560 },
  ];
  // The wizards whose groups already had their first type set, once per wizard as
  // Ethos' openedStore.
  const shownWizards = new WeakSet();

  const GROUPS = [
    { kind: "swash", title: "setupWizardServoTypeCyclic" },
    { kind: "tail", title: "setupWizardServoTypeTail" },
  ];

  let rebootNeeded = $state(false);

  function bandOf(config) {
    return config.mid > 860 ? "wide" : "narrow";
  }

  function groupServos(kind) {
    return wiz.servos.filter((s) => s.kind === kind);
  }

  // What one servo is set to: its preset as "band:rate", or "custom" when it
  // matches none (as Ethos' servoTypeOf).
  function stateOf(config) {
    const band = bandOf(config);
    const preset = PRESETS.find(
      (p) => p.band === band && p.rate === config.rate,
    );
    return preset ? `${preset.band}:${preset.rate}` : "custom";
  }

  // The group's state: the servos' shared state, or "mixed" when they differ (as Ethos).
  function groupState(kind) {
    const states = groupServos(kind).map((s) =>
      stateOf(FC.SERVO_CONFIG[s.servo]),
    );
    return states.every((state) => state === states[0]) ? states[0] : "mixed";
  }

  // The type every servo of the group already has, or null.
  function currentType(kind) {
    const state = groupState(kind);
    return (
      TYPES[kind].find((t) => `${t.band}:${t.rate}` === state)?.key ?? null
    );
  }

  // The type of the group nearest to a servo's rate within its band, shown for a
  // rate that matches none (as Ethos' pictureFor).
  function nearestType(kind, config) {
    const band = bandOf(config);
    let best = null;
    for (const t of TYPES[kind]) {
      if (t.band !== band) continue;
      if (
        best === null ||
        Math.abs(t.rate - config.rate) < Math.abs(best.rate - config.rate)
      ) {
        best = t;
      }
    }
    return best;
  }

  // The group's frame rate, as its first servo has it.
  function getRate(kind) {
    return FC.SERVO_CONFIG[groupServos(kind)[0].servo].rate;
  }

  // A frame rate of its own, for every servo of the group. Its band stays;
  // the field keeps the value within the band's range.
  function setRate(kind, rate) {
    for (const s of groupServos(kind)) {
      const config = FC.SERVO_CONFIG[s.servo];
      if (config.rate === rate) continue;
      config.rate = rate;
      rebootNeeded = true;
      wiz.requestReboot();
      wiz.sendServo(s.servo);
    }
  }

  // Geometry correction (servo flag bit 2), for the cyclic servos only. It
  // corrects the arc of a rotary arm at its ends, so it is not for linear
  // servos. The firmware reads it on every update: no reboot.
  const FLAG_GEOCOR = 2;

  let geoCor = $derived(
    groupServos("swash").some(
      (s) => (FC.SERVO_CONFIG[s.servo].flags & FLAG_GEOCOR) !== 0,
    ),
  );

  function setGeoCor(enabled) {
    for (const s of groupServos("swash")) {
      const config = FC.SERVO_CONFIG[s.servo];
      config.flags = enabled
        ? config.flags | FLAG_GEOCOR
        : config.flags & ~FLAG_GEOCOR;
      wiz.sendServo(s.servo);
    }
  }

  function apply(kind, key) {
    const type = TYPES[kind].find((t) => t.key === key);
    const rate = type.rate;
    for (const s of groupServos(kind)) {
      const config = FC.SERVO_CONFIG[s.servo];
      if (config.rate !== rate) {
        rebootNeeded = true;
        wiz.requestReboot();
      }
      config.rate = rate;
      if (bandOf(config) !== type.band) {
        const band = BANDS[type.band];
        config.mid = band.mid;
        config.min = -band.travel;
        config.max = band.travel;
        config.rneg = band.scale;
        config.rpos = band.scale;
      }
      wiz.sendServo(s.servo);
    }
  }

  // Ethos: a group whose servos match no type gets its first type once, when the step
  // first shows it. A group in a mixed state is left as it is.
  if (!shownWizards.has(wiz)) {
    shownWizards.add(wiz);
    for (const group of GROUPS) {
      if (
        groupServos(group.kind).length > 0 &&
        groupState(group.kind) === "custom"
      ) {
        apply(group.kind, TYPES[group.kind][0].key);
      }
    }
  }
</script>

<div class="with-art">
  <div class="art"><ServoArt /></div>
  <div class="text">
    <p>{$i18n.t("setupWizardServoTypeIntro")}</p>
    <div class="note">{$i18n.t("setupWizardServoTypeDisconnect")}</div>
  </div>
</div>

{#each GROUPS as group (group.kind)}
  {@const servos = groupServos(group.kind)}
  {#if servos.length > 0}
    {@const current = currentType(group.kind)}
    {@const nearest = nearestType(group.kind, FC.SERVO_CONFIG[servos[0].servo])}
    {@const band = BANDS[bandOf(FC.SERVO_CONFIG[servos[0].servo])]}
    <section class="card">
      <h3>{$i18n.t(group.title)}</h3>
      <span class="muted">
        {servos.map((s) => wiz.servoLabel(s)).join(" · ")}
      </span>
      <div class="tiles" role="radiogroup">
        {#each TYPES[group.kind] as type (type.key)}
          <button
            type="button"
            role="radio"
            aria-checked={current === type.key}
            class={["tile", current === type.key && "selected"]}
            onclick={() => apply(group.kind, type.key)}
          >
            <span class="tile-name">
              {$i18n.t(`setupWizardServoType_${type.key}`)}
              {#if current === type.key}
                <i class="fas fa-check-circle" aria-hidden="true"></i>
              {/if}
            </span>
            <PulseTrain rate={type.rate} width={BANDS[type.band].mid} />
            <span class="pill">{BANDS[type.band].mid} µs · {type.rate} Hz</span>
            <span class="muted">
              {$i18n.t(`setupWizardServoTypeHelp_${type.key}`)}
            </span>
          </button>
        {/each}
      </div>
      {#if !current}
        <!-- A rate that matches no type: the closest type's picture, its name and
             the servos' own values, as Ethos' pictureFor. -->
        <div class="custom">
          {#if nearest}
            <figure class="nearest">
              <ServoTypeArt
                rate={nearest.rate}
                width={BANDS[nearest.band].mid}
              />
              <figcaption>
                <span class="tile-name">
                  {$i18n.t("setupWizardServoTypeNearest", {
                    1: $i18n.t(`setupWizardServoType_${nearest.key}`),
                  })}
                </span>
                <span class="pill">
                  {FC.SERVO_CONFIG[servos[0].servo].mid} µs ·
                  {FC.SERVO_CONFIG[servos[0].servo].rate} Hz
                </span>
              </figcaption>
            </figure>
          {/if}
          <p class="muted">
            {$i18n.t("setupWizardServoTypeCustom", {
              1: FC.SERVO_CONFIG[servos[0].servo].mid,
              2: FC.SERVO_CONFIG[servos[0].servo].rate,
            })}
          </p>
        </div>
      {/if}

      <div class="rows">
        <!-- A frame rate of its own, within the band's range, as Ethos. -->
        <span>{$i18n.t("setupWizardServoTypeFrameRate")}</span>
        <span class="row-control">
          <NumberInput
            strict
            min={band.minHz}
            max={band.maxHz}
            bind:value={
              () => getRate(group.kind), (v) => setRate(group.kind, v)
            }
          />
          <span class="muted">
            {$i18n.t("setupWizardServoTypeHzUnit")} ({band.minHz}–{band.maxHz})
          </span>
        </span>

        <!-- Geometry correction: the cyclic servos only, their linkage
             swings in an arc; the tail's needs none. -->
        {#if group.kind === "swash"}
          <span>{$i18n.t("setupWizardGeoTitle")}</span>
          <span class="row-control" role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={!geoCor}
              class={["btn", !geoCor && "primary"]}
              onclick={() => setGeoCor(false)}
            >
              {$i18n.t("setupWizardGeoOff")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={geoCor}
              class={["btn", geoCor && "primary"]}
              onclick={() => setGeoCor(true)}
            >
              {$i18n.t("setupWizardGeoOn")}
            </button>
          </span>
          <span></span>
          <span class="muted">{$i18n.t("setupWizardGeoText")}</span>
        {/if}
      </div>
    </section>
  {/if}
{/each}

{#if wiz.servos.length === 0}
  <div class="note">{$i18n.t("setupWizardNoServos")}</div>
{/if}

<p class="muted">{$i18n.t("setupWizardServoTypeCheckMaker")}</p>

{#if rebootNeeded}
  <RebootLater />
{/if}

<div>
  <TabButton tab="servos">
    {$i18n.t("setupWizardOpenServos")}
  </TabButton>
</div>

<style lang="scss">
  /* A rate that matches no type: the closest type's picture with its caption,
     the note beside it; they stack on a narrow card. */
  .custom {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;

    p {
      flex: 1 1 220px;
      margin: 0;
    }
  }

  .nearest {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;

    figcaption {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  }

  /* Frame rate and geometry correction: a label, its control beside it. */
  .rows {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: center;
    gap: 8px 12px;
  }

  .row-control {
    display: flex;
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

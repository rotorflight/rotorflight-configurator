<script>
  import { getContext } from "svelte";

  import NumberInput from "@/components/NumberInput.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import PulseTrain from "./PulseTrain.svelte";
  import RebootLater from "./RebootLater.svelte";
  import ServoArt from "./ServoArt.svelte";
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

  // The type every servo of the group already has, or null.
  function currentType(kind) {
    const configs = groupServos(kind).map((s) => FC.SERVO_CONFIG[s.servo]);
    if (configs.length === 0) return null;
    const type = TYPES[kind].find(
      (t) => t.rate === configs[0].rate && t.band === bandOf(configs[0]),
    );
    return type &&
      configs.every((c) => c.rate === type.rate && bandOf(c) === type.band)
      ? type.key
      : null;
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
        <p class="muted">
          {$i18n.t("setupWizardServoTypeCustom", {
            1: FC.SERVO_CONFIG[servos[0].servo].mid,
            2: FC.SERVO_CONFIG[servos[0].servo].rate,
          })}
        </p>
      {/if}

      <div class="rows">
        <!-- A frame rate of its own, within the band's range, as Ethos. -->
        <span>{$i18n.t("setupWizardServoTypeFrameRate")}</span>
        <span class="row-control">
          <NumberInput
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

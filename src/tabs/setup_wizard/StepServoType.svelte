<script>
  import { getContext } from "svelte";

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
  const TYPES = [
    { key: "analog", band: "wide" },
    { key: "digital", band: "wide" },
    { key: "narrow", band: "narrow" },
  ];
  // Frame rate (Hz) per group and type. Digital is 165 Hz on cyclic and
  // 200 Hz on tail. These values are not yet checked against the radio
  // suites. A servo already at a rate no tile offers (333 Hz, say) shows as
  // custom until a type is chosen. The tail doesn't offer Analog.
  const RATES = {
    swash: { analog: 50, digital: 165, narrow: 560 },
    tail: { digital: 200, narrow: 560 },
  };
  const BANDS = {
    wide: { mid: 1520, travel: 700, scale: 500 },
    narrow: { mid: 760, travel: 250, scale: 250 },
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

  // The types a group offers, in TYPES order.
  function typesFor(kind) {
    return TYPES.filter((t) => t.key in RATES[kind]);
  }

  function rateOf(kind, key) {
    return RATES[kind][key];
  }

  // The type every servo of the group already has, or null.
  function currentType(kind) {
    const configs = groupServos(kind).map((s) => FC.SERVO_CONFIG[s.servo]);
    if (configs.length === 0) return null;
    const type = typesFor(kind).find(
      (t) =>
        rateOf(kind, t.key) === configs[0].rate &&
        t.band === bandOf(configs[0]),
    );
    return type &&
      configs.every(
        (c) => c.rate === rateOf(kind, type.key) && bandOf(c) === type.band,
      )
      ? type.key
      : null;
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
    const type = typesFor(kind).find((t) => t.key === key);
    const rate = rateOf(kind, key);
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
    <section class="card">
      <h3>{$i18n.t(group.title)}</h3>
      <span class="muted">
        {servos.map((s) => wiz.servoLabel(s)).join(" · ")}
      </span>
      <div class="tiles" role="radiogroup">
        {#each typesFor(group.kind) as type (type.key)}
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
            <PulseTrain
              rate={rateOf(group.kind, type.key)}
              width={BANDS[type.band].mid}
            />
            <span class="pill"
              >{BANDS[type.band].mid} µs · {rateOf(group.kind, type.key)} Hz</span
            >
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
    </section>
  {/if}
{/each}

{#if groupServos("swash").length > 0}
  <section class="card">
    <h3>{$i18n.t("setupWizardGeoTitle")}</h3>
    <p>{$i18n.t("setupWizardGeoText")}</p>
    <div class="tiles" role="radiogroup">
      <button
        type="button"
        role="radio"
        aria-checked={!geoCor}
        class={["tile", !geoCor && "selected"]}
        onclick={() => setGeoCor(false)}
      >
        <span class="tile-name">{$i18n.t("setupWizardGeoOff")}</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={geoCor}
        class={["tile", geoCor && "selected"]}
        onclick={() => setGeoCor(true)}
      >
        <span class="tile-name">{$i18n.t("setupWizardGeoOn")}</span>
      </button>
    </div>
  </section>
{/if}

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

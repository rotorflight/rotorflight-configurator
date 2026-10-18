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
  // changes, so a type change within a band keeps any calibration. The
  // usual values are the Servos tab's (servoType() there).
  const TYPES = [
    { key: "analog", rate: 50, band: "wide" },
    { key: "digital", rate: 333, band: "wide" },
    { key: "narrow", rate: 560, band: "narrow" },
  ];
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

  // The type every servo of the group already has, or null.
  function currentType(kind) {
    const configs = groupServos(kind).map((s) => FC.SERVO_CONFIG[s.servo]);
    if (configs.length === 0) return null;
    const type = TYPES.find(
      (t) => t.rate === configs[0].rate && t.band === bandOf(configs[0]),
    );
    return type &&
      configs.every((c) => c.rate === type.rate && bandOf(c) === type.band)
      ? type.key
      : null;
  }

  function apply(kind, key) {
    const type = TYPES.find((t) => t.key === key);
    for (const s of groupServos(kind)) {
      const config = FC.SERVO_CONFIG[s.servo];
      if (config.rate !== type.rate) {
        rebootNeeded = true;
        wiz.requestReboot();
      }
      config.rate = type.rate;
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
        {#each TYPES as type (type.key)}
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

<script>
  import { getContext, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  // Rescue on or off, and whether it flips the helicopter upright. The rescue
  // settings are kept per PID profile on the FC, so each profile gets the
  // same values: it is selected, written, and the active one selected again
  // (as the Ethos wizard does). Needs a rescue switch, which the Mode switches
  // step assigns.

  const wiz = getContext("setupWizard");

  // The Rescue box (rotorflight-firmware msp/msp_box.c).
  const RESCUE_BOX = 53;
  const MAX_PROFILES = 6;

  // The rescue fields of a PID profile (MSP_RESCUE_PROFILE).
  function rescueFields(profile) {
    return Object.fromEntries(
      Object.entries(profile).filter(([key]) => key.startsWith("rescue")),
    );
  }

  let loaded = $state(false);
  let indexes = $state([]);
  let profiles = $state({});
  let snapshot = {};
  let activeIndex = 0;
  let enabled = $state(false);
  let flip = $state(false);
  let changed = $state(false);

  let switchAssigned = $derived(
    FC.MODE_RANGES.some(
      (r) => r.id === RESCUE_BOX && r.range.start < r.range.end,
    ),
  );

  onMount(async () => {
    activeIndex = FC.CONFIG.profile;
    // Reading a profile replaces the rescue fields in FC.PID_PROFILE, so the
    // values as they are now are put back after the reads.
    snapshot = rescueFields(FC.PID_PROFILE);
    const count = Math.min(FC.CONFIG.numProfiles || 1, MAX_PROFILES);
    const list = Array.from({ length: count }, (_, i) => i);
    for (const i of list) {
      await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [i]);
      await MSP.promise(MSPCodes.MSP_RESCUE_PROFILE);
      profiles[i] = rescueFields(FC.PID_PROFILE);
    }
    await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [activeIndex]);
    Object.assign(FC.PID_PROFILE, snapshot);
    const active = profiles[activeIndex] ?? snapshot;
    enabled = active.rescueMode > 0;
    flip = active.rescueFlipMode === 1;
    indexes = list;
    loaded = true;
  });

  function markChanged() {
    changed = true;
    wiz.markChanged();
  }

  function setEnabled(value) {
    if (enabled === value) return;
    enabled = value;
    markChanged();
  }

  function setFlip(value) {
    if (flip === value) return;
    flip = value;
    markChanged();
  }

  // Written to every profile on Save. Altitude hold (mode 2) stays when the
  // pilot keeps Rescue on, as the active profile had it.
  wiz.setCommit(async () => {
    if (!changed) return;
    const keepAltHold = profiles[activeIndex]?.rescueMode === 2;
    const mode = enabled ? (keepAltHold ? 2 : 1) : 0;
    for (const i of indexes) {
      const original = profiles[i];
      if (!original) continue;
      await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [i]);
      Object.assign(FC.PID_PROFILE, original, {
        rescueMode: mode,
        rescueFlipMode: flip ? 1 : 0,
      });
      await MSP.promise(
        MSPCodes.MSP_SET_RESCUE_PROFILE,
        mspHelper.crunch(MSPCodes.MSP_SET_RESCUE_PROFILE),
      );
    }
    await MSP.promise(MSPCodes.MSP_SELECT_SETTING, [activeIndex]);
    Object.assign(FC.PID_PROFILE, snapshot);
    changed = false;
  });
</script>

<div class="intro">
  <p>{$i18n.t("setupWizardRescueIntro")}</p>
</div>

{#if !loaded}
  <div class="note">{$i18n.t("setupWizardRescueLoading")}</div>
{:else}
  <section class="card">
    <h3>{$i18n.t("setupWizardRescueEnableTitle")}</h3>
    <div class="tiles" role="radiogroup">
      <button
        type="button"
        role="radio"
        aria-checked={!enabled}
        class={["tile", !enabled && "selected"]}
        disabled={!switchAssigned}
        onclick={() => setEnabled(false)}
      >
        <span class="tile-name">{$i18n.t("setupWizardRescueOff")}</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={enabled}
        class={["tile", enabled && "selected"]}
        disabled={!switchAssigned}
        onclick={() => setEnabled(true)}
      >
        <span class="tile-name">{$i18n.t("setupWizardRescueOn")}</span>
      </button>
    </div>
  </section>

  <section class="card">
    <h3>{$i18n.t("setupWizardRescueFlipTitle")}</h3>
    <div class="tiles" role="radiogroup">
      <button
        type="button"
        role="radio"
        aria-checked={!flip}
        class={["tile", !flip && "selected"]}
        disabled={!switchAssigned}
        onclick={() => setFlip(false)}
      >
        <span class="tile-name">{$i18n.t("setupWizardRescueNoFlip")}</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={flip}
        class={["tile", flip && "selected"]}
        disabled={!switchAssigned}
        onclick={() => setFlip(true)}
      >
        <span class="tile-name">{$i18n.t("setupWizardRescueFlip")}</span>
      </button>
    </div>
  </section>

  {#if !switchAssigned}
    <div class="note">{$i18n.t("setupWizardRescueNoSwitch")}</div>
  {/if}
{/if}

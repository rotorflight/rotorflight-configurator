<script>
  import { getContext, onDestroy, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { resetToOff } from "@/tabs/adjustments/util.js";

  import SwitchFlick from "./SwitchFlick.svelte";
  import TabButton from "./TabButton.svelte";
  import {
    ADJ,
    AUX_IN_8_CHANNELS,
    CONTROL_CHANNELS,
    GAIN_BUTTONS,
    GAIN_STEP,
    MAX_PROFILE_POSITIONS,
    buttonAt,
    channelNumber,
    channelOf,
    gainMode,
    knobRange,
    mappedValue,
    profileMode,
    profileRange,
    rangeOf,
    slotFor,
    steppedGainRange,
    switchPositions,
  } from "./adjust.js";
  import { movedChannel } from "./heli.js";

  // One switch picks the PID profile (and, by default, the rate profile).
  // That fits an 8-channel link (ARM, profile, rescue/trainer on CH6-8).
  // Master gain in flight, for finding the right gain, takes the trim
  // buttons or a knob on a channel of its own. Ranges are sent as soon as
  // they are set, so the switch works on the bench straight away; Save
  // writes them to EEPROM.
  const wiz = getContext("setupWizard");

  const LISTEN_MS = 20000;
  const POLL_MS = 100;
  // A switch or knob moves its channel a long way; a trim button on the
  // shared channel jumps it at least 150 us.
  const MOVE_US = { profile: 300, knob: 250, buttons: 100 };

  let pollTimer;
  let stopped = false;
  let listening = $state(null); // "profile" | "knob" | "buttons"
  let start = [];
  let peaks = [];
  let listenTimer;

  // The profile switch, once found: its channel and the positions seen.
  let profileAux = $state(null);
  let samples = $state([]);

  let ranges = $derived(FC.ADJUSTMENT_RANGES ?? []);

  function auxValues() {
    return FC.RC.channels.slice(CONTROL_CHANNELS, FC.RC.active_channels);
  }

  function auxValue(aux) {
    return aux === null
      ? null
      : (FC.RC.channels[CONTROL_CHANNELS + aux] ?? null);
  }

  onMount(() => {
    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_RC);
      if (listening) detect();
      if (profileAux !== null) record();
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    }
    poll();
  });

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
    clearTimeout(listenTimer);
  });

  function listen(kind) {
    clearTimeout(listenTimer);
    start = auxValues();
    peaks = start.map(() => 0);
    listening = kind;
    if (kind === "profile") {
      profileAux = null;
      samples = [];
    }
    listenTimer = setTimeout(cancel, LISTEN_MS);
  }

  function cancel() {
    clearTimeout(listenTimer);
    listening = null;
    profileAux = null;
    samples = [];
  }

  function detect() {
    const now = auxValues();
    peaks = peaks.map((p, i) =>
      Math.max(p, Math.abs((now[i] ?? 0) - (start[i] ?? 0))),
    );
    const aux = movedChannel(peaks, [], MOVE_US[listening]);
    if (aux < 0) return;
    const kind = listening;
    clearTimeout(listenTimer);
    listening = null;
    if (kind === "profile") {
      // Found: now record every position the pilot moves it through.
      profileAux = aux;
      samples = [start[aux], now[aux]];
      listenTimer = setTimeout(cancel, LISTEN_MS);
    } else if (kind === "knob") {
      writeGain((fn) => knobRange(fn, aux));
    } else {
      writeGain((fn) => steppedGainRange(fn, aux));
    }
  }

  function record() {
    const value = auxValue(profileAux);
    if (value > 0) samples = [...samples, value];
  }

  let positions = $derived(switchPositions(samples));

  //// Adjustment slots.

  let full = $state(false);

  async function sendSlot(index) {
    await new Promise((resolve) =>
      mspHelper.sendAdjustmentRange(index, resolve),
    );
    wiz.markChanged();
  }

  async function writeRange(range) {
    const index = slotFor(FC.ADJUSTMENT_RANGES, range.adjFunction);
    if (index < 0) {
      full = true;
      return;
    }
    FC.ADJUSTMENT_RANGES[index] = range;
    await sendSlot(index);
  }

  async function removeFunction(adjFunction) {
    const index = FC.ADJUSTMENT_RANGES.findIndex(
      (r) => r?.adjFunction === adjFunction,
    );
    if (index < 0) return;
    resetToOff(FC.ADJUSTMENT_RANGES[index]);
    await sendSlot(index);
  }

  //// Profile switch.

  let profiles = $state(profileMode(FC.ADJUSTMENT_RANGES ?? []));

  async function chooseProfiles(value) {
    if (profiles === value) return;
    cancel();
    profiles = value;
    if (value === "none") {
      await removeFunction(ADJ.PID_PROFILE);
      await removeFunction(ADJ.RATE_PROFILE);
    } else if (value === "pid") {
      await removeFunction(ADJ.RATE_PROFILE);
    } else {
      // Rates follow the PID profile switch already set up.
      const pid = rangeOf(FC.ADJUSTMENT_RANGES, ADJ.PID_PROFILE);
      if (pid) await writeRange({ ...pid, adjFunction: ADJ.RATE_PROFILE });
    }
  }

  async function useSwitch() {
    const aux = profileAux;
    const found = positions;
    clearTimeout(listenTimer);
    profileAux = null;
    samples = [];
    await writeRange(profileRange(ADJ.PID_PROFILE, aux, found));
    if (profiles === "both") {
      await writeRange(profileRange(ADJ.RATE_PROFILE, aux, found));
    }
  }

  let pidRange = $derived(rangeOf(ranges, ADJ.PID_PROFILE));
  let profileCount = $derived(pidRange ? pidRange.adjMax : 1);
  let switchPosition = $derived(auxValue(pidRange?.adjChannel ?? null));
  let liveProfile = $derived(
    pidRange && switchPosition ? mappedValue(pidRange, switchPosition) : null,
  );

  //// Master gain.

  let gain = $state(gainMode(FC.ADJUSTMENT_RANGES ?? []));

  async function writeGain(build) {
    await writeRange(build(ADJ.CYCLIC_MASTER_GAIN));
    await writeRange(build(ADJ.YAW_MASTER_GAIN));
  }

  async function chooseGain(value) {
    if (gain === value) return;
    cancel();
    gain = value;
    // The trim-button and knob ranges are set up differently, so a change
    // of method starts again from Detect.
    await removeFunction(ADJ.CYCLIC_MASTER_GAIN);
    await removeFunction(ADJ.YAW_MASTER_GAIN);
  }

  let gainChannel = $derived(channelOf(ranges, ADJ.CYCLIC_MASTER_GAIN));
  let gainPosition = $derived(auxValue(gainChannel));
  let pressed = $derived(gain === "buttons" ? buttonAt(gainPosition) : null);
  let knobValue = $derived.by(() => {
    const range = rangeOf(ranges, ADJ.CYCLIC_MASTER_GAIN);
    return gain === "knob" && range && gainPosition
      ? mappedValue(range, gainPosition)
      : null;
  });

  //// Channels: the link's count, and what each AUX channel does.

  let channelCount = $derived(FC.RC.active_channels ?? 0);

  let users = $derived.by(() => {
    const list = [];
    (FC.MODE_RANGES ?? []).forEach((r) => {
      if (!(r.range.start < r.range.end)) return;
      const box = FC.AUX_CONFIG_IDS?.indexOf(r.id) ?? -1;
      list.push({
        label: box >= 0 ? FC.AUX_CONFIG[box] : String(r.id),
        aux: r.auxChannelIndex,
      });
    });
    if (pidRange) {
      list.push({
        label: $i18n.t("setupWizardProfilesUseProfile"),
        aux: pidRange.adjChannel,
      });
    }
    if (gainChannel !== null) {
      list.push({
        label: $i18n.t("setupWizardProfilesUseGain"),
        aux: gainChannel,
      });
    }
    return list;
  });

  // One line per AUX channel in use: "CH 6: ARM".
  let channelPlan = $derived.by(() => {
    const plan = [];
    for (const u of users) {
      let entry = plan.find((c) => c.aux === u.aux);
      if (!entry) {
        entry = { aux: u.aux, names: [] };
        plan.push(entry);
      }
      if (!entry.names.includes(u.label)) entry.names.push(u.label);
    }
    return plan.sort((a, b) => a.aux - b.aux);
  });

  let beyond8 = $derived(channelPlan.some((c) => c.aux >= AUX_IN_8_CHANNELS));
</script>

<div class="with-art">
  <div class="art"><SwitchFlick /></div>
  <div class="text">
    <p>{$i18n.t("setupWizardProfilesIntro")}</p>
    <p class="muted">{$i18n.t("setupWizardProfilesFit8")}</p>
  </div>
</div>

{#if full}
  <div class="note">{$i18n.t("setupWizardProfilesFull")}</div>
{/if}

<section class={["card", pidRange && "complete"]}>
  <h3><span class="num">1</span>{$i18n.t("setupWizardProfilesSwitchTitle")}</h3>
  <div class="tiles" role="radiogroup">
    {#each ["both", "pid", "none"] as value (value)}
      <button
        type="button"
        role="radio"
        aria-checked={profiles === value}
        class={["tile", profiles === value && "selected"]}
        onclick={() => chooseProfiles(value)}
      >
        <span class="tile-name">
          {$i18n.t(`setupWizardProfiles_${value}`)}
          {#if profiles === value}
            <i class="fas fa-check-circle" aria-hidden="true"></i>
          {/if}
        </span>
        <span class="muted">{$i18n.t(`setupWizardProfilesHelp_${value}`)}</span>
      </button>
    {/each}
  </div>

  {#if profiles !== "none"}
    <p>{$i18n.t("setupWizardProfilesSwitchText")}</p>
    {#if pidRange}
      <span class="pill">
        CH {channelNumber(pidRange.adjChannel)} · {$i18n.t(
          "setupWizardProfilesCount",
          { 1: profileCount },
        )}
      </span>
      {#if liveProfile}
        <span class="good-text">
          {$i18n.t(
            profiles === "both"
              ? "setupWizardProfilesNowBoth"
              : "setupWizardProfilesNow",
            { 1: liveProfile },
          )}
        </span>
      {/if}
    {/if}
    <div class="actions">
      {#if listening === "profile"}
        <span class="listening">{$i18n.t("setupWizardProfilesListening")}</span>
        <button class="btn" onclick={cancel}>{$i18n.t("cancel")}</button>
      {:else if profileAux !== null}
        <span class="listening">
          {$i18n.t("setupWizardProfilesPositions", {
            1: channelNumber(profileAux),
            2: Math.min(positions.length, MAX_PROFILE_POSITIONS),
          })}
        </span>
        <button
          class="btn primary"
          disabled={positions.length < 2}
          onclick={useSwitch}
        >
          {$i18n.t("setupWizardProfilesUse")}
        </button>
        <button class="btn" onclick={cancel}>{$i18n.t("cancel")}</button>
      {:else}
        <button
          class="btn"
          disabled={listening !== null}
          onclick={() => listen("profile")}
        >
          {pidRange
            ? $i18n.t("setupWizardModesReassign")
            : $i18n.t("setupWizardModesAssign")}
        </button>
      {/if}
    </div>
  {/if}
</section>

<section class="card">
  <h3><span class="num">2</span>{$i18n.t("setupWizardProfilesGainTitle")}</h3>
  <p>{$i18n.t("setupWizardProfilesGainText")}</p>
  <div class="tiles" role="radiogroup">
    {#each ["buttons", "knob", "none"] as value (value)}
      <button
        type="button"
        role="radio"
        aria-checked={gain === value}
        class={["tile", gain === value && "selected"]}
        onclick={() => chooseGain(value)}
      >
        <span class="tile-name">
          {$i18n.t(`setupWizardGain_${value}`)}
          {#if gain === value}
            <i class="fas fa-check-circle" aria-hidden="true"></i>
          {/if}
        </span>
        <span class="muted">{$i18n.t(`setupWizardGainHelp_${value}`)}</span>
      </button>
    {/each}
  </div>

  {#if gain !== "none"}
    {#if channelCount > 0 && channelCount <= CONTROL_CHANNELS + AUX_IN_8_CHANNELS}
      <div class="note">
        {$i18n.t("setupWizardGainNeedsChannel", { 1: channelCount })}
      </div>
    {/if}

    {#if gain === "buttons"}
      <p>{$i18n.t("setupWizardGainButtonsText", { 1: GAIN_STEP })}</p>
      <ol class="guide">
        <li>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html $i18n.t("setupWizardGainButtonsStep1")}</p>
          <img
            src="/images/setup_wizard/ethos_heli_trims_page.png"
            alt={$i18n.t("setupWizardGainButtonsImage1")}
          />
        </li>
        <li>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          <p>{@html $i18n.t("setupWizardGainButtonsStep2")}</p>
          <div class="buttons-table">
            <span class="muted">{$i18n.t("setupWizardGainButton")}</span>
            <span class="muted">{$i18n.t("setupWizardGainWeight")}</span>
            <span class="muted">{$i18n.t("setupWizardGainDoes")}</span>
            {#each GAIN_BUTTONS as b (b.key)}
              <span class={[pressed?.key === b.key && "pressed"]}>
                {b.button}
              </span>
              <span class="pill">{b.weight}%</span>
              <span class={[pressed?.key === b.key && "pressed"]}>
                {$i18n.t(`setupWizardGainButton_${b.key}`, { 1: GAIN_STEP })}
              </span>
            {/each}
          </div>
          <img
            class="tall"
            src="/images/setup_wizard/ethos_heli_gain_mix.png"
            alt={$i18n.t("setupWizardGainButtonsImage2")}
          />
        </li>
        <li>
          <p>{$i18n.t("setupWizardGainButtonsStep3")}</p>
          <img
            src="/images/setup_wizard/ethos_heli_gain_mixes.png"
            alt={$i18n.t("setupWizardGainButtonsImage3")}
          />
        </li>
      </ol>
      <p class="muted">{$i18n.t("setupWizardGainButtonsRadio")}</p>
    {:else}
      <p>{$i18n.t("setupWizardGainKnobText")}</p>
      {#if knobValue !== null}
        <span class="good-text">
          {$i18n.t("setupWizardGainKnobNow", { 1: knobValue })}
        </span>
      {/if}
    {/if}

    {#if gainChannel !== null}
      <span class="pill">CH {channelNumber(gainChannel)}</span>
    {/if}
    <div class="actions">
      {#if listening === gain}
        <span class="listening">
          {$i18n.t(
            gain === "buttons"
              ? "setupWizardGainListeningButtons"
              : "setupWizardGainListeningKnob",
          )}
        </span>
        <button class="btn" onclick={cancel}>{$i18n.t("cancel")}</button>
      {:else}
        <button
          class="btn"
          disabled={listening !== null}
          onclick={() => listen(gain)}
        >
          {gainChannel !== null
            ? $i18n.t("setupWizardModesReassign")
            : $i18n.t("setupWizardModesAssign")}
        </button>
      {/if}
    </div>
  {/if}
</section>

{#if channelPlan.length > 0}
  <section class="card">
    <h3>{$i18n.t("setupWizardProfilesChannelsTitle")}</h3>
    <ul class="plan">
      {#each channelPlan as c (c.aux)}
        <li>
          <span class="pill">CH {channelNumber(c.aux)}</span>
          {c.names.join(", ")}
        </li>
      {/each}
    </ul>
    {#if beyond8}
      <p class="muted">{$i18n.t("setupWizardProfilesBeyond8")}</p>
    {/if}
  </section>
{/if}

<div>
  <TabButton tab="adjustments"
    >{$i18n.t("setupWizardOpenAdjustments")}</TabButton
  >
</div>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .btn.primary {
    @extend %button-primary;
  }

  .buttons-table {
    display: grid;
    grid-template-columns: auto auto auto;
    justify-content: start;
    align-items: center;
    gap: 6px 12px;
    margin: 6px 0 10px;
  }

  .guide {
    margin: 0;
    padding-left: 1.4em;
    display: flex;
    flex-direction: column;
    gap: 14px;

    img {
      display: block;
      width: 100%;
      max-width: 400px;
      margin-top: 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border-soft);
    }

    img.tall {
      max-width: 340px;
    }
  }

  .pressed {
    font-weight: 700;
    color: var(--color-accent-500);
  }

  .plan {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .listening {
    font-weight: 600;
    color: var(--color-accent-500);
    animation: waiting 0.8s ease-in-out infinite alternate;
  }

  @keyframes waiting {
    from {
      opacity: 0.4;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .listening {
      animation: none;
    }
  }
</style>

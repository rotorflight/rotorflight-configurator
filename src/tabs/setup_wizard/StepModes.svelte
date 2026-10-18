<script>
  import { getContext, onDestroy, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { bit_check } from "@/js/serial_backend";

  import SwitchFlick from "./SwitchFlick.svelte";
  import TabButton from "./TabButton.svelte";
  import { channelNumber } from "./adjust.js";
  import { rangeForSwitch } from "./heli.js";

  // Click Assign, flick the switch: the wizard sees which AUX channel moved
  // and where it went, and writes a mode range for that position.
  const wiz = getContext("setupWizard");

  // Permanent box IDs (rotorflight-firmware msp/msp_box.c). ARM is the
  // only one the heli can't fly without. RESCUE and TRAINER need an
  // accelerometer, so the FC only reports them on a board with one.
  const MODES = [
    { id: 0, key: "arm", name: "ARM", icon: "fa-power-off", required: true },
    { id: 53, key: "rescue", name: "RESCUE", icon: "fa-life-ring" },
    { id: 47, key: "trainer", name: "TRAINER", icon: "fa-graduation-cap" },
  ];

  // Only the modes this FC offers.
  let offered = $derived(MODES.filter((m) => FC.AUX_CONFIG.includes(m.name)));

  // Roll, pitch, yaw, collective and throttle come before AUX1.
  const AUX_OFFSET = 5;
  const MOVE_US = 300; // a switch, not stick noise
  const SETTLE_MS = 400;
  const LISTEN_MS = 15000;
  const POLL_MS = 100;
  const EMPTY_RANGE = { start: 1500, end: 1500 };

  let listening = $state(null);
  let baseline = [];
  let detectTimer;
  let settleTimer;
  let pollTimer;
  let stopped = false;

  onMount(() => {
    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_RC);
      if (listening !== null) detect();
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    }
    poll();
  });

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
    clearTimeout(detectTimer);
    clearTimeout(settleTimer);
  });

  // Where an AUX channel is now (us).
  function auxValue(aux) {
    return FC.RC.channels[AUX_OFFSET + aux] ?? null;
  }

  function auxValues() {
    return FC.RC.channels.slice(AUX_OFFSET, FC.RC.active_channels);
  }

  function rangeIndex(mode) {
    return FC.MODE_RANGES.findIndex(
      (r) => r.id === mode.id && r.range.start < r.range.end,
    );
  }

  function assignment(mode) {
    const index = rangeIndex(mode);
    return index < 0 ? null : FC.MODE_RANGES[index];
  }

  function switchInRange(range) {
    const value = auxValue(range.auxChannelIndex);
    return value >= range.range.start && value <= range.range.end;
  }

  // ARM can't really come on while the wizard holds overrides, so show the
  // switch position instead.
  function isOn(mode, range) {
    if (mode.id === 0) return switchInRange(range);
    const index = FC.AUX_CONFIG.indexOf(mode.name);
    return index >= 0 && bit_check(FC.CONFIG.mode, index);
  }

  function listen(mode) {
    clearTimeout(detectTimer);
    clearTimeout(settleTimer);
    settleTimer = null;
    baseline = auxValues();
    listening = mode.id;
    detectTimer = setTimeout(() => (listening = null), LISTEN_MS);
  }

  function cancel() {
    clearTimeout(detectTimer);
    clearTimeout(settleTimer);
    settleTimer = null;
    listening = null;
  }

  // The channel that moved furthest from where it was when Assign was
  // clicked. Wait for it to settle, then take where it ended up.
  function detect() {
    if (settleTimer) return;
    const now = auxValues();
    let best = -1;
    let bestMove = MOVE_US;
    now.forEach((value, aux) => {
      const move = Math.abs(value - (baseline[aux] ?? value));
      if (move > bestMove) {
        best = aux;
        bestMove = move;
      }
    });
    if (best < 0) return;

    const modeId = listening;
    settleTimer = setTimeout(() => {
      settleTimer = null;
      const from = baseline[best];
      const to = auxValues()[best];
      cancel();
      if (Math.abs(to - from) > MOVE_US) {
        save(
          MODES.find((m) => m.id === modeId),
          best,
          from,
          to,
        );
      }
    }, SETTLE_MS);
  }

  async function writeSlot(index, id, auxChannelIndex, range) {
    FC.MODE_RANGES[index] = { id, auxChannelIndex, range };
    FC.MODE_RANGES_EXTRA[index] = {
      ...(FC.MODE_RANGES_EXTRA[index] ?? {}),
      id,
      modeLogic: 0,
      linkedTo: 0,
    };
    await new Promise((resolve) => mspHelper.sendModeRange(index, resolve));
    wiz.markChanged();
  }

  async function save(mode, aux, from, to) {
    let index = rangeIndex(mode);
    if (index < 0) {
      index = FC.MODE_RANGES.findIndex((r) => !(r.range.start < r.range.end));
    }
    if (index < 0) return;
    await writeSlot(index, mode.id, aux, rangeForSwitch(from, to));
  }

  async function remove(mode) {
    const index = rangeIndex(mode);
    if (index < 0) return;
    await writeSlot(index, 0, 0, { ...EMPTY_RANGE });
  }
</script>

<div class="with-art">
  <div class="art"><SwitchFlick /></div>
  <div class="text">
    <p>{$i18n.t("setupWizardModesIntro")}</p>
    <p class="muted">{$i18n.t("setupWizardModesHow")}</p>
    <p class="muted">{$i18n.t("setupWizardModesFit8")}</p>
  </div>
</div>

<div class="modes">
  {#each offered as mode (mode.id)}
    {@const range = assignment(mode)}
    <section class={["card", range && "complete"]}>
      <h3>
        <i class={["fas", mode.icon]} aria-hidden="true"></i>
        {$i18n.t(`setupWizardMode_${mode.key}`)}
        {#if mode.required}
          <span class="badge warn">{$i18n.t("setupWizardModesRequired")}</span>
        {/if}
        {#if range && isOn(mode, range)}
          <span class="badge good">{$i18n.t("setupWizardModesOn")}</span>
        {/if}
      </h3>
      <p class="muted">{$i18n.t(`setupWizardModeHelp_${mode.key}`)}</p>
      {#if range}
        <span class="pill">
          CH {channelNumber(range.auxChannelIndex)} · {range.range.start}–{range
            .range.end} µs
        </span>
      {/if}
      <div class="actions">
        {#if listening === mode.id}
          <span class="listening">{$i18n.t("setupWizardModesListening")}</span>
          <button class="btn" onclick={cancel}>{$i18n.t("cancel")}</button>
        {:else}
          <button
            class="btn"
            disabled={listening !== null}
            onclick={() => listen(mode)}
          >
            {range
              ? $i18n.t("setupWizardModesReassign")
              : $i18n.t("setupWizardModesAssign")}
          </button>
          {#if range}
            <button class="btn" onclick={() => remove(mode)}>
              {$i18n.t("setupWizardModesRemove")}
            </button>
          {/if}
        {/if}
      </div>
    </section>
  {/each}
</div>

<div>
  <TabButton tab="auxiliary">
    {$i18n.t("setupWizardOpenModes")}
  </TabButton>
</div>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .modes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
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

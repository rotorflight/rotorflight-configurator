<script>
  import { onDestroy, onMount } from "svelte";

  import HoverTooltip from "@/components/HoverTooltip.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import Slider from "@/components/Slider.svelte";
  import Switch from "@/components/Switch.svelte";
  import Tooltip from "@/components/Tooltip.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import OutputIcon from "./OutputIcon.svelte";
  import {
    FIRST_MOTOR,
    dynamicOverrideGroups,
    simulateOutputValue,
  } from "./rules.js";

  let { motorised, hasPassthrough } = $props();

  // Override axes as in the legacy tab: value in display units, scale to
  // the FC's override units. The tail row depends on the tail rotor mode.
  const MAIN_AXES = [1, 2, 4].map((axis) => ({
    axis,
    min: -18,
    max: 18,
    step: 0.1,
    fixed: 1,
    scale: 0.012,
    pips: [-18, -12, -6, 0, 6, 12, 18],
  }));
  const TAIL_ROTOR = {
    axis: 3,
    min: -60,
    max: 60,
    step: 1,
    fixed: 0,
    scale: 0.024,
    pips: [-60, -40, -20, 0, 20, 40, 60],
  };
  const TAIL_MOTOR = {
    axis: 3,
    min: -125,
    max: 125,
    step: 1,
    fixed: 0,
    scale: 0.1,
    pips: [-125, -100, -50, 0, 50, 100, 125],
  };

  let axes = $derived([...MAIN_AXES, motorised ? TAIL_MOTOR : TAIL_ROTOR]);

  function rowFromFc(def) {
    const raw = FC.MIXER_OVERRIDE[def.axis];
    const enabled = Mixer.overrideEnabled(raw);
    const passthrough = Mixer.passthroughEnabled(raw);
    const mutable = enabled && !passthrough;
    return {
      enabled,
      passthrough,
      value: mutable ? Number((raw * def.scale).toFixed(def.fixed)) : 0,
    };
  }

  const initialRows = {};
  for (const def of [...MAIN_AXES, TAIL_ROTOR]) {
    initialRows[def.axis] = rowFromFc(def);
  }
  const initialOverride = Object.values(initialRows).some((r) => r.enabled);
  const initialPassthrough = Object.values(initialRows).some(
    (r) => r.passthrough,
  );
  FC.CONFIG.mixerOverrideEnabled = initialOverride;
  FC.CONFIG.mixerPassthroughEnabled = initialPassthrough;

  let rows = $state(initialRows);
  let overrideEnabled = $state(initialOverride);
  let passthroughEnabled = $state(initialPassthrough);

  function send(def) {
    const row = rows[def.axis];
    let value = Mixer.OVERRIDE_OFF;
    if (row.enabled) {
      value = row.passthrough
        ? Mixer.OVERRIDE_PASSTHROUGH
        : Math.round(row.value / def.scale);
    }
    FC.MIXER_OVERRIDE[def.axis] = value;
    mspHelper.sendMixerOverride(def.axis);
  }

  function setEnabled(def, enabled) {
    const row = rows[def.axis];
    row.enabled = enabled;
    row.value = 0;
    if (!enabled) {
      row.passthrough = false;
    }
    send(def);
  }

  function setPassthrough(def, passthrough) {
    const row = rows[def.axis];
    row.passthrough = passthrough;
    if (passthrough) {
      row.enabled = true;
    }
    send(def);
  }

  function onOverrideSwitch(checked) {
    overrideEnabled = checked;
    FC.CONFIG.mixerOverrideEnabled = checked;
    if (!checked) {
      passthroughEnabled = false;
      FC.CONFIG.mixerPassthroughEnabled = false;
    }
    for (const def of axes) {
      setEnabled(def, checked);
    }
  }

  function onPassthroughSwitch(checked) {
    passthroughEnabled = checked;
    FC.CONFIG.mixerPassthroughEnabled = checked;
    if (checked && !overrideEnabled) {
      onOverrideSwitch(true);
    }
    for (const def of axes) {
      setPassthrough(def, checked);
    }
  }

  // A tail rotor mode change swaps the tail row's range: start it at 0.
  let lastMotorised;
  $effect(() => {
    if (lastMotorised === undefined) {
      lastMotorised = motorised;
    } else if (motorised !== lastMotorised) {
      lastMotorised = motorised;
      const def = motorised ? TAIL_MOTOR : TAIL_ROTOR;
      if (rows[3].enabled && !rows[3].passthrough) {
        rows[3].value = 0;
        send(def);
      }
    }
  });

  function sliderOpts(def) {
    return {
      range: { min: def.min, max: def.max },
      start: 0,
      step: def.step,
      behaviour: "snap-drag",
      pips: { mode: "values", values: def.pips, density: 100 },
    };
  }

  // ---------------------------------------------------------------
  // Per-output rows for the custom mixer rules
  // ---------------------------------------------------------------

  const DYN_PIPS = [1000, 1250, 1500, 1750, 2000];

  // Displayed value per input, in microseconds. Shared state rather
  // than a value computed per render: NumberInput and Slider both
  // declare value as $bindable and assign to it on interaction, so a
  // one-way prop leaves their copy drifting from ours - the slider ends
  // up somewhere the number field disagrees with, and stops tracking.
  // Binding both to the same entry keeps the two in step by
  // construction, leaving onchange to do nothing but push to the FC.
  let dynUs = $state({});

  // Live physical output, polled from the FC. Motors are excluded -
  // see isSimulated below.
  let liveValues = $state({});

  let groups = $derived(dynamicOverrideGroups(FC.MIXER_RULES));

  /**
   * A motor can't actually be driven from here: firmware's motorUpdate()
   * only feeds the mixer's motor outputs to the ESCs while ARMED, while
   * mixerSetInput() only honours an input override while DISARMED. So
   * the override can never reach a motor - those rows are simulated
   * instead, computed from the rules rather than sent and read back.
   */
  function isSimulated(dst) {
    return dst >= FIRST_MOTOR;
  }

  /**
   * A motor's travel is one-sided: 1000us is off and 2000us is full, so
   * the whole slider maps to 0-100% throttle with zero at the bottom. A
   * servo is bipolar, so zero sits at mid-stick with +-500us either
   * side. That changes both where zero is and how much output a
   * microsecond buys - without the wider scale, the top half of a
   * motor's slider would run past its input's own limit.
   */
  function dynDef(src, dst) {
    const input = FC.MIXER_INPUTS[src];
    const limit = Math.max(Math.abs(input.min), Math.abs(input.max)) || 1000;
    const motor = isSimulated(dst);

    return {
      src,
      dst,
      motor,
      center: motor ? 1000 : 1500,
      scale: (motor ? 1000 : 500) / limit,
    };
  }

  // Every row starts parked at its own neutral - mid-stick for a servo,
  // idle for a motor, which is not a throttle to hand out by default.
  $effect(() => {
    for (const [dst, srcs] of groups) {
      for (const src of srcs) {
        if (dynUs[src] === undefined) {
          dynUs[src] = isSimulated(dst) ? 1000 : 1500;
        }
      }
    }
  });

  // The same values as raw override units, which is what the firmware
  // and the simulation both work in.
  let dynRaw = $derived.by(() => {
    const out = {};
    for (const [dst, srcs] of groups) {
      for (const src of srcs) {
        const def = dynDef(src, dst);
        out[src] = Math.round(
          ((dynUs[src] ?? def.center) - def.center) / def.scale,
        );
      }
    }
    return out;
  });

  function sendDyn(def) {
    const raw = Math.round((dynUs[def.src] - def.center) / def.scale);

    // Simulated rows are never sent: there's nothing on the FC side that
    // would act on them.
    if (!def.motor) {
      FC.MIXER_OVERRIDE[def.src] = raw;
      mspHelper.sendMixerOverride(def.src);
    }
  }

  function dynEnabled(src) {
    return Mixer.overrideEnabled(FC.MIXER_OVERRIDE[src]);
  }

  function setDynEnabled(def, enabled) {
    if (enabled) {
      // Park at neutral on enable rather than jumping to wherever the
      // slider was left.
      dynUs[def.src] = def.center;
      FC.MIXER_OVERRIDE[def.src] = 0;
    } else {
      FC.MIXER_OVERRIDE[def.src] = Mixer.OVERRIDE_OFF;
    }
    mspHelper.sendMixerOverride(def.src);
  }

  /**
   * The output's actual position, in microseconds. Servos are read back
   * from the FC; motors are computed, since their readback is stuck at
   * idle while disarmed no matter what the mixer says.
   */
  function outputValue(dst) {
    if (isSimulated(dst)) {
      return simulateOutputValue(FC.MIXER_RULES, FC.MIXER_INPUTS, dynRaw, dst);
    }
    return liveValues[dst] ?? 1500;
  }

  function outputLabel(dst) {
    const name = Mixer.outputNames[dst];
    return name ? $i18n.t(name) : `#${dst}`;
  }

  // 1010 rather than 1000 as the spin threshold: the value sits a few us
  // off exactly 1000 often enough that "> 1000" would leave a stopped
  // motor visibly creeping.
  function isSpinning(value) {
    return value > 1010;
  }

  function spinSpeed(value) {
    const throttle = Math.min(1, Math.max(0, (value - 1000) / 1000));
    return (1.1 - throttle).toFixed(2);
  }

  function armAngle(value) {
    return Math.min(60, Math.max(-60, ((value - 1500) / 500) * 60));
  }

  let poller;

  onMount(() => {
    poller = setInterval(async () => {
      if (groups.size === 0) return;
      await MSP.promise(MSPCodes.MSP_SERVO);
      const next = {};
      for (const dst of groups.keys()) {
        if (!isSimulated(dst)) next[dst] = FC.SERVO_DATA[dst - 1];
      }
      liveValues = next;
    }, 250);
  });

  onDestroy(() => clearInterval(poller));
</script>

<Section label="mixerOverride" summary="mixerOverrideHelp">
  <!-- mixerOverrideEnableSwitchText rather than mixerOverrideNote: the
       two said almost the same thing, one in the note and one as a
       paragraph under the switches, and this is the fuller of the pair
       (it covers what Passthrough does). -->
  <div class="note-wrap">
    <InfoNote message="mixerOverrideEnableSwitchText" />
  </div>

  <div class="switches">
    <label class="switch">
      <Switch
        id="mixer-override"
        checked={overrideEnabled}
        onchange={(e) => onOverrideSwitch(e.target.checked)}
      />
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <span>{@html $i18n.t("mixerOverrideEnableSwitch")}</span>
    </label>
    {#if hasPassthrough}
      <label class="switch">
        <Switch
          id="mixer-passthrough"
          checked={passthroughEnabled}
          onchange={(e) => onPassthroughSwitch(e.target.checked)}
        />
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <span>{@html $i18n.t("mixerPassthroughEnableSwitch")}</span>
      </label>
    {/if}
  </div>

  {#if overrideEnabled}
    <div class="rows">
      {#each axes as def (def.axis)}
        {@const row = rows[def.axis]}
        {@const mutable = row.enabled && !row.passthrough}
        <div class="row">
          <div class="name">{$i18n.t(Mixer.inputNames[def.axis])}</div>
          <div class="toggles">
            <label title={$i18n.t("mixerOverrideEnable")}>
              <Switch
                checked={row.enabled}
                onchange={(e) => setEnabled(def, e.target.checked)}
              />
            </label>
            {#if hasPassthrough}
              <label title={$i18n.t("mixerPassthroughEnable")}>
                <Switch
                  checked={row.passthrough}
                  onchange={(e) => setPassthrough(def, e.target.checked)}
                />
              </label>
            {/if}
          </div>
          <div class="value">
            <NumberInput
              min={def.min}
              max={def.max}
              step={def.step}
              disabled={!mutable}
              bind:value={row.value}
              onchange={() => send(def)}
            />
          </div>
          <div class="slider" class:disabled={!mutable}>
            <span class="end">
              {$i18n.t(`mixerOverrideSliderLeftLabel${def.axis}`)}
            </span>
            <div class="track">
              {#key `${def.axis}-${def.max}`}
                <Slider
                  bind:value={row.value}
                  opts={sliderOpts(def)}
                  changeOnSlide={false}
                  onchange={() => send(def)}
                />
              {/key}
            </div>
            <span class="end">
              {$i18n.t(`mixerOverrideSliderRightLabel${def.axis}`)}
            </span>
          </div>
          <!-- Keeps the stabilized rows on the same column template as
               the rule rows below, which use this last column for the
               live position readout. -->
          <span class="position-spacer"></span>
        </div>
      {/each}
    </div>

    <!-- One block per output driven by custom rules, so it's clear which
         rules combine to drive a given servo/motor and each can be
         tested on its own against the live position. -->
    {#each [...groups] as [dst, srcs] (dst)}
      {@const value = outputValue(dst)}
      {@const motor = isSimulated(dst)}
      <div class="group">
        {#each [...srcs] as src (src)}
          {@const def = dynDef(src, dst)}
          {@const enabled = motor || dynEnabled(src)}
          <div class="row dyn">
            <div class="name">{$i18n.t(Mixer.inputNames[src])}</div>
            <div class="toggles">
              {#if motor}
                <HoverTooltip tooltip={simulatedTip}>
                  <span class="simulated">&#9888;</span>
                </HoverTooltip>
                {#snippet simulatedTip()}
                  <Tooltip help="mixerOverrideSimulatedHelp" />
                {/snippet}
              {:else}
                <label title={$i18n.t("mixerOverrideEnable")}>
                  <Switch
                    checked={enabled}
                    onchange={(e) => setDynEnabled(def, e.target.checked)}
                  />
                </label>
              {/if}
            </div>
            <div class="value">
              <NumberInput
                min={1000}
                max={2000}
                step={1}
                disabled={!enabled}
                bind:value={dynUs[src]}
                onchange={() => sendDyn(def)}
              />
            </div>
            <div class="slider" class:disabled={!enabled}>
              <!-- Empty stand-ins for the stabilized rows' direction
                     labels, so both kinds of slider track start and end
                     on the same pixel. -->
              <span class="end"></span>
              <div class="track">
                <Slider
                  bind:value={dynUs[src]}
                  opts={{
                    range: { min: 1000, max: 2000 },
                    start: def.center,
                    step: 1,
                    behaviour: "snap-drag",
                    pips: { mode: "values", values: DYN_PIPS, density: 5 },
                  }}
                  changeOnSlide={false}
                  onchange={() => sendDyn(def)}
                />
              </div>
              <span class="end"></span>
            </div>
          </div>
        {/each}

        <div class="position" style:grid-row="1 / span {srcs.size}">
          <OutputIcon
            {motor}
            angle={armAngle(value)}
            spinning={motor && isSpinning(value)}
            speed={spinSpeed(value)}
          />
          <span class="position-label">{outputLabel(dst)}</span>
          <span class="position-value">{Math.round(value)}</span>
        </div>
      </div>
    {/each}
  {/if}
</Section>

<style lang="scss">
  /* Not called "note": main.css styles that class globally as a legacy
     callout (tinted panel, yellow leading edge), which would wrap this
     one in a second box around InfoNote's own. */
  .note-wrap {
    padding: 0 4px;
  }

  .switches {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 0 8px;
  }

  .switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  /* One column template shared by the stabilized-axis rows and the
     per-output rule rows, so the toggles, value fields and slider
     tracks line up down the whole section. The toggle column is a fixed
     width rather than auto because the two row types hold a different
     number of switches (passthrough is stabilized-only) and auto would
     size them differently. The last column is the live position
     readout, which only the rule rows fill. */
  .row,
  .group {
    display: grid;
    grid-template-columns:
      minmax(140px, 1fr) 80px 120px
      minmax(320px, 4fr) 110px;
    align-items: center;
    gap: 12px;
    padding: 0 8px;
  }

  .row {
    min-height: 56px;
    border-top: 1px solid var(--color-border-soft);
  }

  .name {
    font-weight: 600;
  }

  .toggles {
    display: flex;
    gap: 8px;
  }

  .slider {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 18px;

    &.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  .track {
    flex: 1;
    min-width: 0;
  }

  .end {
    flex: none;
    width: 96px;
    padding-top: 18px;
    font-size: 0.7rem;
    color: var(--color-text-muted);

    &:first-child {
      text-align: right;
    }
  }

  /* An output and the rules feeding it read as one block: the rules
     stacked on the left, the live position for the output they all
     drive on the right. */
  .group {
    border-top: 1px solid var(--color-border-soft);
  }

  /* display: contents lifts each rule row's cells into the group's own
     grid, so they land in the shared columns above instead of being
     laid out inside a nested box of their own. That's what lets the
     position cell span the whole group down the last column. */
  .row.dyn {
    display: contents;
  }

  /* No separator between rules inside a group - the group's own top
     border is what sets it apart from its neighbours. */
  .row.dyn {
    border-top: none;
  }

  /* Sits in the shared template's last column, spanning every rule in
     the group (the span count is set inline, since it depends on how
     many inputs drive the output). */
  .position {
    grid-column: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0;
  }

  .position-spacer {
    display: block;
  }

  .position-label {
    font-weight: 600;
    font-size: 0.8rem;
  }

  .position-value {
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* Stands in for the enable toggle on a simulated (motor) row. */
  .simulated {
    font-size: 1.4rem;
    line-height: 1;
    cursor: help;
    color: var(--color-yellow-500, orange);
  }

  @media only screen and (max-width: 480px) {
    .row {
      grid-template-columns: 1fr auto;
    }

    .value,
    .slider {
      grid-column: 1 / -1;
    }

    .group {
      grid-template-columns: 1fr;
    }

    .position {
      width: auto;
      flex-direction: row;
      gap: 8px;
    }
  }
</style>

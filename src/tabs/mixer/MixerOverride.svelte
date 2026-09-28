<script>
  import NumberInput from "@/components/NumberInput.svelte";
  import Section from "@/components/Section.svelte";
  import Slider from "@/components/Slider.svelte";
  import Switch from "@/components/Switch.svelte";
  import InfoNote from "@/components/notes/InfoNote.svelte";

  import { Mixer } from "@/js/Mixer.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

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
</script>

<Section label="mixerOverride" summary="mixerOverrideHelp">
  <div class="note">
    <InfoNote message="mixerOverrideNote" />
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
  <p class="description">{$i18n.t("mixerOverrideEnableSwitchText")}</p>

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
        </div>
      {/each}
    </div>
  {/if}
</Section>

<style lang="scss">
  .note {
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

  .description {
    margin: 0;
    padding: 0 8px;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) auto 120px minmax(320px, 4fr);
    align-items: center;
    gap: 12px;
    min-height: 56px;
    padding: 0 8px;
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

  @media only screen and (max-width: 480px) {
    .row {
      grid-template-columns: 1fr auto;
    }

    .value,
    .slider {
      grid-column: 1 / -1;
    }
  }
</style>

<script>
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import { BASE_FUNCS, FUNCTION_COLORS, FUNCTION_LABELS } from "./constants.js";
  import {
    applyFunction,
    clearAll,
    clearSelected,
    ledState,
    setBlinkBit,
    setBlinkPause,
    setOverlay,
    toggleDirection,
    wiresRemaining,
  } from "./state.svelte.js";
  import {
    areBlinkersActive,
    areModifiersActive,
    areOverlaysActive,
    isVtxActive,
    isWarningActive,
  } from "./util.js";

  const AUX_MODE = 7;
  const AUX_DIR = 0;

  const AUX_CHANNEL_OPTIONS = [
    "controlAxisRoll",
    "controlAxisPitch",
    "controlAxisYaw",
    "controlAxisThrottle",
    "controlAxisAux1",
    "controlAxisAux2",
    "controlAxisAux3",
    "controlAxisAux4",
    "controlAxisAux5",
    "controlAxisAux6",
    "controlAxisAux7",
    "controlAxisAux8",
  ];

  const DIRECTION_BUTTONS = [
    { letter: "n", label: "ledStripDirN" },
    { letter: "e", label: "ledStripDirE" },
    { letter: "s", label: "ledStripDirS" },
    { letter: "w", label: "ledStripDirW" },
    { letter: "u", label: "ledStripDirU" },
    { letter: "d", label: "ledStripDirD" },
  ];

  let functionOptions = $derived([
    { value: "", label: $i18n.t("ledStripFunctionNoneOption") },
    ...BASE_FUNCS.map((letter) => ({
      value: letter,
      label: $i18n.t(FUNCTION_LABELS[letter]),
    })),
  ]);

  let auxChannel = $derived.by(() => {
    const mc = FC.LED_MODE_COLORS.find(
      (m) => m.mode === AUX_MODE && m.direction === AUX_DIR,
    );
    return mc ? mc.color : 0;
  });

  function setAuxChannel(value) {
    const mc = FC.LED_MODE_COLORS.find(
      (m) => m.mode === AUX_MODE && m.direction === AUX_DIR,
    );
    if (mc) mc.color = Number(value);
  }

  let func = $derived(ledState.panel.func);
  let showModifiers = $derived(areModifiersActive(func));
  let showBlinkers = $derived(areBlinkersActive(func));
  let showOverlays = $derived(areOverlaysActive(func));
  let showWarning = $derived(showOverlays && isWarningActive(func));
  let showVtx = $derived(showOverlays && isVtxActive(func));

  let remaining = $derived(wiresRemaining());
</script>

<div class="wires-remaining" class:error={remaining < 0}>
  <div>{remaining}</div>
  <span>{$i18n.t("ledStripRemainingText")}</span>
</div>

<div class="buttons-row">
  <button class="btn" onclick={clearSelected}
    >{$i18n.t("ledStripClearSelectedButton")}</button
  >
  <button class="btn" onclick={clearAll}
    >{$i18n.t("ledStripClearAllButton")}</button
  >
</div>

<div class="section">{$i18n.t("ledStripFunctionSection")}</div>

<div class="field">
  <span
    class="label swatch"
    class:tinted={!!FUNCTION_COLORS[func]}
    style:background={FUNCTION_COLORS[func]}
  >
    {$i18n.t("ledStripFunctionTitle")}
  </span>
  <Select
    value={func}
    options={functionOptions}
    onchange={(e) => applyFunction(e.target.value)}
  />
</div>

{#if showModifiers}
  <div class="modifiers">
    <span class="section-label">{$i18n.t("ledStripColorModifierTitle")}</span>
    <label class="checkbox">
      <Switch
        checked={ledState.panel.overlays.t}
        onchange={(e) => setOverlay("t", e.target.checked)}
      />
      <Select
        value={auxChannel}
        options={AUX_CHANNEL_OPTIONS.map((label, value) => ({
          value,
          label: $i18n.t(label),
        }))}
        onchange={(e) => setAuxChannel(e.target.value)}
      />
    </label>
    <label class="checkbox">
      <Switch
        checked={ledState.panel.overlays.o}
        onchange={(e) => setOverlay("o", e.target.checked)}
      />
      <span>{$i18n.t("ledStripVtxFunction")}</span>
    </label>
  </div>
{/if}

{#if showBlinkers}
  <div class="blinkers">
    <span class="section-label">{$i18n.t("ledStripBlinkTitle")}</span>
    <label class="checkbox">
      <Switch
        checked={ledState.panel.overlays.b}
        onchange={(e) => setOverlay("b", e.target.checked)}
      />
      {#if ledState.panel.overlays.b}
        <span class="blinkbits">
          {#each { length: 16 } as _, i (i)}
            {@const bit = 15 - i}
            <input
              type="checkbox"
              checked={!!(ledState.panel.blinkPattern & (1 << bit))}
              onchange={(e) => setBlinkBit(bit, e.target.checked)}
            />
          {/each}
        </span>
        <label class="pause">
          <span>{$i18n.t("ledStripBlinkPause")}</span>
          <input
            type="number"
            min="0"
            max="15"
            step="1"
            value={ledState.panel.blinkPause}
            onchange={(e) => setBlinkPause(Number(e.target.value))}
          />
        </label>
      {/if}
    </label>
  </div>
{/if}

{#if showOverlays}
  <div class="overlays">
    <span class="section-label">{$i18n.t("ledStripOverlayTitle")}</span>
    {#if showWarning}
      <label class="checkbox">
        <Switch
          checked={ledState.panel.overlays.w}
          onchange={(e) => setOverlay("w", e.target.checked)}
        />
        <span>{$i18n.t("ledStripWarningsOverlay")}</span>
      </label>
    {/if}
    <label class="checkbox">
      <Switch
        checked={ledState.panel.overlays.i}
        onchange={(e) => setOverlay("i", e.target.checked)}
      />
      <span>{$i18n.t("ledStripIndecatorOverlay")}</span>
    </label>
    {#if showVtx}
      <label class="checkbox">
        <Switch
          checked={ledState.panel.overlays.v}
          onchange={(e) => setOverlay("v", e.target.checked)}
        />
        <span>{$i18n.t("ledStripVtxOverlay")}</span>
      </label>
    {/if}
    <label class="checkbox">
      <Switch
        checked={ledState.panel.overlays.d}
        onchange={(e) => setOverlay("d", e.target.checked)}
      />
      <span>{$i18n.t("ledStripFadeOverlay")}</span>
    </label>
    <label class="checkbox">
      <Switch
        checked={ledState.panel.overlays.k}
        onchange={(e) => setOverlay("k", e.target.checked)}
      />
      <span>{$i18n.t("ledStripFlickerOverlay")}</span>
    </label>
  </div>
{/if}

<div class="section">{$i18n.t("ledStripModesColorTitle")}</div>
<div class="directions">
  {#each DIRECTION_BUTTONS as { letter, label } (letter)}
    <button
      class="dir-btn dir-{letter}"
      class:active={ledState.panel.directions[letter]}
      onclick={() => toggleDirection(letter)}
    >
      {$i18n.t(label)}
    </button>
  {/each}
</div>

<style lang="scss">
  .btn {
    @extend %button;
  }

  .wires-remaining {
    float: right;
    text-align: center;
    font-size: 0.85rem;

    div {
      font-size: 2rem;
      color: var(--color-accent-500);
      line-height: 1;
    }

    &.error div {
      color: #ff5700;
    }
  }

  .buttons-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .section {
    margin: 16px 0 6px;
    padding-bottom: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-soft);
    border-bottom: 1px solid var(--color-border);
    clear: both;
  }

  .section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-soft);
    margin-bottom: 4px;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .label.swatch {
    padding: 2px 8px;
    border-radius: var(--radius-xs);
    font-size: 0.75rem;
    color: var(--color-text-soft);
    background-color: var(--color-surface-float, var(--color-surface));
    border: 1px solid var(--color-border);

    &.tinted {
      color: #fff;
      border-color: transparent;
      text-shadow:
        0 0 2px black,
        0 0 2px black;
    }
  }

  .modifiers,
  .blinkers,
  .overlays {
    margin-top: 8px;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: 0.8rem;
  }

  .blinkbits {
    display: flex;
    gap: 2px;
  }

  .pause {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;

    input {
      width: 40px;
    }
  }

  .directions {
    position: relative;
    height: 110px;
    width: 200px;
  }

  .dir-btn {
    @extend %button;
    position: absolute;
    width: 30px;
    height: 30px;

    &.active {
      background: #fff;
      color: #000;
      border-color: #000;
      border-width: 2px;
    }
  }

  .dir-n {
    top: 0;
    left: 32px;
  }
  .dir-s {
    top: 64px;
    left: 32px;
  }
  .dir-e {
    left: 64px;
    top: 32px;
  }
  .dir-w {
    left: 0;
    top: 32px;
  }
  .dir-u {
    right: 10px;
    top: 15px;
  }
  .dir-d {
    right: 10px;
    top: 54px;
  }
</style>

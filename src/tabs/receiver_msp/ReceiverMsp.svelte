<script>
  import { onDestroy, onMount } from "svelte";

  import { popup } from "./popup.svelte.js";

  const MIN = 1000;
  const MID = 1500;
  const MAX = 2000;

  const CHANNEL_NAMES = [
    "Roll",
    "Pitch",
    "Yaw",
    "Collective",
    "Throttle",
    "Aux1",
    "Aux2",
    "Aux3",
  ];

  // [horizontal, vertical] channel of the left and right stick
  const GIMBALS = [
    [2, 3],
    [0, 1],
  ];

  const SLIDERS = [
    { channel: 4, label: "controlAxisThr" },
    { channel: 5, label: "controlAxisAux1" },
    { channel: 6, label: "controlAxisAux2" },
    { channel: 7, label: "controlAxisAux3" },
  ];

  // translations come from the Receiver tab that opened this window
  const t = (key) => popup.translate?.(key) ?? key;

  let channels = $state([MID, MID, MID, MID, MIN, MIN, MIN, MIN]);
  let enabled = $state(false);
  let warningEl = $state();
  let timer;

  function toPosition(value) {
    return (Math.min(Math.max(value, MIN), MAX) - MIN) / (MAX - MIN);
  }

  function toValue(position) {
    return Math.round(Math.min(Math.max(position, 0), 1) * (MAX - MIN) + MIN);
  }

  function moveStick(e, [h, v]) {
    const rect = e.currentTarget.getBoundingClientRect();
    channels[h] = toValue((e.clientX - rect.left) / rect.width);
    channels[v] = toValue(1 - (e.clientY - rect.top) / rect.height);
  }

  function onPointerDown(e, gimbal) {
    e.currentTarget.setPointerCapture(e.pointerId);
    moveStick(e, gimbal);
  }

  function onPointerMove(e, gimbal) {
    if (e.buttons === 1) {
      moveStick(e, gimbal);
    }
  }

  function center([h, v]) {
    channels[h] = MID;
    channels[v] = MID;
  }

  function enable() {
    const height = warningEl.offsetHeight;
    enabled = true;
    if (__BACKEND__ === "web") {
      window.resizeBy(0, -height);
    } else {
      nw.Window.get().resizeBy(0, -height);
    }
  }

  function transmit() {
    // setRawRx is given to this window by the Receiver tab
    if (enabled && !window.setRawRx([...channels])) {
      // MSP connection has gone away
      if (__BACKEND__ === "web") {
        window.close();
      } else {
        nw.Window.get().close();
      }
    }
  }

  onMount(() => {
    timer = setInterval(transmit, 50);
  });

  onDestroy(() => clearInterval(timer));
</script>

<div class="receiver svelte">
  <div class="gimbals">
    {#each GIMBALS as gimbal, index (index)}
      <div class="gimbal-wrapper">
        <span class="label vert"
          >{t(`controlAxis${CHANNEL_NAMES[gimbal[1]]}`)}</span
        >
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="gimbal"
          onpointerdown={(e) => onPointerDown(e, gimbal)}
          onpointermove={(e) => onPointerMove(e, gimbal)}
          ondblclick={() => center(gimbal)}
        >
          <span class="crosshair vert"></span>
          <span class="crosshair horz"></span>
          <span
            class="stick"
            style:left="{toPosition(channels[gimbal[0]]) * 100}%"
            style:top="{(1 - toPosition(channels[gimbal[1]])) * 100}%"
          ></span>
        </div>
        <span class="label horz"
          >{t(`controlAxis${CHANNEL_NAMES[gimbal[0]]}`)}</span
        >
      </div>
    {/each}
  </div>

  <div class="sliders">
    {#each SLIDERS as slider (slider.channel)}
      <label for="channel-{slider.channel}">{t(slider.label)}</label>
      <input
        id="channel-{slider.channel}"
        type="range"
        min={MIN}
        max={MAX}
        bind:value={channels[slider.channel]}
      />
      <span class="value">{channels[slider.channel]}</span>
    {/each}
  </div>

  {#if !enabled}
    <div class="warning" bind:this={warningEl}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <p>{@html t("receiverMspWarningText")}</p>
      <button class="btn" onclick={enable}
        >{t("receiverMspEnableButton")}</button
      >
    </div>
  {/if}
</div>

<style lang="scss">
  :global(body) {
    margin: 0;
    overflow: hidden;
    user-select: none;
    font-family: "Open Sans", Arial, sans-serif;
    font-size: 12px;
    color: var(--color-text);
    background-color: var(--color-bg);
  }

  .receiver {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 16px 16px;
  }

  .gimbals {
    display: flex;
    justify-content: center;
    gap: 36px;
  }

  .gimbal-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .gimbal {
    position: relative;
    width: 120px;
    height: 120px;
    border: 1px solid var(--color-border-soft);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    box-shadow: var(--shadow-xs);
    cursor: crosshair;
    touch-action: none;
  }

  .crosshair {
    position: absolute;
    background-color: var(--color-border);

    &.vert {
      left: 50%;
      width: 1px;
      height: 100%;
    }

    &.horz {
      top: 50%;
      width: 100%;
      height: 1px;
    }
  }

  .stick {
    position: absolute;
    width: 18px;
    height: 18px;
    margin: -9px 0 0 -9px;
    border: 2px solid var(--color-surface);
    border-radius: 50%;
    background-color: var(--color-accent-500);
    box-shadow: var(--shadow-md);
    pointer-events: none;
  }

  .label {
    color: var(--color-text-muted);
    font-weight: 600;

    &.vert {
      position: absolute;
      top: 60px;
      left: -14px;
      transform: translate(-50%, -50%) rotate(-90deg);
      white-space: nowrap;
    }
  }

  .sliders {
    display: grid;
    grid-template-columns: auto 1fr 3em;
    align-items: center;
    gap: 10px 12px;
    padding: 0 8px;

    label {
      text-align: right;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    input {
      width: 100%;
      height: auto;
      padding: 0;
      border: none;
      background: none;
      box-shadow: none;
      accent-color: var(--color-accent-500);
    }
  }

  .value {
    font-variant-numeric: tabular-nums;
  }

  .warning {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);

    p {
      margin: 0;
      line-height: 1.5;
    }
  }

  .btn {
    @extend %button-primary;
  }
</style>

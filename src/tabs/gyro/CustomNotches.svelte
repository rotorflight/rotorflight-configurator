<script>
  import semver from "semver";
  import { i18n } from "@/js/i18n.js";
  import Switch from "@/components/Switch.svelte";
  import ErrorNote from "@/components/notes/ErrorNote.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";
  import NumberInput from "@/components/NumberInput.svelte";

  let { FC, notches = $bindable(), onResetNotches } = $props();

  let axis = $state(0);

  const axisProps = [
    { label: "titleRoll", color: "var(--color-roll)" },
    { label: "titlePitch", color: "var(--color-pitch)" },
    { label: "titleYaw", color: "var(--color-yaw)" },
  ];

  let axisColor = $derived.by(() => {
    if (notches?.banks.length > 1) {
      return axisProps[axis].color;
    }
  });

  let notchCount = $derived.by(() => {
    if (!notches) {
      return 0;
    }

    const bank = notches.banks[axis];
    let enabled = 0;
    for (const notch of Object.values(bank)) {
      if (notch.enabled) {
        enabled += notch.type;
      }
    }

    return enabled;
  });

  let showMainMotor = $derived(
    FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] != 1 ||
      FC.MOTOR_CONFIG.main_rotor_gear_ratio[1] != 1,
  );
  let showTailMotor = $derived(
    FC.MIXER_CONFIG.tail_rotor_mode > 0 &&
      (FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] != 1 ||
        FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1] != 1),
  );

  const MAX_NOTCH_COUNT = 16;
</script>

{#snippet notch(label, source, notchTypeLabel)}
  {#snippet notchType()}
    <label for={`notch-type-${source}`}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <span>{@html $i18n.t(notchTypeLabel)}</span>
    </label>
    <div class="input">
      <select
        id={`notch-type-${source}`}
        bind:value={notches.banks[axis][source].type}
        disabled={!notches.banks[axis][source].enabled}
      >
        <option value={1}>{$i18n.t("gyroRpmFilterNotchTypeSingle")}</option>
        <option value={2}>{$i18n.t("gyroRpmFilterNotchTypeDouble")}</option>
        {#if semver.gte(FC.CONFIG.buildVersion, FW_VERSION_4_5_0)}
          <option value={3}>{$i18n.t("gyroRpmFilterNotchTypeTriple")}</option>
        {/if}
      </select>
    </div>
  {/snippet}

  {#snippet notchQ()}
    <label for={`notch-q-${source}`}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <span>{@html $i18n.t(label)}</span>
    </label>
    <div class="input">
      <NumberInput
        id={`notch-q-${source}`}
        bind:value={notches.banks[axis][source].value}
        disabled={!notches.banks[axis][source].enabled}
        min="1.5"
        max="10"
        step="0.1"
      />
    </div>
  {/snippet}

  <div class="notch-wrapper">
    <Switch
      bind:checked={notches.banks[axis][source].enabled}
      --color-switch={axisColor}
    />
    <div class="notch">
      {#if notchTypeLabel}
        {@render notchType()}
      {:else}
        {@render notchQ()}
      {/if}
    </div>
  </div>
  {#if notchTypeLabel}
    <div class="notch-wrapper group">
      <div></div>
      <div class="notch">
        {@render notchQ()}
      </div>
    </div>
  {/if}
{/snippet}

<div class="container">
  <div class="header" style:border-color={axisColor}>
    <span class="title">{$i18n.t("gyroRpmFilterBanks")}</span>
    {#if notches && semver.gte(FC.CONFIG.buildVersion, FW_VERSION_4_5_0)}
      <ul>
        {#each axisProps as axisProp, i}
          <button
            class:active={axis === i}
            onclick={() => (axis = i)}
            style:background={axisProp.color}
          >
            {$i18n.t(axisProp.label)}
          </button>
        {/each}
      </ul>
    {/if}
  </div>

  {#if notchCount > MAX_NOTCH_COUNT}
    <ErrorNote>
      {$i18n.t("gyroRpmFilterNotchCountWarn")}
      <br />
      <b>{notchCount} / {MAX_NOTCH_COUNT}</b>
    </ErrorNote>
  {/if}
  {#if notches}
    <div class="notch-list">
      {#if showMainMotor || showTailMotor}
        <div class="notch-group-heading">
          {$i18n.t("gyroRpmFilterMotorGroup")}
        </div>
        {#if showMainMotor}
          {@render notch("gyroRpmFilterMainMotorQ", 10)}
        {/if}
        {#if showTailMotor}
          {@render notch("gyroRpmFilterTailMotorQ", 20)}
        {/if}
      {/if}

      <div class="notch-group-heading">
        {$i18n.t("gyroRpmFilterMainRotorGroup")}
      </div>
      {@render notch("gyroRpmFilterQ1", 11, "gyroRpmFilterH1")}
      {@render notch("gyroRpmFilterQ2", 12, "gyroRpmFilterH2")}
      {@render notch("gyroRpmFilterQ3", 13)}
      {@render notch("gyroRpmFilterQ4", 14)}
      {@render notch("gyroRpmFilterQ5", 15)}
      {@render notch("gyroRpmFilterQ6", 16)}
      {@render notch("gyroRpmFilterQ7", 17)}
      {@render notch("gyroRpmFilterQ8", 18)}

      <div class="notch-group-heading">
        {$i18n.t("gyroRpmFilterTailRotorGroup")}
      </div>
      {@render notch("gyroRpmFilterQ1", 21, "gyroRpmFilterH1")}
      {@render notch("gyroRpmFilterQ2", 22, "gyroRpmFilterH2")}
      {@render notch("gyroRpmFilterQ3", 23)}
      {@render notch("gyroRpmFilterQ4", 24)}
    </div>
  {:else}
    <WarningNote>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html $i18n.t("gyroRpmFilterCustomNote")}
    </WarningNote>
    <button class="reset-btn" onclick={onResetNotches}>
      {$i18n.t("gyroRpmFilterNotchResetBtn")}
    </button>
  {/if}
</div>

<style lang="scss">
  .container {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
  }

  .notch-group-heading {
    font-weight: 600;
    grid-column: 1 / -1;
    margin-top: 8px;

    * + & {
      margin-top: 16px;
    }
  }

  .notch {
    display: flex;
    width: 100%;

    label {
      flex-grow: 1;
    }
  }

  .notch-list {
    display: grid;
    grid-template-columns: auto 1fr;

    .notch-wrapper {
      display: grid;
      grid-template-columns: subgrid;
      grid-column: 1 / -1;
      align-items: center;
      min-height: 2rem;
    }
  }

  label {
    display: flex;
    align-items: center;
    margin-left: 8px;

    > :first-child {
      flex-grow: 1;
    }
  }

  .title {
    flex-grow: 1;
    font-size: 1rem;
    font-weight: 600;
  }

  .header {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    border-bottom-width: 2px;
    border-style: solid;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-900);
      border-bottom-color: var(--color-neutral-300);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-100);
      border-bottom-color: var(--color-neutral-600);
    }
  }

  .header ul {
    display: flex;
    transition: var(--animation-speed);
    border-top-right-radius: 4px;
    border-top-right-radius: 4px;

    & > :first-child {
      border-top-left-radius: 4px;
    }

    & > :last-child {
      border-top-right-radius: 4px;
    }

    > button {
      color: inherit;
      border: none;
      border-radius: 0;
      padding: 8px;
      width: 80px;
      text-align: center;
      filter: brightness(0.7);
      transition: var(--animation-speed);
      font-size: 0.8rem;
      font-weight: 600;

      &.active {
        filter: brightness(1);
      }
    }

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-100);
    }
  }

  .input {
    max-width: 120px;

    > * {
      width: 120px;
    }
  }

  .reset-btn {
    border-radius: 2px;
    border: none;
    padding: 0.5rem;
    transition: var(--animation-speed);
    margin-left: auto;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-800);
      background-color: var(--color-neutral-300);

      &:hover {
        background-color: var(--color-neutral-200);
      }

      &:active {
        background-color: var(--color-neutral-400);
      }
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-900);
      background-color: var(--color-neutral-200);

      &:hover {
        background-color: var(--color-neutral-300);
      }

      &:active {
        background-color: var(--color-neutral-400);
      }
    }
  }

  @media only screen and (max-width: 480px) {
    .header {
      border-bottom-width: 6px;
    }

    .header ul {
      width: 100%;

      button {
        width: calc(100% / 3);
        line-height: 2rem;
      }
    }

    .notch-wrapper {
      height: 3rem;
    }

    .notch-wrapper + .notch-wrapper:not(.group) {
      border-top-width: 1px;
      border-top-style: solid;

      :global(html[data-theme="light"]) & {
        border-top-color: var(--color-neutral-400);
      }

      :global(html[data-theme="dark"]) & {
        border-top-color: var(--color-neutral-700);
      }
    }

    .reset-btn {
      width: 100%;
      padding: 1rem 0;
      margin-top: 0.5rem;
    }
  }
</style>

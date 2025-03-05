<script>
  import semver from "semver";
  import { i18n } from "@/js/i18n.js";
  import ErrorNote from "@/components/notes/ErrorNote.svelte";
  import WarningNote from "@/components/notes/WarningNote.svelte";
  import NumberInput from "@/components/NumberInput.svelte";
  import ToggleFieldGroup from "@/components/ToggleFieldGroup.svelte";
  import Field from "@/components/Field.svelte";
  import SubSection from "@/components/SubSection.svelte";

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
    <Field id={`notch-type-${source}`} label={notchTypeLabel}>
      <select
        id={`notch-type-${source}`}
        bind:value={notches.banks[axis][source].type}
        disabled={!notches.banks[axis][source].enabled}
      >
        <option value={1}>{$i18n.t("gyroRpmFilterNotchTypeSingle")}</option>
        <option value={2}>{$i18n.t("gyroRpmFilterNotchTypeDouble")}</option>
        {#if semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)}
          <option value={3}>{$i18n.t("gyroRpmFilterNotchTypeTriple")}</option>
        {/if}
      </select>
    </Field>
  {/snippet}

  {#snippet notchQ()}
    <Field id={`notch-q-${source}`} {label}>
      <NumberInput
        id={`notch-q-${source}`}
        bind:value={notches.banks[axis][source].value}
        disabled={!notches.banks[axis][source].enabled}
        min="1.5"
        max="10"
        step="0.1"
      />
    </Field>
  {/snippet}

  <ToggleFieldGroup
    bind:enabled={notches.banks[axis][source].enabled}
    --color-switch={axisColor}
  >
    {#if notchTypeLabel}
      {@render notchType()}
    {/if}
    {@render notchQ()}
  </ToggleFieldGroup>
{/snippet}

<div class="container">
  <div class="header" style:border-color={axisColor}>
    <span class="title">{$i18n.t("gyroRpmFilterBanks")}</span>
    {#if notches && semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)}
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

  <div class="content">
    {#if notchCount > MAX_NOTCH_COUNT}
      <ErrorNote>
        {$i18n.t("gyroRpmFilterNotchCountWarn")}
        <br />
        <b>{notchCount} / {MAX_NOTCH_COUNT}</b>
      </ErrorNote>
    {/if}
    {#if notches}
      {#if showMainMotor || showTailMotor}
        <SubSection label="gyroRpmFilterMotorGroup">
          {#if showMainMotor}
            {@render notch("gyroRpmFilterMainMotorQ", 10)}
          {/if}
          {#if showTailMotor}
            {@render notch("gyroRpmFilterTailMotorQ", 20)}
          {/if}
        </SubSection>
      {/if}

      <SubSection label="gyroRpmFilterMainRotorGroup">
        {@render notch("gyroRpmFilterQ1", 11, "gyroRpmFilterH1")}
        {@render notch("gyroRpmFilterQ2", 12, "gyroRpmFilterH2")}
        {@render notch("gyroRpmFilterQ3", 13)}
        {@render notch("gyroRpmFilterQ4", 14)}
        {@render notch("gyroRpmFilterQ5", 15)}
        {@render notch("gyroRpmFilterQ6", 16)}
        {@render notch("gyroRpmFilterQ7", 17)}
        {@render notch("gyroRpmFilterQ8", 18)}
      </SubSection>

      <SubSection label="gyroRpmFilterTailRotorGroup">
        {@render notch("gyroRpmFilterQ1", 21, "gyroRpmFilterH1")}
        {@render notch("gyroRpmFilterQ2", 22, "gyroRpmFilterH2")}
        {@render notch("gyroRpmFilterQ3", 23)}
        {@render notch("gyroRpmFilterQ4", 24)}
      </SubSection>
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
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;

    :global(html[data-theme="light"]) & {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
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
    padding: 8px;
  }

  .header {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    border-bottom-width: 2px;
    border-style: solid;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;

    :global(html[data-theme="light"]) & {
      color: var(--color-neutral-900);
      background-color: var(--color-neutral-100);
    }

    :global(html[data-theme="dark"]) & {
      color: var(--color-neutral-100);
      background-color: var(--color-neutral-900);
    }
  }

  .header ul {
    display: flex;
    transition: var(--animation-speed);
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    align-self: stretch;

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

  .content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;

    :global(html[data-theme="light"]) & {
      background-color: var(--color-neutral-100);
    }

    :global(html[data-theme="dark"]) & {
      background-color: var(--color-neutral-900);
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
      padding-top: 16px;

      :global(html[data-theme="light"]) & {
        background: none;
      }

      :global(html[data-theme="dark"]) & {
        background: none;
      }
    }

    .header ul {
      width: 100%;

      & > :first-child {
        border-top-left-radius: 0;
      }

      & > :last-child {
        border-top-right-radius: 0;
      }

      button {
        width: calc(100% / 3);
        line-height: 2rem;
      }
    }

    .title {
      padding: 8px;
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

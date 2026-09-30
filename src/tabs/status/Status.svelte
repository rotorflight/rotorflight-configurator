<script>
  import semver from "semver";
  import { onDestroy, onMount, tick } from "svelte";

  import HelpIcon from "@/components/HelpIcon.svelte";
  import Meter from "@/components/Meter.svelte";
  import Model from "@/components/Model.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Switch from "@/components/Switch.svelte";

  import {
    API_VERSION_12_8,
    API_VERSION_12_9,
  } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import * as flightStats from "@/js/flight-stats.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  const AXIS_NAMES = [
    "controlAxisRoll",
    "controlAxisPitch",
    "controlAxisYaw",
    "controlAxisCollective",
    "controlAxisThrottle",
    "controlAxisAux1",
    "controlAxisAux2",
    "controlAxisAux3",
    "controlAxisAux4",
    "controlAxisAux5",
    "controlAxisAux6",
    "controlAxisAux7",
    "controlAxisAux8",
    "controlAxisAux9",
    "controlAxisAux10",
    "controlAxisAux11",
    "controlAxisAux12",
    "controlAxisAux13",
    "controlAxisAux14",
    "controlAxisAux15",
    "controlAxisAux16",
    "controlAxisAux17",
    "controlAxisAux18",
    "controlAxisAux19",
    "controlAxisAux20",
    "controlAxisAux21",
    "controlAxisAux22",
    "controlAxisAux23",
    "controlAxisAux24",
    "controlAxisAux25",
    "controlAxisAux26",
    "controlAxisAux27",
  ];

  const BAR_SCALE_MIN = 750;
  const BAR_SCALE_MAX = 2250;
  const DEG2RAD = 0.017453292519943295;

  function getDisarmFlags() {
    return [
      "NO_GYRO",
      "FAILSAFE",
      "RX_FAILSAFE",
      "BAD_RX_RECOVERY",
      "BOXFAILSAFE",
      "GOVERNOR",
      semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_8)
        ? "RPM_SIGNAL"
        : "CRASH",
      "THROTTLE",
      "ANGLE",
      "BOOT_GRACE_TIME",
      "NOPREARM",
      "LOAD",
      "CALIBRATING",
      "CLI",
      "CMS_MENU",
      "BST",
      "MSP",
      "PARALYZE",
      "GPS",
      "RESC",
      "RPMFILTER",
      "REBOOT_REQ",
      "DSHOT_BITBANG",
      "ACC_CALIB",
      "MOTOR_PROTO",
      ...(semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9)
        ? ["OVERRIDE"]
        : []),
      "NO_NOTCH_FILTER",
      "BACKUP_RX",
    ];
  }

  let loading = $state(true);
  let yawFix = $state(0);
  let armEnabled = $state(false);

  let modelRef;
  let confirmDialogEl;
  let attitudeIndicator;
  let headingIndicator;
  let altitudeIndicator;

  let fastInterval;
  let slowInterval;

  let numChs = $derived(Math.min(FC.RC.active_channels ?? 0, 18));
  let numBars = $derived(Math.max(numChs, 8));

  function channelWidth(i) {
    return (
      ((FC.RC.channels[i] - BAR_SCALE_MIN) / (BAR_SCALE_MAX - BAR_SCALE_MIN)) *
      100
    );
  }

  function channelLabel2(i) {
    if (!Number.isFinite(FC.RC_COMMAND[i])) {
      return "";
    }
    if (i < 4) {
      return `${(FC.RC_COMMAND[i] / 5).toFixed(1)}%`;
    }
    if (i === 4) {
      return `${(FC.RC_COMMAND[i] / 10 + 50).toFixed(1)}%`;
    }
    return "";
  }

  let rssiPercent = $derived(((FC.ANALOG?.rssi ?? 0) / 1023) * 100);

  let disarmFlags = $derived.by(() => {
    const flags = getDisarmFlags();
    const count = FC.CONFIG.armingDisableCount ?? 0;
    const list = [];
    for (let i = 0; i < count; i++) {
      const active = (FC.CONFIG.armingDisableFlags & (1 << i)) !== 0;
      if (!active) continue;
      // ARM_SWITCH is always the firmware's last flag, wherever that falls
      const flag = i === count - 1 ? "ARM_SWITCH" : flags[i];
      if (flag) {
        list.push({
          key: flag,
          label: flag,
          tooltipKey: `statusArmingDisableFlagsTooltip${flag}`,
        });
      } else {
        list.push({
          key: `unknown-${i}`,
          label: String(i + 1),
          tooltipKey: null,
        });
      }
    }
    return list;
  });

  let armingCurrentlyPossible = $derived(
    (FC.CONFIG.armingDisableFlags ?? 1) === 0,
  );

  function renderModelTick() {
    const x = FC.SENSOR_DATA.kinematics[1] * -1.0 * DEG2RAD;
    const y = (FC.SENSOR_DATA.kinematics[2] * -1.0 - yawFix) * DEG2RAD;
    const z = FC.SENSOR_DATA.kinematics[0] * -1.0 * DEG2RAD;
    modelRef?.rotateTo(x, y, z);
  }

  function onResetYaw() {
    yawFix = FC.SENSOR_DATA.kinematics[2] * -1.0;
  }

  let hasFlightStats = $derived(
    semver.gte(FC.CONFIG.apiVersion, API_VERSION_12_9),
  );

  function updateArming(active) {
    armEnabled = active;
    mspHelper.setArmingEnabled(active);
  }

  function onArmingSwitchChange() {
    if (armEnabled) {
      confirmDialogEl.showModal();
    } else {
      updateArming(false);
    }
  }

  function onConfirmArming() {
    confirmDialogEl.close();
    updateArming(true);
  }

  function onCancelArming() {
    confirmDialogEl.close();
    updateArming(false);
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_FEATURE_CONFIG);
    await MSP.promise(MSPCodes.MSP_MIXER_CONFIG);
    await MSP.promise(MSPCodes.MSP_ACC_TRIM);
    await MSP.promise(MSPCodes.MSP_NAME);
    await MSP.promise(MSPCodes.MSP_FLIGHT_STATS);
    await MSP.promise(MSPCodes.MSP_RC);

    loading = false;
    await tick();

    const options = {
      size: 90,
      showBox: false,
      img_directory: "/images/flightindicators/",
    };
    attitudeIndicator = globalThis.$.flightIndicator(
      "#attitude",
      "attitude",
      options,
    );
    headingIndicator = globalThis.$.flightIndicator(
      "#heading",
      "heading",
      options,
    );
    altitudeIndicator = globalThis.$.flightIndicator(
      "#altitude",
      "altimeter",
      options,
    );

    fastInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RC);
      await MSP.promise(MSPCodes.MSP_RC_COMMAND);
      await MSP.promise(MSPCodes.MSP_ATTITUDE);

      renderModelTick();
      attitudeIndicator.setRoll(FC.SENSOR_DATA.kinematics[0]);
      attitudeIndicator.setPitch(FC.SENSOR_DATA.kinematics[1]);
      headingIndicator.setHeading(FC.SENSOR_DATA.kinematics[2]);
    }, 50);

    slowInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_STATUS);
      await MSP.promise(MSPCodes.MSP_BATTERY_STATE);
      await MSP.promise(MSPCodes.MSP_ANALOG);
      await MSP.promise(MSPCodes.MSP_ALTITUDE);

      // Usually altimeter indicates feet. We show centimeters, as it is more useful here.
      altitudeIndicator.setAltitude(FC.SENSOR_DATA.altitude * 100);
    }, 250);
  });

  onDestroy(() => {
    clearInterval(fastInterval);
    clearInterval(slowInterval);
  });

  function onClickHelp() {
    window.open(getTabHelpURL("tabStatus"), "_system");
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabStatus")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

<Page {header} {loading}>
  {#if armingCurrentlyPossible}
    <div class="note arm-danger">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <p>{@html $i18n.t("statusArmingDanger")}</p>
    </div>
  {/if}

  <div class="top-grid">
    <Section>
      {#snippet header()}
        <div class="header">
          <span class="title">{$i18n.t("statusInfoHead")}</span>
          <div class="grow"></div>
          <span class="config-state">
            {#if FC.CONFIG.configurationState === FC.CONFIGURATION_STATES.CONFIGURED}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html $i18n.t("statusConfigConfigured")}
            {:else if FC.CONFIG.configurationState === FC.CONFIGURATION_STATES.DEFAULTS_CUSTOM}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html $i18n.t("statusConfigDefaults")}
            {:else}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html $i18n.t("statusConfigBare")}
            {/if}
          </span>
        </div>
      {/snippet}
      <table class="info-table">
        <tbody>
          <tr>
            <td>{$i18n.t("statusCraftName")}</td>
            <td>{FC.CONFIG.name}</td>
          </tr>
          <tr>
            <td>{$i18n.t("statusTargetName")}</td>
            <td>{FC.CONFIG.targetName}</td>
          </tr>
          <tr>
            <td>{$i18n.t("statusBoardName")}</td>
            <td>{FC.CONFIG.boardName}</td>
          </tr>
          {#if hasFlightStats}
            <tr>
              <td>{$i18n.t("statusFlightCount")}</td>
              <td>{FC.FLIGHT_STATS.stats_total_flights.toLocaleString()}</td>
            </tr>
            <tr>
              <td>{$i18n.t("statusFlightTime")}</td>
              <td>{flightStats.getDuration()}</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </Section>

    <Section label="statusArmingHead">
      <table class="info-table">
        <tbody>
          <tr>
            <td>{$i18n.t("statusEnableArming")}</td>
            <td>
              <Switch
                bind:checked={armEnabled}
                onchange={onArmingSwitchChange}
              />
            </td>
          </tr>
          <tr>
            <td class="flags-label">
              {$i18n.t("statusArmingDisableFlags")}
              <HelpIcon>
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html $i18n.t("statusArmingDisableFlagsTooltip")}
              </HelpIcon>
            </td>
            <td>
              {#each disarmFlags as flag (flag.key)}
                <span
                  class="disarm-flag"
                  title={flag.tooltipKey ? $i18n.t(flag.tooltipKey) : ""}
                >
                  {flag.label}
                </span>
              {/each}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>

    <Section label="statusBatteryHead">
      <table class="info-table">
        <tbody>
          <tr>
            <td>{$i18n.t("statusBattery")}</td>
            <td
              >{$i18n.t("powerVoltageValue", {
                1: FC.BATTERY_STATE?.voltage ?? 0,
              })}</td
            >
          </tr>
          <tr>
            <td>{$i18n.t("statusDrawing")}</td>
            <td
              >{$i18n.t("powerAmperageValue", {
                1: FC.BATTERY_STATE?.amperage ?? 0,
              })}</td
            >
          </tr>
          <tr>
            <td>{$i18n.t("statusDrawn")}</td>
            <td
              >{$i18n.t("powerMahValue", {
                1: FC.BATTERY_STATE?.mAhDrawn ?? 0,
              })}</td
            >
          </tr>
          <tr>
            <td>{$i18n.t("statusChargeLevel")}</td>
            <td
              >{$i18n.t("powerChargeLevel", {
                1: FC.BATTERY_STATE?.chargeLevel ?? 0,
              })}</td
            >
          </tr>
        </tbody>
      </table>
    </Section>

    <Section label="statusInstrumentsHead">
      <div class="instruments">
        <div id="attitude"></div>
        <div id="heading"></div>
        <div id="altitude"></div>
      </div>
    </Section>
  </div>

  <div class="bottom-grid">
    <div class="model-panel">
      <div class="model-wrapper">
        <Model bind:this={modelRef} />
        <div class="attitude-info">
          <dl>
            <dt>{$i18n.t("titleHeading")}:</dt>
            <dd>
              {$i18n.t("statusAttitude", { 1: FC.SENSOR_DATA.kinematics[2] })}
            </dd>
            <dt>{$i18n.t("titlePitch")}:</dt>
            <dd>
              {$i18n.t("statusAttitude", { 1: FC.SENSOR_DATA.kinematics[1] })}
            </dd>
            <dt>{$i18n.t("titleRoll")}:</dt>
            <dd>
              {$i18n.t("statusAttitude", { 1: FC.SENSOR_DATA.kinematics[0] })}
            </dd>
          </dl>
        </div>
        <button class="reset" onclick={onResetYaw}>
          {$i18n.t("statusButtonResetZaxisValue", { 1: yawFix })}
        </button>
      </div>
    </div>

    <Section label="statusReceiverHead">
      <div class="bars">
        {#each Array.from({ length: numBars }) as _, i (i)}
          <Meter
            --fill-hue={i * 20}
            title={$i18n.t(AXIS_NAMES[i])}
            leftLabel={(FC.RC.channels[i] ?? 0).toFixed(0)}
            rightLabel={channelLabel2(i)}
            value={channelWidth(i)}
          />
        {/each}
        <Meter
          --fill-hue={numBars * 20}
          title="RSSI"
          leftLabel={FC.ANALOG?.rssi ?? 0}
          rightLabel={`${rssiPercent.toFixed(0)}%`}
          value={rssiPercent}
        />
      </div>
    </Section>
  </div>
</Page>

<dialog bind:this={confirmDialogEl}>
  <h3>{$i18n.t("dialogConfirmArmingTitle")}</h3>
  <div class="content">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("dialogConfirmArmingNote")}</p>
  </div>
  <div class="buttons">
    <button class="btn" onclick={onConfirmArming}>
      {$i18n.t("dialogConfirmArmingConfirm")}
    </button>
    <button class="btn" onclick={onCancelArming}>
      {$i18n.t("dialogConfirmArmingClose")}
    </button>
  </div>
</dialog>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .btn {
    @extend %button;
  }

  .help-btn {
    padding: 4px 8px;
    min-width: 60px;
  }

  .arm-danger {
    :global(strong) {
      font-weight: 700;
    }
  }

  dialog {
    width: 32em;
    border-radius: var(--radius-lg);
  }

  dialog .content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  dialog .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 1.5em;
  }

  dialog h3 {
    margin-bottom: 0.5em;
  }

  .top-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    column-gap: var(--section-gap);
  }

  .header {
    @extend %section-header;
    padding-right: 8px;
  }

  .title {
    padding-left: 8px;
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .config-state {
    :global(span) {
      font-size: 0.65rem;
      color: white;
      padding: 2px 6px;
      border-radius: var(--radius-xs);
    }

    :global(.configBare) {
      background-color: var(--color-status-bad);
    }

    :global(.configDefaults) {
      background-color: #f5a834;
    }

    :global(.configConfigured) {
      background-color: var(--color-status-good);
    }
  }

  .info-table {
    width: 100%;

    td {
      padding: 3px 0;
      font-size: 0.8rem;

      &:last-child {
        text-align: right;
        font-weight: 600;
      }
    }
  }

  .flags-label {
    display: flex;
    align-items: center;
  }

  .disarm-flag {
    display: inline-block;
    margin: 2px 4px 2px 0;
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: var(--radius-xs);
    background-color: var(--color-status-bad);
    color: white;
  }

  .instruments {
    display: flex;
    justify-content: space-around;
    padding: 8px 0;
  }

  .bottom-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    column-gap: var(--section-gap);

    @media only screen and (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .model-panel {
    /* Section adds its own padding-top: var(--section-gap) via its
       .wrapper - match it here so the model box's top edge lines up with
       the Receiver section's header instead of sitting above it. */
    padding-top: var(--section-gap);
    height: calc(550px + var(--section-gap));

    @media only screen and (max-width: 480px) {
      height: calc(300px + var(--section-gap));
    }
  }

  .model-wrapper {
    position: relative;
    height: 100%;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .attitude-info {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 0.75rem;
    color: var(--color-text-soft);
    pointer-events: none;

    dl {
      display: grid;
      grid-template-columns: auto auto;
      column-gap: 6px;
      margin: 0;
    }

    dt {
      font-weight: 600;
    }
  }

  .reset {
    @extend %button;
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>

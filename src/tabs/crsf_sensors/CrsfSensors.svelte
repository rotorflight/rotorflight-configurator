<script>
  import { onDestroy, onMount } from "svelte";

  import Page from "@/components/Page.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  const POLL_INTERVAL_MS = 500;

  let loading = $state(true);
  let supported = $state(true);
  let pollerInterval;

  let status = $derived(FC.CRSF_SENSORS_STATUS ?? {});

  function mv(value) {
    return `${(value / 1000).toFixed(3)} V`;
  }

  function hex(value) {
    return `0x${value.toString(16).padStart(2, "0")}`;
  }

  async function refresh() {
    const response = await MSP.promise(MSPCodes.MSP2_GET_CRSF_SENSORS_STATUS);
    // Older firmware without this command simply won't populate any data.
    if (!response || response.length === 0) {
      supported = false;
    }
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabCrsfSensors"), "_system");
  }

  onMount(async () => {
    await refresh();
    loading = false;

    pollerInterval = setInterval(refresh, POLL_INTERVAL_MS);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
  });
</script>

{#snippet header()}
  <h1>{$i18n.t("tabCrsfSensors")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

<Page {header} {loading}>
  {#if !supported}
    <p class="note">{$i18n.t("crsfSensorsNotSupported")}</p>
  {:else}
    <p class="description">
      {$i18n.t("crsfSensorsDescription")}
      <a
        class="learn-more"
        href={getTabHelpURL("tabCrsfSensors")}
        target="_system"
      >
        {$i18n.t("crsfSensorsLearnMore")}
      </a>
    </p>

    {#if !status.enabled}
      <p class="note">{$i18n.t("crsfSensorsPortNotConfigured")}</p>
    {/if}

    {#snippet sectionHeader(titleKey, badgeUp)}
      <div class="section-header">
        <span class="title">{$i18n.t(titleKey)}</span>
        <div class="grow"></div>
        <span class="badge" class:up={badgeUp} class:down={!badgeUp}>
          {badgeUp
            ? $i18n.t("crsfSensorsBadgeReceiving")
            : $i18n.t("crsfSensorsBadgeNoData")}
        </span>
      </div>
    {/snippet}

    <div class="card">
      <div class="section-header">
        <span class="title">{$i18n.t("crsfSensorsLinkTitle")}</span>
        <div class="grow"></div>
        <span
          class="badge"
          class:up={status.enabled}
          class:down={!status.enabled}
        >
          {status.enabled
            ? $i18n.t("crsfSensorsBadgePortEnabled")
            : $i18n.t("crsfSensorsBadgePortDisabled")}
        </span>
      </div>
      <div class="grid">
        <div class="stat">
          <span class="label">{$i18n.t("crsfSensorsRxBytes")}</span>
          <span class="value">{status.rxByteCount ?? 0}</span>
        </div>
        <div class="stat">
          <span class="label">{$i18n.t("crsfSensorsRxSyncBytes")}</span>
          <span class="value">{status.rxSyncCount ?? 0}</span>
        </div>
        <div class="stat">
          <span class="label">{$i18n.t("crsfSensorsCrcOk")}</span>
          <span class="value">{status.rxCrcOkCount ?? 0}</span>
        </div>
        <div class="stat">
          <span class="label">{$i18n.t("crsfSensorsCrcFail")}</span>
          <span class="value" class:warn={(status.rxCrcFailCount ?? 0) > 0}
            >{status.rxCrcFailCount ?? 0}</span
          >
        </div>
        <div class="stat">
          <span class="label">{$i18n.t("crsfSensorsLastFrame")}</span>
          <span class="value"
            >{hex(status.lastFrameType ?? 0)} / {status.lastFrameLength ??
              0}</span
          >
        </div>
      </div>
    </div>

    <div class="card">
      {@render sectionHeader("crsfSensorsGpsTitle", !!status.gps)}
      {#if status.gps}
        <div class="grid">
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsGpsLat")}</span>
            <span class="value">{(status.gps.latitude / 1e7).toFixed(6)}</span>
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsGpsLon")}</span>
            <span class="value">{(status.gps.longitude / 1e7).toFixed(6)}</span>
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsGpsSpeed")}</span>
            <span class="value"
              >{(status.gps.groundspeedCmS / 100).toFixed(1)} m/s</span
            >
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsGpsHeading")}</span>
            <span class="value"
              >{(status.gps.headingDeg10 / 10).toFixed(1)}°</span
            >
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsGpsAlt")}</span>
            <span class="value"
              >{(status.gps.altitudeCm / 100).toFixed(1)} m</span
            >
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsGpsSats")}</span>
            <span class="value">{status.gps.satellites}</span>
          </div>
        </div>
      {:else}
        <p class="empty">{$i18n.t("crsfSensorsNoData")}</p>
      {/if}
    </div>

    <div class="card">
      {@render sectionHeader("crsfSensorsBatteryTitle", !!status.battery)}
      {#if status.battery}
        <div class="grid">
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsBatteryVoltage")}</span>
            <span class="value">{mv(status.battery.voltageMv)}</span>
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsBatteryCurrent")}</span>
            <span class="value"
              >{(status.battery.currentMa / 1000).toFixed(2)} A</span
            >
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsBatteryCapacity")}</span>
            <span class="value">{status.battery.capacityMah} mAh</span>
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsBatteryRemaining")}</span>
            <span class="value">{status.battery.remainingPct}%</span>
          </div>
        </div>
      {:else}
        <p class="empty">{$i18n.t("crsfSensorsNoData")}</p>
      {/if}
    </div>

    <div class="card">
      {@render sectionHeader("crsfSensorsBaroTitle", !!status.baro)}
      {#if status.baro}
        <div class="grid">
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsBaroAlt")}</span>
            <span class="value"
              >{(status.baro.altitudeCm / 100).toFixed(1)} m</span
            >
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsBaroVspeed")}</span>
            <span class="value"
              >{(status.baro.verticalSpeedCmS / 100).toFixed(2)} m/s</span
            >
          </div>
        </div>
      {:else}
        <p class="empty">{$i18n.t("crsfSensorsNoData")}</p>
      {/if}
    </div>

    <div class="card">
      {@render sectionHeader("crsfSensorsCellsTitle", !!status.cells)}
      {#if status.cells}
        <div class="grid">
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsCellsCount")}</span>
            <span class="value">{status.cells.cellCount}</span>
          </div>
          <div class="stat">
            <span class="label">{$i18n.t("crsfSensorsCellsTotal")}</span>
            <span class="value">{mv(status.cells.totalVoltageMv)}</span>
          </div>
        </div>
        <div class="cell-list">
          {#each status.cells.cellVoltageMv as cellVoltage, i (i)}
            <span class="cell-chip">
              {$i18n.t("crsfSensorsCellsChip", { 1: i + 1 })}: {mv(cellVoltage)}
            </span>
          {/each}
        </div>
      {:else}
        <p class="empty">{$i18n.t("crsfSensorsNoData")}</p>
      {/if}
    </div>

    <div class="card">
      {@render sectionHeader("crsfSensorsRpmTitle", !!status.rpm)}
      {#if status.rpm}
        <div class="cell-list">
          {#each status.rpm.rpmValues as rpmValue, i (i)}
            <span class="cell-chip">
              {$i18n.t("crsfSensorsRpmChip", { 1: i + 1 })}: {rpmValue} RPM
            </span>
          {/each}
        </div>
        <p class="rpm-caveat">{$i18n.t("crsfSensorsRpmCaveat")}</p>
      {:else}
        <p class="empty">{$i18n.t("crsfSensorsNoData")}</p>
      {/if}
    </div>
  {/if}
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .btn {
    @extend %button;
  }

  .help-btn {
    min-width: 60px;
  }

  .description {
    margin-top: var(--section-gap);
    margin-bottom: var(--section-gap);
    padding: 8px 12px;
    border-radius: 4px;

    color: var(--color-text-soft);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .learn-more {
    color: var(--color-border-accent);
    white-space: nowrap;

    &:hover {
      text-decoration: none;
    }
  }

  .note {
    margin-top: var(--section-gap);
    margin-bottom: var(--section-gap);
    padding: 8px 12px;
    border-radius: 4px;

    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-accent);
  }

  .card {
    @extend %section-shadow;

    margin-bottom: var(--section-gap);
    border-radius: 4px;
    background-color: var(--color-surface);
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;

    color: var(--color-text-alt);
    background-color: var(--color-surface-alt);
    border-bottom: 1px solid var(--color-border);

    .title {
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  }

  .badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);

    &.up {
      color: var(--color-border-accent);
      border-color: var(--color-border-accent);
    }

    &.down {
      color: var(--color-danger, var(--color-border-accent));
      border-color: var(--color-danger, var(--color-border-accent));
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1px;
    background-color: var(--color-border);
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 12px;
    background-color: var(--color-surface);
  }

  .label {
    font-size: 0.68rem;
    color: var(--color-text-soft);
    white-space: nowrap;
  }

  .value {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;

    &.warn {
      color: var(--color-danger, var(--color-border-accent));
    }
  }

  .empty {
    padding: 12px;
    margin: 0;
    color: var(--color-text-soft);
    font-size: 0.85rem;
  }

  .cell-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px 12px;
  }

  .cell-chip {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;

    color: var(--color-text);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  .rpm-caveat {
    margin: 0;
    padding: 0 12px 12px;
    font-size: 0.75rem;
    color: var(--color-danger, var(--color-text-soft));
  }
</style>

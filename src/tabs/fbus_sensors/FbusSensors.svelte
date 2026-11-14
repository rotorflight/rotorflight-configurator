<script>
  import { onDestroy, onMount } from "svelte";

  import Page from "@/components/Page.svelte";
  import Switch from "@/components/Switch.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { Features } from "@/js/features.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { RX_PROTOCOLS } from "@/tabs/receiver/protocols.js";

  // Mirrors fbusSensorGetSourceName() in drivers/fbus_sensor.c
  const SOURCE_NAMES = ["FBUS", "S.Port"];

  // Mirrors FBUS_MASTER_MAX_FORWARDED_SENSORS / FBUS_INVALID_PHYSICAL_ID in
  // pg/fbus_master.h -- fixed-size slot array, 0xFF marks an empty slot.
  const FORWARD_SLOT_COUNT = 8;
  const EMPTY_SLOT = 0xff;

  const POLL_INTERVAL_MS = 1000;

  let loading = $state(true);
  let supported = $state(true);
  let clearing = $state(false);
  let togglingKey = $state(null);
  let pollerInterval;

  let sensors = $derived(FC.FBUS_SENSORS ?? []);
  let status = $derived(FC.FBUS_SENSORS_STATUS ?? {});
  let statusSupported = $state(true);

  // App ID ranges each decoded block comes from (drivers/fbus_sensor.h). A
  // card shows when an observed sensor sends one of its app IDs, or when its
  // block has data.
  const CARD_APP_ID_RANGES = {
    gps: [[0x0800, 0x086f]],
    current: [[0x0200, 0x022f]],
    cells: [[0x0300, 0x030f]],
    esc: [
      [0x0400, 0x041f],
      [0x0500, 0x050f],
      [0x0b50, 0x0b7f],
    ],
    servo: [[0x6800, 0x680f]],
  };

  function appIdSeen(ranges) {
    return sensors.some((sensor) =>
      sensor.appIds.some((appId) =>
        ranges.some(([lo, hi]) => appId >= lo && appId <= hi),
      ),
    );
  }

  function cardObserved(card) {
    return appIdSeen(CARD_APP_ID_RANGES[card]);
  }

  // The ESC card's speed comes from FrSky ESCs (ESC_R&C 0x0B60, eRPM) or the
  // FrSky RPM sensor (0x0500, RPM); label it by which one is on the bus.
  let rpmLabelKey = $derived.by(() => {
    const fromEsc = appIdSeen([[0x0b60, 0x0b6f]]);
    const fromRpmSensor = appIdSeen([[0x0500, 0x050f]]);
    if (fromEsc && !fromRpmSensor) {
      return "fbusSensorsEscErpm";
    }
    if (fromRpmSensor && !fromEsc) {
      return "fbusSensorsEscRpm";
    }
    return "fbusSensorsEscRpmOrErpm";
  });

  let visibleCards = $derived(
    statusSupported
      ? Object.keys(CARD_APP_ID_RANGES).filter(
          (card) => !!status[card] || cardObserved(card),
        )
      : [],
  );

  const NONE = "—";

  function fixed(value, scale, digits, unit) {
    return `${(value / scale).toFixed(digits)} ${unit}`;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  // FrSky GPS speed is knots * 1000
  function gpsSpeed(milliKnots) {
    return `${((milliKnots / 1000) * 0.514444).toFixed(1)} m/s`;
  }

  function cellSpread(cells) {
    const values = cells.cellVoltageCentiVolts;
    return `${(Math.max(...values) - Math.min(...values)) * 10} mV`;
  }

  // Forwarding relays sensor data back out over the receiver link's own
  // telemetry return channel (rx/fbus.c), which only exists for FrSky-family
  // protocols (F.Port/F.Port2/FBUS, and the FrSky RX-SPI variants). Reading
  // sensors as an FBUS/S.Port master works regardless of RX protocol --
  // that's a separate UART -- but forwarding specifically needs this.
  // Mirrors the active-protocol lookup in Receiver.svelte.
  let rxFeature = $derived.by(() => {
    for (const f of Features.GROUPS.RX_PROTO) {
      if (FC.FEATURE_CONFIG.features[f]) {
        return f;
      }
    }
  });

  let rxProto = $derived.by(() => {
    if (!rxFeature) {
      return null;
    }

    for (let i = 1; i < RX_PROTOCOLS.length; i++) {
      const proto = RX_PROTOCOLS[i];
      if (proto.feature !== rxFeature) {
        continue;
      }

      if (
        rxFeature === "RX_SERIAL" &&
        proto.id !== FC.RX_CONFIG.serialrx_provider
      ) {
        continue;
      }

      if (rxFeature === "RX_SPI" && proto.id !== FC.RX_CONFIG.rxSpiProtocol) {
        continue;
      }

      return proto;
    }

    return null;
  });

  let canForward = $derived(rxProto?.telemetry?.proto === "smartport");

  function sourceName(source) {
    return SOURCE_NAMES[source] ?? `ID_${source}`;
  }

  function rowKey(sensor) {
    return `${sensor.source}-${sensor.physicalId}`;
  }

  async function refreshSensors() {
    const response = await MSP.promise(MSPCodes.MSP2_GET_FBUS_SENSORS);
    // Older firmware without this command simply won't populate any data.
    if (!response || response.length === 0) {
      supported = false;
    }
  }

  async function refreshStatus() {
    if (!statusSupported) {
      return;
    }
    const response = await MSP.promise(MSPCodes.MSP2_GET_FBUS_SENSORS_STATUS);
    // Firmware without decoded readings: show the sensor list only.
    if (!response || response.length === 0) {
      statusSupported = false;
    }
  }

  async function refresh() {
    await Promise.all([refreshSensors(), refreshStatus()]);
  }

  async function refreshForwardConfig() {
    await MSP.promise(MSPCodes.MSP2_GET_FBUS_MASTER_CONFIG);
  }

  async function onClickClear() {
    clearing = true;
    try {
      await MSP.promise(MSPCodes.MSP2_CLEAR_FBUS_SENSORS);
      await refresh();
    } finally {
      clearing = false;
    }
  }

  async function toggleForwarding(sensor) {
    if (togglingKey || !canForward) {
      return;
    }

    const slots = [...(FC.FBUS_MASTER_CONFIG.forwardedSensors ?? [])];
    while (slots.length < FORWARD_SLOT_COUNT) {
      slots.push(EMPTY_SLOT);
    }

    if (sensor.forwarded) {
      const slotIndex = slots.indexOf(sensor.physicalId);
      if (slotIndex === -1) {
        return;
      }
      slots[slotIndex] = EMPTY_SLOT;
    } else {
      const freeIndex = slots.indexOf(EMPTY_SLOT);
      if (freeIndex === -1) {
        GUI.log($i18n.t("fbusSensorsSlotsFull"));
        return;
      }
      slots[freeIndex] = sensor.physicalId;
    }

    togglingKey = rowKey(sensor);
    try {
      FC.FBUS_MASTER_CONFIG.forwardedSensors = slots;
      await MSP.promise(
        MSPCodes.MSP2_SET_FBUS_MASTER_CONFIG,
        mspHelper.crunch(MSPCodes.MSP2_SET_FBUS_MASTER_CONFIG),
      );
      await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
      await Promise.all([refresh(), refreshForwardConfig()]);
    } finally {
      togglingKey = null;
    }
  }

  function onClickHelp() {
    window.open(getTabHelpURL("tabFbusSensors"), "_system");
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_RX_CONFIG);
    await Promise.all([refresh(), refreshForwardConfig()]);
    loading = false;

    pollerInterval = setInterval(refresh, POLL_INTERVAL_MS);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
  });
</script>

{#snippet header()}
  <h1>{$i18n.t("tabFbusSensors")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onClickClear} disabled={clearing}>
    {$i18n.t("fbusSensorsClear")}
  </button>
{/snippet}

<Page {header} {loading} {toolbar}>
  {#if !supported}
    <p class="note">{$i18n.t("fbusSensorsNotSupported")}</p>
  {:else}
    <p class="description">
      {$i18n.t("fbusSensorsDescription")}
      <a
        class="learn-more"
        href={getTabHelpURL("tabFbusSensors")}
        target="_system"
      >
        {$i18n.t("fbusSensorsLearnMore")}
      </a>
    </p>

    {#if sensors.length === 0}
      <p class="note">{$i18n.t("fbusSensorsEmpty")}</p>
    {:else}
      <div class="table-wrap">
        <table class="grid">
          <thead>
            <tr>
              <th>{$i18n.t("fbusSensorsColPhysicalId")}</th>
              <th>{$i18n.t("fbusSensorsColSource")}</th>
              <th>{$i18n.t("fbusSensorsColName")}</th>
              <th>{$i18n.t("fbusSensorsColAppIds")}</th>
              <th>{$i18n.t("fbusSensorsColPackets")}</th>
              <th>{$i18n.t("fbusSensorsColForwarded")}</th>
            </tr>
          </thead>
          <tbody>
            {#each sensors as sensor (rowKey(sensor))}
              <tr>
                <td>{sensor.physicalId}</td>
                <td>{sourceName(sensor.source)}</td>
                <td class="name">{sensor.name}</td>
                <td class="app-ids">{sensor.appIds.join(", ")}</td>
                <td>{sensor.packetCount}</td>
                <td
                  class:dimmed={!canForward}
                  title={!canForward
                    ? $i18n.t("fbusSensorsForwardingUnavailable")
                    : undefined}
                >
                  <Switch
                    checked={sensor.forwarded}
                    disabled={!canForward ||
                      (togglingKey !== null && togglingKey !== rowKey(sensor))}
                    onchange={() => toggleForwarding(sensor)}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    {#if visibleCards.length > 0}
      <h2 class="readings-title">{$i18n.t("fbusSensorsReadingsTitle")}</h2>
    {/if}

    {#snippet sectionHeader(titleKey, badgeUp)}
      <div class="section-header">
        <span class="title">{$i18n.t(titleKey)}</span>
        <div class="grow"></div>
        <span class="badge" class:up={badgeUp} class:down={!badgeUp}>
          {badgeUp
            ? $i18n.t("fbusSensorsBadgeReceiving")
            : $i18n.t("fbusSensorsBadgeNoData")}
        </span>
      </div>
    {/snippet}

    {#snippet stat(labelKey, value)}
      <div class="stat">
        <span class="stat-label">{$i18n.t(labelKey)}</span>
        <span class="stat-value">{value}</span>
      </div>
    {/snippet}

    {#snippet noData()}
      <p class="empty">{$i18n.t("fbusSensorsNoData")}</p>
    {/snippet}

    {#if visibleCards.includes("gps")}
      {@const gps = status.gps}
      <div class="card">
        {@render sectionHeader("fbusSensorsGpsTitle", !!gps)}
        {#if gps}
          <div class="stats">
            {@render stat(
              "fbusSensorsGpsLat",
              gps.hasPosition ? (gps.latitude / 1e7).toFixed(6) : NONE,
            )}
            {@render stat(
              "fbusSensorsGpsLon",
              gps.hasPosition ? (gps.longitude / 1e7).toFixed(6) : NONE,
            )}
            {@render stat(
              "fbusSensorsGpsAlt",
              gps.hasAltitude ? fixed(gps.altitudeCm, 100, 1, "m") : NONE,
            )}
            {@render stat(
              "fbusSensorsGpsSpeed",
              gps.hasSpeed ? gpsSpeed(gps.speedMilliKnots) : NONE,
            )}
            {@render stat(
              "fbusSensorsGpsCourse",
              gps.hasCourse ? fixed(gps.courseDeg10, 10, 1, "°") : NONE,
            )}
            {@render stat(
              "fbusSensorsGpsSats",
              gps.hasSatellites ? gps.satellites : NONE,
            )}
            {@render stat(
              "fbusSensorsGpsTime",
              gps.hasTime
                ? `${pad2(gps.hours)}:${pad2(gps.minutes)}:${pad2(gps.seconds)}`
                : NONE,
            )}
            {@render stat(
              "fbusSensorsGpsDate",
              gps.hasDate
                ? `${gps.year}-${pad2(gps.month)}-${pad2(gps.day)}`
                : NONE,
            )}
          </div>
        {:else}
          {@render noData()}
        {/if}
      </div>
    {/if}

    {#if visibleCards.includes("current")}
      {@const current = status.current}
      <div class="card">
        {@render sectionHeader("fbusSensorsCurrentTitle", !!current)}
        {#if current}
          <div class="stats">
            {@render stat(
              "fbusSensorsVoltage",
              current.hasVoltage
                ? fixed(current.voltageCentiVolts, 100, 2, "V")
                : NONE,
            )}
            {@render stat(
              "fbusSensorsCurrent",
              current.hasCurrent
                ? fixed(current.currentDeciAmps, 10, 1, "A")
                : NONE,
            )}
            {#if current.hasHighPrecisionCurrent}
              {@render stat(
                "fbusSensorsCurrentFine",
                fixed(current.currentMilliAmps, 1000, 3, "A"),
              )}
            {/if}
          </div>
        {:else}
          {@render noData()}
        {/if}
      </div>
    {/if}

    {#if visibleCards.includes("cells")}
      {@const cells = status.cells}
      <div class="card">
        {@render sectionHeader("fbusSensorsCellsTitle", !!cells)}
        {#if cells && cells.cellCount > 0}
          <div class="stats">
            {@render stat("fbusSensorsCellsCount", cells.cellCount)}
            {@render stat(
              "fbusSensorsCellsTotal",
              fixed(cells.totalVoltageCentiVolts, 100, 2, "V"),
            )}
            {@render stat(
              "fbusSensorsCellsLowest",
              fixed(Math.min(...cells.cellVoltageCentiVolts), 100, 2, "V"),
            )}
            {@render stat("fbusSensorsCellsSpread", cellSpread(cells))}
          </div>
          <div class="cell-list">
            {#each cells.cellVoltageCentiVolts as cellVoltage, i (i)}
              <span class="cell-chip">
                {$i18n.t("fbusSensorsCellsChip", { 1: i + 1 })}:
                {fixed(cellVoltage, 100, 2, "V")}
              </span>
            {/each}
          </div>
        {:else}
          {@render noData()}
        {/if}
      </div>
    {/if}

    {#if visibleCards.includes("esc")}
      {@const esc = status.esc}
      <div class="card">
        {@render sectionHeader("fbusSensorsEscTitle", !!esc)}
        {#if esc}
          <div class="stats">
            {#if esc.hasPower}
              {@render stat(
                "fbusSensorsVoltage",
                fixed(esc.voltageCentiVolts, 100, 2, "V"),
              )}
              {@render stat(
                "fbusSensorsCurrent",
                fixed(esc.currentCentiAmps, 100, 2, "A"),
              )}
            {/if}
            {@render stat(rpmLabelKey, esc.hasRpm ? esc.rpm : NONE)}
            {#if esc.hasConsumption}
              {@render stat(
                "fbusSensorsEscConsumption",
                `${esc.consumptionMah} mAh`,
              )}
            {/if}
            {@render stat(
              "fbusSensorsTemperature",
              esc.hasTemperature ? `${esc.temperature1} °C` : NONE,
            )}
            {#if esc.hasTemperature && esc.temperature2 > 0}
              {@render stat(
                "fbusSensorsTemperature2",
                `${esc.temperature2} °C`,
              )}
            {/if}
          </div>
        {:else}
          {@render noData()}
        {/if}
      </div>
    {/if}

    {#if visibleCards.includes("servo")}
      {@const servo = status.servo}
      <div class="card">
        {@render sectionHeader("fbusSensorsServoTitle", !!servo)}
        {#if servo}
          <div class="stats">
            {@render stat(
              "fbusSensorsVoltage",
              fixed(servo.voltageDeciVolts, 10, 1, "V"),
            )}
            {@render stat(
              "fbusSensorsCurrent",
              fixed(servo.currentDeciAmps, 10, 1, "A"),
            )}
            {@render stat("fbusSensorsTemperature", `${servo.temperature} °C`)}
          </div>
          <p class="caveat">{$i18n.t("fbusSensorsServoCaveat")}</p>
        {:else}
          {@render noData()}
        {/if}
      </div>
    {/if}
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

  .table-wrap {
    @extend %section-shadow;

    overflow-x: auto;
    border-radius: 4px;
    background-color: var(--color-surface);
  }

  .grid {
    width: 100%;
    min-width: 640px;
    border-collapse: collapse;
  }

  th {
    padding: 6px 12px;
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: left;
    white-space: nowrap;

    /* surface-alt is a dark band in both themes -- text-alt is the token
       for text on it (the same one the shared section-header mixin uses),
       giving near-white headers in both themes. Plain text-soft/text read
       near-black here in light theme since they're tuned for the light
       surface, not this band. */
    color: var(--color-text-alt);
    background-color: var(--color-surface-alt);
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 6px 12px;
    font-size: 0.85rem;
    border-bottom: 1px solid var(--color-border);
  }

  /* Opacity rather than recoloring the switch itself -- reliably dims it
     regardless of checked/disabled state, sidestepping Switch.svelte's own
     checked-color vs. disabled-color specificity. */
  td.dimmed {
    opacity: 0.45;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .name {
    font-weight: 600;
  }

  .app-ids {
    color: var(--color-text-soft);
    font-variant-numeric: tabular-nums;
  }

  /* Card styles match the CRSF Sensors tab. */
  .readings-title {
    margin: var(--section-gap) 0 8px;
    font-size: 0.9rem;
    font-weight: 600;
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

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  /* Lines drawn per cell, so a part-filled last row has no grey filler */
  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 12px;
    box-shadow: inset -1px -1px 0 var(--color-border);
  }

  .stat-label {
    font-size: 0.68rem;
    color: var(--color-text-soft);
    white-space: nowrap;
  }

  .stat-value {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
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

  .caveat {
    margin: 0;
    padding: 8px 12px;
    font-size: 0.75rem;
    color: var(--color-text-soft);
  }
</style>

<script>
  import diff from "microdiff";
  import { onDestroy, onMount } from "svelte";

  import Field from "@/components/Field.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { GUI } from "@/js/gui.js";
  import { getTabHelpURL } from "@/js/help.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";
  import { reinitialiseConnection } from "@/js/serial_backend.js";

  const GPS_PROTOCOLS = ["NMEA", "UBLOX", "MSP", "FBUS"];
  // The web build is served from a sub-directory, so resolve against the page.
  const MAP_URL =
    __BACKEND__ === "web"
      ? new URL("src/tabs/map.html", document.baseURI).toString()
      : "/src/tabs/map.html";
  const useMapWebview = __BACKEND__ === "nwjs";

  // GPS_DATA.chn is a fixed-size channel-tracking array padded with unused
  // zero-filled slots past the actual satellite count - cap how many rows
  // we render so the table doesn't fill up with empty entries.
  const MAX_SIGNAL_ROWS = 15;

  let signalRowCount = $derived(
    Math.min(FC.GPS_DATA?.chn.length ?? 0, MAX_SIGNAL_ROWS),
  );

  let loading = $state(true);
  let initialState = $state(null);
  let pollerInterval;
  let statusInterval;

  let mapEl = $state();
  let online = $state(navigator.onLine);
  let gpsWasFixed = $state(false);

  function snapshotState() {
    return $state.snapshot({ GPS_CONFIG: FC.GPS_CONFIG });
  }

  let changes = $derived.by(() => {
    if (!initialState) {
      return [];
    }
    return diff(initialState, snapshotState());
  });

  let dirty = $derived(changes.length > 0);
  let showToolbar = $derived(!loading && dirty);

  let sbasOptions = $derived(
    [
      "gpsSbasAutoDetect",
      "gpsSbasEuropeanEGNOS",
      "gpsSbasNorthAmericanWAAS",
      "gpsSbasJapaneseMSAS",
      "gpsSbasIndianGAGAN",
      "gpsSbasNone",
    ].map((key, value) => ({ value, label: $i18n.t(key) })),
  );

  const protocolOptions = GPS_PROTOCOLS.map((name, value) => ({
    value,
    label: name,
  }));

  // `home_point_once`/`ublox_use_galileo`/`auto_baud`/`auto_config` are
  // stored as 0/1 ints over the wire, not booleans - these bridge them to
  // Switch's boolean `checked` without adding parallel state to keep in sync.
  function getAutoBaud() {
    return FC.GPS_CONFIG.auto_baud > 0;
  }
  function setAutoBaud(v) {
    FC.GPS_CONFIG.auto_baud = v ? 1 : 0;
  }
  function getAutoConfig() {
    return FC.GPS_CONFIG.auto_config > 0;
  }
  function setAutoConfig(v) {
    FC.GPS_CONFIG.auto_config = v ? 1 : 0;
  }
  function getUbloxGalileo() {
    return FC.GPS_CONFIG.ublox_use_galileo > 0;
  }
  function setUbloxGalileo(v) {
    FC.GPS_CONFIG.ublox_use_galileo = v ? 1 : 0;
  }
  function getHomePointOnce() {
    return FC.GPS_CONFIG.home_point_once > 0;
  }
  function setHomePointOnce(v) {
    FC.GPS_CONFIG.home_point_once = v ? 1 : 0;
  }

  let fbusSelected = $derived(
    FC.GPS_CONFIG?.provider === GPS_PROTOCOLS.indexOf("FBUS"),
  );
  // FBUS receives GPS as pushed sensor telemetry instead of driving a GPS
  // receiver over a serial port of its own.
  let pushedDataSelected = $derived(fbusSelected);
  let fbusSatelliteCountUnknown = $derived(
    fbusSelected && FC.GPS_DATA?.fix && FC.GPS_DATA?.numSat === 0,
  );
  let ubloxSelected = $derived(
    FC.GPS_CONFIG?.provider === GPS_PROTOCOLS.indexOf("UBLOX"),
  );
  let autoConfigEnabled = $derived(
    !pushedDataSelected && FC.GPS_CONFIG?.auto_config > 0,
  );

  // The pushed-data transports carry their own GPS link - the auto
  // baud/config knobs and the sat-signal panel don't apply, matching
  // legacy's refreshGpsProviderUi().
  $effect(() => {
    if (pushedDataSelected && FC.GPS_CONFIG) {
      FC.GPS_CONFIG.auto_baud = 0;
      FC.GPS_CONFIG.auto_config = 0;
    }
  });

  function onClickHelp() {
    window.open(getTabHelpURL("tabGPS"), "_system");
  }

  function setOnlineStatus(isOnline) {
    online = isOnline;
  }

  // Some <webview> implementations only pick up navigation from a `src`
  // mutation observed *after* the element is connected to the live DOM -
  // a `src` present at element-creation time can be silently missed. This
  // effect fires once mapEl becomes non-null (i.e. after it's mounted),
  // guaranteeing the attribute is set post-connection.
  $effect(() => {
    if (mapEl) {
      mapEl.setAttribute("src", MAP_URL);
    }
  });

  function updateMap() {
    const lat = FC.GPS_DATA.lat / 10000000;
    const lon = FC.GPS_DATA.lon / 10000000;

    if (!online) {
      gpsWasFixed = false;
      return;
    }

    const contentWindow = mapEl?.contentWindow;
    if (!contentWindow) {
      return;
    }

    if (FC.GPS_DATA.fix) {
      gpsWasFixed = true;
      contentWindow.postMessage({ action: "center", lat, lon }, "*");
    } else if (gpsWasFixed) {
      contentWindow.postMessage({ action: "nofix" }, "*");
    }
  }

  function onZoomIn() {
    mapEl?.contentWindow?.postMessage({ action: "zoom_in" }, "*");
  }

  function onZoomOut() {
    mapEl?.contentWindow?.postMessage({ action: "zoom_out" }, "*");
  }

  onMount(async () => {
    await MSP.promise(MSPCodes.MSP_STATUS);
    await MSP.promise(MSPCodes.MSP_GPS_CONFIG);

    initialState = snapshotState();
    loading = false;

    pollerInterval = setInterval(async () => {
      await MSP.promise(MSPCodes.MSP_RAW_GPS);
      await MSP.promise(MSPCodes.MSP_COMP_GPS);
      await MSP.promise(MSPCodes.MSP_GPS_SV_INFO);
      updateMap();
    }, 75);

    statusInterval = setInterval(() => {
      MSP.promise(MSPCodes.MSP_STATUS);
    }, 250);
  });

  onDestroy(() => {
    clearInterval(pollerInterval);
    clearInterval(statusInterval);
  });

  export async function onSave() {
    await MSP.promise(
      MSPCodes.MSP_SET_GPS_CONFIG,
      mspHelper.crunch(MSPCodes.MSP_SET_GPS_CONFIG),
    );
    await MSP.promise(MSPCodes.MSP_EEPROM_WRITE);
    GUI.log($i18n.t("eepromSaved"));

    MSP.send_message(MSPCodes.MSP_SET_REBOOT);
    GUI.log($i18n.t("deviceRebooting"));

    await new Promise((resolve) => reinitialiseConnection(resolve));

    initialState = snapshotState();
  }

  export async function onRevert() {
    const saved = initialState.GPS_CONFIG;
    Object.assign(FC.GPS_CONFIG, saved);
  }

  export function isDirty() {
    return dirty;
  }
</script>

{#snippet header()}
  <h1>{$i18n.t("tabGPS")}</h1>
  <div class="grow"></div>
  <button class="btn help-btn" onclick={onClickHelp}>
    {$i18n.t("buttonHelp")}
  </button>
{/snippet}

{#snippet toolbar()}
  <button class="btn" onclick={onRevert}>{$i18n.t("buttonRevert")}</button>
  <button class="btn" onclick={onSave}>{$i18n.t("buttonSaveReboot")}</button>
{/snippet}

<Page {header} {loading} toolbar={showToolbar && toolbar}>
  <div class="primary-row">
    <Section label="configurationGPS">
      <Field id="gps-protocol" label="configurationGPSProtocol">
        <Select
          id="gps-protocol"
          bind:value={FC.GPS_CONFIG.provider}
          options={protocolOptions}
        />
      </Field>

      {#if !pushedDataSelected}
        {#if autoConfigEnabled && ubloxSelected}
          <Field id="gps-ubx-sbas" label="configurationGPSubxSbas">
            <Select
              id="gps-ubx-sbas"
              bind:value={FC.GPS_CONFIG.ublox_sbas}
              options={sbasOptions}
            />
          </Field>
        {/if}

        <Field id="gps-auto-baud" label="configurationGPSAutoBaud">
          <Switch id="gps-auto-baud" bind:checked={getAutoBaud, setAutoBaud} />
        </Field>
        <Field id="gps-auto-config" label="configurationGPSAutoConfig">
          <Switch
            id="gps-auto-config"
            bind:checked={getAutoConfig, setAutoConfig}
          />
        </Field>

        {#if autoConfigEnabled && ubloxSelected}
          <Field id="gps-ublox-galileo" label="configurationGPSGalileo">
            {#snippet tooltip()}
              {$i18n.t("configurationGPSGalileoHelp")}
            {/snippet}
            <Switch
              id="gps-ublox-galileo"
              bind:checked={getUbloxGalileo, setUbloxGalileo}
            />
          </Field>
        {/if}
      {/if}

      <Field id="gps-home-once" label="configurationGPSHomeOnce">
        {#snippet tooltip()}
          {$i18n.t("configurationGPSHomeOnceHelp")}
        {/snippet}
        <Switch
          id="gps-home-once"
          bind:checked={getHomePointOnce, setHomePointOnce}
        />
      </Field>
    </Section>

    <Section label="gpsHead" header={statusHeader}>
      {#snippet statusHeader()}
        <div class="status-header">
          <span class="title">{$i18n.t("gpsHead")}</span>
          <div class="grow"></div>
          <span class="gps-fix">
            {#if fbusSatelliteCountUnknown}
              <span class="gpsFixTrue">Position</span>
            {:else if FC.GPS_DATA.fix}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html $i18n.t("gpsFixYes")}
            {:else}
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html $i18n.t("gpsFixNo")}
            {/if}
          </span>
        </div>
      {/snippet}
      <table class="cf_table">
        <tbody>
          <tr>
            <td>{$i18n.t("gpsAltitude")}</td>
            <td>{FC.GPS_DATA.alt} m</td>
          </tr>
          <tr>
            <td>{$i18n.t("gpsLat")}</td>
            <td>
              <a
                href={`https://maps.google.com/?q=${FC.GPS_DATA.lat / 10000000},${FC.GPS_DATA.lon / 10000000}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {(FC.GPS_DATA.lat / 10000000).toFixed(4)} deg
              </a>
            </td>
          </tr>
          <tr>
            <td>{$i18n.t("gpsLon")}</td>
            <td>
              <a
                href={`https://maps.google.com/?q=${FC.GPS_DATA.lat / 10000000},${FC.GPS_DATA.lon / 10000000}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {(FC.GPS_DATA.lon / 10000000).toFixed(4)} deg
              </a>
            </td>
          </tr>
          <tr>
            <td>{$i18n.t("gpsSpeed")}</td>
            <td>{FC.GPS_DATA.speed} cm/s</td>
          </tr>
          <tr>
            <td>{$i18n.t("gpsSats")}</td>
            <td>{fbusSatelliteCountUnknown ? "Unknown" : FC.GPS_DATA.numSat}</td
            >
          </tr>
          <tr>
            <td>{$i18n.t("gpsDistToHome")}</td>
            <td>{FC.GPS_DATA.distanceToHome} m</td>
          </tr>
        </tbody>
      </table>
    </Section>

    {#if !pushedDataSelected}
      <Section label="gpsSignalStrHead">
        <table class="cf_table">
          <thead>
            <tr>
              <td>{$i18n.t("gpsSignalSatId")}</td>
              <td>{$i18n.t("gpsSignalQty")}</td>
              <td>{$i18n.t("gpsSignalStr")}</td>
            </tr>
          </thead>
          <tbody>
            {#each Array.from({ length: signalRowCount }) as _, i (i)}
              <tr>
                <td>{FC.GPS_DATA.svid[i]}</td>
                <td>{FC.GPS_DATA.quality[i]}</td>
                <td
                  ><progress value={FC.GPS_DATA.cno[i]} max="99"></progress></td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      </Section>
    {/if}
  </div>

  <Section label="gpsMapHead">
    <div class="gps-map">
      <!-- The map frame stays mounted for the component's whole lifetime,
           matching legacy - it initializes asynchronously, so tearing it
           down/recreating it based on fix state (as an {#if} branch would)
           risks racing its readiness and never getting a working
           contentWindow. Connect/waiting are overlays toggled via CSS
           instead. -->
      <div class="loadmap" class:hidden={!online}>
        {#if useMapWebview}
          <webview
            bind:this={mapEl}
            id="map"
            class="map"
            partition="persist:map"
          ></webview>
        {:else}
          <iframe bind:this={mapEl} id="map" class="map" title="GPS map"
          ></iframe>
        {/if}
        <div class="controls">
          <button onclick={onZoomIn}>+</button>
          <button onclick={onZoomOut}>–</button>
        </div>
      </div>

      {#if !online}
        <div class="connect">
          <p>{$i18n.t("gpsMapMessage1")}</p>
          <button class="btn" onclick={() => setOnlineStatus(navigator.onLine)}>
            retry
          </button>
        </div>
      {:else if !FC.GPS_DATA.fix && !gpsWasFixed}
        <div class="waiting">
          <div class="info"></div>
        </div>
      {/if}
    </div>
  </Section>
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

  .primary-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    column-gap: var(--section-gap);
    align-items: start;
  }

  .status-header {
    @extend %section-header;
    width: 100%;
    padding: 0 8px;
  }

  .gps-fix :global(.gpsFixTrue) {
    background-color: var(--color-status-good);
    color: #fff;
    font-size: 0.7rem;
    padding: 2px 5px;
    border-radius: var(--radius-xs);
  }

  .gps-fix :global(.gpsFixFalse) {
    background-color: var(--color-status-bad);
    color: #fff;
    font-size: 0.7rem;
    padding: 2px 5px;
    border-radius: var(--radius-xs);
  }

  table.cf_table {
    width: 100%;
    border-collapse: collapse;
  }

  table.cf_table td {
    padding: 4px 8px;
    font-size: 0.8rem;
  }

  table.cf_table a {
    color: var(--color-accent, var(--accent));
  }

  progress {
    width: 100%;
    border-radius: var(--radius-xs);
  }

  .gps-map {
    position: relative;
    height: 500px;
  }

  .connect,
  .waiting {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;

    background-color: var(--color-bg);
  }

  .waiting {
    background-image: url(/images/loading-bars.svg);
    background-position: center;
    background-size: 10%;
    background-repeat: no-repeat;
  }

  .loadmap {
    height: 100%;
    display: flex;
    flex-direction: column;

    &.hidden {
      visibility: hidden;
    }
  }

  .map {
    flex: 1;
    width: 100%;
    border: 0;
  }

  .controls {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    padding: 6px;
    background-color: var(--color-surface);
  }

  .controls button {
    @extend %button;
    width: 24px;
    height: 24px;
    padding: 0;
    font-size: 1.1rem;
    line-height: 1;
  }

  @media only screen and (max-width: 480px) {
    .primary-row {
      grid-template-columns: 1fr;
    }
  }
</style>

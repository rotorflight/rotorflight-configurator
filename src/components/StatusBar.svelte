<script>
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { portUsage } from "@/js/port_usage.svelte.js";

  let showFwVersion = $derived(
    FC.CONFIG.buildVersion && FC.CONFIG.flightControllerIdentifier,
  );
  let firmwareLabel = $derived(
    `${FC.CONFIG.buildVersion} ${FC.CONFIG.flightControllerIdentifier}`,
  );
  let configuratorLabel = $derived(
    `${CONFIGURATOR.version} · ${CONFIGURATOR.buildLabel}`,
  );
</script>

<div class="container">
  <span>
    {$i18n.t("statusbar_port_utilization")}
    <span class="fas fa-long-arrow-alt-down"></span>
    {portUsage.down.toFixed()}%
    <span class="fas fa-long-arrow-alt-up"></span>
    {portUsage.up.toFixed()}%
  </span>
  <span>{$i18n.t("statusbar_packet_error")} {MSP.packet_error}</span>
  <span>{$i18n.t("statusbar_pid_cycle_time")} {FC.CONFIG.pidCycleTime}</span>
  <span>{$i18n.t("statusbar_gyro_cycle_time")} {FC.CONFIG.gyroCycleTime}</span>
  <span>{$i18n.t("statusbar_rt_load")} {FC.CONFIG.rtLoad}%</span>
  <span>{$i18n.t("statusbar_cpu_load")} {FC.CONFIG.cpuLoad}%</span>

  <div class="grow"></div>

  {#if showFwVersion}
    <span
      class="identity"
      title={`${$i18n.t("versionLabelFirmware")}: ${firmwareLabel}`}
    >
      FW {firmwareLabel}
    </span>
  {/if}
  <span
    class="identity configurator-version"
    title={`${$i18n.t("versionLabelConfigurator")}: ${CONFIGURATOR.version} · Branch/tag: ${CONFIGURATOR.buildLabel}`}
  >
    Cfg {configuratorLabel}
  </span>
</div>

<style lang="scss">
  .grow {
    flex-grow: 1;
    min-width: 8px;
  }

  .container {
    display: flex;
    flex-wrap: nowrap;
    height: 20px;
    line-height: 20px;
    width: 100%;
    overflow: hidden;

    /* The status bar belongs to the app chrome, not to the page, so it
       takes the same dark rail treatment as the header and side nav
       rather than a theme-dependent beige/grey of its own. */
    color: var(--chrome-fg-muted);
    background-color: var(--chrome-bg);
    border-top: 1px solid var(--chrome-border);
    font-variant-numeric: tabular-nums;

    & > span + span {
      border-left: 1px solid var(--chrome-border);
    }

    & > span {
      padding: 0 12px;
      flex-shrink: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .identity {
    max-width: 210px;
  }

  .configurator-version {
    max-width: 190px;
  }
</style>

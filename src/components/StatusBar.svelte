<script>
  import { i18n } from "@/js/i18n.js";
  import { portUsage } from "@/js/port_usage.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";

  let showFwVersion = $derived(
    FC.CONFIG.buildVersion && FC.CONFIG.flightControllerIdentifier,
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
    <span>
      {$i18n.t("versionLabelFirmware")}
      {FC.CONFIG.buildVersion}
      {FC.CONFIG.flightControllerIdentifier}
    </span>
  {/if}
  <span>{$i18n.t("versionLabelConfigurator")}: {CONFIGURATOR.version}</span>
</div>

<style lang="scss">
  .grow {
    flex-grow: 1;
  }

  .container {
    display: flex;
    flex-wrap: wrap;
    height: 20px;
    line-height: 20px;
    width: 100%;

    :global(html[data-theme="light"]) & {
      background-color: #bfbeb5;
      border-top: 1px solid #7d7d79;

      & > span + span {
        border-left: 1px solid #7d7d79;
      }
    }

    :global(html[data-theme="dark"]) & {
      background: #414443;
      border-top: 1px solid #9c9c9c;

      & > span + span {
        border-left: 1px solid #9c9c9c;
      }
    }

    & > span {
      padding: 0 12px;
      flex-shrink: 0;
    }
  }
</style>

<template>
  <div id="status-bar">
    <span>
      {{ $t("statusbar_port_utilization") }}
      <span class="fas fa-long-arrow-alt-down" />
      {{ portUsageDown }}%
      <span class="fas fa-long-arrow-alt-up" />
      {{ portUsageUp }}%
    </span>

    <span>{{ $t("statusbar_packet_error") }} {{ packetError }}</span>
    <span>{{ $t("statusbar_pid_cycle_time") }} {{ pidCycleTime }}</span>
    <span>{{ $t("statusbar_gyro_cycle_time") }} {{ gyroCycleTime }}</span>
    <span>{{ $t("statusbar_rt_load") }} {{ rtLoad }}%</span>
    <span>{{ $t("statusbar_cpu_load") }} {{ cpuLoad }}%</span>

    <div class="gap" />

    <span v-if="firmwareVersion && firmwareId">
      {{ $t("versionLabelFirmware") }}: {{ firmwareVersion }} {{ firmwareId }}
    </span>
    <span>{{ $t("versionLabelConfigurator") }}: {{ configuratorVersion }}</span>
  </div>
</template>
<script>

export default {
  props: [
    "portUsageDown",
    "portUsageUp",
    "packetError",
    "pidCycleTime",
    "gyroCycleTime",
    "rtLoad",
    "cpuLoad",
    "configuratorVersion",
    "firmwareVersion",
    "firmwareId",
  ],
};
</script>

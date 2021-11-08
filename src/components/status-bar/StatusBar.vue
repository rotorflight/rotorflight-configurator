<template>
  <div id="status-bar">
    <PortUtilization
      :usage-down="portUsageDown"
      :usage-up="portUsageUp"
    />
    <ReadingStat
      message="statusbar_packet_error"
      :value="packetError"
    />
    <ReadingStat
      message="statusbar_pid_cycle_time"
      :value="pidCycleTime"
    />
    <ReadingStat
      message="statusbar_gyro_cycle_time"
      :value="gyroCycleTime"
    />
    <ReadingStat
      message="statusbar_sys_load"
      :value="sysLoad"
      unit="%"
    />
    <ReadingStat
      message="statusbar_cpu_load"
      :value="cpuLoad"
      unit="%"
    />
    <StatusBarVersion
      :configurator-version="configuratorVersion"
      :firmware-version="firmwareVersion"
      :firmware-id="firmwareId"
      :hardware-id="hardwareId"
      :git-changeset-id="gitChangesetId"
    />
  </div>
</template>
<script>
import StatusBarVersion from "./StatusBarVersion.vue";
import ReadingStat from "./ReadingStat.vue";
import PortUtilization from "./PortUtilization.vue";

export default {
  components: {
    PortUtilization,
    ReadingStat,
    StatusBarVersion,
  },
  props: {
    portUsageDown: {
      type: Number,
    },
    portUsageUp: {
      type: Number,
    },
    packetError: {
      type: Number,
    },
    pidCycleTime: {
      type: Number,
    },
    gyroCycleTime: {
      type: Number,
    },
    sysLoad: {
      type: Number,
    },
    cpuLoad: {
      type: Number,
    },
    configuratorVersion: {
      type: String,
    },
    firmwareVersion: {
      type: String,
    },
    firmwareId: {
      type: String,
    },
    hardwareId: {
      type: String,
    },
    gitChangesetId: {
      type: String,
    },
  },
};
</script>

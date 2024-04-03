<template>
  <div class="battery-legend">
    {{ reading }}
  </div>
</template>
<script>
const NO_BATTERY_VOLTAGE_MAXIMUM = 1.8;

export default {
  props: {
    voltage: {
      type: Number,
      default: 0,
    },
    cellcount: {
      type: Number,
      default: 0,
    },
  },
  computed: {
    reading() {
      const cellsText =
        this.voltage > NO_BATTERY_VOLTAGE_MAXIMUM ? `${this.cellcount}S` : "USB";
      return `${this.voltage.toFixed(2)}V (${cellsText})`;
    },
  },
};
</script>

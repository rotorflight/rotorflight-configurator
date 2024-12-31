<script>
  import { FC } from "@/js/fc.svelte.js";

  const NO_BATTERY_VOLTAGE_MAXIMUM = 1.8;

  let value = $derived.by(() => {
    const voltage = FC.BATTERY_STATE.voltage.toFixed(2);
    const cells =
      FC.BATTERY_STATE.voltage > NO_BATTERY_VOLTAGE_MAXIMUM
        ? `${FC.BATTERY_STATE.cellCount}S`
        : "USB";

    return `${voltage}V (${cells})`;
  });
</script>

{value}

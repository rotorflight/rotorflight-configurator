<script>
  import { FC } from "@/js/fc.svelte.js";

  import Meter from "@/components/Meter.svelte";

  import { CHANNELS, RC_COMMAND } from "../rc_command.svelte.js";

  let { channel } = $props();

  const min = 750;
  const max = 2250;

  let hue = $derived((channel * 20).toString());

  let axis = $derived(
    channel < FC.RC_MAP.length ? FC.RC_MAP.indexOf(channel) : channel,
  );

  let width = $derived(
    ((100 * (FC.RX_CHANNELS[channel] - min)) / (max - min)).clamp(0, 100),
  );

  let percent = $derived.by(() => {
    switch (axis) {
      case CHANNELS.ROLL:
        return RC_COMMAND.roll?.percent ?? 0;
      case CHANNELS.PITCH:
        return RC_COMMAND.pitch?.percent ?? 0;
      case CHANNELS.YAW:
        return RC_COMMAND.yaw?.percent ?? 0;
      case CHANNELS.COLLECTIVE:
        return RC_COMMAND.collective?.percent ?? 0;
      case CHANNELS.THROTTLE:
        return RC_COMMAND.throttle?.percent ?? 0;
    }
  });

  let rightLabel = $derived(
    Number.isFinite(percent) ? `${(100 * percent).toFixed(1)}%` : "",
  );
</script>

<Meter
  --fill-hue={hue}
  leftLabel={FC.RX_CHANNELS[channel]}
  value={width}
  {rightLabel}
/>

<style lang="scss">
</style>

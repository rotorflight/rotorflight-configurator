<script>
  import Meter from "@/components/Meter.svelte";

  import { FC } from "@/js/fc.svelte.js";

  import { CHANNELS, RC_COMMAND } from "../rc_command.svelte.js";

  let { channel } = $props();

  const min = 750;
  const max = 2250;

  let hue = $derived((channel * 20).toString());

  let axis = $derived(FC.RC_MAP.indexOf(channel));

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

  // Second, compact line showing the backup RX's own value for this same
  // channel index, when a backup port is configured and reporting data -
  // lets both links be compared per-channel here instead of needing a
  // separate full channel grid elsewhere.
  let backupValue = $derived(FC.RX_INPUT_BACKUP_STATUS.channels[channel]);
  let hasBackupValue = $derived(backupValue !== undefined);
  let backupWidth = $derived(
    hasBackupValue
      ? ((100 * (backupValue - min)) / (max - min)).clamp(0, 100)
      : 0,
  );
</script>

<div class="channel-meters">
  <Meter
    --fill-hue={hue}
    leftLabel={FC.RX_CHANNELS[channel]}
    value={width}
    {rightLabel}
  />
  {#if hasBackupValue}
    <Meter
      --fill-hue={hue}
      leftLabel={backupValue}
      value={backupWidth}
      compact
    />
  {/if}
</div>

<style lang="scss">
  .channel-meters {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
</style>

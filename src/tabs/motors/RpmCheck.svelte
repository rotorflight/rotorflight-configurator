<script>
  // A hand test of the RPM sensor (#85): turn the rotor by hand and the readings should
  // follow it. The scale is low on purpose, so a few dozen RPM show; the flight scale is
  // in the Motor cards above. Each motor is shown as the FC reports it, so this does not
  // guess which motor the sensor is wired to.
  import Meter from "@/components/Meter.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  // Full scale of the hand test, in RPM.
  const SCALE_RPM = 500;

  let motors = $derived(
    Array.from({ length: FC.CONFIG.motorCount ?? 0 }, (_, i) => i),
  );
</script>

<div class="rpm-check">
  <p class="muted">{$i18n.t("motorsRpmCheckText")}</p>
  {#each motors as index (index)}
    {@const rpm = FC.MOTOR_TELEMETRY_DATA.rpm[index] ?? 0}
    <Meter
      title={$i18n.t("motorsRpmCheckMotor", { 1: index + 1 })}
      leftLabel={rpm > 0
        ? $i18n.t("motorsRpmCheckSignal", { 1: rpm.toLocaleString() })
        : $i18n.t("motorsRpmCheckNoSignal")}
      rightLabel={`${SCALE_RPM} RPM`}
      value={(100 * rpm) / SCALE_RPM}
    />
  {/each}
</div>

<style lang="scss">
  .rpm-check {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 6px;

    p {
      margin: 0 0 4px 0;
    }
  }
</style>

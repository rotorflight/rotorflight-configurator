<script>
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import Section from "@/components/Section.svelte";
  import Meter from "@/components/Meter.svelte";

  let headRatio = $derived(
    FC.MOTOR_CONFIG.main_rotor_gear_ratio[0] /
      FC.MOTOR_CONFIG.main_rotor_gear_ratio[1],
  );

  let tailRatio = $derived.by(() => {
    const ratio =
      FC.MOTOR_CONFIG.tail_rotor_gear_ratio[0] /
      FC.MOTOR_CONFIG.tail_rotor_gear_ratio[1];

    if (FC.MIXER_CONFIG.tail_rotor_mode === 0) {
      return headRatio / ratio;
    }

    return ratio;
  });

  const headSource = 0;
  let tailSource = $derived(FC.MIXER_CONFIG.tail_rotor_mode === 0 ? 0 : 1);

  let headspeed = $derived(
    Math.round(FC.MOTOR_TELEMETRY_DATA.rpm[headSource] * headRatio),
  );
  let tailspeed = $derived(
    Math.round(FC.MOTOR_TELEMETRY_DATA.rpm[tailSource] * tailRatio),
  );

  let headspeedMax = $state(1000);
  let tailspeedMax = $state(5000);

  $effect(() => {
    if (headspeed > headspeedMax) {
      headspeedMax = Math.ceil((headspeed + 1000) / 1000) * 1000;
    }

    if (tailspeed > tailspeedMax) {
      tailspeedMax = Math.ceil((tailspeed + 1000) / 1000) * 1000;
    }
  });
</script>

<Section label="motorRotorSpeeds">
  <div class="container">
    {#if FC.CONFIG.motorCount > 0}
      <Meter
        title={$i18n.t("motorMainRotorSpeed")}
        rightLabel={`${headspeedMax.toLocaleString()} RPM`}
        leftLabel={`${headspeed.toLocaleString()} RPM`}
        value={100 * (headspeed / headspeedMax)}
      />

      {#if FC.MIXER_CONFIG.tail_rotor_mode === 0 || FC.CONFIG.motorCount > 1}
        <Meter
          title={$i18n.t("motorTailRotorSpeed")}
          rightLabel={`${tailspeedMax.toLocaleString()} RPM`}
          leftLabel={`${tailspeed.toLocaleString()} RPM`}
          value={100 * (tailspeed / tailspeedMax)}
        />
      {/if}
    {/if}
  </div>
</Section>

<style lang="scss">
  .container {
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>

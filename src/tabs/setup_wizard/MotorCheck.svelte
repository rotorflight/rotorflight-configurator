<script>
  import { getContext, onDestroy, onMount } from "svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { motorOutputProblem } from "@/js/tail_motor.js";
  import motorState from "@/tabs/motors/state.svelte.js";

  import TabButton from "./TabButton.svelte";

  // Whether the motor outputs came up after the reboot: a motor pin the
  // protocol can't drive (DShot without DMA, say) stops every motor.
  const wiz = getContext("setupWizard");

  const POLL_MS = 1000;

  let pollTimer;
  let stopped = false;

  let protocolEnabled = $derived(
    motorState.throttleProtocols[FC.MOTOR_CONFIG.motor_pwm_protocol] !==
      "DISABLED",
  );
  let problem = $derived(motorOutputProblem(protocolEnabled, wiz.motorised));

  onMount(() => {
    async function poll() {
      if (stopped) return;
      await MSP.promise(MSPCodes.MSP_MOTOR);
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    }
    poll();
  });

  onDestroy(() => {
    stopped = true;
    clearTimeout(pollTimer);
  });
</script>

{#if problem && !wiz.rebootPending}
  <div class="note">
    <p>{$i18n.t(`motorOutputProblem_${problem}`)}</p>
    <div class="actions">
      <TabButton tab="remap_fc">{$i18n.t("setupWizardOpenRemap")}</TabButton>
      <TabButton tab="motors">{$i18n.t("setupWizardOpenMotors")}</TabButton>
    </div>
  </div>
{/if}

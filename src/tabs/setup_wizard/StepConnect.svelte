<script>
  import { getContext } from "svelte";

  import { i18n } from "@/js/i18n.js";

  import MotorCheck from "./MotorCheck.svelte";
  import ServoArt from "./ServoArt.svelte";

  // The gate between typing settings in and working on the helicopter.
  // The settings from the steps before need a reboot (servo frame rate
  // among them), so the servos are plugged in only after it: Next first
  // reboots and reopens here, then moves on.
  const wiz = getContext("setupWizard");
</script>

<div class="with-art">
  <div class="art"><ServoArt /></div>
  <div class="text">
    <p>{$i18n.t("setupWizardConnectIntro")}</p>
    <div class="note">{$i18n.t("setupWizardConnectBladesOff")}</div>
  </div>
</div>

{#if wiz.rebootPending}
  <div class="callout">
    <i class="fas fa-sync-alt" aria-hidden="true"></i>
    <span>{$i18n.t("setupWizardConnectReboot")}</span>
  </div>
{:else}
  <MotorCheck />
  <section class="card">
    <h3>
      <span class="num">1</span>{$i18n.t("setupWizardConnectServosTitle")}
    </h3>
    <p>{$i18n.t("setupWizardConnectServosText")}</p>
    {#if wiz.servos.length > 0}
      <ul>
        {#each wiz.servos as s (s.servo)}
          <li>{wiz.servoLabel(s)}</li>
        {/each}
      </ul>
    {:else}
      <div class="note">{$i18n.t("setupWizardNoServos")}</div>
    {/if}
  </section>

  <section class="card">
    <h3>
      <span class="num">2</span>{$i18n.t("setupWizardConnectBatteryTitle")}
    </h3>
    <p>{$i18n.t("setupWizardConnectBatteryText")}</p>
  </section>
{/if}

<style lang="scss">
  ul {
    margin: 0;
    padding-left: 1.4em;
  }
</style>

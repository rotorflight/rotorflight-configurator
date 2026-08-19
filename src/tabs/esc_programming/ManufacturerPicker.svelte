<script>
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  import escState from "./state.svelte.js";

  function select(manufacturer) {
    escState.selectManufacturer(manufacturer);
  }

  // Soft filter matching esc.lua's protocol pre-check: FC.ESC_SENSOR_CONFIG.protocol shares
  // the same id space as each manufacturer's escSensorProtocolIds (confirmed against the Lua
  // suite's per-manufacturer escSensorProtocolId values -- e.g. Scorpion=4, OMP=6, ZTW=7,
  // YGE=9, FlyRotor=10, XDFly=12 all line up with this app's telemetryProtocols array index).
  // AM32/BLHeli_S/Bluejay all share protocol id 1 ("potential" -- telemetry can't distinguish
  // them), so all three stay enabled together; protocol 0 (disabled/unknown) never filters.
  function protocolMismatch(manufacturer) {
    const protocol = FC.ESC_SENSOR_CONFIG.protocol;
    if (!protocol) return false;
    return !manufacturer.escSensorProtocolIds.includes(protocol);
  }
</script>

<div class="warning">
  <h2>{$i18n.t("escProgrammingWarningTitle")}</h2>
  <p>{$i18n.t("escProgrammingWarningBody")}</p>
  <label class="acknowledge">
    <input type="checkbox" bind:checked={escState.acknowledgedWarning} />
    {$i18n.t("escProgrammingWarningAcknowledge")}
  </label>
</div>

{#if escState.acknowledgedWarning}
  <h2>{$i18n.t("escProgrammingSelectManufacturer")}</h2>
  <div class="grid">
    {#each escState.manufacturers as manufacturer (manufacturer.id)}
      <button
        class="mfg-btn"
        onclick={() => select(manufacturer)}
        disabled={escState.armed || protocolMismatch(manufacturer)}
      >
        {manufacturer.name}
      </button>
    {/each}
  </div>
{/if}

<style lang="scss">
  .warning {
    padding: 8px;
  }

  .acknowledge {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
    padding: 8px;
  }

  .mfg-btn {
    @extend %button;
    padding: 16px 8px;
  }
</style>

<script>
  import semver from "semver";

  import Section from "@/components/Section.svelte";

  import {
    API_VERSION_12_7,
    API_VERSION_12_8,
    API_VERSION_12_9,
    CONFIGURATOR,
  } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import motorState from "@/tabs/motors/state.svelte.js";

  import escState from "./state.svelte.js";

  // Firmware release that first shipped each MSP API version -- shown when a manufacturer's
  // ESC parameter support postdates the connected firmware (see minApiVersion per manufacturer).
  const FIRMWARE_RELEASE = {
    [API_VERSION_12_7]: "4.4.0",
    [API_VERSION_12_8]: "4.5.0",
    [API_VERSION_12_9]: "4.6.0",
  };

  // Logos converted from the Lua suite's app/gfx/esc_mfg_*.png into alpha masks, so they
  // can be tinted with the theme's text colour via CSS mask-image.
  const LOGOS = {
    am32: "am32",
    blheli_s: "blheli_s",
    bluejay: "bluejay",
    flrtr: "flyrotor",
    hw5: "hw5",
    omp: "omp",
    scorp: "scorpion",
    xdfly: "xdfly",
    yge: "yge",
    ztw: "ztw",
  };

  function select(manufacturer) {
    escState.selectManufacturer(manufacturer);
  }

  function firmwareTooOld(manufacturer) {
    return semver.lt(FC.CONFIG.apiVersion, manufacturer.minApiVersion);
  }

  // Matches the Lua suite's esc_protocol_guard.lua: a manufacturer is only selectable when
  // FC.ESC_SENSOR_CONFIG.protocol is one of its escSensorProtocolIds (same id space as the
  // Motors tab's telemetryProtocols index -- e.g. Scorpion=4, OMP=6, ZTW=7, YGE=9,
  // FlyRotor=10, XDFly=12). AM32/BLHeli_S/Bluejay share id 1 (BLHeli32), since telemetry
  // can't distinguish them. Protocol 0 (disabled) matches nothing, so every button is off.
  // Virtual mode skips the check, like the Lua guard does in simulation.
  let telemetryDisabled = $derived(
    !CONFIGURATOR.virtualMode && !FC.ESC_SENSOR_CONFIG.protocol,
  );

  function protocolMismatch(manufacturer) {
    if (CONFIGURATOR.virtualMode) return false;
    return !manufacturer.escSensorProtocolIds.includes(
      FC.ESC_SENSOR_CONFIG.protocol,
    );
  }

  function protocolNames(manufacturer) {
    return manufacturer.escSensorProtocolIds
      .map((id) => motorState.telemetryProtocols[id])
      .filter(Boolean)
      .join(" / ");
  }

  // Why a manufacturer can't be selected, or null when it can. Telemetry being disabled is
  // explained once above the grid, so those cards carry no per-card reason. Armed is
  // likewise reported at page level (EscProgramming.svelte).
  function unavailableReason(manufacturer) {
    if (firmwareTooOld(manufacturer)) {
      return $i18n.t("escProgrammingRequiresFirmware", {
        version: FIRMWARE_RELEASE[manufacturer.minApiVersion],
      });
    }
    if (telemetryDisabled) return "";
    if (protocolMismatch(manufacturer)) {
      return $i18n.t("escProgrammingRequiresTelemetry", {
        protocol: protocolNames(manufacturer),
      });
    }
    return null;
  }

  // Every manufacturer is shown; selectable ones first, each group in registry order.
  let cards = $derived.by(() => {
    const all = escState.manufacturers.map((manufacturer) => ({
      manufacturer,
      reason: unavailableReason(manufacturer),
    }));
    return [
      ...all.filter((c) => c.reason === null),
      ...all.filter((c) => c.reason !== null),
    ];
  });
</script>

<Section label="escProgrammingWarningTitle">
  <div class="callout warning">
    <i class="fas fa-exclamation-triangle"></i>
    <p>{$i18n.t("escProgrammingWarningBody")}</p>
  </div>
  <label class="acknowledge">
    <input type="checkbox" bind:checked={escState.acknowledgedWarning} />
    {$i18n.t("escProgrammingWarningAcknowledge")}
  </label>
</Section>

{#if escState.acknowledgedWarning}
  <Section label="escProgrammingSelectManufacturer">
    {#if telemetryDisabled}
      <div class="callout info">
        <i class="fas fa-info-circle"></i>
        <p>{$i18n.t("escProgrammingTelemetryDisabled")}</p>
      </div>
    {/if}
    <div class="grid">
      {#each cards as { manufacturer, reason } (manufacturer.id)}
        <button
          class="card"
          onclick={() => select(manufacturer)}
          disabled={escState.armed || reason !== null}
          title={reason || manufacturer.name}
        >
          <span
            class="logo"
            style:--logo="url('/images/esc_mfg/{LOGOS[manufacturer.id]}.png')"
          ></span>
          <span class="name">{manufacturer.name}</span>
          {#if reason}
            <span class="reason">{reason}</span>
          {/if}
        </button>
      {/each}
    </div>
  </Section>
{/if}

<style lang="scss">
  .callout {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 4px 4px 0;
    padding: 10px 12px;
    border-left: 4px solid;
    border-radius: 4px;

    i {
      margin-top: 2px;
    }

    p {
      margin: 0;
      line-height: 1.4;
    }

    &.warning {
      border-color: var(--color-yellow-500);
      background-color: color-mix(
        in srgb,
        var(--color-yellow-500) 14%,
        transparent
      );

      i {
        color: var(--color-yellow-500);
      }
    }

    &.info {
      border-color: var(--color-accent-500);
      background-color: color-mix(
        in srgb,
        var(--color-accent-500) 10%,
        transparent
      );

      i {
        color: var(--color-accent-500);
      }
    }
  }

  .acknowledge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 4px 4px;
    font-weight: 600;
    cursor: pointer;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 4px;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-height: 150px;
    padding: 16px 10px 12px;

    font: inherit;
    color: var(--color-text);
    background-color: var(--color-surface-float);
    border: 1px solid var(--color-border-soft);
    border-radius: 6px;
    cursor: pointer;
    transition:
      border-color var(--animation-speed),
      box-shadow var(--animation-speed),
      transform var(--animation-speed);

    &:hover:not(:disabled) {
      border-color: var(--color-border-accent);
      box-shadow: 0 4px 12px -4px var(--color-shadow);
      transform: translateY(-2px);
    }

    &:focus-visible {
      outline: 2px solid var(--color-border-accent);
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--color-text-disabled);

      .logo {
        opacity: 0.35;
      }
    }
  }

  .logo {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    background-color: currentColor;
    mask: var(--logo) center / contain no-repeat;
  }

  .name {
    font-weight: 600;
    font-size: 1.05em;
  }

  .reason {
    font-size: 0.85em;
    line-height: 1.3;
    text-align: center;
  }
</style>

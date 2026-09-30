<script>
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";

  let hardwareName = $derived(FC.getHardwareName());
  let showFirmware = $derived(
    FC.CONFIG.buildVersion && FC.CONFIG.flightControllerIdentifier,
  );
  let configuratorLabel = $derived(
    `${CONFIGURATOR.version} · ${CONFIGURATOR.buildLabel}`,
  );
  let firmwareLabel = $derived(
    `${FC.CONFIG.buildVersion} ${FC.CONFIG.flightControllerIdentifier}`,
  );
</script>

<div class="logo">
  <div class="logo-text">
    <span
      title={`${$i18n.t("versionLabelConfigurator")}: ${CONFIGURATOR.version} · Branch/tag: ${CONFIGURATOR.buildLabel}`}
    >
      Cfg {configuratorLabel}
    </span>
    {#if showFirmware}
      <span title={`${$i18n.t("versionLabelFirmware")}: ${firmwareLabel}`}>
        FW {firmwareLabel}
      </span>
    {/if}
    {#if hardwareName}
      <span title={`${$i18n.t("versionLabelTarget")}: ${hardwareName}`}>
        Target {hardwareName}
      </span>
    {/if}
  </div>
</div>

<style>
  .logo {
    height: 70px;
    width: 240px;
    background-image: url("/images/light-wide-2.svg");
    background-repeat: no-repeat;
    background-position: left center;
    background-size: 80%;
    position: relative;
    margin-top: -25px;
  }

  .logo-text {
    position: absolute;
    left: 80px;
    top: 49px;
    color: var(--chrome-fg-muted);
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
    width: 230px;
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }

  .logo-text span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media only screen and (max-width: 480px) {
    .logo {
      height: 24px;
      width: 150px;
      background-image: url("/images/light-wide-2-compact.svg");
      background-position: left center;
      order: 2;
      margin-top: 0;
    }

    .logo-text {
      display: none !important;
    }

    .logo {
      display: block;
      background-image: url("/images/light-wide-2.svg");
      background-repeat: no-repeat;
      background-position: center 20px;
      background-position-x: 12px;
      background-size: 80%;
      height: 120px;
      width: auto;
      margin-top: unset;
      position: relative;
      border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    }

    .logo .logo-text {
      display: flex !important;
      left: 82px;
      top: 62px;
      width: calc(100% - 92px);
    }
  }

  @media all and (min-width: 1125px) {
    .logo {
      width: 360px;
    }

    .logo-text {
      font-size: inherit;
      width: 270px;
    }
  }
</style>

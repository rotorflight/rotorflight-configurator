<script>
  import { i18n } from "@/js/i18n.js";
</script>

<div class="logo">
  <div class="logo-text">
    <span>
      {$i18n.t("versionLabelConfigurator")}: {CONFIGURATOR.version}
    </span>
    {#if FC.CONFIG.buildVersion && FC.CONFIG.flightControllerIdentifier}
      <span>
        {$i18n.t("versionLabelFirmware")}: {FC.CONFIG.buildVersion}
        {FC.CONFIG.flightControllerIdentifier}
      </span>
    {/if}
    {#if FC.CONFIG.hardwareName}
      <span>
        {$i18n.t("versionLabelTarget")}: {FC.CONFIG.hardwareName}
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
    color: #949494;
    opacity: 0.5;
    font-size: 10px;
    min-width: 210px;
    display: flex;
    flex-direction: column;
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
    }
  }

  @media all and (min-width: 1125px) {
    .logo {
      width: 340px;
    }

    .logo-text {
      font-size: inherit;
      position: relative;
    }
  }
</style>

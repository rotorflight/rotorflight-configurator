<script>
  import Field from "@/components/Field.svelte";
  import Page from "@/components/Page.svelte";
  import Section from "@/components/Section.svelte";
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";

  import { config } from "@/js/config.svelte.ts";
  import { cordovaUI } from "@/js/cordova_startup.js";
  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { checkForConfiguratorUpdates, setDarkTheme } from "@/js/main.js";

  const showCordovaOption = GUI.isCordova() && cordovaUI.canChangeUI;

  const timeoutOptions = [100, 500, 1000, 1500, 2500, 5000].map((v) => ({
    value: v,
    label: String(v),
  }));

  let darkThemeOptions = $derived([
    { value: 0, label: $i18n.t("on") },
    { value: 1, label: $i18n.t("off") },
    { value: 2, label: $i18n.t("auto") },
  ]);
</script>

{#snippet header()}
  <h1>{$i18n.t("tabOptions")}</h1>
{/snippet}

<Page {header}>
  <Section label="tabOptions">
    <Field
      id="opt-check-unstable-versions"
      label="checkForConfiguratorUnstableVersions"
    >
      <Switch
        id="opt-check-unstable-versions"
        bind:checked={config.checkForConfiguratorUnstableVersions}
        onchange={checkForConfiguratorUpdates}
      />
    </Field>
    <Field id="opt-remember-last-tab" label="rememberLastTab">
      <Switch
        id="opt-remember-last-tab"
        bind:checked={config.rememberLastTab}
      />
    </Field>
    <Field id="opt-remember-last-board" label="rememberLastSelectedBoard">
      <Switch
        id="opt-remember-last-board"
        bind:checked={config.rememberLastSelectedBoard}
      />
    </Field>
    <Field
      id="opt-show-advanced-firmware-opts"
      label="options.show_advanced_firmware_opts.label"
    >
      <Switch
        id="opt-show-advanced-firmware-opts"
        bind:checked={config.showAdvancedFirmwareOpts}
      />
    </Field>
    <Field id="opt-connection-timeout" label="connectionTimeout">
      <Select
        id="opt-connection-timeout"
        bind:value={config.connectionTimeout}
        options={timeoutOptions}
      />
    </Field>
    {#if showCordovaOption}
      <Field id="opt-cordova-force-computer-ui" label="cordovaForceComputerUI">
        <Switch
          id="opt-cordova-force-computer-ui"
          bind:checked={config.cordovaForceComputerUi}
          onchange={() => cordovaUI?.set?.()}
        />
      </Field>
    {/if}
    <Field id="opt-dark-theme" label="darkTheme">
      <Select
        id="opt-dark-theme"
        bind:value={config.darkTheme}
        options={darkThemeOptions}
        onchange={() => setDarkTheme(config.darkTheme)}
      />
    </Field>
  </Section>
</Page>

<style lang="scss">
  h1 {
    font-weight: 600;
  }
</style>

<script>
  import { onDestroy } from "svelte";

  import HelpIcon from "@/components/HelpIcon.svelte";
  import Section from "@/components/Section.svelte";

  import { FC } from "@/js/fc.svelte.js";
  import { i18n } from "@/js/i18n.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";

  import StorageBar from "./StorageBar.svelte";
  import { formatFilesizeKilobytes } from "./util.js";

  let { mscReady, onRebootMsc, showMsc } = $props();

  let pollInterval;

  const STATUS_KEYS = {
    [MSP.SDCARD_STATE_NOT_PRESENT]: "sdcardStatusNoCard",
    [MSP.SDCARD_STATE_CARD_INIT]: "sdcardStatusStarting",
    [MSP.SDCARD_STATE_FS_INIT]: "sdcardStatusFileSystem",
    [MSP.SDCARD_STATE_READY]: "sdcardStatusReady",
  };

  let fatalError = $derived(FC.SDCARD.state === MSP.SDCARD_STATE_FATAL);
  let statusText = $derived(
    (STATUS_KEYS[FC.SDCARD.state] && $i18n.t(STATUS_KEYS[FC.SDCARD.state])) ??
      $i18n.t("sdcardStatusUnknown", { 1: FC.SDCARD.state }),
  );

  let usedKB = $derived(FC.SDCARD.totalSizeKB - FC.SDCARD.freeSizeKB);

  if (FC.SDCARD.supported) {
    pollInterval = setInterval(() => {
      MSP.promise(MSPCodes.MSP_SDCARD_SUMMARY);
    }, 2000);
  }

  onDestroy(() => {
    clearInterval(pollInterval);
  });
</script>

{#if FC.SDCARD.supported}
  <Section>
    {#snippet header()}
      <div class="section-header">
        <span class="title">{$i18n.t("blackboxSDCardLogger")}</span>
        <div class="grow"></div>
        <HelpIcon>{$i18n.t("sdcardNote")}</HelpIcon>
      </div>
    {/snippet}

    {#if fatalError}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      <p class="status">{@html $i18n.t("sdcardStatusReboot")}</p>
    {:else}
      <p class="status">{statusText}</p>
    {/if}

    {#if FC.SDCARD.state === MSP.SDCARD_STATE_READY}
      <StorageBar
        used={usedKB}
        total={FC.SDCARD.totalSizeKB}
        usedLabel={$i18n.t("dataflashUnavSpace")}
        freeLabel={$i18n.t("dataflashLogsSpace")}
        formatFn={formatFilesizeKilobytes}
      />
    {/if}

    {#if showMsc}
      <div class="buttons">
        <button class="btn" disabled={!mscReady} onclick={onRebootMsc}>
          {$i18n.t("blackboxRebootMscText")}
        </button>
        <HelpIcon>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html $i18n.t("blackboxMscNote")}
          {#if !mscReady}
            <p>{$i18n.t("blackboxMscNotReady")}</p>
          {/if}
        </HelpIcon>
      </div>
    {/if}
  </Section>
{/if}

<style lang="scss">
  .btn {
    @extend %button;
  }

  .section-header {
    @extend %section-header;
    padding-right: 8px;
  }

  .title {
    padding-left: 8px;
    font-weight: 600;
  }

  .grow {
    flex-grow: 1;
  }

  .status {
    margin: 0 0 4px;
    font-weight: 600;
  }

  .buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>

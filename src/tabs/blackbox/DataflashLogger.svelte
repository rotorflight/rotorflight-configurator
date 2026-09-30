<script>
  import HelpIcon from "@/components/HelpIcon.svelte";
  import Section from "@/components/Section.svelte";

  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import * as filesystem from "@/js/filesystem.js";
  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { generateFilename } from "@/js/main.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { mspHelper } from "@/js/msp/MSPHelper.js";

  import StorageBar from "./StorageBar.svelte";
  import { formatFilesizeBytes } from "./util.js";

  let { mscReady, onRebootMsc, showMsc } = $props();

  const BLOCK_SIZE = 4096;
  const VCP_BLOCK_SIZE = 4096;

  let dataflashPresent = $derived(FC.DATAFLASH.totalSize > 0);

  let confirmEraseDialogEl;
  let erasing = $state(false);
  let eraseCancelled = false;

  let savingDialogEl;
  let savingProgress = $state(0);
  let savingDone = $state(false);
  let saveCancelled = false;

  function updateSummary(onDone) {
    MSP.send_message(MSPCodes.MSP_DATAFLASH_SUMMARY, false, false, () => {
      onDone?.();
    });
  }

  function askToEraseFlash() {
    eraseCancelled = false;
    erasing = false;
    confirmEraseDialogEl.showModal();
  }

  function pollForEraseCompletion() {
    updateSummary(() => {
      if (CONFIGURATOR.connectionValid && !eraseCancelled) {
        if (FC.DATAFLASH.ready) {
          confirmEraseDialogEl.close();
        } else {
          setTimeout(pollForEraseCompletion, 500);
        }
      }
    });
  }

  function confirmErase() {
    erasing = true;
    MSP.send_message(
      MSPCodes.MSP_DATAFLASH_ERASE,
      false,
      false,
      pollForEraseCompletion,
    );
  }

  function cancelErase() {
    eraseCancelled = true;
    confirmEraseDialogEl.close();
  }

  async function beginSave() {
    if (!GUI.connected_to) return;

    const blockSize = FC.boardHasVcp() ? VCP_BLOCK_SIZE : BLOCK_SIZE;

    updateSummary(async () => {
      const maxBytes = FC.DATAFLASH.usedSize;

      const writer = await filesystem.getWriteStream({
        suggestedName: generateFilename("BLACKBOX_LOG", "BBL"),
        description: "BBL files",
        mimeType: "application/octet-stream",
      });
      if (!writer) return;

      let nextAddress = 0;
      let totalBytesCompressed = 0;

      saveCancelled = false;
      savingProgress = 0;
      savingDone = false;
      savingDialogEl.showModal();

      async function dismiss() {
        await writer.close();
        savingDialogEl.close();
      }

      async function done() {
        await writer.close();
        savingDone = true;
      }

      async function onChunkRead(_, chunkDataView, bytesCompressed) {
        if (!chunkDataView) {
          mspHelper.dataflashRead(nextAddress, blockSize, onChunkRead);
          return;
        }

        if (chunkDataView.byteLength === 0) {
          return await done();
        }

        nextAddress += chunkDataView.byteLength;
        if (isNaN(bytesCompressed) || isNaN(totalBytesCompressed)) {
          totalBytesCompressed = null;
        } else {
          totalBytesCompressed += bytesCompressed;
        }

        savingProgress = (nextAddress / maxBytes) * 100;

        const blob = new Blob([chunkDataView]);
        try {
          await writer.write(blob);

          if (saveCancelled) {
            await dismiss();
          } else if (nextAddress >= maxBytes) {
            await done();
          } else {
            mspHelper.dataflashRead(nextAddress, blockSize, onChunkRead);
          }
        } catch (err) {
          console.log(err);
          await dismiss();
        }
      }

      mspHelper.dataflashRead(nextAddress, blockSize, onChunkRead);
    });
  }

  function cancelSave() {
    saveCancelled = true;
  }

  function dismissSaveDialog() {
    savingDialogEl.close();
  }
</script>

{#if FC.DATAFLASH.supported}
  <Section>
    {#snippet header()}
      <div class="section-header">
        <span class="title">{$i18n.t("blackboxFlashLogger")}</span>
        <div class="grow"></div>
        <HelpIcon>{$i18n.t("dataflashNote")}</HelpIcon>
      </div>
    {/snippet}

    {#if dataflashPresent}
      <StorageBar
        used={FC.DATAFLASH.usedSize}
        total={FC.DATAFLASH.totalSize}
        usedLabel={$i18n.t("dataflashUsedSpace")}
        freeLabel={$i18n.t("dataflashFreeSpace")}
        formatFn={formatFilesizeBytes}
      />

      <div class="buttons">
        <button
          class="btn"
          disabled={FC.DATAFLASH.usedSize === 0}
          onclick={askToEraseFlash}
        >
          {$i18n.t("dataflashButtonErase")}
        </button>
        <button
          class="btn"
          disabled={FC.DATAFLASH.usedSize === 0}
          onclick={beginSave}
        >
          {$i18n.t("dataflashButtonSaveFile")}
        </button>
        <HelpIcon>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html $i18n.t("dataflashSavetoFileNote")}
        </HelpIcon>

        {#if showMsc}
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
        {/if}
      </div>
    {:else}
      <p class="note">{$i18n.t("dataflashNotPresentNote")}</p>
    {/if}
  </Section>
{/if}

<dialog bind:this={confirmEraseDialogEl}>
  <h3>{$i18n.t("dataflashConfirmEraseTitle")}</h3>
  <div class="content">
    {#if erasing}
      <p>{$i18n.t("blackboxEraseInProgress")}</p>
    {:else}
      <p>{$i18n.t("dataflashConfirmEraseNote")}</p>
    {/if}
  </div>
  <div class="buttons">
    {#if !erasing}
      <button class="btn" onclick={confirmErase}>
        {$i18n.t("dataflashButtonEraseConfirm")}
      </button>
      <button class="btn" onclick={cancelErase}>
        {$i18n.t("dataflashButtonEraseCancel")}
      </button>
    {/if}
  </div>
</dialog>

<dialog bind:this={savingDialogEl}>
  <h3>{$i18n.t("dataflashSavingTitle")}</h3>
  {#if !savingDone}
    <div class="content">
      <div>{$i18n.t("dataflashSavingNote")}</div>
      <progress value={savingProgress} min="0" max="100"></progress>
    </div>
    <div class="buttons">
      <button class="btn" onclick={cancelSave}>
        {$i18n.t("dataflashButtonSaveCancel")}
      </button>
    </div>
  {:else}
    <div class="content">
      <div>{$i18n.t("dataflashSavingNoteAfter")}</div>
    </div>
    <div class="buttons">
      <button class="btn" onclick={dismissSaveDialog}>
        {$i18n.t("dataflashButtonSaveDismiss")}
      </button>
    </div>
  {/if}
</dialog>

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

  .note {
    margin: 0;
    padding: 8px 12px;
    border-radius: var(--radius-sm);

    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-accent);
  }

  .buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  dialog {
    width: 32em;
    border-radius: var(--radius-lg);
  }

  dialog .buttons {
    justify-content: flex-end;
    margin-top: 1.5em;
  }

  dialog h3 {
    margin-bottom: 0.5em;
  }

  progress {
    width: 100%;
    height: 20px;
    margin-top: 8px;
  }
</style>

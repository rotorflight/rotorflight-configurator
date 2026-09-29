<script>
  import * as marked from "marked";
  import { onDestroy, onMount } from "svelte";

  import HelpIcon from "@/components/HelpIcon.svelte";
  import Page from "@/components/Page.svelte";
  import Select from "@/components/Select.svelte";
  import Switch from "@/components/Switch.svelte";

  import { ConfigInserter } from "@/js/ConfigInserter.js";
  import { FirmwareCache } from "@/js/FirmwareCache.js";
  import * as github from "@/js/GitHubApi.js";
  import { config } from "@/js/config.svelte.ts";
  import { CONFIGURATOR } from "@/js/configurator.svelte.js";
  import { FC } from "@/js/fc.svelte.js";
  import { readTextFile, writeTextFile } from "@/js/filesystem.js";
  import { GUI } from "@/js/gui.js";
  import { i18n } from "@/js/i18n.js";
  import { getIntegerValue } from "@/js/main.js";
  import { manufacturers } from "@/js/manufacturers.js";
  import { MSP } from "@/js/msp.svelte.js";
  import { MSPCodes } from "@/js/msp/MSPCodes.js";
  import { MspHelper } from "@/js/msp/MSPHelper.js";
  import { usbDevices } from "@/js/port_handler.js";
  import { STM32 } from "@/js/protocols/stm32.js";
  import { STM32DFU } from "@/js/protocols/stm32usbdfu.js";
  import { ReleaseChecker } from "@/js/release_checker.js";
  import { serial } from "@/js/serial.js";

  import DfuPermissionPrompt from "./DfuPermissionPrompt.svelte";
  import {
    FLASH_MESSAGE_TYPES,
    flashState,
    setFlashProgress,
    setFlashingEnabled,
    setFlashingMessage,
  } from "./state.svelte.js";
  import {
    buildTargetsByManufacturer,
    cleanUnifiedConfigFile,
    grabBuildNameFromConfig,
    grabKeywordFromConfig,
    hasUnifiedTargetBuild,
    injectDefaultDesign,
    injectTargetInfo,
    parseHex,
    parseUnifiedTargets,
    populateBuilds,
    processBoardOptions,
    versionOptions,
  } from "./util.js";

  const releaseChecker = new ReleaseChecker(
    "firmware",
    "https://api.github.com/repos/rotorflight/rotorflight-firmware/releases",
  );

  const BUILD_TYPES = [
    { tag: "firmwareFlasherOptionLabelBuildTypeRelease", level: 0 },
    { tag: "firmwareFlasherOptionLabelBuildTypePreRelease", level: 1 },
    { tag: "firmwareFlasherOptionLabelBuildTypeDevelopment", level: 2 },
  ];

  let buildTypeIndex = $state(0);
  let releases = $state({});
  let unifiedConfigs = $state({});
  let bareBoard = $state(undefined);

  let selectedBoard = $state("0");
  let boardsLoading = $state(true);
  let selectedVersion = $state("0");
  let versionsLoading = $state(false);
  let firmwareVersionEntries = $state([]);

  const showAdvancedOpts = config.showAdvancedFirmwareOpts;
  let showLegacyTargets = $state(
    showAdvancedOpts ? config.showLegacyTargets : false,
  );
  let eraseChip = $state(showAdvancedOpts ? config.eraseChip : true);

  let localFirmwareLoaded = $state(false);
  let intelHex;
  let parsedHex = $state(null);
  let unifiedTarget = $state({});
  let isConfigLocal = $state(false);
  let boardDetectionInProgress = $state(false);
  let loadingRemote = $state(false);

  let releaseInfoVisible = $state(false);
  let releaseInfo = $state(null);
  let releaseNotesHtml = $state("");

  let portIsDfu = $state(false);
  let portSelected = $state(false);

  let detectDialogEl;
  let detectDialogTitle = $state("");
  let detectDialogContent = $state("");

  let detectTimer;
  let detectConnectDelayTimer;
  let detectMspHelper;

  let boardGroups = $derived(
    buildTargetsByManufacturer(
      unifiedConfigs,
      showLegacyTargets,
      selectedBoard,
    ),
  );

  onMount(() => {
    FirmwareCache.load();
    FirmwareCache.onPutToCache(onCacheUpdate);
    FirmwareCache.onRemoveFromCache(onCacheUpdate);

    setFlashingMessage(
      $i18n.t("firmwareFlasherLoadFirmwareFile"),
      FLASH_MESSAGE_TYPES.NEUTRAL,
    );

    portPickerElement().addEventListener("change", onPortChange);
    onPortChange();

    document.addEventListener("keypress", onKeypress);

    chrome.storage.local.get("selected_build_type", (result) => {
      buildTypeIndex = result.selected_build_type ?? 0;
      loadBuildType(buildTypeIndex);
    });
  });

  onDestroy(() => {
    portPickerElement()?.removeEventListener("change", onPortChange);
    document.removeEventListener("keypress", onKeypress);
    clearTimeout(detectTimer);
    clearTimeout(detectConnectDelayTimer);
  });

  function onCacheUpdate(release) {
    for (const entry of firmwareVersionEntries) {
      if (entry.summary?.file === release.file) {
        entry.cached = FirmwareCache.has(release);
      }
    }
  }

  function portPickerElement() {
    return document.querySelector("div#port-picker #port");
  }

  function onPortChange() {
    const el = portPickerElement();
    const selected = el?.options?.[el.selectedIndex];
    portIsDfu = !!selected?.dataset?.isDfu || !!selected?.isDFU;
    portSelected = !!el && String(el.value) !== "0";
  }

  function onKeypress(e) {
    if (e.which === 13 || e.key === "Enter") {
      onClickFlash();
    }
  }

  function loadBuildType(index) {
    chrome.storage.local.set({ selected_build_type: index });
    if (GUI.connect_lock) return;

    unifiedConfigs = {};
    boardsLoading = true;
    releaseChecker.loadReleaseData((releaseData) =>
      onReleaseData(releaseData ?? [], BUILD_TYPES[index].level),
    );
  }

  function onBuildTypeChange(index) {
    buildTypeIndex = Number(index);
    selectedBoard = "0";
    firmwareVersionEntries = [];
    selectedVersion = "0";
    loadBuildType(buildTypeIndex);
  }

  async function onReleaseData(releaseData, buildLevel) {
    const builds = processBoardOptions(
      releaseData,
      buildLevel,
      CONFIGURATOR.FW_VERSION_MIN_SUPPORTED,
      CONFIGURATOR.FW_VERSION_MAX_SUPPORTED,
    );

    if (hasUnifiedTargetBuild(builds)) {
      await loadUnifiedBuilds(builds);
    } else {
      releases = builds;
      boardsLoading = false;
    }
  }

  async function getCachedUnifiedTargets() {
    const { unifiedSourceCache } = await new Promise((resolve) =>
      chrome.storage.local.get("unifiedSourceCache", resolve),
    );
    if (
      !unifiedSourceCache?.supportedTargets &&
      !unifiedSourceCache?.legacyTargets
    )
      return;
    return unifiedSourceCache;
  }

  async function loadUnifiedBuilds(builds) {
    const expirationPeriod = 3600 * 2;
    const now = Math.floor(Date.now() / 1000);

    const cache = await getCachedUnifiedTargets();
    const cacheAge = now - (cache?.lastUpdate ?? 0);

    let supportedTargets = cache?.supportedTargets;
    let legacyTargets = cache?.legacyTargets;

    if (cacheAge > expirationPeriod) {
      try {
        supportedTargets = await github.getContents(
          "rotorflight/rotorflight-targets",
          "rotorflight",
          "configs",
        );
        legacyTargets = await github.getContents(
          "rotorflight/rotorflight-targets",
          "rotorflight",
          "legacy",
        );

        await new Promise((resolve) =>
          chrome.storage.local.set(
            {
              unifiedSourceCache: {
                lastUpdate: now,
                supportedTargets,
                legacyTargets,
              },
            },
            resolve,
          ),
        );
      } catch (err) {
        console.log("Fetching unified targets failed", err);
      }
    }

    if (!supportedTargets || !legacyTargets) {
      boardsLoading = false;
      return;
    }

    const targets = [
      ...supportedTargets.map((x) => ({ ...x, supported: true })),
      ...legacyTargets.map((x) => ({ ...x, supported: false })),
    ];

    const parsed = parseUnifiedTargets(targets, builds);
    releases = parsed.releases;
    unifiedConfigs = parsed.unifiedConfigs;
    boardsLoading = false;

    let initialBoard;
    if (config.rememberLastSelectedBoard) {
      initialBoard = config.selectedBoard;
    }
    if (initialBoard && unifiedConfigs[initialBoard]) {
      selectedBoard = initialBoard;
      await onBoardChange(initialBoard);
    }
  }

  function clearBufferedFirmware() {
    isConfigLocal = false;
    unifiedTarget = {};
    intelHex = undefined;
    parsedHex = null;
    localFirmwareLoaded = false;
  }

  async function onBoardChange(target) {
    if (GUI.connect_lock && !boardDetectionInProgress) return;

    if (selectedBoard !== target && isConfigLocal) {
      isConfigLocal = false;
      unifiedTarget = {};
    }

    if (config.rememberLastSelectedBoard) {
      config.selectedBoard = target;
    }
    selectedBoard = target;
    bareBoard = undefined;

    setFlashingMessage(
      $i18n.t("firmwareFlasherLoadFirmwareFile"),
      FLASH_MESSAGE_TYPES.NEUTRAL,
    );
    setFlashProgress(0);
    releaseInfoVisible = false;

    if (!localFirmwareLoaded) setFlashingEnabled(false);

    if (target === "0") {
      clearBufferedFirmware();
      firmwareVersionEntries = [];
      selectedVersion = "0";
      return;
    }

    versionsLoading = true;
    firmwareVersionEntries = [];
    selectedVersion = "0";

    const builds = {};
    const targetSpec = unifiedConfigs[target];

    if (targetSpec) {
      const expirationPeriod = 3600 * 2;
      const now = Math.floor(Date.now() / 1000);

      const { unifiedConfigLast } = await new Promise((resolve) =>
        chrome.storage.local.get("unifiedConfigLast", resolve),
      );
      const cacheAge = now - (unifiedConfigLast?.lastUpdate ?? 0);

      if (
        unifiedConfigLast?.targetId !== targetSpec.target ||
        cacheAge > expirationPeriod
      ) {
        try {
          const res = await fetch(targetSpec.download_url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          let cfg = await res.text();
          cfg = cleanUnifiedConfigFile(cfg);
          if (!cfg) throw new Error("Invalid config");

          const bare = grabBuildNameFromConfig(cfg);
          bareBoard = bare;

          const commit = targetSpec.supported
            ? await github.getFileLastCommitInfo(
                "rotorflight/rotorflight-targets",
                "rotorflight",
                targetSpec.path,
              )
            : await github.getFileLastCommitInfo(
                "rotorflight/rotorflight-targets",
                "rotorflight",
                targetSpec.path,
              );
          cfg = injectDefaultDesign(cfg, "BTFL");
          cfg = injectTargetInfo(
            cfg,
            targetSpec.name,
            target,
            targetSpec.manufacturer,
            commit,
          );

          setUnifiedConfig(
            target,
            bare,
            cfg,
            targetSpec.manufacturer,
            targetSpec.name,
            targetSpec.download_url,
            commit.date,
          );
          await new Promise((resolve) =>
            chrome.storage.local.set(
              {
                unifiedConfigLast: {
                  unifiedTarget,
                  targetId: targetSpec.target,
                  lastUpdate: now,
                },
              },
              resolve,
            ),
          );
        } catch (err) {
          console.log("Failed to fetch target config", err);
          unifiedTarget = {};
          isConfigLocal = false;
          GUI.log(
            $i18n.t("firmwareFlasherFailedToLoadUnifiedConfig", {
              remote_file: targetSpec.download_url,
            }),
          );
        }
      } else {
        const cached = unifiedConfigLast.unifiedTarget;
        const bare = grabBuildNameFromConfig(cached?.config ?? "");
        bareBoard = bare;
        unifiedTarget = target === bare ? {} : cached;
      }

      populateBuilds(builds, targetSpec.manufacturer, releases[bareBoard]);
    } else {
      unifiedTarget = {};
    }

    if (releases[target]) {
      bareBoard = target;
      populateBuilds(builds, undefined, releases[target]);
    }

    firmwareVersionEntries = versionOptions(builds, (key, opts) =>
      $i18n.t(key, opts),
    );
    versionsLoading = false;

    // Assume flashing latest, so default to it.
    if (firmwareVersionEntries.length > 0) {
      selectedVersion = firmwareVersionEntries[0].value;
      onVersionChange(selectedVersion);
    }
  }

  function setUnifiedConfig(
    target,
    bareBoardName,
    targetConfig,
    manufacturerId,
    fileName,
    fileUrl,
    date,
  ) {
    if (bareBoardName === target) {
      unifiedTarget = {};
    } else {
      unifiedTarget = {
        config: targetConfig,
        manufacturerId,
        fileName,
        fileUrl,
        date,
      };
      isConfigLocal = false;
    }
  }

  function selectedVersionEntry() {
    return firmwareVersionEntries.find((e) => e.value === selectedVersion);
  }

  function onVersionChange(value) {
    selectedVersion = value;
    releaseInfoVisible = false;

    if (!localFirmwareLoaded) {
      setFlashingEnabled(false);
      setFlashingMessage(
        $i18n.t("firmwareFlasherLoadFirmwareFile"),
        FLASH_MESSAGE_TYPES.NEUTRAL,
      );
      if (parsedHex?.bytes_total) {
        intelHex = undefined;
        parsedHex = null;
      }
    }

    const entry = selectedVersionEntry();
    const release = entry?.summary;
    const isCached = release && FirmwareCache.has(release);
    if (value === "0" || isCached) {
      if (isCached) {
        FirmwareCache.get(release, (cached) =>
          onLoadSuccess(cached.hexdata, release),
        );
      }
    }
  }

  async function processHex(data, summary) {
    intelHex = data;
    const parsed = await parseHex(intelHex);
    parsedHex = parsed;

    if (parsed) {
      if (!FirmwareCache.has(summary)) {
        FirmwareCache.put(summary, intelHex);
      }
      showLoadedHex(summary);
    } else {
      setFlashingMessage(
        $i18n.t("firmwareFlasherHexCorrupted"),
        FLASH_MESSAGE_TYPES.INVALID,
      );
    }
  }

  async function onLoadSuccess(data, summary) {
    localFirmwareLoaded = false;
    const release =
      typeof summary === "object" ? summary : selectedVersionEntry()?.summary;
    await processHex(data, release);
    loadingRemote = false;
  }

  function showLoadedHex(summary) {
    flashState.message = $i18n.t("firmwareFlasherFirmwareOnlineLoaded", {
      1: parsedHex.bytes_total,
    });
    flashState.messageType = FLASH_MESSAGE_TYPES.NEUTRAL;
    flashState.showSaveLink = true;
    setFlashingEnabled(true);

    releaseInfo = {
      manufacturer: unifiedTarget.manufacturerId,
      target: selectedBoard,
      version: summary.version,
      versionUrl: summary.releaseUrl,
      date: summary.date,
      file: summary.file,
      fileUrl: summary.url,
      unifiedTargetFile: unifiedTarget.fileName,
      unifiedTargetFileUrl: unifiedTarget.fileUrl,
      unifiedTargetDate: unifiedTarget.date,
      hasUnifiedTarget: Object.keys(unifiedTarget).length > 0,
    };
    releaseNotesHtml = marked.parse(summary.notes ?? "");
    releaseInfoVisible = true;
  }

  async function onClickLoadLocal() {
    setFlashingEnabled(false);

    const file = await readTextFile({
      description: "Firmware/Target",
      extensions: [".hex", ".config"],
    });
    if (!file) return;

    if (file.name.endsWith(".hex")) {
      intelHex = file.content;
      parsedHex = await parseHex(intelHex);

      if (parsedHex) {
        localFirmwareLoaded = true;
        flashingMessageLocal();
      } else {
        setFlashingMessage(
          $i18n.t("firmwareFlasherHexCorrupted"),
          FLASH_MESSAGE_TYPES.INVALID,
        );
      }
    } else {
      clearBufferedFirmware();

      let cfg = cleanUnifiedConfigFile(file.content);
      if (cfg !== null) {
        const manufac = grabKeywordFromConfig(cfg, "manufacturer_id", "NONE");
        const target = grabKeywordFromConfig(cfg, "board_name", "NONE");
        cfg = injectDefaultDesign(cfg, "BTFL");
        cfg = injectTargetInfo(cfg, file.name, target, manufac, {
          commitHash: "unknown",
          date: file.lastModified?.toISOString?.() ?? new Date().toISOString(),
        });
        unifiedTarget = { ...unifiedTarget, config: cfg, fileName: file.name };
        isConfigLocal = true;
        flashingMessageLocal();
      }
    }
  }

  function flashingMessageLocal() {
    if (isConfigLocal && !parsedHex) {
      setFlashingMessage(
        $i18n.t("firmwareFlasherLoadedConfig"),
        FLASH_MESSAGE_TYPES.NEUTRAL,
      );
    }
    if (isConfigLocal && parsedHex && !localFirmwareLoaded) {
      setFlashingEnabled(true);
      setFlashingMessage(
        $i18n.t("firmwareFlasherFirmwareLocalLoaded", {
          1: parsedHex.bytes_total,
        }),
        FLASH_MESSAGE_TYPES.NEUTRAL,
      );
    }
    if (localFirmwareLoaded) {
      setFlashingEnabled(true);
      setFlashingMessage(
        $i18n.t("firmwareFlasherFirmwareLocalLoaded", {
          1: parsedHex.bytes_total,
        }),
        FLASH_MESSAGE_TYPES.NEUTRAL,
      );
    }
  }

  async function onClickLoadRemote() {
    setFlashingEnabled(false);
    localFirmwareLoaded = false;

    if (selectedVersion === "0") {
      GUI.log($i18n.t("firmwareFlasherNoFirmwareSelected"));
      return;
    }

    const summary = selectedVersionEntry()?.summary;
    if (!summary) {
      setFlashingMessage(
        $i18n.t("firmwareFlasherFailedToLoadOnlineFirmware"),
        FLASH_MESSAGE_TYPES.INVALID,
      );
      return;
    }

    if (isConfigLocal && FirmwareCache.has(summary)) {
      FirmwareCache.get(summary, (cached) =>
        onLoadSuccess(cached.hexdata, summary),
      );
      return;
    }

    loadingRemote = true;
    try {
      const res = await fetch(summary.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.text();
      await onLoadSuccess(data, summary);
    } catch (err) {
      console.log("Failed to download firmware", err);
      loadingRemote = false;
      setFlashingMessage(
        $i18n.t("firmwareFlasherFailedToLoadOnlineFirmware"),
        FLASH_MESSAGE_TYPES.INVALID,
      );
    }
  }

  function onClickExitDfu() {
    if (GUI.connect_lock) return;
    try {
      STM32DFU.connect(usbDevices, parsedHex, { exitDfu: true });
    } catch (e) {
      console.log(`Exiting DFU failed: ${e.message}`);
    }
  }

  function flashFirmware(firmware) {
    const options = {
      no_reboot: false,
      erase_chip: eraseChip,
      baud: getIntegerValue("select#baud") ?? 115200,
    };

    if (!portIsDfu) {
      const el = portPickerElement();
      if (el && String(el.value) !== "0") {
        STM32.connect(String(el.value), options.baud, firmware, options);
      } else {
        GUI.log($i18n.t("firmwareFlasherNoValidPort"));
      }
    } else {
      GUI.connect_lock = true;
      STM32DFU.connect(usbDevices, firmware, options);
    }
  }

  function onClickFlash() {
    if (GUI.connect_lock) return;
    if (!parsedHex) {
      flashState.message = $i18n.t("firmwareFlasherFirmwareNotLoaded");
      flashState.messageType = FLASH_MESSAGE_TYPES.NEUTRAL;
      return;
    }

    try {
      if (unifiedTarget.config && !parsedHex.configInserted) {
        const configInserter = new ConfigInserter();
        if (configInserter.insertConfig(parsedHex, unifiedTarget.config)) {
          parsedHex.configInserted = true;
        } else {
          console.log("Firmware does not support custom defaults.");
          unifiedTarget = {};
        }
      }

      flashFirmware(parsedHex);
      GUI.saveDefaultTab("status");
    } catch (e) {
      console.log(`Flashing failed: ${e.message}`);
    }
  }

  async function onClickDetectBoard() {
    if (GUI.connect_lock || portIsDfu || !portSelected) return;

    const isLoaded = releases ? Object.keys(releases).length > 0 : false;
    if (!isLoaded) {
      GUI.log($i18n.t("firmwareFlasherNoBoardsLoaded"));
      return;
    }

    if (serial.connected || serial.connectionId) {
      serial.disconnect();
      return;
    }

    setFlashingEnabled(false);
    GUI.connect_lock = true;
    boardDetectionInProgress = true;

    GUI.log($i18n.t("firmwareFlasherBoardDetectionInProgress"));
    detectTimer = setTimeout(() => {
      GUI.log($i18n.t("firmwareFlasherBoardDetectionFail"));
      disconnectDetect();
    }, 8000);

    const el = portPickerElement();
    const port = String(el.value);
    const baud = getIntegerValue("select#baud") ?? 115200;

    // If we just got here from a connected session, navigating to this tab
    // forces a disconnect first -- give the board/USB stack a brief moment to
    // settle before reopening the same port and querying it. Without this,
    // reconnecting immediately can get no response back in time (see
    // handleConnectClick()'s disconnect branch, which now awaits the actual
    // port close, but the board itself may still need a moment to be ready).
    detectConnectDelayTimer = setTimeout(() => {
      serial.connect(port, { bitrate: baud }, onDetectConnect);
    }, 300);
  }

  function onDetectConnect(openInfo) {
    if (openInfo) {
      GUI.log(
        $i18n.t("serialPortOpened", [
          serial.connectionType === "serial"
            ? serial.connectionId
            : openInfo.socketId,
        ]),
      );
      serial.onReceive.addListener((info) => MSP.read(info));

      detectMspHelper = new MspHelper();
      MSP.listen(detectMspHelper.process_data.bind(detectMspHelper));

      getBoardInfo();
    } else {
      clearTimeout(detectTimer);
      GUI.log(
        `${$i18n.t("firmwareFlasherBoardDetectionFail")}: ${$i18n.t("serialPortOpenFail")}`,
      );
      disconnectDetect();
    }
  }

  async function getBoardInfo() {
    await MSP.promise(MSPCodes.MSP_BOARD_INFO);
    handleDetectResponse();
  }

  async function handleDetectResponse() {
    let board = FC.CONFIG.boardName;
    if (!board) return;

    clearTimeout(detectTimer);

    if (board.includes(".")) {
      const newBoardName = board.replace(".", "_");
      GUI.log(
        $i18n.t("dialogBoardDetectionMessageInvalidBoardNameContent", [
          board,
          newBoardName,
        ]),
      );
      openDetectDialog(
        $i18n.t("dialogBoardDetectionMessageInvalidBoardNameTitle"),
        $i18n.t("dialogBoardDetectionMessageInvalidBoardNameContent", [
          board,
          newBoardName,
        ]) +
          "<br />" +
          $i18n.t("dialogBoardDetectionMessageInvalidBoardNameRecommendation"),
      );
      board = newBoardName;
    }

    const target = `${FC.CONFIG.manufacturerId}-${board}`;
    const targetAvailable = !!unifiedConfigs[target];
    selectedBoard = target;
    await onBoardChange(target);

    GUI.log(
      $i18n.t(
        targetAvailable
          ? "firmwareFlasherBoardDetectionSucceeded"
          : "firmwareFlasherBoardDetectionBoardNotFound",
        { boardName: board },
      ),
    );
    disconnectDetect();
  }

  function disconnectDetect() {
    clearTimeout(detectConnectDelayTimer);
    serial.disconnect(onDetectClose);
    MSP.disconnect_cleanup();
    setFlashingEnabled(true);
    boardDetectionInProgress = false;
    GUI.connect_lock = false;
  }

  function onDetectClose(result) {
    GUI.log($i18n.t(result ? "serialPortClosedOk" : "serialPortClosedFail"));
    MSP.clearListeners();
  }

  function openDetectDialog(title, content) {
    detectDialogTitle = title;
    detectDialogContent = content;
    detectDialogEl.showModal();
  }

  function onSaveFirmware() {
    const summary = selectedVersionEntry()?.summary;
    writeTextFile(intelHex, {
      suggestedName: summary?.file ?? "firmware.hex",
      description: "Rotorflight Firmware (.hex)",
    }).catch((err) => console.log("Error saving firmware file", err));
  }

  function onEraseChipChange(checked) {
    eraseChip = checked;
    config.eraseChip = checked;
  }

  function onShowLegacyChange(checked) {
    showLegacyTargets = checked;
    config.showLegacyTargets = checked;
  }

  let messageClass = $derived(
    {
      [FLASH_MESSAGE_TYPES.VALID]: "valid",
      [FLASH_MESSAGE_TYPES.INVALID]: "invalid",
      [FLASH_MESSAGE_TYPES.ACTION]: "actionRequired",
    }[flashState.messageType] ?? "",
  );
</script>

{#snippet header()}
  <h1>{$i18n.t("tabFirmwareFlasher")}</h1>
{/snippet}

{#snippet toolbar()}
  <div class="progress-info">
    <progress class="progress" value={flashState.progress} min="0" max="100"
    ></progress>
    <span class="progress-label {messageClass}">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html flashState.message}
      {#if flashState.showSaveLink}
        <button class="save-link" onclick={onSaveFirmware}>
          {$i18n.t("firmwareFlasherButtonLoadOnline")}
        </button>
      {/if}
    </span>
    <DfuPermissionPrompt />
  </div>
  <button
    class="btn"
    disabled={portIsDfu === false && !parsedHex}
    onclick={onClickExitDfu}
  >
    <span class="label-full">{$i18n.t("firmwareFlasherExitDfu")}</span>
    <span class="label-short">{$i18n.t("firmwareFlasherExitDfuShort")}</span>
  </button>
  <button
    class="btn"
    disabled={!flashState.flashingEnabled}
    onclick={onClickFlash}
  >
    <span class="label-full">{$i18n.t("firmwareFlasherFlashFirmware")}</span>
    <span class="label-short"
      >{$i18n.t("firmwareFlasherFlashFirmwareShort")}</span
    >
  </button>
  <button
    class="btn"
    disabled={selectedVersion === "0" || loadingRemote}
    onclick={onClickLoadRemote}
  >
    {#if loadingRemote}
      {$i18n.t("firmwareFlasherButtonDownloading")}
    {:else}
      <span class="label-full"
        >{$i18n.t("firmwareFlasherButtonLoadOnline")}</span
      >
      <span class="label-short"
        >{$i18n.t("firmwareFlasherButtonLoadOnlineShort")}</span
      >
    {/if}
  </button>
  <button class="btn" onclick={onClickLoadLocal}>
    <span class="label-full">{$i18n.t("firmwareFlasherButtonLoadLocal")}</span>
    <span class="label-short"
      >{$i18n.t("firmwareFlasherButtonLoadLocalShort")}</span
    >
  </button>
{/snippet}

<Page {header} {toolbar}>
  <div class="options">
    <div class="field">
      <Select
        value={buildTypeIndex}
        options={BUILD_TYPES.map((b, i) => ({
          value: i,
          label: $i18n.t(b.tag),
        }))}
        onchange={(e) => onBuildTypeChange(e.target.value)}
      />
      <span class="description"
        >{$i18n.t("firmwareFlasherOnlineSelectBuildType")}</span
      >
    </div>

    <div class="field">
      <div class="board-select-flex">
        {#if boardsLoading}
          <Select
            value="0"
            options={[
              { value: "0", label: $i18n.t("firmwareFlasherOptionLoading") },
            ]}
            disabled
          />
        {:else}
          <select
            class="board-select"
            value={selectedBoard}
            onchange={(e) => onBoardChange(e.target.value)}
          >
            <option value="0"
              >{$i18n.t("firmwareFlasherOptionLabelSelectBoard")}</option
            >
            {#each boardGroups as group (group.manufacturerId)}
              <optgroup
                label={manufacturers[group.manufacturerId]?.name ??
                  group.manufacturerId}
              >
                {#each group.boards as board (board.target)}
                  <option value={board.target}>{board.board}</option>
                {/each}
              </optgroup>
            {/each}
          </select>
        {/if}
        <button
          class="detect-board"
          disabled={portIsDfu || !portSelected}
          onclick={onClickDetectBoard}
        >
          <span>{$i18n.t("firmwareFlasherBoardDetectionButton")}</span>
          <em class="fas fa-search"></em>
        </button>
      </div>
      <div class="description-row">
        <span class="description"
          >{$i18n.t("firmwareFlasherOnlineSelectBoardDescription")}</span
        >
        <HelpIcon>
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html $i18n.t("firmwareFlasherOnlineSelectBoardHint")}
        </HelpIcon>
      </div>
    </div>

    <div class="field">
      <Select
        value={selectedVersion}
        options={[
          {
            value: "0",
            label: versionsLoading
              ? $i18n.t("firmwareFlasherOptionLoading")
              : `${$i18n.t("firmwareFlasherOptionLabelSelectFirmwareVersionFor")} ${bareBoard ?? ""}`,
          },
          ...firmwareVersionEntries,
        ]}
        onchange={(e) => onVersionChange(e.target.value)}
      />
      <span class="description"
        >{$i18n.t(
          "firmwareFlasherOnlineSelectFirmwareVersionDescription",
        )}</span
      >
    </div>

    {#if showAdvancedOpts}
      <div class="field">
        <label>
          <Switch
            checked={showLegacyTargets}
            onchange={(e) => onShowLegacyChange(e.target.checked)}
          />
          <span>{$i18n.t("firmware_flasher.show_legacy_targets.label")}</span>
        </label>
        <span class="description"
          >{$i18n.t("firmware_flasher.show_legacy_targets.description")}</span
        >
      </div>
      <div class="field">
        <label>
          <Switch
            checked={eraseChip}
            onchange={(e) => onEraseChipChange(e.target.checked)}
          />
          <span>{$i18n.t("firmwareFlasherFullChipErase")}</span>
        </label>
        <span class="description"
          >{$i18n.t("firmwareFlasherFullChipEraseDescription")}</span
        >
      </div>
    {/if}
  </div>

  {#if releaseInfoVisible && releaseInfo}
    <div class="release_info">
      <div class="release-title">
        {$i18n.t("firmwareFlasherReleaseSummaryHead")}
      </div>
      <div class="release-body">
        <p>
          <strong>{$i18n.t("firmwareFlasherReleaseTarget")}</strong>
          <span class="target">{releaseInfo.target}</span>
        </p>
        {#if releaseInfo.manufacturer}
          <p>
            <strong>{$i18n.t("firmwareFlasherReleaseManufacturer")}</strong>
            {releaseInfo.manufacturer}
          </p>
        {/if}
        <p>
          <strong>{$i18n.t("firmwareFlasherReleaseVersion")}</strong>
          <a
            href={releaseInfo.versionUrl}
            target="_blank"
            rel="noopener noreferrer">{releaseInfo.version}</a
          >
        </p>
        <p>
          <strong>{$i18n.t("firmwareFlasherReleaseFile")}</strong>
          <a
            href={releaseInfo.fileUrl}
            target="_blank"
            rel="noopener noreferrer">{releaseInfo.file}</a
          >
        </p>
        <p>
          <strong>{$i18n.t("firmwareFlasherReleaseDate")}</strong>
          {releaseInfo.date}
        </p>
        {#if releaseInfo.hasUnifiedTarget}
          <p>
            <strong>{$i18n.t("firmwareFlasherUnifiedTargetName")}</strong>
            <a
              href={releaseInfo.unifiedTargetFileUrl}
              target="_blank"
              rel="noopener noreferrer">{releaseInfo.unifiedTargetFile}</a
            >
          </p>
          <p>
            <strong>{$i18n.t("firmwareFlasherUnifiedTargetDate")}</strong>
            {releaseInfo.unifiedTargetDate}
          </p>
        {/if}
        <strong>{$i18n.t("firmwareFlasherReleaseNotes")}</strong>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        <div class="notes">{@html releaseNotesHtml}</div>
      </div>
    </div>
  {/if}

  <div class="note warning">
    <div class="note-title">{$i18n.t("warningTitle")}</div>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("firmwareFlasherWarningText")}</p>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("firmwareFlasherTargetWarning")}</p>
  </div>

  <div class="note">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <div class="note-title">{@html $i18n.t("firmwareFlasherRecoveryHead")}</div>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    <p>{@html $i18n.t("firmwareFlasherRecoveryText")}</p>
  </div>
</Page>

<dialog bind:this={detectDialogEl}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <h3>{@html detectDialogTitle}</h3>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="content">{@html detectDialogContent}</div>
  <div class="buttons">
    <button class="btn" onclick={() => detectDialogEl.close()}>
      {$i18n.t("dialogBoardDetectionMessageAcknowledge")}
    </button>
  </div>
</dialog>

<style lang="scss">
  h1 {
    font-weight: 600;
  }

  .btn {
    @extend %button;
    white-space: nowrap;
  }

  .options {
    display: grid;
    grid-template-columns: 300px 1fr;
    align-items: center;
    gap: 4px 24px;
    padding: 4px 0;
    margin-top: var(--section-gap);
  }

  .field {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / -1;
    align-items: center;
    min-height: 32px;
    padding: 4px 0;

    & + .field {
      border-top: 1px solid var(--color-border);
    }
  }

  .description {
    display: block;
    min-width: 0;
    font-size: 0.75rem;
    font-style: italic;
    color: var(--color-text-soft);
  }

  .description-row {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px;

    :global(> .container) {
      flex-shrink: 0;
      margin-left: 0;
    }
  }

  .board-select-flex {
    display: flex;
    width: 100%;
    gap: 6px;
  }

  .board-select {
    flex-grow: 1;
    min-width: 0;
  }

  /* The Select component has no <style> of its own, so Svelte's scoping
     can't reach its internal <select> from here without :global() - without
     it, only .board-select (a real element in this template) would pick up
     the height/padding below, leaving it visibly taller than the other
     dropdowns in this panel that go through <Select>. */
  .options :global(select) {
    height: 1.5rem;
    min-width: 120px;
    padding: 0 4px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--color-border-soft);
    background-color: var(--color-input-bg);
    color: var(--color-text);
  }

  .detect-board {
    @extend %button;
    white-space: nowrap;
  }

  .release_info {
    margin-top: var(--section-gap);
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .release-title {
    text-align: center;
    font-weight: 600;
    padding: 6px;
    background-color: var(--color-surface-float, var(--color-surface));
    border-bottom: 1px solid var(--color-border);
  }

  .release-body {
    padding: 8px 12px;
    background-color: var(--color-surface);

    p {
      margin: 4px 0;
    }
  }

  .note {
    margin-top: var(--section-gap);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    color: var(--color-text);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-accent);

    &.warning {
      border-color: #a62e32;
    }
  }

  .note-title {
    text-align: center;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .progress-info {
    position: relative;
    flex-grow: 1;
  }

  .label-short {
    display: none;
  }

  /* Once the toolbar (which wraps via Page.svelte) no longer has room for
     four full-length button labels alongside the progress bar, switch to
     shorter labels *and* give the progress bar its own full-width line.
     The progress bar shows a real, filling/scrolling indicator while
     flashing - it needs to stay legibly wide rather than get squeezed onto
     a shared row with whatever button happens to still fit - and shorter
     button labels mean less gets pushed onto extra wrapped lines below it. */
  @media only screen and (max-width: 700px) {
    .progress-info {
      flex-basis: 100%;
    }

    .label-full {
      display: none;
    }

    .label-short {
      display: inline;
    }
  }

  .progress {
    width: 100%;
    height: 26px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);

    &::-webkit-progress-bar {
      background-color: #4f4f4f;
      border-radius: var(--radius-sm);
    }

    &::-webkit-progress-value {
      background-color: #f86008;
      border-radius: var(--radius-sm);
    }
  }

  .progress-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-weight: 600;
    color: #fff;
    text-shadow:
      0 0 3px black,
      0 0 3px black;
    pointer-events: none;

    &.valid {
      background-color: #00d000;
      border-radius: var(--radius-sm);
      color: #fff;
    }

    &.invalid {
      background-color: #a62e32;
      border-radius: var(--radius-sm);
      color: #fff;
    }

    &.actionRequired {
      background-color: #0081ff;
      border-radius: var(--radius-sm);
      color: #fff;
    }
  }

  .save-link {
    pointer-events: all;
    background: none;
    border: none;
    text-decoration: underline;
    color: inherit;
    cursor: pointer;
    font-weight: 600;
  }

  dialog {
    width: 32em;
    border-radius: var(--radius-lg);
  }

  dialog .buttons {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.5em;
  }

  dialog h3 {
    margin-bottom: 0.5em;
  }
</style>

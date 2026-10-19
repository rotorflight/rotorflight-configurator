import semver from "semver";

import { FirmwareCache } from "@/js/FirmwareCache.js";

const FILENAME_EXPRESSION =
  /^rotorflight_([\d]+[.][\d]+[.][\d]+((-[A-Za-z][\w]*)|(-[\d]+))?)_([A-Za-z][\w]*)[.]hex$/;

export function supportsUnifiedTargets(version) {
  return semver.gte(version, "4.2.0");
}

// GitHub release downloads send no CORS headers, so a browser page can't fetch
// them. The web build downloads the copies that rotorflight/rotorflight-artifacts
// keeps of every release (see its sync-firmware.yml) through jsDelivr, which
// does send them. The desktop app still downloads from the release itself.
export function firmwareDownloadUrl(release, asset) {
  if (__BACKEND__ === "web") {
    return `https://cdn.jsdelivr.net/gh/rotorflight/rotorflight-artifacts@master/firmware/${release.tag_name}/${asset.name}`;
  }
  return asset.browser_download_url;
}

// The board dropdown's "Custom" entries: a plain MCU build with no
// rotorflight-targets config, for DIY boards. Target ids are always
// `<make>-<board>` with a 1-4 character make, so this prefix can't collide.
const CUSTOM_TARGET_PREFIX = "custom:";

export function customTarget(mcu) {
  return `${CUSTOM_TARGET_PREFIX}${mcu}`;
}

export function customTargetMcu(target) {
  return target?.startsWith(CUSTOM_TARGET_PREFIX)
    ? target.slice(CUSTOM_TARGET_PREFIX.length)
    : null;
}

export function hasUnifiedTargetBuild(builds) {
  return Object.keys(builds).some((key) =>
    builds[key].some((target) => supportsUnifiedTargets(target.version)),
  );
}

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function processBoardOptions(releaseData, buildLevel, minVersion, maxVersion) {
  const releases = {};
  releaseData.forEach((release) => {
    if (release.prerelease && buildLevel < 2) return;
    release.assets.forEach((asset) => {
      const match = FILENAME_EXPRESSION.exec(asset.name);
      if (!match) return;
      if (match[2] && buildLevel < 1) return;
      if (semver.lt(match[1], minVersion) || semver.gt(match[1], maxVersion)) return;

      const version = match[1];
      const target = match[5];
      const descriptor = {
        releaseUrl: release.html_url,
        name: version,
        version,
        url: firmwareDownloadUrl(release, asset),
        file: asset.name,
        target,
        date: formatDate(new Date(release.published_at)),
        notes: release.body,
      };
      if (!releases[target]) releases[target] = [];
      releases[target].push(descriptor);
    });
  });
  return releases;
}

export function parseUnifiedTargets(targets, builds) {
  const releases = { ...builds };
  const unifiedConfigs = {};
  const TARGET_REGEXP = /^([^-]{1,4})-(.*).config$/;

  for (const target of targets) {
    const targetParts = target.name.match(TARGET_REGEXP);
    if (!targetParts) continue;

    target.board = targetParts[2];
    target.manufacturer = targetParts[1];
    target.target = `${target.manufacturer}-${target.board}`;
    unifiedConfigs[target.target] = target;
  }

  return { releases, unifiedConfigs };
}

export function buildTargetsByManufacturer(unifiedConfigs, showLegacy, selected) {
  const grouped = Object.values(unifiedConfigs).reduce((acc, target) => {
    (acc[target.manufacturer] ??= []).push(target);
    return acc;
  }, {});

  const groups = [];
  for (const manufacturerId of Object.keys(grouped).sort()) {
    const boards = grouped[manufacturerId]
      .filter((x) => x.supported || showLegacy || x.target === selected)
      .sort((a, b) => (a.board < b.board ? -1 : a.board > b.board ? 1 : 0));
    if (boards.length === 0) continue;
    groups.push({ manufacturerId, boards });
  }
  return groups;
}

export function populateBuilds(builds, manufacturerId, targetVersions) {
  if (!targetVersions) return;

  targetVersions.forEach((descriptor) => {
    let version = descriptor.version;
    const build = { descriptor };
    if (manufacturerId) {
      if (!supportsUnifiedTargets(descriptor.version)) return;
      build.manufacturerId = manufacturerId;
    } else {
      version = `${version}-legacy`;
      build.isLegacy = true;
    }
    builds[version] = build;
  });
}

export function versionOptions(builds, t) {
  const targetVersions = Object.keys(builds);
  if (targetVersions.length === 0) return [];

  const options = [];
  targetVersions
    .sort((a, b) => -semver.compareBuild(a, b))
    .forEach((versionName) => {
      const version = builds[versionName];
      if (!version.isLegacy && !supportsUnifiedTargets(version.descriptor.version)) return;

      let label;
      if (
        version.isLegacy &&
        Object.values(builds).some(
          (b) => b.descriptor.version === version.descriptor.version && !b.isLegacy,
        )
      ) {
        label = t("firmwareFlasherLegacyLabel", { target: version.descriptor.version });
      } else if (
        !version.isLegacy &&
        Object.values(builds).some(
          (b) =>
            b.descriptor.version === version.descriptor.version &&
            b.manufacturerId !== version.manufacturerId &&
            !b.isLegacy,
        )
      ) {
        label = `${version.descriptor.version} (${version.manufacturerId})`;
      } else {
        label = version.descriptor.version;
      }

      options.push({
        value: versionName,
        label: `${version.descriptor.date} - ${label}`,
        cached: FirmwareCache.has(version.descriptor),
        summary: version.descriptor,
      });
    });
  return options;
}

const IGNORE_REGEXP = [
  /^feature [-]?AIRMODE/i,
  /^feature [-]?ANTI/i,
  /^feature [-]?DISPLAY/i,
  /^feature [-]?DYNAMIC/i,
  /^feature [-]?ESC_SENSOR/i,
  /^feature [-]?GPS/i,
  /^feature [-]?LED_STRIP/i,
  /^feature [-]?MOTOR_STOP/i,
  /^feature [-]?OSD/i,
  /^feature [-]?RSSI/i,
  /^feature [-]?RX_PARALLEL/i,
  /^feature [-]?RX_SERIAL/i,
  /^feature [-]?RX_SPI/i,
  /^feature [-]?SOFTSERIAL/i,
  /^feature [-]?TELEMETRY/i,
  /^resource PWM/i,
  /^resource MOTOR [5-8]/i,
  /^resource OSD/i,
  /^serial [0-9]/i,
  /^set serialrx/i,
  /^set max7456/i,
];

export function cleanUnifiedConfigFile(input) {
  let output = "";
  let fork = "BF";
  input.split(/[\r\n]+/).forEach((rawLine, index) => {
    let line = rawLine;
    if (index === 0 && line.match(/^# [A-Za-z]*flight/)) {
      if (line.match(/^# Rotorflight/)) fork = "RF";
    } else {
      line = line
        .replace(/#.*$/, "")
        .replace(/[ \t]+$/, "")
        .replace(/[ \t]+/, " ")
        .replace(/^[ ]*$/, "");
      if (line.length === 0) return;
      if (fork !== "RF" && IGNORE_REGEXP.some((re) => line.match(re))) return;
    }
    output += line + "\n";
  });
  return output;
}

// Turns a captured `diff hardware bare` (see readHardwareConfigOverSerial())
// into a target config, the same shape cleanUnifiedConfigFile() gives a
// rotorflight-targets .config. The capture opens with the echoed command and
// a "# version" line, so it's cut to start at the "# Rotorflight / <MCU>"
// banner that cleanUnifiedConfigFile() and grabBuildNameFromConfig() expect.
// Returns null when there's no banner, or nothing hardware-specific to carry
// across the flash (a board running the bare MCU build's own defaults).
export function hardwareConfigFromCliOutput(text) {
  const lines = (text ?? "").split(/\r?\n/);
  const start = lines.findIndex((line) => /^#\s*Rotorflight\s*\//.test(line));
  if (start < 0) return null;

  const cfg = cleanUnifiedConfigFile(lines.slice(start).join("\n"))
    // An unset board_name/manufacturer_id prints with no value -- replayed,
    // that's just a query, not a setting.
    .replace(/^(board_name|manufacturer_id|board_design)\n/gm, "");
  if (!/^(resource|timer|dma) /m.test(cfg)) return null;
  return cfg;
}

export function grabBuildNameFromConfig(config) {
  try {
    return config.match(/.+\/ (STM32[^ ]*)/)[1];
  } catch (e) {
    console.log("grabBuildNameFromConfig failed: ", e.message);
    return undefined;
  }
}

export function grabKeywordFromConfig(config, keyword, fallback = "") {
  try {
    const res = config.match(`${keyword} (.*)\n`);
    return res ? res[1] : fallback;
  } catch (e) {
    console.log("grabKeywordFromConfig failed: ", e.message);
    return fallback;
  }
}

export function injectDefaultDesign(targetConfig, boardDesign) {
  const designLineRegex = /board_design [A-Za-z0-9_+-]+\n/gm;
  const nameLineRegex = /board_name [A-Za-z0-9_+-]+\n/gm;
  const newLine = `board_design ${boardDesign}\n`;

  if (!targetConfig.match(designLineRegex)) {
    const match = targetConfig.match(nameLineRegex);
    if (match) {
      targetConfig = targetConfig.replace(nameLineRegex, match[0] + newLine);
    }
  }
  return targetConfig;
}

export function injectTargetInfo(targetConfig, configName, targetName, manufacturerId, commitInfo) {
  const configLineRegex = /# config: manufacturer_id: .*\n/gm;
  targetConfig = targetConfig.replace(configLineRegex, "");

  return (
    "## Rotorflight Custom Defaults\n" +
    `# config: ${configName}\n` +
    `# board: ${targetName}\n` +
    `# make: ${manufacturerId}\n` +
    `# hash: ${commitInfo.commitHash}\n` +
    `# date: ${commitInfo.date}\n` +
    "##\n" +
    targetConfig
  );
}

export function parseHex(str) {
  return new Promise((resolve) => {
    const worker = new Worker(new URL("@/js/workers/hex_parser.js", import.meta.url));
    worker.onmessage = (event) => resolve(event.data);
    worker.postMessage(str);
  });
}

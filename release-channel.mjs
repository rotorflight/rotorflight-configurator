// Each major.minor line of the configurator goes with one firmware line, so a
// pilot may need 2.2 for one model and 2.3 for another. Every line is
// therefore installed as an app of its own -- its own PWA, Windows AppId,
// macOS bundle, Linux package and Android app id -- while the versions within
// a line update one another in place: its snapshots and release candidates
// lead up to its release (2.3.0-20260208, 2.3.0-RC2, 2.3.0), which its patch
// releases (2.3.1) follow.
//
// Builds without a release version are line "dev": package.json's 0.0.0, and
// what CI stamps on branch and pull request builds (0.0.0-<commit>, and
// 0.0.1-<commit> for Android).

const VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
const DEV_VERSION = /^0\.0\.[01](?:-|$)/;

export function getReleaseChannel(version) {
  const match = VERSION.exec(version ?? "");
  if (!match || DEV_VERSION.test(version)) return "dev";
  return `${match[1]}.${match[2]}`;
}

// Semantic version precedence: 2.3.0-RC2 < 2.3.0-RC10 < 2.3.0 < 2.3.1.
export function compareVersions(a, b) {
  const x = VERSION.exec(a);
  const y = VERSION.exec(b);
  for (let i = 1; i <= 3; i++) {
    const diff = Number(x[i]) - Number(y[i]);
    if (diff) return diff;
  }
  if (!x[4] || !y[4]) return (x[4] ? -1 : 0) - (y[4] ? -1 : 0);
  return x[4].localeCompare(y[4], "en", { numeric: true });
}

export function isVersion(version) {
  return VERSION.test(version);
}

export function isPrerelease(version) {
  return Boolean(VERSION.exec(version)?.[4]);
}

export function getAppIdentity(pkg) {
  const channel = getReleaseChannel(pkg.version);
  const isDev = channel === "dev";
  const [major, minor] = channel.split(".");
  return {
    channel,
    // rotorflight-configurator-2.3: package, profile and install dir names
    name: `${pkg.name}-${channel}`,
    // Rotorflight Configurator 2.3: what the pilot sees
    productName: `${pkg.productName} ${isDev ? "(dev)" : channel}`,
    // A component of a reverse-DNS id can't hold a dot, and on Android it
    // has to start with a letter.
    bundleId: `org.rotorflight.configurator.${isDev ? "dev" : `v${major}-${minor}`}`,
    androidId: `org.rotorflight.rotorflightconfigurator.${isDev ? "dev" : `v${major}_${minor}`}`,
  };
}

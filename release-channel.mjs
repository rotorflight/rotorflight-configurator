// Each major.minor line of the configurator goes with one firmware line, so a
// pilot may need 2.2 for one model and 2.3 for another. Every line is
// therefore installed as an app of its own -- its own PWA, Windows AppId,
// macOS bundle, Linux package and Android app id -- while the patch releases
// within a line (2.3.0, 2.3.1, 2.3.0-RC2) update one another in place.
//
// Builds without a release version (local, CI, PR builds) are line "dev".

export function getReleaseChannel(version) {
  const match = /^(\d+)\.(\d+)\.\d+/.exec(version ?? "");
  return match ? `${match[1]}.${match[2]}` : "dev";
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

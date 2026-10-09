#!/usr/bin/env node
//
// Release lines for deploy-web.yml; see release-channel.mjs.
//
//   release_line.mjs channel <version>
//     The version's release line (2.3), or "dev".
//
//   release_line.mjs follows <channel>
//     The build /v<channel>/ should hold (e.g. release/2.3.1), given the builds deployed under
//     release/ and snapshot/ (run from inside the gh-pages checkout). Until
//     the line has a release, that is its newest snapshot or release
//     candidate; from then on, its newest release. So the snapshots replace
//     one another, the release replaces them, and a snapshot or release
//     candidate never takes the line back from a release.
//
//   release_line.mjs latest
//     The build /latest/ should hold: the newest release of any line.
//
// Prints the build's directory, not just its version, as release/2.3.0 and
// snapshot/2.3.0 could both exist. Prints nothing when there is no such
// build.

import fs from "node:fs";
import path from "node:path";

import {
  compareVersions,
  getReleaseChannel,
  isPrerelease,
  isVersion,
} from "../../release-channel.mjs";

function deployed(kind) {
  try {
    return fs
      .readdirSync(kind)
      .filter(
        (name) =>
          isVersion(name) &&
          fs.existsSync(path.join(kind, name, "index.html")),
      )
      .map((version) => ({
        version,
        path: `${kind}/${version}`,
        release: kind === "release" && !isPrerelease(version),
      }));
  } catch {
    return [];
  }
}

// Of two builds of one version, the release wins over the snapshot.
function newest(builds) {
  return builds
    .slice()
    .sort(
      (a, b) =>
        compareVersions(a.version, b.version) ||
        Number(a.path.startsWith("release/")) -
          Number(b.path.startsWith("release/")),
    )
    .at(-1)?.path;
}

const [command, arg] = process.argv.slice(2);
const builds = [...deployed("release"), ...deployed("snapshot")];
let result;

switch (command) {
  case "channel":
    result = getReleaseChannel(arg);
    break;
  case "follows": {
    const line = builds.filter(
      (build) => getReleaseChannel(build.version) === arg,
    );
    const releases = line.filter((build) => build.release);
    result = newest(releases.length ? releases : line);
    break;
  }
  case "latest":
    result = newest(builds.filter((build) => build.release));
    break;
  default:
    console.error("usage: release_line.mjs channel <version> | follows <channel> | latest");
    process.exit(2);
}

if (result) console.log(result);

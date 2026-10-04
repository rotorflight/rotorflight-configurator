#!/usr/bin/python3
#
# Regenerates versions.json for the gh-pages deployment tree. Run from
# inside the checked-out gh-pages worktree (i.e. cwd == the `pages`
# directory that deploy-web.yml checks out).
#
# Layout recognised on disk:
#   latest/            -> type "stable" (the site's "recommended" pointer)
#   v<x.y>/            -> type "line", one entry per release line: the one to
#                          install as an app (its newest release, or snapshot
#                          until it has one); v<x.y>.json names the version
#   master/            -> type "master" (pinned alongside stable)
#   release/<version>/ -> type "release", one entry per subdirectory
#   snapshot/<version>/-> type "snapshot", one entry per subdirectory
#   pr/<number>/       -> type "pr", one entry per subdirectory (PR
#                          previews, see pr-preview-publish.yml)
#   logos/             -> the landing page's own assets, never a build
#   anything else with its own index.html -> type "branch" (feature/**,
#                          bugfix/**, experiment/** deploys, etc.)
#
# A build directory may have a <dir>.json beside it (pr/42.json,
# feature-xyz.json) with details for the landing page: the branch, the
# date it was deployed and, for a PR preview or a branch with an open PR,
# the PR's number, title, url and draft state. It sits beside the build
# rather than in it so nothing a build ships can overwrite it.
#
# Entries are emitted in the order the front end (index.html) groups them:
# stable/master pinned first, then the release lines (newest first), then
# release, then snapshot, then branch/pr.

import json
import os
import re

SKIP_DIRS = {"bundle", "logos", "public", "node_modules", ".git"}
LINE_DIR = re.compile(r"^v\d+\.\d+$")
NESTED_KINDS = {
    "release": "release",
    "snapshot": "snapshot",
    "pr": "pr",
}


def has_index(path):
    return os.path.isdir(path) and os.path.exists(os.path.join(path, "index.html"))


def nested_entries(kind_dir, entry_type):
    entries = []
    if not os.path.isdir(kind_dir):
        return entries
    for name in os.listdir(kind_dir):
        sub = os.path.join(kind_dir, name)
        if has_index(sub):
            entry = {"type": entry_type, "name": name, "path": f"./{kind_dir}/{name}/"}
            entry.update(read_info(f"{sub}.json"))
            entries.append(entry)
    return entries


INFO_TYPES = {
    "branch": str,
    "date": str,
    "number": int,
    "title": str,
    "url": str,
    "draft": bool,
}


def read_info(path):
    # Optional details written next to a build directory; see the header.
    try:
        with open(path, encoding="utf-8") as handle:
            info = json.load(handle)
    except (OSError, ValueError):
        return {}
    if not isinstance(info, dict):
        return {}
    return {
        key: info[key]
        for key, kind in INFO_TYPES.items()
        # bool is an int subclass; keep it out of "number".
        if isinstance(info.get(key), kind) and (kind is bool or not isinstance(info[key], bool))
    }


def natural_key(text):
    return [(0, int(p), "") if p.isdigit() else (1, 0, p) for p in re.split(r"(\d+)", text) if p]


def version_sort_key(entry):
    # Numeric-aware sort (2.10.0 after 2.9.0). A "-suffix" marks a
    # pre-release (2.3.0-RC2), which sorts below the plain 2.3.0 release but
    # above 2.2.x; snapshot suffixes (2.3.0-20260915) order by date.
    base, _, suffix = entry["name"].partition("-")
    return (natural_key(base), 0 if suffix else 1, natural_key(suffix))


def line_entry(line_dir):
    # deploy-web.yml writes v<x.y>.json beside the line with the version it
    # holds: a release, or, until the line has one, a snapshot or release
    # candidate (see release_line.mjs).
    line = line_dir[1:]
    entry = {"type": "line", "name": line, "path": f"./{line_dir}/"}
    try:
        with open(f"{line_dir}.json", encoding="utf-8") as handle:
            info = json.load(handle)
    except (OSError, ValueError):
        info = {}
    version = info.get("version") if isinstance(info, dict) else None
    if isinstance(version, str):
        entry["tag"] = version
        if isinstance(info.get("date"), str):
            entry["date"] = info["date"]
    released = (
        isinstance(version, str)
        and re.fullmatch(r"\d+\.\d+\.\d+", version)
        and has_index(os.path.join("release", version))
    )
    if released:
        entry["notes"] = f"Follows every {line}.x release. Install it as an app to keep it next to other versions."
    else:
        entry["notes"] = f"Snapshots of {line} until it is released, then its releases. Install it as an app to keep it next to other versions."
    return entry


def main():
    entries = []

    if has_index("latest"):
        entries.append({
            "type": "stable",
            "name": "Latest Stable",
            "path": "./latest/",
            "notes": "Recommended for all users",
        })

    if has_index("master"):
        entries.append({
            "type": "master",
            "name": "master",
            "path": "./master/",
            "notes": "Latest development build",
        })

    line_dirs = sorted(
        (d for d in os.listdir(".") if LINE_DIR.match(d) and has_index(d)),
        key=lambda d: natural_key(d[1:]),
        reverse=True,
    )
    for d in line_dirs:
        entries.append(line_entry(d))

    releases = sorted(nested_entries("release", "release"), key=version_sort_key, reverse=True)
    snapshots = sorted(nested_entries("snapshot", "snapshot"), key=version_sort_key, reverse=True)
    prs = sorted(nested_entries("pr", "pr"), key=version_sort_key, reverse=True)

    reserved = SKIP_DIRS | set(NESTED_KINDS) | {"latest", "master"} | set(line_dirs)
    branch_dirs = sorted(
        d for d in os.listdir(".")
        if d not in reserved and has_index(d)
    )
    branches = [
        {"type": "branch", "name": d, "path": f"./{d}/", **read_info(f"{d}.json")}
        for d in branch_dirs
    ]

    entries.extend(releases)
    entries.extend(snapshots)
    entries.extend(branches)
    entries.extend(prs)

    with open("versions.json", "w", encoding="utf-8") as handle:
        json.dump({"entries": entries}, handle, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()

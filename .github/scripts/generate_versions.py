#!/usr/bin/python3
#
# Regenerates versions.json for the gh-pages deployment tree. Run from
# inside the checked-out gh-pages worktree (i.e. cwd == the `pages`
# directory that deploy-web.yml checks out).
#
# Layout recognised on disk:
#   latest/            -> type "stable" (the site's "recommended" pointer)
#   master/            -> type "master" (pinned alongside stable)
#   release/<version>/ -> type "release", one entry per subdirectory
#   snapshot/<version>/-> type "snapshot", one entry per subdirectory
#   pr/<number>/       -> type "pr", one entry per subdirectory (no workflow
#                          populates this yet, but the picker already
#                          understands the type so it's ready when one does)
#   logos/             -> the landing page's own assets, never a build
#   anything else with its own index.html -> type "branch" (feature/**,
#                          bugfix/**, experiment/** deploys, etc.)
#
# Entries are emitted in the order the front end (index.html) groups them:
# stable/master pinned first, then release, then snapshot, then branch/pr.

import json
import os
import re

SKIP_DIRS = {"bundle", "logos", "public", "node_modules", ".git"}
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
            entries.append({"type": entry_type, "name": name, "path": f"./{kind_dir}/{name}/"})
    return entries


def natural_key(text):
    return [(0, int(p), "") if p.isdigit() else (1, 0, p) for p in re.split(r"(\d+)", text) if p]


def version_sort_key(entry):
    # Numeric-aware sort (2.10.0 after 2.9.0). A "-suffix" marks a
    # pre-release (2.3.0-RC2), which sorts below the plain 2.3.0 release but
    # above 2.2.x; snapshot suffixes (2.3.0-20260915) order by date.
    base, _, suffix = entry["name"].partition("-")
    return (natural_key(base), 0 if suffix else 1, natural_key(suffix))


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

    releases = sorted(nested_entries("release", "release"), key=version_sort_key, reverse=True)
    snapshots = sorted(nested_entries("snapshot", "snapshot"), key=version_sort_key, reverse=True)
    prs = sorted(nested_entries("pr", "pr"), key=version_sort_key, reverse=True)

    reserved = SKIP_DIRS | set(NESTED_KINDS) | {"latest", "master"}
    branch_dirs = sorted(
        d for d in os.listdir(".")
        if d not in reserved and has_index(d)
    )
    branches = [{"type": "branch", "name": d, "path": f"./{d}/"} for d in branch_dirs]

    entries.extend(releases)
    entries.extend(snapshots)
    entries.extend(branches)
    entries.extend(prs)

    with open("versions.json", "w", encoding="utf-8") as handle:
        json.dump({"entries": entries}, handle, indent=2)
        handle.write("\n")


if __name__ == "__main__":
    main()

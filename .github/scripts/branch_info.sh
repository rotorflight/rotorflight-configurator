#!/bin/bash
#
# Prints the landing-page details for a branch deploy as JSON: the branch,
# the date it was deployed and, when the branch has an open PR in this
# repository, that PR's number, title, url and draft state. deploy-web.yml
# and pr-branch-info.yml write it beside the build as <deploy_path>.json,
# which generate_versions.py folds into versions.json.
#
# Usage: branch_info.sh <branch> <date>
# Needs GH_TOKEN (pull-requests: read) and GITHUB_REPOSITORY.

set -euo pipefail

BRANCH="$1"
DATE="$2"

# Only PRs from this repository's own branch: a fork's branch of the same
# name is a different branch, and never has a deploy here.
PRS="$(gh api -X GET "repos/$GITHUB_REPOSITORY/pulls" \
  -f state=open -f head="${GITHUB_REPOSITORY%%/*}:$BRANCH")"

jq --arg branch "$BRANCH" --arg date "$DATE" '
  {branch: $branch, date: $date}
  + (if length > 0 then .[0] | {number, title, url: .html_url, draft} else {} end)
' <<< "$PRS"

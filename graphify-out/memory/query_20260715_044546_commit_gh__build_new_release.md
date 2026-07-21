---
type: "query"
date: "2026-07-15T04:45:46.025302+00:00"
question: "commit gh, build new release"
contributor: "graphify"
outcome: "useful"
source_nodes: ["fetchLatestReleaseVersion()", "checkForUpdates()", "compareVersions()"]
---

# Q: commit gh, build new release

## Answer

Expanded via graph vocabulary: [build, release, version, update, package, packaged, electron, updates]. Graph nodes fetchLatestReleaseVersion() and checkForUpdates() confirmed GitHub Release-based update flow. Bumped package/package-lock to 3.3.4, ran full npm test successfully, built Windows x64 NSIS artifacts with electron-builder, committed 4e5c08e to main, pushed origin/main, and published GitHub Release v3.3.4 with installer, blockmap, and latest.yml.

## Outcome

- Signal: useful

## Source Nodes

- fetchLatestReleaseVersion()
- checkForUpdates()
- compareVersions()
---
type: "query"
date: "2026-07-21T04:17:38.753775+00:00"
question: "có cách nào giảm bớt egress không? hướng sử dụng Redish thì sao"
contributor: "graphify"
outcome: "useful"
source_nodes: ["cloud-sync.js", "pullAndMergeFromCloud()", "cloudSyncFetchRowsSince()", "listenToCloudChanges()", "manualIncrementalSync()", "cloudSyncPersistPullDeltaToCache()"]
---

# Q: có cách nào giảm bớt egress không? hướng sử dụng Redish thì sao

## Answer

Expanded from original query via vocab: [cache, cloud, delta, fetch, incremental, realtime, rows, storage, supabase, sync, download]. Current architecture already uses local SQLite cache, checkpoints, indexed versioned delta RPC, and Realtime. Highest-priority egress reductions: remove retryFullIfNoChanges from routine manual/deferred sync because it can force a full snapshot on a no-change delta; replace per-row Realtime on rd_accounting_data with one tiny workspace-version event per transaction; reduce 3-second status polling to a fallback watchdog; return only required RPC columns; split growing cashEntries, escrowItems, actionLogs, users, and templates out of the metadata JSON row. Redis is not recommended in the Electron client. It only becomes useful behind a trusted backend when many stations repeatedly request identical workspace/version deltas; cache serialized deltas or snapshots with short TTL, keep Postgres authoritative, and invalidate after commit.

## Outcome

- Signal: useful

## Source Nodes

- cloud-sync.js
- pullAndMergeFromCloud()
- cloudSyncFetchRowsSince()
- listenToCloudChanges()
- manualIncrementalSync()
- cloudSyncPersistPullDeltaToCache()
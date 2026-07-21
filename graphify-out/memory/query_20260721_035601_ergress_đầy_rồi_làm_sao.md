---
type: "query"
date: "2026-07-21T03:56:01.365741+00:00"
question: "ergress đầy rồi làm sao"
contributor: "graphify"
outcome: "useful"
source_nodes: ["cloudSyncFetchAllRows()", "pullAndMergeFromCloud()", "manualIncrementalSync()", "flushDeferredCloudSync()", "pullFromCloudOnStartup()"]
---

# Q: ergress đầy rồi làm sao

## Answer

Expanded from original query via vocab: [cloud, sync, pull, fetch, full, incremental, startup, metadata, polling, realtime, checkpoint, rows]. Egress is outbound Database API traffic, not database/storage capacity. The app has paged full snapshot reads in cloudSyncFetchAllRows; pullAndMergeFromCloud falls back to a full snapshot when retryFullIfNoChanges is set and an incremental query returns zero rows; manualIncrementalSync and flushDeferredCloudSync set this flag. Local logs confirm 11 full startup reconciles and 2 zero-delta-to-full fallbacks. Immediate mitigation: avoid manual full pull and repeated sync/restarts, wait for billing reset or upgrade. Permanent fix: remove zero-delta full fallback and reserve full pulls for missing/invalid baseline or explicit recovery.

## Outcome

- Signal: useful

## Source Nodes

- cloudSyncFetchAllRows()
- pullAndMergeFromCloud()
- manualIncrementalSync()
- flushDeferredCloudSync()
- pullFromCloudOnStartup()
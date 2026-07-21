---
type: "query"
date: "2026-07-21T04:32:33.716075+00:00"
question: "tôi cần giảm bớt egress; có cách nào áp dụng được liền không?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["cloud-sync.js", "manualIncrementalSync()", "flushDeferredCloudSync()", "cloudSyncPushNow()", "pullAndMergeFromCloud()", "startCloudMetadataPolling()"]
---

# Q: tôi cần giảm bớt egress; có cách nào áp dụng được liền không?

## Answer

Expanded via graph vocab: [cloud, delta, fetch, full, incremental, manual, polling, pull, realtime, retry, sync]. Applied immediate low-risk egress reductions in RD/js/cloud-sync.js: polling 3000ms to 5000ms (40% fewer background status calls); manualIncrementalSync and flushDeferredCloudSync no longer set retryFullIfNoChanges, preventing an empty delta from becoming a full snapshot; cloudSyncPushNow now checks the real pending delta before advancing _lastModified and skips all cloud writes/version bumps when already synchronized. Explicit full reconcile and safety full pulls for missing baselines/watermark rollback remain. Added regression coverage. Full npm test suite passed.

## Outcome

- Signal: useful

## Source Nodes

- cloud-sync.js
- manualIncrementalSync()
- flushDeferredCloudSync()
- cloudSyncPushNow()
- pullAndMergeFromCloud()
- startCloudMetadataPolling()
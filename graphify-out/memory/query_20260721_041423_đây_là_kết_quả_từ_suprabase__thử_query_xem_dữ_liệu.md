---
type: "query"
date: "2026-07-21T04:14:23.717609+00:00"
question: "đây là kết quả từ suprabase; thử query xem dữ liệu mới nhất là từ bao giờ; phương án clone qua db nào là hợp lý?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["startSupabaseClient()", "listenToCloudChanges()", "cloudSyncFetchRowsSince()", "cloudSyncRestoreBaselineFromConfirmedCache()"]
---

# Q: đây là kết quả từ suprabase; thử query xem dữ liệu mới nhất là từ bao giờ; phương án clone qua db nào là hợp lý?

## Answer

Expanded from original query via vocab: [supabase, cloud, sync, database, migration, config, postgrest, realtime, sqlite, backup, restore]. CSV contains only 100 newest rows. Latest cloud timestamp is 2026-07-20 09:51:28.939 UTC (16:51:28.939 Asia/Saigon), with voucher BH44896 at the same last_modified time. Local SQLite latest entity is 2026-07-15 10:59:59 Asia/Saigon, so cloud is newer and local-only cloning would lose five days. Because the app directly depends on Supabase client, PostgREST-style reads, stored RPC functions, and Realtime, managed Supabase Pro is the lowest-risk target; a fresh Free project is only temporary. Cloudflare D1 has attractive free limits/no D1 egress but requires a Worker API and sync rewrite. Neon still has 5GB free transfer and lacks drop-in Supabase APIs.

## Outcome

- Signal: useful

## Source Nodes

- startSupabaseClient()
- listenToCloudChanges()
- cloudSyncFetchRowsSince()
- cloudSyncRestoreBaselineFromConfirmedCache()
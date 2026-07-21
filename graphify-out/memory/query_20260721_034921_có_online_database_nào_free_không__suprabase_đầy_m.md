---
type: "query"
date: "2026-07-21T03:49:21.635865+00:00"
question: "có online database nào free không? suprabase đầy mất rồi"
contributor: "graphify"
outcome: "useful"
source_nodes: ["startSupabaseClient()", "cloudSyncAuthenticateAndBootstrap()", "listenToCloudChanges()", "cloudSyncFetchRowsSince()", "cloudSyncPushNow()"]
---

# Q: có online database nào free không? suprabase đầy mất rồi

## Answer

Expanded from graph vocabulary: [supabase, cloud, sync, realtime, auth, storage, database]. The app depends on Supabase-specific REST/realtime/bootstrap and a custom watermark pull-push engine, so a provider change is not drop-in. Best free capacity fit is Turso (5 GB) because the app is already local-first SQLite, but the sync adapter and secure token architecture must be rewritten. Cloudflare D1 also offers 5 GB but requires a Worker API and custom polling/realtime. Appwrite Cloud is functionally closest with Auth/Realtime and 2 GB storage, but its free read/write quotas and inactivity pause need evaluation. Firebase offers 1 GiB and requires a large document-model rewrite. Neon free remains 0.5 GB per project, so it does not solve a 500 MB database-capacity issue. First distinguish Supabase Database Size from Storage Bucket or Egress; cleanup/archive may be much cheaper than migration.

## Outcome

- Signal: useful

## Source Nodes

- startSupabaseClient()
- cloudSyncAuthenticateAndBootstrap()
- listenToCloudChanges()
- cloudSyncFetchRowsSince()
- cloudSyncPushNow()
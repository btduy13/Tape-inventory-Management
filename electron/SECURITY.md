# Electron admin app: security review and hardening

Scope: `electron/` (main.js, preload.js, dbPolicy.js, ipcPolicy.js, emailPolicy.js, updater.js,
config.js, js/**) plus `supabase/migrations/0010_electron_role.sql`.
Tests: `npm test` (node --test test/*.test.js).

## Architecture after hardening

```
renderer (index.html, js/**)            preload.js                     main.js
  window.electronAPI.dbQuery(name, p) -> invoke('db-read', name, p)  -> handleTrusted: sender check
  window.electronAPI.dbRun(name, p)   -> invoke('db-write', name, p) -> db/registry.js buildDbAction
  window.electronAPI.dbTransaction([{action, params}])               -> buildDbTransaction (write only)
                                                                      -> pg Pool (role electron_app)
```

The renderer never sends SQL. It sends an action name and a params object. The main process
looks the name up in `db/registry.js`, validates every parameter (`db/params.js`,
`db/orderColumns.js`) and builds the parameterized SQL itself (`db/readActions.js`,
`db/writeActions.js`). The old token-based SQL validator (`dbPolicy.js`) still runs on the
SQL that the registry builds, as a second layer.

## Issues found and fixes

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | High | **Raw SQL over IPC.** `db-query`, `db-run` and `db-transaction` executed any SQL string from the renderer. The only guard was a hand-written tokenizer (`dbPolicy.js`). Any XSS or compromised renderer could read or rewrite every row of the 5 tables, use bypass tricks the tokenizer missed, or run DELETE/UPDATE with a trivially true WHERE. | Replaced with a named-action registry (32 actions) in the main process. Table names come only from the `orderType` enum (`bang_keo_in`, `bang_keo`, `truc_in`). Column names for `order.insert` and `order.update` must match a fixed per-table allowlist. `order.update` cannot change `id`, `thoi_gian`, `is_quote` or the status flags (they have dedicated actions). Values must be primitives or Dates. `quote_items` must be a JSON array. IDs, prefixes, dates, booleans, attachment ids and base64 data are validated. Read actions are rejected on the write channel and the reverse. A transaction accepts only write actions, max 5000 steps. All `js/modules` callers were migrated. The SQL text is unchanged, so behaviour is the same. |
| 2 | High | **App connected as the database owner.** DATABASE_URL used the `postgres` owner. It bypasses RLS, can run DDL and can reach every table in the project, including the new web portal tables (`leads`, `quotes`, `profiles`...). | `supabase/migrations/0010_electron_role.sql` creates role `electron_app`: LOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS, connection limit 30, `statement_timeout` 30s, `idle_in_transaction_session_timeout` 60s. It has `USAGE` on schema public, `SELECT/INSERT/UPDATE/DELETE` on the 5 tables only, `USAGE/SELECT` on their serial sequences, and an explicit RLS policy per table (0009 enabled RLS on them). The role has no CREATE, TRUNCATE, TRIGGER or REFERENCES, and no access to `app_schema_meta`. The in-app schema migration in `main.js` now logs `42501` as "restricted role, skipped" instead of an error. |
| 3 | High | **Secrets stored in plaintext.** `config.local.json` in userData held `DATABASE_URL` (with the password) and the SMTP password as plain text. | New `secretStore.js` encrypts both values with Electron `safeStorage` (Windows DPAPI, bound to the Windows account) as `safe:v1:<base64>`. Every write path encrypts: `writeUserConfig`, config import and SMTP save. Values are decrypted only in the main process, after the app is ready (`config.applySecretResolver`). An existing plaintext userData config is re-encrypted on first start. If a file is copied from another account and cannot be decrypted, the secret is blanked and the "import config" flow starts. Secrets never cross IPC: `get-email-config` returns only `hasPassword`. |
| 4 | Medium | **`openExternal` accepted any http(s) URL.** This applied to the IPC channel, `window.open` and link clicks. A compromised renderer could open phishing pages or `http:` URLs in the user's browser. | `ipcPolicy.validateExternalUrl` uses an allowlist: HTTPS only, no credentials in the URL, and host + path prefix must match (`github.com/btduy13/Tape-inventory-Management`, the release page). The same check covers the IPC handler, `setWindowOpenHandler` and the new global handler. |
| 5 | Medium | **No guard for new webContents.** Only the main and PDF windows were hardened. A future window or frame would get the defaults. | `app.on('web-contents-created')` now denies every `window.open` (allowlisted links open in the system browser), blocks `will-navigate` away from the loaded page and blocks `<webview>`. |
| 6 | Medium | **Renderer could load arbitrary resources.** Only the CSP meta tag limited network and `file://` access. It does not cover every request type, and `file://` could reach any local path. | A `session.defaultSession.webRequest.onBeforeRequest` filter applies to the main window only. It allows `file://` inside the app directory, `data:`/`blob:` URLs, and `https://fonts.googleapis.com` / `fonts.gstatic.com`. UNC paths and every other host are blocked and logged (`ipcPolicy.isAllowedRendererRequest`). The auto-updater uses its own session and is not affected. |
| 7 | Medium | **Permissions not denied.** The default session never set a permission handler, so camera, microphone, notifications, geolocation and clipboard-read prompts used Chromium defaults. | `setPermissionRequestHandler` and `setPermissionCheckHandler` deny everything. The PDF session already did this. |
| 8 | Medium | **SMTP STARTTLS downgrade.** `smtpSecurityOptions` used unescaped regexes (`/^10./`, `/^172.(1[6-9]\|2d\|3[01])./`). Any hostname starting with `10`, such as `100.mail.example.com`, counted as a LAN relay, so `requireTLS` was off and the SMTP password could be sent in clear text. | The check now matches only full private IPv4 literals (10/8, 172.16/12, 192.168/16) plus localhost. Tests cover look-alike hostnames. |
| 9 | Low | **Sandbox enforced per window only, extra webPreferences left at defaults.** | Added `app.enableSandbox()` (all renderers). The main window also sets `allowRunningInsecureContent: false`, `experimentalFeatures: false`, `navigateOnDragDrop: false` and `devTools: !app.isPackaged`, so installed builds cannot open DevTools to call `electronAPI`. `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` and `webSecurity: true` were already set and are now asserted by tests. |
| 10 | Low | **CSP could be tighter.** | Added `worker-src 'none'`, `media-src 'none'` and `manifest-src 'none'`. `script-src 'self'` stays, with no inline or eval. |

### Already in place (verified, unchanged)

- Every `ipcMain.handle` goes through `handleTrusted`. It checks that the sender is the main window's top frame and that it is showing the app's `index.html` (`ipcPolicy.isTrustedIpcSender`). There are no `ipcMain.on` listeners. preload exposes only named functions, never `ipcRenderer`.
- Read/write file IPC works only on paths the user picked in a native dialog. Each approval is single-use and expires after 10 minutes. Extensions and sizes are checked.
- PDF rendering runs in a hidden window with a separate partition, JavaScript disabled and requests limited to the app directory and its temp folder.
- Email: the payload is validated in the main process (plain address, header injection, base64, 25 MB limit). The main process shows a native confirmation dialog before sending. nodemailer `disableFileAccess`/`disableUrlAccess` are set.
- DB errors returned to the renderer are reduced to a short message plus the SQLSTATE (`toPublicDbError`). Logs record the action name, never the SQL text or values.
- The updater uses electron-updater with GitHub releases and does not download automatically. The user confirms download and install.

## Deploying the least-privilege role

1. Apply `supabase/migrations/0010_electron_role.sql`. The 5 legacy tables must already exist; the block that grants access is idempotent and can be re-run.
2. Set the password out of band (never commit it): `alter role electron_app with password '<long random>';`
3. Run the app once with the **owner** URL so the in-app schema migration (`SCHEMA_VERSION`) is applied. Or apply those ALTER/TRIGGER statements as an owner migration.
4. Build a new portable config with `DATABASE_URL=postgresql://electron_app.<project-ref>:<secret>@<pooler-host>:5432/postgres?sslmode=require` and import it on each machine (badge "Mây" > "Nhập cấu hình"). On import it is encrypted with safeStorage.

## Residual risks and follow-ups

- **TLS verification for Postgres** is off unless `DATABASE_SSL_CA` is set or `sslmode=verify-full` is used. This is the legacy behaviour and a warning is logged. Fix: ship the Supabase CA certificate in the config.
- **The portable config export is plaintext.** It is meant for moving between machines, because DPAPI is bound to the account. A warning dialog is shown before export. Delete the file after import.
- **Electron fuses are not set.** `RunAsNode`, `EnableNodeOptionsEnvironmentVariable` and `EnableNodeCliInspectArguments` are still on, and `OnlyLoadAppFromAsar` / `EnableEmbeddedAsarIntegrityValidation` are off. Recommend enabling them through electron-builder `electronFuses` and adding code signing (`win.signtoolOptions`, updater `publisherName`).
- **A compromised renderer can still perform any registered action**, for example deleting orders. That is the app's own permission level. The DB role limits the blast radius to the 5 tables. Destructive actions are confirmed in the UI, not in the main process.
- **`EXECUTE` on public-schema functions is granted to PUBLIC** in Postgres. Web-portal `SECURITY DEFINER` functions check `is_admin()` themselves. Revoke `EXECUTE ... FROM PUBLIC` on them in the web migrations if needed.
- **`style-src 'unsafe-inline'` and the remote Google Fonts stylesheet** remain. Self-host the font to remove the remote origin.
- **`write-log` has a size cap (10 000 chars) but no rate limit.**
- **The numeric validation in `order.insert`/`order.update` now rejects `NaN`/`Infinity`.** Before, they could reach Postgres `numeric` as `NaN`. This is intended.

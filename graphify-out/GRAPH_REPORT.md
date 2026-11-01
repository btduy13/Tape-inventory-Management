# Graph Report - Tape-inventory-Management  (2026-11-01)

## Corpus Check
- 537 files · ~251,231 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 4, .ico 3, .css 3)

## Summary
- 4230 nodes · 12560 edges · 159 communities (142 shown, 17 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 988 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cfe78135`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.js
- Statistics Module
- Quotation Workflow
- Application UI
- electron/package.json
- Build Configuration
- Export and PDF
- Email Dialog
- emailPolicy.test.js
- Excel Import
- A
- Order Math
- Printed Tape Orders
- Interaction Helpers
- domContract.test.js
- web/package.json
- Standard Tape Orders
- Dashboard
- Print Axis Orders
- email/index.ts
- Sales Quote UI Concepts
- Quotation VAT Concepts
- Brand Assets
- sessions.ts
- Release Workflow
- utils.test.js
- chart.umd.js
- make_xlsx_lib
- ct
- Legacy Release Notes
- Ra
- ns
- sk
- Js
- va
- xe
- bn
- an
- no
- s
- zt
- yw
- n
- assignment/server/actions.ts
- dbPolicy.js
- rs
- ref_node_path
- tn
- registry.js
- de
- config.js
- ipcPolicy.js
- workshop/components/sections.tsx
- web.ts
- statsConsistency.test.js
- JobCard.tsx
- updater.js
- actions-edit.ts
- portableConfigCrypto.js
- src/lib/types.ts
- LeadsTable.tsx
- deps.ts
- ref_node_fs
- En
- scene.test.ts
- quotes.ts
- workshop/server/actions.ts
- ref_node_assert
- send-deps.ts
- upload-validation.ts
- getDictionary
- MockupScene.tsx
- Q: which is the correct folder that has all the source code for this application
- Q: inspect printing module; A5 paper size cannot pass to real printer
- Q: Kiểm tra và sửa việc ẩn số tiền chiết khấu trên phiếu báo giá và đơn đặt hàng khi không có mặt hàng chiết khấu
- Q: không phải chỉ mỗi báo giá, mà là toàn bộ app
- Q: commit gh, build new release
- Q: tôi cần nâng cấp thêm phần mềm nhưng chưa biết nâng cấp gì; gợi ý giúp tôi
- Q: có online database nào free không? suprabase đầy mất rồi
- Q: ergress đầy rồi làm sao
- Q: đây là kết quả từ suprabase; thử query xem dữ liệu mới nhất là từ bao giờ; phương án clone qua db nào là hợp lý?
- Q: có cách nào giảm bớt egress không? hướng sử dụng Redish thì sao
- Q: tôi cần giảm bớt egress; có cách nào áp dụng được liền không?
- Q: tôi muốn hiển thị thêm số tiền VAT trong tất cả các tab lên đơn
- Q: lọc bị lỗi, tôi không thể xóa filter sau khi đã edit, xem lại và sửa module filter
- Q: Sửa đơn thiếu hoa hồng; filter cần sắp xếp; Excel trục thiếu thông tin; rà soát nhất quán và sửa lỗi tồn đọng
- Quản lý Băng Keo Vĩnh Thịnh v1.5.15
- Quản lý Băng Keo Vĩnh Thịnh v1.5.16
- Quản lý Băng Keo Vĩnh Thịnh v1.5.18
- Quản lý Băng Keo Vĩnh Thịnh v1.5.19
- createClient
- secretStore.test.js
- compilerOptions
- jn
- getDictionary
- scripts
- server-only
- orders/server/actions.ts
- send-quote.ts
- Web portal architecture
- eo
- auth/server/actions.ts
- features/admin
- features/assignment
- features/auth
- getDictionary
- features/email
- features/lead-intake
- features/mockup3d
- features/orders
- respond-route.ts
- orders/index.ts
- Security review: web portal, Supabase, Electron
- workshop/components/ui.tsx
- AGENTS.md
- e2e/README.md
- fixtures.ts
- logo-load.ts
- quote-editor.tsx
- workshop/lib/lib.test.ts
- designer/index.ts
- geometry.ts
- dependencies
- handle-lead-submit.ts
- parse-submission.ts
- LeadForm.tsx
- designer/index.ts
- palette.ts
- api-contract.ts
- state.ts
- u
- Supabase root CA (PostgreSQL TLS verification)
- KonvaTapeStage.tsx
- a
- orderFlows.js
- .update
- server-only
- clients.ts
- vitest
- domActions.js
- CartonBox.tsx
- quotes/lib/types.ts
- quotationUi.smoke.js
- app/layout.tsx
- quotationList.test.js
- SEED_USERS.md
- token.ts
- next.config.ts
- bt
- signInCached
- .buildOrUpdateControllers
- features/designer
- Md
- features/workshop

## God Nodes (most connected - your core abstractions)
1. `make_xlsx_lib()` - 540 edges
2. `Ra()` - 123 edges
3. `vitest` - 111 edges
4. `A()` - 101 edges
5. `getDictionary()` - 100 edges
6. `N()` - 73 edges
7. `Js` - 72 edges
8. `s()` - 68 edges
9. `o()` - 66 edges
10. `an()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `Reviewed with no change needed` --references--> `innerHTML()`  [INFERRED]
  SECURITY_REPORT.md → electron/test/utils.test.js
- `Reviewed with no change needed` --references--> `a()`  [INFERRED]
  SECURITY_REPORT.md → electron/assets/vendor/chart.umd.js
- `Reviewed with no change needed` --references--> `to()`  [INFERRED]
  SECURITY_REPORT.md → electron/assets/vendor/chart.umd.js
- `Reviewed with no change needed` --references--> `escapeAppHtml()`  [INFERRED]
  SECURITY_REPORT.md → electron/js/app.js
- `Reviewed with no change needed` --references--> `handleTrusted()`  [INFERRED]
  SECURITY_REPORT.md → electron/main.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Quotation VAT UI and Release Flow** — electron_release_notes_1_5_12, electron_release_notes_1_5_13, electron_release_notes_1_5_14, concept_multi_dimension_quote, concept_vat_accounting, concept_sales_quote_ui_grouping, concept_release_auto_update [INFERRED 0.85]

## Communities (159 total, 17 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.07
Nodes (56): toPublicDbError(), decodeBase64Strict(), isPlainEmailAddress(), sanitizeAttachmentName(), smtpSecurityOptions(), validateEmailPayload(), validateExternalUrl(), { app, BrowserWindow, Menu, ipcMain, shell, dialog, nativeImage, session, safeStorage } (+48 more)

### Community 1 - "Statistics Module"
Cohesion: 0.07
Nodes (71): applyBulkStatsStatus(), applyHistoryFilters(), arrayBufferToBase64(), base64ToUint8Array(), bindStatsHeaderFilterButtons(), bindStatsRowEvents(), bkiQuoteAxesMatchOrder(), buildBkiAxisExcelRow() (+63 more)

### Community 2 - "Quotation Workflow"
Cohesion: 0.07
Nodes (70): addCurrentQuoteAxis(), addQuoteDraft(), applyQuoteDraftFields(), applyQuotesFilters(), axisFromFields(), bindQuoteDraftTabEvents(), buildNewQuoteDraftFields(), buildQuoteItem() (+62 more)

### Community 3 - "Application UI"
Cohesion: 0.08
Nodes (45): applyTheme(), buildEditInput(), calculateEditOrder(), closeModal(), closeTopModal(), commandPaletteActions, commandPaletteFilteredActions, configureStructuredOrderEdit() (+37 more)

### Community 4 - "electron/package.json"
Cohesion: 0.07
Nodes (30): author, dependencies, electron-updater@^6.8.9, nodemailer@^10.0.10, pg@^8.11.5, description, devDependencies, electron@^43.1.0 (+22 more)

### Community 5 - "Build Configuration"
Cohesion: 0.08
Nodes (26): build, afterPack, appId, artifactName, asar, directories, executableName, extraFiles (+18 more)

### Community 6 - "Export and PDF"
Cohesion: 0.15
Nodes (24): buildExportLine(), buildExportProductsFromOrder(), buildVoucherPdfHtml(), deletePreviewProduct(), escapeExportHtml(), exportTodayFileDate(), formatExportQuantity(), generateCombinedPrintInvoice() (+16 more)

### Community 7 - "Email Dialog"
Cohesion: 0.13
Nodes (23): addEmailLocalAttachment(), closeEmailDialogModal(), EMAIL_SMTP_FIELD_IDS, emailAttachments, emailSuggestions, formatBangKeoEmailSpec(), formatBytes(), getEmailSmtpContainer() (+15 more)

### Community 8 - "emailPolicy.test.js"
Cohesion: 0.07
Nodes (26): assert, fs, path, test, vm, assert, fs, loadEmailDialog() (+18 more)

### Community 9 - "Excel Import"
Cohesion: 0.14
Nodes (31): buildBangKeoInImportStatement(), buildExcelGetter(), buildImportInsertStatement(), buildSequentialOrderIds(), buildSimpleImportStatement(), buildValidImportDate(), calculateSimpleImport(), excelImportAliases (+23 more)

### Community 10 - "A"
Cohesion: 0.12
Nodes (92): q(), A(), ak(), an(), ao(), ar(), bk(), bu() (+84 more)

### Community 11 - "Order Math"
Cohesion: 0.26
Nodes (15): calculateLine(), calculatePrintedTape(), calculateQuoteBundle(), calculateQuoteItems(), calculateStandardOrder(), calculateVoucherTotals(), money(), nextOrderId() (+7 more)

### Community 12 - "Printed Tape Orders"
Cohesion: 0.20
Nodes (17): autofillBangKeoInData(), BANG_KEO_IN_INSERT_COLUMNS, bangKeoInSavingModes, buildOrderInsertValues(), calculateBangKeoIn(), calculateBangKeoInAxis(), clearBangKeoInAxisFields(), clearFormBangKeoIn() (+9 more)

### Community 13 - "Interaction Helpers"
Cohesion: 0.36
Nodes (7): focusRowFirstCell(), getActiveSearchInputId(), getEditableCellsInRow(), getFocusableFieldsInModal(), getOrderTableRows(), initCtrlFShortcut(), initOrderFormKeyboardNavigation()

### Community 14 - "domContract.test.js"
Cohesion: 0.10
Nodes (8): assert, FakeEvent, fs, getJavaScriptFiles(), html, path, root, test

### Community 15 - "web/package.json"
Cohesion: 0.06
Nodes (39): eslint, eslint-config-next, jsdom, @playwright/test, supabase, tailwindcss, @tailwindcss/turbopack, @testing-library/dom (+31 more)

### Community 16 - "Standard Tape Orders"
Cohesion: 0.36
Nodes (6): autofillBangKeoData(), BANG_KEO_INSERT_COLUMNS, bangKeoSavingModes, calculateBangKeo(), clearFormBangKeo(), saveBangKeo()

### Community 17 - "Dashboard"
Cohesion: 0.42
Nodes (9): getDashboardChartContext(), getDashboardMonthStart(), loadDashboardAttentionMetrics(), loadDashboardData(), loadDashboardMetrics(), loadProductDistributionChart(), showDashboardChartPlaceholder(), truncateDashboardLabel() (+1 more)

### Community 18 - "Print Axis Orders"
Cohesion: 0.36
Nodes (6): autofillTrucInData(), calculateTrucIn(), clearFormTrucIn(), saveTrucIn(), TRUC_IN_INSERT_COLUMNS, trucInSavingModes

### Community 19 - "email/index.ts"
Cohesion: 0.08
Nodes (56): Reviewed with no change needed, containsLink(), escapeHtml(), escapeMultiline(), HTML_ESCAPES, oneLine(), safeUrl(), FakeSender (+48 more)

### Community 20 - "Sales Quote UI Concepts"
Cohesion: 0.50
Nodes (4): Old/New Axis Type Switch, Separated Sales and Quotation UI Grouping, Electron Application Main UI, Release Notes 1.5.13

### Community 21 - "Quotation VAT Concepts"
Cohesion: 0.50
Nodes (4): Multi-size Multi-price Multi-axis Quotation, VAT-aware Order and Axis Accounting, Release Notes 1.5.12, Release Notes 1.5.14

### Community 22 - "Brand Assets"
Cohesion: 0.50
Nodes (4): Vĩnh Thịnh Application Icon, Vĩnh Thịnh Icon Variant, Vĩnh Thịnh Logo, Bang Keo Vinh Thinh SVG Logo

### Community 23 - "sessions.ts"
Cohesion: 0.08
Nodes (63): @supabase/supabase-js, actors(), history(), designRow(), FORBIDDEN_FOR_STAFF, leadRow(), leads, CHILD_TABLES (+55 more)

### Community 25 - "utils.test.js"
Cohesion: 0.13
Nodes (4): utils, assert, innerHTML(), test

### Community 26 - "chart.umd.js"
Cohesion: 0.02
Nodes (98): addElements(), ao(), b(), beforeDatasetDraw(), beforeDatasetsDraw(), beforeDraw(), beforeLayout(), ca() (+90 more)

### Community 28 - "make_xlsx_lib"
Cohesion: 0.03
Nodes (116): make_xlsx_lib(), Al(), am(), as(), Ba(), Bd(), bf(), bl() (+108 more)

### Community 29 - "ct"
Cohesion: 0.06
Nodes (70): mt(), ah(), ap(), At(), bc(), bg(), bh(), bm() (+62 more)

### Community 31 - "Ra"
Cohesion: 0.06
Nodes (73): nt(), ab(), av(), bb(), bp(), cf(), Ci(), cp() (+65 more)

### Community 32 - "ns"
Cohesion: 0.06
Nodes (15): As(), _calculateBarIndexPixels(), _calculateBarValuePixels(), getLabelAndValue(), _getRuler(), _getStackCount(), _getStackIndex(), _getStacks() (+7 more)

### Community 33 - "sk"
Cohesion: 0.05
Nodes (97): ai(), at(), aA(), Ai(), bo(), bt(), Cc(), Cv() (+89 more)

### Community 34 - "Js"
Cohesion: 0.07
Nodes (6): Ae(), d(), Ie(), Js, Xs(), ze()

### Community 35 - "va"
Cohesion: 0.08
Nodes (14): Ee(), f(), generateLabels(), Hs, initialize(), ki(), Le(), Oi() (+6 more)

### Community 36 - "xe"
Cohesion: 0.18
Nodes (34): ae(), ag(), be(), ce(), De(), dr(), Ee(), fe() (+26 more)

### Community 39 - "no"
Cohesion: 0.11
Nodes (7): buildLookupTable(), Fo(), _generate(), _getTimestampsForTable(), initOffsets(), no, zo()

### Community 40 - "s"
Cohesion: 0.11
Nodes (13): bo, et(), fe(), H(), ii(), js(), ks(), label() (+5 more)

### Community 41 - "zt"
Cohesion: 0.12
Nodes (8): Ft(), It(), kt(), qt(), _t(), wt(), Xt(), zt()

### Community 42 - "yw"
Cohesion: 0.28
Nodes (32): aw(), B(), bw(), cw(), dw(), ew(), fw(), gw() (+24 more)

### Community 43 - "n"
Cohesion: 0.10
Nodes (8): Cs, Do(), n(), ne(), numeric(), Oe(), os(), Residual risks and follow-ups

### Community 44 - "assignment/server/actions.ts"
Cohesion: 0.11
Nodes (25): AssignForm(), Props, t, TONE, AssignPanel(), AssignActionState, AssignInput, assignSchema (+17 more)

### Community 45 - "dbPolicy.js"
Cohesion: 0.07
Nodes (30): ALLOWED_TABLES, assertAllowedTable(), CLAUSE_KEYWORDS, FORBIDDEN_FUNCTIONS, FORBIDDEN_IDENTIFIERS, FORBIDDEN_PREFIXES, FROM_SYNTAX_FUNCTIONS, isForbiddenIdentifier() (+22 more)

### Community 46 - "rs"
Cohesion: 0.08
Nodes (13): be(), ct(), ge(), gs(), ls, ms(), pe(), ps() (+5 more)

### Community 47 - "ref_node_path"
Cohesion: 0.07
Nodes (23): assert, fakeConfigPath, fs, os, path, savedEnv, tempDir, test (+15 more)

### Community 49 - "registry.js"
Cohesion: 0.11
Nodes (31): columnValue(), COMMON_HEAD, COMMON_STATUS, INSERT_COLUMNS, pickOrderColumns(), UPDATE_EXCLUDED, bool(), dateOnly() (+23 more)

### Community 50 - "de"
Cohesion: 0.19
Nodes (5): ce(), de, he(), qs(), te()

### Community 51 - "config.js"
Cohesion: 0.07
Nodes (23): applySecretResolver(), BUNDLED_SSL_CA_PATH, configCandidates(), configWarnings, fs, loaded, loadLocalConfig(), LOCAL_HOSTS (+15 more)

### Community 52 - "ipcPolicy.js"
Cohesion: 0.06
Nodes (37): ALLOWED_LOG_LEVELS, ALLOWED_OPEN_PROPERTIES, ALLOWED_REMOTE_ORIGINS, EXTERNAL_URL_ALLOWLIST, fileUrlPath(), fileUrlToLocalPath(), isAllowedRendererRequest(), isTrustedAppUrl() (+29 more)

### Community 53 - "workshop/components/sections.tsx"
Cohesion: 0.20
Nodes (21): AdvanceStepForm(), AssignWorkshopForm(), ConvertForm(), JobDesign(), ProductionHandoffPanel(), t, WorkshopDashboard(), WorkshopJobView() (+13 more)

### Community 54 - "web.ts"
Cohesion: 0.07
Nodes (39): vitest, ActionCall, actionResult(), ACTIONS, appSession(), assertLocal(), baseHeaders(), callAction() (+31 more)

### Community 55 - "statsConsistency.test.js"
Cohesion: 0.11
Nodes (13): quoteConversionSql(), settlementToggleSql(), settlementUpdateSql(), writeActions, assert, debtSampleRows, fs, harness() (+5 more)

### Community 56 - "JobCard.tsx"
Cohesion: 0.15
Nodes (21): JobCard(), t, dateTime(), JobSpecs(), Row(), StepHistory(), t, ColorSwatches() (+13 more)

### Community 57 - "updater.js"
Cohesion: 0.15
Nodes (20): initializeUpdateListeners(), nextUpdateMilestone(), assert, test, { app, dialog, BrowserWindow }, checkForUpdatesManual(), createUpdateStateMachine(), currentDialogWindow() (+12 more)

### Community 58 - "actions-edit.ts"
Cohesion: 0.09
Nodes (49): dynamic, metadata, QuoteTokenPage(), fmtDate(), Message(), PublicQuotePage(), Props, qty() (+41 more)

### Community 59 - "portableConfigCrypto.js"
Cohesion: 0.15
Nodes (19): exportDatabaseConfig(), unlockPortableConfig(), checkScryptParams(), crypto, decodeB64(), decryptPortableConfig(), DEFAULT_SCRYPT, deriveKey() (+11 more)

### Community 60 - "src/lib/types.ts"
Cohesion: 0.07
Nodes (27): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+19 more)

### Community 61 - "LeadsTable.tsx"
Cohesion: 0.15
Nodes (24): LeadLiveRefresher(), LeadsLiveRefresher(), hook, Options, useLeadRealtime(), markLeadSeen(), read(), useUnread() (+16 more)

### Community 62 - "deps.ts"
Cohesion: 0.08
Nodes (37): Findings and fixes, Not yet reviewable (features not written yet), Reviewed with no change needed, GET(), POST(), AUTH_RATE_LIMITS, TURNSTILE_ACTION, createLeadSubmitDeps() (+29 more)

### Community 63 - "ref_node_fs"
Cohesion: 0.22
Nodes (8): headers, ids, index, maxField(), rows, sheet, toMillis(), used

### Community 65 - "scene.test.ts"
Cohesion: 0.23
Nodes (19): DrinkCup(), Props, StickerBand(), toPoints(), CUP_BAND_MAX_MM, CUP_CENTER_Y_MM, CUP_MM, cupBand (+11 more)

### Community 66 - "quotes.ts"
Cohesion: 0.15
Nodes (33): serviceClient(), signInAs(), baseHeaders(), getPage(), HttpOptions, mainText(), postJson(), postRaw() (+25 more)

### Community 67 - "workshop/server/actions.ts"
Cohesion: 0.11
Nodes (33): leadIdSchema, changeStatusSchema, uuidSchema, AdvanceInput, advanceSchema, AssignInput, assignSchema, ConvertInput (+25 more)

### Community 68 - "ref_node_assert"
Cohesion: 0.08
Nodes (17): assert, { minimatch }, REQUIRED_EXCLUDES, SECRET_PATHS, test, assert, fs, path (+9 more)

### Community 69 - "send-deps.ts"
Cohesion: 0.23
Nodes (13): @react-pdf/renderer, @react-pdf/renderer@^4.9.0, ensurePdfFonts(), fmtDate(), fmtQty(), makeStyles(), QuoteDocument(), QuotePdfData (+5 more)

### Community 70 - "upload-validation.ts"
Cohesion: 0.15
Nodes (16): EXTENSION, JPEG, looksLikeSvg(), PNG, SniffedType, sniffImageType(), startsWith(), AttrHookData (+8 more)

### Community 71 - "getDictionary"
Cohesion: 0.14
Nodes (22): HomePage(), CartonTapeArt(), REPEATS, Contact(), clean(), ContactInfo, contactInfoFromEnv(), Env (+14 more)

### Community 72 - "MockupScene.tsx"
Cohesion: 0.19
Nodes (16): @react-three/fiber, @react-three/fiber@^9.8.2, Controls, FitCamera(), CartonBox, DrinkCup, MockupScene(), MockupSceneProps (+8 more)

### Community 73 - "Q: which is the correct folder that has all the source code for this application"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: which is the correct folder that has all the source code for this application, Source Nodes

### Community 74 - "Q: inspect printing module; A5 paper size cannot pass to real printer"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: inspect printing module; A5 paper size cannot pass to real printer, Source Nodes

### Community 75 - "Q: Kiểm tra và sửa việc ẩn số tiền chiết khấu trên phiếu báo giá và đơn đặt hàng khi không có mặt hàng chiết khấu"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Kiểm tra và sửa việc ẩn số tiền chiết khấu trên phiếu báo giá và đơn đặt hàng khi không có mặt hàng chiết khấu, Source Nodes

### Community 76 - "Q: không phải chỉ mỗi báo giá, mà là toàn bộ app"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: không phải chỉ mỗi báo giá, mà là toàn bộ app, Source Nodes

### Community 77 - "Q: commit gh, build new release"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: commit gh, build new release, Source Nodes

### Community 78 - "Q: tôi cần nâng cấp thêm phần mềm nhưng chưa biết nâng cấp gì; gợi ý giúp tôi"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: tôi cần nâng cấp thêm phần mềm nhưng chưa biết nâng cấp gì; gợi ý giúp tôi, Source Nodes

### Community 79 - "Q: có online database nào free không? suprabase đầy mất rồi"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: có online database nào free không? suprabase đầy mất rồi, Source Nodes

### Community 80 - "Q: ergress đầy rồi làm sao"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: ergress đầy rồi làm sao, Source Nodes

### Community 81 - "Q: đây là kết quả từ suprabase; thử query xem dữ liệu mới nhất là từ bao giờ; phương án clone qua db nào là hợp lý?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: đây là kết quả từ suprabase; thử query xem dữ liệu mới nhất là từ bao giờ; phương án clone qua db nào là hợp lý?, Source Nodes

### Community 82 - "Q: có cách nào giảm bớt egress không? hướng sử dụng Redish thì sao"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: có cách nào giảm bớt egress không? hướng sử dụng Redish thì sao, Source Nodes

### Community 83 - "Q: tôi cần giảm bớt egress; có cách nào áp dụng được liền không?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: tôi cần giảm bớt egress; có cách nào áp dụng được liền không?, Source Nodes

### Community 84 - "Q: tôi muốn hiển thị thêm số tiền VAT trong tất cả các tab lên đơn"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: tôi muốn hiển thị thêm số tiền VAT trong tất cả các tab lên đơn, Source Nodes

### Community 85 - "Q: lọc bị lỗi, tôi không thể xóa filter sau khi đã edit, xem lại và sửa module filter"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: lọc bị lỗi, tôi không thể xóa filter sau khi đã edit, xem lại và sửa module filter, Source Nodes

### Community 86 - "Q: Sửa đơn thiếu hoa hồng; filter cần sắp xếp; Excel trục thiếu thông tin; rà soát nhất quán và sửa lỗi tồn đọng"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Sửa đơn thiếu hoa hồng; filter cần sắp xếp; Excel trục thiếu thông tin; rà soát nhất quán và sửa lỗi tồn đọng, Source Nodes

### Community 87 - "Quản lý Băng Keo Vĩnh Thịnh v1.5.15"
Cohesion: 0.50
Nodes (3): Kết nối cloud, Lưu ý bảo mật, Quản lý Băng Keo Vĩnh Thịnh v1.5.15

### Community 88 - "Quản lý Băng Keo Vĩnh Thịnh v1.5.16"
Cohesion: 0.50
Nodes (3): Kiểm thử, Quản lý Băng Keo Vĩnh Thịnh v1.5.16, Thay đổi chính

### Community 89 - "Quản lý Băng Keo Vĩnh Thịnh v1.5.18"
Cohesion: 0.50
Nodes (3): Kiểm thử, Quản lý Băng Keo Vĩnh Thịnh v1.5.18, Thay đổi chính

### Community 90 - "Quản lý Băng Keo Vĩnh Thịnh v1.5.19"
Cohesion: 0.50
Nodes (3): Kiểm thử, Quản lý Băng Keo Vĩnh Thịnh v1.5.19, Thay đổi chính

### Community 92 - "createClient"
Cohesion: 0.11
Nodes (23): @supabase/ssr, @supabase/ssr@^0.12.7, GET(), handleAuthCallback(), WORKSHOP_REALTIME_TABLES, publicEnv, publicSchema, isProtectedPath() (+15 more)

### Community 93 - "secretStore.test.js"
Cohesion: 0.21
Nodes (16): resolveConfigSecrets(), writeUserConfig(), decryptConfigSecrets(), decryptValue(), encryptConfigSecrets(), encryptionAvailable(), encryptValue(), getAt() (+8 more)

### Community 94 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 95 - "jn"
Cohesion: 0.13
Nodes (11): Fn(), getMaxOverflow(), Gn(), jn, l(), parseArrayData(), parseObjectData(), parsePrimitiveData() (+3 more)

### Community 96 - "getDictionary"
Cohesion: 0.10
Nodes (38): next, NotFound(), AdminLayout(), metadata, t, AdminLeadPage(), t, AdminPage() (+30 more)

### Community 97 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, db:reset, db:start, db:test, db:types, dev, lint (+6 more)

### Community 98 - "server-only"
Cohesion: 0.06
Nodes (62): AdminPresetsPage(), t, InviteUserForm(), t, PresetForm(), t, AdminOverview(), PresetsSection() (+54 more)

### Community 99 - "orders/server/actions.ts"
Cohesion: 0.08
Nodes (40): Needs live verification with Docker (later pentest), Production step: lock down `storage_vectors` (after first deploy), ActionMessage(), fieldClass, primaryButtonClass, t, StatusForm(), t (+32 more)

### Community 100 - "send-quote.ts"
Cohesion: 0.12
Nodes (13): Checks run (round 2), Feature code review (round 2, 2026-10-31), Findings and fixes, Data, features/quotes, Layout, Routes, Rules (+5 more)

### Community 101 - "Web portal architecture"
Cohesion: 0.14
Nodes (12): customerDebtSqlExpression(), Data flows, Data model (see migrations), Environment variables (`.env.example`), Folder map, Roles / access matrix (enforced by RLS + triggers), Route ownership, Scripts (+4 more)

### Community 102 - "eo"
Cohesion: 0.11
Nodes (5): Bi(), Ci(), eo(), Fi(), zi()

### Community 103 - "auth/server/actions.ts"
Cohesion: 0.06
Nodes (60): zod, Defects found and fixes, zod@^4.6.7, metadata, ResetPasswordPage(), t, metadata, t (+52 more)

### Community 104 - "features/admin"
Cohesion: 0.33
Nodes (5): Data, features/admin, Layout, Routes, Rules

### Community 105 - "features/assignment"
Cohesion: 0.33
Nodes (5): Data, features/assignment, Layout, Routes, Rules

### Community 106 - "features/auth"
Cohesion: 0.33
Nodes (5): Data, features/auth, Layout, Routes, Rules

### Community 107 - "getDictionary"
Cohesion: 0.13
Nodes (26): checkStroke(), ColorField(), Props, DesignerPanel(), useDesignState(), LogoUpload(), MobileActionBar(), PalettePicker() (+18 more)

### Community 108 - "features/email"
Cohesion: 0.33
Nodes (5): Data, features/email, Layout, Routes, Rules

### Community 109 - "features/lead-intake"
Cohesion: 0.29
Nodes (6): Data, features/lead-intake, Implementation map, Layout, Routes, Rules

### Community 110 - "features/mockup3d"
Cohesion: 0.33
Nodes (5): Data, features/mockup3d, Layout, Routes, Rules

### Community 111 - "features/orders"
Cohesion: 0.33
Nodes (5): Data, features/orders, Layout, Routes, Rules

### Community 112 - "respond-route.ts"
Cohesion: 0.08
Nodes (21): dynamic, POST(), runtime, leadStatusAfterResponse(), respondSchema, RESPOND_HTTP_STATUS, RespondDeps, RespondError (+13 more)

### Community 113 - "orders/index.ts"
Cohesion: 0.08
Nodes (44): PortalPage(), Props, t, Card(), LeadDetailView(), Props, t, LeadsTable() (+36 more)

### Community 114 - "Security review: web portal, Supabase, Electron"
Cohesion: 0.09
Nodes (21): Attack surfaces that held, Changes, Checks run, Design (what is enforced where), Final results, Finding during this round (fixed before commit), Findings, Gates (2026-11-01, local, PG 15.14 image) (+13 more)

### Community 115 - "workshop/components/ui.tsx"
Cohesion: 0.16
Nodes (14): Props, t, Props, t, bigButton, DUE_LABEL, DUE_STYLE, field (+6 more)

### Community 119 - "fixtures.ts"
Cohesion: 0.18
Nodes (11): MAX_BODY_BYTES, MAX_FILE_BYTES, buildForm(), fakeStore, JPEG_BYTES, LEAD_ID, PNG_BYTES, PRESET (+3 more)

### Community 120 - "logo-load.ts"
Cohesion: 0.10
Nodes (28): LOGO_ACCEPT, LogoDropzone(), onFile(), CONVERT_MAX_SIDE, MAX_LOGO_BYTES, baseName(), ImageSizer, loadLogoFile() (+20 more)

### Community 121 - "quote-editor.tsx"
Cohesion: 0.17
Nodes (23): QuoteEditor(), save(), send(), Props, QuoteLineRow(), EditorLine, EditorState, emptyLine() (+15 more)

### Community 122 - "workshop/lib/lib.test.ts"
Cohesion: 0.25
Nodes (14): DueBadge(), addDays(), DEFAULT_DUE_DAYS, dueState, formatDueDate(), isIsoDate(), VN_TIME_ZONE, NOW (+6 more)

### Community 123 - "designer/index.ts"
Cohesion: 0.17
Nodes (16): @testing-library/react, DesignPage(), metadata, Ctx, DesignContext, DesignProvider(), setup(), DEFAULT_PRESETS (+8 more)

### Community 124 - "geometry.ts"
Cohesion: 0.15
Nodes (21): three, cachedHasWebGL(), Fallback(), MockupScene, noopSubscribe(), TapeMockup3D(), TapeMockup3DProps, Props (+13 more)

### Community 125 - "dependencies"
Cohesion: 0.11
Nodes (19): isomorphic-dompurify, konva, react-dom, react-konva, @react-three/drei, resend, dependencies, isomorphic-dompurify@^3.19.0 (+11 more)

### Community 126 - "handle-lead-submit.ts"
Cohesion: 0.17
Nodes (14): LeadNotifier, errorResponse(), handleLeadSubmit(), jsonResponse(), LeadSubmitDeps, NO_STORE, notifyNewLead(), toEmailData() (+6 more)

### Community 127 - "parse-submission.ts"
Cohesion: 0.14
Nodes (19): designJsonSchema, MAX_DESIGN_JSON_CHARS, designColors(), parseDesignJson(), ValidDesign, cleanText(), fieldErrors(), LeadFields (+11 more)

### Community 128 - "LeadForm.tsx"
Cohesion: 0.20
Nodes (13): @marsidev/react-turnstile, react, DesignLeadForm(), FormField(), Props, LeadForm(), LeadFormProps, Props (+5 more)

### Community 129 - "designer/index.ts"
Cohesion: 0.15
Nodes (23): DesignMockupBridge(), useDesignContext(), ExportButtons(), onJson(), onPng(), DesignExportApi, EMPTY_TEXTURE, useDesignExport() (+15 more)

### Community 130 - "palette.ts"
Cohesion: 0.20
Nodes (16): loadImage(), renderLogo(), useTintedLogo(), MAX_COLORS, contrastRatio(), hexToRgb(), isLowContrast(), logoInkColor() (+8 more)

### Community 131 - "api-contract.ts"
Cohesion: 0.21
Nodes (16): SubmitState, useLeadSubmit(), LEAD_ERROR_STATUS, LEAD_FIELDS, LeadErrorCode, LeadFieldName, LeadSubmitResponse, buildLeadFormData() (+8 more)

### Community 132 - "state.ts"
Cohesion: 0.12
Nodes (34): Props, RangeField(), FONT_FAMILIES, FontFamily, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_OFFSET_X (+26 more)

### Community 133 - "u"
Cohesion: 0.27
Nodes (4): dt(), u(), vn(), wn()

### Community 134 - "Supabase root CA (PostgreSQL TLS verification)"
Cohesion: 0.50
Nodes (3): Notes, Owner: add the certificate (one time), Supabase root CA (PostgreSQL TLS verification)

### Community 136 - "KonvaTapeStage.tsx"
Cohesion: 0.14
Nodes (30): KonvaTapeStage(), layoutForState(), measureTextWidth(), Selection, useStageInteraction(), NUDGE_STEP, PRINT_MARGIN_RATIO, PX_PER_MM (+22 more)

### Community 137 - "a"
Cohesion: 0.08
Nodes (14): a(), aa(), afterDatasetsUpdate(), buildTicks(), configure(), determineDataLimits(), Di(), getValueForPixel() (+6 more)

### Community 138 - "orderFlows.js"
Cohesion: 0.27
Nodes (9): assert, assertStatusLifecycle(), crypto, insertRow(), { Pool }, printedTapeData(), run(), standardData() (+1 more)

### Community 140 - "server-only"
Cohesion: 0.12
Nodes (18): server-only, loadPreviewImage(), LeadStore, PresetSnapshot, noopNotifier, ParsedSubmission, SavedLead, saveLead() (+10 more)

### Community 141 - "clients.ts"
Cohesion: 0.23
Nodes (8): Db, NO_SESSION, sessions, LOCAL_HOSTS, SEED_PASSWORD, SEED_USERS, SeedRole, SERVICE_KEY

### Community 142 - "vitest"
Cohesion: 0.09
Nodes (38): BASE_ORIGIN, BASE_URL, activePresetId(), assertLiveIntakeUp(), cleanupIntakeData(), createdCodes, designOfLead(), downloadText() (+30 more)

### Community 143 - "domActions.js"
Cohesion: 0.33
Nodes (9): createListener(), install(), invoke(), parseArgs(), reportHandlerError(), resolveAction(), resolveArgs(), resolveLexicalGlobal() (+1 more)

### Community 144 - "CartonBox.tsx"
Cohesion: 0.33
Nodes (8): CartonBox(), Props, TapeSegment(), refreshTexture(), useStripTexture(), CartonTapeSegment, cartonTapeSegments(), textureOffset()

### Community 145 - "quotes/lib/types.ts"
Cohesion: 0.12
Nodes (25): line, saveMock, sendMock, normalizeLine(), normalizeQuote(), num(), PublicQuote, QuoteLeadInfo (+17 more)

### Community 146 - "quotationUi.smoke.js"
Cohesion: 0.25
Nodes (6): appDirectory, assert, delay(), path, { spawn }, waitForPage()

### Community 147 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): metadata, t, viewport

### Community 148 - "quotationList.test.js"
Cohesion: 0.22
Nodes (5): assert, fs, path, test, vm

### Community 150 - "token.ts"
Cohesion: 0.19
Nodes (15): toPublicQuote(), createQuoteToken(), evaluateTokenAccess(), hashQuoteToken(), NewQuoteToken, QuoteStateLike, TokenAccess, TokenRowLike (+7 more)

### Community 151 - "next.config.ts"
Cohesion: 0.50
Nodes (3): nextConfig, HeaderEntry, staticSecurityHeaders()

### Community 153 - "signInCached"
Cohesion: 0.36
Nodes (8): forgetCachedSession(), isFresh(), keyOf(), readCache(), signInCached(), sleep(), withLock(), writeCache()

### Community 155 - "features/designer"
Cohesion: 0.33
Nodes (5): Data, features/designer, Layout, Routes, Rules

### Community 156 - "Md"
Cohesion: 0.24
Nodes (11): Dd(), La(), Ld(), ma(), Md(), Nd(), Pa(), Pd() (+3 more)

### Community 157 - "features/workshop"
Cohesion: 0.40
Nodes (4): Data (migration 0021), features/workshop, Routes, Rules

## Knowledge Gaps
- **10 isolated node(s):** `Electron Application Main UI`, `Old/New Axis Type Switch`, `Multi-size Multi-price Multi-axis Quotation`, `Release Notes 1.5.14`, `Vĩnh Thịnh Application Icon` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1115 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `web.ts` to `LeadForm.tsx`, `designer/index.ts`, `palette.ts`, `api-contract.ts`, `state.ts`, `KonvaTapeStage.tsx`, `vitest`, `web/package.json`, `quotes/lib/types.ts`, `email/index.ts`, `token.ts`, `sessions.ts`, `assignment/server/actions.ts`, `ref_node_path`, `ipcPolicy.js`, `actions-edit.ts`, `LeadsTable.tsx`, `deps.ts`, `scene.test.ts`, `quotes.ts`, `workshop/server/actions.ts`, `upload-validation.ts`, `getDictionary`, `createClient`, `getDictionary`, `server-only`, `orders/server/actions.ts`, `auth/server/actions.ts`, `getDictionary`, `respond-route.ts`, `orders/index.ts`, `fixtures.ts`, `logo-load.ts`, `quote-editor.tsx`, `workshop/lib/lib.test.ts`, `designer/index.ts`, `geometry.ts`, `parse-submission.ts`?**
  _High betweenness centrality (0.256) - this node is a cross-community bridge._
- **Are the 170 inferred relationships involving `make_xlsx_lib()` (e.g. with `aA()` and `Ad()`) actually correct?**
  _`make_xlsx_lib()` has 170 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Electron Application Main UI`, `Old/New Axis Type Switch`, `Multi-size Multi-price Multi-axis Quotation` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06836158192090395 - nodes in this community are weakly interconnected._
- **Why does `make_xlsx_lib()` connect `make_xlsx_lib` to `sk`, `xe`, `A`, `yw`, `Md`, `ct`, `Ra`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Are the 57 inferred relationships involving `A()` (e.g. with `an()` and `c()`) actually correct?**
  _`A()` has 57 INFERRED edges - model-reasoned connections that need verification._
- **Should `Statistics Module` be split into smaller, more focused modules?**
  _Cohesion score 0.06729264475743349 - nodes in this community are weakly interconnected._
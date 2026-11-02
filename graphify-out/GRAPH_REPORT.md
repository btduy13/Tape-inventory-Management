# Graph Report - Tape-inventory-Management  (2026-11-02)

## Corpus Check
- 685 files · ~320,937 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: .css 6, (none) 4, .ico 3)

## Summary
- 5058 nodes · 15708 edges · 169 communities (149 shown, 20 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 1083 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6c924cdc`
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
- ref_node_assert
- Excel Import
- A
- Order Math
- Printed Tape Orders
- Interaction Helpers
- n
- devDependencies
- Standard Tape Orders
- Dashboard
- Print Axis Orders
- email/index.ts
- Sales Quote UI Concepts
- Quotation VAT Concepts
- Brand Assets
- sessions.ts
- Release Workflow
- LandingB.tsx
- chart.umd.js
- make_xlsx_lib
- ct
- Legacy Release Notes
- Ra
- ns
- sk
- Js
- va
- portal-ui/index.ts
- admin/lib/schemas.ts
- an
- no
- s
- zt
- yw
- HeroA.tsx
- roles.ts
- dbPolicy.js
- rs
- MockupScene.tsx
- tn
- registry.js
- de
- config.js
- passphrasePrompt.test.js
- TapeLab.tsx
- web.ts
- actions-tape-specs.ts
- WorkflowStepper.tsx
- updater.js
- createClient
- portableConfigCrypto.js
- database.generated.ts
- TapeMockup3D.tsx
- deps.ts
- next
- En
- FitCamera.tsx
- quotes.ts
- getDictionary
- geometry.ts
- assign.ts
- api-contract.ts
- next
- respond-route.test.ts
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
- zod
- hooks.ts
- compilerOptions
- jn
- src/lib/types.ts
- scripts
- secretStore.test.js
- orders/server/actions.ts
- send-quote.ts
- Web portal architecture
- flows.test.ts
- domContract.test.js
- UsersView.tsx
- features/assignment
- features/auth
- getDictionary
- features/email
- features/lead-intake
- features/mockup3d
- features/orders
- turnstile.ts
- workshop/server/actions.ts
- Security review: web portal, Supabase, Electron
- auth/server/actions.ts
- AGENTS.md
- e2e/README.md
- quote-editor.tsx
- logo-load.ts
- KitDemo.tsx
- CartonBox.tsx
- lib/presets.ts
- scene.test.ts
- dependencies
- handle-lead-submit.ts
- parse-submission.ts
- LeadForm.tsx
- designer/index.ts
- logo-colors.ts
- api-contract.ts
- state.ts
- react
- Supabase root CA (PostgreSQL TLS verification)
- KonvaTapeStage.tsx
- o
- src/proxy.ts
- utils.test.js
- fixtures.ts
- save-lead.ts
- vitest
- auth/index.ts
- web/package.json
- orders/lib/lib.test.ts
- quotationUi.smoke.js
- ListQuery
- LeadLiveRefresher.tsx
- SEED_USERS.md
- public-quote-page.tsx
- LoadingState
- analyze.mjs
- app/layout.tsx
- Cs
- queries.test.ts
- ref_node_url
- features/admin
- eslint
- ScrollRegion.tsx
- features/workshop
- HeroWord.tsx
- @testing-library/jest-dom
- @testing-library/dom
- @types/node
- signInCached
- respond-route.ts
- next.config.ts

## God Nodes (most connected - your core abstractions)
1. `make_xlsx_lib()` - 540 edges
2. `getDictionary()` - 147 edges
3. `vitest` - 134 edges
4. `Ra()` - 123 edges
5. `A()` - 102 edges
6. `format()` - 95 edges
7. `N()` - 73 edges
8. `react` - 73 edges
9. `Js` - 72 edges
10. `s()` - 68 edges

## Surprising Connections (you probably didn't know these)
- `Reviewed with no change needed` --references--> `innerHTML()`  [INFERRED]
  SECURITY_REPORT.md → electron/test/utils.test.js
- `Watermark + disclaimer` --references--> `sm()`  [INFERRED]
  web/src/features/mockup3d/README.md → electron/xlsx.full.min.js
- `Reviewed with no change needed` --references--> `a()`  [INFERRED]
  SECURITY_REPORT.md → electron/assets/vendor/chart.umd.js
- `Reviewed with no change needed` --references--> `to()`  [INFERRED]
  SECURITY_REPORT.md → electron/assets/vendor/chart.umd.js
- `Reviewed with no change needed` --references--> `escapeAppHtml()`  [INFERRED]
  SECURITY_REPORT.md → electron/js/app.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Quotation VAT UI and Release Flow** — electron_release_notes_1_5_12, electron_release_notes_1_5_13, electron_release_notes_1_5_14, concept_multi_dimension_quote, concept_vat_accounting, concept_sales_quote_ui_grouping, concept_release_auto_update [INFERRED 0.85]

## Communities (169 total, 20 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.04
Nodes (87): applySecretResolver(), toPublicDbError(), smtpSecurityOptions(), ALLOWED_LOG_LEVELS, ALLOWED_OPEN_PROPERTIES, ALLOWED_REMOTE_ORIGINS, createLogRateLimiter(), EXTERNAL_URL_ALLOWLIST (+79 more)

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
Cohesion: 0.06
Nodes (35): author, dependencies, electron-updater@^6.8.9, nodemailer@^10.0.10, pg@^8.11.5, description, devDependencies, electron@^43.1.0 (+27 more)

### Community 5 - "Build Configuration"
Cohesion: 0.08
Nodes (26): build, afterPack, appId, artifactName, asar, directories, executableName, extraFiles (+18 more)

### Community 6 - "Export and PDF"
Cohesion: 0.15
Nodes (24): buildExportLine(), buildExportProductsFromOrder(), buildVoucherPdfHtml(), deletePreviewProduct(), escapeExportHtml(), exportTodayFileDate(), formatExportQuantity(), generateCombinedPrintInvoice() (+16 more)

### Community 7 - "Email Dialog"
Cohesion: 0.13
Nodes (23): addEmailLocalAttachment(), closeEmailDialogModal(), EMAIL_SMTP_FIELD_IDS, emailAttachments, emailSuggestions, formatBangKeoEmailSpec(), formatBytes(), getEmailSmtpContainer() (+15 more)

### Community 8 - "ref_node_assert"
Cohesion: 0.03
Nodes (74): ALLOWED_TABLES, decodeBase64Strict(), isPlainEmailAddress(), sanitizeAttachmentName(), validateEmailPayload(), assert, fakeConfigPath, fs (+66 more)

### Community 9 - "Excel Import"
Cohesion: 0.14
Nodes (31): buildBangKeoInImportStatement(), buildExcelGetter(), buildImportInsertStatement(), buildSequentialOrderIds(), buildSimpleImportStatement(), buildValidImportDate(), calculateSimpleImport(), excelImportAliases (+23 more)

### Community 10 - "A"
Cohesion: 0.11
Nodes (104): ke(), A(), ae(), ak(), ar(), B(), be(), bk() (+96 more)

### Community 11 - "Order Math"
Cohesion: 0.26
Nodes (15): calculateLine(), calculatePrintedTape(), calculateQuoteBundle(), calculateQuoteItems(), calculateStandardOrder(), calculateVoucherTotals(), money(), nextOrderId() (+7 more)

### Community 12 - "Printed Tape Orders"
Cohesion: 0.20
Nodes (17): autofillBangKeoInData(), BANG_KEO_IN_INSERT_COLUMNS, bangKeoInSavingModes, buildOrderInsertValues(), calculateBangKeoIn(), calculateBangKeoInAxis(), clearBangKeoInAxisFields(), clearFormBangKeoIn() (+9 more)

### Community 13 - "Interaction Helpers"
Cohesion: 0.36
Nodes (7): focusRowFirstCell(), getActiveSearchInputId(), getEditableCellsInRow(), getFocusableFieldsInModal(), getOrderTableRows(), initCtrlFShortcut(), initOrderFormKeyboardNavigation()

### Community 14 - "n"
Cohesion: 0.08
Nodes (22): _calculateBarIndexPixels(), Fn(), getLabelAndValue(), getMaxOverflow(), _getRuler(), _getStackCount(), _getStackIndex(), _getStacks() (+14 more)

### Community 15 - "devDependencies"
Cohesion: 0.12
Nodes (15): @playwright/test, supabase, tailwindcss, @tailwindcss/turbopack, @types/react, typescript, devDependencies, @playwright/test@^1.64.1 (+7 more)

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
Cohesion: 0.10
Nodes (51): Reviewed with no change needed, containsLink(), escapeHtml(), escapeMultiline(), HTML_ESCAPES, oneLine(), safeUrl(), FakeSender (+43 more)

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
Cohesion: 0.07
Nodes (64): @supabase/supabase-js, actors(), history(), designRow(), FORBIDDEN_FOR_STAFF, leadRow(), leads, CHILD_TABLES (+56 more)

### Community 25 - "LandingB.tsx"
Cohesion: 0.11
Nodes (27): MauBPage(), metadata, CartonArt(), CupArt(), MOBILE_ROWS, ParcelArt(), RollFallback(), WidthScale() (+19 more)

### Community 26 - "chart.umd.js"
Cohesion: 0.03
Nodes (86): addElements(), ao(), be(), beforeDatasetDraw(), beforeDatasetsDraw(), beforeDraw(), beforeLayout(), buildLookupTable() (+78 more)

### Community 28 - "make_xlsx_lib"
Cohesion: 0.03
Nodes (122): make_xlsx_lib(), Al(), am(), ao(), as(), Ba(), Bd(), bf() (+114 more)

### Community 29 - "ct"
Cohesion: 0.05
Nodes (91): nt(), ag(), ah(), ap(), bg(), bh(), bm(), bn() (+83 more)

### Community 31 - "Ra"
Cohesion: 0.07
Nodes (65): ab(), an(), av(), bb(), bp(), bs(), cb(), cf() (+57 more)

### Community 32 - "ns"
Cohesion: 0.07
Nodes (8): As(), _calculateBarValuePixels(), initialize(), ns(), g(), rt(), updateElements(), zs()

### Community 33 - "sk"
Cohesion: 0.05
Nodes (113): ai(), at(), mt(), q(), aA(), Ai(), At(), bc() (+105 more)

### Community 34 - "Js"
Cohesion: 0.06
Nodes (9): Ae(), buildTicks(), d(), getValueForPixel(), init(), Js, po(), xo (+1 more)

### Community 35 - "va"
Cohesion: 0.06
Nodes (14): Ci(), eo(), f(), generateLabels(), Hs, ki(), Oi(), Si() (+6 more)

### Community 36 - "portal-ui/index.ts"
Cohesion: 0.08
Nodes (68): AutoSubmit(), ariaSort(), DataTable(), DataTableList, MobileCard(), MobileSort(), Props, SortHeader() (+60 more)

### Community 37 - "admin/lib/schemas.ts"
Cohesion: 0.09
Nodes (33): AdminActionState, checkbox, fail(), formToObject(), InviteInput, inviteSchema, isSelfLockout(), ok() (+25 more)

### Community 38 - "an"
Cohesion: 0.06
Nodes (8): an(), bt, dt(), Mn(), Re(), u(), vn(), wn()

### Community 39 - "no"
Cohesion: 0.10
Nodes (8): Bi(), Fi(), Fo(), _generate(), _getTimestampsForTable(), no, zi(), zo()

### Community 40 - "s"
Cohesion: 0.11
Nodes (12): bo, et(), H(), ii(), js(), label(), mo(), nn() (+4 more)

### Community 41 - "zt"
Cohesion: 0.12
Nodes (8): Ft(), It(), kt(), qt(), _t(), wt(), Xt(), zt()

### Community 42 - "yw"
Cohesion: 0.29
Nodes (31): aw(), bw(), cw(), dw(), ew(), fw(), gw(), Hw() (+23 more)

### Community 43 - "HeroA.tsx"
Cohesion: 0.07
Nodes (43): MauAPage(), metadata, Box(), BoxProps, CartonArt(), CupArt(), EcomArt(), pts() (+35 more)

### Community 44 - "roles.ts"
Cohesion: 0.09
Nodes (41): Route ownership, KitPage(), Props, AdminLayout(), metadata, t, AdminLeadPage(), AdminPresetsPage() (+33 more)

### Community 45 - "dbPolicy.js"
Cohesion: 0.11
Nodes (22): assertAllowedTable(), CLAUSE_KEYWORDS, FORBIDDEN_FUNCTIONS, FORBIDDEN_IDENTIFIERS, FORBIDDEN_PREFIXES, FROM_SYNTAX_FUNCTIONS, isForbiddenIdentifier(), JOIN_MODIFIERS (+14 more)

### Community 46 - "rs"
Cohesion: 0.08
Nodes (11): ct(), ge(), gs(), ls, ms(), ps(), rs, vs() (+3 more)

### Community 47 - "MockupScene.tsx"
Cohesion: 0.12
Nodes (25): @react-three/fiber, designPixel(), EyedropperPolicy(), PickHandlers, CartonBox, DrinkCup, MockupScene(), MockupSceneProps (+17 more)

### Community 49 - "registry.js"
Cohesion: 0.06
Nodes (44): columnValue(), COMMON_HEAD, COMMON_STATUS, INSERT_COLUMNS, pickOrderColumns(), UPDATE_EXCLUDED, bool(), dateOnly() (+36 more)

### Community 50 - "de"
Cohesion: 0.19
Nodes (5): ce(), de, he(), qs(), te()

### Community 51 - "config.js"
Cohesion: 0.09
Nodes (19): BUNDLED_SSL_CA_PATH, configCandidates(), configWarnings, fs, loaded, loadLocalConfig(), LOCAL_HOSTS, path (+11 more)

### Community 52 - "passphrasePrompt.test.js"
Cohesion: 0.11
Nodes (18): createPassphrasePrompt(), isPromptSender(), prompt(), register(), HTML_PATH, HTML_URL, MODES, path (+10 more)

### Community 53 - "TapeLab.tsx"
Cohesion: 0.12
Nodes (29): metadata, VariantCPage(), copy, fill(), Cta(), LandingC(), Process(), Box() (+21 more)

### Community 54 - "web.ts"
Cohesion: 0.07
Nodes (36): ActionCall, actionResult(), ACTIONS, appSession(), assertLocal(), baseHeaders(), callAction(), cookieHeaderFrom() (+28 more)

### Community 55 - "actions-tape-specs.ts"
Cohesion: 0.13
Nodes (30): AddWidthInput, addWidthSchema, LengthLimitsInput, lengthLimitsSchema, MoveWidthInput, moveWidthSchema, nextSortOrder(), reorderWidths() (+22 more)

### Community 56 - "WorkflowStepper.tsx"
Cohesion: 0.07
Nodes (44): LogoutButton(), AppShell(), BrandTile(), t, UserBlock(), IconName, PATHS, MobileNav() (+36 more)

### Community 57 - "updater.js"
Cohesion: 0.15
Nodes (20): initializeUpdateListeners(), nextUpdateMilestone(), assert, test, { app, dialog, BrowserWindow }, checkForUpdatesManual(), createUpdateStateMachine(), currentDialogWindow() (+12 more)

### Community 58 - "createClient"
Cohesion: 0.12
Nodes (42): Needs live verification with Docker (later pentest), Production step: lock down `storage_vectors` (after first deploy), assignLeadAction(), fmtDateTime(), QUOTE_TONE, QuoteReadOnly(), btnFor(), Props (+34 more)

### Community 59 - "portableConfigCrypto.js"
Cohesion: 0.15
Nodes (19): exportDatabaseConfig(), unlockPortableConfig(), checkScryptParams(), crypto, decodeB64(), decryptPortableConfig(), DEFAULT_SCRYPT, deriveKey() (+11 more)

### Community 60 - "database.generated.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 61 - "TapeMockup3D.tsx"
Cohesion: 0.09
Nodes (36): ColorPickerBridge, EyeDropperCtor, EyedropperToggle(), LoupeApi, noopSubscribe(), PickedColorFacts, PickHint(), PickLoupe() (+28 more)

### Community 62 - "deps.ts"
Cohesion: 0.08
Nodes (40): Findings and fixes, Not yet reviewable (features not written yet), Reviewed with no change needed, getEmailSender(), freshFactory(), MSG, loadPreviewImage(), ResendSender (+32 more)

### Community 63 - "next"
Cohesion: 0.07
Nodes (31): next, server-only, @supabase/ssr, @supabase/ssr@^0.12.7, metadata, VARIANTS, NotFound(), NotFound() (+23 more)

### Community 65 - "FitCamera.tsx"
Cohesion: 0.47
Nodes (7): Controls, FitCamera(), cameraPosition(), fitDistance(), orbitLimits(), refitDirection(), Vec3

### Community 66 - "quotes.ts"
Cohesion: 0.11
Nodes (42): Db, NO_SESSION, serviceClient(), sessions, signInAs(), BASE_ORIGIN, BASE_URL, LOCAL_HOSTS (+34 more)

### Community 67 - "getDictionary"
Cohesion: 0.04
Nodes (112): LeadSuccess(), t, Section(), linkClass, textareaClass, AdvanceStepForm(), Props, t (+104 more)

### Community 68 - "geometry.ts"
Cohesion: 0.18
Nodes (18): cupStripRibbon(), cupStripWidthMm(), CARTON_FLAP_MM, CARTON_MM, cartonStripRows(), CORE_INNER_DIAMETER_MM, CORE_WALL_MM, DEFAULT_THICKNESS_MIC (+10 more)

### Community 69 - "assign.ts"
Cohesion: 0.17
Nodes (12): AssignActionState, AssignInput, assignSchema, formToObject(), IDLE, assignLead(), AssignResult, Db (+4 more)

### Community 70 - "api-contract.ts"
Cohesion: 0.12
Nodes (20): isomorphic-dompurify, isomorphic-dompurify@^3.19.0, MAX_FILE_BYTES, EXTENSION, JPEG, looksLikeSvg(), PNG, SniffedType (+12 more)

### Community 71 - "next"
Cohesion: 0.10
Nodes (40): HomePage(), Box(), BoxProps, CartonTapeArt(), CupSealArt(), EX, EY, ParcelArt() (+32 more)

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

### Community 92 - "zod"
Cohesion: 0.23
Nodes (10): zod, zod@^4.6.7, WORKSHOP_REALTIME_TABLES, WorkshopLiveRefresher(), publicEnv, publicSchema, accessToken(), createClient() (+2 more)

### Community 93 - "hooks.ts"
Cohesion: 0.17
Nodes (18): DownloadIcon(), ExportButtons(), onJson(), onPng(), DesignExportApi, EMPTY_TEXTURE, useDesignExport(), buildDesignSubmission() (+10 more)

### Community 94 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 96 - "src/lib/types.ts"
Cohesion: 0.03
Nodes (119): AdminPage(), Props, PortalPage(), Props, CONTAIN_SCROLLERS, Props, t, LeadList() (+111 more)

### Community 97 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, db:reset, db:start, db:test, db:types, dev, lint (+6 more)

### Community 98 - "secretStore.test.js"
Cohesion: 0.21
Nodes (16): resolveConfigSecrets(), writeUserConfig(), decryptConfigSecrets(), decryptValue(), encryptConfigSecrets(), encryptionAvailable(), encryptValue(), getAt() (+8 more)

### Community 99 - "orders/server/actions.ts"
Cohesion: 0.12
Nodes (27): leadIdSchema, classifyDbError(), DbErrorKind, fail(), ok(), OrdersActionState, AddNoteInput, addNoteSchema (+19 more)

### Community 100 - "send-quote.ts"
Cohesion: 0.09
Nodes (26): @react-pdf/renderer, @react-pdf/renderer@^4.9.0, CLOSED, isSendable(), leadStatusAfterSend(), sendBlocker, visibleQuotes(), q() (+18 more)

### Community 101 - "Web portal architecture"
Cohesion: 0.15
Nodes (11): customerDebtSqlExpression(), Data flows, Data model (see migrations), Environment variables (`.env.example`), Folder map, Roles / access matrix (enforced by RLS + triggers), Scripts, Security rules (+3 more)

### Community 102 - "flows.test.ts"
Cohesion: 0.08
Nodes (33): Checks run (round 2), Feature code review (round 2, 2026-10-31), Findings and fixes, line, saveMock, sendMock, toPublicQuote(), tokenSchema (+25 more)

### Community 103 - "domContract.test.js"
Cohesion: 0.08
Nodes (17): createListener(), install(), invoke(), parseArgs(), reportHandlerError(), resolveAction(), resolveArgs(), resolveLexicalGlobal() (+9 more)

### Community 104 - "UsersView.tsx"
Cohesion: 0.08
Nodes (31): columns, dateFmt, t, AccessCell(), CELL, RoleMatrix(), t, user (+23 more)

### Community 105 - "features/assignment"
Cohesion: 0.33
Nodes (5): Data, features/assignment, Layout, Routes, Rules

### Community 106 - "features/auth"
Cohesion: 0.33
Nodes (5): Data, features/auth, Layout, Routes, Rules

### Community 107 - "getDictionary"
Cohesion: 0.07
Nodes (58): QUOTE_ANCHOR, VIEW3D_ANCHOR, DesignerPanel(), ORDER, Step(), StepId, StepProps, DesignMockupBridge() (+50 more)

### Community 108 - "features/email"
Cohesion: 0.33
Nodes (5): Data, features/email, Layout, Routes, Rules

### Community 109 - "features/lead-intake"
Cohesion: 0.29
Nodes (6): Data, features/lead-intake, Implementation map, Layout, Routes, Rules

### Community 110 - "features/mockup3d"
Cohesion: 0.25
Nodes (7): Data, features/mockup3d, Layout, Routes, Rules, True scale (one mm system, 1 scene unit = 100 mm), Watermark + disclaimer

### Community 111 - "features/orders"
Cohesion: 0.33
Nodes (5): Data, features/orders, Layout, Routes, Rules

### Community 112 - "turnstile.ts"
Cohesion: 0.33
Nodes (4): TURNSTILE_ACTION, SiteverifyResponse, TURNSTILE_VERIFY_URL, TurnstileOptions

### Community 113 - "workshop/server/actions.ts"
Cohesion: 0.13
Nodes (30): 1. Audit (what exists today, all kept), AdvanceInput, advanceSchema, AssignInput, ConvertInput, convertSchema(), fail(), formToObject() (+22 more)

### Community 114 - "Security review: web portal, Supabase, Electron"
Cohesion: 0.11
Nodes (17): Attack surfaces that held, Changes, Checks run, Design (what is enforced where), Finding during this round (fixed before commit), Findings, Gates (2026-11-01, local, PG 15.14 image), Gates (2026-11-01, local, PG 15.14 image) (+9 more)

### Community 115 - "auth/server/actions.ts"
Cohesion: 0.07
Nodes (49): Defects found and fixes, Final results, Open after this round, Security regression suite, Suites and rules covered, buttonClass, FormMessage(), inputClass (+41 more)

### Community 119 - "quote-editor.tsx"
Cohesion: 0.13
Nodes (27): QuoteEditor(), save(), send(), Props, QuoteLineRow(), EditorLine, EditorState, emptyLine() (+19 more)

### Community 120 - "logo-load.ts"
Cohesion: 0.10
Nodes (29): LOGO_ACCEPT, LogoDropzone(), onFile(), CONVERT_MAX_SIDE, MAX_LOGO_BYTES, analyzeLogoUrl(), baseName(), ImageSizer (+21 more)

### Community 121 - "KitDemo.tsx"
Cohesion: 0.11
Nodes (25): Crumb, PageHeaderProps, SectionProps, StatCardProps, Badge(), Size, StatusBadge(), StepBadge() (+17 more)

### Community 122 - "CartonBox.tsx"
Cohesion: 0.19
Nodes (17): three, CartonBox(), Props, DrinkCup(), Props, toPoints(), Props, TapeRibbon() (+9 more)

### Community 123 - "lib/presets.ts"
Cohesion: 0.35
Nodes (7): DEFAULT_PRESETS, normalizePresets(), num(), presetKey(), toPresetOption(), getActivePresets(), { createClient }

### Community 124 - "scene.test.ts"
Cohesion: 0.15
Nodes (25): columnSection(), CUP_CENTER_Y_MM, CUP_MM, CUP_STRIP_MAX_MM, CUP_STRIP_MIN_MM, cupLidOutline(), cupLidProfile(), cupRadiusAt() (+17 more)

### Community 125 - "dependencies"
Cohesion: 0.13
Nodes (15): react-dom, react-konva, @react-three/drei, resend, dependencies, next@16.4.3, react@19.3.0, react-dom@19.3.0 (+7 more)

### Community 126 - "handle-lead-submit.ts"
Cohesion: 0.15
Nodes (16): LeadNotifier, NewLeadEmailData, errorResponse(), handleLeadSubmit(), jsonResponse(), LeadSubmitDeps, NO_STORE, noopNotifier (+8 more)

### Community 127 - "parse-submission.ts"
Cohesion: 0.18
Nodes (15): designColors(), parseDesignJson(), ValidDesign, cleanText(), fieldErrors(), LeadFields, LeadFieldsInput, leadFieldsSchema (+7 more)

### Community 128 - "LeadForm.tsx"
Cohesion: 0.24
Nodes (11): @marsidev/react-turnstile, @marsidev/react-turnstile@^1.6.3, FormField(), Props, LeadForm(), LeadFormProps, Props, TurnstileWidget (+3 more)

### Community 129 - "designer/index.ts"
Cohesion: 0.09
Nodes (33): @testing-library/react, DesignPage(), metadata, setup(), Ctx, DesignContext, DesignProvider(), setup() (+25 more)

### Community 130 - "logo-colors.ts"
Cohesion: 0.05
Nodes (58): checkStroke(), ColorField(), Props, selectedRing, SWATCHES, ANALYSIS_MAX_SIDE, analyzeLogoPixels(), Cluster (+50 more)

### Community 131 - "api-contract.ts"
Cohesion: 0.18
Nodes (18): SubmitState, useLeadSubmit(), LEAD_ERROR_STATUS, LEAD_FIELDS, LeadErrorCode, LeadFieldName, LeadSubmitResponse, MAX_BODY_BYTES (+10 more)

### Community 132 - "state.ts"
Cohesion: 0.11
Nodes (36): EXPORT_PIXEL_RATIO, FONT_FAMILIES, FontFamily, INK_DISPLAY_CAP, MAX_FONT_SIZE_PX, MAX_LOGO_OFFSET, MAX_LOGO_SCALE, MAX_OFFSET_X (+28 more)

### Community 133 - "react"
Cohesion: 0.07
Nodes (77): react, PortalError(), PortalError(), FormDialog(), Props, PresetActions(), AddPresetDialog(), EditPresetDialog() (+69 more)

### Community 134 - "Supabase root CA (PostgreSQL TLS verification)"
Cohesion: 0.50
Nodes (3): Notes, Owner: add the certificate (one time), Supabase root CA (PostgreSQL TLS verification)

### Community 136 - "KonvaTapeStage.tsx"
Cohesion: 0.11
Nodes (36): konva, konva@^10.9.0, KonvaTapeStage(), layoutForState(), measureTextWidth(), loadImage(), renderLogo(), useLogoCanvas() (+28 more)

### Community 137 - "o"
Cohesion: 0.05
Nodes (32): a(), aa(), afterDatasetsUpdate(), b(), bn, configure(), determineDataLimits(), Di() (+24 more)

### Community 138 - "src/proxy.ts"
Cohesion: 0.20
Nodes (14): GET(), POST(), dynamic, POST(), runtime, isProtectedPath(), buildCsp(), CspOptions (+6 more)

### Community 139 - "utils.test.js"
Cohesion: 0.13
Nodes (4): utils, assert, innerHTML(), test

### Community 140 - "fixtures.ts"
Cohesion: 0.18
Nodes (10): buildForm(), DESIGN, fakeStore, JPEG_BYTES, LEAD_ID, PNG_BYTES, PRESET_ID, SPEC (+2 more)

### Community 141 - "save-lead.ts"
Cohesion: 0.19
Nodes (9): LeadStore, ParsedSubmission, InvalidTapeSizeError, SavedLead, saveLead(), SaveMeta, STORAGE_BUCKETS, StorageBucket (+1 more)

### Community 142 - "vitest"
Cohesion: 0.10
Nodes (40): vitest, setEmailSender(), randomIp(), activePresetId(), assertLiveIntakeUp(), captureEmails(), cleanupIntakeData(), createdCodes (+32 more)

### Community 143 - "auth/index.ts"
Cohesion: 0.21
Nodes (12): GET(), metadata, ResetPasswordPage(), t, metadata, t, UpdatePasswordPage(), AuthCard() (+4 more)

### Community 144 - "web/package.json"
Cohesion: 0.14
Nodes (13): jsdom, @types/react-dom, @types/three, @vitejs/plugin-react, jsdom@^29.1.1, @types/react-dom@^19, @types/three@^0.187.0, @vitejs/plugin-react@^6.1.2 (+5 more)

### Community 145 - "orders/lib/lib.test.ts"
Cohesion: 0.32
Nodes (14): markLeadSeen(), read(), useUnread(), write(), BASELINE_STORAGE_KEY, countUnread(), isUnread(), markSeen() (+6 more)

### Community 146 - "quotationUi.smoke.js"
Cohesion: 0.25
Nodes (6): appDirectory, assert, delay(), path, { spawn }, waitForPage()

### Community 148 - "LeadLiveRefresher.tsx"
Cohesion: 0.23
Nodes (10): LeadLiveRefresher(), LeadsLiveRefresher(), hook, Options, useLeadRealtime(), ChangePayload, leadFilter(), lostAssignment() (+2 more)

### Community 150 - "public-quote-page.tsx"
Cohesion: 0.23
Nodes (10): dynamic, metadata, QuoteTokenPage(), fmtDate(), Message(), PublicQuotePage(), Props, qty() (+2 more)

### Community 151 - "LoadingState"
Cohesion: 0.27
Nodes (6): Loading(), Loading(), Loading(), Loading(), Loading(), LoadingState()

### Community 152 - "analyze.mjs"
Cohesion: 0.22
Nodes (8): headers, ids, index, maxField(), rows, sheet, toMillis(), used

### Community 153 - "app/layout.tsx"
Cohesion: 0.33
Nodes (3): metadata, t, viewport

### Community 155 - "queries.test.ts"
Cohesion: 0.40
Nodes (3): chain(), b, fakeDb()

### Community 157 - "features/admin"
Cohesion: 0.40
Nodes (4): Data, features/admin, Layout, Rules

### Community 158 - "eslint"
Cohesion: 0.33
Nodes (5): eslint, eslint-config-next, eslintConfig, eslint@^9, eslint-config-next@16.4.3

### Community 159 - "ScrollRegion.tsx"
Cohesion: 0.50
Nodes (3): ScrollRegion(), ScrollRegionProps, 7. Tokens (globals.css, section "Portal", prefix `pt-`)

### Community 160 - "features/workshop"
Cohesion: 0.40
Nodes (4): Data (migration 0021), features/workshop, Routes, Rules

### Community 161 - "HeroWord.tsx"
Cohesion: 0.27
Nodes (9): DESKTOP, HeroWord(), Layout, Letter, Letters(), MOBILE, Roll(), Tape (+1 more)

### Community 167 - "signInCached"
Cohesion: 0.36
Nodes (8): forgetCachedSession(), isFresh(), keyOf(), readCache(), signInCached(), sleep(), withLock(), writeCache()

### Community 169 - "respond-route.ts"
Cohesion: 0.09
Nodes (21): leadStatusAfterResponse(), respondSchema, Data, features/quotes, Layout, Routes, Rules, RESPOND_HTTP_STATUS (+13 more)

### Community 171 - "next.config.ts"
Cohesion: 0.50
Nodes (3): nextConfig, HeaderEntry, staticSecurityHeaders()

## Knowledge Gaps
- **10 isolated node(s):** `Electron Application Main UI`, `Old/New Axis Type Switch`, `Multi-size Multi-price Multi-axis Quotation`, `Release Notes 1.5.14`, `Vĩnh Thịnh Application Icon` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1307 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `designer/index.ts`, `logo-colors.ts`, `api-contract.ts`, `state.ts`, `KonvaTapeStage.tsx`, `ref_node_assert`, `src/proxy.ts`, `fixtures.ts`, `devDependencies`, `web/package.json`, `orders/lib/lib.test.ts`, `email/index.ts`, `LeadLiveRefresher.tsx`, `public-quote-page.tsx`, `sessions.ts`, `queries.test.ts`, `ref_node_url`, `ScrollRegion.tsx`, `portal-ui/index.ts`, `admin/lib/schemas.ts`, `respond-route.ts`, `roles.ts`, `web.ts`, `actions-tape-specs.ts`, `WorkflowStepper.tsx`, `deps.ts`, `next`, `quotes.ts`, `getDictionary`, `geometry.ts`, `assign.ts`, `api-contract.ts`, `next`, `respond-route.test.ts`, `hooks.ts`, `src/lib/types.ts`, `orders/server/actions.ts`, `send-quote.ts`, `flows.test.ts`, `UsersView.tsx`, `getDictionary`, `turnstile.ts`, `workshop/server/actions.ts`, `auth/server/actions.ts`, `quote-editor.tsx`, `logo-load.ts`, `lib/presets.ts`, `scene.test.ts`, `parse-submission.ts`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Are the 170 inferred relationships involving `make_xlsx_lib()` (e.g. with `aA()` and `Ad()`) actually correct?**
  _`make_xlsx_lib()` has 170 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Electron Application Main UI`, `Old/New Axis Type Switch`, `Multi-size Multi-price Multi-axis Quotation` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.039733676975945015 - nodes in this community are weakly interconnected._
- **Why does `make_xlsx_lib()` connect `make_xlsx_lib` to `sk`, `A`, `yw`, `ct`, `Ra`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Are the 58 inferred relationships involving `A()` (e.g. with `an()` and `c()`) actually correct?**
  _`A()` has 58 INFERRED edges - model-reasoned connections that need verification._
- **Should `Statistics Module` be split into smaller, more focused modules?**
  _Cohesion score 0.06729264475743349 - nodes in this community are weakly interconnected._
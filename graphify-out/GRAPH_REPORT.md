# Graph Report - .  (2026-08-03)

## Corpus Check
- 54 files · ~61,621 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 445 nodes · 712 edges · 31 communities (27 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Security and Policy
- Statistics Module
- Quotation Workflow
- Application UI
- Electron Dependencies
- Build Configuration
- Export and PDF
- Email Dialog
- Configuration and Tests
- Excel Import
- Packaging Files
- Order Math
- Printed Tape Orders
- Interaction Helpers
- DOM Contract Tests
- Quotation UI Tests
- Standard Tape Orders
- Dashboard
- Print Axis Orders
- Quotation PDF Tests
- Sales Quote UI Concepts
- Quotation VAT Concepts
- Brand Assets
- Release Workflow
- Shared Utilities
- Preload Bridge
- Legacy Release Notes

## God Nodes (most connected - your core abstractions)
1. `files` - 17 edges
2. `setupIpcHandlers()` - 13 edges
3. `build` - 12 edges
4. `initializeQuoteDrafts()` - 11 edges
5. `number()` - 10 edges
6. `nsis` - 10 edges
7. `renderQuoteDraftTabs()` - 9 edges
8. `loadQuoteIntoEditor()` - 9 edges
9. `mapBangKeoInImport()` - 8 edges
10. `mapSimpleImport()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Vĩnh Thịnh Application Icon` --semantically_similar_to--> `Vĩnh Thịnh Logo`  [INFERRED] [semantically similar]
  electron/assets/app-icon.png → electron/assets/logo.png
- `Vĩnh Thịnh Icon Variant` --semantically_similar_to--> `Vĩnh Thịnh Logo`  [INFERRED] [semantically similar]
  electron/assets/icon.png → electron/assets/logo.png
- `Bang Keo Vinh Thinh SVG Logo` --semantically_similar_to--> `Vĩnh Thịnh Logo`  [INFERRED] [semantically similar]
  electron/assets/logo.svg → electron/assets/logo.png
- `Electron Application Main UI` --implements--> `Separated Sales and Quotation UI Grouping`  [INFERRED]
  electron/index.html → electron/RELEASE_NOTES_1.5.13.md
- `setupIpcHandlers()` --calls--> `validateRendererSql()`  [EXTRACTED]
  electron/main.js → electron/dbPolicy.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Quotation VAT UI and Release Flow** — electron_release_notes_1_5_12, electron_release_notes_1_5_13, electron_release_notes_1_5_14, concept_multi_dimension_quote, concept_vat_accounting, concept_sales_quote_ui_grouping, concept_release_auto_update [INFERRED 0.85]

## Communities (31 total, 4 thin omitted)

### Community 0 - "Security and Policy"
Cohesion: 0.06
Nodes (52): validateRendererSql(), sanitizeAttachmentName(), validateEmailPayload(), ALLOWED_EXTERNAL_PROTOCOLS, ALLOWED_LOG_LEVELS, normalizeLogEntry(), validateExternalUrl(), { app, BrowserWindow, Menu, ipcMain, shell, dialog, nativeImage } (+44 more)

### Community 1 - "Statistics Module"
Cohesion: 0.08
Nodes (50): applyBulkStatsStatus(), applyHistoryFilters(), bindStatsRowEvents(), clearStatsColumnFilter(), closeStatsColumnFilterMenu(), createStatsAxisChildRow(), deleteAttachmentFile(), deleteSelectedHistory() (+42 more)

### Community 2 - "Quotation Workflow"
Cohesion: 0.10
Nodes (48): addCurrentQuoteAxis(), addQuoteDraft(), applyQuoteDraftFields(), applyQuotesFilters(), axisFromFields(), buildQuoteItem(), cancelQuoteEditing(), captureActiveQuoteDraft() (+40 more)

### Community 3 - "Application UI"
Cohesion: 0.10
Nodes (30): applyTheme(), buildEditInput(), closeModal(), commandPaletteActions, commandPaletteFilteredActions, escapeAppHtml(), executeCommandPaletteAction(), exportCurrentFormToExcel() (+22 more)

### Community 4 - "Electron Dependencies"
Cohesion: 0.08
Nodes (25): electron, electron-builder, author, dependencies, electron-updater, nodemailer, pg, description (+17 more)

### Community 5 - "Build Configuration"
Cohesion: 0.09
Nodes (23): build, appId, artifactName, asar, directories, executableName, extraResources, nsis (+15 more)

### Community 6 - "Export and PDF"
Cohesion: 0.18
Nodes (16): buildVoucherPdfHtml(), deletePreviewProduct(), escapeExportHtml(), generateCombinedPrintInvoice(), getExportTableNameByOrderId(), loadExportAllOrdersFromDb(), loadExportOrdersTable(), openMultiOrderExportDialog() (+8 more)

### Community 7 - "Email Dialog"
Cohesion: 0.15
Nodes (13): addEmailLocalAttachment(), closeEmailDialogModal(), emailAttachments, emailSuggestions, formatBytes(), loadEmailSmtpSettings(), onEmailToFocus(), onEmailToInput() (+5 more)

### Community 8 - "Configuration and Tests"
Cohesion: 0.14
Nodes (15): fs, loaded, path, pkg, assert, assertStatusLifecycle(), crypto, { DATABASE_URL } (+7 more)

### Community 9 - "Excel Import"
Cohesion: 0.24
Nodes (16): buildExcelGetter(), calculateSimpleImport(), excelImportAliases, excelImportConfigs, importOrdersFromExcel(), insertBangKeoInImport(), insertSimpleImport(), mapBangKeoInImport() (+8 more)

### Community 10 - "Packaging Files"
Cohesion: 0.12
Nodes (16): files, assets/**/*, config.js, !config.local.example.json, !config.local.json, dbPolicy.js, emailPolicy.js, icon.ico (+8 more)

### Community 11 - "Order Math"
Cohesion: 0.25
Nodes (13): calculateLine(), calculatePrintedTape(), calculateQuoteBundle(), calculateQuoteItems(), calculateStandardOrder(), calculateVoucherTotals(), number(), outstandingFromOrder() (+5 more)

### Community 12 - "Printed Tape Orders"
Cohesion: 0.31
Nodes (11): autofillBangKeoInData(), calculateBangKeoIn(), calculateBangKeoInAxis(), clearBangKeoInAxisFields(), clearFormBangKeoIn(), generateOrderId(), promptOrderAttachments(), saveBangKeoIn() (+3 more)

### Community 13 - "Interaction Helpers"
Cohesion: 0.36
Nodes (7): focusRowFirstCell(), getActiveSearchInputId(), getEditableCellsInRow(), getFocusableFieldsInModal(), getOrderTableRows(), initCtrlFShortcut(), initOrderFormKeyboardNavigation()

### Community 14 - "DOM Contract Tests"
Cohesion: 0.25
Nodes (6): assert, fs, html, path, root, test

### Community 15 - "Quotation UI Tests"
Cohesion: 0.29
Nodes (6): appDirectory, assert, delay(), path, { spawn }, waitForPage()

### Community 16 - "Standard Tape Orders"
Cohesion: 0.53
Nodes (4): autofillBangKeoData(), calculateBangKeo(), clearFormBangKeo(), saveBangKeo()

### Community 17 - "Dashboard"
Cohesion: 0.60
Nodes (5): loadDashboardAttentionMetrics(), loadDashboardData(), loadDashboardMetrics(), loadProductDistributionChart(), updateDashboardCharts()

### Community 18 - "Print Axis Orders"
Cohesion: 0.53
Nodes (4): autofillTrucInData(), calculateTrucIn(), clearFormTrucIn(), saveTrucIn()

### Community 19 - "Quotation PDF Tests"
Cohesion: 0.33
Nodes (5): assert, fs, path, quotationSource, test

### Community 20 - "Sales Quote UI Concepts"
Cohesion: 0.50
Nodes (4): Old/New Axis Type Switch, Separated Sales and Quotation UI Grouping, Electron Application Main UI, Release Notes 1.5.13

### Community 21 - "Quotation VAT Concepts"
Cohesion: 0.50
Nodes (4): Multi-size Multi-price Multi-axis Quotation, VAT-aware Order and Axis Accounting, Release Notes 1.5.12, Release Notes 1.5.14

### Community 22 - "Brand Assets"
Cohesion: 0.50
Nodes (4): Vĩnh Thịnh Application Icon, Vĩnh Thịnh Icon Variant, Vĩnh Thịnh Logo, Bang Keo Vinh Thinh SVG Logo

## Knowledge Gaps
- **133 isolated node(s):** `fs`, `path`, `pkg`, `loaded`, `commandPaletteFilteredActions` (+128 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `build` connect `Build Configuration` to `Packaging Files`, `Electron Dependencies`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `files` connect `Packaging Files` to `Build Configuration`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `pkg` to the rest of the system?**
  _133 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Security and Policy` be split into smaller, more focused modules?**
  _Cohesion score 0.06253652834599649 - nodes in this community are weakly interconnected._
- **Should `Statistics Module` be split into smaller, more focused modules?**
  _Cohesion score 0.07896575821104122 - nodes in this community are weakly interconnected._
- **Should `Quotation Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.09714285714285714 - nodes in this community are weakly interconnected._
- **Should `Application UI` be split into smaller, more focused modules?**
  _Cohesion score 0.09682539682539683 - nodes in this community are weakly interconnected._
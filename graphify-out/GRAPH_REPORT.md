# Graph Report - RD/js  (2026-07-15)

## Corpus Check
- 42 files · ~146,806 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 968 nodes · 1966 edges · 63 communities (53 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Printing Framework
- Debt Ledger Management
- Voucher Form Interface
- Interactive UI Controls
- Excel Data Integration
- Inventory Stock Management
- Cloud State Merging
- Partner Management
- Sales Price Automation
- Voucher Template Editor
- Purchase Price Automation
- Authentication and Permissions
- Supabase Realtime Sync
- Shared Utility Functions
- Cash Receipt Payments
- Cloud Pull Push Flow
- Cloud Sync Settings
- Cloud Delta Computation
- Workspace Tab Management
- Application State Persistence
- Manual Cloud Sync
- Startup Cloud Pull
- User Preference Storage
- Print Layout Settings
- Printer Job Processing
- Product Catalog Deduplication
- Form Draft Autosave
- Voucher Print Documents
- Partner Identity Rules
- JSON Backup Storage
- State Difference Tracking
- Purchase Order Tables
- Purchase Transaction Tables
- Financial Reporting
- Sales Transaction Tables
- Online Write Gate
- Purchase Return Tables
- Sales Quotation Tables
- Sales Return Tables
- Accounting Recalculation
- Dashboard Reporting
- Sales Template Tables
- Accounting Engine Cache
- Persistence Storage Bridge
- Platform File Paths
- Product Identity Resolution
- Update URL Security
- Application Error Logging
- Sales Template Editing
- SQLite Migration Guard
- Partner Record Merging
- Purchase Total Calculation
- Purchase Return Totals
- Purchase Return Filtering
- Purchase Return Submission
- Purchase Voucher Submission
- Quotation Filter Events
- Sales Return Submission
- Sales Partner Description
- Sales Template Data

## God Nodes (most connected - your core abstractions)
1. `pullAndMergeFromCloud()` - 38 edges
2. `cloudSyncPushNow()` - 18 edges
3. `startSupabaseClient()` - 18 edges
4. `cloudSyncLog()` - 15 edges
5. `cloudSyncMergeStatesCore()` - 14 edges
6. `pullFromCloudOnStartup()` - 14 edges
7. `filterDebts()` - 14 edges
8. `listenToCloudChanges()` - 13 edges
9. `printCurrentVoucher()` - 13 edges
10. `updateCloudSyncBadge()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `cloudSyncPersistPullDeltaToCache()` --references--> `CLOUD_SYNC_ENTITY_DEFS`  [EXTRACTED]
  cloud-sync.js → cloud-sync.js  _Bridges community 17 → community 15_
- `cloudSyncMergeStatesCore()` --references--> `CLOUD_SYNC_DELETE_DEFS`  [EXTRACTED]
  cloud-sync.js → cloud-sync.js  _Bridges community 17 → community 6_
- `cloudSyncMergeStatesCore()` --calls--> `cloudSyncLog()`  [EXTRACTED]
  cloud-sync.js → cloud-sync.js  _Bridges community 12 → community 6_
- `cloudSyncPersistPullDeltaToCache()` --calls--> `cloudSyncLog()`  [EXTRACTED]
  cloud-sync.js → cloud-sync.js  _Bridges community 12 → community 15_
- `cloudSyncRescueLocalOnlyItems()` --calls--> `cloudSyncLog()`  [EXTRACTED]
  cloud-sync.js → cloud-sync.js  _Bridges community 12 → community 17_

## Import Cycles
- None detected.

## Communities (63 total, 10 thin omitted)

### Community 0 - "UI Printing Framework"
Cohesion: 0.06
Nodes (74): activeModalsByTab, applyPreset(), applyPrintFontScale(), applyPrintPaperSize(), applyPrintScaleToVoucherRoot(), applyVoucherDirectPrint(), applyVoucherFontScale(), applyVoucherPaperSize() (+66 more)

### Community 1 - "Debt Ledger Management"
Cohesion: 0.08
Nodes (56): accumulateDebtEntryLines(), appendUnmatchedDebtRow(), batchDeleteDebts(), buildCompanyGroupedList(), calculatePartnerDebts(), calculatePartnerDebtsGrouped(), changeDebtPeriodFilter(), changeDebtsCompanyPage() (+48 more)

### Community 2 - "Voucher Form Interface"
Cohesion: 0.10
Nodes (43): addDynamicFormTableRow(), beginVoucherSubmit(), createDynamicFormInput(), createDynamicRowActionsElement(), dynamicFormTableRegistry, endVoucherSubmit(), ensureDynamicItemsRowCountElement(), ensureVoucherModalChrome() (+35 more)

### Community 3 - "Interactive UI Controls"
Cohesion: 0.08
Nodes (32): bulkSelectedInputs, closeCustomDropdown(), closeMobileSidebar(), filteredOptions, focusRowFirstCell(), getActiveLookupType(), getActiveSearchInputId(), getEditableCellsInRow() (+24 more)

### Community 4 - "Excel Data Integration"
Cohesion: 0.09
Nodes (36): autoIntegrateProductsExcel(), autoIntegrateSalesExcel(), autoIntegrateSoChiTietBanHangExcel(), autoIntegrateSoChiTietMuaHangExcel(), autoIntegrateVouchersExcel(), cacheProductOptions(), convertStyle(), createDefaultDebtExcelRow() (+28 more)

### Community 5 - "Inventory Stock Management"
Cohesion: 0.10
Nodes (31): batchDeleteProducts(), buildInventoryTableRowHtml(), changeInventoryPage(), checkForUpdates(), compareVersions(), exportStockLedgerToExcel(), fetchLatestReleaseVersion(), fetchPackageJsonVersion() (+23 more)

### Community 6 - "Cloud State Merging"
Cohesion: 0.10
Nodes (35): arePartnersEqual(), areProductsEqual(), areVouchersEqual(), CLOUD_SYNC_MERGE_ENTITY_KEYS, CLOUD_SYNC_TIE_KEEP_LOCAL_KEYS, cloudSyncClone(), cloudSyncEqual(), cloudSyncMergeCloudSnapshot() (+27 more)

### Community 7 - "Partner Management"
Cohesion: 0.11
Nodes (31): autoExtractPhonesAndCleanAddresses(), autoExtractPhonesFromNamesAndClean(), batchDeletePartners(), batchSetPartnersInactive(), buildPartnerTableActions(), changePartnersPage(), deletePartner(), filteredPartnersList (+23 more)

### Community 8 - "Sales Price Automation"
Cohesion: 0.07
Nodes (20): allTemplateFiles, autoFillProductPrice(), autoFillQuotationPrice(), autoFillSalesReturnPrice(), autoFillTemplateProductPrice(), debouncedRenderSalesReturnTable, debouncedRenderSalesTable, generateNextQuotationVoucherId() (+12 more)

### Community 9 - "Voucher Template Editor"
Cohesion: 0.18
Nodes (28): addVoucherPreviewExtraContent(), applyVoucherInlineEditorLive(), applyVoucherTemplateSettingsToRoot(), cancelVoucherTemplateEditor(), getDefaultSettings(), getPrintTemplateSettings(), getVieValue(), getVoucherPreviewRoot() (+20 more)

### Community 10 - "Purchase Price Automation"
Cohesion: 0.09
Nodes (11): autoFillPurchaseOrderPrice(), debouncedRenderPurchaseOrderTable, debouncedRenderPurchaseTable, generateNextPurchaseOrderVoucherId(), handlePurchaseOrderSubmit(), onPurchaseFilterChange(), onPurchaseOrderFilterChange(), purchaseColumnFilters (+3 more)

### Community 11 - "Authentication and Permissions"
Cohesion: 0.16
Nodes (18): applyRolePermissions(), clearAuthSession(), deleteUser(), formatDateAndTime(), getAuthBootSessionId(), hideLoginOverlay(), initAuth(), logoutUser() (+10 more)

### Community 12 - "Supabase Realtime Sync"
Cohesion: 0.18
Nodes (24): attachCloudFocusCheck(), checkCloudMetadataForChanges(), cloudSyncAuthenticateAndBootstrap(), cloudSyncFetchRowsSince(), cloudSyncLog(), cloudSyncNoteLegacyLock(), cloudSyncQuotePostgrestLogicValue(), cloudSyncReadWithRetry() (+16 more)

### Community 13 - "Shared Utility Functions"
Cohesion: 0.11
Nodes (11): extractIdFromParentheses(), getPartnerForVoucher(), getPartnerNameForVoucher(), matchAdvancedQuery(), matchStr(), removeAccents(), showToast(), toggleTheme() (+3 more)

### Community 14 - "Cash Receipt Payments"
Cohesion: 0.15
Nodes (17): batchDeleteCash(), changeCashPage(), clearCashDateFilter(), filterCash(), filteredCashList, generateNextPaymentVoucherId(), generateNextReceiptVoucherId(), handlePaymentSubmit() (+9 more)

### Community 15 - "Cloud Pull Push Flow"
Cohesion: 0.13
Nodes (22): cloudSyncDeleteRows(), cloudSyncEnsureMetadataRow(), cloudSyncFetchLatestRowSummary(), cloudSyncFetchMetadata(), cloudSyncFinishTask(), cloudSyncGetCloudWatermark(), cloudSyncPersistPullDeltaToCache(), cloudSyncPrePullBeforePush() (+14 more)

### Community 16 - "Cloud Sync Settings"
Cohesion: 0.18
Nodes (16): cloudSyncSettings, exportData(), foundOldChunkIds, getCloudConfigElements(), importData(), isSupportedSupabaseUrl(), loadCloudSettings(), manualBackupNow() (+8 more)

### Community 17 - "Cloud Delta Computation"
Cohesion: 0.21
Nodes (19): CLOUD_SYNC_DELETE_DEFS, CLOUD_SYNC_ENTITY_DEFS, cloudSyncApplyPushToLastSyncState(), cloudSyncBuildMetadataForPush(), cloudSyncDeduplicateState(), cloudSyncDefaultState(), cloudSyncEntityNeedsPush(), cloudSyncGetCloudKeysFromCompleteSnapshot() (+11 more)

### Community 18 - "Workspace Tab Management"
Cohesion: 0.28
Nodes (15): closeTab(), createTabElement(), findOpenTab(), getHomeLabel(), getTabBar(), getTabBarInner(), init(), isTabRegistered() (+7 more)

### Community 19 - "Application State Persistence"
Cohesion: 0.28
Nodes (14): autoSaveBeforeClose(), cleanNumericVouchers(), executeSaveState(), initApp(), initializeLastSavedState(), logDeltaActivity(), pushActivityLogDirectly(), queueBackgroundCloudPush() (+6 more)

### Community 20 - "Manual Cloud Sync"
Cohesion: 0.16
Nodes (14): canStartManualCloudSync(), cloudSyncClearPendingLocalWrite(), cloudSyncRunPullInBackground(), confirmCloudSyncAction(), finishStartupPull(), flushDeferredCloudSync(), forcePullFromCloud(), forcePushToCloud() (+6 more)

### Community 21 - "Startup Cloud Pull"
Cohesion: 0.16
Nodes (14): cloudSyncFetchAllRows(), cloudSyncGetDatasetIdentity(), cloudSyncGetPendingLocalWriteToken(), cloudSyncGetStoredDatasetIdentity(), cloudSyncHasPendingLocalWrite(), cloudSyncPersistDatasetIdentity(), cloudSyncResetCloudBaseline(), cloudSyncRestoreBaselineFromConfirmedCache() (+6 more)

### Community 22 - "User Preference Storage"
Cohesion: 0.33
Nodes (13): applyThemeEarlyFromStorage(), applyThemePreference(), DEFAULT_USER_PREFS, getPrefsStorage(), getUserPrefs(), loadRawUserPrefs(), persistDebtsUIFromDOM(), readLegacyTheme() (+5 more)

### Community 23 - "Print Layout Settings"
Cohesion: 0.26
Nodes (10): clampNumber(), formatPrintScaleLabel(), getEffectivePrintScale(), getPaperWidthMm(), getPrintMarginPx(), getPrintPageMargins(), getVoucherPaperMaxWidth(), getVoucherPreviewPageHeight() (+2 more)

### Community 24 - "Printer Job Processing"
Cohesion: 0.26
Nodes (11): buildElectronPrintOptions(), classifyPrintFailure(), cleanPrinterText(), normalizePaperSize(), normalizePrintRequest(), PRINT_ERROR_CODES, PRINT_MODES, PrinterJobError (+3 more)

### Community 25 - "Product Catalog Deduplication"
Cohesion: 0.36
Nodes (12): cleanGarbageProducts(), countVoucherRefsForProductId(), dedupeProductCatalogOnState(), findProductById(), findProductIndexById(), isGarbageProductId(), mergeProductRecordFields(), normalizeProductId() (+4 more)

### Community 26 - "Form Draft Autosave"
Cohesion: 0.41
Nodes (11): checkAndRestoreDraft(), clearActiveFormDraft(), collectDraftFields(), debounceSaveDraft(), getConfig(), getDraftStorageKey(), handleTrackedFormChange(), hasMeaningfulDraftContent() (+3 more)

### Community 27 - "Voucher Print Documents"
Cohesion: 0.27
Nodes (9): buildVoucherPrintDocument(), extractVoucherPageMargins(), fs, getVoucherPaperMaxWidth(), getVoucherPrintStyles(), path, { pathToFileURL }, readVoucherCssBlock() (+1 more)

### Community 28 - "Partner Identity Rules"
Cohesion: 0.38
Nodes (9): findPartnerByIdentity(), getPartnerGroupDisplayName(), getPartnerGroupKey(), getPartnerIdentityDisplayName(), getPartnerIdentityKey(), getPartnerIdentityRule(), normalizePartnerNameForIdentity(), PARTNER_IDENTITY_RULES (+1 more)

### Community 29 - "JSON Backup Storage"
Cohesion: 0.33
Nodes (8): crypto, fs, listJsonBackupsNewestFirst(), makeBackupTimestamp(), path, readLatestValidJsonBackup(), validateSerializedState(), writeJsonBackup()

### Community 30 - "State Difference Tracking"
Cohesion: 0.31
Nodes (5): buildStateDelta(), ENTITY_WATCH_FIELDS, entityChanged(), entityContentHash(), fnv1aHash()

### Community 31 - "Purchase Order Tables"
Cohesion: 0.22
Nodes (9): batchDeletePurchaseOrders(), changePurchaseOrderPage(), clearPurchaseOrderColumnFilters(), clearPurchaseOrderDateFilter(), filterPurchaseOrderTable(), renderPurchaseOrderTable(), switchPurchaseSubTab(), toggleSelectAllPurchaseOrders() (+1 more)

### Community 32 - "Purchase Transaction Tables"
Cohesion: 0.22
Nodes (9): batchDeletePurchases(), buildPurchaseTableRowHtml(), changePurchasePage(), clearPurchaseColumnFilters(), clearPurchaseDateFilter(), filterPurchaseTable(), renderPurchaseTable(), toggleSelectAllPurchases() (+1 more)

### Community 33 - "Financial Reporting"
Cohesion: 0.36
Nodes (7): calculateTrialBalance(), escapeReportText(), generateReport(), getReportSignaturesHTML(), handleReportTypeChange(), printReport(), triggerPrint()

### Community 34 - "Sales Transaction Tables"
Cohesion: 0.22
Nodes (9): batchDeleteSales(), buildSalesTableRowHtml(), changeSalesPage(), clearSalesColumnFilters(), clearSalesDateFilter(), filterSalesTable(), renderSalesTable(), toggleSelectAllSales() (+1 more)

### Community 35 - "Online Write Gate"
Cohesion: 0.50
Nodes (6): assertCanWrite(), canWrite(), ensureBanner(), getStatus(), refreshUi(), setStatus()

### Community 36 - "Purchase Return Tables"
Cohesion: 0.25
Nodes (8): batchDeletePurchaseReturns(), changePurchaseReturnPage(), clearPurchaseReturnColumnFilters(), clearPurchaseReturnDateFilter(), filterPurchaseReturnTable(), renderPurchaseReturnTable(), toggleSelectAllPurchaseReturns(), updateBatchPurchaseReturnsUI()

### Community 37 - "Sales Quotation Tables"
Cohesion: 0.25
Nodes (8): batchDeleteQuotations(), changeQuotationPage(), clearQuotationColumnFilters(), clearQuotationDateFilter(), filterQuotationTable(), renderQuotationTable(), toggleSelectAllQuotations(), updateBatchQuotationsUI()

### Community 38 - "Sales Return Tables"
Cohesion: 0.25
Nodes (8): batchDeleteSalesReturns(), changeSalesReturnPage(), clearSalesReturnColumnFilters(), clearSalesReturnDateFilter(), filterSalesReturnTable(), renderSalesReturnTable(), toggleSelectAllSalesReturns(), updateBatchSalesReturnsUI()

### Community 39 - "Accounting Recalculation"
Cohesion: 0.43
Nodes (4): deleteVoucher(), rebalanceEquity(), recalculateAccounting(), recalculateAccountingFull()

### Community 40 - "Dashboard Reporting"
Cohesion: 0.52
Nodes (6): clearDashboardDateFilter(), filterDashboard(), renderDashboard(), renderDashboardDebts(), renderDashboardNegativeStocks(), renderRecentActivities()

### Community 41 - "Sales Template Tables"
Cohesion: 0.29
Nodes (7): deleteSalesTemplate(), displaySalesTemplateTable(), filterSalesTemplateTable(), filterTemplateCategory(), handleTemplateSubmit(), renderSalesTemplateTable(), switchSalesSubTab()

### Community 42 - "Accounting Engine Cache"
Cohesion: 0.47
Nodes (3): getRecalcWatermark(), markAccountingValid(), shouldSkipFullRecalc()

### Community 43 - "Persistence Storage Bridge"
Cohesion: 0.47
Nodes (3): getWebStorage(), loadStateFromDisk(), persistFullState()

### Community 44 - "Platform File Paths"
Cohesion: 0.47
Nodes (5): ALLOWED_EXCEL_EXTENSIONS, fs, normalizePackagedExcelFilename(), path, resolvePackagedExcelFile()

### Community 45 - "Product Identity Resolution"
Cohesion: 0.47
Nodes (3): findProductById(), findProductIndexById(), productIdKey()

### Community 46 - "Update URL Security"
Cohesion: 0.67
Nodes (5): isAllowedExternalUrl(), isAllowedUpdateRedirectUrl(), isAllowedUpdateRequestUrl(), parseSafeUrl(), UPDATE_ASSET_HOSTS

### Community 47 - "Application Error Logging"
Cohesion: 0.47
Nodes (4): addErrorLog(), clearErrorLogs(), errorLogs, updateErrorLogsUI()

### Community 48 - "Sales Template Editing"
Cohesion: 0.33
Nodes (6): findProductByName(), modifySalesTemplate(), openEditTemplateModal(), resetQuotationForm(), resetSalesForm(), templateToQuotation()

### Community 49 - "SQLite Migration Guard"
Cohesion: 0.50
Nodes (3): archiveLegacyStateFile(), fs, getAvailableArchivePath()

## Knowledge Gaps
- **47 isolated node(s):** `cloudSyncWriteQueue`, `cloudSyncTasks`, `crypto`, `fs`, `path` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pullAndMergeFromCloud()` connect `Cloud Pull Push Flow` to `Cloud State Merging`, `Supabase Realtime Sync`, `Cloud Delta Computation`, `Manual Cloud Sync`, `Startup Cloud Pull`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `startSupabaseClient()` connect `Supabase Realtime Sync` to `Startup Cloud Pull`, `Cloud State Merging`, `Cloud Pull Push Flow`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **Why does `cloudSyncPushNow()` connect `Cloud Pull Push Flow` to `Cloud Delta Computation`, `Supabase Realtime Sync`, `Manual Cloud Sync`, `Cloud State Merging`?**
  _High betweenness centrality (0.000) - this node is a cross-community bridge._
- **What connects `cloudSyncWriteQueue`, `cloudSyncTasks`, `crypto` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Printing Framework` be split into smaller, more focused modules?**
  _Cohesion score 0.06317954745812518 - nodes in this community are weakly interconnected._
- **Should `Debt Ledger Management` be split into smaller, more focused modules?**
  _Cohesion score 0.07909604519774012 - nodes in this community are weakly interconnected._
- **Should `Voucher Form Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.0975177304964539 - nodes in this community are weakly interconnected._
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

const electronExecutable = process.env.ELECTRON_TEST_EXECUTABLE || path.join(
  __dirname,
  '..',
  'node_modules',
  'electron',
  'dist',
  process.platform === 'win32' ? 'electron.exe' : 'electron'
);
const appDirectory = path.join(__dirname, '..');
const testPackagedExecutable = process.env.ELECTRON_TEST_PACKAGED === '1';
const debugPort = 9333;

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForPage() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const pages = await response.json();
      const page = pages.find(candidate => candidate.type === 'page');
      if (page) return page;
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error('Electron page did not become ready');
}

async function evaluate(page, expression) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  try {
    await send('Runtime.enable');
    const response = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  } finally {
    socket.close();
  }
}

(async () => {
  const electronArguments = [`--remote-debugging-port=${debugPort}`];
  if (!testPackagedExecutable) electronArguments.push('.');
  const electron = spawn(electronExecutable, electronArguments, {
    cwd: testPackagedExecutable ? path.dirname(electronExecutable) : appDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let stderr = '';
  electron.stderr.on('data', chunk => { stderr += chunk.toString(); });

  try {
    const page = await waitForPage();
    const result = await evaluate(page, String.raw`(async () => {
      const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
      for (let attempt = 0; attempt < 40 && (document.readyState === 'loading' || typeof addQuoteDraft !== 'function' || typeof switchTab !== 'function'); attempt += 1) {
        await wait(100);
      }
      const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (!element) throw new Error('Missing element: ' + id);
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setValue('q-bki-ten-hang', 'Băng keo thử tab');
      setValue('q-bki-ten-khach-hang', 'Khách chung');
      setValue('q-bki-qc-mm', '48');
      setValue('q-bki-so-luong', '10');
      setValue('q-bki-don-gia-ban', '12000');
      addQuoteDraft('bang_keo_in');

      const sharedAfterAdd = [
        'q-bki-ten-hang',
        'q-bki-ten-khach-hang'
      ].map(id => document.getElementById(id).value);
      setValue('q-bki-qc-mm', '60');
      switchQuoteDraft('bang_keo_in', quoteDraftStates.bang_keo_in.drafts[0].id);

      setBangKeoInAxisMode('quote', 'moi');
      setValue('q-bki-truc-ten', 'Trục màu đỏ');
      setValue('q-bki-truc-so-luong', '1');
      setValue('q-bki-truc-gia-goc', '30000');
      setValue('q-bki-truc-gia-ban', '50000');
      setValue('q-bki-truc-vat', '10');
      addCurrentQuoteAxis();
      setValue('q-bki-truc-ten', 'Trục màu xanh');
      setValue('q-bki-truc-so-luong', '2');
      setValue('q-bki-truc-gia-goc', '35000');
      setValue('q-bki-truc-gia-ban', '60000');
      setValue('q-bki-truc-vat', '8');
      captureActiveQuoteDraft('bang_keo_in');
      const draft = getActiveQuoteDraft('bang_keo_in');
      const item = buildQuoteItem('bang_keo_in', draft);
      const draftCountBeforeEdit = quoteDraftStates.bang_keo_in.drafts.length;
      const restoredMillimeters = document.getElementById('q-bki-qc-mm').value;
      const savedAxisNodesBeforeEdit = document.querySelectorAll('#q-bki-axis-tree .quote-axis-node').length;

      await loadQuoteIntoEditor('BG-TEST-EDIT', 'bang_keo_in', {
        id: 'BG-TEST-EDIT',
        ten_hang: 'Băng keo cần sửa',
        ten_khach_hang: 'Khách chỉnh sửa',
        ngay_du_kien: '2026-09-20',
        quote_items: [
          { specification: '48mm x 100m (50mic)', quantity: 10, unitPrice: 12000, total: 120000, fields: { 'qc-mm': '48', 'so-luong': '10', 'don-gia-ban': '12000', 'loai-truc': 'moi', 'truc-ten': 'Trục đỏ', 'truc-so-luong': '1', 'truc-gia-goc': '30000', 'truc-gia-ban': '50000', 'truc-vat': '10' }, axes: [
            { name: 'Trục đỏ', quantity: 1, costPrice: 30000, unitPrice: 50000, total: 50000, vat: 5000, vatPercent: 10 },
            { name: 'Trục xanh', quantity: 1, costPrice: 32000, unitPrice: 55000, total: 55000, vat: 5500, vatPercent: 10 }
          ] },
          { specification: '60mm x 100m (50mic)', quantity: 5, unitPrice: 15000, total: 75000, fields: { 'qc-mm': '60', 'so-luong': '5', 'don-gia-ban': '15000', 'loai-truc': 'cu' }, axes: [] }
        ]
      });

      setValue('bki-so-luong', '10');
      setValue('bki-don-gia-ban', '12000');
      setValue('bki-tien-coc', '20000');
      setValue('bki-vat', '10');
      calculateBangKeoIn('order');
      const printedTapeDebtWithVat = utils.parseCurrency(document.getElementById('bki-cong-no-khach').value);
      const printedTapeVatAmount = utils.parseCurrency(document.getElementById('bki-vat-amount').value);

      setBangKeoInAxisMode('order', 'moi');
      setValue('bki-truc-so-luong', '2');
      setValue('bki-truc-gia-goc', '30000');
      setValue('bki-truc-gia-ban', '50000');
      setValue('bki-truc-vat', '8');
      calculateBangKeoIn('order');
      const printedTapeAxisVatAmount = utils.parseCurrency(document.getElementById('bki-truc-vat-amount').value);

      setValue('bk-so-luong', '2');
      setValue('bk-don-gia-goc', '10000');
      setValue('bk-don-gia-ban', '15000');
      setValue('bk-vat', '10');
      calculateBangKeo('order');
      const standardTapeDebtWithVat = utils.parseCurrency(document.getElementById('bk-cong-no-khach').value);
      const standardTapeVatAmount = utils.parseCurrency(document.getElementById('bk-vat-amount').value);

      setValue('ti-so-luong', '3');
      setValue('ti-don-gia-goc', '20000');
      setValue('ti-don-gia-ban', '40000');
      setValue('ti-vat', '10');
      calculateTrucIn('order');
      const printAxisVatAmount = utils.parseCurrency(document.getElementById('ti-vat-amount').value);

      statsViewMode = 'summary';
      statsAllOrders = [
        { id: 'FILTER-BA', thoi_gian: '2026-08-01', ten_hang: 'Đơn BA', ten_khach_hang: 'BA', ngay_du_kien: '2026-08-20', cong_no_khach: 1000, cong_no_ncc: 500, da_giao: false, da_tat_toan: false, da_gui_email: false },
        { id: 'FILTER-BEAN', thoi_gian: '2026-08-02', ten_hang: 'Đơn BEAN', ten_khach_hang: 'BEAN', ngay_du_kien: '2026-08-21', cong_no_khach: 2000, cong_no_ncc: 1000, da_giao: true, da_tat_toan: false, da_gui_email: false }
      ];
      renderStatsTable(statsAllOrders);

      const originalAddEventListener = document.addEventListener.bind(document);
      const originalRemoveEventListener = document.removeEventListener.bind(document);
      let filterCloseListenerBalance = 0;
      document.addEventListener = function(type, listener, options) {
        if (type === 'mousedown' && listener?.name === 'closeMenu') filterCloseListenerBalance += 1;
        return originalAddEventListener(type, listener, options);
      };
      document.removeEventListener = function(type, listener, options) {
        if (type === 'mousedown' && listener?.name === 'closeMenu') filterCloseListenerBalance -= 1;
        return originalRemoveEventListener(type, listener, options);
      };

      const customerFilterButton = document.querySelectorAll('#stats-table-header .table-filter-button')[3];
      openStatsColumnFilter({ preventDefault() {}, stopPropagation() {}, currentTarget: customerFilterButton }, 'ten_khach_hang');
      await wait(80);
      const filterActionLabels = [...document.querySelectorAll('#stats-column-filter-menu .column-filter-actions button')]
        .map(button => button.textContent.trim());
      toggleStatsColumnFilterValue('ten_khach_hang', 'BA', false);
      const filteredCustomerRows = document.querySelectorAll('#stats-table-body tr[data-id]').length;

      // Mô phỏng dữ liệu vừa được tải lại sau khi chỉnh sửa giá trị đang được lọc.
      statsAllOrders = statsAllOrders.map(row => row.id === 'FILTER-BEAN'
        ? { ...row, ten_khach_hang: 'BEAN ĐÃ SỬA' }
        : row);
      filterStatsTable();
      const rowsWhileStaleFilterAfterEdit = document.querySelectorAll('#stats-table-body tr[data-id]').length;
      const columnSearchInput = document.querySelector('#stats-column-filter-menu .column-filter-search');
      columnSearchInput.value = 'BEA';
      filterColumnFilterValues(columnSearchInput.value);
      clearStatsColumnFilter('ten_khach_hang');
      const rowsAfterColumnClearFollowingEdit = document.querySelectorAll('#stats-table-body tr[data-id]').length;
      const filterMenuRemainsOpen = document.getElementById('stats-column-filter-menu').style.display === 'block';
      const columnSearchCleared = columnSearchInput.value === '';
      const columnValuesReset = [...document.querySelectorAll('#stats-column-filter-menu .column-filter-value')]
        .every(label => label.style.display === 'flex' && label.querySelector('input').checked);

      closeStatsColumnFilterMenu();
      const customerFilterButtonAfterEdit = document.querySelectorAll('#stats-table-header .table-filter-button')[3];
      openStatsColumnFilter({ preventDefault() {}, stopPropagation() {}, currentTarget: customerFilterButtonAfterEdit }, 'ten_khach_hang');
      await wait(80);
      deselectAllStatsColumnFilter('ten_khach_hang');
      const deselectedCustomerRows = document.querySelectorAll('#stats-table-body tr[data-id]').length;
      const emptySelectionHeaderActive = document.querySelectorAll('#stats-table-header .table-filter-button')[3].classList.contains('active');
      setStatsColumnFilterAll('ten_khach_hang');
      const selectedAllCustomerRows = document.querySelectorAll('#stats-table-body tr[data-id]').length;

      document.getElementById('stats-search').value = 'không tồn tại';
      document.getElementById('stats-month-filter').value = '1';
      document.getElementById('stats-status-filter').value = 'finished';
      document.getElementById('stats-date-from').value = '2026-09-01';
      document.getElementById('stats-date-to').value = '2026-09-30';
      document.getElementById('stats-giao-filter').value = 'giao';
      document.getElementById('stats-ctv-filter').value = 'CTV';
      statsColumnFilters.ten_khach_hang = new Set(['không tồn tại']);
      filterStatsTable();
      clearAllStatsFilters();
      const rowsAfterClearAllFollowingEdit = document.querySelectorAll('#stats-table-body tr[data-id]').length;
      const allFilterControlsReset = document.getElementById('stats-search').value === ''
        && document.getElementById('stats-month-filter').value === 'all'
        && document.getElementById('stats-status-filter').value === 'all'
        && document.getElementById('stats-date-from').value === ''
        && document.getElementById('stats-date-to').value === ''
        && document.getElementById('stats-giao-filter').value === 'all'
        && document.getElementById('stats-ctv-filter').value === '';
      const allColumnFiltersReset = Object.keys(statsColumnFilters).length === 0;
      const filterMenuClosed = document.getElementById('stats-column-filter-menu').style.display === 'none';
      const customerHeaderInactive = !document.querySelectorAll('#stats-table-header .table-filter-button')[3].classList.contains('active');
      document.addEventListener = originalAddEventListener;
      document.removeEventListener = originalRemoveEventListener;

      const bkiAxisExcelRows = buildBkiAxisExcelRows([
        {
          id: 'BKI-EXCEL-1', thoi_gian: '2026-09-02', ten_hang: 'BKI một trục', ten_khach_hang: 'Khách A',
          quy_cach_mm: 48, quy_cach_m: 100, quy_cach_mic: 50, loai_truc: 'moi', ten_truc: 'Trục đơn',
          truc_chu_vi: 320, truc_so_luong: 2, truc_gia_goc: 30000, truc_gia_ban: 50000,
          truc_thanh_tien_goc: 60000, truc_thanh_tien_ban: 100000, truc_vat_percent: 8, truc_vat: 8000
        },
        {
          id: 'BKI-EXCEL-2', thoi_gian: '2026-09-02', ten_hang: 'BKI nhiều trục', ten_khach_hang: 'Khách B',
          loai_truc: 'moi', ten_truc: '2 trục in', quote_items: JSON.stringify([
            { specification: '60mm x 100m (50mic)', axes: [
              { name: 'Trục đỏ', circumference: 330, quantity: 1, costPrice: 40000, unitPrice: 60000, total: 60000, vatPercent: 10, vat: 6000 },
              { name: 'Trục xanh', circumference: 340, quantity: 2, costPrice: 45000, unitPrice: 70000, total: 140000, vatPercent: 8, vat: 11200 }
            ] }
          ])
        },
        { id: 'BKI-EXCEL-3', loai_truc: 'cu', ten_truc: 'Không xuất' }
      ]);
      const bkiInlineExcelRows = buildStatsExcelRows([
        {
          id: 'BKI-INLINE-1', ten_hang: 'Đơn đầu', ten_khach_hang: 'Khách A', loai_truc: 'moi',
          ten_truc: 'Trục ngay dưới', truc_so_luong: 1, truc_gia_goc: 30000, truc_gia_ban: 50000,
          truc_thanh_tien_goc: 30000, truc_thanh_tien_ban: 50000, truc_vat_percent: 10, truc_vat: 5000
        },
        { id: 'BKI-INLINE-2', ten_hang: 'Đơn kế tiếp', ten_khach_hang: 'Khách B', loai_truc: 'cu' }
      ], 'bang_keo_in');

      const savedAxisCountAfterLoad = getActiveQuoteDraft('bang_keo_in').savedAxes.length;
      const axisEntryClearedAfterLoad = document.getElementById('q-bki-truc-ten').value === '';
      editSavedQuoteAxis(0);
      setValue('q-bki-truc-ten', 'Trục đỏ đã sửa');
      const editedAxisItem = buildQuoteItem('bang_keo_in', captureActiveQuoteDraft('bang_keo_in'));
      await generateAndSaveQuotePDF('BG-AXIS-REGRESSION', 'bang_keo_in', {
        thoi_gian: '2026-08-03', ten_hang: 'Băng keo hai trục', ten_khach_hang: 'Khách kiểm thử',
        quote_items: [editedAxisItem]
      });
      const editedAxisPreviewHtml = document.getElementById('quote-pdf-preview-frame').srcdoc;
      const countText = (text, needle) => text.split(needle).length - 1;
      const editedRedAxisPdfRows = countText(editedAxisPreviewHtml, '<strong>Trục đỏ đã sửa</strong>');
      const greenAxisPdfRows = countText(editedAxisPreviewHtml, '<strong>Trục xanh</strong>');
      const quotePreviewActive = document.getElementById('modal-quote-pdf-preview').classList.contains('active');
      const quotePreviewHtml = document.getElementById('quote-pdf-preview-frame').srcdoc;
      closeQuotePdfPreview();
      await generateAndSaveQuotePDF('BG-NO-VAT', 'bang_keo', {
        thoi_gian: '2026-08-03', ten_hang: 'Băng keo không VAT', ten_khach_hang: 'Khách không VAT',
        quote_items: [{
          specification: '48mm x 100m', quantity: 2, unitPrice: 10000, total: 20000,
          vat: 0, vatPercent: 0, axes: []
        }]
      });
      const noVatPreviewHtml = document.getElementById('quote-pdf-preview-frame').srcdoc;
      closeQuotePdfPreview();

      return {
        draftCountBeforeEdit,
        sharedAfterAdd,
        restoredMillimeters,
        savedAxisNodesBeforeEdit,
        totalAxes: item.axes.length,
        axisNames: item.axes.map(axis => axis.name),
        axisVats: item.axes.map(axis => axis.vat),
        productCardCount: document.querySelectorAll('#form-quote-bang-keo-in .quote-product-card').length,
        entryContainsReadonly: !!document.querySelector('#form-quote-bang-keo-in .quote-entry-section input[readonly]'),
        resultContainsEditable: !!document.querySelector('#form-quote-bang-keo-in .quote-result-section input:not([readonly])'),
        editDraftCount: quoteDraftStates.bang_keo_in.drafts.length,
        editShared: [document.getElementById('q-bki-ten-hang').value, document.getElementById('q-bki-ten-khach-hang').value],
        editFirstSize: document.getElementById('q-bki-qc-mm').value,
        editAxisVat: editedAxisItem.axes.find(axis => axis.name === 'Trục đỏ đã sửa')?.vat,
        savedAxisCountAfterLoad,
        axisEntryClearedAfterLoad,
        editedAxisCount: editedAxisItem.axes.length,
        editedAxisNames: editedAxisItem.axes.map(axis => axis.name).sort(),
        editedRedAxisPdfRows,
        greenAxisPdfRows,
        editBannerVisible: !document.getElementById('quote-edit-banner-bang_keo_in').hidden,
        editSubmitLabel: document.querySelector('#form-quote-bang-keo-in button[type="submit"]').textContent,
        entryGroupTitles: [...document.querySelectorAll('#form-quote-bang-keo-in .quote-workspace-card > .quote-form-workspace > .quote-entry-section .quote-entry-group-heading h4')].map(node => node.textContent),
        axisSwitchRole: document.getElementById('q-bki-axis-switch').getAttribute('role'),
        axisSwitchChecked: document.getElementById('q-bki-axis-switch').getAttribute('aria-checked'),
        legacyAxisButtons: document.querySelectorAll('#q-bki-axis-old, #q-bki-axis-new').length,
        salesFormsRestructured: ['form-bang-keo-in', 'form-bang-keo', 'form-truc-in']
          .every(id => document.getElementById(id).classList.contains('sales-ui-restructured')),
        salesProductCardCount: document.querySelectorAll('#form-bang-keo-in .sales-product-card').length,
        salesEntryContainsReadonly: !!document.querySelector('#form-bang-keo-in .sales-entry-section input[readonly]'),
        salesResultContainsEditable: !!document.querySelector('#form-bang-keo-in .sales-result-section input:not([readonly])'),
        salesEntryGroupTitles: [...document.querySelectorAll('#form-bang-keo-in .sales-workspace-card > .sales-form-workspace > .sales-entry-section .quote-entry-group-heading h4')].map(node => node.textContent),
        salesAxisSwitchRole: document.getElementById('bki-axis-switch').getAttribute('role'),
        salesLegacyAxisButtons: document.querySelectorAll('#bki-axis-old, #bki-axis-new').length,
        printedTapeVatField: !!document.getElementById('bki-vat'),
        standardTapeVatField: !!document.getElementById('bk-vat'),
        printedTapeDebtWithVat,
        standardTapeDebtWithVat,
        printedTapeVatAmount,
        printedTapeAxisVatAmount,
        standardTapeVatAmount,
        printAxisVatAmount,
        salesVatAmountFields: ['bki-vat-amount', 'bk-vat-amount', 'ti-vat-amount']
          .every(id => !!document.getElementById(id)),
        salesVatAmountsInResult: ['bki-vat-amount', 'bk-vat-amount', 'ti-vat-amount']
          .every(id => !!document.getElementById(id).closest('.sales-result-section')),
        quoteDeliveryDateFields: document.querySelectorAll('#form-quote-bang-keo-in [id$="ngay-du-kien"], #form-quote-bang-keo [id$="ngay-du-kien"], #form-quote-truc-in [id$="ngay-du-kien"]').length,
        quotePreviewActive,
        quotePreviewHasCustomer: quotePreviewHtml.includes('Khách kiểm thử'),
        quotePreviewHasDeliveryDate: quotePreviewHtml.includes('Ngày giao hàng'),
        quotePreviewShowsVatPrices: quotePreviewHtml.includes('Giá gốc (chưa VAT):') && quotePreviewHtml.includes('Giá gồm VAT:'),
        noVatPreviewHidesVatPrices: !noVatPreviewHtml.includes('Giá gốc (chưa VAT):')
          && !noVatPreviewHtml.includes('Giá gồm VAT:')
          && noVatPreviewHtml.includes('Tổng tiền hàng:'),
        filterActionLabels,
        filteredCustomerRows,
        rowsWhileStaleFilterAfterEdit,
        rowsAfterColumnClearFollowingEdit,
        filterMenuRemainsOpen,
        columnSearchCleared,
        columnValuesReset,
        deselectedCustomerRows,
        emptySelectionHeaderActive,
        selectedAllCustomerRows,
        rowsAfterClearAllFollowingEdit,
        allFilterControlsReset,
        allColumnFiltersReset,
        filterMenuClosed,
        customerHeaderInactive,
        filterCloseListenerBalance,
        bkiAxisExcelRowCount: bkiAxisExcelRows.length,
        bkiAxisExcelNames: bkiAxisExcelRows.map(row => row['Tên Trục']),
        bkiAxisExcelOrderIds: bkiAxisExcelRows.map(row => row['Mã Đơn Hàng']),
        bkiAxisExcelVatTotals: bkiAxisExcelRows.map(row => row['Giá Trục Gồm VAT']),
        bkiInlineExcelRowLabels: bkiInlineExcelRows.map(row => row['Tên Hàng']),
        bkiInlineExcelRowIds: bkiInlineExcelRows.map(row => row['Mã Đơn Hàng']),
        bkiInlineExcelAxisNote: bkiInlineExcelRows[1]['Ghi Chú']
      };
    })()`);

    assert.equal(result.draftCountBeforeEdit, 2);
    assert.deepEqual(result.sharedAfterAdd, ['Băng keo thử tab', 'Khách chung']);
    assert.equal(result.restoredMillimeters, '48');
    assert.equal(result.savedAxisNodesBeforeEdit, 1);
    assert.equal(result.totalAxes, 2);
    assert.deepEqual(result.axisNames, ['Trục màu đỏ', 'Trục màu xanh']);
    assert.deepEqual(result.axisVats, [5000, 9600]);
    assert.equal(result.productCardCount, 1);
    assert.equal(result.entryContainsReadonly, false);
    assert.equal(result.resultContainsEditable, false);
    assert.equal(result.editDraftCount, 2);
    assert.deepEqual(result.editShared, ['Băng keo cần sửa', 'Khách chỉnh sửa']);
    assert.equal(result.editFirstSize, '48');
    assert.equal(result.editAxisVat, 5000);
    assert.equal(result.savedAxisCountAfterLoad, 2);
    assert.equal(result.axisEntryClearedAfterLoad, true);
    assert.equal(result.editedAxisCount, 2);
    assert.deepEqual(result.editedAxisNames, ['Trục xanh', 'Trục đỏ đã sửa'].sort());
    assert.equal(result.editedRedAxisPdfRows, 1);
    assert.equal(result.greenAxisPdfRows, 1);
    assert.equal(result.editBannerVisible, true);
    assert.equal(result.editSubmitLabel, 'Cập nhật & Xem trước PDF');
    assert.deepEqual(result.entryGroupTitles, ['Quy cách & trục in', 'Sản lượng & thành phẩm', 'Giá bán & phụ phí', 'Thanh toán & cộng tác']);
    assert.equal(result.axisSwitchRole, 'switch');
    assert.equal(result.axisSwitchChecked, 'true');
    assert.equal(result.legacyAxisButtons, 0);
    assert.equal(result.salesFormsRestructured, true);
    assert.equal(result.salesProductCardCount, 1);
    assert.equal(result.salesEntryContainsReadonly, false);
    assert.equal(result.salesResultContainsEditable, false);
    assert.deepEqual(result.salesEntryGroupTitles, [
      'Quy c\u00e1ch & tr\u1ee5c in',
      'S\u1ea3n l\u01b0\u1ee3ng & th\u00e0nh ph\u1ea9m',
      'Gi\u00e1 b\u00e1n & ph\u1ee5 ph\u00ed',
      'Thanh to\u00e1n & c\u1ed9ng t\u00e1c'
    ]);
    assert.equal(result.salesAxisSwitchRole, 'switch');
    assert.equal(result.salesLegacyAxisButtons, 0);
    assert.equal(result.printedTapeVatField, true);
    assert.equal(result.standardTapeVatField, true);
    assert.equal(result.printedTapeDebtWithVat, 112000);
    assert.equal(result.standardTapeDebtWithVat, 33000);
    assert.equal(result.printedTapeVatAmount, 12000);
    assert.equal(result.printedTapeAxisVatAmount, 8000);
    assert.equal(result.standardTapeVatAmount, 3000);
    assert.equal(result.printAxisVatAmount, 12000);
    assert.equal(result.salesVatAmountFields, true);
    assert.equal(result.salesVatAmountsInResult, true);
    assert.equal(result.quoteDeliveryDateFields, 0);
    assert.equal(result.quotePreviewActive, true);
    assert.equal(result.quotePreviewHasCustomer, true);
    assert.equal(result.quotePreviewHasDeliveryDate, false);
    assert.equal(result.quotePreviewShowsVatPrices, true);
    assert.equal(result.noVatPreviewHidesVatPrices, true);
    assert.deepEqual(result.filterActionLabels, ['Tất cả', 'Bỏ chọn tất cả', 'Xóa lọc']);
    assert.equal(result.filteredCustomerRows, 1);
    assert.equal(result.rowsWhileStaleFilterAfterEdit, 0);
    assert.equal(result.rowsAfterColumnClearFollowingEdit, 2);
    assert.equal(result.filterMenuRemainsOpen, true);
    assert.equal(result.columnSearchCleared, true);
    assert.equal(result.columnValuesReset, true);
    assert.equal(result.deselectedCustomerRows, 0);
    assert.equal(result.emptySelectionHeaderActive, true);
    assert.equal(result.selectedAllCustomerRows, 2);
    assert.equal(result.rowsAfterClearAllFollowingEdit, 2);
    assert.equal(result.allFilterControlsReset, true);
    assert.equal(result.allColumnFiltersReset, true);
    assert.equal(result.filterMenuClosed, true);
    assert.equal(result.customerHeaderInactive, true);
    assert.equal(result.filterCloseListenerBalance, 0);
    assert.equal(result.bkiAxisExcelRowCount, 3);
    assert.deepEqual(result.bkiAxisExcelNames, ['Trục đơn', 'Trục đỏ', 'Trục xanh']);
    assert.deepEqual(result.bkiAxisExcelOrderIds, ['BKI-EXCEL-1', 'BKI-EXCEL-2', 'BKI-EXCEL-2']);
    assert.deepEqual(result.bkiAxisExcelVatTotals, [108000, 66000, 151200]);
    assert.deepEqual(result.bkiInlineExcelRowLabels, ['Đơn đầu', '↳ Trục kèm BKI: Trục ngay dưới', 'Đơn kế tiếp']);
    assert.deepEqual(result.bkiInlineExcelRowIds, ['BKI-INLINE-1', '↳ BKI-INLINE-1', 'BKI-INLINE-2']);
    assert.equal(result.bkiInlineExcelAxisNote, 'VAT 10% · Giá gồm VAT 55000');
    console.log('Electron quotation UI smoke test passed');
  } catch (error) {
    if (stderr.trim()) console.error(stderr.trim());
    throw error;
  } finally {
    electron.kill();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

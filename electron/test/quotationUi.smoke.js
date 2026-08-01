const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

const electronExecutable = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron',
  'dist',
  process.platform === 'win32' ? 'electron.exe' : 'electron'
);
const appDirectory = path.join(__dirname, '..');
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
  const electron = spawn(electronExecutable, [`--remote-debugging-port=${debugPort}`, '.'], {
    cwd: appDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  let stderr = '';
  electron.stderr.on('data', chunk => { stderr += chunk.toString(); });

  try {
    const page = await waitForPage();
    const result = await evaluate(page, String.raw`(async () => {
      const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
      for (let attempt = 0; attempt < 40 && typeof addQuoteDraft !== 'function'; attempt += 1) {
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
      setValue('q-bki-ngay-du-kien', '2026-08-15');
      setValue('q-bki-qc-mm', '48');
      setValue('q-bki-so-luong', '10');
      setValue('q-bki-don-gia-ban', '12000');
      addQuoteDraft('bang_keo_in');

      const sharedAfterAdd = [
        'q-bki-ten-hang',
        'q-bki-ten-khach-hang',
        'q-bki-ngay-du-kien'
      ].map(id => document.getElementById(id).value);
      setValue('q-bki-qc-mm', '60');
      switchQuoteDraft('bang_keo_in', quoteDraftStates.bang_keo_in.drafts[0].id);

      setBangKeoInAxisMode('quote', 'moi');
      setValue('q-bki-truc-ten', 'Trục màu đỏ');
      setValue('q-bki-truc-so-luong', '1');
      setValue('q-bki-truc-gia-goc', '30000');
      setValue('q-bki-truc-gia-ban', '50000');
      setValue('q-bki-truc-vat', '5000');
      addCurrentQuoteAxis();
      setValue('q-bki-truc-ten', 'Trục màu xanh');
      setValue('q-bki-truc-so-luong', '2');
      setValue('q-bki-truc-gia-goc', '35000');
      setValue('q-bki-truc-gia-ban', '60000');
      setValue('q-bki-truc-vat', '12000');
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
          { specification: '48mm x 100m (50mic)', quantity: 10, unitPrice: 12000, total: 120000, fields: { 'qc-mm': '48', 'so-luong': '10', 'don-gia-ban': '12000', 'loai-truc': 'moi' }, axes: [{ name: 'Trục đỏ', quantity: 1, costPrice: 30000, unitPrice: 50000, total: 50000, vat: 5000 }] },
          { specification: '60mm x 100m (50mic)', quantity: 5, unitPrice: 15000, total: 75000, fields: { 'qc-mm': '60', 'so-luong': '5', 'don-gia-ban': '15000', 'loai-truc': 'cu' }, axes: [] }
        ]
      });

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
        editAxisVat: getActiveQuoteDraft('bang_keo_in').savedAxes[0]?.vat,
        editBannerVisible: !document.getElementById('quote-edit-banner-bang_keo_in').hidden,
        editSubmitLabel: document.querySelector('#form-quote-bang-keo-in button[type="submit"]').textContent
      };
    })()`);

    assert.equal(result.draftCountBeforeEdit, 2);
    assert.deepEqual(result.sharedAfterAdd, ['Băng keo thử tab', 'Khách chung', '2026-08-15']);
    assert.equal(result.restoredMillimeters, '48');
    assert.equal(result.savedAxisNodesBeforeEdit, 1);
    assert.equal(result.totalAxes, 2);
    assert.deepEqual(result.axisNames, ['Trục màu đỏ', 'Trục màu xanh']);
    assert.deepEqual(result.axisVats, [5000, 12000]);
    assert.equal(result.productCardCount, 1);
    assert.equal(result.entryContainsReadonly, false);
    assert.equal(result.resultContainsEditable, false);
    assert.equal(result.editDraftCount, 2);
    assert.deepEqual(result.editShared, ['Băng keo cần sửa', 'Khách chỉnh sửa']);
    assert.equal(result.editFirstSize, '48');
    assert.equal(result.editAxisVat, 5000);
    assert.equal(result.editBannerVisible, true);
    assert.equal(result.editSubmitLabel, 'Cập nhật báo giá & Xuất PDF');
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

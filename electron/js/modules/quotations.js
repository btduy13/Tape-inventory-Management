// JS/MODULES/QUOTATIONS.JS - QUẢN LÝ DANH SÁCH BÁO GIÁ VÀ XUẤT PDF
let quotationsAllList = [];
const quoteDraftStates = {};
let editingQuoteState = null;
const quoteDraftConfigs = {
  bang_keo_in: { formId: 'form-quote-bang-keo-in', prefix: 'q-bki-', calculate: () => calculateBangKeoIn('quote') },
  bang_keo: { formId: 'form-quote-bang-keo', prefix: 'q-bk-', calculate: () => calculateBangKeo('quote') },
  truc_in: { formId: 'form-quote-truc-in', prefix: 'q-ti-', calculate: () => calculateTrucIn('quote') }
};
const salesFormConfigs = {
  bang_keo_in: { formId: 'form-bang-keo-in', prefix: 'bki-' },
  bang_keo: { formId: 'form-bang-keo', prefix: 'bk-' },
  truc_in: { formId: 'form-truc-in', prefix: 'ti-' }
};
const quoteSharedFields = new Set(['ten-hang', 'ngay-du-kien', 'ten-khach-hang']);

document.addEventListener('DOMContentLoaded', () => {
  Object.keys(quoteDraftConfigs).forEach(type => {
    restructureQuoteForm(type);
    initializeQuoteDrafts(type);
  });
  Object.entries(salesFormConfigs).forEach(([type, config]) => restructureSalesForm(type, config));
});

function createQuoteSection(title, description, className) {
  const section = document.createElement('section');
  section.className = className;
  section.innerHTML = `
    <div class="quote-section-heading">
      <div><h3>${title}</h3><p>${description}</p></div>
    </div>
    <div class="quote-section-grid"></div>`;
  return section;
}

const quoteEntryGroupConfigs = {
  bang_keo_in: [
    { key: 'specification', title: 'Quy cách & trục in', description: 'Kích thước cuộn và loại trục sử dụng.', fields: ['qc-mm', 'qc-m', 'qc-mic', 'cuon-cay', 'loai-truc'] },
    { key: 'product', title: 'Sản lượng & thành phẩm', description: 'Số lượng, màu in, lõi và bao bì.', fields: ['so-luong', 'mau-keo', 'mau-sac', 'loi-giay', 'thung-bao'] },
    { key: 'pricing', title: 'Giá bán & phụ phí', description: 'Chi phí cấu thành và đơn giá áp dụng.', fields: ['phi-sl', 'phi-keo', 'phi-mau', 'phi-size', 'phi-cat', 'don-gia-von', 'don-gia-ban'] },
    { key: 'payment', title: 'Thanh toán & cộng tác', description: 'Cọc, VAT, vận chuyển và hoa hồng.', fields: ['tien-coc', 'vat', 'tien-ship', 'ctv', 'hoa-hong-percent'] }
  ],
  bang_keo: [
    { key: 'specification', title: 'Quy cách & sản lượng', description: 'Thông số của mặt hàng đang báo giá.', fields: ['quy-cach', 'so-luong', 'mau-sac'] },
    { key: 'pricing', title: 'Giá & thanh toán', description: 'Giá mua, giá bán, VAT và vận chuyển.', fields: ['don-gia-goc', 'don-gia-ban', 'vat', 'tien-ship'] },
    { key: 'collaboration', title: 'Cộng tác viên', description: 'Người giới thiệu và tỷ lệ hoa hồng.', fields: ['ctv', 'hoa-hong-percent'] }
  ],
  truc_in: [
    { key: 'specification', title: 'Quy cách & sản lượng', description: 'Kích thước, số lượng và màu trục.', fields: ['quy-cach', 'so-luong', 'mau-sac', 'mau-keo'] },
    { key: 'pricing', title: 'Giá & thanh toán', description: 'Giá gia công, giá bán, VAT và vận chuyển.', fields: ['don-gia-goc', 'don-gia-ban', 'vat', 'tien-ship'] },
    { key: 'collaboration', title: 'Cộng tác viên', description: 'Người giới thiệu và tỷ lệ hoa hồng.', fields: ['ctv', 'hoa-hong-percent'] }
  ]
};

const quoteAxisEntryGroups = [
  { key: 'identity', title: 'Thông số trục', description: 'Tên, chu vi và số lượng trục.', fields: ['truc-ten', 'truc-chu-vi', 'truc-so-luong'] },
  { key: 'pricing', title: 'Giá & VAT trục', description: 'Giá vốn, giá bán và VAT riêng của trục.', fields: ['truc-gia-goc', 'truc-gia-ban', 'truc-vat'] },
  { key: 'collaboration', title: 'Hoa hồng trục', description: 'CTV và tỷ lệ hoa hồng của trục.', fields: ['truc-ctv', 'truc-hoa-hong-percent'] }
];

function organizeQuoteEntryGroups(container, prefix, groups) {
  if (!container || !groups?.length) return;
  const fieldNodes = new Map();
  [...container.querySelectorAll(':scope > .form-group')].forEach(group => {
    const control = group.querySelector('input[id], select[id], textarea[id]');
    if (control?.id.startsWith(prefix)) fieldNodes.set(control.id.slice(prefix.length), group);
  });

  container.classList.add('quote-entry-groups');
  groups.forEach(groupConfig => {
    const subsection = document.createElement('section');
    subsection.className = `quote-entry-group quote-entry-group-${groupConfig.key}`;
    subsection.innerHTML = `
      <header class="quote-entry-group-heading">
        <h4>${groupConfig.title}</h4>
        <p>${groupConfig.description}</p>
      </header>
      <div class="quote-entry-group-grid"></div>`;
    const grid = subsection.querySelector('.quote-entry-group-grid');
    groupConfig.fields.forEach(field => {
      const node = fieldNodes.get(field);
      if (node) {
        grid.append(node);
        fieldNodes.delete(field);
      }
    });
    if (grid.children.length) container.append(subsection);
  });

  if (fieldNodes.size) {
    const fallback = document.createElement('section');
    fallback.className = 'quote-entry-group quote-entry-group-other';
    fallback.innerHTML = '<header class="quote-entry-group-heading"><h4>Thông tin khác</h4></header><div class="quote-entry-group-grid"></div>';
    fieldNodes.forEach(node => fallback.querySelector('.quote-entry-group-grid').append(node));
    container.append(fallback);
  }
}

function restructureSalesForm(type, config) {
  const form = document.getElementById(config?.formId);
  if (!form || form.classList.contains('sales-ui-restructured')) return;

  const productInput = document.getElementById(`${config.prefix}ten-hang`);
  const customerInput = document.getElementById(`${config.prefix}ten-khach-hang`);
  const dateInput = document.getElementById(`${config.prefix}ngay-du-kien`);
  const saleInput = document.getElementById(`${config.prefix}don-gia-ban`);
  const infoCard = productInput?.closest('.form-card');
  const priceCard = saleInput?.closest('.form-card');
  if (!productInput || !customerInput || !dateInput || !infoCard || !priceCard) return;

  const productCard = createQuoteSection(
    'Tên hàng',
    'Thông tin nhận diện của đơn bán hàng.',
    'form-card quote-product-card sales-product-card'
  );
  productCard.querySelector('.quote-section-grid').append(productInput.closest('.form-group'));
  infoCard.before(productCard);

  infoCard.classList.add('quote-shared-card', 'sales-shared-card');
  const infoTitle = infoCard.querySelector('.form-section-title');
  if (infoTitle) infoTitle.textContent = 'Khách hàng và thời gian giao';
  infoCard.querySelector('.form-grid')?.classList.add('quote-shared-grid');

  const entrySection = createQuoteSection(
    'Kê khai',
    'Thông tin cần nhập cho đơn hàng đang tạo.',
    'quote-entry-section sales-entry-section'
  );
  const resultSection = createQuoteSection(
    'Kết quả tính toán',
    'Các giá trị tự cập nhật từ phần kê khai.',
    'quote-result-section sales-result-section'
  );
  const entryGrid = entrySection.querySelector('.quote-section-grid');
  const resultGrid = resultSection.querySelector('.quote-section-grid');
  const allGroups = [...new Set([
    ...infoCard.querySelectorAll('.form-group'),
    ...priceCard.querySelectorAll('.form-group')
  ])];
  allGroups.forEach(group => {
    const control = group.querySelector('input, select, textarea');
    if (!control || control === productInput || control === customerInput || control === dateInput) return;
    (control.readOnly ? resultGrid : entryGrid).append(group);
  });
  organizeQuoteEntryGroups(entryGrid, config.prefix, quoteEntryGroupConfigs[type]);

  priceCard.classList.add('quote-workspace-card', 'sales-workspace-card');
  priceCard.querySelector('.form-section-title')?.remove();
  [...priceCard.querySelectorAll(':scope > .form-grid')].forEach(grid => grid.remove());
  const workspace = document.createElement('div');
  workspace.className = 'quote-form-workspace sales-form-workspace';
  workspace.append(entrySection, resultSection);
  priceCard.prepend(workspace);

  const axisCard = type === 'bang_keo_in' ? document.getElementById('bki-new-axis-card') : null;
  if (axisCard) {
    const axisGrid = axisCard.querySelector(':scope > .form-grid');
    if (axisGrid) {
      const axisEntry = createQuoteSection('Kê khai trục', 'Thông số và VAT của trục mới.', 'quote-entry-section sales-entry-section');
      const axisResult = createQuoteSection('Kết quả trục', 'Giá trị được tính riêng cho trục.', 'quote-result-section sales-result-section');
      [...axisGrid.querySelectorAll(':scope > .form-group')].forEach(group => {
        const control = group.querySelector('input, select, textarea');
        const destination = control?.readOnly ? axisResult : axisEntry;
        destination.querySelector('.quote-section-grid').append(group);
      });
      organizeQuoteEntryGroups(axisEntry.querySelector('.quote-section-grid'), config.prefix, quoteAxisEntryGroups);
      const axisWorkspace = document.createElement('div');
      axisWorkspace.className = 'quote-form-workspace quote-axis-workspace sales-form-workspace';
      axisWorkspace.append(axisEntry, axisResult);
      axisGrid.replaceWith(axisWorkspace);
    }
    priceCard.after(axisCard);
  }

  form.classList.add('sales-ui-restructured');
}

function restructureQuoteForm(type) {
  const config = quoteDraftConfigs[type];
  const form = document.getElementById(config?.formId);
  if (!form || form.classList.contains('quote-ui-restructured')) return;

  const productInput = document.getElementById(`${config.prefix}ten-hang`);
  const customerInput = document.getElementById(`${config.prefix}ten-khach-hang`);
  const dateInput = document.getElementById(`${config.prefix}ngay-du-kien`);
  const saleInput = document.getElementById(`${config.prefix}don-gia-ban`);
  const infoCard = productInput?.closest('.form-card');
  const priceCard = saleInput?.closest('.form-card');
  if (!productInput || !customerInput || !dateInput || !infoCard || !priceCard) return;

  const productCard = createQuoteSection(
    'Tên hàng',
    'Thông tin nhận diện chung cho toàn bộ các kích thước trong báo giá.',
    'form-card quote-product-card'
  );
  productCard.querySelector('.quote-section-grid').append(productInput.closest('.form-group'));
  const editBanner = document.createElement('div');
  editBanner.className = 'quote-edit-banner';
  editBanner.id = `quote-edit-banner-${type}`;
  editBanner.hidden = true;
  editBanner.innerHTML = `<div><strong>Đang chỉnh sửa báo giá</strong><span></span></div><button type="button" class="btn btn-secondary btn-sm" onclick="cancelQuoteEditing('${type}')">Hủy chỉnh sửa</button>`;
  infoCard.before(editBanner, productCard);

  infoCard.classList.add('quote-shared-card');
  const infoTitle = infoCard.querySelector('.form-section-title');
  if (infoTitle) infoTitle.textContent = 'Khách hàng và thời gian giao';
  infoCard.querySelector('.form-grid')?.classList.add('quote-shared-grid');

  const entrySection = createQuoteSection(
    'Kê khai',
    'Chỉ gồm các thông tin cần nhập hoặc lựa chọn cho kích thước đang mở.',
    'quote-entry-section'
  );
  const resultSection = createQuoteSection(
    'Kết quả tính toán',
    'Các giá trị này tự cập nhật từ phần kê khai.',
    'quote-result-section'
  );
  const entryGrid = entrySection.querySelector('.quote-section-grid');
  const resultGrid = resultSection.querySelector('.quote-section-grid');
  const allGroups = [...new Set([
    ...infoCard.querySelectorAll('.form-group'),
    ...priceCard.querySelectorAll('.form-group')
  ])];
  allGroups.forEach(group => {
    const control = group.querySelector('input, select, textarea');
    if (!control || control === productInput || control === customerInput || control === dateInput) return;
    (control.readOnly ? resultGrid : entryGrid).append(group);
  });
  organizeQuoteEntryGroups(entryGrid, config.prefix, quoteEntryGroupConfigs[type]);

  priceCard.classList.add('quote-workspace-card');
  priceCard.querySelector('.form-section-title')?.remove();
  [...priceCard.querySelectorAll(':scope > .form-grid')].forEach(grid => grid.remove());
  const workspace = document.createElement('div');
  workspace.className = 'quote-form-workspace';
  workspace.append(entrySection, resultSection);
  priceCard.prepend(workspace);

  const axisCard = document.getElementById('q-bki-new-axis-card');
  if (type === 'bang_keo_in' && axisCard) {
    const axisGrid = axisCard.querySelector(':scope > .form-grid');
    if (axisGrid) {
      const axisEntry = createQuoteSection('Kê khai trục', 'Thông số và VAT của trục đang nhập.', 'quote-entry-section');
      const axisResult = createQuoteSection('Kết quả trục', 'Giá trị được tính riêng cho trục này.', 'quote-result-section');
      [...axisGrid.querySelectorAll(':scope > .form-group')].forEach(group => {
        const control = group.querySelector('input, select, textarea');
        const destination = control?.readOnly ? axisResult : axisEntry;
        destination.querySelector('.quote-section-grid').append(group);
      });
      organizeQuoteEntryGroups(axisEntry.querySelector('.quote-section-grid'), config.prefix, quoteAxisEntryGroups);
      const axisWorkspace = document.createElement('div');
      axisWorkspace.className = 'quote-form-workspace quote-axis-workspace';
      axisWorkspace.append(axisEntry, axisResult);
      axisGrid.replaceWith(axisWorkspace);
    }
    const axisTree = document.getElementById('q-bki-axis-tree-card');
    priceCard.after(axisCard);
    if (axisTree) axisCard.after(axisTree);
  }

  form.classList.add('quote-ui-restructured');
}

function quoteDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function captureQuoteDraftFields(type) {
  const config = quoteDraftConfigs[type];
  const form = document.getElementById(config?.formId);
  if (!form) return {};
  const fields = {};
  form.querySelectorAll('input[id], select[id], textarea[id]').forEach(element => {
    if (!element.id.startsWith(config.prefix)) return;
    const suffix = element.id.slice(config.prefix.length);
    if (quoteSharedFields.has(suffix) || suffix === 'suggestions') return;
    fields[suffix] = element.type === 'checkbox' ? element.checked : element.value;
  });
  return fields;
}

function applyQuoteDraftFields(type, fields = {}) {
  const config = quoteDraftConfigs[type];
  Object.entries(fields).forEach(([suffix, value]) => {
    const element = document.getElementById(`${config.prefix}${suffix}`);
    if (!element) return;
    if (element.type === 'checkbox') element.checked = !!value;
    else element.value = value ?? '';
  });
  if (type === 'bang_keo_in') {
    const mode = fields['loai-truc'] === 'moi' ? 'moi' : 'cu';
    setBangKeoInAxisMode('quote', mode, { preserveFields: true });
    renderQuoteAxisTree();
  }
  config.calculate();
}

function initializeQuoteDrafts(type) {
  if (quoteDraftStates[type]) return quoteDraftStates[type];
  const firstDraft = { id: quoteDraftId(), fields: captureQuoteDraftFields(type), savedAxes: [] };
  quoteDraftStates[type] = { activeId: firstDraft.id, drafts: [firstDraft] };
  const form = document.getElementById(quoteDraftConfigs[type]?.formId);
  form?.addEventListener('input', () => {
    captureActiveQuoteDraft(type);
    renderQuoteDraftTabs(type);
  });
  renderQuoteDraftTabs(type);
  return quoteDraftStates[type];
}

function getActiveQuoteDraft(type) {
  const state = initializeQuoteDrafts(type);
  return state.drafts.find(draft => draft.id === state.activeId) || state.drafts[0];
}

function captureActiveQuoteDraft(type) {
  const draft = getActiveQuoteDraft(type);
  draft.fields = captureQuoteDraftFields(type);
  return draft;
}

function quoteDraftLabel(type, draft, index) {
  const fields = draft.fields || {};
  const specification = type === 'bang_keo_in'
    ? [fields['qc-mm'] && `${fields['qc-mm']}mm`, fields['qc-m'] && `${fields['qc-m']}m`].filter(Boolean).join(' × ')
    : fields['quy-cach'];
  return specification || `Kích thước ${index + 1}`;
}

function renderQuoteDraftTabs(type) {
  const state = quoteDraftStates[type];
  const container = document.getElementById(`quote-drafts-${type}`);
  if (!state || !container) return;
  container.innerHTML = state.drafts.map((draft, index) => `
    <button type="button" class="quote-draft-tab ${draft.id === state.activeId ? 'active' : ''}"
      role="tab" aria-selected="${draft.id === state.activeId}" onclick="switchQuoteDraft('${type}', '${draft.id}')">
      <span>${escapeQuoteHtml(quoteDraftLabel(type, draft, index))}</span>
      ${state.drafts.length > 1 ? `<span class="quote-draft-close" title="Xóa kích thước" onclick="event.stopPropagation(); removeQuoteDraft('${type}', '${draft.id}')">×</span>` : ''}
    </button>
  `).join('');
  const count = document.getElementById(`quote-draft-count-${type}`);
  if (count) count.textContent = `${state.drafts.length} kích thước`;
}

function addQuoteDraft(type) {
  const state = initializeQuoteDrafts(type);
  const current = captureActiveQuoteDraft(type);
  const draft = {
    id: quoteDraftId(),
    fields: JSON.parse(JSON.stringify(current.fields || {})),
    savedAxes: JSON.parse(JSON.stringify(current.savedAxes || []))
  };
  state.drafts.push(draft);
  state.activeId = draft.id;
  applyQuoteDraftFields(type, draft.fields);
  renderQuoteDraftTabs(type);
}

function switchQuoteDraft(type, draftId) {
  const state = initializeQuoteDrafts(type);
  captureActiveQuoteDraft(type);
  const target = state.drafts.find(draft => draft.id === draftId);
  if (!target) return;
  state.activeId = target.id;
  applyQuoteDraftFields(type, target.fields);
  renderQuoteDraftTabs(type);
}

function removeQuoteDraft(type, draftId) {
  const state = initializeQuoteDrafts(type);
  if (state.drafts.length <= 1) return;
  const index = state.drafts.findIndex(draft => draft.id === draftId);
  state.drafts = state.drafts.filter(draft => draft.id !== draftId);
  if (state.activeId === draftId) {
    const target = state.drafts[Math.max(0, index - 1)] || state.drafts[0];
    state.activeId = target.id;
    applyQuoteDraftFields(type, target.fields);
  }
  renderQuoteDraftTabs(type);
}

function addCurrentQuoteAxis() {
  const draft = captureActiveQuoteDraft('bang_keo_in');
  const axis = axisFromFields(draft.fields);
  if (!axis || !axis.name || axis.quantity <= 0 || axis.costPrice <= 0 || axis.unitPrice <= 0) {
    utils.showToast('Nhập đủ tên trục, số lượng, giá gốc và giá bán trước khi thêm trục tiếp theo', 'warning');
    return;
  }
  draft.savedAxes = [...(draft.savedAxes || []), axis];
  clearBangKeoInAxisFields('quote');
  const mode = document.getElementById('q-bki-loai-truc');
  if (mode) mode.value = 'moi';
  draft.fields = captureQuoteDraftFields('bang_keo_in');
  renderQuoteAxisTree();
  renderQuoteDraftTabs('bang_keo_in');
  calculateBangKeoIn('quote');
}

function editSavedQuoteAxis(index) {
  const draft = getActiveQuoteDraft('bang_keo_in');
  const axis = draft.savedAxes?.[index];
  if (!axis) return;
  draft.savedAxes.splice(index, 1);
  const values = {
    'loai-truc': 'moi', 'truc-ten': axis.name, 'truc-chu-vi': axis.circumference || '',
    'truc-so-luong': axis.quantity, 'truc-gia-goc': utils.formatCurrency(axis.costPrice),
    'truc-gia-ban': utils.formatCurrency(axis.unitPrice), 'truc-vat': utils.formatCurrency(axis.vat), 'truc-ctv': axis.collaborator || '',
    'truc-hoa-hong-percent': axis.commissionPercent || 0
  };
  applyQuoteDraftFields('bang_keo_in', { ...draft.fields, ...values });
  draft.fields = captureQuoteDraftFields('bang_keo_in');
  renderQuoteAxisTree();
  calculateBangKeoIn('quote');
}

function removeSavedQuoteAxis(index) {
  const draft = getActiveQuoteDraft('bang_keo_in');
  if (!draft.savedAxes?.[index]) return;
  draft.savedAxes.splice(index, 1);
  renderQuoteAxisTree();
  calculateBangKeoIn('quote');
}

function renderQuoteAxisTree() {
  const tree = document.getElementById('q-bki-axis-tree');
  const card = document.getElementById('q-bki-axis-tree-card');
  if (!tree || !card || !quoteDraftStates.bang_keo_in) return;
  const axes = getActiveQuoteDraft('bang_keo_in').savedAxes || [];
  ['truc-ten', 'truc-chu-vi', 'truc-so-luong', 'truc-gia-goc', 'truc-gia-ban'].forEach(suffix => {
    const input = document.getElementById(`q-bki-${suffix}`);
    if (input) input.required = axes.length === 0 && document.getElementById('q-bki-loai-truc')?.value === 'moi';
  });
  card.style.display = axes.length ? 'block' : 'none';
  tree.innerHTML = axes.map((axis, index) => `
    <div class="quote-axis-node">
      <span class="quote-tree-branch">${index === axes.length - 1 ? '└─' : '├─'}</span>
      <div class="quote-axis-node-main">
        <strong>Trục ${index + 1}: ${escapeQuoteHtml(axis.name)}</strong>
        <small>Chu vi ${escapeQuoteHtml(axis.circumference || '-')} · SL ${utils.formatCurrency(axis.quantity)} · ${utils.formatCurrency(axis.unitPrice)}đ/trục · VAT ${utils.formatCurrency(axis.vat)}đ</small>
      </div>
      <strong class="quote-axis-node-total">${utils.formatCurrency(axis.total)}đ</strong>
      <button type="button" class="quote-tree-action" onclick="editSavedQuoteAxis(${index})">Sửa</button>
      <button type="button" class="quote-tree-action danger" onclick="removeSavedQuoteAxis(${index})">Xóa</button>
    </div>
  `).join('');
}

function getPrimaryQuoteSpecification(type, data) {
  if (type === 'bang_keo_in') {
    const mm = data.quy_cach_mm || '-';
    const m = data.quy_cach_m || '-';
    const mic = data.quy_cach_mic || '-';
    return `${mm}mm x ${m}m (${mic}mic)`;
  }
  return data.quy_cach || '-';
}

function normalizeStoredQuoteItems(data, type) {
  let stored = data?.quote_items;
  if (typeof stored === 'string') {
    try { stored = JSON.parse(stored); } catch (_) { stored = []; }
  }
  if (Array.isArray(stored) && stored.length > 0) {
    return stored.map(item => ({
      specification: String(item.specification || '-'),
      quantity: Math.max(0, orderMath.number(item.quantity)),
      unitPrice: Math.max(0, orderMath.number(item.unitPrice)),
      total: Math.max(0, orderMath.number(item.total) || orderMath.number(item.quantity) * orderMath.number(item.unitPrice)),
      costTotal: Math.max(0, orderMath.number(item.costTotal)),
      vat: Math.max(0, orderMath.number(item.vat)),
      deposit: Math.max(0, orderMath.number(item.deposit)),
      axes: Array.isArray(item.axes) ? item.axes : [],
      details: item.details || {},
      fields: item.fields || {}
    }));
  }
  return [{
    specification: getPrimaryQuoteSpecification(type, data || {}),
    quantity: Math.max(0, orderMath.number(data?.so_luong)),
    unitPrice: Math.max(0, orderMath.number(data?.don_gia_ban)),
    total: Math.max(0, orderMath.number(data?.thanh_tien_ban)),
    costTotal: Math.max(0, orderMath.number(data?.thanh_tien_goc ?? data?.thanh_tien)),
    vat: Math.max(0, orderMath.number(data?.vat)),
    deposit: Math.max(0, orderMath.number(data?.tien_coc)),
    axes: data?.loai_truc === 'moi' ? [{
      name: data.ten_truc || 'Trục mới', circumference: data.truc_chu_vi,
      quantity: orderMath.number(data.truc_so_luong), unitPrice: orderMath.number(data.truc_gia_ban),
      total: orderMath.number(data.truc_thanh_tien_ban), costTotal: orderMath.number(data.truc_thanh_tien_goc), vat: orderMath.number(data.truc_vat)
    }] : [],
    details: {},
    fields: {}
  }];
}

function quoteDraftNumber(fields, suffix) {
  return orderMath.number(fields?.[suffix]);
}

function quoteDraftCurrency(fields, suffix) {
  return utils.parseCurrency(fields?.[suffix]);
}

function axisFromFields(fields = {}) {
  if (fields['loai-truc'] !== 'moi') return null;
  const name = String(fields['truc-ten'] || '').trim();
  const quantity = Math.max(0, quoteDraftNumber(fields, 'truc-so-luong'));
  const costPrice = Math.max(0, quoteDraftCurrency(fields, 'truc-gia-goc'));
  const salePrice = Math.max(0, quoteDraftCurrency(fields, 'truc-gia-ban'));
  if (!name && quantity === 0 && costPrice === 0 && salePrice === 0) return null;
  const result = orderMath.calculateLine({ quantity, costPrice, salePrice, commissionPercent: fields['truc-hoa-hong-percent'] });
  return {
    name, circumference: quoteDraftNumber(fields, 'truc-chu-vi') || null,
    quantity, costPrice, unitPrice: salePrice, costTotal: result.costTotal, total: result.saleTotal,
    vat: Math.max(0, quoteDraftCurrency(fields, 'truc-vat')),
    collaborator: String(fields['truc-ctv'] || '').trim(), commissionPercent: result.commissionPercent,
    commission: result.commission, profit: result.profit, netProfit: result.netProfit
  };
}

function buildQuoteItem(type, draft) {
  const fields = draft.fields || {};
  if (type === 'bang_keo_in') {
    const result = orderMath.calculatePrintedTape({
      quantity: fields['so-luong'], baseCost: quoteDraftCurrency(fields, 'don-gia-von'),
      quantityFee: quoteDraftCurrency(fields, 'phi-sl'), glueFee: quoteDraftCurrency(fields, 'phi-keo'),
      colorFee: quoteDraftCurrency(fields, 'phi-mau'), sizeFee: quoteDraftCurrency(fields, 'phi-size'),
      cuttingFee: quoteDraftCurrency(fields, 'phi-cat'), salePrice: quoteDraftCurrency(fields, 'don-gia-ban'),
      rollLength: fields['qc-m'], rollsPerTree: fields['cuon-cay'], commissionPercent: fields['hoa-hong-percent'],
      shipping: quoteDraftCurrency(fields, 'tien-ship'), isNewAxis: false
    });
    const currentAxis = axisFromFields(fields);
    const axes = [...(draft.savedAxes || []), ...(currentAxis ? [currentAxis] : [])];
    return {
      specification: getPrimaryQuoteSpecification(type, {
        quy_cach_mm: fields['qc-mm'], quy_cach_m: fields['qc-m'], quy_cach_mic: fields['qc-mic']
      }),
      quantity: result.product.quantity, unitPrice: result.product.salePrice, total: result.product.saleTotal,
      costTotal: result.product.costTotal, vat: quoteDraftCurrency(fields, 'vat'), deposit: quoteDraftCurrency(fields, 'tien-coc'),
      shipping: quoteDraftCurrency(fields, 'tien-ship'), commission: result.product.commission,
      profit: result.product.profit, netProfit: result.product.netProfit, axes,
      details: { mm: fields['qc-mm'], m: fields['qc-m'], mic: fields['qc-mic'], rollsPerTree: fields['cuon-cay'],
        glueColor: fields['mau-keo'], printColor: fields['mau-sac'], paperCore: fields['loi-giay'], packaging: fields['thung-bao'] },
      fields: { ...fields }
    };
  }
  const result = orderMath.calculateStandardOrder({
    quantity: fields['so-luong'], costPrice: quoteDraftCurrency(fields, 'don-gia-goc'),
    salePrice: quoteDraftCurrency(fields, 'don-gia-ban'), commissionPercent: fields['hoa-hong-percent'],
    shipping: quoteDraftCurrency(fields, 'tien-ship'), vat: quoteDraftCurrency(fields, 'vat')
  });
  return {
    specification: String(fields['quy-cach'] || '-'), quantity: result.quantity, unitPrice: result.salePrice,
    total: result.saleTotal, costTotal: result.costTotal, vat: result.vat, deposit: 0,
    shipping: quoteDraftCurrency(fields, 'tien-ship'), commission: result.commission,
    profit: result.profit, netProfit: result.netProfit, axes: [], details: { color: fields['mau-sac'], glueColor: fields['mau-keo'] },
    fields: { ...fields }
  };
}

function quoteDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

function legacyQuoteFields(type, item, data, index) {
  const shared = index === 0 ? data : {};
  if (type === 'bang_keo_in') {
    return {
      'qc-mm': item.details?.mm ?? shared.quy_cach_mm ?? '',
      'qc-m': item.details?.m ?? shared.quy_cach_m ?? '',
      'qc-mic': item.details?.mic ?? shared.quy_cach_mic ?? '',
      'cuon-cay': item.details?.rollsPerTree ?? shared.cuon_cay ?? '',
      'so-luong': item.quantity,
      'don-gia-ban': utils.formatCurrency(item.unitPrice),
      'mau-keo': item.details?.glueColor ?? shared.mau_keo ?? '',
      'mau-sac': item.details?.printColor ?? shared.mau_sac ?? '',
      'loi-giay': item.details?.paperCore ?? shared.loi_giay ?? '',
      'thung-bao': item.details?.packaging ?? shared.thung_bao ?? '',
      'don-gia-von': utils.formatCurrency(shared.don_gia_von || 0),
      'phi-sl': utils.formatCurrency(shared.phi_sl || 0),
      'phi-keo': utils.formatCurrency(shared.phi_keo || 0),
      'phi-mau': utils.formatCurrency(shared.phi_mau || 0),
      'phi-size': utils.formatCurrency(shared.phi_size || 0),
      'phi-cat': utils.formatCurrency(shared.phi_cat || 0),
      'vat': utils.formatCurrency(item.vat),
      'tien-coc': utils.formatCurrency(item.deposit),
      'tien-ship': utils.formatCurrency(item.shipping ?? shared.tien_ship ?? 0),
      'ctv': shared.ctv || '',
      'hoa-hong-percent': shared.hoa_hong || 0,
      'loai-truc': item.axes?.length ? 'moi' : 'cu'
    };
  }
  return {
    'quy-cach': item.specification === '-' ? '' : item.specification,
    'so-luong': item.quantity,
    'mau-sac': item.details?.color ?? shared.mau_sac ?? '',
    'mau-keo': item.details?.glueColor ?? shared.mau_keo ?? '',
    'don-gia-goc': utils.formatCurrency(item.quantity > 0 ? item.costTotal / item.quantity : shared.don_gia_goc || 0),
    'don-gia-ban': utils.formatCurrency(item.unitPrice),
    'vat': utils.formatCurrency(item.vat),
    'tien-ship': utils.formatCurrency(item.shipping ?? shared.tien_ship ?? 0),
    'ctv': shared.ctv || '',
    'hoa-hong-percent': shared.hoa_hong || 0
  };
}

function setQuoteEditingUi(type, quoteId = null) {
  const banner = document.getElementById(`quote-edit-banner-${type}`);
  if (banner) {
    banner.hidden = !quoteId;
    const label = banner.querySelector('span');
    if (label) label.textContent = quoteId ? `Mã ${quoteId} · mọi thay đổi sẽ ghi đè báo giá này` : '';
  }
  const form = document.getElementById(quoteDraftConfigs[type]?.formId);
  const submit = form?.querySelector('button[type="submit"]');
  if (submit) submit.textContent = quoteId ? 'Cập nhật báo giá & Xuất PDF' : 'Lưu toàn bộ & Xuất PDF';
}

async function openQuoteEditor(quoteId, type) {
  const config = quoteDraftConfigs[type];
  if (!config) return;
  const table = type === 'bang_keo_in' ? 'bang_keo_in_orders' : (type === 'bang_keo' ? 'bang_keo_orders' : 'truc_in_orders');
  const response = await window.electronAPI.dbQuery(`SELECT * FROM ${table} WHERE id = $1 AND is_quote = TRUE`, [quoteId]);
  if (!response.ok || !response.rows?.length) {
    utils.showToast('Không tìm thấy báo giá để chỉnh sửa', 'danger');
    return;
  }
  await loadQuoteIntoEditor(quoteId, type, response.rows[0]);
}

async function loadQuoteIntoEditor(quoteId, type, data) {
  const config = quoteDraftConfigs[type];
  if (!config || !data) return;
  const items = normalizeStoredQuoteItems(data, type);
  document.getElementById(`${config.prefix}ten-hang`).value = data.ten_hang || '';
  document.getElementById(`${config.prefix}ten-khach-hang`).value = data.ten_khach_hang || '';
  document.getElementById(`${config.prefix}ngay-du-kien`).value = quoteDateInputValue(data.ngay_du_kien);

  const drafts = items.map((item, index) => ({
    id: quoteDraftId(),
    fields: { ...legacyQuoteFields(type, item, data, index), ...(item.fields || {}) },
    savedAxes: JSON.parse(JSON.stringify(item.axes || []))
  }));
  quoteDraftStates[type] = { activeId: drafts[0].id, drafts };
  editingQuoteState = { id: quoteId, type, original: data };

  await switchTab('quotes-creation');
  const paneMap = { bang_keo_in: 'quotes-form-bang-keo-in', bang_keo: 'quotes-form-bang-keo', truc_in: 'quotes-form-truc-in' };
  switchQuotesForm(paneMap[type]);
  applyQuoteDraftFields(type, drafts[0].fields);
  renderQuoteDraftTabs(type);
  setQuoteEditingUi(type, quoteId);
  document.getElementById(config.formId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  utils.showToast(`Đã mở báo giá ${quoteId} để chỉnh sửa`, 'success');
}

function cancelQuoteEditing(type) {
  if (!editingQuoteState || editingQuoteState.type !== type) return;
  editingQuoteState = null;
  setQuoteEditingUi(type);
  const clearMap = { bang_keo_in: () => clearFormBangKeoIn('quote'), bang_keo: () => clearFormBangKeo('quote'), truc_in: () => clearFormTrucIn('quote') };
  clearMap[type]?.();
  clearQuoteItems(type);
}

const quoteUpdateColumns = {
  bang_keo_in: ['thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay', 'so_luong', 'phi_sl', 'mau_keo', 'phi_keo', 'mau_sac', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'tien_coc', 'cong_no_khach', 'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_giay', 'thung_bao', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'loai_truc', 'ten_truc', 'truc_chu_vi', 'truc_so_luong', 'truc_gia_goc', 'truc_gia_ban', 'truc_thanh_tien_goc', 'truc_thanh_tien_ban', 'truc_ctv', 'truc_hoa_hong', 'truc_tien_hoa_hong', 'truc_loi_nhuan', 'truc_loi_nhuan_rong', 'truc_vat', 'vat', 'quote_items'],
  bang_keo: ['thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac', 'don_gia_goc', 'thanh_tien', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'vat', 'quote_items'],
  truc_in: ['thoi_gian', 'ten_hang', 'ten_khach_hang', 'ngay_du_kien', 'quy_cach', 'so_luong', 'mau_sac', 'mau_keo', 'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban', 'cong_no_khach', 'ctv', 'hoa_hong', 'tien_hoa_hong', 'loi_nhuan', 'tien_ship', 'loi_nhuan_rong', 'vat', 'quote_items']
};

async function saveEditedQuoteIfNeeded(type, data) {
  if (!editingQuoteState || editingQuoteState.type !== type) return false;
  const table = type === 'bang_keo_in' ? 'bang_keo_in_orders' : (type === 'bang_keo' ? 'bang_keo_orders' : 'truc_in_orders');
  const columns = quoteUpdateColumns[type];
  const params = columns.map(column => column === 'quote_items' ? JSON.stringify(data[column] || []) : data[column]);
  params.push(editingQuoteState.id);
  const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
  const response = await window.electronAPI.dbRun(
    `UPDATE ${table} SET ${assignments} WHERE id = $${params.length} AND is_quote = TRUE`,
    params
  );
  if (!response.ok) {
    utils.showToast(`Không thể cập nhật báo giá: ${response.error}`, 'danger');
    return true;
  }

  const quoteId = editingQuoteState.id;
  utils.showToast(`Đã cập nhật báo giá ${quoteId}`, 'success');
  if (typeof generateAndSaveQuotePDF === 'function') await generateAndSaveQuotePDF(quoteId, type, data);
  editingQuoteState = null;
  setQuoteEditingUi(type);
  const clearMap = { bang_keo_in: () => clearFormBangKeoIn('quote'), bang_keo: () => clearFormBangKeo('quote'), truc_in: () => clearFormTrucIn('quote') };
  clearMap[type]?.();
  clearQuoteItems(type);
  await loadQuotationsData();
  return true;
}

function prepareQuoteItems(type, data) {
  const state = initializeQuoteDrafts(type);
  captureActiveQuoteDraft(type);
  const items = state.drafts.map(draft => buildQuoteItem(type, draft));
  if (items.some(item => item.quantity <= 0 || item.unitPrice <= 0)) {
    utils.showToast('Mỗi tab kích thước cần có số lượng và đơn giá bán lớn hơn 0', 'warning');
    return false;
  }
  if (items.some(item => item.axes.some(axis => !axis.name || axis.quantity <= 0 || axis.costPrice <= 0 || axis.unitPrice <= 0))) {
    utils.showToast('Mỗi trục cần đủ tên, số lượng, giá gốc và giá bán', 'warning');
    return false;
  }
  data.quote_items = items;
  const totals = orderMath.calculateQuoteBundle(items);
  data.so_luong = totals.quantity;
  data.thanh_tien_ban = totals.productSubtotal;
  const costTotal = totals.costTotal;
  if (type === 'bang_keo') data.thanh_tien = costTotal;
  else data.thanh_tien_goc = costTotal;
  data.vat = totals.vat;
  data.tien_coc = totals.deposit;
  data.tien_ship = totals.shipping;
  data.loi_nhuan = items.reduce((sum, item) => sum + item.profit, 0);
  data.tien_hoa_hong = items.reduce((sum, item) => sum + item.commission, 0);
  data.loi_nhuan_rong = items.reduce((sum, item) => sum + item.netProfit, 0);
  const axes = items.flatMap(item => item.axes || []);
  const axisTotal = totals.axisSubtotal;
  if (type === 'bang_keo_in') {
    data.loai_truc = axes.length ? 'moi' : 'cu';
    data.ten_truc = axes.length ? `${axes.length} trục in` : null;
    data.truc_so_luong = totals.axisQuantity;
    data.truc_gia_goc = data.truc_so_luong > 0 ? totals.axisCostTotal / data.truc_so_luong : 0;
    data.truc_gia_ban = data.truc_so_luong > 0 ? axisTotal / data.truc_so_luong : 0;
    data.truc_thanh_tien_goc = totals.axisCostTotal;
    data.truc_thanh_tien_ban = axisTotal;
    data.truc_vat = totals.axisVat;
    data.truc_loi_nhuan = axes.reduce((sum, axis) => sum + orderMath.number(axis.profit), 0);
    data.truc_tien_hoa_hong = axes.reduce((sum, axis) => sum + orderMath.number(axis.commission), 0);
    data.truc_loi_nhuan_rong = axes.reduce((sum, axis) => sum + orderMath.number(axis.netProfit), 0);
  }
  data.cong_no_khach = totals.remaining;
  return true;
}

function clearQuoteItems(type) {
  delete quoteDraftStates[type];
  initializeQuoteDrafts(type);
}

// 1. Tải danh sách báo giá
async function loadQuotationsData() {
  try {
    const sql = `
      SELECT id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, so_luong, don_gia_ban, thanh_tien_ban, quote_items, 'bang_keo_in' AS type
      FROM bang_keo_in_orders WHERE is_quote = TRUE
      UNION ALL
      SELECT id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, so_luong, don_gia_ban, thanh_tien_ban, quote_items, 'bang_keo' AS type
      FROM bang_keo_orders WHERE is_quote = TRUE
      UNION ALL
      SELECT id, thoi_gian, ten_hang, ten_khach_hang, ngay_du_kien, so_luong, don_gia_ban, thanh_tien_ban, quote_items, 'truc_in' AS type
      FROM truc_in_orders WHERE is_quote = TRUE
      ORDER BY thoi_gian DESC
    `;

    const res = await window.electronAPI.dbQuery(sql);
    if (res.ok) {
      quotationsAllList = res.rows;
      renderQuotationsTable(quotationsAllList);
    } else {
      utils.showToast("Không thể tải danh sách báo giá", "danger");
    }
  } catch (err) {
    console.error("Lỗi tải danh sách báo giá:", err);
  }
}

// 2. Render bảng báo giá
function renderQuotationsTable(rows) {
  const tbody = document.getElementById('quotes-list-tbody');
  if (!tbody) return;

  tbody.innerHTML = "";
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted);">Không tìm thấy bản ghi báo giá nào</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    const items = normalizeStoredQuoteItems(row, row.type);
    const axes = items.flatMap(item => item.axes || []);
    const quoteTotal = items.reduce((sum, item) => sum + item.total + item.vat, 0)
      + axes.reduce((sum, axis) => sum + orderMath.number(axis.total) + orderMath.number(axis.vat), 0);
    
    let typeLabel = "Băng Keo In";
    if (row.type === 'bang_keo') typeLabel = "Băng Keo thường";
    if (row.type === 'truc_in') typeLabel = "Trục In";

    tr.innerHTML = `
      <td><strong>${escapeQuoteHtml(row.id)}</strong></td>
      <td>${escapeQuoteHtml(utils.formatDate(row.thoi_gian))}</td>
      <td>${escapeQuoteHtml(row.ten_hang)} (${typeLabel})<br><small>${items.length} kích thước · ${axes.length} trục</small></td>
      <td>${escapeQuoteHtml(row.ten_khach_hang)}</td>
      <td>${escapeQuoteHtml(utils.formatDate(row.ngay_du_kien))}</td>
      <td style="text-align: right;">${row.so_luong}</td>
      <td style="text-align: right;">${utils.formatCurrency(row.don_gia_ban)}đ</td>
      <td style="text-align: right; font-weight: 700;">${utils.formatCurrency(quoteTotal)}đ</td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-sm" onclick="openQuoteEditor('${row.id}', '${row.type}')" style="padding:2px 8px; font-size:11px; margin-right:4px;">✏️ Sửa</button>
        <button class="btn btn-secondary btn-sm" onclick="downloadQuotePDFById('${row.id}', '${row.type}')" style="padding:2px 8px; font-size:11px; margin-right:4px;">🖨️ PDF</button>
        <button class="btn btn-primary btn-sm" onclick="convertQuoteToOrder('${row.id}', '${row.type}')" style="padding:2px 8px; font-size:11px;">🔄 Chuyển Đơn</button>
      </td>
    `;

    tr.className = 'quote-tree-parent';
    tbody.appendChild(tr);

    items.forEach((item, itemIndex) => {
      const itemRow = document.createElement('tr');
      itemRow.className = 'quote-tree-item';
      itemRow.innerHTML = `
        <td><span class="quote-tree-branch">${itemIndex === items.length - 1 ? '└─' : '├─'}</span> Kích thước ${itemIndex + 1}</td>
        <td></td>
        <td><strong>${escapeQuoteHtml(item.specification)}</strong><br><small>${escapeQuoteHtml(item.details?.printColor || item.details?.color || '')}</small></td>
        <td></td><td></td>
        <td style="text-align:right;">${utils.formatCurrency(item.quantity)}</td>
        <td style="text-align:right;">${utils.formatCurrency(item.unitPrice)}đ</td>
        <td style="text-align:right; font-weight:600;">${utils.formatCurrency(item.total)}đ</td>
        <td></td>`;
      tbody.appendChild(itemRow);

      (item.axes || []).forEach((axis, axisIndex) => {
        const axisRow = document.createElement('tr');
        axisRow.className = 'quote-tree-axis';
        axisRow.innerHTML = `
          <td><span class="quote-tree-branch quote-tree-branch-axis">└─</span> Trục ${axisIndex + 1}</td>
          <td></td>
          <td><strong>${escapeQuoteHtml(axis.name || 'Trục mới')}</strong><br><small>Chu vi ${escapeQuoteHtml(axis.circumference || '-')}</small></td>
          <td></td><td></td>
          <td style="text-align:right;">${utils.formatCurrency(axis.quantity)}</td>
          <td style="text-align:right;">${utils.formatCurrency(axis.unitPrice)}đ</td>
          <td style="text-align:right; font-weight:600;">${utils.formatCurrency(axis.total)}đ<br><small>VAT ${utils.formatCurrency(axis.vat)}đ</small></td>
          <td></td>`;
        tbody.appendChild(axisRow);
      });
    });
  });
}

// 3. Lọc danh sách báo giá offline
function applyQuotesFilters() {
  const query = document.getElementById('quote-list-search').value.toLowerCase().trim();
  const typeFilter = document.getElementById('quote-list-type').value;
  const monthFilter = document.getElementById('quote-list-month').value;

  const filtered = quotationsAllList.filter(row => {
    const matchQuery = !query || 
      row.id.toLowerCase().includes(query) ||
      row.ten_hang.toLowerCase().includes(query) ||
      row.ten_khach_hang.toLowerCase().includes(query);

    const matchType = typeFilter === 'all' || row.type === typeFilter;

    const dateObj = new Date(row.thoi_gian);
    const matchMonth = monthFilter === 'all' || (dateObj.getMonth() + 1).toString() === monthFilter;

    return matchQuery && matchType && matchMonth;
  });

  renderQuotationsTable(filtered);
}

// 4. Tải và Lưu PDF bằng Quote ID (truy vấn DB trước)
async function downloadQuotePDFById(quoteId, type) {
  try {
    let tableName = 'bang_keo_in_orders';
    if (type === 'bang_keo') tableName = 'bang_keo_orders';
    if (type === 'truc_in') tableName = 'truc_in_orders';

    const res = await window.electronAPI.dbQuery(`SELECT * FROM ${tableName} WHERE id = $1`, [quoteId]);
    if (res.ok && res.rows.length > 0) {
      const data = res.rows[0];
      await generateAndSaveQuotePDF(quoteId, type, data);
    } else {
      utils.showToast("Không tìm thấy dữ liệu báo giá để xuất PDF", "danger");
    }
  } catch (err) {
    console.error("Lỗi xuất PDF báo giá:", err);
  }
}

// 5. Hàm tạo HTML và lưu PDF
function escapeQuoteHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function generateAndSaveQuotePDF(quoteId, type, data) {
  try {
    const savePath = await window.electronAPI.showSaveDialog({
      title: "Lưu file báo giá PDF",
      defaultPath: `bao_gia_${quoteId}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!savePath || savePath.canceled || !savePath.filePath) {
      utils.showToast("Đã hủy xuất báo giá PDF", "warning");
      return;
    }

    utils.showToast("Đang tạo file PDF báo giá...", "warning");

    const typeLabel = type === 'bang_keo_in' ? 'Băng Keo In Logo' : (type === 'bang_keo' ? 'Băng Keo thường' : 'Trục In');
    const company = utils.companyInfo || {};
    const quoteItems = normalizeStoredQuoteItems(data, type);
    const allAxes = quoteItems.flatMap((item, itemIndex) => (item.axes || []).map(axis => ({ ...axis, itemIndex })));
    const axisTotal = allAxes.reduce((sum, axis) => sum + orderMath.number(axis.total), 0);
    const productSubtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
    const quoteSubtotal = productSubtotal + axisTotal;
    const vatAmount = quoteItems.reduce((sum, item) => sum + orderMath.number(item.vat)
      + (item.axes || []).reduce((axisSum, axis) => axisSum + orderMath.number(axis.vat), 0), 0);
    const quoteTotal = quoteSubtotal + vatAmount;
    const deposit = parseFloat(data.tien_coc || 0);
    const quoteRemaining = Math.max(0, quoteTotal - deposit);
    const totalWords = convertNumberToVietnameseWords(quoteRemaining || 0) + " đồng chẵn";
    const quoteItemRows = quoteItems.map((item, index) => `
            <tr>
              <td style="text-align: center;">${index + 1}</td>
              <td><strong>${escapeQuoteHtml(data.ten_hang)}</strong><br><small>Màu keo/sắc: ${escapeQuoteHtml(`${item.details?.glueColor || data.mau_keo || ''} ${item.details?.printColor || item.details?.color || data.mau_sac || ''}`.trim() || '-')}</small></td>
              <td>${escapeQuoteHtml(item.specification)}</td>
              <td style="text-align: right;">${utils.formatCurrency(item.quantity)}</td>
              <td style="text-align: right;">${utils.formatCurrency(item.unitPrice)}đ</td>
              <td style="text-align: right; font-weight: bold;">${utils.formatCurrency(item.total)}đ</td>
            </tr>
    `).join('');
    const axisQuoteRows = allAxes.map((axis, index) => `
            <tr>
              <td style="text-align: center;">${quoteItems.length + index + 1}</td>
              <td><strong>${escapeQuoteHtml(axis.name || 'Trục mới')}</strong><br><small>Trục của kích thước ${axis.itemIndex + 1}</small></td>
              <td>Chu vi: ${escapeQuoteHtml(axis.circumference || '-')}</td>
              <td style="text-align: right;">${utils.formatCurrency(axis.quantity)}</td>
              <td style="text-align: right;">${utils.formatCurrency(axis.unitPrice)}đ</td>
              <td style="text-align: right; font-weight: bold;">${utils.formatCurrency(axis.total)}đ</td>
            </tr>
    `).join('');
    const vatRow = vatAmount > 0 ? `
          <tr>
            <td>VAT theo yêu cầu:</td>
            <td>${utils.formatCurrency(vatAmount)}đ</td>
          </tr>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 24mm 18mm 18mm; }
          * { box-sizing: border-box; }
          body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: #172033; background: #fff; font-size: 12px; line-height: 1.5; }
          .accent { height: 8px; background: #2563eb; border-radius: 999px; margin-bottom: 18px; }
          .header { display: grid; grid-template-columns: minmax(0, 1fr) 190px; column-gap: 24px; align-items: start; width: 100%; margin-bottom: 18px; }
          .company, .quote-meta { min-width: 0; }
          .quote-meta { text-align: right; }
          .company-name { max-width: 100%; margin: 0 0 6px; font-size: 14px; line-height: 1.45; font-weight: 700; color: #0f172a; text-transform: uppercase; overflow-wrap: break-word; }
          .info-text { margin: 2px 0; color: #475569; }
          .title { margin: 0 0 8px; font-size: 22px; line-height: 1.35; font-weight: 700; letter-spacing: 0.2px; color: #1d4ed8; white-space: nowrap; }
          .meta-pill { display: inline-block; width: 100%; padding: 8px 10px; border: 1px solid #dbeafe; border-radius: 8px; background: #eff6ff; text-align: left; }
          .meta-row { display: table; width: 100%; margin: 2px 0; }
          .meta-row span, .meta-row strong { display: table-cell; }
          .meta-row strong { text-align: right; }
          .section-title { margin: 18px 0 8px; font-size: 12px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; }
          .info-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #f8fafc; margin-bottom: 16px; }
          .info-grid { width: 100%; border-collapse: collapse; }
          .info-grid td { padding: 3px 0; vertical-align: top; }
          .info-grid .label { width: 120px; color: #64748b; font-weight: 700; }
          .data-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 10px 0 16px; overflow: hidden; border: 1px solid #dbe4f0; border-radius: 10px; }
          .data-table th { background: #1d4ed8; color: #fff; padding: 10px 9px; font-size: 11px; text-align: left; text-transform: uppercase; }
          .data-table td { border-top: 1px solid #e5edf6; padding: 10px 9px; vertical-align: top; }
          .data-table small { color: #64748b; }
          .data-table tbody tr:nth-child(even) td { background: #f8fbff; }
          .totals { width: 45%; margin-left: auto; border-collapse: collapse; font-size: 12px; }
          .totals td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .totals td:first-child { color: #475569; font-weight: 700; }
          .totals td:last-child { text-align: right; font-weight: 800; }
          .totals .grand td { border-bottom: 0; background: #eff6ff; color: #1d4ed8; font-size: 15px; }
          .words-text { margin: 16px 0 34px; padding: 10px 12px; border-left: 4px solid #2563eb; background: #f8fafc; color: #334155; font-style: italic; }
          .note { margin-top: 18px; color: #64748b; font-size: 11px; }
          .signatures { width: 100%; margin-top: 48px; text-align: center; border-collapse: collapse; }
          .signatures td { width: 50%; vertical-align: top; }
          .sign-name { margin-top: 64px; font-weight: 800; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="accent"></div>
        <div class="header">
          <div class="company">
            <p class="company-name">${escapeQuoteHtml(company.name)}</p>
            <p class="info-text"><strong>Địa chỉ:</strong> ${escapeQuoteHtml(company.address)}</p>
            <p class="info-text"><strong>Hotline:</strong> ${escapeQuoteHtml(company.hotline)}</p>
          </div>
          <div class="quote-meta">
            <p class="title">BẢNG BÁO GIÁ</p>
            <div class="meta-pill">
              <div class="meta-row"><span>Số</span><strong>${escapeQuoteHtml(quoteId)}</strong></div>
              <div class="meta-row"><span>Ngày</span><strong>${new Date(data.thoi_gian).toLocaleDateString('vi-VN')}</strong></div>
            </div>
          </div>
        </div>

        <div class="section-title">Thông tin khách hàng</div>
        <div class="info-card">
          <table class="info-grid">
            <tr><td class="label">Khách hàng</td><td><strong>${escapeQuoteHtml(data.ten_khach_hang)}</strong></td></tr>
            <tr><td class="label">Ngày giao hàng</td><td>${new Date(data.ngay_du_kien).toLocaleDateString('vi-VN')}</td></tr>
            <tr><td class="label">Loại hàng</td><td>${escapeQuoteHtml(typeLabel)}</td></tr>
          </table>
        </div>

        <div class="section-title">Chi tiết báo giá</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">STT</th>
              <th style="width: 40%;">Tên sản phẩm</th>
              <th style="width: 18%;">Quy cách</th>
              <th style="width: 10%; text-align: right;">Số lượng</th>
              <th style="width: 12%; text-align: right;">Đơn giá</th>
              <th style="width: 12%; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${quoteItemRows}
            ${axisQuoteRows}
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td>Tổng tiền hàng:</td>
            <td>${utils.formatCurrency(quoteSubtotal)}đ</td>
          </tr>
          ${vatRow}
          <tr>
            <td>Đặt cọc trước:</td>
            <td>${utils.formatCurrency(deposit)}đ</td>
          </tr>
          <tr class="grand">
            <td>Còn lại cần thu:</td>
            <td>${utils.formatCurrency(quoteRemaining)}đ</td>
          </tr>
        </table>

        <p class="words-text"><strong>Bằng chữ:</strong> ${escapeQuoteHtml(totalWords)}</p>
        <p class="note">Báo giá có hiệu lực theo thỏa thuận tại thời điểm xác nhận đơn hàng.</p>

        <table class="signatures">
          <tr>
            <td>
              <p><strong>ĐẠI DIỆN KHÁCH HÀNG</strong></p>
              <p class="sign-name">(Ký, ghi rõ họ tên)</p>
            </td>
            <td>
              <p><strong>NGƯỜI BÁO GIÁ</strong></p>
              <p class="sign-name">${escapeQuoteHtml(company.representative || '')}</p>
              <p style="margin: 4px 0 0; color:#64748b;">HP: ${escapeQuoteHtml(company.representativePhone || '')}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resPdf = await window.electronAPI.printToPdf(htmlContent, savePath.filePath);
    if (resPdf.ok) {
      utils.showToast("Xuất báo giá PDF thành công!", "success");
    } else {
      utils.showToast("Lỗi xuất PDF: " + resPdf.error, "danger");
    }

  } catch (err) {
    console.error("Lỗi tiến trình in PDF báo giá:", err);
    utils.showToast("Lỗi in PDF báo giá", "danger");
  }
}
// 6. Chuyển Báo giá thành Đơn đặt hàng
async function convertQuoteToOrder(quoteId, type) {
  try {
    if (!await utils.confirmAction(
      `Bạn có chắc muốn chuyển báo giá ${quoteId} thành đơn đặt hàng thực tế không?\nHành động này sẽ tạo mã đơn hàng mới.`,
      { title: 'Chuyển báo giá', confirmText: 'Tạo đơn hàng' }
    )) {
      return;
    }

    utils.showToast("Đang thực hiện chuyển đơn hàng...", "warning");

    let tableName = 'bang_keo_in_orders';
    let idPrefix = 'BK';
    if (type === 'bang_keo') {
      tableName = 'bang_keo_orders';
      idPrefix = 'B';
    }
    if (type === 'truc_in') {
      tableName = 'truc_in_orders';
      idPrefix = 'TI';
    }

    // 1. Tạo mã ID đơn hàng mới
    const newOrderId = await generateOrderId(idPrefix, tableName);

    // 2. Cập nhật đơn và tệp đính kèm trên cùng một kết nối transaction
    const updateAttachSql = `
        UPDATE order_attachments
        SET order_id = $1, order_type = $2
        WHERE order_id = $3 AND order_type = $4
    `;

    const debtExpression = tableName === 'bang_keo_in_orders'
      ? `GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) + COALESCE(truc_vat, 0) ELSE 0 END + COALESCE(vat, 0) - COALESCE(tien_coc, 0), 0)`
      : `GREATEST(COALESCE(thanh_tien_ban, 0) + COALESCE(vat, 0), 0)`;
    const updateOrderSql = `
        UPDATE ${tableName}
        SET id = $1,
            is_quote = FALSE,
            thoi_gian = NOW(),
            da_giao = FALSE,
            da_tat_toan = FALSE,
            cong_no_khach = ${debtExpression}
        WHERE id = $2
    `;
    const res = await window.electronAPI.dbTransaction([
      { sql: updateAttachSql, params: [newOrderId, type, quoteId, type] },
      { sql: updateOrderSql, params: [newOrderId, quoteId] }
    ]);

    if (!res.ok) {
      throw new Error(res.error || 'Lỗi cập nhật đơn hàng');
    }

    utils.showToast(`Chuyển đơn thành công! Mã đơn mới: ${newOrderId}`, "success");

    if (typeof switchTab === 'function') {
      await switchTab('thong-ke');
    }

  } catch (err) {
    console.error("Lỗi chuyển báo giá thành đơn hàng:", err);
    const errMsg = err.message || '';
    if (errMsg.includes('lock') || errMsg.includes('timeout')) {
      utils.showToast("Hệ thống đang bận, vui lòng thử lại sau vài giây", "danger");
    } else if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
      utils.showToast("Mã đơn hàng bị trùng, vui lòng thử lại", "danger");
    } else {
      utils.showToast("Không thể chuyển báo giá thành đơn hàng: " + errMsg, "danger");
    }
  }
}

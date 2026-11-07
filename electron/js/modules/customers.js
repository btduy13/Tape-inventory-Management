// JS/MODULES/CUSTOMERS.JS - Ô CHỌN / TẠO KHÁCH HÀNG (bảng customers, qua 2 hàm của migration 0028)
// Gõ tên hoặc SĐT -> gợi ý khách; chọn thì điền tên/SĐT/địa chỉ và nhớ customer_id trên ô tên
// (dataset.customerId). Không chọn khách thì trigger DB tự gắn khách theo SĐT khi lưu đơn.
const CUSTOMER_FORM_PREFIXES = ['bki-', 'bk-', 'ti-', 'ty-', 'q-bki-', 'q-bk-', 'q-ti-'];

document.addEventListener('DOMContentLoaded', () => CUSTOMER_FORM_PREFIXES.forEach(attachCustomerPicker));

function customerLabel(customer) {
  return [customer.name, customer.phone, customer.company].filter(Boolean).join(' · ');
}

function attachCustomerPicker(prefix) {
  const nameInput = document.getElementById(`${prefix}ten-khach-hang`);
  if (!nameInput || nameInput.dataset.customerPicker) return;
  nameInput.dataset.customerPicker = '1';

  const found = new Map();
  const search = async query => {
    const res = await window.electronAPI.dbQuery('customer.search', { query: String(query ?? '').slice(0, 200) });
    if (!res?.ok) return [];
    found.clear();
    return res.rows.map(customer => {
      const label = customerLabel(customer);
      found.set(label, customer);
      return label;
    });
  };
  const pick = label => {
    const customer = found.get(label);
    if (customer) applyCustomer(prefix, customer);
  };

  [nameInput, document.getElementById(`${prefix}sdt-khach-hang`)].forEach(input => {
    if (!input?.parentElement) return;
    const list = document.createElement('div');
    list.className = 'autocomplete-suggestions';
    list.id = `${input.id}-customers`;
    input.parentElement.style.position = 'relative';
    input.after(list);
    utils.setupAutocomplete(input, list, search, pick);
  });

  const hint = document.createElement('small');
  hint.id = `${prefix}customer-hint`;
  hint.className = 'form-hint';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-secondary btn-sm';
  button.textContent = 'Lưu thành khách mới';
  button.addEventListener('click', () => createCustomerFromForm(prefix, button));
  nameInput.parentElement.append(hint, button);
}

function applyCustomer(prefix, customer) {
  const set = (suffix, value) => {
    const el = document.getElementById(`${prefix}${suffix}`);
    if (el && value) el.value = value;
  };
  set('ten-khach-hang', customer.name);
  set('sdt-khach-hang', customer.phone);
  set('dia-chi-khach-hang', customer.address);
  setPickedCustomer(prefix, customer.id, customer.name);
}

// id rỗng = bỏ chọn (lưu đơn không gửi customer_id, trigger DB tự gắn theo SĐT)
function setPickedCustomer(prefix, id, name = '') {
  const nameInput = document.getElementById(`${prefix}ten-khach-hang`);
  if (!nameInput) return;
  if (id) nameInput.dataset.customerId = id;
  else delete nameInput.dataset.customerId;
  const hint = document.getElementById(`${prefix}customer-hint`);
  if (hint) hint.textContent = id ? `Đã gắn khách${name ? `: ${name}` : ''}` : '';
}

async function createCustomerFromForm(prefix, button) {
  const value = suffix => document.getElementById(`${prefix}${suffix}`)?.value.trim() || '';
  const name = value('ten-khach-hang');
  if (!name) {
    utils.showToast('Nhập tên khách trước khi lưu khách mới', 'warning');
    return;
  }
  button.disabled = true;
  try {
    const res = await window.electronAPI.dbQuery('customer.create', {
      name, phone: value('sdt-khach-hang'), address: value('dia-chi-khach-hang')
    });
    const id = res?.ok ? res.rows?.[0]?.id : null;
    if (id) {
      setPickedCustomer(prefix, id, name);
      utils.showToast(`Đã gắn khách ${name}`, 'success');
    } else {
      utils.showToast(`Không tạo được khách (${res?.error || 'lỗi'}). SĐT có thể đã thuộc nhiều khách: gõ tên hoặc SĐT để chọn khách có sẵn.`, 'danger');
    }
  } finally {
    button.disabled = false;
  }
}

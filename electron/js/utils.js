// JS/UTILS.JS - HỘP THƯ VIỆN TIỆN ÍCH CHUNG CHUYÊN FORMAT DỮ LIỆU
const utils = {
  // 1. Định dạng số sang tiền tệ VND (Ví dụ: 1500000 -> "1,500,000")
  formatCurrency: function(value) {
    if (value === null || value === undefined || isNaN(value)) return "0";
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  // 2. Chuyển đổi chuỗi định dạng tiền tệ về số thực (Ví dụ: "1,500,000" -> 1500000)
  parseCurrency: function(str) {
    if (str === null || str === undefined || str === '') return 0;
    if (typeof str === 'number') return Number.isFinite(str) ? str : 0;

    let cleanStr = String(str).trim().replace(/[^\d,.-]/g, '');
    const separators = cleanStr.match(/[.,]/g) || [];
    const looksGrouped = /^-?\d{1,3}([.,]\d{3})+$/.test(cleanStr);
    if (looksGrouped || separators.length > 1) {
      cleanStr = cleanStr.replace(/[.,]/g, '');
    } else {
      cleanStr = cleanStr.replace(',', '.');
    }

    const num = Number(cleanStr);
    return isNaN(num) ? 0 : num;
  },

  // 3. Định dạng ngày tháng thành dd/mm/yyyy
  formatDate: function(dateStrOrObj) {
    if (!dateStrOrObj) return "";
    let d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return dateStrOrObj; // Nếu là chuỗi đã định dạng sẵn
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  },

  // 4. Chuyển đổi định dạng dd/mm/yyyy sang ISO yyyy-mm-dd
  parseDateToISO: function(vietnameseDateStr) {
    if (!vietnameseDateStr) return "";
    const parts = vietnameseDateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return vietnameseDateStr;
  },

  // 5. Hiển thị thông báo Toast nhanh góc dưới màn hình
  companyInfo: {
    name: 'CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI BĂNG KEO IN VĨNH THỊNH',
    shortName: 'Vĩnh Thịnh Băng Keo',
    logoUrl: 'assets/logo.png',
    address: '90E đường số 18B, P. Bình Hưng Hòa A, Q. Bình Tân, TP. HCM, Việt Nam',
    hotline: '0903003882 - 0936380405',
    representative: 'LÝ THANH QUẾ',
    representativePhone: '090 300 3882'
  },

  normalizeOrderType: function(orderType) {
    const normalized = String(orderType || '').replace(/-/g, '_');
    if (normalized === 'truc_in') return 'truc_in';
    if (normalized === 'bang_keo') return 'bang_keo';
    return 'bang_keo_in';
  },

  getOrderTableName: function(orderType) {
    const normalized = utils.normalizeOrderType(orderType);
    if (normalized === 'truc_in') return 'truc_in_orders';
    if (normalized === 'bang_keo') return 'bang_keo_orders';
    return 'bang_keo_in_orders';
  },

  beginFormSubmit: function(event) {
    const form = event?.currentTarget;
    if (!form) return true;
    if (form.dataset.submitting === 'true') return false;
    form.dataset.submitting = 'true';
    form.setAttribute('aria-busy', 'true');
    const button = event.submitter || form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    return true;
  },

  endFormSubmit: function(event) {
    const form = event?.currentTarget;
    if (!form) return;
    delete form.dataset.submitting;
    form.removeAttribute('aria-busy');
    const button = event.submitter || form.querySelector('button[type="submit"]');
    if (button) button.disabled = false;
  },

  showToast: function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = "⚡";
    if (type === 'success') icon = "✔️";
    if (type === 'warning') icon = "⚠️";
    if (type === 'danger') icon = "❌";

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Tự động xóa sau 3.5 giây
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // 6. Tự động hóa việc gắn định dạng tiền tệ cho các input
  setupCurrencyInputs: function() {
    const inputs = document.querySelectorAll('.currency-format');
    inputs.forEach(input => {
      if (input.dataset.currencyReady === 'true') return;
      input.dataset.currencyReady = 'true';

      // Khi focus: bỏ dấu phẩy để dễ sửa
      input.addEventListener('focus', function() {
        const val = utils.parseCurrency(this.value);
        this.value = val === 0 ? "" : val;
      });

      // Khi blur: tự động định dạng lại số
      input.addEventListener('blur', function() {
        const val = utils.parseCurrency(this.value);
        this.value = utils.formatCurrency(val);
      });
      
      // Ngăn chặn nhập ký tự không phải số
      input.addEventListener('keypress', function(e) {
        if (!/[\d\.]/.test(String.fromCharCode(e.which)) && e.which !== 13) {
          e.preventDefault();
        }
      });
    });
  },

  // 7. Tạo danh sách gợi ý tự động (Autocomplete)
  setupAutocomplete: function(inputElement, suggestionsElement, queryFunc, onSelectCallback) {
    let currentFocus = -1;
    let requestId = 0;
    let debounceTimer = null;

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function highlightMatch(item, query) {
      const label = String(item);
      const index = label.toLocaleLowerCase('vi').indexOf(String(query).toLocaleLowerCase('vi'));
      if (index < 0) return escapeHtml(label);
      return `${escapeHtml(label.slice(0, index))}<strong>${escapeHtml(label.slice(index, index + query.length))}</strong>${escapeHtml(label.slice(index + query.length))}`;
    }

    inputElement.addEventListener('input', function() {
      const val = this.value.trim();
      closeAllLists();
      currentFocus = -1;
      if (!val || val.length < 1) return;

      const activeRequest = ++requestId;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        let items = [];
        try {
          items = await queryFunc(val);
        } catch (err) {
          console.error('Autocomplete query failed:', err);
          return;
        }
        if (activeRequest !== requestId || inputElement.value.trim() !== val || items.length === 0) return;

        suggestionsElement.style.width = inputElement.offsetWidth + 'px';
        suggestionsElement.style.display = 'block';

        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'autocomplete-suggestion';
          div.innerHTML = highlightMatch(item, val);
          div.title = `Dùng dữ liệu gần nhất của ${item}`;
          div.addEventListener('mousedown', event => event.preventDefault());
          div.addEventListener('click', async function() {
            inputElement.value = item;
            closeAllLists();
            inputElement.setAttribute('aria-expanded', 'false');
            if (onSelectCallback) await onSelectCallback(item);
          });

          suggestionsElement.appendChild(div);
        });
        inputElement.setAttribute('aria-expanded', 'true');
      }, 120);
    });

    inputElement.addEventListener('keydown', function(e) {
      let x = suggestionsElement.getElementsByClassName('autocomplete-suggestion');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocus++;
        addActive(x);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocus--;
        addActive(x);
      } else if (e.key === 'Enter') {
        if (x.length > 0) {
          e.preventDefault();
          if (currentFocus > -1) {
            if (x[currentFocus]) x[currentFocus].click();
          } else {
            if (x[0]) x[0].click();
          }
        }
      } else if (e.key === 'Escape') {
        closeAllLists();
      }
    });

    function addActive(x) {
      if (!x || x.length === 0) return false;
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = x.length - 1;
      x[currentFocus].classList.add('autocomplete-active');
      x[currentFocus].scrollIntoView({ block: 'nearest' });
    }

    function removeActive(x) {
      for (let i = 0; i < x.length; i++) {
        x[i].classList.remove('autocomplete-active');
      }
    }

    function closeAllLists() {
      requestId++;
      clearTimeout(debounceTimer);
      suggestionsElement.innerHTML = '';
      suggestionsElement.style.display = 'none';
      inputElement.setAttribute('aria-expanded', 'false');
      currentFocus = -1;
    }

    inputElement.setAttribute('autocomplete', 'off');
    inputElement.setAttribute('aria-autocomplete', 'list');
    inputElement.setAttribute('aria-controls', suggestionsElement.id);
    inputElement.setAttribute('aria-expanded', 'false');

    document.addEventListener('click', function(e) {
      if (e.target !== inputElement) {
        closeAllLists();
      }
    });
  }
};

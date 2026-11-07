// JS/UTILS.JS - HỘP THƯ VIỆN TIỆN ÍCH CHUNG CHUYÊN FORMAT DỮ LIỆU
const utils = {
  // 1. Định dạng số sang tiền tệ VND (Ví dụ: 1500000 -> "1,500,000")
  formatCurrency: function(value) {
    if (value === null || value === undefined || value === '') return "0";
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    // Làm tròn đối xứng (nửa xa số 0): -1.5 -> -2, giống 1.5 -> 2 (Math.round cho -1.5 ra -1).
    const rounded = Math.sign(num) * Math.round(Math.abs(num));
    if (rounded === 0) return "0";
    // Dùng BigInt để số rất lớn (>= 1e21) không bị in dạng mũ "1e+21".
    const digits = BigInt(Math.abs(rounded)).toString();
    return (rounded < 0 ? "-" : "") + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  // 2. Chuyển đổi chuỗi định dạng tiền tệ về số thực (Ví dụ: "1,500,000" -> 1500000)
  // Quy tắc dấu phân cách ("." và "," đều được chấp nhận):
  // - Nhiều dấu: dấu CUỐI theo sau bởi 1–2 chữ số là dấu thập phân ("1,234.56" -> 1234.56, "1.234,5" -> 1234.5),
  //   ngược lại mọi dấu là phân cách hàng nghìn ("1.234.567" -> 1234567).
  // - Một dấu: đúng 3 chữ số phía sau và phần nguyên 1–3 chữ số (khác "0") là hàng nghìn ("12.500" -> 12500),
  //   còn lại là thập phân ("12.5" -> 12.5, "0.125" -> 0.125, "1234.567" -> 1234.567).
  parseCurrency: function(str) {
    if (str === null || str === undefined || str === '') return 0;
    if (typeof str === 'number') return Number.isFinite(str) ? str : 0;

    let cleanStr = String(str).trim().replace(/[^\d,.-]/g, '');
    const negative = cleanStr.startsWith('-');
    cleanStr = cleanStr.replace(/-/g, '');
    const separatorCount = (cleanStr.match(/[.,]/g) || []).length;

    if (separatorCount > 1) {
      const last = Math.max(cleanStr.lastIndexOf('.'), cleanStr.lastIndexOf(','));
      const fraction = cleanStr.slice(last + 1);
      if (/^\d{1,2}$/.test(fraction)) {
        cleanStr = cleanStr.slice(0, last).replace(/[.,]/g, '') + '.' + fraction;
      } else {
        cleanStr = cleanStr.replace(/[.,]/g, '');
      }
    } else if (separatorCount === 1) {
      const [integerPart, fraction] = cleanStr.split(/[.,]/);
      const isThousands = /^\d{3}$/.test(fraction) && /^\d{1,3}$/.test(integerPart) && !/^0+$/.test(integerPart);
      cleanStr = isThousands ? integerPart + fraction : `${integerPart || '0'}.${fraction}`;
    }

    if (!/\d/.test(cleanStr)) return 0;
    const num = Number(cleanStr);
    if (!Number.isFinite(num)) return 0;
    return negative && num !== 0 ? -num : num;
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

  // 4b. Chuyển Date/chuỗi/số sang 'YYYY-MM-DD' theo giờ máy (local) cho <input type="date">.
  // Không dùng toISOString() vì đổi sang UTC sẽ lùi một ngày ở múi giờ UTC+7.
  toDateInputValue: function(value) {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    }
    const d = value instanceof Date ? value : new Date(value);
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    const year = String(d.getFullYear()).padStart(4, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 4c. Ngày mai theo giờ máy dạng 'YYYY-MM-DD'
  tomorrowDateInputValue: function() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return utils.toDateInputValue(d);
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
    return ['truc_in', 'bang_keo', 'thank_you'].includes(normalized) ? normalized : 'bang_keo_in';
  },

  getOrderTableName: function(orderType) {
    return `${utils.normalizeOrderType(orderType)}_orders`;
  },

  beginFormSubmit: function(event, fallbackFormId = '') {
    const form = event?.currentTarget || (fallbackFormId ? document.getElementById(fallbackFormId) : null);
    if (!form) return true;
    if (form.dataset.submitting === 'true') return false;
    form.dataset.submitting = 'true';
    form.setAttribute('aria-busy', 'true');
    const button = event?.submitter || form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    return true;
  },

  endFormSubmit: function(event, fallbackFormId = '') {
    const form = event?.currentTarget || (fallbackFormId ? document.getElementById(fallbackFormId) : null);
    if (!form) return;
    delete form.dataset.submitting;
    form.removeAttribute('aria-busy');
    const button = event?.submitter || form.querySelector('button[type="submit"]');
    if (button) button.disabled = false;
  },

  // Hộp xác nhận chồng nhau được xếp hàng đợi (không tự trả về false cho hộp trước).
  _confirmQueue: [],

  confirmAction: function(message, options = {}) {
    const modal = document.getElementById('modal-confirm-action');
    if (!modal) return Promise.resolve(false);

    return new Promise(resolve => {
      const request = { message, options, resolve };
      if (utils._confirmResolver || utils._confirmQueue.length > 0) {
        utils._confirmQueue.push(request);
        return;
      }
      // Ghi nhớ phần tử đang focus trước hộp xác nhận ĐẦU TIÊN để trả focus khi đóng hẳn.
      utils._confirmLastFocused = document.activeElement;
      utils._showConfirmRequest(request);
    });
  },

  _showConfirmRequest: function(request) {
    const modal = document.getElementById('modal-confirm-action');
    const { message, options = {} } = request;
    const title = document.getElementById('confirm-action-title');
    const body = document.getElementById('confirm-action-message');
    const accept = document.getElementById('confirm-action-accept');
    if (title) title.textContent = options.title || 'Xác nhận thao tác';
    if (body) body.textContent = String(message || '');
    // options.date: hiện ô ngày (giá trị mặc định); Xác nhận trả về ngày đã chọn thay vì true
    const date = document.getElementById('confirm-action-date');
    const dateLabel = document.getElementById('confirm-action-date-label');
    if (date) {
      date.hidden = !options.date;
      date.value = options.date || '';
    }
    if (dateLabel) dateLabel.hidden = !options.date;
    utils._confirmWantsDate = Boolean(options.date && date);
    if (accept) {
      accept.textContent = options.confirmText || 'Xác nhận';
      accept.classList.toggle('btn-danger', options.danger === true);
      accept.classList.toggle('btn-primary', options.danger !== true);
    }

    utils._confirmResolver = request.resolve;
    modal?.classList.add('active');
    modal?.setAttribute('aria-hidden', 'false');
    setTimeout(() => accept?.focus(), 0);
  },

  resolveConfirmAction: function(accepted) {
    const modal = document.getElementById('modal-confirm-action');
    const resolve = utils._confirmResolver;
    utils._confirmResolver = null;
    const date = document.getElementById('confirm-action-date');
    if (resolve) resolve(accepted && utils._confirmWantsDate ? (date.value || false) : Boolean(accepted));

    // Còn yêu cầu đang chờ: hiển thị tiếp, giữ modal mở.
    const next = utils._confirmQueue.shift();
    if (next) {
      utils._showConfirmRequest(next);
      return;
    }

    modal?.classList.remove('active');
    modal?.setAttribute('aria-hidden', 'true');
    const lastFocused = utils._confirmLastFocused;
    utils._confirmLastFocused = null;
    if (lastFocused?.focus && lastFocused.isConnected !== false) lastFocused.focus();
  },

  escapeHtml: function(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

    const iconElement = document.createElement('span');
    const messageElement = document.createElement('span');
    iconElement.textContent = icon;
    messageElement.textContent = String(message ?? '');
    toast.append(iconElement, messageElement);
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
      
      // Ngăn chặn nhập ký tự không phải số. "." và "," đều được (parseCurrency hiểu cả hai);
      // dấu "-" chỉ được gõ ở đầu ô khi ô cho phép số âm (data-allow-negative).
      input.addEventListener('keypress', function(e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const key = typeof e.key === 'string' && e.key.length === 1 ? e.key : String.fromCharCode(e.which || 0);
        if (e.key === 'Enter' || e.which === 13) return;
        if (/[\d.,]/.test(key)) return;
        if (key === '-' && utils.allowsNegativeCurrency(this)) {
          const start = typeof this.selectionStart === 'number' ? this.selectionStart : 0;
          const end = typeof this.selectionEnd === 'number' ? this.selectionEnd : start;
          const value = String(this.value || '');
          const remaining = value.slice(0, start) + value.slice(end);
          if (start === 0 && !remaining.includes('-')) return;
        }
        e.preventDefault();
      });

      // Dán: chỉ giữ chữ số và dấu phân cách (cùng dấu "-" ở đầu nếu ô cho phép số âm).
      input.addEventListener('paste', function(e) {
        const text = e.clipboardData?.getData('text') ?? '';
        e.preventDefault();
        const filtered = utils.filterCurrencyText(text, utils.allowsNegativeCurrency(this));
        if (typeof this.setRangeText === 'function' && typeof this.selectionStart === 'number') {
          this.setRangeText(filtered, this.selectionStart, this.selectionEnd ?? this.selectionStart, 'end');
        } else {
          this.value = String(this.value || '') + filtered;
        }
        this.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  },

  // 6b. Ô tiền tệ chỉ cho số âm khi khai báo data-allow-negative (khác "false").
  allowsNegativeCurrency: function(input) {
    return !!input?.hasAttribute?.('data-allow-negative') && input.getAttribute('data-allow-negative') !== 'false';
  },

  // Lọc chuỗi dán vào ô tiền tệ: chỉ giữ chữ số, "." và ","; "-" chỉ ở đầu và khi được phép.
  filterCurrencyText: function(text, allowNegative = false) {
    const source = String(text ?? '').trim();
    const digits = source.replace(/[^\d.,]/g, '');
    return allowNegative && source.startsWith('-') ? '-' + digits : digits;
  },

  // 7. Tạo danh sách gợi ý tự động (Autocomplete)
  setupAutocomplete: function(inputElement, suggestionsElement, queryFunc, onSelectCallback) {
    let currentFocus = -1;
    let requestId = 0;
    let debounceTimer = null;
    let queryPending = false;
    const listId = suggestionsElement.id || `autocomplete-list-${Math.random().toString(36).slice(2)}`;
    if (!suggestionsElement.id) suggestionsElement.id = listId;
    suggestionsElement.setAttribute('role', 'listbox');

    function highlightMatch(item, query) {
      const label = String(item);
      const index = label.toLocaleLowerCase('vi').indexOf(String(query).toLocaleLowerCase('vi'));
      if (index < 0) return utils.escapeHtml(label);
      return `${utils.escapeHtml(label.slice(0, index))}<strong>${utils.escapeHtml(label.slice(index, index + query.length))}</strong>${utils.escapeHtml(label.slice(index + query.length))}`;
    }

    inputElement.addEventListener('input', function() {
      const val = this.value.trim();
      closeAllLists();
      currentFocus = -1;
      if (!val || val.length < 1) return;

      const activeRequest = ++requestId;
      clearTimeout(debounceTimer);
      queryPending = true;
      debounceTimer = setTimeout(async () => {
        debounceTimer = null;
        let items = [];
        try {
          items = await queryFunc(val);
        } catch (err) {
          if (activeRequest === requestId) queryPending = false;
          console.error('Autocomplete query failed:', err);
          return;
        }
        if (activeRequest !== requestId) return;
        queryPending = false;
        if (inputElement.value.trim() !== val || !items || items.length === 0) return;

        suggestionsElement.style.width = inputElement.offsetWidth + 'px';
        suggestionsElement.style.display = 'block';

        items.forEach((item, index) => {
          const div = document.createElement('div');
          div.className = 'autocomplete-suggestion';
          div.id = `${listId}-option-${index}`;
          div.setAttribute('role', 'option');
          div.setAttribute('aria-selected', 'false');
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
        // Danh sách đang mở hoặc gợi ý đang chờ tải: Enter chỉ chọn khi có mục được tô sáng,
        // nếu không thì chỉ đóng danh sách (giữ chữ đã gõ) và không gửi form.
        // Không có danh sách/không chờ: để Enter gửi form bình thường.
        if (x.length > 0 || debounceTimer !== null || queryPending) {
          e.preventDefault();
          if (currentFocus > -1 && x[currentFocus]) {
            x[currentFocus].click();
          } else {
            closeAllLists();
          }
        }
      } else if (e.key === 'Escape') {
        closeAllLists();
      }
    });

    // Rời ô nhập thì đóng danh sách; trễ một chút để thao tác bấm vào gợi ý vẫn kịp chạy.
    inputElement.addEventListener('blur', function() {
      setTimeout(() => {
        if (document.activeElement !== inputElement) closeAllLists();
      }, 150);
    });

    function addActive(x) {
      if (!x || x.length === 0) return false;
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = x.length - 1;
      x[currentFocus].classList.add('autocomplete-active');
      x[currentFocus].setAttribute('aria-selected', 'true');
      if (x[currentFocus].id) inputElement.setAttribute('aria-activedescendant', x[currentFocus].id);
      x[currentFocus].scrollIntoView({ block: 'nearest' });
    }

    function removeActive(x) {
      for (let i = 0; i < x.length; i++) {
        x[i].classList.remove('autocomplete-active');
        x[i].setAttribute('aria-selected', 'false');
      }
      inputElement.removeAttribute('aria-activedescendant');
    }

    function closeAllLists() {
      requestId++;
      clearTimeout(debounceTimer);
      debounceTimer = null;
      queryPending = false;
      suggestionsElement.innerHTML = '';
      suggestionsElement.style.display = 'none';
      inputElement.setAttribute('aria-expanded', 'false');
      inputElement.removeAttribute('aria-activedescendant');
      currentFocus = -1;
    }

    inputElement.setAttribute('autocomplete', 'off');
    inputElement.setAttribute('role', 'combobox');
    inputElement.setAttribute('aria-autocomplete', 'list');
    inputElement.setAttribute('aria-controls', listId);
    inputElement.setAttribute('aria-expanded', 'false');

    document.addEventListener('click', function(e) {
      if (e.target !== inputElement) {
        closeAllLists();
      }
    });
  }
};

if (typeof module === 'object' && module.exports) module.exports = utils;

// JS/UTILS.JS - HỘP THƯ VIỆN TIỆN ÍCH CHUNG CHUYÊN FORMAT DỮ LIỆU
const utils = {
  // 1. Định dạng số sang tiền tệ VND (Ví dụ: 1500000 -> "1,500,000")
  formatCurrency: function(value) {
    if (value === null || value === undefined || isNaN(value)) return "0";
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  // 2. Chuyển đổi chuỗi định dạng tiền tệ về số thực (Ví dụ: "1,500,000" -> 1500000)
  parseCurrency: function(str) {
    if (!str) return 0;
    const cleanStr = str.toString().replace(/,/g, '');
    const num = parseFloat(cleanStr);
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

  // Chọn dòng bảng kiểu Excel: click = chọn 1, Ctrl+click = thêm/bớt, Shift+click = chọn dải
  handleRowSelection: function(tbody, tr, event) {
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(r => r.dataset.id);
    const clickedIndex = rows.indexOf(tr);
    if (clickedIndex === -1) return;

    if (event.shiftKey && tbody._lastSelectedIndex !== undefined && tbody._lastSelectedIndex !== null) {
      const start = Math.min(tbody._lastSelectedIndex, clickedIndex);
      const end = Math.max(tbody._lastSelectedIndex, clickedIndex);
      if (!event.ctrlKey && !event.metaKey) {
        rows.forEach(r => r.classList.remove('selected'));
      }
      for (let i = start; i <= end; i++) {
        rows[i].classList.add('selected');
      }
    } else if (event.ctrlKey || event.metaKey) {
      tr.classList.toggle('selected');
      tbody._lastSelectedIndex = clickedIndex;
    } else {
      const wasOnlySelected = tr.classList.contains('selected') &&
        tbody.querySelectorAll('tr.selected').length === 1;
      rows.forEach(r => r.classList.remove('selected'));
      if (!wasOnlySelected) tr.classList.add('selected');
      tbody._lastSelectedIndex = clickedIndex;
    }
  },

  // Di chuyển lựa chọn bảng bằng bàn phím (ArrowUp/ArrowDown/Home/End)
  moveRowSelection: function(tbody, direction, extend = false) {
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(r => r.dataset.id);
    if (rows.length === 0) return null;

    const selectedRows = rows.filter(r => r.classList.contains('selected'));
    let anchorIndex = selectedRows.length > 0 ? rows.indexOf(selectedRows[selectedRows.length - 1]) : -1;

    let nextIndex;
    if (direction === 'first') nextIndex = 0;
    else if (direction === 'last') nextIndex = rows.length - 1;
    else if (anchorIndex === -1) nextIndex = direction === 'down' ? 0 : rows.length - 1;
    else nextIndex = Math.max(0, Math.min(rows.length - 1, anchorIndex + (direction === 'down' ? 1 : -1)));

    if (!extend) {
      rows.forEach(r => r.classList.remove('selected'));
    }
    rows[nextIndex].classList.add('selected');
    rows[nextIndex].scrollIntoView({ block: 'nearest' });
    tbody._lastSelectedIndex = nextIndex;
    return rows[nextIndex];
  },

  // Mở context menu tại vị trí chuột, tự kẹp trong màn hình và tự đóng
  openContextMenu: function(menuEl, clientX, clientY) {
    if (!menuEl) return;

    menuEl.style.display = 'block';
    menuEl.style.visibility = 'hidden';

    const rect = menuEl.getBoundingClientRect();
    const x = Math.max(8, Math.min(clientX, window.innerWidth - rect.width - 8));
    const y = Math.max(8, Math.min(clientY, window.innerHeight - rect.height - 8));

    menuEl.style.left = `${x}px`;
    menuEl.style.top = `${y}px`;
    menuEl.style.visibility = 'visible';

    function closeMenu() {
      menuEl.style.display = 'none';
      document.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', escCloseMenu, true);
    }

    function escCloseMenu(ev) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        ev.preventDefault();
        closeMenu();
      }
    }

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
      window.addEventListener('keydown', escCloseMenu, true);
    }, 50);
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
    if (type === 'info') icon = "ℹ️";

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
      // Khi focus: bỏ dấu phẩy để dễ sửa
      input.addEventListener('focus', function() {
        const val = utils.parseCurrency(this.value);
        this.value = val === 0 ? "" : val;
      });

      // Khi blur: tự động định dạng lại số
      input.addEventListener('blur', function() {
        const val = parseFloat(this.value);
        this.value = isNaN(val) ? "0" : utils.formatCurrency(val);
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

    inputElement.addEventListener('input', async function() {
      const val = this.value;
      closeAllLists();
      currentFocus = -1;
      if (!val || val.length < 1) return;

      const items = await queryFunc(val);
      if (items.length === 0) return;

      suggestionsElement.style.width = this.offsetWidth + 'px';
      suggestionsElement.style.display = 'block';

      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-suggestion';
        div.innerHTML = `<strong>${item.substr(0, val.length)}</strong>${item.substr(val.length)}`;
        
        div.addEventListener('click', function() {
          inputElement.value = item;
          closeAllLists();
          if (onSelectCallback) onSelectCallback(item);
        });

        suggestionsElement.appendChild(div);
      });
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
      suggestionsElement.innerHTML = '';
      suggestionsElement.style.display = 'none';
      currentFocus = -1;
    }

    document.addEventListener('click', function(e) {
      if (e.target !== inputElement) {
        closeAllLists();
      }
    });
  }
};

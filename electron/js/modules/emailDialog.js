// JS/MODULES/EMAILDIALOG.JS - LOGIC GỬI EMAIL CHUYÊN NGHIỆP

let activeEmailOrderId = null;
let activeEmailOrderType = null;
let emailBaseSubject = "";
let emailAttachments = []; // Chứa danh sách { filename, size, type: 'db'|'local', id, content, checked }
let emailSuggestions = [];

// Khởi tạo và mở email dialog
async function openEmailDialog(orderId, orderType) {
  try {
    orderType = utils.normalizeOrderType(orderType);
    activeEmailOrderId = orderId;
    activeEmailOrderType = orderType;
    emailAttachments = [];

    // 1. Tải thông tin đơn hàng để sinh mẫu email
    const tableName = utils.getOrderTableName(orderType);

    const res = await window.electronAPI.dbQuery(`SELECT * FROM ${tableName} WHERE id = $1`, [orderId]);
    if (!res.ok || res.rows.length === 0) {
      utils.showToast("Không tìm thấy dữ liệu đơn hàng", "danger");
      return;
    }

    const order = res.rows[0];
    const typeLabel = orderType === 'bang_keo_in' ? 'Băng Keo In' : (orderType === 'truc_in' ? 'Trục In' : 'Băng Keo');
    const formattedTitle = `${typeLabel} ${order.ten_hang || ''}`.replace(/[\r\n]+/g, ' ').trim();
    
    // Đặt Tiêu đề gốc
    emailBaseSubject = formattedTitle;
    document.getElementById('email-is-new-axis').checked = true;
    
    // Tự động thiết lập người nhận mặc định
    document.getElementById('email-to').value = "tque197@gmail.com";
    
    // Sinh nội dung mẫu
    let specText = "";
    if (orderType === 'bang_keo_in') {
      specText = `Quy cách: ${order.quy_cach_mm || 0}mm * ${order.quy_cach_m || 0}m * ${order.quy_cach_mic || 0}mic\nLõi giấy: ${order.loi_giay || 'Mặc định'}\nThùng bao: ${order.thung_bao || 'Mặc định'}`;
    } else if (orderType === 'truc_in') {
      specText = `Quy cách: ${order.quy_cach || 'Mặc định'}`;
    } else {
      specText = `Quy cách: ${order.quy_cach || 0} KG`;
    }

    let qtyText = order.so_luong.toLocaleString() + (orderType === 'bang_keo' ? ' KG' : ' cuộn');

    const bodyTemplate = `Chào bác,<br><br>` +
      `Bác làm giúp con đơn hàng ${typeLabel} "<strong>${utils.escapeHtml(order.ten_hang)}</strong>" này nhé:<br>` +
      `Thông tin đơn hàng:<br>` +
      `________________________________<br>` +
      `Màu sắc: ${utils.escapeHtml(order.mau_sac || 'Mặc định')}<br>` +
      `Màu keo: ${utils.escapeHtml(order.mau_keo || 'Thường')}<br>` +
      `Số lượng: ${qtyText}<br>` +
      `${utils.escapeHtml(specText).replace(/\n/g, '<br>')}<br>` +
      `________________________________<br><br>` +
      `Cám ơn bác<br>` +
      `Quế`;

    document.getElementById('email-body-editor').innerHTML = bodyTemplate;

    // Cập nhật tiêu đề email lần đầu
    updateEmailSubjectPrefix();

    // 2. Load attachments của đơn hàng này từ database
    if (orderId && orderId !== 'temp') {
      const attsRes = await window.electronAPI.dbQuery(
        'SELECT id, file_name, file_size FROM order_attachments WHERE order_id = $1 AND order_type = $2',
        [orderId, orderType]
      );
      if (attsRes.ok) {
        attsRes.rows.forEach(att => {
          emailAttachments.push({
            id: att.id,
            filename: att.file_name,
            size: att.file_size,
            type: 'db',
            checked: true
          });
        });
      }
    }

    // 3. Load email history suggestions
    const suggestionsRes = await window.electronAPI.dbQuery(
      'SELECT email_address, SUM(sent_count) as total_count FROM email_history GROUP BY email_address ORDER BY MAX(last_sent_at) DESC, total_count DESC LIMIT 50'
    );
    if (suggestionsRes.ok) {
      emailSuggestions = suggestionsRes.rows.map(row => row.email_address);
    }

    // Cập nhật giao diện đính kèm
    renderEmailAttachmentsTable();
    await loadEmailSmtpSettings();

    // Mở modal
    document.getElementById('modal-email-dialog').classList.add('active');
  } catch (err) {
    utils.showToast("Lỗi tải thông tin email: " + err.message, "danger");
  }
}

async function loadEmailSmtpSettings() {
  const res = await window.electronAPI.getEmailConfig();
  if (!res?.ok) return;
  const cfg = res.config || {};
  document.getElementById('email-smtp-server').value = cfg.server || 'smtp.gmail.com';
  document.getElementById('email-smtp-port').value = cfg.port || 587;
  document.getElementById('email-smtp-username').value = cfg.username || '';
  document.getElementById('email-smtp-password').value = '';
  document.getElementById('email-smtp-sender').value = cfg.sender || '';
  const ready = Boolean(cfg.username && cfg.hasPassword);
  const status = document.getElementById('email-smtp-status');
  status.innerText = ready ? `Đã cấu hình: ${cfg.username}` : 'Chưa cấu hình SMTP — bấm nút SMTP để thiết lập';
  status.style.color = ready ? 'var(--color-success)' : 'var(--color-warning)';
  if (!ready) document.getElementById('email-smtp-settings').style.display = 'block';
}

function toggleEmailSmtpSettings(forceOpen = false) {
  const panel = document.getElementById('email-smtp-settings');
  panel.style.display = forceOpen || panel.style.display === 'none' ? 'block' : 'none';
}

async function saveEmailSmtpSettings() {
  const payload = {
    server: document.getElementById('email-smtp-server').value.trim(),
    port: Number(document.getElementById('email-smtp-port').value),
    username: document.getElementById('email-smtp-username').value.trim(),
    password: document.getElementById('email-smtp-password').value,
    sender: document.getElementById('email-smtp-sender').value.trim()
  };
  const res = await window.electronAPI.saveEmailConfig(payload);
  if (!res.ok) {
    utils.showToast('Không thể lưu SMTP: ' + res.error, 'danger');
    return false;
  }
  utils.showToast('Đã lưu cấu hình SMTP', 'success');
  await loadEmailSmtpSettings();
  return true;
}

async function testEmailSmtpSettings() {
  if (!await saveEmailSmtpSettings()) return;
  utils.showToast('Đang kiểm tra kết nối SMTP...', 'info');
  const res = await window.electronAPI.testEmailConfig();
  if (res.ok) {
    utils.showToast('Kết nối SMTP thành công', 'success');
    document.getElementById('email-smtp-status').innerText = 'SMTP hoạt động bình thường';
  } else {
    utils.showToast('SMTP chưa kết nối được: ' + res.error, 'danger');
    toggleEmailSmtpSettings(true);
  }
}

// Cập nhật tiền tố tiêu đề TRỤC MỚI / TRỤC CŨ
function updateEmailSubjectPrefix() {
  const isNew = document.getElementById('email-is-new-axis').checked;
  const prefix = isNew ? "TRỤC MỚI - " : "TRỤC CŨ - ";
  
  let currentSubject = document.getElementById('email-subject').value.trim();
  
  if (currentSubject.startsWith("TRỤC MỚI - ")) {
    currentSubject = currentSubject.replace("TRỤC MỚI - ", prefix);
  } else if (currentSubject.startsWith("TRỤC CŨ - ")) {
    currentSubject = currentSubject.replace("TRỤC CŨ - ", prefix);
  } else {
    currentSubject = prefix + emailBaseSubject;
  }
  
  document.getElementById('email-subject').value = currentSubject;
}

// Đóng modal email
function closeEmailDialogModal() {
  document.getElementById('modal-email-dialog').classList.remove('active');
  document.getElementById('email-autocomplete-suggestions').style.display = 'none';
}

// Thực hiện định dạng text (bold, italic, color, font...)
function formatEmailText(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('email-body-editor').focus();
}

// Vẽ danh sách attachments
function renderEmailAttachmentsTable() {
  const tbody = document.getElementById('email-attachments-tbody');
  tbody.innerHTML = "";
  
  if (emailAttachments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Không có tệp đính kèm nào</td></tr>`;
    return;
  }

  emailAttachments.forEach((att, idx) => {
    const tr = document.createElement('tr');
    
    const sizeStr = formatBytes(att.size);
    const badge = att.type === 'db' 
      ? '<span class="badge badge-gray" style="font-size:10px;">DB</span>' 
      : '<span class="badge badge-success" style="font-size:10px;">Máy</span>';

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" ${att.checked ? 'checked' : ''} onchange="toggleEmailAttachment(${idx}, this.checked)">
      </td>
      <td>${utils.escapeHtml(att.filename)}</td>
      <td>${sizeStr}</td>
      <td style="text-align: center;">${badge}</td>
    `;
    tbody.appendChild(tr);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function toggleEmailAttachment(idx, checked) {
  emailAttachments[idx].checked = checked;
}

function toggleAllEmailAttachments(checked) {
  emailAttachments.forEach(att => att.checked = checked);
  renderEmailAttachmentsTable();
}

// Chọn file từ máy tính
async function addEmailLocalAttachment() {
  const res = await window.electronAPI.showOpenDialog({
    title: 'Chọn tệp tin đính kèm',
    properties: ['openFile', 'multiSelections']
  });

  if (res.canceled || res.filePaths.length === 0) return;

  for (const filePath of res.filePaths) {
    const fileRes = await window.electronAPI.readFileAsBase64(filePath);
    if (fileRes.ok) {
      // Đoán kích thước từ độ dài base64
      const sizeBytes = Math.round((fileRes.data.length * 3) / 4);
      emailAttachments.push({
        filename: fileRes.name,
        size: sizeBytes,
        type: 'local',
        content: fileRes.data,
        checked: true
      });
    } else {
      utils.showToast(`Không thể đọc tệp ${filePath}: ${fileRes.error}`, "danger");
    }
  }

  renderEmailAttachmentsTable();
}

// Xử lý gợi ý Email Autocomplete
function onEmailToInput() {
  const input = document.getElementById('email-to');
  const val = input.value.trim().toLowerCase();
  const suggestionsBox = document.getElementById('email-autocomplete-suggestions');
  
  if (!val) {
    suggestionsBox.style.display = 'none';
    return;
  }

  const filtered = emailSuggestions.filter(email => email.toLowerCase().includes(val));
  if (filtered.length === 0) {
    suggestionsBox.style.display = 'none';
    return;
  }

  suggestionsBox.innerHTML = "";
  filtered.forEach(email => {
    const div = document.createElement('div');
    div.className = 'autocomplete-suggestion';
    div.innerText = email;
    div.onclick = () => {
      input.value = email;
      suggestionsBox.style.display = 'none';
    };
    suggestionsBox.appendChild(div);
  });

  suggestionsBox.style.display = 'block';
}

function onEmailToFocus() {
  onEmailToInput();
}

// Đóng autocomplete khi nhấn ra ngoài
document.addEventListener('click', (e) => {
  const box = document.getElementById('email-autocomplete-suggestions');
  const input = document.getElementById('email-to');
  if (box && e.target !== input && e.target !== box) {
    box.style.display = 'none';
  }
});

// Gửi email chính thức
async function submitSendEmail() {
  const to = document.getElementById('email-to').value.trim();
  const subject = document.getElementById('email-subject').value.trim();
  const bodyText = document.getElementById('email-body-editor').innerText.trim();
  const bodyHtml = document.getElementById('email-body-editor').innerHTML;

  if (!to) {
    utils.showToast("Vui lòng nhập địa chỉ người nhận!", "warning");
    return;
  }

  if (!subject) {
    utils.showToast("Vui lòng nhập tiêu đề email!", "warning");
    return;
  }

  utils.showToast("Đang gửi email...", "info");

  // Gom tệp đính kèm
  const localAttachments = [];
  const dbAttachmentIds = [];

  emailAttachments.forEach(att => {
    if (!att.checked) return;
    if (att.type === 'local') {
      // Xác định contentType dựa trên đuôi file
      const ext = att.filename.substring(att.filename.lastIndexOf('.')).toLowerCase();
      const contentType = {
        '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.csv': 'text/csv', '.txt': 'text/plain'
      }[ext] || 'application/octet-stream';

      localAttachments.push({
        filename: att.filename,
        content: att.content,
        contentType: contentType
      });
    } else {
      dbAttachmentIds.push(att.id);
    }
  });

  // Đóng gói HTML chuẩn
  const htmlTemplate = `
    <html>
      <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
        ${bodyHtml}
      </body>
    </html>
  `;

  const mailRes = await window.electronAPI.sendEmail(to, subject, bodyText, htmlTemplate, localAttachments, dbAttachmentIds);
  
  if (mailRes.ok) {
    utils.showToast("Đã gửi email thành công!", "success");

    // 1. Cập nhật da_gui_email = TRUE trong database
    const tableName = utils.getOrderTableName(activeEmailOrderType);

    await window.electronAPI.dbRun(`UPDATE ${tableName} SET da_gui_email = TRUE WHERE id = $1`, [activeEmailOrderId]);

    // 2. Lưu vào lịch sử email
    const checkHist = await window.electronAPI.dbQuery(
      'SELECT id, sent_count FROM email_history WHERE LOWER(email_address) = LOWER($1)',
      [to]
    );

    if (checkHist.ok && checkHist.rows.length > 0) {
      const row = checkHist.rows[0];
      await window.electronAPI.dbRun(
        'UPDATE email_history SET last_sent_at = NOW(), sent_count = $1 WHERE id = $2',
        [row.sent_count + 1, row.id]
      );
    } else {
      await window.electronAPI.dbRun(
        'INSERT INTO email_history (email_address, last_sent_at, sent_count) VALUES ($1, NOW(), 1)',
        [to]
      );
    }

    // Đóng dialog và làm mới
    closeEmailDialogModal();
    
    // Tùy theo tab đang đứng để refresh
    if (typeof loadStatsData === 'function') loadStatsData();
    if (typeof loadHistoryData === 'function') loadHistoryData();

  } else {
    utils.showToast("Lỗi gửi email: " + mailRes.error, "danger");
    if (/SMTP|mật khẩu|tài khoản/i.test(mailRes.error || '')) toggleEmailSmtpSettings(true);
  }
}

// JS/MODULES/EMAILDIALOG.JS - LOGIC GỬI EMAIL CHUYÊN NGHIỆP

let activeEmailOrderId = null;
let activeEmailOrderType = null;
let emailBaseSubject = "";
let emailAttachments = []; // Chứa danh sách { filename, size, type: 'db'|'local', id, content, checked }
let emailSuggestions = [];
let emailSendInProgress = false;
let emailDialogRequestId = 0;

// Khởi tạo và mở email dialog
async function openEmailDialog(orderId, orderType) {
  // Mã yêu cầu: nếu người dùng mở email cho đơn khác trong lúc đang tải, bỏ kết quả của lần mở cũ.
  const requestId = ++emailDialogRequestId;
  const isCurrentRequest = () => requestId === emailDialogRequestId;
  try {
    orderType = utils.normalizeOrderType(orderType);

    // 1. Tải thông tin đơn hàng để sinh mẫu email
    const res = await window.electronAPI.dbQuery('order.getById', { orderType, id: orderId });
    if (!isCurrentRequest()) return;
    if (!res.ok || res.rows.length === 0) {
      utils.showToast("Không tìm thấy dữ liệu đơn hàng", "danger");
      return;
    }

    const order = res.rows[0];

    // 2. Load attachments của đơn hàng này từ database (gom vào biến tạm, chỉ áp dụng khi còn là yêu cầu mới nhất)
    const loadedAttachments = [];
    if (orderId && orderId !== 'temp') {
      const attsRes = await window.electronAPI.dbQuery('attachment.listForOrder', { orderId, orderType });
      if (!isCurrentRequest()) return;
      if (attsRes.ok) {
        attsRes.rows.forEach(att => {
          loadedAttachments.push({
            id: att.id,
            filename: String(att.file_name ?? ''),
            size: att.file_size,
            type: 'db',
            checked: true
          });
        });
      }
    }

    // Áp dụng đồng bộ toàn bộ trạng thái của đơn này (không còn await xen giữa)
    activeEmailOrderId = orderId;
    activeEmailOrderType = orderType;
    emailAttachments = loadedAttachments;
    const typeLabel = { bang_keo_in: 'Băng Keo In', truc_in: 'Trục In', thank_you: 'Băng Keo Thank you' }[orderType] || 'Băng Keo';
    const formattedTitle = `${typeLabel} ${order.ten_hang || ''}`.replace(/[\r\n]+/g, ' ').trim();
    
    // Đặt Tiêu đề gốc
    emailBaseSubject = formattedTitle;
    document.getElementById('email-subject').value = "";
    // Chỉ Băng Keo In mới có loại trục; đơn khác mặc định không đánh dấu TRỤC MỚI
    document.getElementById('email-is-new-axis').checked = orderType === 'bang_keo_in' && order.loai_truc === 'moi';
    
    // Tự động thiết lập người nhận mặc định
    document.getElementById('email-to').value = "tque197@gmail.com";
    
    // Sinh nội dung mẫu
    let specText = "";
    if (orderType === 'bang_keo_in') {
      specText = `Quy cách: ${order.quy_cach_mm || 0}mm * ${order.quy_cach_m || 0}m * ${order.quy_cach_mic || 0}mic\nLõi giấy: ${order.loi_giay || 'Mặc định'}\nThùng bao: ${order.thung_bao || 'Mặc định'}`;
    } else if (orderType === 'truc_in') {
      specText = `Quy cách: ${order.quy_cach || 'Mặc định'}`;
    } else if (orderType === 'thank_you') {
      specText = `Kích thước: ${order.kich_thuoc || 'Mặc định'}${order.ghi_chu ? `\nGhi chú: ${order.ghi_chu}` : ''}`;
    } else {
      specText = `Quy cách: ${formatBangKeoEmailSpec(order.quy_cach)}`;
    }

    let qtyText = Number(order.so_luong || 0).toLocaleString('vi-VN') + (orderType === 'bang_keo' ? ' KG' : ' cuộn');

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

    // Cập nhật giao diện đính kèm
    renderEmailAttachmentsTable();

    // 3. Load email history suggestions
    const suggestionsRes = await window.electronAPI.dbQuery('emailHistory.suggestions');
    if (!isCurrentRequest()) return;
    if (suggestionsRes.ok) {
      emailSuggestions = suggestionsRes.rows.map(row => String(row.email_address ?? '')).filter(Boolean);
    }

    await loadEmailSmtpSettings();
    if (!isCurrentRequest()) return;

    // Mở modal
    document.getElementById('modal-email-dialog').classList.add('active');
  } catch (err) {
    if (!isCurrentRequest()) return;
    utils.showToast("Lỗi tải thông tin email: " + err.message, "danger");
  }
}

// Quy cách Băng Keo là chữ tự do (vd. '48mm x 100y'): in nguyên văn, chỉ thêm ' KG' khi là số thuần.
function formatBangKeoEmailSpec(quyCach) {
  const text = String(quyCach ?? '').trim();
  if (!text) return 'Mặc định';
  return /^\d+(?:[.,]\d+)?$/.test(text) ? `${text} KG` : text;
}

// Tách danh sách người nhận (phân cách bằng dấu phẩy / chấm phẩy), bỏ khoảng trắng, chữ thường, bỏ trùng.
function splitEmailRecipients(value) {
  const seen = new Set();
  return String(value ?? '')
    .split(/[,;]/)
    .map(address => address.trim().toLowerCase())
    .filter(address => address && !seen.has(address) && seen.add(address));
}

// --- CẤU HÌNH SMTP ---
const EMAIL_SMTP_FIELD_IDS = {
  server: 'smtp-server',
  port: 'smtp-port',
  username: 'smtp-username',
  password: 'smtp-password',
  sender: 'smtp-sender'
};

function getEmailSmtpFields() {
  const fields = {};
  for (const [key, id] of Object.entries(EMAIL_SMTP_FIELD_IDS)) {
    fields[key] = document.getElementById(id);
  }
  return fields;
}

function getEmailSmtpContainer() {
  return document.getElementById('email-smtp-settings')
    || document.getElementById(EMAIL_SMTP_FIELD_IDS.server)?.parentElement
    || null;
}

async function loadEmailSmtpSettings() {
  const fields = getEmailSmtpFields();
  // Giao diện chưa có ô cấu hình SMTP thì bỏ qua (cấu hình vẫn lấy từ tệp cấu hình)
  if (!fields.server || typeof window.electronAPI?.getEmailConfig !== 'function') return;
  try {
    const res = await window.electronAPI.getEmailConfig();
    if (!res?.ok || !res.config) {
      window.electronAPI.writeLog?.('warning', 'Không tải được cấu hình SMTP: ' + (res?.error || 'không có phản hồi'));
      return;
    }
    const config = res.config;
    fields.server.value = config.server || '';
    if (fields.port) fields.port.value = config.port ?? '';
    if (fields.username) fields.username.value = config.username || '';
    if (fields.sender) fields.sender.value = config.sender || '';
    if (fields.password) {
      // Main không bao giờ trả mật khẩu về giao diện: để trống = giữ mật khẩu đã lưu
      fields.password.value = '';
      fields.password.placeholder = config.hasPassword ? 'Để trống để giữ mật khẩu đã lưu' : 'Nhập mật khẩu ứng dụng SMTP';
    }
  } catch (err) {
    window.electronAPI.writeLog?.('warning', 'Lỗi tải cấu hình SMTP: ' + err.message);
  }
}

function toggleEmailSmtpSettings(forceOpen = false) {
  const container = getEmailSmtpContainer();
  if (!container) {
    console.warn('toggleEmailSmtpSettings: không tìm thấy khung cấu hình SMTP (#email-smtp-settings)');
    return;
  }
  const isHidden = container.hidden || container.style.display === 'none';
  const open = forceOpen === true || isHidden;
  container.hidden = !open;
  container.style.display = open ? 'block' : 'none';
  if (open) document.getElementById(EMAIL_SMTP_FIELD_IDS.server)?.focus?.();
}

// Đọc và kiểm tra dữ liệu trên form SMTP. Trả về { config } hoặc { error }.
function readEmailSmtpForm() {
  const fields = getEmailSmtpFields();
  if (!fields.server || !fields.port || !fields.username) {
    return { error: 'Không tìm thấy ô cấu hình SMTP trên giao diện' };
  }
  const server = fields.server.value.trim();
  const portText = String(fields.port.value ?? '').trim();
  const username = fields.username.value.trim();
  const password = fields.password ? fields.password.value : '';
  const sender = fields.sender ? fields.sender.value.trim() : '';
  if (!server) return { error: 'Vui lòng nhập máy chủ SMTP' };
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: 'Cổng SMTP phải là số nguyên từ 1 đến 65535' };
  }
  if (!username) return { error: 'Vui lòng nhập tài khoản SMTP' };
  return { config: { server, port, username, password, sender } };
}

async function saveEmailSmtpSettings(options = {}) {
  const silent = options && options.silent === true;
  if (typeof window.electronAPI?.saveEmailConfig !== 'function') {
    console.warn('saveEmailSmtpSettings: thiếu electronAPI.saveEmailConfig');
    return false;
  }
  const form = readEmailSmtpForm();
  if (form.error) {
    if (!document.getElementById(EMAIL_SMTP_FIELD_IDS.server)) console.warn('saveEmailSmtpSettings: ' + form.error);
    utils.showToast(form.error, 'warning');
    return false;
  }
  try {
    // Mật khẩu để trống: main giữ mật khẩu đã lưu
    const res = await window.electronAPI.saveEmailConfig(form.config);
    if (!res?.ok) {
      utils.showToast('Không lưu được cấu hình SMTP: ' + (res?.error || 'Lỗi không xác định'), 'danger');
      return false;
    }
    const passwordField = document.getElementById(EMAIL_SMTP_FIELD_IDS.password);
    if (passwordField) {
      passwordField.value = '';
      passwordField.placeholder = 'Để trống để giữ mật khẩu đã lưu';
    }
    if (!silent) utils.showToast('Đã lưu cấu hình SMTP', 'success');
    return true;
  } catch (err) {
    window.electronAPI.writeLog?.('error', 'Lỗi lưu cấu hình SMTP: ' + err.message);
    utils.showToast('Lỗi lưu cấu hình SMTP: ' + err.message, 'danger');
    return false;
  }
}

async function testEmailSmtpSettings() {
  if (typeof window.electronAPI?.testEmailConfig !== 'function') {
    console.warn('testEmailSmtpSettings: thiếu electronAPI.testEmailConfig');
    return false;
  }
  // Main chỉ kiểm tra được cấu hình đã lưu, nên lưu thông tin đang nhập trước khi kiểm tra
  if (document.getElementById(EMAIL_SMTP_FIELD_IDS.server)) {
    const saved = await saveEmailSmtpSettings({ silent: true });
    if (!saved) return false;
  }
  try {
    utils.showToast('Đang kiểm tra kết nối SMTP...', 'info');
    const res = await window.electronAPI.testEmailConfig();
    if (res?.ok) {
      utils.showToast('Kết nối SMTP thành công', 'success');
      return true;
    }
    utils.showToast('Kiểm tra SMTP thất bại: ' + (res?.error || 'Lỗi không xác định'), 'danger');
    return false;
  } catch (err) {
    window.electronAPI.writeLog?.('error', 'Lỗi kiểm tra SMTP: ' + err.message);
    utils.showToast('Lỗi kiểm tra SMTP: ' + err.message, 'danger');
    return false;
  }
}

// Cập nhật tiền tố tiêu đề TRỤC MỚI / TRỤC CŨ
function updateEmailSubjectPrefix() {
  const isNew = document.getElementById('email-is-new-axis').checked;
  const prefix = isNew ? "TRỤC MỚI - " : "TRỤC CŨ - ";
  
  let currentSubject = document.getElementById('email-subject').value.trim();
  
  if (currentSubject === "" || currentSubject === emailBaseSubject) {
    currentSubject = prefix + emailBaseSubject;
  } else if (currentSubject.startsWith("TRỤC MỚI - ")) {
    currentSubject = currentSubject.replace("TRỤC MỚI - ", prefix);
  } else if (currentSubject.startsWith("TRỤC CŨ - ")) {
    currentSubject = currentSubject.replace("TRỤC CŨ - ", prefix);
  } else {
    currentSubject = prefix + currentSubject;
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
        <input type="checkbox" ${att.checked ? 'checked' : ''} data-email-attachment-index="${utils.escapeHtml(idx)}">
      </td>
      <td>${utils.escapeHtml(att.filename)}</td>
      <td>${sizeStr}</td>
      <td style="text-align: center;">${badge}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Ủy quyền sự kiện cho checkbox đính kèm (không dùng onchange inline để tương thích CSP)
document.addEventListener('change', (e) => {
  const checkbox = e.target?.closest?.('#email-attachments-tbody [data-email-attachment-index]');
  if (!checkbox) return;
  toggleEmailAttachment(Number(checkbox.dataset.emailAttachmentIndex), checkbox.checked);
});

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.max(0, Math.floor(Math.log(value) / Math.log(k))));
  return parseFloat((value / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}


function toggleEmailAttachment(idx, checked) {
  if (!emailAttachments[idx]) return;
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

  if (!res || res.canceled || !res.filePaths?.length) return;

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

  if (emailSendInProgress) return;
  emailSendInProgress = true;
  const sentOrderId = activeEmailOrderId;
  const sentOrderType = activeEmailOrderType;
  const sendButton = document.getElementById('email-send-button');
  const modal = document.getElementById('modal-email-dialog');
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = 'Đang gửi...';
  }
  modal?.setAttribute('aria-busy', 'true');

  try {
    utils.showToast("Đang gửi email...", "info");

    // Gom tệp đính kèm
    const localAttachments = [];
    const dbAttachmentIds = [];

    emailAttachments.forEach(att => {
      if (!att.checked) return;
      if (att.type === 'local') {
        const dotIndex = att.filename.lastIndexOf('.');
        const ext = dotIndex >= 0 ? att.filename.substring(dotIndex).toLowerCase() : '';
        const contentType = {
          '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.csv': 'text/csv', '.txt': 'text/plain'
        }[ext] || 'application/octet-stream';

        localAttachments.push({
          filename: att.filename,
          content: att.content,
          contentType
        });
      } else {
        dbAttachmentIds.push(att.id);
      }
    });

    const htmlTemplate = `
      <html>
        <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333333; line-height: 1.6;">
          ${bodyHtml}
        </body>
      </html>
    `;

    const mailRes = await window.electronAPI.sendEmail(
      to,
      subject,
      bodyText,
      htmlTemplate,
      localAttachments,
      dbAttachmentIds
    );

    if (mailRes?.canceled) {
      utils.showToast("Đã hủy gửi email", "warning");
      return;
    }
    if (!mailRes?.ok) {
      utils.showToast("Lỗi gửi email: " + (mailRes?.error || 'Không có phản hồi từ dịch vụ email'), "danger");
      return;
    }

    utils.showToast("Đã gửi email thành công!", "success");
    closeEmailDialogModal();

    const trackingWarnings = await recordEmailSent(sentOrderType, sentOrderId, to);
    if (trackingWarnings.length > 0) {
      const message = 'Email đã gửi nhưng không lưu được trạng thái: ' + trackingWarnings.join('; ');
      window.electronAPI.writeLog('warning', message);
      utils.showToast(message, 'warning');
    }

    if (typeof loadStatsData === 'function') {
      try {
        await loadStatsData();
      } catch (refreshError) {
        window.electronAPI.writeLog('warning', 'Email đã gửi nhưng không làm mới được thống kê: ' + refreshError.message);
      }
    }
  } catch (err) {
    window.electronAPI.writeLog('error', 'Lỗi gửi email từ giao diện: ' + err.message);
    utils.showToast('Lỗi gửi email: ' + err.message, 'danger');
  } finally {
    emailSendInProgress = false;
    modal?.removeAttribute('aria-busy');
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = '📧 Gửi Email';
    }
  }
}

// Ghi trạng thái "đã gửi email" và lịch sử người nhận. Không ném lỗi; trả về danh sách cảnh báo.
// Bộ đếm tăng nguyên tử trong một câu UPDATE (không đọc rồi ghi) nên không mất lượt đếm khi gửi song song.
// Hai máy cùng gửi lần đầu tới một địa chỉ mới có thể (hiếm) tạo hai dòng trùng; gợi ý đã gộp theo địa chỉ.
async function recordEmailSent(orderType, orderId, toValue) {
  const warnings = [];
  const describe = (res) => res?.error || 'Lỗi không xác định';
  try {
    if (orderId && orderId !== 'temp') {
      // orderType đã được chuẩn hóa khi mở hộp thoại (openEmailDialog)
      const statusRes = await window.electronAPI.dbRun('order.markEmailed', { orderType, id: orderId });
      if (!statusRes?.ok) warnings.push('trạng thái đơn hàng (' + describe(statusRes) + ')');
    }
  } catch (err) {
    warnings.push('trạng thái đơn hàng (' + err.message + ')');
  }

  for (const address of splitEmailRecipients(toValue)) {
    try {
      const updateRes = await window.electronAPI.dbRun('emailHistory.increment', { address });
      if (!updateRes?.ok) {
        warnings.push(`lịch sử ${address} (${describe(updateRes)})`);
        continue;
      }
      if (Number(updateRes.rowCount) === 0) {
        const insertRes = await window.electronAPI.dbRun('emailHistory.insert', { address });
        if (!insertRes?.ok) warnings.push(`lịch sử ${address} (${describe(insertRes)})`);
      }
    } catch (err) {
      warnings.push(`lịch sử ${address} (${err.message})`);
    }
  }
  return warnings;
}

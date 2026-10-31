// JS/MODULES/DASHBOARD.JS - LOGIC XỬ LÝ BẢNG TỔNG QUAN & BIỂU ĐỒ
let salesTrendChartInst = null;
let productDistChartInst = null;
let dashboardTrendRequestId = 0;
let dashboardDistRequestId = 0;

// Mốc đầu tháng theo giờ máy (Việt Nam). Truyền dạng tham số để không phụ thuộc múi giờ phiên DB (UTC trên cloud).
function getDashboardMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Chart.js tải từ CDN: khi offline sẽ không có biến Chart. Hiện ghi chú nhẹ thay vì báo lỗi kết nối DB.
function showDashboardChartPlaceholder(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const container = canvas.parentElement;
  canvas.style.display = 'none';
  let note = container?.querySelector('.chart-placeholder');
  if (container && !note) {
    note = document.createElement('div');
    note.className = 'chart-placeholder';
    note.setAttribute('role', 'note');
    note.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px;text-align:center;';
    container.appendChild(note);
  }
  if (note) note.textContent = message;
}

function getDashboardChartContext(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (typeof Chart === 'undefined') {
    showDashboardChartPlaceholder(canvasId, 'Không tải được thư viện biểu đồ (có thể đang offline). Số liệu vẫn được cập nhật.');
    return null;
  }
  canvas.style.display = '';
  canvas.parentElement?.querySelector('.chart-placeholder')?.remove();
  return canvas.getContext('2d');
}

function truncateDashboardLabel(value, maxLength, keepLength) {
  const text = String(value ?? '');
  return text.length > maxLength ? text.substring(0, keepLength) + "..." : text;
}

async function loadDashboardData() {
  try {
    const databaseStatus = await window.electronAPI.getDatabaseStatus();
    if (!databaseStatus.connected) {
      throw new Error(databaseStatus.error || 'Chưa kết nối cơ sở dữ liệu');
    }

    // 1. Cập nhật thẻ chỉ số (Metrics) tháng này
    await loadDashboardMetrics();
    await loadDashboardAttentionMetrics();

    // 2. Cập nhật biểu đồ doanh số (mặc định là 'daily')
    await updateDashboardCharts('daily');

    // 3. Cập nhật biểu đồ phân bố sản phẩm
    await loadProductDistributionChart();

    if (typeof setConnectionStatus === 'function') {
      setConnectionStatus(true);
    }

  } catch (err) {
    if (typeof setConnectionStatus === 'function') {
      setConnectionStatus(false, 'Mây: Cần cấu hình');
    }
    window.electronAPI.writeLog('error', 'Lỗi tải trang tổng quan: ' + err.message);
    utils.showToast(`Không thể tải dữ liệu: ${err.message}. Bấm badge Mây để xử lý.`, 'danger');
  }
}

// Tải số liệu thống kê tháng này cho các Cards
async function loadDashboardMetrics() {
  const monthStart = getDashboardMonthStart();
  const resMetrics = await window.electronAPI.dbQuery('dashboard.monthMetrics', { since: monthStart });
  const resTop = await window.electronAPI.dbQuery('dashboard.topProduct', { since: monthStart });

  if (resMetrics.ok && resMetrics.rows.length > 0) {
    const data = resMetrics.rows[0];
    const totalOrders = parseInt(data.total_orders, 10) || 0;
    const totalRevenue = parseFloat(data.total_revenue) || 0;
    const avgOrder = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    document.getElementById('dash-total-orders').innerText = totalOrders.toLocaleString('vi-VN');
    document.getElementById('dash-revenue').innerText = utils.formatCurrency(totalRevenue) + "đ";
    document.getElementById('dash-avg-order').innerText = utils.formatCurrency(avgOrder) + "đ";
  }

  if (resTop.ok && resTop.rows.length > 0) {
    const topProd = String(resTop.rows[0].ten_hang ?? '') || 'N/A';
    document.getElementById('dash-top-product').innerText = truncateDashboardLabel(topProd, 18, 16);
    document.getElementById('dash-top-product').title = topProd;
  } else {
    document.getElementById('dash-top-product').innerText = "N/A";
  }
}

// Cập nhật biểu đồ đường biểu diễn doanh số
async function loadDashboardAttentionMetrics() {
  const res = await window.electronAPI.dbQuery('dashboard.attention');
  if (!res.ok || res.rows.length === 0) return;

  const data = res.rows[0];
  const dueSoon = parseInt(data.due_soon || 0, 10) || 0;
  const overdue = parseInt(data.overdue || 0, 10) || 0;
  const openDebt = parseFloat(data.open_debt || 0);
  const supplierDebt = parseFloat(data.supplier_debt || 0);
  const pendingQuotes = parseInt(data.pending_quotes || 0, 10) || 0;

  const overdueEl = document.getElementById('dash-overdue-count');
  const dueSoonEl = document.getElementById('dash-due-soon-count');
  const debtEl = document.getElementById('dash-open-debt');
  const supplierDebtEl = document.getElementById('dash-supplier-debt');
  const quotesEl = document.getElementById('dash-pending-quotes');

  if (overdueEl) overdueEl.innerText = overdue.toLocaleString('vi-VN');
  if (dueSoonEl) dueSoonEl.innerText = dueSoon.toLocaleString('vi-VN');
  if (debtEl) debtEl.innerText = utils.formatCurrency(openDebt) + "đ";
  if (supplierDebtEl) supplierDebtEl.innerText = utils.formatCurrency(supplierDebt) + "đ";
  if (quotesEl) quotesEl.innerText = pendingQuotes.toLocaleString('vi-VN');
}

async function updateDashboardCharts(period = 'daily') {
  if (!['daily', 'weekly', 'monthly'].includes(period)) period = 'daily';
  const requestId = ++dashboardTrendRequestId;

  // Thay đổi trạng thái các nút lọc (chỉ nhóm nút của biểu đồ doanh số, không đụng tab Thống kê)
  const activeButton = document.getElementById(`filter-${period}`);
  const filterGroup = activeButton?.closest('.chart-filters');
  filterGroup?.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
  activeButton?.classList.add('active');

  // Tính toán khoảng thời gian
  let startDate = new Date();
  let truncType = 'day';

  // Bắt đầu đúng đầu kỳ (ngày / thứ Hai / ngày 1) để kỳ đầu tiên không bị cắt dở
  startDate.setHours(0, 0, 0, 0);
  if (period === 'daily') {
    startDate.setDate(startDate.getDate() - 30);
    truncType = 'day';
  } else if (period === 'weekly') {
    startDate.setDate(startDate.getDate() - 84); // 12 tuần
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
    truncType = 'week';
  } else { // monthly
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - 12); // 12 tháng
    truncType = 'month';
  }

  const res = await window.electronAPI.dbQuery('dashboard.salesTrend', { period: truncType, since: startDate });
  // Bỏ phản hồi cũ nếu người dùng đã đổi bộ lọc trong lúc chờ
  if (requestId !== dashboardTrendRequestId) return;

  if (!res.ok) {
    utils.showToast("Lỗi tải biểu đồ doanh số", "danger");
    return;
  }

  // Chuẩn bị dữ liệu vẽ
  const labels = [];
  const quantities = [];
  const amounts = [];

  res.rows.forEach(row => {
    const dateObj = new Date(row.period);
    let label = "";
    if (period === 'daily') {
      label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
    } else if (period === 'weekly') {
      label = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear().toString().substring(2)}`;
    } else {
      label = `Th.${dateObj.getMonth() + 1}/${dateObj.getFullYear().toString().substring(2)}`;
    }
    labels.push(label);
    quantities.push(parseFloat(row.quantity || 0));
    amounts.push(parseFloat(row.amount || 0));
  });

  const ctx = getDashboardChartContext('salesTrendChart');
  if (!ctx) return;
  
  if (salesTrendChartInst) {
    salesTrendChartInst.destroy();
  }

  const isLight = document.body.classList.contains('light-theme');
  const textColor = isLight ? '#4b5563' : '#9ca3af';
  const gridColor = isLight ? '#e5e7eb' : '#374151';

  salesTrendChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Số lượng cuộn/trục',
          data: quantities,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          yAxisID: 'y',
          tension: 0.35,
          fill: true
        },
        {
          label: 'Doanh thu (triệu đ)',
          data: amounts.map(v => v / 1000000), // Quy đổi sang triệu đồng
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y1',
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: textColor }
        }
      }
    }
  });
}

// Cập nhật biểu đồ phân bố sản phẩm (Pie Chart)
async function loadProductDistributionChart() {
  const requestId = ++dashboardDistRequestId;
  const res = await window.electronAPI.dbQuery('dashboard.productDistribution');
  if (requestId !== dashboardDistRequestId) return;

  if (!res.ok) {
    utils.showToast("Lỗi tải biểu đồ phân bố sản phẩm", "danger");
    return;
  }

  // Nhóm các phần tử nhỏ hơn 3% vào mục "Khác"
  const total = res.rows.reduce((sum, r) => sum + parseFloat(r.total_quantity || 0), 0);
  
  let mainProducts = [];
  let otherSum = 0;

  res.rows.forEach(row => {
    const qty = parseFloat(row.total_quantity || 0);
    if (total > 0 && (qty / total >= 0.03)) {
      mainProducts.push({ label: String(row.ten_hang ?? '') || '(Không tên)', value: qty });
    } else {
      otherSum += qty;
    }
  });

  if (otherSum > 0) {
    mainProducts.push({ label: 'Khác', value: otherSum });
  }

  const labels = mainProducts.map(p => truncateDashboardLabel(p.label, 12, 10));
  const data = mainProducts.map(p => p.value);

  const ctx = getDashboardChartContext('productDistChart');
  if (!ctx) return;
  
  if (productDistChartInst) {
    productDistChartInst.destroy();
  }

  const isLight = document.body.classList.contains('light-theme');
  const textColor = isLight ? '#4b5563' : '#9ca3af';

  // Bảng màu đẹp
  const colors = [
    '#38bdf8', '#34d399', '#fb7185', '#a78bfa', '#fbbf24', 
    '#f472b6', '#2dd4bf', '#818cf8', '#fb923c', '#9ca3af'
  ];

  productDistChartInst = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, data.length),
        borderWidth: 1,
        borderColor: isLight ? '#ffffff' : '#111827'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, boxWidth: 12, font: { size: 10 } }
        }
      }
    }
  });
}

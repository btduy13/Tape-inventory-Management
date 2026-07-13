// JS/MODULES/DASHBOARD.JS - LOGIC XỬ LÝ BẢNG TỔNG QUAN & BIỂU ĐỒ
let salesTrendChartInst = null;
let productDistChartInst = null;

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
  const sqlMetrics = `
    SELECT 
      COUNT(id) AS total_orders,
      COALESCE(SUM(thanh_tien_ban), 0) AS total_revenue
    FROM (
      SELECT id, thoi_gian, COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END AS thanh_tien_ban FROM bang_keo_in_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT id, thoi_gian, thanh_tien_ban FROM truc_in_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT id, thoi_gian, thanh_tien_ban FROM bang_keo_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
    ) AS combined;
  `;

  const sqlTopProduct = `
    SELECT 
      ten_hang,
      SUM(so_luong) AS total_qty
    FROM (
      SELECT ten_hang, thoi_gian, so_luong FROM bang_keo_in_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT ten_hang, thoi_gian, so_luong FROM truc_in_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT ten_hang, thoi_gian, so_luong FROM bang_keo_orders WHERE thoi_gian >= DATE_TRUNC('month', NOW()) AND (is_quote = FALSE OR is_quote IS NULL)
    ) AS combined
    GROUP BY ten_hang
    ORDER BY total_qty DESC
    LIMIT 1;
  `;

  const resMetrics = await window.electronAPI.dbQuery(sqlMetrics);
  const resTop = await window.electronAPI.dbQuery(sqlTopProduct);

  if (resMetrics.ok && resMetrics.rows.length > 0) {
    const data = resMetrics.rows[0];
    const totalOrders = parseInt(data.total_orders);
    const totalRevenue = parseFloat(data.total_revenue);
    const avgOrder = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    document.getElementById('dash-total-orders').innerText = totalOrders.toLocaleString();
    document.getElementById('dash-revenue').innerText = utils.formatCurrency(totalRevenue) + "đ";
    document.getElementById('dash-avg-order').innerText = utils.formatCurrency(avgOrder) + "đ";
  }

  if (resTop.ok && resTop.rows.length > 0) {
    const topProd = resTop.rows[0].ten_hang;
    document.getElementById('dash-top-product').innerText = topProd.length > 18 ? topProd.substring(0, 16) + "..." : topProd;
    document.getElementById('dash-top-product').title = topProd;
  } else {
    document.getElementById('dash-top-product').innerText = "N/A";
  }
}

// Cập nhật biểu đồ đường biểu diễn doanh số
async function loadDashboardAttentionMetrics() {
  const sql = `
    SELECT
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_giao, FALSE) AND ngay_du_kien >= CURRENT_DATE AND ngay_du_kien <= CURRENT_DATE + INTERVAL '3 days' THEN 1 ELSE 0 END) AS due_soon,
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_giao, FALSE) AND ngay_du_kien < CURRENT_DATE THEN 1 ELSE 0 END) AS overdue,
      SUM(CASE WHEN NOT COALESCE(is_quote, FALSE) AND NOT COALESCE(da_tat_toan, FALSE) THEN COALESCE(cong_no_khach, 0) ELSE 0 END) AS open_debt,
      SUM(CASE WHEN COALESCE(is_quote, FALSE) THEN 1 ELSE 0 END) AS pending_quotes
    FROM (
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, is_quote FROM bang_keo_in_orders
      UNION ALL
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, is_quote FROM truc_in_orders
      UNION ALL
      SELECT ngay_du_kien, da_giao, da_tat_toan, cong_no_khach, is_quote FROM bang_keo_orders
    ) AS combined;
  `;

  const res = await window.electronAPI.dbQuery(sql);
  if (!res.ok || res.rows.length === 0) return;

  const data = res.rows[0];
  const dueSoon = parseInt(data.due_soon || 0);
  const overdue = parseInt(data.overdue || 0);
  const openDebt = parseFloat(data.open_debt || 0);
  const pendingQuotes = parseInt(data.pending_quotes || 0);

  const overdueEl = document.getElementById('dash-overdue-count');
  const dueSoonEl = document.getElementById('dash-due-soon-count');
  const debtEl = document.getElementById('dash-open-debt');
  const quotesEl = document.getElementById('dash-pending-quotes');

  if (overdueEl) overdueEl.innerText = overdue.toLocaleString();
  if (dueSoonEl) dueSoonEl.innerText = dueSoon.toLocaleString();
  if (debtEl) debtEl.innerText = utils.formatCurrency(openDebt) + "đ";
  if (quotesEl) quotesEl.innerText = pendingQuotes.toLocaleString();
}

async function updateDashboardCharts(period = 'daily') {
  // Thay đổi trạng thái các nút lọc
  document.querySelectorAll('.chart-filters button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filter-${period}`).classList.add('active');

  // Tính toán khoảng thời gian
  let startDate = new Date();
  let truncType = 'day';

  if (period === 'daily') {
    startDate.setDate(startDate.getDate() - 30);
    truncType = 'day';
  } else if (period === 'weekly') {
    startDate.setDate(startDate.getDate() - 84); // 12 tuần
    truncType = 'week';
  } else { // monthly
    startDate.setMonth(startDate.getMonth() - 12); // 12 tháng
    truncType = 'month';
  }

  const sql = `
    SELECT 
      DATE_TRUNC($1, thoi_gian) AS period,
      SUM(so_luong) AS quantity,
      SUM(thanh_tien_ban) AS amount
    FROM (
      SELECT thoi_gian, so_luong, COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) ELSE 0 END AS thanh_tien_ban FROM bang_keo_in_orders WHERE thoi_gian >= $2 AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT thoi_gian, so_luong, thanh_tien_ban FROM truc_in_orders WHERE thoi_gian >= $2 AND (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT thoi_gian, so_luong, thanh_tien_ban FROM bang_keo_orders WHERE thoi_gian >= $2 AND (is_quote = FALSE OR is_quote IS NULL)
    ) AS combined
    GROUP BY period
    ORDER BY period;
  `;

  const res = await window.electronAPI.dbQuery(sql, [truncType, startDate]);

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
      label = `T.${dateObj.getMonth() + 1}/${dateObj.getFullYear().toString().substring(2)}`;
    } else {
      label = `Th.${dateObj.getMonth() + 1}`;
    }
    labels.push(label);
    quantities.push(parseFloat(row.quantity || 0));
    amounts.push(parseFloat(row.amount || 0));
  });

  const ctx = document.getElementById('salesTrendChart').getContext('2d');
  
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
  const sql = `
    SELECT 
      ten_hang,
      SUM(so_luong) AS total_quantity
    FROM (
      SELECT ten_hang, so_luong FROM bang_keo_in_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT ten_hang, so_luong FROM truc_in_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
      UNION ALL
      SELECT ten_hang, so_luong FROM bang_keo_orders WHERE (is_quote = FALSE OR is_quote IS NULL)
    ) AS combined
    GROUP BY ten_hang
    ORDER BY total_quantity DESC;
  `;

  const res = await window.electronAPI.dbQuery(sql);

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
      mainProducts.push({ label: row.ten_hang, value: qty });
    } else {
      otherSum += qty;
    }
  });

  if (otherSum > 0) {
    mainProducts.push({ label: 'Khác', value: otherSum });
  }

  const labels = mainProducts.map(p => p.label.length > 12 ? p.label.substring(0, 10) + "..." : p.label);
  const data = mainProducts.map(p => p.value);

  const ctx = document.getElementById('productDistChart').getContext('2d');
  
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

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { DATABASE_URL } = require('../../config');
const orderMath = require('../../js/orderMath');

if (!DATABASE_URL) {
  throw new Error('Thiếu DATABASE_URL để chạy integration test');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10000
});

function testId(prefix, suffix) {
  return `${prefix}-${suffix}`.slice(0, 20);
}

async function insertRow(client, table, data) {
  const columns = Object.keys(data);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  const result = await client.query(sql, columns.map(column => data[column]));
  return result.rows[0];
}

function printedTapeData(id, { newAxis = false, quote = false } = {}) {
  const vat = quote ? 312000 : 156000;
  const result = orderMath.calculatePrintedTape({
    quantity: 120,
    baseCost: 900000,
    rollLength: 90,
    rollsPerTree: 60,
    salePrice: 26000,
    deposit: quote ? 0 : 1000000,
    vat,
    commissionPercent: 5,
    shipping: 100000,
    isNewAxis: newAxis,
    axisQuantity: 1,
    axisCostPrice: 1400000,
    axisSalePrice: 1800000,
    axisVat: newAxis ? 180000 : 0,
    axisCommissionPercent: 20
  });

  const data = {
    id,
    thoi_gian: new Date(),
    ten_hang: `CODEX TEST BKI ${newAxis ? 'TRUC MOI' : 'TRUC CU'}`,
    ten_khach_hang: 'CODEX TEST KHACH HANG',
    ngay_du_kien: new Date(Date.now() + 86400000),
    quy_cach_mm: 48,
    quy_cach_m: 90,
    quy_cach_mic: 50,
    cuon_cay: 60,
    so_luong: 120,
    phi_sl: 0,
    mau_keo: 'TRANG SUA',
    phi_keo: 0,
    mau_sac: 'CHU DEN',
    phi_mau: 0,
    phi_size: 0,
    phi_cat: 0,
    don_gia_von: 900000,
    don_gia_goc: result.product.costPrice,
    thanh_tien_goc: result.product.costTotal,
    don_gia_ban: 26000,
    thanh_tien_ban: result.product.saleTotal,
    tien_coc: quote ? 0 : result.deposit,
    cong_no_khach: result.outstanding,
    ctv: 'CODEX CTV',
    hoa_hong: result.product.commissionPercent,
    tien_hoa_hong: result.product.commission,
    loi_giay: '3MM',
    thung_bao: 'THUNG',
    loi_nhuan: result.product.profit,
    tien_ship: 100000,
    loi_nhuan_rong: result.product.netProfit,
    da_giao: false,
    da_tat_toan: false,
    da_gui_email: false,
    is_quote: quote,
    vat,
    loai_truc: newAxis ? 'moi' : 'cu',
    ten_truc: newAxis ? 'TRUC CODEX TEST' : null,
    truc_chu_vi: newAxis ? 380 : null,
    truc_so_luong: result.axis.quantity,
    truc_gia_goc: result.axis.costPrice,
    truc_gia_ban: result.axis.salePrice,
    truc_thanh_tien_goc: result.axis.costTotal,
    truc_thanh_tien_ban: result.axis.saleTotal,
    truc_vat: result.axis.vat,
    truc_ctv: newAxis ? 'CODEX CTV TRUC' : null,
    truc_hoa_hong: result.axis.commissionPercent,
    truc_tien_hoa_hong: result.axis.commission,
    truc_loi_nhuan: result.axis.profit,
    truc_loi_nhuan_rong: result.axis.netProfit
  };
  if (quote) {
    data.quote_items = JSON.stringify([
      { specification: '48mm x 90m (50mic)', quantity: 60, unitPrice: 26000, total: 1560000, axes: [
        { name: 'TRỤC ĐỎ', circumference: 380, quantity: 1, unitPrice: 900000, total: 900000 },
        { name: 'TRỤC XANH', circumference: 380, quantity: 1, unitPrice: 850000, total: 850000 }
      ] },
      { specification: '60mm x 90m (50mic)', quantity: 60, unitPrice: 28000, total: 1680000 }
    ]);
  }
  return data;
}

function standardData(id, table, { quote = false } = {}) {
  const vat = quote ? 120000 : 60000;
  const result = orderMath.calculateStandardOrder({
    quantity: 100,
    costPrice: 8000,
    salePrice: 12000,
    vat,
    commissionPercent: 10,
    shipping: 50000
  });
  const base = {
    id,
    thoi_gian: new Date(),
    ten_hang: `CODEX TEST ${table === 'truc_in_orders' ? 'TRUC IN' : 'BANG KEO'}`,
    ten_khach_hang: 'CODEX TEST KHACH HANG',
    ngay_du_kien: new Date(Date.now() + 86400000),
    quy_cach: table === 'truc_in_orders' ? '380' : '1.2',
    so_luong: result.quantity,
    mau_sac: 'TEST',
    don_gia_goc: result.costPrice,
    don_gia_ban: result.salePrice,
    thanh_tien_ban: result.saleTotal,
    cong_no_khach: result.outstanding,
    ctv: 'CODEX CTV',
    hoa_hong: result.commissionPercent,
    tien_hoa_hong: result.commission,
    loi_nhuan: result.profit,
    tien_ship: 50000,
    loi_nhuan_rong: result.netProfit,
    da_giao: false,
    da_tat_toan: false,
    da_gui_email: false,
    is_quote: quote,
    vat
  };
  if (table === 'truc_in_orders') {
    base.mau_keo = 'TEST';
    base.thanh_tien_goc = result.costTotal;
  } else {
    base.thanh_tien = result.costTotal;
  }
  if (quote) {
    base.quote_items = JSON.stringify([
      { specification: '48mm', quantity: 40, unitPrice: 12000, total: 480000 },
      { specification: '60mm', quantity: 60, unitPrice: 14000, total: 840000 }
    ]);
  }
  return base;
}

async function assertStatusLifecycle(client, table, id, debtExpression) {
  await client.query(`UPDATE ${table} SET da_tat_toan = TRUE, cong_no_khach = 0 WHERE id = $1`, [id]);
  let row = (await client.query(`SELECT da_tat_toan, cong_no_khach FROM ${table} WHERE id = $1`, [id])).rows[0];
  assert.equal(row.da_tat_toan, true);
  assert.equal(Number(row.cong_no_khach), 0);

  await client.query(`UPDATE ${table} SET da_tat_toan = FALSE, cong_no_khach = ${debtExpression} WHERE id = $1`, [id]);
  row = (await client.query(`SELECT da_tat_toan, cong_no_khach FROM ${table} WHERE id = $1`, [id])).rows[0];
  assert.equal(row.da_tat_toan, false);
  assert.ok(Number(row.cong_no_khach) > 0);
}

async function run() {
  const client = await pool.connect();
  const suffix = crypto.randomBytes(4).toString('hex');
  const ids = {
    bkiOld: testId('TBKI-C', suffix),
    bkiNew: testId('TBKI-N', suffix),
    bkiQuote: testId('QBKI', suffix),
    tape: testId('TBK', suffix),
    tapeQuote: testId('QBK', suffix),
    axis: testId('TTI', suffix),
    axisQuote: testId('QTI', suffix)
  };

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL statement_timeout = 15000');
    for (const table of ['bang_keo_in_orders', 'bang_keo_orders', 'truc_in_orders']) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS quote_items JSONB DEFAULT '[]'::jsonb`);
    }
    await client.query(`ALTER TABLE bang_keo_in_orders ADD COLUMN IF NOT EXISTS truc_vat NUMERIC DEFAULT 0`);

    const clock = await client.query('SELECT NOW() AS now');
    assert.ok(clock.rows[0].now);

    const inserted = [];
    inserted.push(await insertRow(client, 'bang_keo_in_orders', printedTapeData(ids.bkiOld)));
    inserted.push(await insertRow(client, 'bang_keo_in_orders', printedTapeData(ids.bkiNew, { newAxis: true })));
    inserted.push(await insertRow(client, 'bang_keo_in_orders', printedTapeData(ids.bkiQuote, { quote: true })));
    inserted.push(await insertRow(client, 'bang_keo_orders', standardData(ids.tape, 'bang_keo_orders')));
    inserted.push(await insertRow(client, 'bang_keo_orders', standardData(ids.tapeQuote, 'bang_keo_orders', { quote: true })));
    inserted.push(await insertRow(client, 'truc_in_orders', standardData(ids.axis, 'truc_in_orders')));
    inserted.push(await insertRow(client, 'truc_in_orders', standardData(ids.axisQuote, 'truc_in_orders', { quote: true })));
    assert.equal(inserted.length, 7);

    const newAxis = inserted.find(row => row.id === ids.bkiNew);
    assert.equal(newAxis.loai_truc, 'moi');
    assert.equal(Number(newAxis.truc_thanh_tien_ban), Number(newAxis.truc_so_luong) * Number(newAxis.truc_gia_ban));
    assert.equal(Number(newAxis.cong_no_khach), Number(newAxis.thanh_tien_ban) + Number(newAxis.truc_thanh_tien_ban) + Number(newAxis.vat) + Number(newAxis.truc_vat) - Number(newAxis.tien_coc));
    assert.ok(Number(newAxis.truc_tien_hoa_hong) > 0);

    const originalQuoteAxisCount = await client.query(
      `SELECT jsonb_array_length(quote_items->0->'axes') AS axis_count FROM bang_keo_in_orders WHERE id = $1`,
      [ids.bkiQuote]
    );
    assert.equal(Number(originalQuoteAxisCount.rows[0].axis_count), 2);

    const editedQuoteItems = [
      { specification: '50mm x 100m (50mic)', quantity: 30, unitPrice: 30000, total: 900000, fields: { 'qc-mm': '50', 'so-luong': '30', 'don-gia-ban': '30000' }, axes: [] },
      { specification: '70mm x 100m (50mic)', quantity: 20, unitPrice: 40000, total: 800000, fields: { 'qc-mm': '70', 'so-luong': '20', 'don-gia-ban': '40000' }, axes: [{ name: 'TRỤC SỬA', quantity: 1, unitPrice: 500000, total: 500000, vat: 50000 }] }
    ];
    await client.query(
      `UPDATE bang_keo_in_orders SET ten_hang = $1, so_luong = $2, thanh_tien_ban = $3, quote_items = $4 WHERE id = $5 AND is_quote = TRUE`,
      ['CODEX TEST BKI EDITED', 50, 1700000, JSON.stringify(editedQuoteItems), ids.bkiQuote]
    );
    const editedQuote = (await client.query(
      `SELECT ten_hang, so_luong, thanh_tien_ban, jsonb_array_length(quote_items) AS item_count,
              jsonb_array_length(quote_items->1->'axes') AS axis_count
       FROM bang_keo_in_orders WHERE id = $1`,
      [ids.bkiQuote]
    )).rows[0];
    assert.equal(editedQuote.ten_hang, 'CODEX TEST BKI EDITED');
    assert.equal(Number(editedQuote.so_luong), 50);
    assert.equal(Number(editedQuote.thanh_tien_ban), 1700000);
    assert.equal(editedQuote.item_count, 2);
    assert.equal(editedQuote.axis_count, 1);

    await assertStatusLifecycle(
      client,
      'bang_keo_in_orders',
      ids.bkiNew,
      `GREATEST(COALESCE(thanh_tien_ban, 0) + CASE WHEN loai_truc = 'moi' THEN COALESCE(truc_thanh_tien_ban, 0) + COALESCE(truc_vat, 0) ELSE 0 END + COALESCE(vat, 0) - COALESCE(tien_coc, 0), 0)`
    );
    await assertStatusLifecycle(client, 'bang_keo_orders', ids.tape, 'GREATEST(COALESCE(thanh_tien_ban, 0) + COALESCE(vat, 0), 0)');
    await assertStatusLifecycle(client, 'truc_in_orders', ids.axis, 'GREATEST(COALESCE(thanh_tien_ban, 0) + COALESCE(vat, 0), 0)');

    const stats = await client.query(`
      SELECT id, ten_hang, cong_no_khach FROM bang_keo_in_orders WHERE id = ANY($1)
      UNION ALL SELECT id, ten_hang, cong_no_khach FROM bang_keo_orders WHERE id = ANY($1)
      UNION ALL SELECT id, ten_hang, cong_no_khach FROM truc_in_orders WHERE id = ANY($1)
    `, [Object.values(ids)]);
    assert.equal(stats.rowCount, 7);

    const autocomplete = await client.query(`
      SELECT ten_hang FROM bang_keo_in_orders
      WHERE ten_hang ILIKE $1 AND (is_quote = FALSE OR is_quote IS NULL)
      ORDER BY thoi_gian DESC LIMIT 8
    `, ['%CODEX TEST BKI%']);
    assert.ok(autocomplete.rowCount >= 2);

    const quoteCount = await client.query(`
      SELECT COUNT(*)::int AS count FROM (
        SELECT id FROM bang_keo_in_orders WHERE id = ANY($1) AND is_quote = TRUE
        UNION ALL SELECT id FROM bang_keo_orders WHERE id = ANY($1) AND is_quote = TRUE
        UNION ALL SELECT id FROM truc_in_orders WHERE id = ANY($1) AND is_quote = TRUE
      ) quotes
    `, [Object.values(ids)]);
    assert.equal(quoteCount.rows[0].count, 3);
    const quoteSizes = await client.query(`
      SELECT jsonb_array_length(quote_items) AS item_count
      FROM bang_keo_in_orders WHERE id = $1
    `, [ids.bkiQuote]);
    assert.equal(Number(quoteSizes.rows[0].item_count), 2);
    const quoteAxisCount = await client.query(`
      SELECT jsonb_array_length(quote_items->0->'axes') AS axis_count
      FROM bang_keo_in_orders WHERE id = $1
    `, [ids.bkiQuote]);
    assert.equal(Number(quoteAxisCount.rows[0].axis_count), 0);

    const integrity = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM bang_keo_in_orders WHERE COALESCE(da_tat_toan, FALSE) AND COALESCE(cong_no_khach, 0) <> 0) +
        (SELECT COUNT(*) FROM bang_keo_orders WHERE COALESCE(da_tat_toan, FALSE) AND COALESCE(cong_no_khach, 0) <> 0) +
        (SELECT COUNT(*) FROM truc_in_orders WHERE COALESCE(da_tat_toan, FALSE) AND COALESCE(cong_no_khach, 0) <> 0) AS settled_with_debt
    `);
    assert.equal(Number(integrity.rows[0].settled_with_debt), 0);

    await client.query('ROLLBACK');
    const persisted = await client.query(`
      SELECT COUNT(*)::int AS count FROM (
        SELECT id FROM bang_keo_in_orders WHERE id = ANY($1)
        UNION ALL SELECT id FROM bang_keo_orders WHERE id = ANY($1)
        UNION ALL SELECT id FROM truc_in_orders WHERE id = ANY($1)
      ) test_rows
    `, [Object.values(ids)]);
    assert.equal(persisted.rows[0].count, 0);

    console.log('PASS database connection and schema');
    console.log('PASS 7 order/quotation creation cases');
    console.log('PASS old axis, new axis, VAT and commission totals');
    console.log('PASS settlement and debt reopening');
    console.log('PASS statistics and autocomplete queries');
    console.log('PASS rollback left production data unchanged');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

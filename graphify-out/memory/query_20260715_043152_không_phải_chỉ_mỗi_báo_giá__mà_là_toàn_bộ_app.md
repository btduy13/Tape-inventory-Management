---
type: "query"
date: "2026-07-15T04:31:52.742351+00:00"
question: "không phải chỉ mỗi báo giá, mà là toàn bộ app"
contributor: "graphify"
outcome: "useful"
source_nodes: ["viewVoucher()", "purchase.js", "sales.js", "renderPurchaseReturnTable()", "renderSalesReturnTable()"]
---

# Q: không phải chỉ mỗi báo giá, mà là toàn bộ app

## Answer

Expanded from original query via graph vocab: [voucher, discount, items, view, print, render, sales, purchase, return, quotation, receipt, payment]. Graphify identified viewVoucher() as the shared rendering branch. Updated all six discount-capable voucher templates: purchase_order, purchase, purchase_return, sales_return, sales, sales_quotation. Each now renders Số tiền chiết khấu only when at least one item has discount > 0. Purchase return gained the missing gross/discount/net summary. Tested both states for all six types; test:shell and test:print-layout passed. Ran the real Electron app, scanned all 8,044 vouchers into 16 type/discount groups and rendered a representative from every group; mismatch count 0.

## Outcome

- Signal: useful

## Source Nodes

- viewVoucher()
- purchase.js
- sales.js
- renderPurchaseReturnTable()
- renderSalesReturnTable()
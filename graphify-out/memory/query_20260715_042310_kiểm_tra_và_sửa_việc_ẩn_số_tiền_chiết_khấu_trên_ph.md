---
type: "query"
date: "2026-07-15T04:23:10.108938+00:00"
question: "Kiểm tra và sửa việc ẩn số tiền chiết khấu trên phiếu báo giá và đơn đặt hàng khi không có mặt hàng chiết khấu"
contributor: "graphify"
outcome: "useful"
source_nodes: ["viewVoucher()", "renderQuotationTable()", "renderPurchaseOrderTable()"]
---

# Q: Kiểm tra và sửa việc ẩn số tiền chiết khấu trên phiếu báo giá và đơn đặt hàng khi không có mặt hàng chiết khấu

## Answer

Đã sửa viewVoucher trong js/ui-framework.js để chỉ render dòng Số tiền chiết khấu khi ít nhất một mặt hàng có discount > 0 cho sales_quotation và purchase_order. Đã chạy app Electron thật: 7 báo giá (6 có chiết khấu, 1 không có), mismatch 0; BG10002 không còn hiện dòng chiết khấu. 87 đơn đặt hàng không chiết khấu đều ẩn đúng, mismatch 0. test:shell và test:print-layout đều qua.

## Outcome

- Signal: useful

## Source Nodes

- viewVoucher()
- renderQuotationTable()
- renderPurchaseOrderTable()
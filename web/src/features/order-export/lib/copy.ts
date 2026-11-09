// Vietnamese labels of the order export / email pages (same words as the desktop app,
// exportManager.js / emailDialog.js / index.html).
import type { OrderType } from "@/features/admin-orders/lib/types";

export const DOC_TYPES = ["don_dat_hang", "phieu_giao_hang"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const parseDocType = (v: unknown): DocType => (v === "phieu_giao_hang" ? "phieu_giao_hang" : "don_dat_hang");

export const DOC_LABEL: Record<DocType, string> = { don_dat_hang: "Đơn đặt hàng", phieu_giao_hang: "Phiếu giao hàng" };
export const DOC_TITLE: Record<DocType, string> = { don_dat_hang: "ĐƠN ĐẶT HÀNG", phieu_giao_hang: "PHIẾU GIAO HÀNG" };

/** Company block of the voucher (utils.companyInfo of the app). Phone / address: site contact info. */
export const COMPANY = {
  name: "CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI BĂNG KEO IN VĨNH THỊNH",
  address: "90E đường số 18B, P. Bình Hưng Hòa A, Q. Bình Tân, TP. HCM, Việt Nam",
  hotline: "0903003882 - 0936380405",
  representative: "LÝ THANH QUẾ",
  representativePhone: "090 300 3882",
} as const;

export type CompanyInfo = { name: string; address: string; hotline: string; representative: string; representativePhone: string };

export const exportCopy = {
  title: "Xuất đơn đặt hàng / phiếu giao hàng",
  selectTitle: "Chọn đơn hàng",
  year: "Năm",
  month: "Tháng",
  allMonths: "Tất cả",
  type: "Loại",
  allTypes: "Tất cả",
  search: "Tìm mã đơn, tên hàng, khách",
  filter: "Lọc",
  selectAll: "Chọn tất cả",
  colId: "Mã đơn",
  colDate: "Ngày đặt",
  colName: "Tên hàng",
  colCustomer: "Khách hàng",
  colQty: "Số lượng",
  colPrice: "Đơn giá",
  empty: "Không có đơn hàng nào",
  capped: "Chỉ hiện 200 đơn mới nhất. Lọc thêm để thu hẹp.",
  selected: (count: number, hidden: number) => `Đã chọn ${count} đơn${hidden ? ` (${hidden} đơn đang bị bộ lọc ẩn)` : ""}`,
  clear: "Bỏ chọn",
  next: "Tiếp tục ➔",
  pickOne: "Chọn ít nhất 1 đơn",
  loadFailed: (ids: string) => `Không tải được dữ liệu đơn: ${ids}. Đã hủy xuất chứng từ.`,
  listFailed: "Không tải được danh sách đơn.",
  tooMany: "Tối đa 200 đơn mỗi chứng từ.",
  previewTitle: "Xem trước & Điều chỉnh chứng từ",
  customer: "Kính gửi (Khách hàng)",
  address: "Địa chỉ",
  colProduct: "Tên sản phẩm",
  colSpecs: "Quy cách",
  colGlue: "Màu keo",
  colColor: "Màu sắc",
  colUnit: "Đơn vị",
  colVat: "VAT",
  colTotal: "Thành tiền",
  remove: "Xóa dòng",
  noLines: "Không có dữ liệu dòng hàng",
  sum: "Tổng tiền hàng",
  deposit: "Đặt cọc trước",
  remaining: "Còn lại cần thu",
  back: "Quay lại chọn đơn",
  makeVoucher: "Xem trước chứng từ",
  noProducts: "Không có sản phẩm nào để xuất!",
  backToEdit: "Quay lại chỉnh sửa",
  savePdf: "Lưu PDF",
  print: "In chứng từ",
  pdfHint: "Trong hộp thoại in, chọn máy in \"Lưu dưới dạng PDF\" (Save as PDF), khổ A4.",
  negative: "Số lượng, đơn giá và VAT không được âm",
} as const;

export const ORDER_TYPE_SHORT: Record<OrderType, string> = {
  bang_keo_in: "Băng keo in", truc_in: "Trục in", bang_keo: "Băng keo", thank_you: "Thank you",
};

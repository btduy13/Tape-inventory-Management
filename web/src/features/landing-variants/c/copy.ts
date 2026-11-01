// Variant C copy (Vietnamese). Only facts the business has stated; no invented claims.

export const copy = {
  brand: "Băng keo in logo",
  h1: "In logo của bạn lên băng keo đóng gói",
  lead: "In logo và chữ theo yêu cầu, tối đa 3 màu. Gõ tên thương hiệu để xem thử ngay.",
  inputLabel: "Tên thương hiệu",
  inputPlaceholder: "Ví dụ: Trà Sữa Mây",
  comboLabel: "Phối màu",
  fallbackText: "LOGO CỦA BẠN",
  previewCaption: "Băng keo khổ {w} mm",
  previewHint: "Đổi khổ ở bảng quy cách",
  ctaDesign: "Thiết kế ngay",
  ctaQuote: "Nhận báo giá",
  ctaDesignHint: "Mở trình thiết kế để thêm logo và xem 3D",

  specTitle: "Quy cách",
  specLead: "Bề ngang thật theo tỉ lệ. Chọn một khổ để xem trên băng keo.",
  specWidthLabel: "Bề ngang (mm)",
  specLength: "Độ dài cuộn",
  specLengthValue: "50 – 635 m",
  specThickness: "Độ dày",
  specThicknessValue: "Tư vấn theo nhu cầu",
  specColors: "Màu in",
  specColorsValue: "Tối đa 3 màu",

  usesTitle: "Ứng dụng",
  uses: [
    { key: "carton", title: "Niêm phong thùng carton", body: "Một dải chạy dọc mép nắp, gập xuống hai đầu thùng." },
    { key: "cup", title: "Dán miệng ly trà sữa", body: "Dải hẹp từ đỉnh nắp xuống thân ly, giữ kín và in tên quán." },
    { key: "ecom", title: "Đóng gói đơn TMĐT", body: "Mỗi đơn giao đi mang tên shop đến tay khách." },
  ],

  processTitle: "Quy trình 4 bước",
  steps: [
    { title: "Thiết kế online", body: "Chọn khổ, màu, nhập chữ và tải logo lên." },
    { title: "Nhận báo giá", body: "Gửi số lượng, nhận báo giá trong ngày làm việc." },
    { title: "Sản xuất", body: "Duyệt bản in, xưởng in và cuộn băng keo." },
    { title: "Giao hàng", body: "Giao tận nơi, kèm hóa đơn VAT khi cần." },
  ],

  ctaTitle: "Sẵn sàng in thương hiệu của bạn?",
  ctaBody: "Thiết kế trong vài phút, gửi yêu cầu và nhận báo giá trong ngày làm việc.",

  contactTitle: "Liên hệ",
} as const;

export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

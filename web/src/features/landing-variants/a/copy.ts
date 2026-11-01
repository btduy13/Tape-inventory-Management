// Copy for landing variant A. Vietnamese, concise, no claims beyond the shared brief.
import { ROUTES } from "@/lib/routes";

export const HREF = {
  design: ROUTES.design,
  quote: `${ROUTES.design}#yeu-cau-bao-gia`,
} as const;

export const TAPE_WIDTHS_MM = [12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70, 80] as const;
export type TapeWidth = (typeof TAPE_WIDTHS_MM)[number];

export const copyA = {
  brand: "Băng keo in logo",
  navLabel: "Mục lục trang",
  nav: [
    { href: "#quy-cach", label: "Quy cách" },
    { href: "#ung-dung", label: "Ứng dụng" },
    { href: "#quy-trinh", label: "Quy trình" },
    { href: "#lien-he", label: "Liên hệ" },
  ],
  ctaDesign: "Thiết kế ngay",
  ctaQuote: "Nhận báo giá",

  heroWordSr: "Băng keo",
  heroTitleRest: "in logo theo yêu cầu",
  heroLead: "In logo và chữ của bạn lên băng keo đóng gói, tối đa 3 màu.",
  heroTapeText: "LOGO CỦA BẠN",

  specsTitle: "Quy cách",
  specsWidthLabel: "Bề ngang (mm)",
  specsWidthSr: "Các bề ngang có sẵn: 12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70 và 80 mm.",
  specsWidthNote: "Hình vẽ đúng tỉ lệ bề ngang.",
  specsRows: [
    { label: "Độ dài cuộn", value: "50 – 635 m" },
    { label: "Độ dày (mic)", value: "Tư vấn theo nhu cầu" },
    { label: "Số màu in", value: "Tối đa 3 màu" },
    { label: "Nội dung in", value: "Logo, chữ" },
  ],

  usesTitle: "Ứng dụng",
  uses: [
    { key: "carton", title: "Niêm phong thùng carton", body: "Một dải dọc mép nắp, gập xuống hai đầu thùng." },
    { key: "cup", title: "Dán miệng ly trà sữa", body: "Dải hẹp từ đỉnh nắp kéo dọc xuống thân ly." },
    { key: "ecom", title: "Đóng gói đơn TMĐT", body: "Khách nhận hộp là thấy tên shop." },
  ],

  stepsTitle: "Quy trình 4 bước",
  steps: [
    { title: "Thiết kế online", body: "Chọn bề ngang, màu in, tải logo và xem trước trên trình duyệt." },
    { title: "Nhận báo giá", body: "Gửi yêu cầu kèm số lượng. Nhân viên gửi báo giá trong ngày làm việc." },
    { title: "Sản xuất", body: "Bạn duyệt bản in, xưởng in và cuộn băng keo." },
    { title: "Giao hàng", body: "Giao tận nơi, kèm hóa đơn VAT khi cần." },
  ],

  footerTitle: "Có logo là bắt đầu được",
  contactFallback: "Gửi yêu cầu báo giá, nhân viên sẽ liên hệ lại với bạn.",
  footerLead: "Thiết kế trên trình duyệt hoặc gửi yêu cầu để nhận báo giá.",
} as const;

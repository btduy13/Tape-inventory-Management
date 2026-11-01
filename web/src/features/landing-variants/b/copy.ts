// Copy for landing variant B (Vietnamese). Shared facts only: no invented claims.
import { ROUTES } from "@/lib/routes";

export const TAPE_WIDTHS_MM = [12, 15, 16, 18, 20, 24, 30, 35, 40, 48, 60, 70, 80] as const;

export const LINKS = {
  design: ROUTES.design,
  quote: `${ROUTES.design}#yeu-cau-bao-gia`,
} as const;

export const copyB = {
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

  heroTitle: "Băng keo in logo theo yêu cầu",
  heroLead:
    "In logo và chữ của bạn lên băng keo đóng gói, tối đa 3 màu. Tự thiết kế trên trình duyệt, xem trước trên cuộn băng, thùng carton và ly nước.",
  heroFacts: [
    { term: "Bề ngang", value: "12–80 mm" },
    { term: "Độ dài cuộn", value: "50–635 m" },
    { term: "Màu in", value: "Tối đa 3" },
  ],
  mockupFallback: "Mô phỏng cuộn băng keo in logo",
  tapePrint: "LOGO CỦA BẠN",

  specsTitle: "Quy cách",
  specsLead: "13 khổ bề ngang. Hình dưới vẽ đúng tỉ lệ giữa các khổ.",
  widthsLabel: "Bề ngang (mm)",
  widthsSr: `Các khổ bề ngang: ${TAPE_WIDTHS_MM.join(", ")} mm.`,
  specs: [
    { term: "Độ dài cuộn", value: "50–635", unit: "m", note: "Chọn độ dài phù hợp lượng hàng đóng mỗi ngày." },
    { term: "Độ dày", value: "Theo nhu cầu", unit: "", note: "Tính bằng mic. Nhân viên tư vấn theo loại thùng và trọng lượng hàng." },
    { term: "Màu in", value: "3", unit: "màu", note: "Màu nền, màu chữ và màu logo, khớp bộ nhận diện của bạn." },
  ],

  usesTitle: "Ứng dụng",
  uses: [
    {
      key: "carton",
      title: "Niêm phong thùng carton",
      body: "Một dải băng chạy dọc mép nắp, gập xuống hai đầu thùng.",
    },
    {
      key: "cup",
      title: "Dán miệng ly trà sữa",
      body: "Dải băng hẹp dán từ đỉnh nắp xuống thân ly, giữ kín và hiện tên quán.",
    },
    {
      key: "ecom",
      title: "Đóng gói đơn TMĐT",
      body: "Niêm phong gói hàng giao đi mỗi ngày. Khách nhận hàng là thấy thương hiệu.",
    },
  ],

  stepsTitle: "Quy trình",
  steps: [
    { title: "Thiết kế online", body: "Chọn khổ băng keo, màu in, nhập chữ và tải logo lên." },
    { title: "Nhận báo giá", body: "Gửi yêu cầu kèm số lượng. Nhân viên tư vấn gửi báo giá cho bạn." },
    { title: "Sản xuất", body: "Bạn xác nhận báo giá và bản in, xưởng in và cuộn băng keo." },
    { title: "Giao hàng", body: "Đóng thùng và giao tận nơi, kèm hóa đơn VAT khi cần." },
  ],

  closingTitle: "Bắt đầu với logo của bạn",
  closingLead: "Thiết kế mất vài phút. Gửi yêu cầu để nhận báo giá theo số lượng.",
} as const;

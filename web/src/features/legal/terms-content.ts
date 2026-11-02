// Terms of use copy for /dieu-khoan. Plain data: TermsPage renders it, so wording changes stay here.
// Contact lines are filled in by the page from businessContact().

export type TermsSection = { title: string; paragraphs: readonly string[] };

export const TERMS_UPDATED = "02/11/2026";

export const TERMS_TITLE = "Điều khoản sử dụng";

export const TERMS_INTRO =
  "Điều khoản này áp dụng khi bạn sử dụng website của Vĩnh Thịnh: thiết kế băng keo trên trình duyệt, gửi yêu cầu báo giá và đặt hàng băng keo in logo. Khi sử dụng website hoặc gửi yêu cầu báo giá, bạn đồng ý với các điều khoản dưới đây.";

export const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    title: "1. Công cụ thiết kế",
    paragraphs: [
      "Công cụ thiết kế được cung cấp miễn phí để bạn thử chữ, logo và màu sắc trên băng keo. Bạn không được dùng website để gửi nội dung gây hại, mã độc hoặc làm gián đoạn hệ thống.",
    ],
  },
  {
    title: "2. Nội dung và logo in",
    paragraphs: [
      "Bạn chịu trách nhiệm về chữ, logo và hình ảnh gửi để in, và cam kết có quyền sử dụng các nội dung đó (nhãn hiệu, bản quyền).",
      "Vĩnh Thịnh có quyền từ chối in nội dung vi phạm pháp luật, thuần phong mỹ tục hoặc quyền sở hữu trí tuệ của người khác.",
    ],
  },
  {
    title: "3. Hình ảnh mô phỏng",
    paragraphs: [
      "Hình 2D và 3D trên website chỉ mang tính minh họa. Màu sắc, kích thước và vị trí in thực tế có thể khác do màn hình, chất liệu băng keo và mực in.",
      "Mỗi mẫu in tối đa 3 màu. Bản in cuối cùng được xác nhận với bạn trước khi sản xuất.",
    ],
  },
  {
    title: "4. Báo giá và đặt hàng",
    paragraphs: [
      "Yêu cầu báo giá không phải là đơn đặt hàng. Báo giá có hiệu lực đến ngày ghi trên báo giá.",
      "Đơn hàng chỉ được sản xuất sau khi bạn chấp nhận báo giá và xác nhận bản in. Sau khi đã vào sản xuất, đơn hàng không thể thay đổi thiết kế hoặc hủy, trừ khi hai bên có thỏa thuận khác.",
    ],
  },
  {
    title: "5. Thanh toán, giao hàng và hóa đơn",
    paragraphs: [
      "Hình thức thanh toán, thời gian và địa điểm giao hàng theo thỏa thuận trong báo giá. Hóa đơn VAT được xuất khi bạn yêu cầu.",
    ],
  },
  {
    title: "6. Lỗi sản xuất và đổi trả",
    paragraphs: [
      "Hàng lỗi do sản xuất (in sai bản đã xác nhận, sai quy cách) được in lại hoặc hoàn tiền phần bị lỗi. Vui lòng báo trong 7 ngày kể từ khi nhận hàng, kèm hình ảnh.",
      "Băng keo in theo yêu cầu không được đổi trả vì lý do khác, vì sản phẩm được làm riêng cho bạn.",
    ],
  },
  {
    title: "7. Thông tin cá nhân",
    paragraphs: [
      "Khi gửi yêu cầu báo giá, chúng tôi lưu họ tên, số điện thoại, email, tên công ty và thiết kế của bạn để báo giá, sản xuất và giao hàng. Chúng tôi không bán hoặc chia sẻ thông tin này cho bên khác, trừ đơn vị vận chuyển khi giao hàng hoặc khi pháp luật yêu cầu.",
      "Thông tin được xử lý theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Bạn có thể yêu cầu xem, sửa hoặc xóa thông tin của mình qua email bên dưới.",
    ],
  },
  {
    title: "8. Thay đổi điều khoản",
    paragraphs: [
      "Vĩnh Thịnh có thể cập nhật điều khoản này. Bản mới có hiệu lực khi được đăng trên trang này; đơn hàng đã xác nhận áp dụng điều khoản tại thời điểm xác nhận.",
    ],
  },
];

export const TERMS_CONTACT_TITLE = "9. Liên hệ";
export const TERMS_CONTACT_INTRO = "Mọi thắc mắc về điều khoản, báo giá hoặc đơn hàng, vui lòng liên hệ:";

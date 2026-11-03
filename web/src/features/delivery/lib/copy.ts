// Vietnamese UI copy of the public delivery confirmation page (/giao/<token>).
export const deliveryCopy = {
  title: "Xác nhận giao hàng",
  orderName: "Đơn hàng",
  quantity: "Số lượng",
  quantityUnit: "cuộn",
  recipient: "Người nhận",
  invalid: "Liên kết phiếu giao không hợp lệ.",
  replaced: "Phiếu giao này đã được thay bằng phiếu mới. Vui lòng quét QR trên phiếu mới nhất.",
  notReady: "Đơn hàng chưa ở trạng thái Sẵn sàng giao. Vui lòng liên hệ xưởng.",
  deliveredAt: "Đã giao lúc {time}",
  instructions: "Chụp ảnh hàng đã giao (thấy rõ hàng và nơi nhận), rồi bấm Xác nhận đã giao.",
  openCamera: "Mở camera",
  takePhoto: "Chụp ảnh",
  pickFile: "Chụp / chọn ảnh bằng ứng dụng máy ảnh",
  cancelCamera: "Đóng camera",
  retake: "Chụp lại",
  confirm: "Xác nhận đã giao",
  sending: "Đang gửi…",
  preparing: "Đang xử lý ảnh…",
  previewAlt: "Ảnh xem trước của hàng đã giao",
  cameraLabel: "Hình ảnh từ camera",
  cameraUnavailable: "Không mở được camera. Hãy dùng nút chụp bằng ứng dụng máy ảnh bên dưới.",
  success: "Đã xác nhận giao hàng. Cảm ơn bạn!",
  errors: {
    rate_limited: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
    not_found: "Liên kết phiếu giao không hợp lệ.",
    already_confirmed: "Phiếu giao này đã được xác nhận trước đó.",
    replaced: "Phiếu giao này đã được thay bằng phiếu mới. Vui lòng quét QR trên phiếu mới nhất.",
    not_ready: "Đơn hàng chưa ở trạng thái Sẵn sàng giao. Vui lòng liên hệ xưởng.",
    too_large: "Ảnh quá lớn (tối đa 10 MB). Vui lòng chụp lại.",
    not_image: "Tệp gửi lên không phải ảnh hợp lệ. Vui lòng chụp lại.",
    too_small: "Ảnh quá nhỏ (cần tối thiểu 640×480). Vui lòng chụp lại.",
    blank: "Ảnh trống hoặc quá tối/quá sáng. Vui lòng chụp lại rõ hàng đã giao.",
    unsupported_media_type: "Tệp gửi lên không phải ảnh. Vui lòng chụp lại.",
    forbidden: "Yêu cầu không hợp lệ. Vui lòng mở lại liên kết trên phiếu giao.",
    server_error: "Đã có lỗi xảy ra. Vui lòng thử lại.",
  },
} as const;

export type DeliveryErrorCode = keyof typeof deliveryCopy.errors;

export const deliveryErrorMessage = (code: string | undefined): string =>
  (code && Object.hasOwn(deliveryCopy.errors, code)
    ? deliveryCopy.errors[code as DeliveryErrorCode]
    : deliveryCopy.errors.server_error);

export const fmtDeliveredAt = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

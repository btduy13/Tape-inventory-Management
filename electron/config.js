// CẤU HÌNH HỆ THỐNG PHẦN MỀM BĂNG KEO (CONFIG.JS)
module.exports = {
  // Chuỗi kết nối tới cơ sở dữ liệu Supabase PostgreSQL
  DATABASE_URL: "postgresql://postgres.ctmkkxfheqjdmjahkheu:M4tkh%40u_11@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",

  // Cấu hình gửi Email qua SMTP (Gmail App Password)
  EMAIL_CONFIG: {
    server: "smtp.gmail.com",
    port: 587,
    username: "tque197@gmail.com",
    password: "otiz qxdn uhul bbfw", // App Password
    sender: "Phần Mềm Quản Lý Đơn Hàng <tque197@gmail.com>"
  },

  // Tên ứng dụng và phiên bản
  APP_NAME: "Quản lý Đơn hàng Băng Keo",
  APP_VERSION: "1.5.2"
};

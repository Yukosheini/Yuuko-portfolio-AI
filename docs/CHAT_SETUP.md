# Trợ lý Gemini

Khung chat dùng chung: `css/chat.css`, `js/chat.js`. Cả bốn trang HTML tải hai file này.

Backend: Supabase Edge Function `chat`, mã trong `supabase/functions/chat/index.ts`.
Function đọc hồ sơ id 1 và các bảng achievements, schedule. Khóa Gemini chỉ nằm trong secret
`GEMINI_API_KEY` trên Supabase. Không đặt khóa Gemini hoặc khóa secret Supabase vào frontend/GitHub.
Khóa publishable trong chat.js là khóa dành cho trình duyệt, không phải mật khẩu.

Function kiểm tra apikey bằng SUPABASE_PUBLISHABLE_KEYS; tắt kiểm tra JWT cũ riêng function chat.
Giữ RLS trên các bảng, không cấp quyền anon/authenticated cho dữ liệu.
Máy chủ dùng SUPABASE_SECRET_KEYS.default để đọc. Migration chat_budget cấp SELECT cho service_role.

Giới hạn toàn website: 100 lượt/ngày theo Asia/Ho_Chi_Minh, kiểm tra nguyên tử trong database.
Mỗi câu tối đa 1000 ký tự, giữ tối đa 3 lượt trao đổi trong bộ nhớ trang, không lưu nội dung chat
vào database hay localStorage. Câu hỏi và ngữ cảnh được gửi đến Google Gemini qua máy chủ.
Database chỉ lưu ngày và số lượt gọi để giới hạn sử dụng. CORS không thay thế xác thực hay chống bot.

Model mặc định: gemini-3.5-flash-lite. Có thể đặt GEMINI_MODEL trong Secrets để đổi model.
Hết hạn mức Google: chat báo thử lại sau, không tự đổi sang gói trả phí.

Tên miền cho phép: https://yukosheini.github.io và https://managerial-pink-tbxiaktl.edgeone.dev.
Đổi tên miền cần cập nhật danh sách origins trong function và triển khai lại.
Xem thử cục bộ dùng cổng 8000 qua HTTP (không mở file HTML bằng file://).

Triển khai bằng CLI (khi đã đăng nhập Supabase):

```sh
supabase functions deploy chat --project-ref ukjfzgjtnplumgvylinb
```

File config.toml đặt verify_jwt=false vì function dùng kiểm tra publishable key riêng.
Migration đã được chạy trên project qua Dashboard. Không chạy lại CREATE TABLE khi bảng đã tồn tại.
Các trang HTML hiện vẫn giữ dữ liệu hiển thị tĩnh; AI đọc database. Khi sửa lịch/thành tựu cần
cập nhật cả trang HTML và database để hai phần thống nhất.

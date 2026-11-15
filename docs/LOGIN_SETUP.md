# Cấu hình đăng nhập

Màn hình: login.html. Bốn trang portfolio chuyển người chưa có phiên về màn hình này.
Khách giải captcha phép cộng có hạn 2 phút, chỉ dùng một lần; phiên khách có hạn 8 giờ.
Quản trị xác thực mật khẩu ở Edge Function; phiên quản trị có hạn 1 giờ.
Mỗi địa chỉ IP được thử mật khẩu tối đa 5 lần / 15 phút. Không lưu IP nguyên văn.

## Triển khai

1. Chạy migration supabase/migrations/20261115_login.sql trong SQL Editor của project ukjfzgjtnplumgvylinb.
2. File cục bộ supabase/.env.login đã có bản băm PBKDF2-SHA256 (600.000 vòng) của mật khẩu được yêu cầu, salt và khóa mã hóa phiên ngẫu nhiên. File được .gitignore loại trừ. Không tải file này lên hosting tĩnh hoặc Git, không gửi nội dung cho người khác.
3. Khi Supabase CLI đã cài và đăng nhập, chạy từ thư mục dự án:

```sh
supabase secrets set --env-file supabase/.env.login --project-ref ukjfzgjtnplumgvylinb
supabase functions deploy login --project-ref ukjfzgjtnplumgvylinb
```

4. Triển khai HTML, CSS và JS bằng quy trình hosting hiện có; không xuất bản thư mục supabase hoặc file .env.
5. Kiểm tra khách nhập đúng/sai, đổi captcha, quản trị nhập đúng/sai, đăng xuất và hết hạn phiên.

Không có mật khẩu, bản băm mật khẩu hay khóa phiên trong frontend. Mật khẩu được gửi qua HTTPS khi chủ sở hữu nhập vào; DevTools trên chính thiết bị đang nhập vẫn có thể xem dữ liệu request. Không thể giấu dữ liệu đã nhập khỏi chủ thiết bị. Không lưu mật khẩu trong browser storage.

Portfolio vẫn là HTML công khai. Chuyển trang bằng JavaScript chỉ là luồng giao diện, không bảo vệ mã nguồn hay nội dung tĩnh. Chưa bổ sung tính năng sửa dữ liệu quản trị. Mọi API quản trị bổ sung sau này phải giải mã và kiểm tra phiên ở máy chủ, tuyệt đối không tin nhãn vai trò từ trình duyệt. Session token là bearer token, lưu trong sessionStorage; đăng xuất xóa phiên trên trình duyệt hiện tại. Token đã sao chép vẫn có hiệu lực tới khi hết hạn. Đổi LOGIN_SESSION_SECRET để vô hiệu hóa toàn bộ phiên.

Backend chưa được cấu hình sẽ báo chưa kết nối/chưa cấu hình; không có chế độ bỏ qua xác thực.

## Trạng thái triển khai ngày 15/11/2026
Migration đã chạy; ba secrets đã lưu; Edge Function login đã triển khai với xác thực riêng. Kiểm thử thực tế đã xác nhận đăng nhập khách/quản trị, kiểm tra phiên, từ chối captcha dùng lại, mật khẩu sai, token bị sửa và origin không được phép.
Website xuất bản từ main qua GitHub Pages: https://yukosheini.github.io/Yuuko-portfolio-AI/ .

Kiểm thử cục bộ: node --test tests/login.test.mjs. Kiểm thử backend thật: node tests/login.live.mjs; có thể truyền LOGIN_TEST_PASSWORD bằng biến môi trường để kiểm tra quản trị. Không ghi mật khẩu vào file test.

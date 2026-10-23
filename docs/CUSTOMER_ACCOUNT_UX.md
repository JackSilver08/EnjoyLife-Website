# EnjoyLife — Account 2.0: Customer-first Personal Dashboard

## Vấn đề từ UI cũ
- Header "Xin chào" quá lớn, đẩy form bảo mật và đơn mua xuống sâu.
- Form đổi mật khẩu hiện ngay ở đầu trang dù không phải tác vụ thường xuyên.
- Đơn mua chỉ hiển thị mã, trạng thái API thô bằng tiếng Anh và tiền; không xem được chi tiết.
- Hệ thống không có bộ lọc hoặc trạng thái tải/lỗi rõ ràng cho danh sách đơn.
- Layout chưa được tối ưu cho màn hình nhỏ.

## UX mới
Trên `/account` khách hàng đã đăng nhập có một dashboard:
1. **Tổng quan** (mặc định): tên/email, số đơn gần đây, đơn đang xử lý, đơn hoàn tất và tối đa 3 đơn mới nhất.
2. **Đơn mua của tôi**: danh sách theo mã, ngày đặt, giá trị, phương thức và tình trạng thanh toán; bộ lọc tất cả / đang xử lý / đã kết thúc; nút **Xem chi tiết và theo dõi đơn**.
3. **Bảo mật tài khoản**: form đổi mật khẩu hiện khi khách chủ động chọn, có lời giải thích và thông báo chính xác.

Menu riêng của tài khoản ở bên trái desktop, chuyển thành thanh lựa chọn ngang trên mobile. Đăng nhập/đăng ký cũng có một card trực quan gọn hơn.

## Tích hợp dữ liệu và bảo mật
- `GET /api/v1/account/orders` thêm `tracking_token` dựa trên `public_token` **chỉ với các đơn có `user_id` trùng phiên đã đăng nhập**. Không trả về token trong API liệt kê công khai hoặc trang Admin. Mã token không được ghi log.
- Bấm xem đơn dẫn tới trang tra cứu riêng tư `/orders/:token` đang được dùng ở checkout, không tạo một hệ thống trạng thái trùng lặp.
- Giữ nguyên login/register, phân quyền Admin/Staff, đổi mật khẩu, logout, payment, order/warehouse RMA, không migrate DB.
- Các số liệu tổng quan chỉ đếm **tối đa 50 đơn gần nhất** trả về từ API, không tuyên bố tổng toàn thời gian.
- Không hiển thị dữ liệu giả hay thông tin nhạy cảm của người dùng khác.

## Nghiệm thu
- Next.js lint, typecheck, build; Go tests/vet và PostgreSQL tích hợp.
- Chrome + Docker E2E tạo khách hàng và một đơn thật gắn `user_id` trong cơ sở dữ liệu test; kiểm tra token truy cập đúng, khách khác không thấy đơn, tổng quan, lọc đơn, mục bảo mật và điều hướng /admin.
- Chrome mobile 375px đảm bảo trang không bị kéo ngang và điều hướng không quá nhỏ.

## Cập nhật Windows
```powershell
git switch main
git pull origin main
docker compose up -d --build --wait --wait-timeout 300 api web
```
Không dùng `docker compose down -v` vì sẽ xóa những volume dữ liệu quan trọng.

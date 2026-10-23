# Admin UX — Dialogs and toast popups

## Thay đổi giao diện
- Thông báo lưu thành công, tiến trình hoặc lỗi được hiển thị dưới dạng toast ở góc phải thay cho các alert chiếm diện tích nội dung. Toast có nút đóng, tự ẩn sau 5,2 giây (lỗi sau 8 giây), thông báo lỗi nằm trong modal đang mở để không bị backdrop che khuất.
- Modal chung sử dụng native `<dialog>` (inert background, focus containment, phím Esc), render portal, nút đóng rõ ràng, chặn đóng khi đang lưu; desktop rộng tối đa 850/1110px, trên mobile chiếm chiều rộng màn hình và có vùng cuộn riêng.
- Trang Sản phẩm: Tạo, Sửa, nhập CSV, Thêm/Sửa từng màu-size và thay đổi giá/album.
- Kho: Nhập/Xuất/Kiểm kê và tra lịch sử.
- Phiếu nhập: Tạo nhà cung cấp, tạo phiếu, tiếp nhận hàng.
- Phân tích tồn: Xử lý hàng cách ly.
- Nhân viên: Tạo tài khoản, đặt lại mật khẩu.
- Journal: Tạo/Sửa bài viết đầy đủ trong modal từ danh sách; tạo danh mục/tag bằng modal. Đường dẫn soạn bài trực tiếp tiếp tục hoạt động.
- Giao diện trang chủ: Biên tập Hero/Story trong modal.
- Media, Orders, Reports, Customers, bảo mật và gallery: thông báo toast chung.

## Nguyên tắc an toàn
- Không đổi API, model DB, payOS, đơn hàng, phép tính tồn kho và phân quyền.
- Modal không tự gửi form khi mở/đóng. Chỉ lưu qua nút người dùng nhấn; nút thoát bị vô hiệu khi request đang chạy.
- Những thay đổi trạng thái nhạy cảm và xóa vẫn dùng thao tác xác nhận hiện có.
- Toast lỗi hiển thị trong modal nếu modal đang mở, không ẩn sau top-layer.

## Kiểm thử
CI gồm Go tests, PostgreSQL integration, Next.js lint/typecheck/build và Docker E2E. Bài Chrome Admin được mở rộng: mở modal Sửa giá, kiểm tra không tự PATCH trước khi Lưu, hiển thị toast thành công, Esc đóng form Thêm sản phẩm, mở/đóng form Kho, Nhân viên, Journal và Nhà cung cấp, không thực hiện thao tác ghi ngoài ý muốn.

## Cập nhật Windows
```powershell
git switch main
git pull origin main
docker compose up -d --build --wait --wait-timeout 300 web api
```
Không chạy `docker compose down -v`: PostgreSQL và media dữ liệu sẽ bị xóa.

# Sprint 9 — Vận hành kho thời trang nữ (EnjoyLife)

## Phạm vi đã xây dựng
Sprint 9 triển khai ba phần liên kết với dữ liệu PostgreSQL hiện có, theo nguyên tắc **không thay thế dữ liệu gốc, không ghi đè tồn lịch sử, không để AI tự điều chỉnh kho**.

### 9A — Kho có chứng từ
- Nhà cung cấp với thời gian giao dự kiến, liên hệ và trạng thái hoạt động.
- Phiếu đặt nhập nhiều biến thể/màu/size, lưu giá vốn theo SKU, số lượng đặt và ngày dự kiến.
- Nhận từng phần (partial receipt), chia **đạt** và **cách ly**. Chỉ số đạt đi vào phần có thể bán; hàng cách ly vào cả `on_hand` và `unavailable`.
- Receipt dùng `request_key` unique theo PO, kèm transaction và khóa hàng trên PO, tránh cộng tồn trùng do double-click hoặc request retry.
- Không nhận quá số còn thiếu, không nhận vào phiếu hủy/đã nhận đủ, không hủy phiếu đã nhận bất kỳ hàng nào.
- Kiểm soát chất lượng: chuyển hàng cách ly sang bán sau khi kiểm tra hoặc loại khỏi kho, yêu cầu lý do và lưu sổ kho.
- Giá vốn nhập hiện chỉ là chứng từ; **chưa** áp dụng cho kế toán vốn bình quân hay báo cáo lợi nhuận.

### 9B — Khách chờ hàng
- Khách được chọn màu/size hết hàng ở trang sản phẩm; chỉ lúc `available<=0` mới mở biểu mẫu đăng ký chờ.
- Đăng ký theo `variant_id` và email có đồng ý liên hệ; trùng đăng ký không sinh thêm đơn.
- Admin xem danh sách, đánh dấu đã liên hệ hoặc đóng. Chưa có email tự động, chưa đặt cọc/giữ hàng.
- Không nên giữ thông tin đăng ký vô thời hạn; cần xây tính năng yêu cầu xóa/liên hệ của khách trước khi vận hành công khai với quy mô lớn.

### 9C — Phân tích tồn kho theo quy tắc
- SQL đếm số đơn vị thực sự xuất (`stock_movements.movement_type='SHIP'`) trong 30 ngày gần nhất, không trộn giỏ hàng/đơn chờ.
- Bình quân/ngày = `sold_30d / 30`. Số ngày đủ bán = `available / average` nếu có nhu cầu.
- Điểm đặt lại = `ceil(average * lead_days)` + ngưỡng an toàn mỗi SKU. Nếu chưa từng bán trong kỳ thì KHÔNG đề xuất nhập tự động.
- Ước tính thời gian giao của **nhà cung cấp trên PO gần nhất**; nếu chưa có PO thì dùng giả định **7 ngày**, luôn được gắn nhãn ước tính.
- Đề xuất chỉ để nhân viên tham khảo, không tạo phiếu nhập tự động.

## Màn hình
- `/admin/warehouse`: nhà cung cấp, PO, nhận hàng, cách ly.
- `/admin/warehouse/insights`: cảnh báo, sức bán, xử lý cách ly, khách chờ.
- `/admin/inventory`: tiếp tục kiểm kê và lịch sử SKU hiện có.
- `/products/:slug`: khách có thể đăng ký chờ đúng biến thể hết hàng.

## Giới hạn đã biết / Sprint kế tiếp
- Chưa triển khai tự động gửi email, đổi trả/RMA, điều phối nhiều kho, đối soát giá vốn hoặc yêu cầu nhập hàng từ nhà cung cấp bên ngoài.
- Chưa dự báo học máy; ưu tiên kiểm chứng chất lượng sổ kho và lịch sử đơn trước.
- Luồng hiện vẫn trừ `on_hand` lúc chuyển đơn sang SHIPPING. Trả hàng/giao thất bại cần chứng từ RMA và nhập kiểm tra riêng, **không** cộng tồn bằng hủy đơn đã giao.
- Dữ liệu liên hệ khách chờ là thông tin cá nhân. Chỉ Admin được xem.

## Kiểm thử
`go test ./internal/handlers -run TestSprint9WarehouseIntegration -v` với `INTEGRATION_DATABASE_URL` trỏ vào **PostgreSQL test**, không chạy bộ test trực tiếp trên DB thật. CI tự dựng PostgreSQL disposable và chạy test cùng các bài Sprint 6–8.

Các tình huống kiểm tra: chưa đăng ký consent, đăng ký trùng, bắt buộc Admin, tạo PO, nhận một phần, retry trùng khóa, nhận vượt bị chặn, nhận đủ, không hủy PO đã nhận, kiểm tra chất lượng và sổ kho.

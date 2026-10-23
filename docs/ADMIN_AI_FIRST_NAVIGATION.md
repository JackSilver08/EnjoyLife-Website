# EnjoyLife Admin — AI-first compact sidebar

## Điều chỉnh điều hướng
Menu Admin trước đây có 14 liên kết xếp dọc; giờ chia thành **5 mục chính luôn hiển thị** và **2 nhóm mở rộng** để giảm cuộn và tăng khả năng tìm thông tin:

**Mục chính:** Tổng quan (`/admin`), Đơn hàng (`/admin/orders`), Sản phẩm (`/admin/products`), Kho hàng (`/admin/inventory`), **AI & Phân tích** (`/admin/warehouse/insights`).

**Vận hành:** Đổi trả & Hoàn tiền, Phiếu nhập & NCC, Khách hàng.

**Quản lý khác:** Nhân viên & quyền, Báo cáo, Enjoy Journal, Thư viện ảnh, Giao diện website, Bảo mật tài khoản.

Tất cả các URL cũ và quyền truy cập vẫn giữ nguyên. Nav của tài khoản STAFF vẫn có 4 mục và không bị mở rộng thêm quyền. Nhóm có thể mở bằng chuột, bàn phím hoặc screen reader nhờ native HTML `<details><summary>`; nhóm tương ứng tự mở nếu truy cập trực tiếp vào URL con. Trang `/admin` chỉ sáng khi đúng trang tổng quan, không đánh dấu sai trên tất cả trang con.

## Ưu tiên Sprint 12 AI Admin
Dùng trang **Smart Inventory** hiện có làm điểm khởi đầu. Trang này đã có cảnh báo tồn kho và một API phân tích bằng AI từ dữ liệu SKU 30 ngày; không tạo ra nhiều trang AI trùng lặp.

Sprint 12 dự kiến mở rộng thành trợ lý phân tích kinh doanh có phân quyền: hỏi doanh thu được xác thực từ PostgreSQL, theo dõi xu hướng theo sản phẩm/màu/size, giải thích biến động tồn và đề xuất nhập hàng. AI chỉ trả lời trên những số liệu backend cung cấp; không tự thực hiện SQL hay tạo phiếu nhập, thay đổi giá, xuất kho hoặc ghi nhận hoàn tiền.

Việc đổi nhãn sidebar không đồng nghĩa AI doanh thu đã được triển khai. Các tính năng đó nằm trong kế hoạch Sprint 12.

## Kiểm thử
- Next.js lint / typecheck / production build.
- Docker Chrome E2E: xác nhận đủ 5 liên kết chính, đúng 2 nhóm đóng mặc định, mở nhóm Quản lý khác và chuyển đến Báo cáo với active state chính xác.
- Mọi bài Go/PostgreSQL, payOS, đổi trả, kho, chatbot, Journal, mô-đun nhân viên và responsive hiện tại tiếp tục chạy trong CI.

## Cập nhật local
```powershell
git switch main
git pull origin main
docker compose up -d --build --wait --wait-timeout 300 web
```

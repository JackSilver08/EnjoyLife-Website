# Enjoy Life Admin — sidebar tinh gọn

## Điều hướng hiện tại

**6 mục chính:** Tổng quan (`/admin`), Đơn hàng (`/admin/orders`), Sản phẩm (`/admin/products`), Kho hàng (`/admin/inventory`), Khách hàng (`/admin/customers`), AI & Phân tích (`/admin/warehouse/insights`).

**1 menu xổ ngang Quản lý khác:** Nhân viên & quyền, Báo cáo, Enjoy Journal, Thư viện ảnh, Giao diện website, Bảo mật tài khoản.

- Không hiển thị nhóm Vận hành, đường kẻ ngăn AI, hay menu Đổi trả/Hoàn tiền và Phiếu nhập NCC.
- Hai trang `/admin/returns` và `/admin/warehouse` đã được bỏ, trả 404 khi truy cập trực tiếp.
- Không xóa API, bảng dữ liệu hoặc giao dịch lịch sử của RMA và phiếu nhập. Chúng còn liên quan quy tắc trạng thái đơn, tồn kho, đối soát và kiểm thử hồi quy.
- Kho hàng vẫn hỗ trợ Nhập hàng / Xuất hàng / Kiểm kê trực tiếp; Smart Inventory vẫn cảnh báo tồn và phân tích AI.
- Tài khoản STAFF giữ nguyên các trang và phân quyền trước đó.

## Hướng phát triển AI

Smart Inventory đã hỗ trợ cảnh báo tồn SKU và phân tích có trợ giúp AI; phân tích doanh thu nâng cao và trợ lý hỏi đáp quản trị chưa được khẳng định là hoàn thiện. Mọi quyết định thay đổi giá, kho hoặc thanh toán vẫn do quản trị viên thực hiện.

## Kiểm thử

- Next.js lint, typecheck, production build.
- Chrome desktop/mobile: đủ 6 mục chính, đúng 1 menu quản lý, không có đường kẻ tại AI, Khách hàng active khi mở, trang cũ trả 404.
- Giữ nguyên bài test kho, đổi trả, payOS, nhân viên, chatbot và Journal ở tầng API/BFF.

## Đồng bộ trên Windows

```powershell
git switch main
git pull origin main
docker compose up -d --build --wait --wait-timeout 300 web
```

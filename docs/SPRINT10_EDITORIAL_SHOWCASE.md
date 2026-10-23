# Sprint 10 — Editorial Product Showcase

## Mục tiêu
Làm lại **duy nhất** section `#featured-products` trên trang chủ EnjoyLife thành bộ sưu tập nghệ thuật tối giản gồm tối đa **5 sản phẩm mới nhất**. Không thay đổi trang /shop, giỏ hàng, kho, thanh toán payOS, hoặc API chatbot.

## Nguồn dữ liệu
- `GET /api/v1/products` chỉ trả hàng `published=true`, chưa archive và có biến thể active. Thứ tự `created_at DESC, id DESC` ổn định khi trùng thời điểm tạo.
- Trang chủ SSR gọi `fetchProducts()` hiện tại và hiển thị 5 phần tử đầu bằng `LatestEditorialProducts`. Không dùng dữ liệu mẫu hoặc hình ảnh giả.
- Sản phẩm hết tồn vẫn được hiển thị với nhãn **HẾT HÀNG**, có thể vào trang sản phẩm đăng ký chờ đúng màu/size như Sprint 9.
- Không có ảnh: hiển thị placeholder có nhận diện EnjoyLife, không thêm logo/ảnh ngoài.

## UX & bố cục
- Desktop (từ 1024px): **3 cột, 2 hàng** — ảnh sản phẩm #1 chiếm toàn chiều cao 2 hàng bên trái; bốn sản phẩm còn lại nằm ở lưới 2 × 2 phía phải. Sản phẩm chính có gradient chữ tên/giá phía dưới; sản phẩm phụ đặt tên/giá **bên dưới ảnh** để dễ đọc và không che sản phẩm.
- Tablet/mobile (<1024px): sản phẩm #1 chiếm **2 cột**, bên dưới là 4 sản phẩm thành 2 hàng × 2 cột. Breakpoint 600px thu gọn chữ và khoảng cách. Khi có ít hơn 5 sản phẩm, grid tự co và không tự tạo ô giả.
- Ảnh dùng Next/Image, `fill` + `object-fit:contain` để không cắt mất quần áo/phụ kiện; sản phẩm đầu tiên được ưu tiên tải; ảnh phụ lazy-load. Link toàn card, focus rõ, hạn chế nội dung card chỉ còn hình, tên, giá và trạng thái hết hàng.
- CSS được namespace `.latest-editorial-*` trong `apps/web/src/app/redesign.css`; không sửa component `ProductCard` dùng tại shop.
- Không dùng thư viện animation, carousel hoặc nạp dữ liệu client phụ. Tôn trọng `prefers-reduced-motion`.

## Kiểm thử và nghiệm thu
- Frontend: Next.js lint, TS typecheck, production build.
- Backend: Go tests/vet, PostgreSQL integration.
- Docker: tất cả E2E kho, nhân viên, thanh toán, Journal, giá bán Admin tiếp tục chạy.
- `apps/web/scripts/editorial-docker-e2e.mjs`: tạo 6 sản phẩm đã xuất bản và 1 sản phẩm nháp trong PostgreSQL disposable, upload ảnh qua API thật, kiểm tra đúng 5 sản phẩm mới nhất, thứ tự từ DB và link chi tiết; Chrome đo trực tiếp bố cục ở **1440, 768, 375, 320 px**, tên/giá, ảnh, placeholder, hết hàng, không tràn ngang.
- **Không được chạy các script tạo fixture trên cơ sở dữ liệu thật**: CI sử dụng Docker disposable.

## Triển khai trên Windows
```powershell
git switch main
git pull origin main
docker compose up -d --build --wait --wait-timeout 300 web api
```
Sau đó nhấn Ctrl + F5 tại http://localhost:3000 và kiểm tra 5 sản phẩm mới nhất ở section **Mặc đẹp mỗi ngày**. Tránh `docker compose down -v` vì xóa dữ liệu PostgreSQL.

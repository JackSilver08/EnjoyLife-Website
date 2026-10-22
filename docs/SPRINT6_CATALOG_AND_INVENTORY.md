# Enjoy Life — Sprint 6 · Product Catalog 2.0 + Warehouse Integration

**Status:** implemented in source; release gate = green CI plus local Windows acceptance.  
**Scope:** Sprint 6.1–6.4 plus Sản phẩm ↔ Kho hàng, lịch sử xuất/nhập, kiểm kê và cảnh báo tồn theo SKU.

## 6.1 — Product Creation & Administration

- Nhập tên → tự sinh slug tiếng Việt không dấu, Admin được chủ động chỉnh URL.
- Mã SKU `SP-001`, `SP-002`, ... được cấp bởi PostgreSQL sequence, không yêu cầu người dùng điền.
- Form hai cột, chọn ảnh ngang với tồn kho, mô tả gọn, không hiển thị trường Bộ sưu tập/SKU.
- Tạo sản phẩm ở trạng thái Ẩn; Admin duyệt rồi công khai.
- Xóa mềm chuyển vào Thùng rác; khôi phục vẫn ở trạng thái Ẩn. Giữ lịch sử đơn và stock movements.

## 6.2 — Variants and Warehouse

- Mỗi sản phẩm có nhiều size/màu; một SKU duy nhất cho mỗi biến thể, giá và tồn riêng.
- Chỉnh sửa màu, size, giá, trạng thái và **ngưỡng cảnh báo thiếu hàng** theo SKU trong bảng, không dùng `window.prompt`.
- Không cho đổi size/màu của SKU có lịch sử đơn hàng; Admin phải ngừng bán rồi thêm SKU mới. Không cho ngừng bán SKU khi đang giữ hàng của đơn chưa xuất.
- `Sản phẩm → Xem kho` chọn đúng product ID; `Kho → tên sản phẩm` mở phần Sửa ở trang Admin sản phẩm.
- Kho hiển thị cả SKU ngừng bán/đã xóa mềm khi bật chế độ hàng không hoạt động. Hàng vẫn còn vật lý không bị mất dấu.
- Nghiệp vụ **Nhập kho** (RECEIVE), **Xuất kho** (ISSUE), **Kiểm kê** (COUNT) ghi stock movement có thời điểm và lý do. API cũ điều chỉnh bằng delta vẫn chạy.
- Ràng buộc DB: `on_hand >= 0`, `reserved+unavailable <= on_hand`, khoá dòng `FOR UPDATE`; không bán âm tồn hoặc vượt hàng đã giữ.
- Tồn khả dụng = tồn thực tế − hàng giữ − hàng không khả dụng. Đơn tạo giữ hàng, chuyển vận chuyển trừ tồn; hủy hợp lệ trả số giữ hàng.
- Dashboard thiếu hàng và filter Kho dùng ngưỡng riêng `low_stock_threshold` (mặc định 3) thay vì hard-code 3 cho mọi SKU.

## 6.3 — Image Gallery

- `product_images` lưu nhiều ảnh cho một sản phẩm (tối đa 12), thứ tự và alt text.
- Admin có thể tải nhiều ảnh một lần, chọn từ Thư viện Media, chọn lại vị trí ảnh và bỏ ảnh khỏi album.
- Ảnh đầu tiên là cover; Go API lưu cover trong `products.image_url` để tương thích bản cũ.
- Ảnh tải mới được thử resize và chuyển WebP trên trình duyệt khi nhỏ hơn bản gốc; Go API luôn xác thực MIME và payload.
- Storefront có ảnh lớn, dải thumbnail, ảnh trước/sau, modal zoom và điều khiển bằng phím trái/phải/Escape.
- Bản ghi sản phẩm cũ chưa có album vẫn hiển thị `products.image_url` như trước.

## 6.4 — Customer Catalog

- Trang `/shop` lọc theo danh mục, từ khóa, màu, size, khoảng giá, sắp xếp giá/mới nhất và phân trang 12 sản phẩm.
- API `GET /api/v1/products/search` lọc bằng PostgreSQL, loại bỏ sản phẩm Ẩn/Thùng rác và các biến thể không khả dụng.
- Các màu/size có trong form lọc được truy vấn từ DB. Trang chủ vẫn sử dụng API danh mục hiện hành để tránh ảnh hưởng Sprint 1–5.
- Trang chi tiết đọc ảnh gallery động, không dùng tên `collection` cũ trong breadcrumb.
- Giỏ hàng/đặt hàng tiếp tục dùng `variant_id` và kiểm tra tồn dưới transaction trên Go backend.

## DB migrations — Không mất dữ liệu

`EnsureProductCatalogSchema` khi Go API khởi động:
1. Tạo `product_images` nếu chưa có, lưu ảnh và thứ tự độc lập; không sửa sản phẩm đang có.
2. Thêm `stock_movements.reason` và `stock_movements.actor_id` để theo dõi hoạt động kho.
3. Thêm `product_variants.low_stock_threshold` (mặc định 3).
4. Giữ toàn bộ SKU, sản phẩm cũ, ảnh trong Docker volume, đơn hàng, giá và tồn.

**Không chạy** `docker compose down -v`. Backup database và thư viện ảnh trước khi chạy migration trên dữ liệu kinh doanh thật.

## API cập nhật

| Method | Route | Tác dụng |
|---|---|---|
| GET | `/api/v1/products/search` | Q / category / size / color / min_price / max_price / sort / page |
| GET | `/api/v1/products/filters` | Danh sách màu và size từ DB |
| GET | `/api/v1/products/:slug` | Thông tin + biến thể + images |
| GET | `/api/v1/admin/products/:id/images` | Gallery Admin |
| PUT | `/api/v1/admin/products/:id/images` | Lưu gallery + cover transaction |
| GET | `/api/v1/admin/inventory` | Tất cả tồn vật lý, kèm trạng thái và product_id |
| PATCH | `/api/v1/admin/inventory/:id` | RECEIVE / ISSUE / COUNT / legacy delta |
| GET | `/api/v1/admin/inventory/:id/history` | 100 dòng biến động gần nhất |
| PATCH | `/api/v1/admin/variants/:id` | Sửa màu/size/giá/trạng thái/ngưỡng thấp |

Tất cả endpoint Admin phải có session quản trị ở Go API; Next BFF giới hạn whitelist route, method và same-origin.

## CI / CD & nghiệm thu

Workflow `.github/workflows/quality.yml` trên push `main` hoặc pull request:
- Next.js: Typecheck, ESLint, build, SSR/SEO security regression.
- Go: Unit tests, Vet, PostgreSQL integration chạy trên DB container dùng một lần.
- Shell script CRLF compatibility, Docker Compose dependency volume regression.
- Node --check cho script E2E, khởi động toàn bộ Go + Next + PostgreSQL và chờ health.
- Docker E2E kiểm tra upload media, CSV import, gallery, bộ lọc giá/màu/size, sản phẩm được công khai, nhập/xuất/kiểm kê, lịch sử kho, SKU ngừng bán, xóa mềm và khôi phục.
- Dữ liệu test tạo trong CI, không đụng tới DB người dùng.

**CI không đồng nghĩa tự deploy production.** CD production và cấu hình secrets thuộc Sprint 13, sau khi có UAT và merchant payment gateway.

### Test thủ công trên Windows

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate api web
docker compose ps
```

1. `/admin/products`: tạo sản phẩm với màu M, L, chỉnh size/màu/giá và ngưỡng tồn thấp.
2. Bấm **Xem kho** và xác nhận tồn theo từng SKU; thử Nhập hàng, Xuất hàng và Kiểm kê; mở **Lịch sử**.
3. Bấm tên sản phẩm từ Kho để quay về đúng phần Sửa.
4. Chọn **Album ảnh**, tải 2–3 ảnh, thay đổi vị trí, thêm alt và lưu.
5. Công khai sản phẩm; kiểm tra `/shop` lọc theo danh mục, giá, màu, size và trang chi tiết gallery.
6. Đặt COD thử và kiểm tra giữ hàng, chuyển giao hàng, hủy hợp lệ và tồn tương ứng.
7. Ngừng bán SKU đang còn hàng, bật filter kho không hoạt động, xác nhận hàng vẫn hiển thị.
8. Xóa sản phẩm đã có tồn, kiểm tra không còn bán được; Khôi phục sản phẩm ở trạng thái Ẩn.
9. Kiểm tra trên Edge/Chrome ở desktop và thiết bị mobile.

**Chưa thuộc Sprint 6:** gateway payOS production, phân quyền nhân viên thực, AI chatbot/AI Admin, tích hợp bên vận chuyển (Sprint 7–13).

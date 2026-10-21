# Enjoy Life — Sprint 4: Dynamic Enjoy Journal Storefront

## Thay đổi đã triển khai

- Gỡ ba chủ đề Blog hardcode khỏi Homepage và `/blog`; không seed bài viết giả.
- Homepage lấy tối đa 3 bài **PUBLISHED** từ Go API / PostgreSQL qua server-side fetch.
- `/blog`: bài đã xuất bản, lọc danh mục và tags, phân trang server-side (9 bài/trang), trạng thái trống chính xác.
- `/blog/[slug]`: đọc chi tiết từ Go API; nếu bài là `DRAFT`, đã gỡ, lưu trữ hoặc slug sai: HTTP **404**.
- Render JSON từ Tiptap bằng component React với allowlist node và URL an toàn, không render HTML thô.
- Giao diện Editorial responsive cho thẻ bài, trang đọc, bài liên quan và bộ lọc.
- Dynamic SEO: meta title, description, canonical, OG, Twitter, `BlogPosting` JSON-LD, robots.txt và sitemap.xml có URL bài thật.
- Loại bỏ các khối Lookbook, trích dẫn và Community mẫu trùng lặp trong Homepage để giữ đúng luồng:
  Hero → Story → Sản phẩm → Journal → Liên hệ.
- Không thay đổi Admin CMS, checkout, kho, đơn hàng hoặc quyền truy cập Admin.

## Luồng dữ liệu

```text
Admin Tiptap → Go API (session + role ADMIN) → PostgreSQL (DRAFT)
                                |
                         Admin xuất bản
                                |
                           PUBLISHED
                                |
              Go Public API → Next.js SSR
                         |           |
                  /blog, /blog/[slug]  Homepage
```

`/blog` chỉ render dữ liệu thực sự được API trả về. Khi chưa có bài, hiển thị trạng thái trống; khi API lỗi, không tự động chuyển thành danh sách bài giả.

## Sitemap và robots

Ứng dụng mặc định **không được index** khi chạy local (bao gồm Next.js production tại localhost). Chỉ bật index nếu:

1. Chạy `NODE_ENV=production`.
2. `NEXT_PUBLIC_SITE_URL` là **domain HTTPS công khai** của Enjoy Life, không phải localhost, địa chỉ IP riêng hoặc tên miền `.local/.test/.internal`.
3. Nội dung đã được xuất bản.

Ví dụ, khi có domain thật:
```dotenv
NEXT_PUBLIC_SITE_URL=https://ten-mien-chinh-thuc-cua-cua-hang.vn
```
Lưu ý: `compose.yaml` hiện phục vụ **development localhost** nên giá trị này là `http://localhost:3000`. Khi triển khai production cần cấu hình bằng công cụ deployment/Compose tương ứng và kiểm tra lại canonical, sitemap, reverse proxy và HTTPS.

`robots.txt` chặn `/admin/`, `/account`, `/cart`, `/checkout`, `/api/`, `/orders/`. Sitemap chỉ xuất bản URL bài thực, không có nháp hoặc bài lưu trữ. Với danh mục đặc biệt lớn (>~10.000 bài), cần tách sitemap thành từng phần.

## QA

CI bổ sung hai lớp kiểm thử:

1. Next.js production build + HTTP mock cho Go API kiểm tra:
   - Homepage, Blog, trang chi tiết hiển thị đúng bài từ API.
   - Lọc category/tags, URL không tồn tại 404, metadata SEO, canonical và structured data.
   - Sitemap chỉ chứa URL được phép; robots chặn Admin.
   - Giữ các kiểm tra auth/proxy/CSRF trước đó.
2. Docker Compose integration với **Go + PostgreSQL thật**:
   - Admin tạo DRAFT: khách truy cập 404 và không có trong Blog.
   - Admin xuất bản: trang danh sách, bài chi tiết và Homepage lấy được bài.
   - Admin gỡ xuất bản: bài biến mất khỏi trang công khai ngay.
   - Local robots vẫn không cho index.

## Kiểm thử trên máy Windows

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate api web
docker compose ps
```

Truy cập `http://localhost:3000/admin/blog` và tạo một bài viết. Lưu nháp, kiểm tra URL bài không truy cập được; sau đó xuất bản để kiểm tra Homepage, `/blog` và `/blog/slug-cua-bai`. Gỡ bài sẽ loại khỏi trang công khai.

**Không dùng** `docker compose down -v`; nó có thể xóa dữ liệu PostgreSQL.

## Chưa thuộc Sprint 4

- AI tạo nội dung và kiểm duyệt.
- Upload, xử lý ảnh/Media Manager và import sản phẩm thật.
- Quản lý Hero/Story/Contact qua database.
- Trang Product Catalog mới hoàn toàn động (sản phẩm mẫu hiện đã lưu ở DB nhưng còn seed demo trong dev).

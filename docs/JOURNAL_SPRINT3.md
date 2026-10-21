# Enjoy Journal — Sprint 3 CMS (Admin)

## Tình trạng
Đã bổ sung giao diện quản trị bài viết trực tiếp trong Next.js. Nội dung được lưu vào PostgreSQL thông qua Go/Gin API từ Sprint 2. Không có bài mẫu, ảnh giả hay nội dung AI tự động nào được tạo.

## Truy cập
1. Chạy `git pull origin main` và `docker compose up -d --build --force-recreate api web`.
2. Vào `http://localhost:3000/account`, đăng nhập bằng Admin hợp lệ. Tài khoản `admin/admin` **chỉ chạy trên localhost development** nếu file `.env` bật `APP_ENV=development`, `GIN_MODE=debug`, `ENABLE_DEV_ADMIN=true`. Không sử dụng với máy chủ công khai.
3. Chọn **Enjoy Journal** từ sidebar hoặc mở `http://localhost:3000/admin/blog`.
4. Tạo danh mục và tags trước khi soạn bài, nếu cần.
5. Nhấn **Viết bài mới**, điền tiêu đề, slug, excerpt, nội dung, ảnh/alt và metadata SEO; chọn danh mục/tags; lưu nháp.
6. Dùng **Xem trước** ở ngay trong Admin để soát hình ảnh và bố cục. Bản xem trước không tạo URL công khai.
7. Chọn **Xuất bản** sau khi duyệt. Go API xác thực quyền và nội dung, cập nhật trạng thái `PUBLISHED`. Phải triển khai Sprint 4 để trang /blog và /blog/[slug] thực sự hiển thị bài đã xuất bản.
8. Dùng danh sách bài viết để lọc `ALL`, `DRAFT`, `PUBLISHED`, chỉnh sửa, gỡ xuất bản hoặc lưu trữ mềm.

## Tính năng đã có
- `/admin/blog`: danh sách bài theo trang (12 dòng), lọc trạng thái, tìm trong trang hiện tại, nút sửa/xuất bản/gỡ bài/lưu trữ.
- Quản lý danh mục và tags (tạo mới; chọn trực tiếp trong form bài viết).
- `/admin/blog/new` và `/admin/blog/[id]/edit`.
- Trình soạn thảo Tiptap trên client với tiêu đề H2/H3, in đậm/nghiêng/gạch chân, danh sách, trích dẫn, link và chèn hình ảnh HTTPS với alt.
- Nhập Meta Title, Meta Description, OpenGraph URL; xem trước SEO và bài viết trong Admin (render theo JSON nodes được cho phép, không dùng dangerouslySetInnerHTML).
- Lưu nháp, cập nhật bài, gỡ xuất bản và xuất bản; bảo vệ `expected_version` khi cập nhật để chống ghi đè khi có nhiều người sửa.
- Chỉ cho Admin đã xác thực truy cập API viết nội dung, có audit log từ backend.
- Bài mới không xuất hiện trên web khách khi chỉ lưu nháp. Public API chỉ trả dữ liệu Published.

## Những giới hạn được cố ý giữ lại
- Sprint 3 **chưa có upload file lên Storage**, chỉ chèn ảnh từ URL HTTPS đã xác minh và yêu cầu alt. Import ảnh hàng loạt/Media Manager sẽ có ở sprint khác.
- **Chưa tích hợp AI** tạo bài viết tự động. AI sẽ tạo bản nháp `DRAFT` và Admin kiểm duyệt trong sprint tích hợp sau.
- **Trang /blog công khai vẫn đang dùng các chủ đề dự kiến** từ Sprint 1. Không có bài chi tiết động, canonical, sitemap, dữ liệu cấu trúc BlogPosting thật. Chúng thuộc Sprint 4.
- Bài đã lưu trữ không thể khôi phục từ UI hiện tại (soft-delete). Slug vẫn được giữ để tránh lỗi dữ liệu.
- Chức năng tìm kiếm trong danh sách chỉ lọc trang hiện tại, không phải search toàn database.

## Kiểm thử
- `npm run typecheck`, `npm run lint`, `npm run build`.
- `go test ./...` và `go vet ./...`.
- CI kiểm tra Go + PostgreSQL: không rò rỉ bản nháp, Admin RBAC, dữ liệu bài viết SEO, publish/unpublish/archive, version conflict và audit.
- Next.js smoke test các API CMS qua BFF, chặn request khác Origin và redirect khách chưa xác thực khỏi toàn bộ route /admin/blog.
- Nên kiểm tra thủ công trên Docker: tạo danh mục, thêm tag, viết bài, nhúng ảnh, lưu nháp, refresh, sửa, preview, xuất bản, gỡ xuất bản và đăng xuất.

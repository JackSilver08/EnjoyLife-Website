# Enjoy Life — Sprint 5: Media Manager & Dynamic Store Content


## Tải cả bộ ảnh ZIP trước khi import CSV (cập nhật)

Trường `image_url` trong CSV **không chứa ảnh nhúng**. Nó chỉ chứa **tên file gốc** được đối chiếu trong Media Manager.

**Nếu import CSV bị lỗi "Chưa tìm thấy ảnh đã tải lên với tên file":**
1. Vào `http://localhost:3000/admin/media` bằng tài khoản Admin.
2. Nhấn **TẢI ZIP ẢNH SẢN PHẨM**, chọn nguyên file `Sản Phẩm(1).zip`; không cần giải nén.
3. Hệ thống kiểm tra ảnh trong ZIP, bỏ qua thư mục/CSV hướng dẫn và lưu ảnh thật vào volume `media_data`. Không cho lưu HTML/SVG/EXE; mỗi ảnh tối đa 8 MB, ZIP tối đa 30 MB/120 ảnh/160 MB giải nén.
4. Chờ thông báo **Đã xử lý 44 ảnh**, gồm số ảnh tải mới và số ảnh đã tồn tại. Tải lại ZIP không tạo thêm bản ghi trùng tên.
5. Mở `/admin/products` → **Nhập danh mục CSV** và chọn file CSV 43 sản phẩm đã điền giá demo. Lần này API sẽ tìm tên file gốc `original_name` trong PostgreSQL và tự điền URL `/media/UUID.jpg` cho từng dòng.

Đối với ZIP 44 ảnh `Sản Phẩm(1).zip` và CSV 43 dòng từ Enjoy Life, có 43 ảnh được gán sản phẩm và một ảnh phụ được giữ trong thư viện để sử dụng về sau.

**Quan trọng:** Upload ZIP chỉ tạo dữ liệu media, **không tự tạo sản phẩm**. Import CSV là thao tác riêng để chủ cửa hàng kiểm tra trước khi đưa sản phẩm vào trạng thái Ẩn. Sản phẩm vẫn cần duyệt size, giá và tồn kho trước khi công khai.

## Đã triển khai

**Media Manager**
- Trang `/admin/media`: tải nhiều ảnh từ máy (JPG, PNG, WebP), thư viện ảnh 120 tệp gần nhất, chọn ảnh và sao chép đường dẫn.
- Go API nhận multipart **chỉ khi Admin đã đăng nhập**, tối đa 8 MiB mỗi ảnh; kiểm tra magic bytes và ảnh hợp lệ, từ chối HTML/SVG/exe, tên file do server tạo bằng UUID.
- Ảnh thật lưu trong Docker named volume `media_data` dưới `/app/media` và metadata lưu trong PostgreSQL (`media_assets`). Next.js phục vụ qua `/media/<UUID>.png|jpg|webp` với MIME đúng; không cần public hóa trực tiếp cổng Go API.
- Không có chức năng xóa media đã sử dụng để tránh gãy liên kết. Trong production có thể đổi backend lưu ảnh sang object storage (S3-compatible) ở sprint sau.

**Admin sản phẩm**
- `/admin/products` form tạo và sửa sản phẩm hỗ trợ nút **Chọn ảnh từ máy** và **Thư viện ảnh**; SKU/size/giá/tồn vẫn được quản lý như trước.
- Import danh mục CSV hàng loạt đến **100 sản phẩm/lần**, transaction PostgreSQL (thất bại một dòng thì không tạo dòng nào), kiểm tra SKU/slug trùng.
- Khi nhập CSV, cột `image_url` có thể ghi **đúng tên file gốc đã upload vào `/admin/media`** (ví dụ `abc123.jpg`); API sẽ tìm `media_assets.original_name` và đổi thành `/media/<UUID>.jpg` trong cùng transaction. Nếu thiếu ảnh hoặc tên sai, toàn bộ import bị từ chối và trả về số dòng lỗi.
- Hỗ trợ 9 danh mục: `ao`, `quan`, `outerwear`, `giay-dep`, `tui-xach`, `trang-suc`, `mu-non`, `khan-choang`, `vay-dam` (schema thêm idempotent khi khởi động Go API). Mỗi dòng là một sản phẩm kèm SKU đầu tiên; các SKU khác có thể được thêm từ form sửa sản phẩm.
- Mọi sản phẩm import đều được tạo ở trạng thái **Ẩn**, kể cả file tự khai `published=true`. Giá và tồn kho chỉ đến từ dữ liệu Admin nhập, tuyệt đối không suy đoán từ ảnh.
- Bốn sản phẩm demo gốc của dự án được chuyển sang `published=false` đúng **một lần** bằng migration (chỉ các UUID seed khớp và mô tả chứa từ *mẫu*). Không xóa sản phẩm hoặc những đơn hàng/stock movements đã tồn tại.

**Admin bài viết**
- `/admin/blog/new`, `/admin/blog/[id]/edit`: ảnh bìa và OG dùng MediaPicker; Tiptap cho chọn file ảnh từ máy trước khi chèn vào nội dung, vẫn bắt buộc alt text.
- Go Blog API cho phép cả đường dẫn `/media/UUID.ext` và ảnh HTTPS đang có; không cần URL Unsplash nữa.
- Dữ liệu bài viết vẫn đi qua API/quy trình nháp → xuất bản của Sprint 3/4.

**Homepage**
- `/admin/site`: thay ảnh Hero và Story, tiêu đề, dòng nhấn mạnh, hai đoạn kể chuyện.
- Nội dung nằm trong bảng `site_content`, GET public API `/api/v1/site/content`, PUT chỉ cho Admin. Homepage fetch từ Go/PostgreSQL khi render, không phải sửa Next.js để đổi hình và thông điệp.
- Lần nâng cấp migration khởi tạo nội dung mặc định dựa trên thiết kế hiện có, không xóa nội dung đang vận hành.

## Hướng dẫn chạy PowerShell

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate api web
docker compose ps
```

Vào `http://localhost:3000/account` đăng nhập tài khoản Admin đã cấu hình trong môi trường development, sau đó:

1. `/admin/media`: thử upload một ảnh từ máy và kiểm tra hiển thị.
2. `/admin/products`: tạo sản phẩm, chọn ảnh vừa upload, thêm SKU và tồn thật; khi sẵn sàng mới bật Công khai.
3. Trong cùng trang, có thể tải file mẫu CSV và import nhiều sản phẩm; sản phẩm import mặc định Ẩn. Nếu có nhiều ảnh, hãy tải ảnh lên Media Manager trước, rồi điền tên file ảnh gốc vào `image_url` trong CSV. Trước khi import cần điền **giá thật >0** và **size hợp lệ**; tuyệt đối không tự đoán giá/tồn từ hình.
4. `/admin/blog/new`: chọn ảnh bìa từ máy, ảnh OG từ thư viện, chèn ảnh trực tiếp trong Tiptap; nhập alt trước khi lưu.
5. `/admin/site`: thay Hero/Story rồi mở Homepage kiểm tra.

## Ảnh và backup — quan trọng khi bán hàng thật

Volume `postgres_data` chứa dữ liệu cửa hàng; **volume `media_data` chứa ảnh sản phẩm và Blog**. Phải backup **cả hai**, ví dụ trên máy Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path backups | Out-Null
docker compose exec -T db pg_dump -U enjoylife enjoylife > backups/enjoylife.sql
docker run --rm -v enjoy-life_media_data:/media:ro -v "${PWD}/backups:/backup" alpine:3.20 tar -czf /backup/enjoylife-media.tar.gz -C /media .
```

**Không chạy `docker compose down -v`**, vì Docker sẽ xóa cả Postgres và ảnh. Backup nên lưu thêm bản ngoài máy đang chạy ứng dụng. Khi lên production cần sử dụng HTTPS, giới hạn dung lượng, backup tự động và storage có độ bền cao (S3/R2/MinIO hoặc tương đương).

## Kiểm thử

CI hiện có lint, typecheck, Next.js build, Go unit+integration, Docker boot và Blog E2E. Sprint 5 bổ sung Docker E2E:
- upload PNG thật qua Next BFF / Go API và đọc lại từ `/media`;
- chặn người chưa đăng nhập, ngăn CSRF cross-origin, từ chối giả mạo PNG;
- đổi Hero/Story và xác nhận Homepage lấy được từ database;
- import sản phẩm mẫu qua API, xác nhận sản phẩm mới luôn ở trạng thái Ẩn.

## Giới hạn hiện tại

- Chưa tích hợp AI tự tạo tên/mô tả/SEO, vẫn cần Admin xác nhận.
- CSV import 1 SKU ban đầu cho mỗi sản phẩm; các SKU khác dùng Variant Manager.
- Media Manager chưa có crop ảnh, nén WebP hay gắn nhiều ảnh vào cùng sản phẩm (chỉ ảnh đại diện).
- Danh mục sản phẩm hiện dùng 3 loại có sẵn (`ao`, `quan`, `outerwear`); phần quản lý danh mục tùy biến thuộc sprint sau.
- Ảnh media lưu trong local named volume trên Docker, **không** tự động sao lưu lên cloud.

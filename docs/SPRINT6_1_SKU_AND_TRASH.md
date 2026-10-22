# Enjoy Life — Sprint 6.1: Tự sinh mã hàng và Xóa/Khôi phục sản phẩm

## Quy tắc nghiệp vụ

**Mã hàng (SKU) tự động**
- Admin không cần nhập SKU khi tạo sản phẩm hoặc thêm một biến thể màu/size mới.
- Go API yêu cầu PostgreSQL cấp một số từ sequence `enjoy_product_sku_seq`, định dạng **SP-001, SP-002, ...**, không tạo từ số lượng sản phẩm ở trình duyệt.
- Mã là **duy nhất cho từng biến thể**. Ví dụ áo Trắng/M là `SP-001`, áo Trắng/L sẽ có một mã khác; không dùng chung một mã cho nhiều size/màu.
- Nếu hệ thống đã có mã `SP-xxx`, migration tính từ số lớn nhất. Khi request bị lỗi, dãy số có thể có khoảng trống — đó là hành vi an toàn để tránh trùng khi nhiều Admin thao tác cùng lúc.
- SKU cũ, mã trong CSV cũ, order snapshot và tồn kho **giữ nguyên**. CSV để trống `sku` cũng có thể yêu cầu backend cấp tự động.

**Form**
- Đổi nhãn SKU thành `Mã hàng (tự động)`, không yêu cầu nhập tay.
- Tên sản phẩm tự sinh slug tiếng Việt không dấu (có thể chủ động chỉnh sửa URL).
- Bỏ `Bộ sưu tập` khỏi form tạo và chỉnh sửa; trường cũ trong database vẫn được giữ để tương thích với CSV/API cũ.
- Tạo từ Admin UI luôn ở trạng thái **Ẩn**; Admin xem lại rồi mới công khai.

**Xóa và khôi phục**
- Nút **Xóa** yêu cầu xác nhận, chuyển sản phẩm vào **Thùng rác**, lưu `archived_at` và đồng thời đặt `published=false`.
- Sản phẩm đã xóa không xuất hiện ở Shop, trang chi tiết, Admin danh sách hoạt động, dashboard stock counts và kho đang quản lý.
- Backend từ chối tạo đơn hàng mới chứa SKU của sản phẩm đã xóa, ngay cả khi khách còn dữ liệu giỏ hàng cũ.
- Trong Thùng rác, Admin nhấn **Khôi phục**. Sản phẩm trở về trạng thái **Ẩn**, phải công khai lại thủ công.
- Không `DELETE` hàng trong PostgreSQL, không xóa variants, stock movements, order items hoặc những ảnh gốc. Audit log ghi thao tác xóa/khôi phục.
- Slug và SKU của sản phẩm trong Thùng rác không được tái sử dụng; tránh làm sai liên kết lịch sử.

## Hướng dẫn thao tác

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate api web
docker compose ps
```

Truy cập `http://localhost:3000/admin/products`:

1. Nhấn **Thêm sản phẩm**, nhập tên. Slug tự điền; mã hàng sẽ cấp sau khi bấm **TẠO SẢN PHẨM**.
2. Nhập danh mục, màu, size, giá, số lượng và ảnh; tạo sản phẩm ở trạng thái Ẩn.
3. Bấm **Sửa** → thêm size/màu mới để nhận SKU kế tiếp.
4. Bấm **Xóa** và xác nhận để chuyển vào **Thùng rác**.
5. Chuyển tab **Thùng rác** và nhấn **Khôi phục**. Sản phẩm trở lại tab **Đang quản lý** và vẫn ở trạng thái Ẩn.

Không sử dụng `docker compose down -v`, vì có thể xóa dữ liệu thực của PostgreSQL và media. Không cần chạy SQL bằng tay: Go chạy migration an toàn trên các volume cũ khi khởi động.

## Tiêu chí nghiệm thu

- TypeScript/ESLint/Next.js build và Go tests thành công.
- Kiểm thử Admin (không đăng nhập không được xóa).
- Kiểm thử hai mã SKU tự cấp không trùng; sản phẩm cũ và order history còn nguyên.
- Xóa → sản phẩm biến mất khỏi Shop và danh sách hoạt động → xuất hiện ở Thùng rác.
- Khôi phục → sản phẩm hiện lại nhưng chưa tự công khai.
- Không ảnh hưởng import 43 sản phẩm CSV, ảnh trong Media Manager và dữ liệu đơn hàng cũ.

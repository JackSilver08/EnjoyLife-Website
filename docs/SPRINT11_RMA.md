# Sprint 11 — Returns, Refunds & Warehouse Operations

## Phạm vi phiên bản này
Xử lý chứng từ RMA thật cho shop thời trang nữ với các nghiệp vụ:
1. Khách đổi/trả **sau khi DELIVERED hoặc COMPLETED và đã xác nhận thu tiền (PAID)**: nhân viên quản trị tạo RMA, chọn dòng SKU, số lượng và lý do. Cho phép trả một phần (theo số lượng của mỗi SKU); nhiều RMA trên một đơn không được vượt số đã bán.
2. Giao thất bại **đang SHIPPING**: RMA phải chứa đủ toàn bộ số hàng trong đơn. Đơn vẫn SHIPPING cho đến khi kho nhận hàng vật lý; sau đó chuyển thành RETURNED. Không hoàn lại reserved vì đã trừ từ lúc SHIPPING.
3. Admin duyệt/từ chối; chỉ phiếu APPROVED mới được nhận hàng. Nhận **đầy đủ các dòng trong một lần** theo hai nhóm **good** (bán được) và **quarantined** (cách ly, không bán được).
4. Một transaction duy nhất cập nhật tồn, tạo sổ kho RETURN_GOOD / RETURN_QC_HOLD, cập nhật trạng thái RMA và audit log. **request_key** đảm bảo retry không cộng tồn hai lần; tài khoản không có quyền Admin không được tạo/duyệt/nhận/đối soát.
5. Chỉ tạo phiếu khách đổi/trả sau khi đã thu đủ COD hoặc xác nhận payOS PAID; không hoàn nhầm đơn chưa thu tiền. Sau khi xác thực số tiền đã thu: RMA giữ refund_status=PENDING. Admin **tự thực hiện hoàn tiền ngoài hệ thống**, đối chiếu mã tham chiếu và số tiền chính xác, sau đó mới ghi nhận CONFIRMED. Đơn đã PAID vẫn giữ payment_status='PAID' của giao dịch gốc; KHÔNG giả lập một lệnh chuyển tiền qua payOS.
6. Hàng cách ly được xử lý tiếp bằng trang **Phân tích tồn kho → QC** từ Sprint 9.

### Luồng trạng thái
- REQUESTED → APPROVED → RECEIVED → CLOSED (sau khi Admin ghi nhận hoàn tiền thực tế).
- REQUESTED → REJECTED (không thay đổi kho hay tiền).
- Nếu chưa thu tiền: APPROVED → CLOSED khi kho nhận đủ hàng.
- Chỉ khi RMA giao thất bại nhận hàng, trạng thái đơn chuyển SHIPPING → RETURNED.

## Trang quản trị
- `/admin/returns`: tạo, xem và xử lý RMA với modal; danh sách lọc trạng thái.
- `/admin/orders`: thêm liên kết sang trang quản trị đổi trả.
- Phiếu có số RMA, mã đơn, loại yêu cầu, lý do, danh sách SKU/màu/size, số lượng, giá snapshot và số tiền hàng cần hoàn.
- Link tra cứu đơn hàng riêng tư `/orders/:token` thể hiện trạng thái RMA và khoản hoàn tiền, không hiển thị ghi chú nội bộ hoặc thông tin của khách khác. Không thay thế gửi email/SMS chủ động.

## Bảo toàn hệ thống
- Migration additive dùng transaction và khóa advisory; KHÔNG sửa hay xóa đơn, sổ kho cũ, thanh toán payOS hoặc dữ liệu khách.
- Không được sử dụng thao tác hủy đơn SHIPPING/DELIVERED để tạo hàng hoàn. Trường hợp đang có phiếu giao thất bại thì chặn chuyển SHIPPING → DELIVERED.
- **Số tiền hoàn hiện là giá trị hàng theo snapshot của order_items** (không gồm phí ship, giảm giá/khuyến mãi, mã giảm tiền hoặc phần phí không hoàn). Với đơn phát sinh những khoản đó sau này, phải có đối soát chi tiết trước khi ghi nhận.
- Chưa tích hợp hoàn tiền API payOS, thông báo email/SMS tự động, hãng vận chuyển, nhãn gửi hàng, RMA khách tạo tự phục vụ, đổi sang sản phẩm khác, nhận hàng nhiều đợt và chính sách thời hạn đổi trả. Những phần này **chưa được tuyên bố hoàn thành**.
- Cần có chính sách đổi trả công khai, điều kiện vệ sinh/tem mác đối với hàng thời trang, và quy trình chăm sóc khách hàng trước production.

## Kiểm thử
- Unit rules Go, PostgreSQL integration (schema, RBAC, over-return, idempotency, QC, manual refund, giao thất bại).
- Docker E2E thông qua Next.js proxy với sản phẩm/đơn test trên DB disposable.
- CI đầy đủ: Go/vet + Next build/lint/types + Sprint 7–10 regression.

## Cài đặt trên máy Windows
```powershell
git switch main
git pull origin main
docker compose up -d --build --wait --wait-timeout 300 api web
```
Không chạy `docker compose down -v` vì có thể xóa PostgreSQL đang chứa đơn hàng và lịch sử thanh toán.

# Admin sidebar — menu xổ ngang Quản lý khác

Sau khi tinh gọn, sidebar có **6 mục chính** và duy nhất một menu phụ **Quản lý khác**.

- Nhóm Quản lý khác nằm trên một hàng đầy chiều ngang, bấm để xổ menu sang phải.
- Popup render bằng React portal, không bị cắt bởi vùng cuộn sidebar.
- Click mục con để chuyển trang, Esc trả focus về nút mở, nút X và click ngoài để đóng.
- Trên màn hình hẹp (<=900px), popup luôn nằm trong viewport.
- Khách hàng là mục chính, không còn nhóm Vận hành.
- Hai trang Đổi trả/Hoàn tiền và Phiếu nhập NCC không còn trên frontend. API và dữ liệu lịch sử vẫn được giữ để bảo toàn nghiệp vụ.
- Phân quyền ADMIN/STAFF, payOS, dữ liệu tồn kho và AI không thay đổi.

## Kiểm thử

Chrome E2E desktop/mobile xác nhận 6 liên kết, 1 flyout, popup bên phải, Escape, mobile 375px, link Khách hàng active và 404 đối với các trang đã bỏ.

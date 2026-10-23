# Admin sidebar — menu xổ ngang sang phải

## Thiết kế
- Hai nhóm **Vận hành** và **Quản lý khác** hiện là hai hàng đầy đủ chiều ngang sidebar, có icon và mũi tên sang phải giống các mục chính.
- Nhấn vào một nhóm mở hộp menu bên phải sidebar. Menu phụ được render qua React portal bên ngoài vùng sidebar có scroll, tránh bị cắt hoặc bị ẩn dưới nội dung chính.
- Click mục con để chuyển trang; menu tự đóng. Nhóm chứa trang đang sử dụng được tô sáng.
- Nhấn lại mục nhóm, nhấn nút X, click bên ngoài, Esc hoặc cuộn/resize trang để đóng. Khi dùng Esc, focus trả về nút nhóm.
- Nếu màn hình hẹp (<=900px), hai nút vẫn xếp thành **hai hàng đầy đủ chiều rộng**; panel hiển thị trong viewport với kích thước phù hợp. Không cố ép flyout sang phải ngoài mép màn hình.
- Không xóa bất kỳ đường dẫn cũ, không thay đổi phân quyền Admin/Staff, API, kho, payOS hay OpenAI.

## Kiểm thử
- Next.js lint, typecheck, build.
- Chrome E2E đo trực tiếp tại desktop: 2 nhóm, menu portal thực sự ở phía phải của sidebar, chiều ngang không tràn cửa sổ; Escape và focus, chuyển sang Báo cáo và active trạng thái.
- Chrome E2E tại mobile 375px: hai hàng đầy đủ chiều rộng, panel không tràn viewport, nút đóng hoạt động.
- Giữ các regression về giá biến thể, đơn hàng, kho, thanh toán, Journal và chatbot hiện có.

## Cập nhật
```powershell
git switch main
git pull origin main
docker compose up -d --build --wait --wait-timeout 300 web
```
Sau đó mở http://localhost:3000/admin và nhấn Ctrl+F5.

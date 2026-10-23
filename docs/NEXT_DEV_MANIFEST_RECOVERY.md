# Fix local Next.js 16 "Unexpected end of JSON input" / loadManifest

## Nguyên nhân và phạm vi
Next.js dev server trên Docker Desktop chạy trên `/app/.next` là một named volume
để tránh I/O chậm của Windows bind mounts. Khi Next đang biên dịch hoặc bị dừng
đột ngột, tệp JSON manifest được sinh ra có thể còn rỗng / ghi chưa hết. Lần
khởi động kế tiếp nếu dùng lại manifest đó sẽ xuất hiện
`JSON.parse → loadManifest → Unexpected end of JSON input`.

Log hiển thị container web/API/DB đều **Healthy** trước đây chỉ xác nhận
`/api/health` chứ không xác nhận SSR website có thể render.

## Cách khắc phục tự động
- `apps/web/scripts/prepare-next-dev.sh` chỉ chạy lúc web container khởi
  động, trước `next dev`. Xóa **nội dung sinh tự động trong .next** nhưng giữ
  `.next/cache`, không đụng đến code, `node_modules`, PostgreSQL, media hay `.env`.
- `compose.yaml` chạy script này theo cách an toàn với file CRLF trên Windows.
- Web healthcheck yêu cầu `GET /account` phải trả 200 (SSR thật) trước khi
  Docker báo Healthy. Không chỉ kiểm tra route `/api/health` tĩnh.
- CI chủ động gieo manifest JSON rỗng và không hợp lệ vào named volume, khởi động
  web, xác nhận các tệp lỗi đã được loại và `/account` render được trong trình
  duyệt HTTP. Các kiểm thử khác vẫn chạy.

## Cập nhật máy Windows
```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate --wait --wait-timeout 300 web
```

Nếu phiên bản cũ chưa được cập nhật hoặc web vẫn có manifest lỗi:
```powershell
docker compose stop web
docker compose run --rm --no-deps --entrypoint sh web -c 'find /app/.next -mindepth 1 -maxdepth 1 -exec rm -rf {} +'
docker compose up -d --wait --wait-timeout 300 web
```

**Tuyệt đối không chạy `docker compose down -v`**: có thể xóa database,
ảnh và những named volume quan trọng.

Chú ý: `START.bat` có lệnh `pause` cuối script. Bấm Ctrl+C lúc màn hình
"Press any key to continue" chỉ ngắt file batch; không chứng minh container
đang chạy bị dừng. Dùng `docker compose ps` để xác nhận tình trạng.
